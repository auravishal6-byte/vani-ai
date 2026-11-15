import { useState } from "react";
import { MoreHorizontal, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useAssistant } from "@/lib/assistant/store";

function when(ts: number) {
  const seconds = Math.max(0, Date.now() - ts) / 1000;
  if (seconds < 60) return "abhi";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} ghante`;
  return new Intl.DateTimeFormat("hi-IN", { day: "numeric", month: "short" }).format(ts);
}

export function ChatList({ onNavigate }: { onNavigate?: () => void }) {
  const chats = useAssistant((state) => state.chats);
  const activeId = useAssistant((state) => state.activeId);
  const setActive = useAssistant((state) => state.setActive);
  const renameChat = useAssistant((state) => state.renameChat);
  const deleteChat = useAssistant((state) => state.deleteChat);
  const name = useAssistant((state) => state.settings.assistantName);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [armed, setArmed] = useState<string | null>(null);

  return (
    <div className="flex h-full min-h-0 flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center justify-between px-4 pt-5 pb-3">
        <div>
          <p className="font-display text-2xl leading-none tracking-tight">{name || "Vani"}</p>
          <p className="mt-1 text-sm text-muted-foreground">Aapka assistant</p>
        </div>
      </div>
      <div className="px-3">
        <Button
          type="button"
          className="h-11 w-full justify-start gap-2 px-3"
          onClick={() => {
            setActive(null);
            onNavigate?.();
          }}
        >
          <Plus />
          Nayi baat
        </Button>
      </div>
      <div className="mt-4 min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {chats.length === 0 ? (
          <p className="px-3 py-6 text-sm text-muted-foreground">
            Abhi koi baat nahi. Neeche se shuru karein.
          </p>
        ) : (
          <ul className="space-y-1">
            {chats.map((chat) => {
              const selected = chat.id === activeId;
              return (
                <li key={chat.id}>
                  {editing === chat.id ? (
                    <form
                      className="px-1 py-1"
                      onSubmit={(event) => {
                        event.preventDefault();
                        renameChat(chat.id, draft);
                        setEditing(null);
                      }}
                    >
                      <Input
                        value={draft}
                        aria-label="Baat ka naam"
                        className="h-11"
                        autoFocus
                        onChange={(event) => setDraft(event.target.value)}
                        onBlur={() => {
                          renameChat(chat.id, draft);
                          setEditing(null);
                        }}
                      />
                    </form>
                  ) : (
                    <div
                      className={
                        selected
                          ? "flex items-center gap-1 rounded-xl bg-sidebar-accent pr-1"
                          : "flex items-center gap-1 rounded-xl pr-1 hover:bg-sidebar-accent/70"
                      }
                    >
                      <button
                        type="button"
                        className="min-h-11 min-w-0 flex-1 rounded-xl px-3 py-2 text-left"
                        onClick={() => {
                          setActive(chat.id);
                          onNavigate?.();
                        }}
                      >
                        <span className="block truncate text-sm font-medium">{chat.title}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground tabular-nums">
                          {when(chat.updatedAt)}
                        </span>
                      </button>
                      <DropdownMenu
                        onOpenChange={(open) => {
                          if (!open) setArmed(null);
                        }}
                      >
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-11 shrink-0"
                            aria-label={`${chat.title} ke options`}
                          >
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="min-h-11"
                            onSelect={() => {
                              setDraft(chat.title);
                              setEditing(chat.id);
                            }}
                          >
                            Naam badlo
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            className="min-h-11"
                            onSelect={(event) => {
                              if (armed !== chat.id) {
                                event.preventDefault();
                                setArmed(chat.id);
                                return;
                              }
                              deleteChat(chat.id);
                            }}
                          >
                            {armed === chat.id ? "Pakka, mitao" : "Mitao"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <p className="border-t border-sidebar-border px-4 py-3 text-xs leading-relaxed text-muted-foreground">
        Baatein isi device par rehti hain. Kahi aur save nahi hoti.
      </p>
    </div>
  );
}
