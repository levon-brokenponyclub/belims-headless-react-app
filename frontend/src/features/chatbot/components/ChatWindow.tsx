import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChatMessageItem } from "./ChatMessageItem";
import { ChatInput } from "./ChatInput";
import { QuickReplies } from "./QuickReplies";
import { ChatMessage } from "../types.ts";

interface ChatWindowProps {
  isTyping: boolean;
  messages: ChatMessage[];
  onSendMessage: (text: string, imageFile?: File) => void;
  onQuickIntent: (intent: string) => void;
  onAddToCart: (productId: string) => void;
  onBuyNow: (productId: string) => void;
  onCheckStock: (productId: string) => void;
  onEditFinderAnswers: () => void;
  onDecisionOptionSelect: (value: string) => void;
  onEditDecisionAnswers: () => void;
  onCompareShortlist: () => void;
  onOpenDeliveryLocation: () => void;
  onOpenDeliveryOptions: () => void;
  onPdpAction: (
    action: "check_stock" | "delivery_options",
    productId: string,
  ) => void;
  onActionChip: (
    action:
      | { type: "add_to_cart"; productId: string; label: string }
      | { type: "find_alternatives"; productId: string; label: string },
  ) => void;
  decisionModeActive?: boolean;
  decisionAcceleratorChips?: string[];
  showProductsInChat?: boolean;
  inputAutoFocus?: boolean;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  isTyping,
  messages,
  onSendMessage,
  onQuickIntent,
  onAddToCart,
  onBuyNow,
  onCheckStock,
  onEditFinderAnswers,
  onDecisionOptionSelect,
  onEditDecisionAnswers,
  onCompareShortlist,
  onOpenDeliveryLocation,
  onOpenDeliveryOptions,
  onPdpAction,
  onActionChip,
  decisionModeActive = false,
  decisionAcceleratorChips = [],
  showProductsInChat = false,
  inputAutoFocus,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  const lastMessage = useMemo(() => messages[messages.length - 1], [messages]);

  useEffect(() => {
    if (shouldAutoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping, shouldAutoScroll]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) {
      return;
    }

    const handleScroll = () => {
      const threshold = 40;
      const atBottom =
        node.scrollHeight - node.scrollTop - node.clientHeight < threshold;
      setShouldAutoScroll(atBottom);
    };

    node.addEventListener("scroll", handleScroll);
    return () => node.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="h-full min-h-0 bg-gradient-to-b from-violet-50/20 to-white flex flex-col">
      <div
        ref={containerRef}
        className="flex-1 min-h-0 overflow-y-auto p-5 space-y-5"
      >
        {messages.map((msg) => (
          <ChatMessageItem
            key={msg.id}
            message={msg}
            onAddToCart={onAddToCart}
            onBuyNow={onBuyNow}
            onCheckStock={onCheckStock}
            onEditFinderAnswers={onEditFinderAnswers}
            onDecisionOptionSelect={onDecisionOptionSelect}
            onEditDecisionAnswers={onEditDecisionAnswers}
            onCompareShortlist={onCompareShortlist}
            onOpenDeliveryLocation={onOpenDeliveryLocation}
            onOpenDeliveryOptions={onOpenDeliveryOptions}
            onPdpAction={onPdpAction}
            onActionChip={onActionChip}
            showProductsInChat={showProductsInChat}
          />
        ))}

        {lastMessage?.role === "assistant" && (
          <div className="overflow-x-auto pb-1">
            <QuickReplies
              onIntent={onQuickIntent}
              decisionModeActive={decisionModeActive}
              decisionAcceleratorChips={decisionAcceleratorChips}
            />
          </div>
        )}

        {isTyping && (
          <div className="flex items-center space-x-2 text-violet-500 text-sm ml-4 animate-[chatFadeIn_150ms_ease-out]">
            <div
              className="w-2 h-2 bg-violet-400 rounded-full animate-bounce"
              style={{ animationDelay: "0ms" }}
            />
            <div
              className="w-2 h-2 bg-violet-400 rounded-full animate-bounce"
              style={{ animationDelay: "150ms" }}
            />
            <div
              className="w-2 h-2 bg-violet-400 rounded-full animate-bounce"
              style={{ animationDelay: "300ms" }}
            />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-gray-200 bg-white">
        <ChatInput
          onSendMessage={onSendMessage}
          isLoading={isTyping}
          autoFocus={inputAutoFocus}
          decisionModeActive={decisionModeActive}
        />
      </div>

      <style>
        {`@keyframes chatFadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }`}
      </style>
    </div>
  );
};
