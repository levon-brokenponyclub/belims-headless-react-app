import React, { useEffect, useRef } from "react";
import { useChat } from "../logic/ChatContext";
import { ChatService } from "../services/ChatService";
import { ProductService } from "../services/ProductService";
import { ChatMessageItem } from "./ChatMessageItem";
import { ChatInput } from "./ChatInput";
import { QuickReplies } from "./QuickReplies";
import { ChatMessage, Product } from "../types";

export const ChatWindow: React.FC = () => {
  const { state, dispatch, addMessage } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [state.messages]);

  useEffect(() => {
    const handleOpen = () => {
      if (!state.isOpen) {
        dispatch({ type: "TOGGLE_CHAT" });
      }
    };

    window.addEventListener("belims:open-chat", handleOpen);
    return () => window.removeEventListener("belims:open-chat", handleOpen);
  }, [state.isOpen, dispatch]);

  const handleSendMessage = async (text: string) => {
    // Add user message
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: "user",
      type: "text",
      text: text,
      timestamp: Date.now(),
    };
    addMessage(userMsg);

    // Set Loading
    dispatch({ type: "SET_LOADING", payload: true });

    // Call Service
    try {
      // Create services object matching ChatService requirements
      const services = {
        productService: {
          // use wrapper for static method
          search: (q: string) => ProductService.search(q),
        },
        pricingService: {
          enrich: async (products: any[]) => products, // Pass-through mock
        },
        shippingService: {
          estimate: async () => ({
            etaLabel: "2-3 Days",
            costLabel: "Calculating...",
          }),
        },
        inventoryService: {
          getStock: async (ids: string[]) =>
            ids.reduce((acc, id) => ({ ...acc, [id]: "IN_STOCK" }), {}),
        },
        cartService: {
          add: async (id: string, qty: number) =>
            console.log(`Adding ${qty} of ${id} to cart`),
        },
      };

      const response = await ChatService.processMessage(text, state, services);

      // Handle the new AssistantResponse structure
      const botMessages = response.messages.map((msg, index) => ({
        id: (Date.now() + index + 1).toString(),
        sender: "bot" as const,
        type: "text" as const,
        text: msg.text,
        // Only attach cards/actions to the LAST message
        cards:
          index === response.messages.length - 1 ? response.cards : undefined,
        quickReplies:
          index === response.messages.length - 1
            ? response.quickReplies?.map((qr) => qr.label) // Convert back to string array for now
            : undefined,
        structuredReplies:
          index === response.messages.length - 1
            ? response.quickReplies
            : undefined,
        timestamp: Date.now(),
      }));

      // Add all messages
      botMessages.forEach((msg) => addMessage(msg));

      if (response.intent && response.intent !== state.currentIntent) {
        dispatch({ type: "SET_INTENT", payload: response.intent });
      }

      // Update User Profile if memory patch exists
      if (response.memoryPatch) {
        dispatch({
          type: "UPDATE_PROFILE",
          payload: response.memoryPatch,
        });
      }
    } catch (error) {
      console.error(error);
      addMessage({
        id: Date.now().toString(),
        sender: "bot",
        type: "text",
        text: "I'm having trouble connecting right now. Please try again.",
        timestamp: Date.now(),
      });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  const handleAddToCart = (product: Product) => {
    // Implement Cart Logic here or emit event
    console.log("Adding to cart:", product);
    addMessage({
      id: Date.now().toString(),
      sender: "bot",
      type: "text",
      text: `Added ${product.name} to your cart! Anything else?`,
      timestamp: Date.now(),
    });
  };

  if (!state.isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 w-[380px] h-[600px] bg-gray-50 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 z-[9999] font-sans">
      {/* Header */}
      <div className="bg-red-700 text-white p-4 flex justify-between items-center bg-gradient-to-r from-red-700 to-red-600">
        <div>
          <h3 className="font-bold text-lg">Belims Assistant</h3>
          <p className="text-xs text-red-100 opacity-90">
            Expert Help & Project Advice
          </p>
        </div>
        <button
          onClick={() => dispatch({ type: "TOGGLE_CHAT" })}
          className="text-white hover:bg-white/20 rounded-full p-1"
        >
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
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {state.messages.map((msg) => (
          <ChatMessageItem
            key={msg.id}
            message={msg}
            onAddToCart={handleAddToCart}
          />
        ))}

        {/* Quick Replies for last message */}
        {state.messages.length > 0 &&
          state.messages[state.messages.length - 1].sender === "bot" &&
          state.messages[state.messages.length - 1].quickReplies && (
            <QuickReplies
              replies={state.messages[state.messages.length - 1].quickReplies!}
              onClick={handleSendMessage}
            />
          )}

        {state.isLoading && (
          <div className="flex items-center space-x-2 text-gray-400 text-sm ml-4">
            <div
              className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
              style={{ animationDelay: "0ms" }}
            />
            <div
              className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
              style={{ animationDelay: "150ms" }}
            />
            <div
              className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
              style={{ animationDelay: "300ms" }}
            />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <ChatInput
        onSendMessage={handleSendMessage}
        isLoading={state.isLoading}
      />
    </div>
  );
};
