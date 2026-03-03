// services/ChatService.ts
import { IntentRouter } from "../logic/IntentRouter";
import { RecommendationEngine } from "../logic/RecommendationEngine";
import { ChatState, IntentType } from "../types/index";
import { AssistantResponse } from "../types/chatResponse.ts";

type Services = {
  productService: { search: (q: string) => Promise<any[]> };
  pricingService: { enrich: (products: any[]) => Promise<any[]> };
  shippingService: {
    estimate: (args: {
      postcode?: string;
      items?: { productId: string; qty: number }[];
    }) => Promise<{ etaLabel: string; costLabel: string }>;
  };
  inventoryService?: {
    getStock: (
      ids: string[],
    ) => Promise<Record<string, "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK">>;
  };
  cartService?: { add: (productId: string, qty?: number) => Promise<void> };
};

const clamp3 = <T>(arr: T[] = []) => arr.slice(0, 3);

const isGreeting = (t: string) => /^(hi|hello|hey|howdy)\b/i.test(t.trim());
const wantsRestart = (t: string) =>
  /(start over|restart|change topic|new search)/i.test(t);

function extractQuery(message: string) {
  return message
    .replace(/(find|buy|looking for|i need|show me|want|need|get me)/gi, "")
    .trim();
}

export class ChatService {
  static async processMessage(
    userMessage: string,
    context: ChatState,
    services: Services,
  ): Promise<AssistantResponse> {
    // 0) Global commands
    if (wantsRestart(userMessage)) return ChatService.restart();

    // 1) Intent detection (reclassify when uncertain OR greeting)
    let intent: IntentType = context.currentIntent as IntentType;

    if (
      !intent ||
      intent === "UNKNOWN" ||
      intent === "GREETING" ||
      isGreeting(userMessage)
    ) {
      intent = await IntentRouter.classify(userMessage, context); // allow AI or rules
    }

    // 2) Route
    switch (intent) {
      case "GREETING":
        return ChatService.greeting();

      case "PRODUCT_SEARCH":
        return ChatService.handleProductSearch(userMessage, context, services);

      case "PROJECT_BASED":
        return ChatService.handleProjectBased(userMessage, context, services);

      case "PRICE_FOCUSED":
        return ChatService.handlePriceFocused(userMessage, context, services);

      case "DELIVERY_LOGISTICS":
        return ChatService.handleDeliveryLogistics(
          userMessage,
          context,
          services,
        );

      case "TOOL_KIT_BUILDER":
        return ChatService.handleToolkitBuilder(userMessage, context, services);

      case "UNSURE_GUIDANCE":
        return ChatService.handleUnsureGuidance(userMessage, context, services);

      case "COMPARISON":
        return ChatService.handleComparison(userMessage, context);

      case "CART_ASSISTANCE":
        return ChatService.handleCartAssistance(userMessage, context);

      default:
        return ChatService.unknown();
    }
  }

  // ---- Global responses ----

  private static greeting(): AssistantResponse {
    return {
      intent: "GREETING",
      messages: [
        {
          role: "assistant",
          text: "Hi 👋 I’m your Belims Project Assistant. I can help you find the right tools, best prices, and fastest delivery.\n\nWhat can I help you with today?",
        },
      ],
      quickReplies: clamp3([
        {
          type: "INTENT",
          label: "🔎 Find a product",
          intent: "PRODUCT_SEARCH",
        },
        {
          type: "INTENT",
          label: "🛠 I’m working on a project",
          intent: "PROJECT_BASED",
        },
        {
          type: "INTENT",
          label: "🚚 Delivery / pickup",
          intent: "DELIVERY_LOGISTICS",
        },
      ]),
    };
  }

  private static restart(): AssistantResponse {
    return {
      intent: "GREETING",
      messages: [
        {
          role: "assistant",
          text: "No problem — let’s start fresh. What can I help you with today?",
        },
      ],
      quickReplies: clamp3([
        {
          type: "INTENT",
          label: "🔎 Find a product",
          intent: "PRODUCT_SEARCH",
        },
        { type: "INTENT", label: "🛠 Project help", intent: "PROJECT_BASED" },
        { type: "INTENT", label: "💰 Best price", intent: "PRICE_FOCUSED" },
      ]),
      actions: [{ type: "RESTART" }],
    };
  }

  private static unknown(): AssistantResponse {
    return {
      intent: "UNKNOWN",
      messages: [
        {
          role: "assistant",
          text: "I can help with product search, project kits, pricing, or delivery. What would you like to do?",
        },
      ],
      quickReplies: clamp3([
        {
          type: "INTENT",
          label: "🔎 Product search",
          intent: "PRODUCT_SEARCH",
        },
        { type: "INTENT", label: "🛠 Project kit", intent: "PROJECT_BASED" },
        { type: "INTENT", label: "💰 Best price", intent: "PRICE_FOCUSED" },
      ]),
    };
  }

