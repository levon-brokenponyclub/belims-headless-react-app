import React, { createContext, useContext, useReducer, useEffect } from "react";
import { ChatState, ChatAction, ChatMessage } from "../types";

const initialMessage: ChatMessage = {
  id: "welcome-msg",
  sender: "bot",
  type: "text",
  text: "Hi 👋 I’m your Belims Project Assistant. I can help you find the right tools, best prices, and fastest delivery. What can I help you with today?",
  timestamp: Date.now(),
  quickReplies: [
    "Find Tools",
    "Start a Project",
    "Check Prices",
    "Delivery Info",
    // 'Build a Kit', // Too many for mobile? keeping it concise
    "I need help",
  ],
};

const initialState: ChatState = {
  isOpen: false,
  messages: [initialMessage],
  currentIntent: null,
  userProfile: {
    preferredBrands: [],
    budgetSensitivity: "medium",
    skillLevel: "DIY",
    deliveryPreference: "cheapest",
    projectHistory: [],
  },
  isLoading: false,
};

const chatReducer = (state: ChatState, action: ChatAction): ChatState => {
  switch (action.type) {
    case "TOGGLE_CHAT":
      return { ...state, isOpen: !state.isOpen };
    case "ADD_MESSAGE":
      return { ...state, messages: [...state.messages, action.payload] };
    case "SET_INTENT":
      return { ...state, currentIntent: action.payload };
    case "UPDATE_PROFILE":
      return {
        ...state,
        userProfile: { ...state.userProfile, ...action.payload },
      };
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    case "RESET_CHAT":
      return {
        ...initialState,
        isOpen: true,
      };
    default:
      return state;
  }
};

const ChatContext = createContext<{
  state: ChatState;
  dispatch: React.Dispatch<ChatAction>;
  addMessage: (message: ChatMessage) => void;
  setIntent: (
    intent:
      | "PRODUCT_SEARCH"
      | "PROJECT_BASED"
      | "PRICE_FOCUSED"
      | "DELIVERY_LOGISTICS"
      | "TOOL_KIT_BUILDER"
      | "UNSURE_GUIDANCE"
      | "COMPARISON"
      | "CART_ASSISTANCE"
      | "GREETING"
      | "UNKNOWN",
  ) => void;
}>({
  state: initialState,
  dispatch: () => null,
  addMessage: () => null,
  setIntent: () => null,
});

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(chatReducer, initialState);

  // Load from local storage on mount
  useEffect(() => {
    const savedState = localStorage.getItem("chatHistory");
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        // Maybe restore only critical parts
        dispatch({ type: "UPDATE_PROFILE", payload: parsed.userProfile });
      } catch (e) {
        console.error("Failed to load chat history", e);
      }
    }
  }, []);

  // Save to local storage on change
  useEffect(() => {
    localStorage.setItem(
      "chatHistory",
      JSON.stringify({
        userProfile: state.userProfile,
        // We persist mainly profile, maybe last few messages? For now just profile.
      }),
    );
  }, [state.userProfile]);

  const addMessage = (message: ChatMessage) =>
    dispatch({ type: "ADD_MESSAGE", payload: message });
  const setIntent = (intent: any) =>
    dispatch({ type: "SET_INTENT", payload: intent });

  return (
    <ChatContext.Provider value={{ state, dispatch, addMessage, setIntent }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => useContext(ChatContext);
