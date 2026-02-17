import { IntentType, ChatMessage, UserProfile, ChatState } from "../types";

export class IntentRouter {
  // Simple keyword matching for now, would be an LLM call in production
  static classify(message: string, context?: ChatState): IntentType {
    const text = message.toLowerCase();

    if (text === "hi" || text === "hello" || text === "hey") {
      return "GREETING";
    }

    if (
      text.includes("drill") ||
      text.includes("saw") ||
      text.includes("hammer") ||
      text.includes("paint") ||
      text.includes("buy") ||
      text.includes("find") ||
      text.includes("products") ||
      text.includes("search")
    ) {
      return "PRODUCT_SEARCH";
    }
    if (
      text.includes("project") ||
      text.includes("build") ||
      text.includes("install") ||
      text.includes("renovate")
    ) {
      return "PROJECT_BASED";
    }
    if (
      text.includes("price") ||
      text.includes("cheap") ||
      text.includes("cost") ||
      text.includes("deal")
    ) {
      return "PRICE_FOCUSED";
    }
    if (
      text.includes("delivery") ||
      text.includes("ship") ||
      text.includes("pickup") ||
      text.includes("when")
    ) {
      return "DELIVERY_LOGISTICS";
    }
    if (
      text.includes("kit") ||
      text.includes("bundle") ||
      text.includes("set")
    ) {
      return "TOOL_KIT_BUILDER";
    }
    if (
      text.includes("help") ||
      text.includes("unsure") ||
      text.includes("idea")
    ) {
      return "UNSURE_GUIDANCE";
    }
    if (
      text.includes("compare") ||
      text.includes("difference") ||
      text.includes("vs")
    ) {
      return "COMPARISON";
    }
    if (text.includes("cart") || text.includes("checkout")) {
      return "CART_ASSISTANCE";
    }
    if (text.includes("help")) {
      return "UNSURE_GUIDANCE";
    }

    return "UNKNOWN"; // Could be GREETING if simple "hi"
  }
}
