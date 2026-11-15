import { useEffect, useRef, useState } from "react";
import { ArrowUp, Menu, Square } from "lucide-react";
import { ChatList } from "@/components/assistant/chat-list";
import { SettingsDialog } from "@/components/assistant/settings-dialog";
import { EmptyThread, Thread } from "@/components/assistant/thread";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { streamChat } from "@/lib/assistant/client";
import { PERSONA_IDS, type PersonaId } from "@/lib/assistant/prompt";
import { useAssistant, type ChatMessage } from "@/lib/assistant/store";

const PERSONA_LABEL: Record<PersonaId, string> = {
  daily: "Roz",
  writer: "Likhai",
  planner: "Yojna",
  study: "Padhai",
  code: "Code",
};

export function VaniApp() {
  const chats = useAssistant((state) => state.chats);
  const activeId = useAssistant((state) => state.activeId);
  const settings = useAssistant((state) => state.settings);
  const composerPersona = useAssistant((state) => state.composerPersona);
  const setComposerPersona = useAssistant((state) => state.setComposerPersona);
  const setChatPersona = useAssistant((state) => state.setChatPersona);
  const startChat = useAssistant((state) => state.startChat);
  const appendMessage = useAssistant((state) => state.appendMessage);
  const patchMessage = useAssistant((state) => state.patchMessage);
  const dropMessage = useAssistant((state) => state.dropMessage);

  const chat = chats.find((item) => item.id === activeId) ?? null;
  const persona = chat?.persona ?? composerPersona;
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [navOpen, setNavOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const box = useRef<HTMLTextAreaElement>(null);

  const tail = chat?.messages[chat.messages.length - 1]?.content ?? "";

  useEffect(() => {
    const node = scroller.current;
    if (!node) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    node.scrollTo({ top: node.scrollHeight, behavior: reduce ? "auto" : "smooth" });
  }, [chat?.id, chat?.messages.length, tail, streamingId]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  function choosePersona(next: PersonaId) {
    if (chat) setChatPersona(chat.id, next);
    else setComposerPersona(next);
  }

  async function run(chatId: string, history: ChatMessage[], nextPersona: PersonaId) {
    const assistantId = crypto.randomUUID();
    appendMessage(chatId, { id: assistantId, role: "assistant", content: "" });
    setStreamingId(assistantId);
    setBusy(true);
    setError(null);
    const controller = new AbortController();
    abortRef.current = controller;
    let latest = "";
    let writeAt = 0;
    try {
      await streamChat(
        {
          assistantName: useAssistant.getState().settings.assistantName,
          language: useAssistant.getState().settings.language,
          tone: useAssistant.getState().settings.tone,
          persona: nextPersona,
          messages: history
            .filter((message) => message.content.trim())
            .slice(-12)
            .map((message) => ({ role: message.role, content: message.content })),
        },
        (full) => {
          latest = full;
          const now = Date.now();
          if (now - writeAt > 70) {
            writeAt = now;
            patchMessage(chatId, assistantId, full);
          }
        },
        controller.signal,
      );
      patchMessage(chatId, assistantId, latest);
    } catch (caught) {
      if (caught instanceof Error && caught.name === "AbortError") {
        if (!latest.trim()) dropMessage(chatId, assistantId);
        else patchMessage(chatId, assistantId, latest);
      } else {
        const message = caught instanceof Error ? caught.message : "Jawāb nahi aa saka.";
        patchMessage(chatId, assistantId, latest.trim() ? latest : message);
        setError(message);
      }
    } finally {
      setBusy(false);
      setStreamingId(null);
      abortRef.current = null;
    }
  }

  async function send(raw: string) {
    const content = raw.trim();
    if (!content || busy) return;
    const nextPersona = persona;
    let chatId = chat?.id ?? null;
    const prior = chat?.messages ?? [];
    if (!chatId) chatId = startChat(nextPersona);
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
    };
    appendMessage(chatId, userMessage);
    setText("");
    await run(chatId, [...prior, userMessage], nextPersona);
    box.current?.focus();
  }

  async function regenerate() {
    if (!chat || busy) return;
    const messages = chat.messages;
    const last = messages[messages.length - 1];
    if (!last) return;
    const history = last.role === "assistant" ? messages.slice(0, -1) : messages;
    if (history.length === 0 || history[history.length - 1]?.role !== "user") return;
    if (last.role === "assistant") dropMessage(chat.id, last.id);
    await run(chat.id, history, chat.persona);
  }

  const name = settings.assistantName.trim() || "Vani";

  return (
    <div className="flex h-dvh min-h-0 bg-background text-foreground">
      <aside className="hidden w-72 shrink-0 border-r border-sidebar-border md:block">
        <ChatList />
      </aside>
      <Sheet open={navOpen} onOpenChange={setNavOpen}>
        <SheetContent side="left" className="w-full max-w-xs gap-0 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Baatein</SheetTitle>
          </SheetHeader>
          <ChatList onNavigate={() => setNavOpen(false)} />
        </SheetContent>
      </Sheet>
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-1 border-b border-border px-2 md:px-4">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-11 md:hidden"
            aria-label="Baatein kholein"
            onClick={() => setNavOpen(true)}
          >
            <Menu />
          </Button>
          <p className="min-w-0 flex-1 truncate px-2 font-display text-xl tracking-tight md:text-lg">
            <span className="md:hidden">{name}</span>
            <span className="hidden md:inline">{chat?.title ?? "Nayi baat"}</span>
          </p>
          <div className="ml-auto">
            <SettingsDialog />
          </div>
        </header>
        <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto">
          {chat && chat.messages.length > 0 ? (
            <Thread
              name={name}
              messages={chat.messages}
              streamingId={streamingId}
              onRegenerate={() => {
                void regenerate();
              }}
            />
          ) : (
            <EmptyThread
              name={name}
              onPick={(prompt) => {
                void send(prompt);
              }}
            />
          )}
        </div>
        <form
          className="composer-safe shrink-0 border-t border-border bg-background px-3 pt-3 md:px-4"
          onSubmit={(event) => {
            event.preventDefault();
            void send(text);
          }}
        >
          <div className="scroll-x -mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
            {PERSONA_IDS.map((id) => (
              <Button
                key={id}
                type="button"
                variant={persona === id ? "default" : "outline"}
                className="h-10 shrink-0 rounded-full px-4"
                onClick={() => choosePersona(id)}
                disabled={busy}
              >
                {PERSONA_LABEL[id]}
              </Button>
            ))}
          </div>
          <div className="flex items-end gap-2">
            <Textarea
              ref={box}
              value={text}
              rows={1}
              placeholder={`${name} se poochhiye`}
              className="max-h-40 min-h-12 flex-1 resize-none rounded-2xl px-4 py-3"
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void send(text);
                }
              }}
            />
            {busy ? (
              <Button
                type="button"
                size="icon"
                className="size-12 shrink-0 rounded-full"
                aria-label="Rokein"
                onClick={() => abortRef.current?.abort()}
              >
                <Square />
              </Button>
            ) : (
              <Button
                type="submit"
                size="icon"
                className="size-12 shrink-0 rounded-full"
                aria-label="Bhejein"
                disabled={!text.trim()}
              >
                <ArrowUp />
              </Button>
            )}
          </div>
          <p className="pt-2 pb-1 text-center text-xs text-muted-foreground">
            {error ?? "Enter se bhejein · Shift+Enter nayi line"}
          </p>
        </form>
      </main>
    </div>
  );
}