  // ---- Handlers ----

  private static async handleProductSearch(
    message: string,
    context: ChatState,
    services: Services,
  ): Promise<AssistantResponse> {
    // Entry prompt
    if (/^(find tools|product search|products)$/i.test(message.trim())) {
      return {
        intent: "PRODUCT_SEARCH",
        messages: [
          {
            role: "assistant",
            text: "What product are you looking for? (e.g., cordless drill, exterior paint, screws)",
          },
        ],
      };
    }

    const query = extractQuery(message);
    if (query.length < 3) {
      return {
        intent: "PRODUCT_SEARCH",
        messages: [
          {
            role: "assistant",
            text: "Could you be a bit more specific — what product do you need?",
          },
        ],
      };
    }

    // Fetch + enrich
    const raw = await services.productService.search(query);
    const enriched = await services.pricingService.enrich(raw);

    // Rank + categorize G/B/B
    const ranked = RecommendationEngine.rank(enriched, {
      profile: context.userProfile,
      intent: "PRODUCT_SEARCH",
      constraints: {
        budgetMode: context?.userProfile?.budgetMode,
        preferredBrands: context?.userProfile?.preferredBrands,
      },
    });

    const { good, better, best } = RecommendationEngine.categorize(ranked);

    const chosen = [good, better, best].filter(Boolean) as any[];
    const ids = chosen.map((p) => p.id);

    // Stock & delivery shown early (spec rule)
    const stockMap = services.inventoryService
      ? await services.inventoryService.getStock(ids)
      : {};
    const delivery = await services.shippingService.estimate({
      postcode: context?.userProfile?.postcode,
      items: chosen.map((p) => ({ productId: p.id, qty: 1 })),
    });

    // Ensure no out-of-stock recommended
    const filtered = chosen.filter((p) => stockMap?.[p.id] !== "OUT_OF_STOCK");

    return {
      intent: "PRODUCT_SEARCH",
      messages: [
        {
          role: "assistant",
          text: `Here are the best matches for **"${query}"** (with delivery shown first):`,
        },
      ],
      cards: [
        {
          kind: "PRODUCT_GBB",
          title: `Top options for "${query}"`,
          why: "Good = cheapest suitable, Better = best value, Best = highest rated/durability.",
          delivery,
          products: filtered.slice(0, 3).map((p, idx) => ({
            tier: (["GOOD", "BETTER", "BEST"] as const)[idx],
            id: p.id,
            name: p.name,
            price: p.price,
            rating: p.rating,
            stock: stockMap?.[p.id] ?? "IN_STOCK",
          })),
        },
      ],
      quickReplies: clamp3([
        { type: "TEXT", label: "Refine search", text: "Refine my search" },
        {
          type: "ACTION",
          label: "Compare",
          action: {
            type: "COMPARE",
            productIds: filtered.slice(0, 3).map((p) => p.id),
          },
        },
        { type: "TEXT", label: "Start over", text: "Restart" },
      ]),
      memoryPatch: {
        // Optional inference hook: user searched → category affinity could be updated elsewhere
      },
    };
  }

  private static async handleProjectBased(
    message: string,
    context: ChatState,
    services: Services,
  ): Promise<AssistantResponse> {
    // Entry prompt if user just switched intent
    if (
      context.currentIntent !== "PROJECT_BASED" ||
      /^(start project|project help)$/i.test(message.trim())
    ) {
      return {
        intent: "PROJECT_BASED",
        messages: [
          {
            role: "assistant",
            text: "What are you working on? (e.g., install shelves, paint a room, fix a leak)",
          },
        ],
        quickReplies: clamp3([
          {
            type: "TEXT",
            label: "Install shelves",
            text: "Installing shelves",
          },
          { type: "TEXT", label: "Paint a room", text: "Painting a room" },
          {
            type: "TEXT",
            label: "Fix plumbing leak",
            text: "Fixing a plumbing leak",
          },
        ]),
      };
    }

    // Minimal clarification example for "shelves" path (expand similarly for other projects)
    const lower = message.toLowerCase();
    if (lower.includes("shelf")) {
      // If missing wall type, ask it
      if (!context.projectContext?.wallType) {
        return {
          intent: "PROJECT_BASED",
          messages: [
            {
              role: "assistant",
              text: "What type of wall are you mounting onto?",
            },
          ],
          quickReplies: clamp3([
            {
              type: "TEXT",
              label: "Brick / Concrete",
              text: "Brick or concrete",
            },
            { type: "TEXT", label: "Drywall", text: "Drywall" },
            { type: "TEXT", label: "Wood", text: "Wood" },
          ]),
        };
      }
    }

    // For now return kit-mode question (spec requires kit tiers)
    return {
      intent: "PROJECT_BASED",
      messages: [
        {
          role: "assistant",
          text: "Do you want a **complete kit** (tools + materials), or **materials only**?",
        },
      ],
      quickReplies: clamp3([
        {
          type: "ACTION",
          label: "Complete kit",
          action: { type: "SET_PROJECT_MODE", mode: "COMPLETE_KIT" },
        },
        {
          type: "ACTION",
          label: "Materials only",
          action: { type: "SET_PROJECT_MODE", mode: "MATERIALS_ONLY" },
        },
        { type: "TEXT", label: "Start over", text: "Restart" },
      ]),
    };
  }

