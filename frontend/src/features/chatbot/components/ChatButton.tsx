import React, { useEffect } from "react";
import { useChat } from "../logic/ChatContext";

export const ChatButton: React.FC = () => {
  const { state, dispatch } = useChat();

  if (state.isOpen) return null;

  return (
    <button
      onClick={() => dispatch({ type: "TOGGLE_CHAT" })}
      className="fixed bottom-4 right-4 bg-red-600 hover:bg-red-700 text-white rounded-full p-4 shadow-lg transition transform hover:scale-105 z-[9999] flex items-center gap-2 group"
    >
      <span className="sr-only">Open Chat</span>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
        />
      </svg>
      <span className="hidden group-hover:inline-block text-sm font-semibold transition-opacity duration-300">
        Project Help?
      </span>
    </button>
  );
};
