import { IntentType, ChatAction as BaseChatAction } from "../types";

export type QuickReply =
  | { type: "INTENT"; label: string; intent: IntentType }
  | { type: "TEXT"; label: string; text: string }
  | { type: "ACTION"; label: string; action: ChatAction };

export type ChatAction =
  | { type: "ADD_TO_CART"; productId: string; quantity?: number }
  | {
      type: "ADD_BUNDLE_TO_CART";
      items: { productId: string; quantity: number }[];
    }
  | { type: "OPEN_PRODUCT"; productId: string }
  | { type: "COMPARE"; productIds: string[] }
  | { type: "RESTART" }
  | {
      type: "SET_DELIVERY_PRIORITY";
      priority: "FASTEST" | "CHEAPEST" | "PICKUP_ONLY";
    }
  | { type: "SET_BUDGET_MODE"; mode: "CHEAPEST" | "BEST_VALUE" }
  | { type: "SET_PROJECT_MODE"; mode: "COMPLETE_KIT" | "MATERIALS_ONLY" };

export type Card =
  | {
      kind: "PRODUCT_GBB";
      title: string;
      why: string;
      delivery: { etaLabel: string; costLabel: string };
      products: Array<{
        tier: "GOOD" | "BETTER" | "BEST";
        id: string;
        name: string;
        price: number;
        rating?: number;
        stock?: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
      }>;
    }
  | {
      kind: "PROJECT_KIT_TIERS";
      title: string;
      why: string;
      delivery: { etaLabel: string; costLabel: string };
      tiers: Array<{
        tier: "BUDGET" | "VALUE" | "PRO";
        totalPrice: number;
        savingsLabel?: string;
        items: { id: string; name: string; qty: number; price: number }[];
      }>;
    };

export interface AssistantResponse {
  intent: IntentType;
  messages: Array<{ role: "assistant"; text: string }>;
  cards?: Card[];
  quickReplies?: QuickReply[]; // MUST be <= 3 primary choices
  actions?: ChatAction[]; // non-UI actions
  memoryPatch?: Partial<{
    preferredBrands: string[];
    budgetMode: "CHEAPEST" | "BEST_VALUE";
    deliveryPriority: "FASTEST" | "CHEAPEST" | "PICKUP_ONLY";
    skillLevel: "DIY" | "PRO";
    lastProjectType: string;
  }>;
}
