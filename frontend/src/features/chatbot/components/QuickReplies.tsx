import React from "react";

interface QuickRepliesProps {
  replies: string[];
  onClick: (reply: string) => void;
}

export const QuickReplies: React.FC<QuickRepliesProps> = ({
  replies,
  onClick,
}) => {
  if (!replies || replies.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {replies.map((reply) => (
        <button
          key={reply}
          onClick={() => onClick(reply)}
          className="text-sm bg-red-50 text-red-600 border border-red-200 rounded-full px-4 py-1.5 hover:bg-red-100 transition whitespace-nowrap"
        >
          {reply}
        </button>
      ))}
    </div>
  );
};
