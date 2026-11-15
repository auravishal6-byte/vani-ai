import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
  buildSystemPrompt,
  LANGUAGE_IDS,
  PERSONA_IDS,
  TONE_IDS,
} from "@/lib/assistant/prompt";

const schema = z.object({
  assistantName: z.string().max(40).optional(),
  language: z.enum(LANGUAGE_IDS),
  tone: z.enum(TONE_IDS),
  persona: z.enum(PERSONA_IDS),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(2000),
      }),
    )
    .min(1)
    .max(12),
});

const hits = new Map<string, { n: number; reset: number }>();

function clientKey(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "local";
  return ip.slice(0, 64);
}

function allow(request: Request) {
  const now = Date.now();
  const key = clientKey(request);
  const row = hits.get(key);
  if (!row || now > row.reset) {
    hits.set(key, { n: 1, reset: now + 60_000 });
    return true;
  }
  if (row.n >= 10) return false;
  row.n += 1;
  return true;
}

function cleanName(value: string | undefined) {
  const name = (value ?? "Vani").replace(/[^\p{L}\p{N} '\-.]/gu, "").trim().slice(0, 32);
  return name || "Vani";
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!allow(request)) {
          return Response.json(
            { error: "Bahut saare sawal ek saath aa gaye. Ek minute ruk kar dubara bhejein." },
            { status: 429 },
          );
        }

        // Gemini free API key (get from https://aistudio.google.com/apikey)
        const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
        if (!apiKey) {
          return Response.json(
            { error: "Assistant is waqt uplabdh nahi hai. GEMINI_API_KEY set karein." },
            { status: 503 },
          );
        }

        let json: unknown;
        try {
          json = await request.json();
        } catch {
          return Response.json({ error: "Sandesh padha nahi ja saka." }, { status: 400 });
        }

        const parsed = schema.safeParse(json);
        if (!parsed.success) {
          return Response.json(
            { error: "Sandesh bahut lamba hai, ya kuch missing hai." },
            { status: 400 },
          );
        }

        const { messages, persona, language, tone } = parsed.data;
        if (messages[messages.length - 1]?.role !== "user") {
          return Response.json({ error: "Pehle apna sawal likhiye." }, { status: 400 });
        }

        const total = messages.reduce((sum, message) => sum + message.content.length, 0);
        if (total > 10000) {
          return Response.json(
            { error: "Yeh baat bahut lambi ho gayi. Nayi baat shuru karein." },
            { status: 400 },
          );
        }

        const systemPrompt = buildSystemPrompt({
          assistantName: cleanName(parsed.data.assistantName),
          language,
          tone,
          persona,
        });

        // Convert messages to Gemini format
        const geminiContents = messages.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        }));

        const model = "gemini-2.0-flash";
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;

        let upstream: Response;
        try {
          upstream = await fetch(url, {
            method: "POST",
            signal: request.signal,
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              systemInstruction: {
                parts: [{ text: systemPrompt }],
              },
              contents: geminiContents,
              generationConfig: {
                maxOutputTokens: 900,
                temperature: 0.7,
              },
            }),
          });
        } catch (error) {
          if (error instanceof Error && error.name === "AbortError") {
            return new Response(null, { status: 499 });
          }
          return Response.json(
            { error: "Assistant tak pahunch nahi paye. Dubara koshish karein." },
            { status: 502 },
          );
        }

        if (!upstream.ok || !upstream.body) {
          let detail = "";
          try {
            const body = (await upstream.json()) as { error?: { message?: string } | string };
            detail =
              typeof body.error === "string" ? body.error : (body.error?.message ?? "");
          } catch {
            detail = "";
          }
          const safe = detail.replace(/\s+/g, " ").trim().slice(0, 180);
          return Response.json(
            { error: safe || "Assistant ne jawab nahi diya." },
            { status: 502 },
          );
        }

        const encoder = new TextEncoder();
        const decoder = new TextDecoder();
        const source = upstream.body;

        const stream = new ReadableStream({
          async start(controller) {
            const reader = source.getReader();
            let buffer = "";
            const send = (payload: unknown) => {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
            };
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() ?? "";
                for (const line of lines) {
                  const trimmed = line.trim();
                  if (!trimmed.startsWith("data:")) continue;
                  const data = trimmed.slice(5).trim();
                  if (!data || data === "[DONE]") continue;
                  try {
                    const jsonLine = JSON.parse(data) as {
                      candidates?: {
                        content?: {
                          parts?: { text?: string }[];
                        };
                      }[];
                    };
                    const token = jsonLine.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (token) send({ t: token });
                  } catch {
                    /* ignore */
                  }
                }
              }
              send({ done: true });
              controller.close();
            } catch (error) {
              if (error instanceof Error && error.name === "AbortError") {
                controller.close();
                return;
              }
              send({ error: "Beech mein ruk gaya. Dobara bhejein." });
              controller.close();
            }
          },
          cancel() {
            void source.cancel();
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",
          },
        });
      },
    },
  },
});
