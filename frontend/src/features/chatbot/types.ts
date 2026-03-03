import type { CustomerContext } from "./context/customerContext";

export type ChatRole = "user" | "assistant" | "tool" | "system";

export type ToolCall = {
  tool: string;
  args: Record<string, unknown>;
};

export type StockLevel = "in_stock" | "low_stock" | "out_of_stock" | "unknown";

export type InventoryStatus = {
  productId: string;
  sku?: string;
  level: StockLevel;
  qty?: number;
  locationId?: string;
  locationName?: string;
  updatedAt: string;
};

export type DeliveryOption = {
  id: string;
  type: "delivery" | "pickup";
  label: string;
  etaText: string;
  etaDate?: string;
  etaDays?: number;
  price?: number;
  isFree?: boolean;
  badge?: string;
  locationId?: string;
};

export type DeliveryStatus = {
  productId: string;
  destination?: {
    street?: string;
    city?: string;
    province?: string;
    postalCode?: string;
  };
  options: DeliveryOption[];
  selectedOptionId?: string;
  updatedAt: string;
};

export type FulfillmentContext = {
  deliveryAddress?: {
    street?: string;
    city?: string;
    province?: string;
    postalCode?: string;
  } | null;
  deliveryLocationSet: boolean;
  pickupStoreId?: string | null;
  pickupStoreName?: string | null;
  pickupStoreHours?: Record<
    string,
    {
      open?: string;
      close?: string;
      breakStart?: string;
      breakEnd?: string;
      closed?: boolean;
      note?: string;
    }
  >;
  selectedDeliveryOptionId?: string | null;
  updatedAt?: string;
};

export type PdpContext = {
  productId: string;
  title: string;
  price?: number;
  imageUrl?: string;
  category?: string;
  updatedAt: string;
};

export type Product = {
  id: string;
  title: string;
  price: number;
  imageUrl: string;
  sku?: string;
  rating?: number;
  reviewCount?: number;
  inStock?: boolean;
  stockQty?: number;
  stockLevel?: StockLevel;
  deliveryEtaText?: string;
  deliveryEtaDays?: number;
  deliveryPrice?: number;
  deliveryBadge?: string;
  deliveryOptionId?: string;
  isBestFit?: boolean;
  isFastestOption?: boolean;
  deliveryEta?: string;
};

export type DecisionModeKey = "useCase" | "budget" | "preference";

export type DecisionModeAnswers = {
  categoryOrUseCase?: string;
  budget?: { min?: number; max?: number; raw?: string };
  preference?: string;
  usage?: "home" | "business";
  urgency?: "today" | "this_week" | "no_rush";
  compareFocus?: "cheapest" | "best_value" | "top_rated" | "fastest_delivery";
};

export type DecisionModeState = {
  active: boolean;
  step: 0 | 1 | 2 | 3;
  questionsAsked: number;
  lastQuestionKey?: DecisionModeKey;
  answers: DecisionModeAnswers;
  startedAt: string;
};

export type StockStatus = {
  inStock: boolean;
  qty?: number;
  updatedAt: string;
};

export type PromoResult = {
  code: string;
  discountText: string;
  amountOff?: number;
  percentOff?: number;
  message: string;
};

export type OrderStatus = {
  orderId: string;
  status: string;
  eta?: string;
  trackingUrl?: string;
  lastUpdate?: string;
};

export type TradeAccountStatus = {
  userId?: string;
  enrolled: boolean;
  approved: boolean;
  programmeName: string;
  accountNumber?: string;
  pricingSummary?: string;
  nextStep?: string;
  supportContact?: string;
};

export type FinderQuestionKey = "useCase" | "budget" | "preferences";

export type FinderAnswer = {
  useCase?: string;
  budget?: string;
  preferences?: string;
};

export type ChatMessageMeta = {
  toolCall?: ToolCall;
  products?: Product[];
  activeResultsKind?:
    | ActiveResults["kind"]
    | "products"
    | "inventory"
    | "delivery"
    | "fulfillment";
  inventory?: InventoryStatus;
  delivery?: DeliveryStatus;
  fulfillment?: FulfillmentContext;
  missingAddress?: boolean;
  pdpContext?: PdpContext;
  pdpActions?: Array<"check_stock" | "delivery_options">;
  actionChips?: Array<
    | {
        type: "add_to_cart";
        productId: string;
        label: string;
      }
    | {
        type: "find_alternatives";
        productId: string;
        label: string;
      }
  >;
  decision?: {
    active?: boolean;
    question?: {
      key: DecisionModeKey;
      text: string;
      options?: string[];
    };
    summary?: DecisionModeAnswers;
    bestFitProductId?: string;
  };
  stock?: StockStatus;
  promo?: PromoResult;
  order?: OrderStatus;
  tradeAccount?: TradeAccountStatus;
  finder?: {
    active?: boolean;
    step?: number;
  };
  finderQuestion?: {
    key: FinderQuestionKey;
    text: string;
  };
  finderSummary?: FinderAnswer;
  assistantText?: string;
  payment?: {
    status: "initiated" | "confirmed";
    intentId?: string;
    amount?: number;
  };
  escalation?: boolean;
};

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  meta?: ChatMessageMeta;
};

export type ToolRouterResult = {
  assistantText?: string;
  products?: Product[];
  inventory?: InventoryStatus;
  inventoryBatch?: Record<string, InventoryStatus>;
  delivery?: DeliveryStatus;
  deliveryBatch?: Record<string, DeliveryStatus>;
  fulfillment?: FulfillmentContext;
  missingAddress?: boolean;
  stock?: StockStatus;
  promo?: PromoResult;
  order?: OrderStatus;
  tradeAccount?: TradeAccountStatus;
};

export type ChatApiContext = {
  userId?: string;
  cartId?: string;
  cartSummary?: {
    itemCount: number;
    subtotal?: number;
    promoCode?: string;
  };
  lastViewedProducts?: string[];
  decisionAnswers?: DecisionModeAnswers;
  fulfillment?: FulfillmentContext;
  pdpContext?: PdpContext;
};

export type ChatApiRequest = {
  messages: ChatMessage[];
  context: ChatApiContext;
  customerContext?: CustomerContext;
};

export type AssistantApiMessage = {
  role: "assistant";
  content: string;
  meta?: {
    toolCall?: ToolCall;
  };
};

export type ChatApiResponse = {
  message: AssistantApiMessage;
};

export type ActiveResults =
  | { kind: "none" }
  | { kind: "products"; query: string; items: Product[] }
  | {
      kind: "inventory";
      productId: string;
      inventory: InventoryStatus;
    }
  | {
      kind: "delivery";
      productId: string;
      delivery: DeliveryStatus;
      missingAddress?: boolean;
    }
  | {
      kind: "fulfillment";
      fulfillment: FulfillmentContext;
      options?: DeliveryOption[];
      missingAddress?: boolean;
    }
  | { kind: "order"; order: OrderStatus }
  | { kind: "promo"; promo: PromoResult }
  | { kind: "stock"; productId: string; status: StockStatus }
  | { kind: "trade_account"; tradeAccount: TradeAccountStatus };
