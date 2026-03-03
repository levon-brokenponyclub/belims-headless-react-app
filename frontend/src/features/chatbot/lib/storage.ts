import { ChatMessage } from "../types";

const CHAT_HISTORY_KEY = "belims:chatbot:history:v1";

type ChatHistory = {
  messages: ChatMessage[];
};

export const chatStorage = {
  key: CHAT_HISTORY_KEY,
  load(): ChatHistory | null {
    if (typeof window === "undefined") {
      return null;
    }

    try {
      const raw = window.localStorage.getItem(CHAT_HISTORY_KEY);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw) as ChatHistory;
      if (!Array.isArray(parsed.messages)) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  },
  save(history: ChatHistory): void {
    if (typeof window === "undefined") {
      return;
    }
    try {
      window.localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(history));
    } catch {
      // ignore storage errors to keep chat responsive
    }
  },
};
