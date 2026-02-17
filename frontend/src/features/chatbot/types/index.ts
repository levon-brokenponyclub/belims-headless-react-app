import { Card, QuickReply } from "./chatResponse";

export type IntentType =
  | "PRODUCT_SEARCH"
  | "PROJECT_BASED"
  | "PRICE_FOCUSED"
  | "DELIVERY_LOGISTICS"
  | "TOOL_KIT_BUILDER"
  | "UNSURE_GUIDANCE"
  | "COMPARISON"
  | "CART_ASSISTANCE"
  | "GREETING"
  | "UNKNOWN";

export type UserProfile = {
  preferredBrands: string[];
  budgetSensitivity: "low" | "medium" | "high";
  skillLevel: "DIY" | "PRO";
  deliveryPreference: "fastest" | "cheapest" | "pickup";
  projectHistory: string[];
  // Added for new ChatService logic
  budgetMode?: "CHEAPEST" | "BEST_VALUE";
  deliveryPriority?: "FASTEST" | "CHEAPEST" | "PICKUP_ONLY";
  postcode?: string;
};

export type Product = {
  id: string;
  name: string;
  price: number;
  image: string;
  sku: string;
  inStock: boolean;
  eta: string;
  rating: number;
  category: string;
  specs: Record<string, string | number>;
  description: string;
};

export type KitBundle = {
  id: string;
  name: string;
  tier: "Budget" | "Value" | "Professional";
  items: Product[];
  totalPrice: number;
  savings: number;
};

export type MessageType =
  | "text"
  | "product-carousel"
  | "kit-bundle"
  | "quick-reply"
  | "loading";

export type ChatMessage = {
  id: string;
  sender: "user" | "bot";
  type: MessageType;
  text?: string;
  products?: Product[];
  bundles?: KitBundle[];
  quickReplies?: string[];
  structuredReplies?: QuickReply[];
  cards?: Card[];
  timestamp: number;
};

export type ChatState = {
  isOpen: boolean;
  messages: ChatMessage[];
  currentIntent: IntentType | null;
  userProfile: UserProfile;
  isLoading: boolean;
  projectContext?: { wallType?: string; projectType?: string };
};

export type ChatAction =
  | { type: "TOGGLE_CHAT" }
  | { type: "ADD_MESSAGE"; payload: ChatMessage }
  | { type: "SET_INTENT"; payload: IntentType }
  | { type: "UPDATE_PROFILE"; payload: Partial<UserProfile> }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "RESET_CHAT" };
