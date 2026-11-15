import { useEffect, useState } from "react";
import { Check, Copy, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RichText } from "@/components/assistant/rich-text";
import type { ChatMessage } from "@/lib/assistant/store";

const STARTERS: { title: string; body: string; prompt: string }[] = [
  {
    title: "Aaj ka plan",
    body: "Kaam, ek zaroori cheez, aur thodi aaram.",
    prompt:
      "Mujhe aaj ka seedha plan banao: kaam, ek zaroori kaam, aur thodi aaram. Subah 9 se shaam 7.",
  },
  {
    title: "Email",
    body: "Meeting kal se parson shift.",
    prompt:
      "Ek chhota polite email likho: kal 4 baje ki meeting ko parson 11 baje shift karni hai.",
  },
  {
    title: "Samjhao",
    body: "Compound interest, simple Hindi.",
    prompt: "Compound interest ko simple Hindi mein samjhao, ek chhote example ke saath.",
  },
  {
    title: "Weekend",
    body: "Ghar par, bina zyada kharche.",
    prompt: "Ghar par weekend ke liye 5 chhote ideas do jo mehenge na hon.",
  },
];

export function EmptyThread({
  name,
  onPick,
}: {
  name: string;
  onPick: (prompt: string) => void;
}) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-4 py-8">
      <p className="vani-rise font-display text-4xl tracking-tight text-balance sm:text-5xl">
        Namaste.
      </p>
      <p className="vani-rise mt-3 max-w-md text-pretty text-muted-foreground [animation-delay:80ms]">
        {name || "Vani"} aapka assistant hai. Hindi ya English — jaise mann kare, waise poochhiye.
      </p>
      <ul className="mt-8 grid gap-3 sm:grid-cols-2">
        {STARTERS.map((item, index) => (
          <li
            key={item.title}
            className="vani-rise"
            style={{ animationDelay: `${160 + index * 40}ms` }}
          >
            <Button
              type="button"
              variant="outline"
              className="h-auto w-full items-start justify-start rounded-2xl px-4 py-4 text-left whitespace-normal"
              onClick={() => onPick(item.prompt)}
            >
              <span className="grid gap-1">
                <span className="font-medium">{item.title}</span>
                <span className="text-sm font-normal text-muted-foreground">{item.body}</span>
              </span>
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Thread({
  name,
  messages,
  streamingId,
  onRegenerate,
}: {
  name: string;
  messages: ChatMessage[];
  streamingId: string | null;
  onRegenerate: () => void;
}) {
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(null), 1400);
    return () => window.clearTimeout(timer);
  }, [copied]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6">
      {messages.map((message, index) => {
        const last = index === messages.length - 1;
        if (message.role === "user") {
          return (
            <div key={message.id} className="flex justify-end">
              <p className="bubble max-w-lg rounded-3xl rounded-br-lg bg-primary px-4 py-3 text-primary-foreground whitespace-pre-wrap">
                {message.content}
              </p>
            </div>
          );
        }
        const waiting = streamingId === message.id && message.content.length === 0;
        return (
          <article key={message.id} className="max-w-prose" aria-live={waiting ? "polite" : undefined}>
            <p className="mb-2 font-display text-sm text-muted-foreground">{name || "Vani"}</p>
            {waiting ? (
              <p className="flex items-center gap-2 text-muted-foreground">
                <span className="flex gap-1" aria-hidden="true">
                  <span className="vani-dot size-1.5 rounded-full bg-foreground" />
                  <span className="vani-dot delay-1 size-1.5 rounded-full bg-foreground" />
                  <span className="vani-dot delay-2 size-1.5 rounded-full bg-foreground" />
                </span>
                Ek pal
              </p>
            ) : (
              <RichText text={message.content} />
            )}
            {!waiting && message.content ? (
              <div className="mt-3 flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  className="h-9 px-2 text-muted-foreground"
                  onClick={() => {
                    void navigator.clipboard.writeText(message.content).then(() => {
                      setCopied(message.id);
                    });
                  }}
                >
                  {copied === message.id ? <Check /> : <Copy />}
                  {copied === message.id ? "Copy ho gaya" : "Copy"}
                </Button>
                {last && !streamingId ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-9 px-2 text-muted-foreground"
                    onClick={onRegenerate}
                  >
                    <RefreshCw />
                    Dobara
                  </Button>
                ) : null}
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