  private static async handlePriceFocused(
    message: string,
    context: ChatState,
    services: Services,
  ): Promise<AssistantResponse> {
    // Price mode selection
    return {
      intent: "PRICE_FOCUSED",
      messages: [
        {
          role: "assistant",
          text: "Do you want the **lowest price** or the **best value** (longer-lasting for the money)?",
        },
      ],
      quickReplies: clamp3([
        {
          type: "ACTION",
          label: "Lowest price",
          action: { type: "SET_BUDGET_MODE", mode: "CHEAPEST" },
        },
        {
          type: "ACTION",
          label: "Best value",
          action: { type: "SET_BUDGET_MODE", mode: "BEST_VALUE" },
        },
        { type: "TEXT", label: "Show deals", text: "Show me current specials" },
      ]),
    };
  }

  private static async handleDeliveryLogistics(
    message: string,
    context: ChatState,
    services: Services,
  ): Promise<AssistantResponse> {
    // If postcode exists, show preferences
    if (context?.userProfile?.postcode) {
      const delivery = await services.shippingService.estimate({
        postcode: context.userProfile.postcode,
      });
      return {
        intent: "DELIVERY_LOGISTICS",
        messages: [
          {
            role: "assistant",
            text: `Delivery for **${context.userProfile.postcode}**: **${delivery.etaLabel}**, **${delivery.costLabel}**.\nWhat should I prioritize?`,
          },
        ],
        quickReplies: clamp3([
          {
            type: "ACTION",
            label: "Fastest",
            action: { type: "SET_DELIVERY_PRIORITY", priority: "FASTEST" },
          },
          {
            type: "ACTION",
            label: "Cheapest",
            action: { type: "SET_DELIVERY_PRIORITY", priority: "CHEAPEST" },
          },
          {
            type: "ACTION",
            label: "Pickup only",
            action: { type: "SET_DELIVERY_PRIORITY", priority: "PICKUP_ONLY" },
          },
        ]),
      };
    }

    return {
      intent: "DELIVERY_LOGISTICS",
      messages: [
        {
          role: "assistant",
          text: "What’s your postcode (or suburb) so I can check delivery cost, ETA, and pickup availability?",
        },
      ],
    };
  }

  private static async handleToolkitBuilder(
    message: string,
    context: ChatState,
    services: Services,
  ): Promise<AssistantResponse> {
    return {
      intent: "TOOL_KIT_BUILDER",
      messages: [
        { role: "assistant", text: "What type of toolkit do you need?" },
      ],
      quickReplies: clamp3([
        { type: "TEXT", label: "DIY starter kit", text: "DIY starter kit" },
        { type: "TEXT", label: "Contractor kit", text: "Contractor kit" },
        { type: "TEXT", label: "Painting kit", text: "Painting kit" },
      ]),
    };
  }

  private static async handleUnsureGuidance(
    message: string,
    context: ChatState,
    services: Services,
  ): Promise<AssistantResponse> {
    return {
      intent: "UNSURE_GUIDANCE",
      messages: [
        {
          role: "assistant",
          text: "No problem — tell me what you’re trying to do (e.g., mount a TV, fix a leak, sand a door).",
        },
      ],
      quickReplies: clamp3([
        { type: "TEXT", label: "Mount a TV", text: "Mount a TV" },
        { type: "TEXT", label: "Fix a leak", text: "Fix a leak" },
        { type: "TEXT", label: "Paint a room", text: "Paint a room" },
      ]),
    };
  }

  private static async handleComparison(
    message: string,
    context: ChatState,
  ): Promise<AssistantResponse> {
    return {
      intent: "COMPARISON",
      messages: [
        {
          role: "assistant",
          text: "Which two products should I compare? Paste names or select from your last results.",
        },
      ],
    };
  }

  private static async handleCartAssistance(
    message: string,
    context: ChatState,
  ): Promise<AssistantResponse> {
    return {
      intent: "CART_ASSISTANCE",
      messages: [
        {
          role: "assistant",
          text: "Want me to check compatibility or suggest missing essentials (max 3)?",
        },
      ],
      quickReplies: clamp3([
        {
          type: "TEXT",
          label: "Check compatibility",
          text: "Check compatibility",
        },
        {
          type: "TEXT",
          label: "Suggest essentials",
          text: "Suggest essentials",
        },
        { type: "TEXT", label: "Go to checkout", text: "Go to checkout" },
      ]),
    };
  }
}
