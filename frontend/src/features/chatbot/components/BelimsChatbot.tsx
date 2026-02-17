import React from "react";
import { ChatProvider } from "../logic/ChatContext";
import { ChatWindow } from "./ChatWindow";
import { ChatButton } from "./ChatButton";

export const BelimsChatbot: React.FC = () => {
  return (
    <ChatProvider>
      <ChatWindow />
      <ChatButton />
    </ChatProvider>
  );
};
