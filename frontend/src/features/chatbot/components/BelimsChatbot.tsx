import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  Cookie,
  LayoutGrid,
  LifeBuoy,
  MessageSquare,
  Minus,
  Pencil,
  X,
} from "lucide-react";
import { postChat, createPaymentIntentApi } from "../lib/api";
import { createIdleDetector } from "../lib/idle";
import { chatStorage } from "../lib/storage";
import { CustomerContext } from "../context/customerContext";
import {
  loadCustomerContext,
  updateCustomerContext,
} from "../lib/customerMemory";
import { buildToolMessage, executeToolCall } from "../lib/toolRouter";
import {
  ActiveResults,
  ChatMessage,
  DeliveryOption,
  DeliveryStatus,
  DecisionModeAnswers,
  DecisionModeKey,
  DecisionModeState,
  FinderAnswer,
  FinderQuestionKey,
  FulfillmentContext,
  PdpContext,
  Product,
  ToolCall,
} from "../types.ts";
import {
  buildDecisionQuery,
  createInitialDecisionState,
  DECISION_MAX_QUESTIONS,
  detectDecisionIntent,
  extractDecisionAnswersFromText,
  getBinaryAcceleratorChips,
  getDecisionQuestionOptions,
  getDecisionQuestionText,
  getNextDecisionQuestion,
  isSkipValue,
  isTopicShiftIntent,
  mergeDecisionAnswers,
  pickBestFitProduct,
  rankDecisionProducts,
} from "../lib/decisionMode";
import { ChatWindow } from "./ChatWindow";
import { ChatButton } from "./ChatButton";
import { DeliveryOptionsModal } from "./DeliveryOptionsModal";
import { ResultsPanel } from "./ResultsPanel";
import { BottomDrawer } from "../../../../components/BottomDrawer";
import { DeliveryLocationModal } from "../../../../components/DeliveryLocationModal";
import { ShippingAddress, Store } from "../../../../types";
import {
  getFulfillmentContext,
  hydrateFromSiteStorage,
  setDeliveryAddress as setSharedDeliveryAddress,
  setPickupStore as setSharedPickupStore,
  setSelectedDeliveryOption as setSharedDeliveryOption,
  subscribeFulfillmentContext,
} from "../../../lib/fulfillmentContext";

interface BelimsChatbotProps {
  userId?: string;
  cartId?: string;
  onAddToCart?: (productId: string) => void;
  onBuyNow?: (productId: string) => void;
  onCheckout?: (orderId: string) => void;
  onEscalateToHuman?: () => void;
}

const createMessage = (
  role: ChatMessage["role"],
  content: string,
  meta?: ChatMessage["meta"],
): ChatMessage => ({
  id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  role,
  content,
  createdAt: new Date().toISOString(),
  meta,
});

const INITIAL_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Hi. I can recommend products, check stock, apply promos, track orders, handle checkout, and help with support.",
  createdAt: new Date().toISOString(),
};

const FINDER_STATE_STORAGE_KEY = "belims:chatbot:finder:v1";
const DECISION_STATE_STORAGE_KEY = "belims:chatbot:decision:v1";
const CUSTOMER_CONTEXT_STORAGE_KEY = "belims_ai_context";
const DEV_STORAGE_TOGGLE_KEY = "belims:chatbot:dev:storage-enabled";
const FINDER_MAX_QUESTIONS = 3;
const MAX_MEMORY_ITEMS = 10;

const FINDER_TRIGGER_PHRASES = [
  "help me choose",
  "not sure",
  "i don't know what i need",
  "i dont know what i need",
  "i don't know what i'm looking for",
  "i dont know what im looking for",
  "recommend something",
  "help me find it",
];

const FINDER_QUESTION_TEXT: Record<FinderQuestionKey, string> = {
  useCase: "What are you shopping for and what will you use it for?",
  budget: "What’s your budget range?",
  preferences:
    "Any must-haves? (size, color, brand, material, compatibility, shipping urgency)",
};

const toStep = (value: number): 0 | 1 | 2 | 3 => {
  if (value <= 0) return 0;
  if (value === 1) return 1;
  if (value === 2) return 2;
  return 3;
};

const isSkipAnswer = (text: string): boolean =>
  /^(skip|no|none|n\/a)$/i.test(text.trim());

const isFinderTrigger = (text: string): boolean => {
  const lower = text.toLowerCase();
  return FINDER_TRIGGER_PHRASES.some((phrase) => lower.includes(phrase));
};

const isBudgetRelevant = (useCase?: string): boolean => {
  if (!useCase) {
    return true;
  }

  return !/(accessor(y|ies)|cable|screw|nail|brush|tape|adapter|battery)/i.test(
    useCase,
  );
};

const parseFinderAnswer = (text: string): Partial<FinderAnswer> => {
  const trimmed = text.trim();
  if (!trimmed) {
    return {};
  }

  const lower = trimmed.toLowerCase();
  const parsed: Partial<FinderAnswer> = {};

  const budgetMatch = trimmed.match(
    /(\$\s?\d+[\d,]*(?:\.\d{1,2})?|under\s+\$?\d+[\d,]*|between\s+\$?\d+[\d,]*\s*(?:and|-)\s*\$?\d+[\d,]*|\d+[\d,]*\s*(?:zar|rand|r))/i,
  );
  if (budgetMatch) {
    parsed.budget = budgetMatch[0];
  }

  if (
    /(shoe|shoes|drill|paint|saw|sander|plumbing|pipe|light|bulb|tile|adhesive|tool|running|garden|hardware|cleaning|storage|safety)/i.test(
      lower,
    )
  ) {
    parsed.useCase = trimmed;
  }

  if (
    /(size|color|colour|brand|material|compatib|shipping|urgent|wide|narrow|black|white|blue|red|green|bosch|dewalt|makita|nike|adidas)/i.test(
      lower,
    ) ||
    trimmed.includes(",")
  ) {
    parsed.preferences = trimmed;
  }

  if (!parsed.useCase && !parsed.budget && !parsed.preferences) {
    parsed.useCase = trimmed;
  }

  return parsed;
};

const mergeFinderAnswers = (
  ...answers: Array<Partial<FinderAnswer> | undefined>
): FinderAnswer =>
  answers.reduce<FinderAnswer>(
    (acc, item) => ({ ...acc, ...(item ?? {}) }),
    {},
  );

const deriveFinderAnswersFromHistory = (
  messages: ChatMessage[],
): FinderAnswer => {
  const userMessages = messages.filter((message) => message.role === "user");
  return userMessages.reduce<FinderAnswer>((acc, message) => {
    const parsed = parseFinderAnswer(message.content);
    return {
      useCase: acc.useCase ?? parsed.useCase,
      budget: acc.budget ?? parsed.budget,
      preferences: acc.preferences ?? parsed.preferences,
    };
  }, {});
};

const getNextFinderQuestion = (
  answers: FinderAnswer,
  questionsAsked: number,
): FinderQuestionKey | null => {
  if (questionsAsked >= FINDER_MAX_QUESTIONS) {
    return null;
  }

  if (!answers.useCase) {
    return "useCase";
  }

  if (!answers.budget && isBudgetRelevant(answers.useCase)) {
    return "budget";
  }

  if (!answers.preferences) {
    return "preferences";
  }

  return null;
};

const uniqueCapped = (values: string[], max = MAX_MEMORY_ITEMS): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];

  values.forEach((value) => {
    const normalized = value.trim();
    if (!normalized) {
      return;
    }
    const key = normalized.toLowerCase();
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    result.push(normalized);
  });

  return result.slice(0, max);
};

const parseBudgetFromText = (
  text: string,
): { min?: number; max?: number } | null => {
  const underMatch = text.match(/under\s+\$?(\d+[\d,]*)/i);
  if (underMatch) {
    return { max: Number(underMatch[1].replace(/,/g, "")) };
  }

  const betweenMatch = text.match(
    /between\s+\$?(\d+[\d,]*)\s*(?:and|-)\s*\$?(\d+[\d,]*)/i,
  );
  if (betweenMatch) {
    return {
      min: Number(betweenMatch[1].replace(/,/g, "")),
      max: Number(betweenMatch[2].replace(/,/g, "")),
    };
  }

  const plain = text.match(/\$\s?(\d+[\d,]*)/);
  if (plain) {
    return { max: Number(plain[1].replace(/,/g, "")) };
  }

  return null;
};

const detectCategories = (text: string): string[] => {
  const lower = text.toLowerCase();
  const checks: Array<[string, string]> = [
    ["drills", "drill"],
    ["saws", "saw"],
    ["sanders", "sander"],
    ["shoes", "shoe"],
    ["paint", "paint"],
    ["plumbing", "plumb"],
  ];

  return checks
    .filter(([, keyword]) => lower.includes(keyword))
    .map(([category]) => category);
};

const detectBrands = (text: string): string[] => {
  const lower = text.toLowerCase();
  const brands = ["Bosch", "Dewalt", "Makita", "Ryobi", "Stanley"];
  return brands.filter((brand) => lower.includes(brand.toLowerCase()));
};

