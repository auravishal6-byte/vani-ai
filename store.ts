import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { LanguagePref, PersonaId, Tone } from "@/lib/assistant/prompt";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export type Chat = {
  id: string;
  title: string;
  persona: PersonaId;
  messages: ChatMessage[];
  updatedAt: number;
};

export type Settings = {
  assistantName: string;
  language: LanguagePref;
  tone: Tone;
};

type State = {
  chats: Chat[];
  activeId: string | null;
  composerPersona: PersonaId;
  settings: Settings;
  setSettings: (patch: Partial<Settings>) => void;
  setComposerPersona: (persona: PersonaId) => void;
  setActive: (id: string | null) => void;
  setChatPersona: (id: string, persona: PersonaId) => void;
  startChat: (persona: PersonaId) => string;
  renameChat: (id: string, title: string) => void;
  deleteChat: (id: string) => void;
  appendMessage: (chatId: string, message: ChatMessage) => void;
  patchMessage: (chatId: string, messageId: string, content: string) => void;
  dropMessage: (chatId: string, messageId: string) => void;
};

const MAX_STORED = 80;

function titleFrom(text: string) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= 42) return clean;
  return `${clean.slice(0, 41)}…`;
}

export const useAssistant = create<State>()(
  persist(
    (set, get) => ({
      chats: [],
      activeId: null,
      composerPersona: "daily",
      settings: {
        assistantName: "Vani",
        language: "auto",
        tone: "warm",
      },
      setSettings: (patch) => set({ settings: { ...get().settings, ...patch } }),
      setComposerPersona: (persona) => set({ composerPersona: persona }),
      setActive: (id) => set({ activeId: id }),
      setChatPersona: (id, persona) =>
        set({
          chats: get().chats.map((chat) => (chat.id === id ? { ...chat, persona } : chat)),
        }),
      startChat: (persona) => {
        const id = crypto.randomUUID();
        const chat: Chat = {
          id,
          title: "Nayi baat",
          persona,
          messages: [],
          updatedAt: Date.now(),
        };
        set({ chats: [chat, ...get().chats], activeId: id });
        return id;
      },
      renameChat: (id, title) => {
        const next = title.replace(/\s+/g, " ").trim().slice(0, 60);
        if (!next) return;
        set({
          chats: get().chats.map((chat) => (chat.id === id ? { ...chat, title: next } : chat)),
        });
      },
      deleteChat: (id) => {
        const chats = get().chats.filter((chat) => chat.id !== id);
        set({
          chats,
          activeId: get().activeId === id ? null : get().activeId,
        });
      },
      appendMessage: (chatId, message) =>
        set({
          chats: get().chats.map((chat) => {
            if (chat.id !== chatId) return chat;
            const messages = [...chat.messages, message].slice(-MAX_STORED);
            const title =
              chat.messages.length === 0 && message.role === "user"
                ? titleFrom(message.content)
                : chat.title;
            return { ...chat, messages, title, updatedAt: Date.now() };
          }),
        }),
      patchMessage: (chatId, messageId, content) =>
        set({
          chats: get().chats.map((chat) =>
            chat.id === chatId
              ? {
                  ...chat,
                  updatedAt: Date.now(),
                  messages: chat.messages.map((message) =>
                    message.id === messageId ? { ...message, content } : message,
                  ),
                }
              : chat,
          ),
        }),
      dropMessage: (chatId, messageId) =>
        set({
          chats: get().chats.map((chat) =>
            chat.id === chatId
              ? {
                  ...chat,
                  messages: chat.messages.filter((message) => message.id !== messageId),
                }
              : chat,
          ),
        }),
    }),
    {
      name: "vani-assistant",
      partialize: (state) => ({
        chats: state.chats,
        activeId: state.activeId,
        composerPersona: state.composerPersona,
        settings: state.settings,
      }),
    },
  ),
);
