import React from "react";
import { MessageSquare } from "lucide-react";

interface ChatButtonProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const ChatButton: React.FC<ChatButtonProps> = ({ isOpen, onToggle }) => {
  if (isOpen) return null;

  return (
    <button
      onClick={onToggle}
      className="fixed bottom-4 right-4 bg-gradient-to-r from-violet-700 to-purple-700 hover:from-violet-800 hover:to-purple-800 text-white rounded-full p-4 shadow-lg transition transform hover:scale-105 hover:-translate-y-0.5 z-[9999] flex items-center gap-2 group"
    >
      <span className="sr-only">Open Chat</span>
      <MessageSquare className="h-6 w-6" />
      <span className="hidden group-hover:inline-block text-sm font-semibold transition-opacity duration-300">
        Project Help?
      </span>
    </button>
  );
};