const isInternalCommand = (text: string): boolean =>
  /^CHECK_STOCK:|^SHOW_|^APPLY_|^TRACK_|^DECISION_|^FINDER_|^TRADE_/i.test(
    text,
  ) || text.includes(":sku-");

const isUsageOnlyLabel = (text: string): boolean => {
  const normalized = text.trim().toLowerCase();
  return normalized === "home use" || normalized === "business use";
};

const sanitizeDecisionText = (value?: string): string | undefined => {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed.includes(":")) {
    return undefined;
  }

  if (isInternalCommand(trimmed)) {
    return undefined;
  }

  return trimmed;
};

const sanitizeDecisionAnswers = (
  answers: DecisionModeAnswers,
): DecisionModeAnswers => ({
  ...answers,
  categoryOrUseCase: sanitizeDecisionText(answers.categoryOrUseCase),
  preference: sanitizeDecisionText(answers.preference),
  budget: answers.budget
    ? {
        ...answers.budget,
        raw: sanitizeDecisionText(answers.budget.raw),
      }
    : undefined,
});

export const BelimsChatbot: React.FC<BelimsChatbotProps> = ({
  userId,
  cartId,
  onAddToCart,
  onBuyNow,
  onCheckout,
  onEscalateToHuman,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [lastViewedProducts, setLastViewedProducts] = useState<string[]>([]);
  const [cartSummary, setCartSummary] = useState<{
    itemCount: number;
    subtotal: number;
    promoCode?: string;
  }>({ itemCount: 0, subtotal: 0 });
  const [finderActive, setFinderActive] = useState(false);
  const [finderStep, setFinderStep] = useState<0 | 1 | 2 | 3>(0);
  const [finderAnswers, setFinderAnswers] = useState<FinderAnswer>({});
  const [finderQuestionsAsked, setFinderQuestionsAsked] = useState(0);
  const [lastFinderQuestion, setLastFinderQuestion] = useState<
    FinderQuestionKey | undefined
  >(undefined);
  const [lastFinderAnswers, setLastFinderAnswers] = useState<FinderAnswer>({});
  const [activeResults, setActiveResults] = useState<ActiveResults>({
    kind: "none",
  });
  const [fulfillment, setFulfillment] = useState<FulfillmentContext>({
    deliveryAddress: null,
    deliveryLocationSet: false,
    pickupStoreId: null,
    pickupStoreName: null,
    selectedDeliveryOptionId: null,
    pickupStoreHours: undefined,
    updatedAt: new Date().toISOString(),
  });
  const [pdpContext, setPdpContext] = useState<PdpContext | null>(null);
  const [focusedProductId, setFocusedProductId] = useState<string | null>(null);
  const [isDeliveryLocationModalOpen, setIsDeliveryLocationModalOpen] =
    useState(false);
  const [isDeliveryOptionsModalOpen, setIsDeliveryOptionsModalOpen] =
    useState(false);
  const [deliveryByProduct, setDeliveryByProduct] = useState<
    Record<string, DeliveryStatus>
  >({});
  const [decisionMode, setDecisionMode] = useState<DecisionModeState>(
    createInitialDecisionState(),
  );
  const [mobileView, setMobileView] = useState<"chat" | "results">("chat");
  const [customerContext, setCustomerContext] =
    useState<CustomerContext | null>(null);
  const [showResumeBanner, setShowResumeBanner] = useState(false);
  const [hasContextGreeting, setHasContextGreeting] = useState(false);
  const [storageEnabled, setStorageEnabled] = useState<boolean>(() => {
    if (!import.meta.env.DEV || typeof window === "undefined") {
      return true;
    }

    const stored = window.localStorage.getItem(DEV_STORAGE_TOGGLE_KEY);
    return stored !== "0";
  });

  const idlePromptSentRef = useRef(false);
  const messagesRef = useRef(messages);
  const finderActiveRef = useRef(finderActive);
  const finderAnswersRef = useRef(finderAnswers);
  const finderQuestionsAskedRef = useRef(finderQuestionsAsked);
  const lastFinderQuestionRef = useRef(lastFinderQuestion);
  const decisionModeRef = useRef(decisionMode);
  const wasOpenRef = useRef(false);
  const pdpPromptShownRef = useRef(false);
  const urgencyByQueryRef = useRef<Record<string, number>>({});
  const lastUrgencyAtRef = useRef(0);
  const decisionClarificationForKeyRef = useRef<DecisionModeKey | null>(null);

  useEffect(() => {
    messagesRef.current = messages;
    if (storageEnabled) {
      chatStorage.save({ messages });
    }
  }, [messages, storageEnabled]);

  useEffect(() => {
    finderActiveRef.current = finderActive;
  }, [finderActive]);

  useEffect(() => {
    finderAnswersRef.current = finderAnswers;
  }, [finderAnswers]);

  useEffect(() => {
    finderQuestionsAskedRef.current = finderQuestionsAsked;
  }, [finderQuestionsAsked]);

  useEffect(() => {
    lastFinderQuestionRef.current = lastFinderQuestion;
  }, [lastFinderQuestion]);

  useEffect(() => {
    decisionModeRef.current = decisionMode;
  }, [decisionMode]);

  useEffect(() => {
    if (!storageEnabled) {
      setMessages([INITIAL_MESSAGE]);
      setFinderActive(false);
      setFinderStep(0);
      setFinderAnswers({});
      setFinderQuestionsAsked(0);
      setLastFinderQuestion(undefined);
      setLastFinderAnswers({});
      setDecisionMode(createInitialDecisionState());
      return;
    }

    const saved = chatStorage.load();
    if (saved?.messages?.length) {
      setMessages(saved.messages);
    }

    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(FINDER_STATE_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as {
            finderActive?: boolean;
            finderStep?: 0 | 1 | 2 | 3;
            finderAnswers?: FinderAnswer;
            finderQuestionsAsked?: number;
            lastFinderQuestion?: FinderQuestionKey;
            lastFinderAnswers?: FinderAnswer;
          };

          setFinderActive(Boolean(parsed.finderActive));
          setFinderStep(parsed.finderStep ?? 0);
          setFinderAnswers(parsed.finderAnswers ?? {});
          setFinderQuestionsAsked(parsed.finderQuestionsAsked ?? 0);
          setLastFinderQuestion(parsed.lastFinderQuestion);
          setLastFinderAnswers(parsed.lastFinderAnswers ?? {});
        }

        const decisionRaw = window.localStorage.getItem(
          DECISION_STATE_STORAGE_KEY,
        );
        if (decisionRaw) {
          const parsed = JSON.parse(decisionRaw) as DecisionModeState;
          setDecisionMode({
            ...createInitialDecisionState(),
            ...parsed,
            answers: parsed.answers ?? {},
          });
        }
      } catch {
        // ignore restore errors
      }
    }
  }, [storageEnabled]);

  useEffect(() => {
    if (typeof window === "undefined" || !storageEnabled) {
      return;
    }

    try {
      window.localStorage.setItem(
        FINDER_STATE_STORAGE_KEY,
        JSON.stringify({
          finderActive,
          finderStep,
          finderAnswers,
          finderQuestionsAsked,
          lastFinderQuestion,
          lastFinderAnswers,
        }),
      );
    } catch {
      // ignore persistence errors
    }
  }, [
    finderActive,
    finderStep,
    finderAnswers,
    finderQuestionsAsked,
    lastFinderQuestion,
    lastFinderAnswers,
    storageEnabled,
  ]);

  useEffect(() => {
    if (typeof window === "undefined" || !storageEnabled) {
      return;
    }

    try {
      window.localStorage.setItem(
        DECISION_STATE_STORAGE_KEY,
        JSON.stringify(decisionMode),
      );
    } catch {
      // ignore persistence errors
    }
  }, [decisionMode, storageEnabled]);

  useEffect(() => {
    if (!isOpen) {
      wasOpenRef.current = false;
      setHasContextGreeting(false);
      return;
    }

    const justOpened = !wasOpenRef.current;
    wasOpenRef.current = true;

    const initializeContext = async () => {
      const loaded = storageEnabled
        ? await loadCustomerContext(userId)
        : {
            userId,
            isReturning: false,
            lastViewedCategories: [],
            lastViewedProducts: [],
            recentPurchases: [],
            preferredBrands: [],
            preferredPriceRange: {},
            frequentlyBoughtCategories: [],
            lastSessionContext: {},
            deliveryLocation: undefined,
            updatedAt: new Date().toISOString(),
          };
      setCustomerContext(loaded);

      const hasLastQuery = Boolean(loaded.lastSessionContext?.lastQuery);
      setShowResumeBanner(hasLastQuery);

      if (!justOpened || hasContextGreeting) {
        return;
      }

      let greetingText: string | null = null;

      if (loaded.isReturning && loaded.lastViewedCategories.length > 0) {
        greetingText = `Welcome back. Still looking at ${loaded.lastViewedCategories[0]}? I found fresh options in stock.`;
      } else if (loaded.recentPurchases.length > 0) {
        const lastPurchase = loaded.recentPurchases[0];
        greetingText = `How’s your recent purchase${lastPurchase.title ? ` (${lastPurchase.title})` : ""} working out? Need matching accessories?`;
      }

      if (greetingText) {
        appendMessage(createMessage("assistant", greetingText));
        setHasContextGreeting(true);
      }
    };

    void initializeContext();
  }, [isOpen, userId, hasContextGreeting]);

  useEffect(() => {
    if (!import.meta.env.DEV || typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      DEV_STORAGE_TOGGLE_KEY,
      storageEnabled ? "1" : "0",
    );
  }, [storageEnabled]);

  const applyCustomerContextUpdate = async (
    updater: (prev: CustomerContext) => CustomerContext,
  ) => {
    setCustomerContext((prev) => {
      const base: CustomerContext = prev ?? {
        userId,
        isReturning: false,
        lastViewedCategories: [],
        lastViewedProducts: [],
        recentPurchases: [],
        preferredBrands: [],
        preferredPriceRange: {},
        frequentlyBoughtCategories: [],
        lastSessionContext: {},
        deliveryLocation: undefined,
        updatedAt: new Date().toISOString(),
      };

      const next = {
        ...updater(base),
        userId,
        isReturning: true,
        updatedAt: new Date().toISOString(),
      };

      if (storageEnabled) {
        void updateCustomerContext(next);
      }
      return next;
    });
  };

  const appendMessage = (message: ChatMessage) => {
    setMessages((prev) => [...prev, message]);
  };

  useEffect(() => {
    const syncFromShared = () => {
      const shared = getFulfillmentContext();
      setFulfillment({
        deliveryAddress: shared.deliveryAddress,
        deliveryLocationSet: shared.deliveryLocationSet,
        pickupStoreId: shared.pickupStoreId,
        pickupStoreName: shared.pickupStoreName,
        pickupStoreHours: shared.pickupStoreHours,
        selectedDeliveryOptionId: shared.selectedDeliveryOptionId,
        updatedAt: shared.updatedAt,
      });
      setPdpContext(shared.pdpContext);
    };

    hydrateFromSiteStorage();
    syncFromShared();
    const unsubscribe = subscribeFulfillmentContext(syncFromShared);
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!isOpen) {
      pdpPromptShownRef.current = false;
      return;
    }

    if (!pdpContext || pdpPromptShownRef.current) {
      return;
    }

    const ageMs = Date.now() - new Date(pdpContext.updatedAt).getTime();
    if (Number.isNaN(ageMs) || ageMs > 10 * 60 * 1000) {
      return;
    }

    appendMessage(
      createMessage(
        "assistant",
        `You’re viewing ${pdpContext.title}. Want me to check stock at your pickup store or compare delivery options?`,
        {
          pdpContext,
          pdpActions: ["check_stock", "delivery_options"],
        },
      ),
    );
    pdpPromptShownRef.current = true;
  }, [isOpen, pdpContext]);

  const toShippingAddress = (
    address: FulfillmentContext["deliveryAddress"],
  ): ShippingAddress | undefined => {
    if (!address?.postalCode) {
      return undefined;
    }

    return {
      street: address.street ?? "",
      city: address.city ?? "",
      province: address.province ?? "",
      postalCode: address.postalCode,
      country: "ZA",
      label:
        [address.street, address.city, address.province]
          .filter(Boolean)
          .join(", ") || address.postalCode,
    };
  };

  const selectedDeliveryOption = useMemo(() => {
    const firstDelivery = Object.values(deliveryByProduct)[0];
    if (!firstDelivery) {
      return undefined;
    }
    const selectedId =
      fulfillment.selectedDeliveryOptionId ?? firstDelivery.selectedOptionId;
    return (
      firstDelivery.options.find((option) => option.id === selectedId) ??
      firstDelivery.options[0]
    );
  }, [deliveryByProduct, fulfillment.selectedDeliveryOptionId]);

  const mergeDeliveryIntoProducts = (
    products: Product[],
    deliveryMap: Record<string, DeliveryStatus>,
    selectedOptionId?: string,
  ): Product[] =>
    products.map((product) => {
      const delivery = deliveryMap[product.id];
      if (!delivery) {
        return product;
      }

      const option =
        delivery.options.find(
          (item) => item.id === (selectedOptionId ?? delivery.selectedOptionId),
        ) ?? delivery.options[0];

      return {
        ...product,
        deliveryEtaText: option?.etaText,
        deliveryEtaDays: option?.etaDays,
        deliveryEta: option?.etaDate,
        deliveryPrice: option?.price,
        deliveryBadge: option?.badge,
        deliveryOptionId: option?.id,
      };
    });

  const getPickupClosingSoonText = (): string | null => {
    if (typeof window === "undefined") {
      return null;
    }

    if (window.localStorage.getItem("fulfillmentType") !== "pickup") {
      return null;
    }

    const hours = fulfillment.pickupStoreHours;
    if (!hours) {
      return null;
    }

    const dayKeys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
    const now = new Date();
    const dayKey = dayKeys[now.getDay()];
    const dayHours = hours[dayKey];
    if (!dayHours || dayHours.closed || !dayHours.close) {
      return null;
    }

    const [closeHours, closeMinutes] = dayHours.close
      .split(":")
      .map((part) => Number(part));
    if (Number.isNaN(closeHours) || Number.isNaN(closeMinutes)) {
      return null;
    }

    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const closingMinutes = closeHours * 60 + closeMinutes;
    const remaining = closingMinutes - currentMinutes;
    if (remaining > 0 && remaining <= 120) {
      return `Pickup closes in ${remaining} min. Want to reserve now?`;
    }

    return null;
  };

  const enrichProductsForFulfillment = async (
    products: Product[],
    query: string,
  ): Promise<Product[]> => {
    if (!products.length) {
      return products;
    }

    const enrichmentLimit =
      typeof window !== "undefined" && window.innerWidth < 768 ? 3 : 6;
    const topProducts = products.slice(0, enrichmentLimit);

    const result = await executeToolCall(
      {
        tool: "enrichProducts",
        args: {
          productIds: topProducts.map((item) => item.id),
          products: topProducts,
          locationId: fulfillment.pickupStoreId ?? undefined,
          destination: fulfillment.deliveryAddress ?? null,
          pickupStoreId: fulfillment.pickupStoreId ?? undefined,
        },
      },
      {
        customerContext: customerContext ?? undefined,
        fulfillment,
      },
    );

    const enrichedProducts = (result.products ?? topProducts).slice(
      0,
      enrichmentLimit,
    );

    if (result.deliveryBatch) {
      setDeliveryByProduct(result.deliveryBatch);
    }

    if (result.missingAddress && !fulfillment.deliveryLocationSet) {
      appendMessage(
        createMessage(
          "assistant",
          "Add your delivery address to see rates and arrival dates.",
          {
            missingAddress: true,
            activeResultsKind: "delivery",
            fulfillment,
          },
        ),
      );
    }

    setActiveResults({
      kind: "products",
      query,
      items: enrichedProducts,
    });

    if (!focusedProductId && enrichedProducts.length > 0) {
      setFocusedProductId(enrichedProducts[0].id);
    }

    const queryKey = `${query}::${enrichedProducts.map((item) => item.id).join("|")}`;
    const now = Date.now();
    const lastUrgencyAt = lastUrgencyAtRef.current;
    const alreadySentForQuery = Boolean(urgencyByQueryRef.current[queryKey]);
    const canPostUrgency =
      !alreadySentForQuery && now - lastUrgencyAt >= 5 * 60 * 1000;

    if (canPostUrgency) {
      const focusCandidate =
        enrichedProducts.find((item) => item.id === focusedProductId) ??
        enrichedProducts.find((item) => item.isBestFit) ??
        enrichedProducts[0];

      const lowStock =
        focusCandidate &&
        (focusCandidate.stockLevel === "low_stock" ||
          (typeof focusCandidate.stockQty === "number" &&
            focusCandidate.stockQty <= 3)) &&
        focusCandidate.inStock !== false;

      if (focusCandidate && lowStock) {
        appendMessage(
          createMessage(
            "assistant",
            `Heads up: low stock at ${fulfillment.pickupStoreName ?? "your store"}${typeof focusCandidate.stockQty === "number" ? ` (${focusCandidate.stockQty} left)` : ""}. Want me to reserve it in cart?`,
            {
              actionChips: [
                {
                  type: "add_to_cart",
                  productId: focusCandidate.id,
                  label: "Add to cart",
                },
                {
                  type: "find_alternatives",
                  productId: focusCandidate.id,
                  label: "Find alternatives in stock",
                },
              ],
            },
          ),
        );
        urgencyByQueryRef.current[queryKey] = now;
        lastUrgencyAtRef.current = now;
      } else {
        const pickupClosingSoonText = getPickupClosingSoonText();
        if (pickupClosingSoonText) {
          appendMessage(createMessage("assistant", pickupClosingSoonText));
          urgencyByQueryRef.current[queryKey] = now;
          lastUrgencyAtRef.current = now;
        }
      }
    }

    return enrichedProducts;
  };

  const askDecisionQuestion = (
    key: DecisionModeKey,
    answers: DecisionModeAnswers,
    questionsAsked: number,
  ) => {
    const lastMessage = messagesRef.current[messagesRef.current.length - 1];
    const lastQuestionKey = lastMessage?.meta?.decision?.question?.key;
    if (
      decisionModeRef.current.active &&
      lastMessage?.role === "assistant" &&
      lastQuestionKey === key
    ) {
      return;
    }

    const questionText = getDecisionQuestionText(key);
    const options = getDecisionQuestionOptions(key, answers);
    const nextStep = toStep(
      Math.min(questionsAsked + 1, DECISION_MAX_QUESTIONS),
    );

    setDecisionMode((prev) => ({
      ...prev,
      active: true,
      step: nextStep,
      lastQuestionKey:
        prev.lastQuestionKey === key ? prev.lastQuestionKey : key,
      questionsAsked,
      answers,
    }));

    appendMessage(
      createMessage("assistant", questionText, {
        decision: {
          active: true,
          question: {
            key,
            text: questionText,
            options,
          },
        },
      }),
    );
  };

  const finalizeDecisionMode = async (
    answers: DecisionModeAnswers,
    optionalImage?: File,
  ) => {
    const safeAnswers = sanitizeDecisionAnswers(answers);
    const productQuery = safeAnswers.categoryOrUseCase?.trim();

    if (!productQuery) {
      setDecisionMode((prev) => ({
        ...prev,
        active: true,
        step: 1,
        lastQuestionKey: "useCase",
        answers: safeAnswers,
      }));

      askDecisionQuestion(
        "useCase",
        safeAnswers,
        decisionModeRef.current.questionsAsked,
      );

      if (decisionClarificationForKeyRef.current !== "useCase") {
        appendMessage(
          createMessage(
            "assistant",
            "What product are you shopping for? (e.g. cordless drill, circular saw, paint)",
          ),
        );
        decisionClarificationForKeyRef.current = "useCase";
      }
      return;
    }

    decisionClarificationForKeyRef.current = null;

    const query = buildDecisionQuery(safeAnswers);
    const toolCall: ToolCall = {
      tool: "productSearch",
      args: {
        query,
        context: {
          decisionAnswers: safeAnswers,
        },
      },
    };

    appendMessage(buildToolMessage(toolCall));
    const result = await executeToolCall(toolCall, {
      imageFile: optionalImage,
      customerContext: customerContext ?? undefined,
      fulfillment,
    });

    const ranked = rankDecisionProducts(result.products ?? [], safeAnswers);
    const shortlist = await enrichProductsForFulfillment(
      ranked.slice(0, 5),
      query,
    );
    const bestFit = pickBestFitProduct(shortlist, safeAnswers);

    const bestFitWithFlag = shortlist.map((item) => ({
      ...item,
      isBestFit: Boolean(bestFit && bestFit.id === item.id),
    }));

    if (bestFit?.id) {
      try {
        const stockResult = await executeToolCall(
          { tool: "getStock", args: { productId: bestFit.id } },
          {
            customerContext: customerContext ?? undefined,
            fulfillment,
          },
        );

        if (stockResult.stock) {
          for (const item of bestFitWithFlag) {
            if (item.id === bestFit.id) {
              item.inStock = stockResult.stock.inStock;
              item.stockQty = stockResult.stock.qty;
            }
          }
        }

        // TODO: Wire delivery ETA endpoint for best fit/top-2 products and populate product.deliveryEta.
      } catch {
        // ignore best-fit enrichment errors
      }
    }

    setDecisionMode((prev) => ({
      ...prev,
      active: false,
      step: 3,
      lastQuestionKey: undefined,
      answers: safeAnswers,
    }));

    setActiveResults({
      kind: "products",
      query,
      items: bestFitWithFlag.slice(0, 5),
    });
    setMobileView("results");

    const summary = `Best fit: ${bestFit?.title ?? "Top recommendation"}. I shortlisted ${Math.max(1, bestFitWithFlag.length - 1)} alternatives so you can pick faster.`;

    appendMessage(
      createMessage("assistant", summary, {
        products: bestFitWithFlag,
        activeResultsKind: "products",
        fulfillment,
        decision: {
          active: false,
          summary: safeAnswers,
          bestFitProductId: bestFit?.id,
        },
      }),
    );
  };

  const startDecisionMode = async (seedText?: string, optionalImage?: File) => {
    const parsed = seedText ? extractDecisionAnswersFromText(seedText) : {};
    const initialAnswers: DecisionModeAnswers = {
      ...decisionModeRef.current.answers,
      ...parsed,
    };

    const nextQuestion = getNextDecisionQuestion(initialAnswers, 0);

    setDecisionMode({
      active: true,
      step: nextQuestion ? 1 : 3,
      questionsAsked: 0,
      lastQuestionKey: nextQuestion ?? undefined,
      answers: initialAnswers,
      startedAt: new Date().toISOString(),
    });

    if (!nextQuestion) {
      await finalizeDecisionMode(initialAnswers, optionalImage);
      return;
    }

    askDecisionQuestion(nextQuestion, initialAnswers, 0);
  };

  const continueDecisionMode = async (text: string, optionalImage?: File) => {
    const current = decisionModeRef.current;
    const updates = extractDecisionAnswersFromText(text);
    const skip = isSkipValue(text);
    const withSkip: Partial<DecisionModeAnswers> = { ...updates };
    const currentKey = current.lastQuestionKey;

    if (skip && current.lastQuestionKey === "useCase") {
      withSkip.categoryOrUseCase = undefined;
    }
    if (skip && current.lastQuestionKey === "budget") {
      withSkip.budget = undefined;
    }
    if (skip && current.lastQuestionKey === "preference") {
      withSkip.preference = undefined;
    }

    if (skip) {
      withSkip.compareFocus = current.answers.compareFocus;
      withSkip.urgency = current.answers.urgency;
    }

    const merged = sanitizeDecisionAnswers(
      mergeDecisionAnswers(current.answers, withSkip),
    );

    let satisfied = false;

    if (currentKey === "useCase") {
      const useCase = merged.categoryOrUseCase?.trim() ?? "";
      satisfied = useCase.length > 1 && !isUsageOnlyLabel(useCase);
    } else if (currentKey === "budget") {
      satisfied = Boolean(merged.budget);
    } else if (currentKey === "preference") {
      satisfied = Boolean(
        merged.preference ||
        merged.compareFocus ||
        merged.urgency ||
        merged.usage,
      );
    }

    const shouldCount = skip || satisfied;
    const nextCount = shouldCount
      ? Math.min(current.questionsAsked + 1, DECISION_MAX_QUESTIONS)
      : current.questionsAsked;
    const nextQuestion = shouldCount
      ? getNextDecisionQuestion(merged, nextCount)
      : (currentKey ?? getNextDecisionQuestion(merged, nextCount));

    setDecisionMode((prev) => ({
      ...prev,
      answers: merged,
      questionsAsked: nextCount,
      lastQuestionKey: nextQuestion ?? prev.lastQuestionKey,
      step: nextQuestion ? (shouldCount ? toStep(nextCount) : prev.step) : 3,
    }));

    if (!satisfied && !skip && currentKey) {
      askDecisionQuestion(currentKey, merged, current.questionsAsked);
      if (currentKey === "useCase") {
        if (decisionClarificationForKeyRef.current !== "useCase") {
          appendMessage(
            createMessage(
              "assistant",
              "Tell me the product you need (e.g. cordless drill, paint, nails).",
            ),
          );
          decisionClarificationForKeyRef.current = "useCase";
        }
      }
      return;
    }

    decisionClarificationForKeyRef.current = null;

    if (!nextQuestion || nextCount >= DECISION_MAX_QUESTIONS) {
      await finalizeDecisionMode(merged, optionalImage);
      return;
    }

    askDecisionQuestion(nextQuestion, merged, nextCount);
  };

  const restartDecisionWithExisting = () => {
    const existingAnswers = decisionModeRef.current.answers;
    const nextQuestion =
      getNextDecisionQuestion(existingAnswers, 0) ?? "useCase";

    setDecisionMode((prev) => ({
      ...prev,
      active: true,
      step: 1,
      questionsAsked: 0,
      lastQuestionKey: nextQuestion,
      startedAt: new Date().toISOString(),
    }));

    askDecisionQuestion(nextQuestion, existingAnswers, 0);
  };

  const askFinderQuestion = (
    key: FinderQuestionKey,
    answersSnapshot: FinderAnswer,
    questionsAskedSnapshot: number,
  ) => {
    const nextStep = toStep(Math.min(questionsAskedSnapshot + 1, 3));
    setFinderActive(true);
    setFinderStep(nextStep);
    setFinderAnswers(answersSnapshot);
    setLastFinderAnswers(answersSnapshot);
    setLastFinderQuestion(key);

    appendMessage(
      createMessage("assistant", FINDER_QUESTION_TEXT[key], {
        finder: {
          active: true,
          step: nextStep,
        },
        finderQuestion: {
          key,
          text: FINDER_QUESTION_TEXT[key],
        },
      }),
    );
  };

  const buildRecommendationReason = (
    index: number,
    answers: FinderAnswer,
  ): string => {
    if (answers.budget && index === 0) {
      return "Strong value for your budget target.";
    }

    if (answers.preferences && index === 1) {
      return "Good fit for your must-haves.";
    }

    if (answers.useCase && index === 2) {
      return "Popular choice for your use case.";
    }

    return "Reliable option with strong customer feedback.";
  };

  const finalizeFinderWithRecommendations = async (
    answersSnapshot: FinderAnswer,
    optionalImage?: File,
  ) => {
    const normalizedAnswers: FinderAnswer = {
      useCase: answersSnapshot.useCase,
      budget: answersSnapshot.budget,
      preferences: answersSnapshot.preferences,
    };

    setFinderActive(false);
    setFinderStep(3);
    setFinderAnswers(normalizedAnswers);
    setLastFinderAnswers(normalizedAnswers);
    setLastFinderQuestion(undefined);

    const query = `${normalizedAnswers.useCase ?? "general products"}. Budget: ${normalizedAnswers.budget ?? "no preference"}. Preferences: ${normalizedAnswers.preferences ?? "no preference"}.`;
    const toolCall: ToolCall = {
      tool: "productSearch",
      args: {
        query,
        context: {
          useCase: normalizedAnswers.useCase,
          budget: normalizedAnswers.budget,
          preferences: normalizedAnswers.preferences,
        },
      },
    };

    appendMessage(buildToolMessage(toolCall));
    const result = await executeToolCall(toolCall, {
      imageFile: optionalImage,
      customerContext: customerContext ?? undefined,
      fulfillment,
    });
    const products = await enrichProductsForFulfillment(
      (result.products ?? []).slice(0, 5),
      query,
    );

    appendMessage(
      createMessage("tool", "Finder summary and recommendations ready.", {
        finder: {
          active: false,
          step: 3,
        },
        finderSummary: normalizedAnswers,
        products,
        fulfillment,
      }),
    );

    const productLines = products
      .map(
        (product, index) =>
          `• ${product.title} — ${buildRecommendationReason(index, normalizedAnswers)}`,
      )
      .join("\n");

    const followupText = `Got it — you need ${normalizedAnswers.useCase ?? "a suitable product"}${normalizedAnswers.budget ? ` with a budget around ${normalizedAnswers.budget}` : ""}${normalizedAnswers.preferences ? ` and preferences like ${normalizedAnswers.preferences}` : ""}.\n\n${productLines || "I found a few options to start with."}\n\nWant to narrow by price / brand / color?`;

    appendMessage(
      createMessage("assistant", followupText, {
        finder: {
          active: false,
          step: 3,
        },
        products,
        finderSummary: normalizedAnswers,
        fulfillment,
      }),
    );
  };

  const restartFinder = () => {
    const resetAnswers: FinderAnswer = {};
    setFinderActive(true);
    setFinderStep(0);
    setFinderAnswers(resetAnswers);
    setFinderQuestionsAsked(0);
    setLastFinderQuestion(undefined);
    setLastFinderAnswers(lastFinderAnswers);

    askFinderQuestion("useCase", resetAnswers, 0);
  };

  const startFinderFlow = async (seedText?: string, optionalImage?: File) => {
    const historyAnswers = deriveFinderAnswersFromHistory(messagesRef.current);
    const seedAnswers = seedText ? parseFinderAnswer(seedText) : {};
    const mergedAnswers = mergeFinderAnswers(
      lastFinderAnswers,
      finderAnswersRef.current,
      historyAnswers,
      seedAnswers,
    );

    setFinderActive(true);
    setFinderAnswers(mergedAnswers);
    setLastFinderAnswers(mergedAnswers);
    setFinderQuestionsAsked(0);

    const nextQuestion = getNextFinderQuestion(mergedAnswers, 0);

    await applyCustomerContextUpdate((prev) => ({
      ...prev,
      lastSessionContext: {
        ...prev.lastSessionContext,
        lastQuery: seedText ?? prev.lastSessionContext?.lastQuery,
      },
      lastViewedCategories: uniqueCapped([
        ...detectCategories(seedText ?? ""),
        ...prev.lastViewedCategories,
      ]),
    }));

    if (!nextQuestion) {
      await finalizeFinderWithRecommendations(mergedAnswers, optionalImage);
      return;
    }

    askFinderQuestion(nextQuestion, mergedAnswers, 0);
  };

  const chatContext = useMemo(
    () => ({
      userId,
      cartId,
      cartSummary,
      lastViewedProducts,
      customerContext,
      decisionAnswers: decisionMode.answers,
      fulfillment,
      pdpContext: pdpContext ?? undefined,
    }),
    [
      userId,
      cartId,
      cartSummary,
      lastViewedProducts,
      customerContext,
      decisionMode.answers,
      fulfillment,
      pdpContext,
    ],
  );

  useEffect(() => {
    const cleanup = createIdleDetector(async () => {
      if (!cartId || cartSummary.itemCount < 1 || idlePromptSentRef.current) {
        return;
      }

      idlePromptSentRef.current = true;
      appendMessage(
        createMessage(
          "assistant",
          "Want me to save your cart or apply a discount?",
        ),
      );

      await executeToolCall(
        {
          tool: "scheduleAbandonmentReminder",
          args: { cartId, userId, delaySeconds: 60 },
        },
        {
          customerContext: customerContext ?? undefined,
          fulfillment,
        },
      );
    }, 60_000);

    return cleanup;
  }, [cartId, cartSummary.itemCount, userId, customerContext, fulfillment]);

  useEffect(() => {
    if (!cartId || cartSummary.itemCount < 1) {
      return;
    }

    executeToolCall(
      {
        tool: "scheduleAbandonmentReminder",
        args: { cartId, userId, delaySeconds: 60 },
      },
      {
        customerContext: customerContext ?? undefined,
        fulfillment,
      },
    ).catch(() => {
      // silent fallback: route may not exist in non-Next runtime
    });
  }, [cartId, userId, cartSummary.itemCount, customerContext, fulfillment]);

  const handleToolFollowup = async (toolCall: ToolCall, imageFile?: File) => {
    appendMessage(buildToolMessage(toolCall));

    const result = await executeToolCall(toolCall, {
      imageFile,
      customerContext: customerContext ?? undefined,
      fulfillment,
    });
    let productsForMessage = result.products;
    const assistantText =
      result.assistantText ?? "Done. I’ve updated the latest result for you.";

    if (result.products?.length) {
      const query =
        typeof toolCall.args.query === "string"
          ? toolCall.args.query
          : "recommended products";
      const enrichedProducts = await enrichProductsForFulfillment(
        result.products.slice(0, 5),
        query,
      );
      productsForMessage = enrichedProducts;
      setMobileView("results");

      await applyCustomerContextUpdate((prev) => ({
        ...prev,
        lastSessionContext: {
          ...prev.lastSessionContext,
          lastQuery: query,
          lastResults: enrichedProducts
            ?.slice(0, 3)
            .map((item) => item.title)
            .join(", "),
        },
        preferredBrands: uniqueCapped([
          ...enrichedProducts
            .map((item) => detectBrands(item.title)[0])
            .filter((brand): brand is string => Boolean(brand)),
          ...(prev.preferredBrands ?? []),
        ]),
        lastViewedCategories: uniqueCapped([
          ...detectCategories(query),
          ...prev.lastViewedCategories,
        ]),
      }));
    } else if (result.order) {
      setActiveResults({ kind: "order", order: result.order });
      setMobileView("results");

      const latestProductTitle =
        activeResults.kind === "products" && activeResults.items.length > 0
          ? activeResults.items[0].title
          : undefined;
      const latestProductPrice =
        activeResults.kind === "products" && activeResults.items.length > 0
          ? activeResults.items[0].price
          : 0;

      await applyCustomerContextUpdate((prev) => ({
        ...prev,
        recentPurchases: [
          {
            productId:
              activeResults.kind === "products" &&
              activeResults.items.length > 0
                ? activeResults.items[0].id
                : `order-${result.order?.orderId}`,
            title: latestProductTitle,
            date: new Date().toISOString(),
            price: latestProductPrice,
          },
          ...prev.recentPurchases,
        ].slice(0, MAX_MEMORY_ITEMS),
      }));
    } else if (result.promo) {
      setActiveResults({ kind: "promo", promo: result.promo });
      setMobileView("results");
    } else if (result.stock) {
      const productId = String(toolCall.args.productId ?? "");
      setActiveResults({
        kind: "stock",
        productId,
        status: result.stock,
      });
      setMobileView("results");
    } else if (result.tradeAccount) {
      setActiveResults({
        kind: "trade_account",
        tradeAccount: result.tradeAccount,
      });
      setMobileView("results");
    }

    appendMessage(
      createMessage("assistant", assistantText, {
        products: productsForMessage,
        activeResultsKind: productsForMessage?.length
          ? "products"
          : result.order
            ? "order"
            : result.promo
              ? "promo"
              : result.stock
                ? "stock"
                : result.tradeAccount
                  ? "trade_account"
                  : "none",
        stock: result.stock,
        promo: result.promo,
        order: result.order,
        tradeAccount: result.tradeAccount,
        delivery: result.delivery,
        inventory: result.inventory,
        fulfillment,
        missingAddress: result.missingAddress,
      }),
    );

    if (toolCall.tool === "getStock" && result.stock) {
      const stockProductId = String(toolCall.args.productId ?? "");
      if (stockProductId) {
        setMessages((prev) =>
          prev.map((message) => {
            if (!message.meta?.products?.length) {
              return message;
            }

            const hasTarget = message.meta.products.some(
              (product) => String(product.id) === stockProductId,
            );
            if (!hasTarget) {
              return message;
            }

            return {
              ...message,
              meta: {
                ...message.meta,
                products: message.meta.products.map((product) =>
                  String(product.id) === stockProductId
                    ? {
                        ...product,
                        inStock: result.stock?.inStock,
                        stockQty: result.stock?.qty,
                      }
                    : product,
                ),
              },
            };
          }),
        );
      }
    }

    if (result.promo) {
      setCartSummary((prev) => ({ ...prev, promoCode: result.promo?.code }));
    }

    if (result.order) {
      onCheckout?.(result.order.orderId);
    }

    if (toolCall.tool === "createOrder" && result.order) {
      if (!userId) {
        appendMessage(
          createMessage("assistant", "Please sign in to complete checkout."),
        );
        return;
      }

      const amount = Number(cartSummary.subtotal || 49.99);
      const paymentIntent = await createPaymentIntentApi({
        orderId: result.order.orderId,
        amount,
      });

      appendMessage(
        createMessage("assistant", "Payment initiated.", {
          order: result.order,
          payment: {
            status: "initiated",
            intentId: paymentIntent.intentId,
            amount,
          },
        }),
      );

      appendMessage(
        createMessage("assistant", "Payment confirmed.", {
          order: { ...result.order, status: "paid" },
          payment: {
            status: "confirmed",
            intentId: paymentIntent.intentId,
            amount,
          },
        }),
      );
    }
  };

  const sendMessage = async (text: string, optionalImage?: File) => {
    const trimmed = text.trim();
    if (!trimmed && !optionalImage) {
      return;
    }

    idlePromptSentRef.current = false;

    const userMessage = createMessage(
      "user",
      trimmed || "[Image search request]",
    );
    appendMessage(userMessage);
    setIsTyping(true);

    const detectedBudget = parseBudgetFromText(trimmed);
    const detectedCategories = detectCategories(trimmed);
    const detectedBrands = detectBrands(trimmed);

    if (trimmed) {
      await applyCustomerContextUpdate((prev) => ({
        ...prev,
        lastSessionContext: {
          ...prev.lastSessionContext,
          lastQuery: trimmed,
        },
        lastViewedCategories: uniqueCapped([
          ...detectedCategories,
          ...prev.lastViewedCategories,
        ]),
        preferredBrands: uniqueCapped([
          ...detectedBrands,
          ...(prev.preferredBrands ?? []),
        ]),
        preferredPriceRange: detectedBudget ?? prev.preferredPriceRange,
      }));
    }

    try {
      if (
        /delivery|ship|shipping|eta|arrival|rate/i.test(trimmed) &&
        !fulfillment.deliveryLocationSet
      ) {
        setIsDeliveryLocationModalOpen(true);
        appendMessage(
          createMessage(
            "assistant",
            "Share your delivery address so I can show exact rates and ETA.",
            {
              missingAddress: true,
              fulfillment,
              activeResultsKind: "delivery",
            },
          ),
        );
        return;
      }

      if (/^DECISION_COMPARE:/i.test(trimmed)) {
        const raw = trimmed.split(":")[1]?.trim() ?? "best_value";
        const compareFocus: DecisionModeAnswers["compareFocus"] =
          raw === "cheapest" ||
          raw === "best_value" ||
          raw === "top_rated" ||
          raw === "fastest_delivery"
            ? raw
            : "best_value";

        setDecisionMode((prev) => ({
          ...prev,
          active: true,
          answers: {
            ...prev.answers,
            compareFocus,
          },
        }));

        if (decisionModeRef.current.active) {
          await finalizeDecisionMode(
            {
              ...decisionModeRef.current.answers,
              compareFocus,
            },
            optionalImage,
          );
        }
        return;
      }

      if (/^DECISION_URGENCY:/i.test(trimmed)) {
        const raw = trimmed.split(":")[1]?.trim();
        const urgency: DecisionModeAnswers["urgency"] =
          raw === "today" || raw === "this_week" || raw === "no_rush"
            ? raw
            : "no_rush";

        setDecisionMode((prev) => ({
          ...prev,
          active: true,
          answers: {
            ...prev.answers,
            urgency,
          },
        }));

        if (decisionModeRef.current.active) {
          await finalizeDecisionMode(
            {
              ...decisionModeRef.current.answers,
              urgency,
            },
            optionalImage,
          );
        }
        return;
      }

      if (trimmed === "DECISION_START") {
        await startDecisionMode(undefined, optionalImage);
        return;
      }

      if (isInternalCommand(trimmed)) {
        if (/^CHECK_STOCK:/i.test(trimmed)) {
          const productId = trimmed.split(":")[1]?.trim();
          if (!productId) {
            appendMessage(
              createMessage(
                "assistant",
                "Select a product first, then I can run a live stock check.",
              ),
            );
            return;
          }
          await handleToolFollowup({
            tool: "getStock",
            args: { productId },
          });
          return;
        }

        if (/^TRACK_ORDER/i.test(trimmed)) {
          const orderId = trimmed.split(":")[1]?.trim();
          if (!orderId) {
            appendMessage(
              createMessage(
                "assistant",
                "Please share your order number so I can track it.",
              ),
            );
            return;
          }
          await handleToolFollowup({
            tool: "trackOrder",
            args: { orderId },
          });
          return;
        }

        if (/^TRADE_ACCOUNT/i.test(trimmed)) {
          await handleToolFollowup({
            tool: "getTradeAccount",
            args: { userId: userId ?? "guest-user" },
          });
          return;
        }
      }

      if (decisionModeRef.current.active && isTopicShiftIntent(trimmed)) {
        setDecisionMode((prev) => ({
          ...prev,
          active: false,
          step: 0,
          lastQuestionKey: undefined,
        }));
      }

      if (decisionModeRef.current.active) {
        await continueDecisionMode(trimmed, optionalImage);
        return;
      }

      if (detectDecisionIntent(trimmed)) {
        await startDecisionMode(trimmed, optionalImage);
        return;
      }

      if (finderActiveRef.current) {
        const currentQuestion = lastFinderQuestionRef.current;
        const parsed = parseFinderAnswer(trimmed);
        const fallbackAnswer = isSkipAnswer(trimmed)
          ? "no preference"
          : trimmed || "no preference";

        const updates: FinderAnswer = {
          ...finderAnswersRef.current,
          ...parsed,
        };

        if (currentQuestion && !updates[currentQuestion]) {
          updates[currentQuestion] = fallbackAnswer;
        }

        const questionsAsked = Math.min(
          finderQuestionsAskedRef.current + 1,
          FINDER_MAX_QUESTIONS,
        );

        setFinderAnswers(updates);
        setLastFinderAnswers(updates);
        setFinderQuestionsAsked(questionsAsked);

        const nextQuestion = getNextFinderQuestion(updates, questionsAsked);
        if (!nextQuestion || questionsAsked >= FINDER_MAX_QUESTIONS) {
          await finalizeFinderWithRecommendations(updates, optionalImage);
          return;
        }

        askFinderQuestion(nextQuestion, updates, questionsAsked);
        return;
      }

      if (trimmed === "FINDER_START" || isFinderTrigger(trimmed)) {
        await startFinderFlow(
          trimmed === "FINDER_START" ? undefined : trimmed,
          optionalImage,
        );
        return;
      }

      const response = await postChat({
        messages: [...messagesRef.current, userMessage],
        context: chatContext,
        customerContext: customerContext ?? undefined,
      });

      const assistantMessage = createMessage(
        "assistant",
        response.message.content,
        response.message.meta,
      );
      appendMessage(assistantMessage);

      const toolCall = response.message.meta?.toolCall;
      if (toolCall) {
        await handleToolFollowup(toolCall, optionalImage);
      }

      if (
        /support|human/i.test(trimmed) ||
        /escalate/i.test(response.message.content)
      ) {
        onEscalateToHuman?.();
        appendMessage(
          createMessage("assistant", "Escalating to support.", {
            escalation: true,
          }),
        );
      }
    } catch {
      appendMessage(
        createMessage(
          "assistant",
          "I’m having trouble right now. Please try again shortly.",
        ),
      );
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuickIntent = (intent: string) => {
    if (intent === "DECISION_START") {
      sendMessage("DECISION_START");
      return;
    }

    if (intent.startsWith("DECISION_COMPARE:")) {
      sendMessage(intent);
      return;
    }

    if (intent.startsWith("DECISION_URGENCY:")) {
      sendMessage(intent);
      return;
    }

    if (intent === "FINDER_START") {
      sendMessage("FINDER_START");
      return;
    }

    if (intent === "FIND_BY_IMAGE") {
      sendMessage(intent);
      return;
    }
    if (intent === "TRADE_ACCOUNT") {
      handleTradeAccount();
      return;
    }
    sendMessage(intent);
  };

  const handleAddToCart = (productId: string) => {
    onAddToCart?.(productId);
    setLastViewedProducts((prev) =>
      [productId, ...prev.filter((p) => p !== productId)].slice(0, 5),
    );
    setCartSummary((prev) => ({
      ...prev,
      itemCount: prev.itemCount + 1,
      subtotal: prev.subtotal + 49.99,
    }));
    appendMessage(
      createMessage("assistant", "Added to cart. Need anything else?"),
    );

    void applyCustomerContextUpdate((prev) => ({
      ...prev,
      lastViewedProducts: uniqueCapped([productId, ...prev.lastViewedProducts]),
    }));
  };

  const handleBuyNow = (productId: string) => {
    const currentProduct =
      activeResults.kind === "products"
        ? activeResults.items.find((item) => item.id === productId)
        : undefined;

    if (currentProduct && currentProduct.inStock === false) {
      void (async () => {
        const altResult = await executeToolCall(
          {
            tool: "findInStockAlternatives",
            args: {
              productId,
              query:
                activeResults.kind === "products"
                  ? activeResults.query
                  : currentProduct.title,
              limit: 5,
            },
          },
          {
            customerContext: customerContext ?? undefined,
            fulfillment,
          },
        );

        const alternatives = (altResult.products ?? []).slice(0, 5);
        const enrichedAlternatives = await enrichProductsForFulfillment(
          alternatives,
          activeResults.kind === "products"
            ? `${activeResults.query} alternatives`
            : "in-stock alternatives",
        );

        appendMessage(
          createMessage(
            "assistant",
            enrichedAlternatives.length
              ? "That item is out of stock. I found in-stock alternatives and added delivery options where available."
              : "That item is currently out of stock. Try changing pickup store or adding delivery details for more options.",
            {
              products: enrichedAlternatives,
              activeResultsKind: "products",
              fulfillment,
            },
          ),
        );
      })();
      return;
    }

    onBuyNow?.(productId);
    setLastViewedProducts((prev) =>
      [productId, ...prev.filter((p) => p !== productId)].slice(0, 5),
    );
    sendMessage("place order");

    void applyCustomerContextUpdate((prev) => ({
      ...prev,
      lastViewedProducts: uniqueCapped([productId, ...prev.lastViewedProducts]),
    }));
  };

  const handleCheckStock = (productId: string) => {
    const normalizedId = String(productId ?? "").trim();
    if (!normalizedId) {
      appendMessage(
        createMessage(
          "assistant",
          "Select a product first, then I can run a live stock check.",
        ),
      );
      return;
    }

    void handleToolFollowup({
      tool: "getStock",
      args: { productId: normalizedId },
    });

    void applyCustomerContextUpdate((prev) => ({
      ...prev,
      lastViewedProducts: uniqueCapped([
        normalizedId,
        ...prev.lastViewedProducts,
      ]),
    }));
  };

  const handlePdpAction = (
    action: "check_stock" | "delivery_options",
    productId: string,
  ) => {
    if (!productId) {
      return;
    }

    if (action === "check_stock") {
      handleCheckStock(productId);
      return;
    }

    void handleOpenDeliveryOptions();
  };

  const handleUrgencyAction = (
    action:
      | { type: "add_to_cart"; productId: string; label: string }
      | { type: "find_alternatives"; productId: string; label: string },
  ) => {
    if (action.type === "add_to_cart") {
      handleAddToCart(action.productId);
      return;
    }

    const query =
      activeResults.kind === "products"
        ? activeResults.query
        : "in-stock alternatives";

    void (async () => {
      const altResult = await executeToolCall(
        {
          tool: "findInStockAlternatives",
          args: {
            productId: action.productId,
            query,
            limit: 5,
          },
        },
        {
          customerContext: customerContext ?? undefined,
          fulfillment,
        },
      );

      const enrichedAlternatives = await enrichProductsForFulfillment(
        (altResult.products ?? []).slice(0, 5),
        `${query} alternatives`,
      );

      appendMessage(
        createMessage("assistant", "I found alternatives currently in stock.", {
          products: enrichedAlternatives,
          fulfillment,
          activeResultsKind: "products",
        }),
      );
    })();
  };

  const handleToggleStorage = () => {
    const nextEnabled = !storageEnabled;
    setStorageEnabled(nextEnabled);

    if (!nextEnabled && typeof window !== "undefined") {
      window.localStorage.removeItem(chatStorage.key);
      window.localStorage.removeItem(FINDER_STATE_STORAGE_KEY);
      window.localStorage.removeItem(DECISION_STATE_STORAGE_KEY);
      window.localStorage.removeItem(CUSTOMER_CONTEXT_STORAGE_KEY);

      setMessages([INITIAL_MESSAGE]);
      setFinderActive(false);
      setFinderStep(0);
      setFinderAnswers({});
      setFinderQuestionsAsked(0);
      setLastFinderQuestion(undefined);
      setLastFinderAnswers({});
      setDecisionMode(createInitialDecisionState());
      setCustomerContext(null);
      setShowResumeBanner(false);
      setHasContextGreeting(false);
      setActiveResults({ kind: "none" });

      appendMessage(
        createMessage(
          "assistant",
          "Dev mode: journey storage is OFF. You are now viewing a fresh user journey.",
        ),
      );
    }

    if (nextEnabled) {
      appendMessage(
        createMessage(
          "assistant",
          "Dev mode: journey storage is ON. Chat memory and context persistence are enabled.",
        ),
      );
    }
  };

  const handleTradeAccount = () => {
    sendMessage("TRADE_ACCOUNT");
  };

  const handleOpenDeliveryLocation = () => {
    setIsDeliveryLocationModalOpen(true);
  };

  const handleDeliveryLocationSelect = async (
    address: ShippingAddress | null,
  ) => {
    const nextAddress = address
      ? {
          street: address.street,
          city: address.city,
          province: address.province,
          postalCode: address.postalCode,
        }
      : null;

    setSharedDeliveryAddress(nextAddress);

    setFulfillment((prev) => ({
      ...prev,
      deliveryAddress: nextAddress,
      deliveryLocationSet: Boolean(
        address?.postalCode || (address?.city && address?.province),
      ),
      selectedDeliveryOptionId: null,
      updatedAt: new Date().toISOString(),
    }));

    setIsDeliveryLocationModalOpen(false);

    if (activeResults.kind === "products" && address?.postalCode) {
      const refreshed = await enrichProductsForFulfillment(
        activeResults.items,
        activeResults.query,
      );

      appendMessage(
        createMessage(
          "assistant",
          `Delivery location saved for ${address.city}. I refreshed rates and ETA for ${refreshed.length} products.`,
          {
            products: refreshed,
            activeResultsKind: "products",
            fulfillment: {
              ...fulfillment,
              deliveryAddress: {
                street: address.street,
                city: address.city,
                province: address.province,
                postalCode: address.postalCode,
              },
              deliveryLocationSet: true,
              selectedDeliveryOptionId: null,
            },
          },
        ),
      );
    }
  };

  const handleOpenDeliveryOptions = async () => {
    if (!fulfillment.deliveryLocationSet) {
      setIsDeliveryLocationModalOpen(true);
      return;
    }

    if (
      Object.keys(deliveryByProduct).length === 0 &&
      activeResults.kind === "products" &&
      activeResults.items.length
    ) {
      await enrichProductsForFulfillment(
        activeResults.items,
        activeResults.query,
      );
    }

    setIsDeliveryOptionsModalOpen(true);
  };

  const handleDeliveryOptionSelect = (optionId: string) => {
    setSharedDeliveryOption(optionId);

    setFulfillment((prev) => ({
      ...prev,
      selectedDeliveryOptionId: optionId,
      updatedAt: new Date().toISOString(),
    }));

    setDeliveryByProduct((prev) => {
      const next: Record<string, DeliveryStatus> = {};
      for (const [productId, status] of Object.entries(prev)) {
        next[productId] = {
          ...status,
          selectedOptionId: optionId,
        };
      }
      return next;
    });

    if (activeResults.kind === "products") {
      setActiveResults({
        ...activeResults,
        items: mergeDeliveryIntoProducts(
          activeResults.items,
          deliveryByProduct,
          optionId,
        ),
      });
    }

    setIsDeliveryOptionsModalOpen(false);
  };

  const activeContextSummary = useMemo(() => {
    const useCase =
      lastFinderAnswers.useCase ||
      finderAnswers.useCase ||
      (activeResults.kind === "products" ? activeResults.query : undefined);
    const budget = lastFinderAnswers.budget || finderAnswers.budget;
    const prefs = lastFinderAnswers.preferences || finderAnswers.preferences;

    const parts = [useCase, budget, prefs].filter(Boolean) as string[];
    if (!parts.length) {
      return null;
    }

    return parts.join(" · ");
  }, [activeResults, finderAnswers, lastFinderAnswers]);

  const focusedProduct = useMemo(() => {
    if (activeResults.kind !== "products") {
      return undefined;
    }

    return (
      activeResults.items.find((item) => item.id === focusedProductId) ??
      activeResults.items[0]
    );
  }, [activeResults, focusedProductId]);

  return (
    <>
      <BottomDrawer
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        ariaLabel="Belims assistant"
      >
        <div className="h-full min-h-0 bg-gradient-to-b from-[#251537]/[0.03] to-white flex flex-col">
          <div className="sticky top-0 z-20 border-b border-gray-200/80 px-4 py-3 bg-white/85 backdrop-blur-md shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-700 to-purple-800 text-white inline-flex items-center justify-center shadow-sm">
                  <Bot size={20} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base md:text-lg font-semibold text-gray-900 truncate">
                    Belims AI Assistant
                  </h3>
                  <div className="text-xs text-gray-500">
                    Shopping &amp; Order Expert
                  </div>
                </div>
                <span className="hidden sm:inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                  </span>
                  Online
                </span>
              </div>

              <div className="flex items-center gap-2">
                {import.meta.env.DEV && (
                  <button
                    type="button"
                    onClick={handleToggleStorage}
                    className={`hidden sm:inline-flex items-center gap-1 text-xs border rounded-full px-3 py-1 transition-colors ${
                      storageEnabled
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        : "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                    }`}
                    title="Dev only: toggle chatbot journey persistence"
                  >
                    <Cookie size={14} />
                    {storageEnabled
                      ? "Journey storage: ON"
                      : "Journey storage: OFF"}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    onEscalateToHuman?.();
                    appendMessage(
                      createMessage("assistant", "Escalating to support.", {
                        escalation: true,
                      }),
                    );
                  }}
                  className="hidden sm:inline-flex items-center gap-1 text-xs border border-orange-200 bg-orange-50 text-orange-700 rounded-full px-3 py-1 hover:bg-orange-100 hover:-translate-y-0.5 transition-all"
                >
                  <LifeBuoy size={14} />
                  Escalate
                </button>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="h-9 w-9 rounded-full border border-gray-200 hover:bg-gray-100 text-gray-600 inline-flex items-center justify-center"
                  aria-label="Minimize chatbot"
                >
                  <Minus size={16} />
                </button>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="h-9 w-9 rounded-full border border-gray-200 hover:bg-gray-100 text-gray-600 inline-flex items-center justify-center"
                  aria-label="Close chatbot"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {activeContextSummary && (
              <button
                type="button"
                onClick={restartFinder}
                className="mt-2 inline-flex items-center gap-2 rounded-full bg-violet-50 border border-violet-200 px-3 py-1.5 text-xs text-violet-800 hover:bg-violet-100 transition-colors"
                title="Edit shopping context"
              >
                <Pencil size={13} />
                {`You’re shopping for: ${activeContextSummary}`}
              </button>
            )}

            {showResumeBanner &&
              customerContext?.lastSessionContext?.lastQuery && (
                <div className="mt-2 flex items-center justify-between rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs text-violet-800">
                  <button
                    type="button"
                    onClick={() => {
                      void sendMessage(
                        customerContext.lastSessionContext?.lastQuery ?? "",
                      );
                      setShowResumeBanner(false);
                    }}
                    className="text-left hover:underline"
                  >
                    You were previously looking at:{" "}
                    {customerContext.lastSessionContext.lastQuery}. Want to
                    continue?
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowResumeBanner(false)}
                    className="ml-2 rounded px-1.5 py-0.5 hover:bg-violet-100"
                    aria-label="Dismiss previous session banner"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
          </div>

          <div className="md:hidden border-b border-gray-200 px-3 py-2 flex items-center gap-2 bg-white/90">
            <button
              type="button"
              onClick={() => setMobileView("chat")}
              className={`text-xs rounded-full px-3 py-1 border ${
                mobileView === "chat"
                  ? "bg-violet-700 text-white border-violet-700"
                  : "bg-white text-gray-700 border-gray-300"
              }`}
            >
              <span className="inline-flex items-center gap-1">
                <MessageSquare size={13} />
                Chat
              </span>
            </button>
            <button
              type="button"
              onClick={() => setMobileView("results")}
              className={`text-xs rounded-full px-3 py-1 border ${
                mobileView === "results"
                  ? "bg-violet-700 text-white border-violet-700"
                  : "bg-white text-gray-700 border-gray-300"
              }`}
            >
              <span className="inline-flex items-center gap-1">
                <LayoutGrid size={13} />
                Results
              </span>
            </button>
          </div>

          <div className="flex-1 min-h-0 md:grid md:grid-cols-[minmax(360px,40%)_minmax(0,60%)]">
            <div
              className={`min-h-0 border-r border-gray-200 ${mobileView === "results" ? "hidden md:block" : "block"}`}
            >
              <ChatWindow
                isTyping={isTyping}
                messages={messages}
                onSendMessage={sendMessage}
                onQuickIntent={handleQuickIntent}
                onAddToCart={handleAddToCart}
                onBuyNow={handleBuyNow}
                onCheckStock={handleCheckStock}
                onEditFinderAnswers={restartFinder}
                onDecisionOptionSelect={(value) => sendMessage(value)}
                onEditDecisionAnswers={restartDecisionWithExisting}
                onCompareShortlist={() => sendMessage("compare top options")}
                onOpenDeliveryLocation={handleOpenDeliveryLocation}
                onOpenDeliveryOptions={handleOpenDeliveryOptions}
                onPdpAction={handlePdpAction}
                onActionChip={handleUrgencyAction}
                decisionModeActive={decisionMode.active}
                decisionAcceleratorChips={getBinaryAcceleratorChips(
                  decisionMode.answers,
                )}
                showProductsInChat={false}
                inputAutoFocus={isOpen}
              />
            </div>

            <div
              className={`min-h-0 ${mobileView === "chat" ? "hidden md:block" : "block"}`}
            >
              <ResultsPanel
                activeResults={activeResults}
                isLoading={isTyping}
                messages={messages}
                onAddToCart={handleAddToCart}
                onBuyNow={handleBuyNow}
                onCheckStock={handleCheckStock}
                onSuggestionSelect={(prompt) => sendMessage(prompt)}
                fulfillment={fulfillment}
                onOpenDeliveryLocation={handleOpenDeliveryLocation}
                onOpenDeliveryOptions={handleOpenDeliveryOptions}
                focusedProduct={focusedProduct}
                onFocusProduct={setFocusedProductId}
              />
            </div>
          </div>
        </div>
      </BottomDrawer>

      <DeliveryLocationModal
        isOpen={isDeliveryLocationModalOpen}
        onClose={() => setIsDeliveryLocationModalOpen(false)}
        currentAddress={toShippingAddress(fulfillment.deliveryAddress)}
        onAddressSelect={(address) => {
          void handleDeliveryLocationSelect(address);
        }}
        currentStore={
          fulfillment.pickupStoreId
            ? {
                id: fulfillment.pickupStoreId,
                name: fulfillment.pickupStoreName ?? "Selected store",
                address: "",
              }
            : null
        }
        onStoreSelect={(store: Store | null) => {
          setSharedPickupStore(
            store?.id ?? null,
            store?.name ?? null,
            store?.hours,
          );
          setFulfillment((prev) => ({
            ...prev,
            pickupStoreId: store?.id ?? null,
            pickupStoreName: store?.name ?? null,
            pickupStoreHours: store?.hours,
            updatedAt: new Date().toISOString(),
          }));
        }}
      />

      <DeliveryOptionsModal
        isOpen={isDeliveryOptionsModalOpen}
        onClose={() => setIsDeliveryOptionsModalOpen(false)}
        options={Object.values(deliveryByProduct)[0]?.options ?? []}
        selectedOptionId={selectedDeliveryOption?.id}
        onSelect={handleDeliveryOptionSelect}
      />

      <ChatButton isOpen={isOpen} onToggle={() => setIsOpen((prev) => !prev)} />
    </>
  );
};
