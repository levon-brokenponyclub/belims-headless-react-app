import {
  ChatApiRequest,
  ChatApiResponse,
  DeliveryStatus,
  FulfillmentContext,
  InventoryStatus,
  StockLevel,
  OrderStatus,
  Product,
  PromoResult,
  StockStatus,
  TradeAccountStatus,
} from "../types";
import {
  fetchProducts,
  getApiBaseUrl,
} from "../../../../services/wooCommerceService";
import { getShippingRates } from "../../../../services/bobGoService";
import { TtlCache } from "./cache";
import { normalizeEtaDays } from "./eta";

const nowIso = () => new Date().toISOString();
const ENRICH_TTL_MS = 60_000;

const inventoryCache = new TtlCache<InventoryStatus>(ENRICH_TTL_MS);
const deliveryCache = new TtlCache<DeliveryStatus>(ENRICH_TTL_MS);
let deliveryBatchAbortController: AbortController | null = null;

async function requestJson<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Request failed: ${response.status} ${body}`);
  }
  return (await response.json()) as T;
}

export async function postChat(
  payload: ChatApiRequest,
): Promise<ChatApiResponse> {
  return requestJson<ChatApiResponse>("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function productSearchApi(params: {
  query: string;
  userId?: string;
  context?: string;
}): Promise<{ products: Product[]; assistantText?: string }> {
  const query = String(params.query ?? "").trim();

  try {
    const liveProducts = await fetchProducts(undefined, query || undefined, {
      view: "listing",
      fields: [
        "id",
        "name",
        "slug",
        "price",
        "regular_price",
        "sale_price",
        "image",
        "featured_image",
        "stock",
        "stock_status",
        "maxStock",
        "in_stock",
        "rating",
        "reviews",
        "sku",
        "category",
      ],
      perPage: 12,
    });

    const products: Product[] = liveProducts.map((item) => ({
      id: String(item.id ?? ""),
      title: String(item.name ?? "Product"),
      price: Number(item.price ?? 0),
      imageUrl: String(item.image ?? item.featured_image ?? ""),
      sku: typeof item.sku === "string" ? item.sku : undefined,
      rating:
        typeof item.rating === "number"
          ? item.rating
          : Number(item.rating ?? 0) || undefined,
      reviewCount:
        typeof item.reviews === "number"
          ? item.reviews
          : Number(item.reviews ?? 0) || undefined,
      inStock: Boolean(item.in_stock ?? item.stock_status !== "outofstock"),
      stockQty:
        typeof item.stock === "number"
          ? item.stock
          : Number(item.maxStock ?? 0) || undefined,
    }));

    return {
      products,
      assistantText: `Found ${products.length} live product matches.`,
    };
  } catch {
    const baseUrl = getApiBaseUrl();
    const routeUrl = `${baseUrl}/products`;
    const searchParams = new URLSearchParams({
      view: "listing",
      per_page: "12",
      fields:
        "id,name,slug,price,regular_price,sale_price,image,featured_image,stock,stock_status,maxStock,in_stock,rating,reviews,sku,category",
    });
    if (query) {
      searchParams.set("search", query);
    }

    const raw = await requestJson<Array<Record<string, unknown>>>(
      `${routeUrl}?${searchParams.toString()}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      },
    );

    const products = raw.map((item) => ({
      id: String(item.id ?? ""),
      title: String(item.name ?? "Product"),
      price: Number(item.price ?? 0),
      imageUrl: String(item.image ?? item.featured_image ?? ""),
      sku: typeof item.sku === "string" ? item.sku : undefined,
      rating:
        typeof item.rating === "number"
          ? item.rating
          : Number(item.rating ?? 0) || undefined,
      reviewCount:
        typeof item.reviews === "number"
          ? item.reviews
          : Number(item.reviews ?? 0) || undefined,
      inStock: Boolean(item.in_stock ?? item.stock_status !== "outofstock"),
      stockQty:
        typeof item.stock === "number"
          ? item.stock
          : Number(item.maxStock ?? 0) || undefined,
    }));

    return {
      products,
      assistantText: `Found ${products.length} live product matches.`,
    };
  }
}

export async function imageSearchApi(
  imageFile: File,
): Promise<{ products: Product[]; assistantText?: string }> {
  const formData = new FormData();
  formData.append("image", imageFile);

  return requestJson("/api/products/search-image", {
    method: "POST",
    body: formData,
  });
}

export async function getStockApi(
  productId: string,
): Promise<{ stock: StockStatus; assistantText?: string }> {
  const parseLiveStock = (payload: unknown): StockStatus | null => {
    if (!payload || typeof payload !== "object") {
      return null;
    }

    const data = payload as {
      in_stock?: boolean;
      stock?: number;
      maxStock?: number;
      stock_status?: string;
    };

    const qty =
      typeof data.stock === "number"
        ? data.stock
        : typeof data.maxStock === "number"
          ? data.maxStock
          : undefined;

    const status = String(data.stock_status ?? "").toLowerCase();
    const statusIndicatesOut = status === "outofstock";
    const inStock =
      typeof data.in_stock === "boolean"
        ? data.in_stock
        : typeof qty === "number"
          ? qty > 0
          : !statusIndicatesOut;

    return {
      inStock,
      qty,
      updatedAt: nowIso(),
    };
  };

  const liveStock = await (async () => {
    try {
      const baseUrl = getApiBaseUrl();
      const params = new URLSearchParams({
        view: "detail",
        fields: "id,in_stock,stock,stock_status,maxStock",
      });
      const response = await fetch(
        `${baseUrl}/products/${encodeURIComponent(productId)}?${params.toString()}`,
      );

      if (!response.ok) {
        return null;
      }

      const json = (await response.json()) as unknown;
      return parseLiveStock(json);
    } catch {
      return null;
    }
  })();

  if (liveStock) {
    return {
      stock: liveStock,
      assistantText: liveStock.inStock
        ? `Live stock: ${typeof liveStock.qty === "number" ? `${liveStock.qty} available.` : "In stock."}`
        : "Live stock update: currently out of stock.",
    };
  }

  return requestJson(`/api/products/${productId}/stock`, { method: "GET" });
}

export async function applyPromoApi(payload: {
  cartId: string;
  code: string;
}): Promise<{ promo: PromoResult; assistantText?: string }> {
  return requestJson("/api/cart/apply-promo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function createOrderApi(payload: {
  cartId: string;
  shippingAddress: string;
}): Promise<{ order: OrderStatus; assistantText?: string }> {
  return requestJson("/api/orders/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function trackOrderApi(
  orderId: string,
): Promise<{ order: OrderStatus; assistantText?: string }> {
  return requestJson(`/api/orders/${orderId}`, { method: "GET" });
}

export async function createPaymentIntentApi(payload: {
  orderId: string;
  amount: number;
}): Promise<{
  intentId: string;
  status: "initiated" | "confirmed";
  assistantText?: string;
}> {
  return requestJson("/api/payments/intent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function getTradeAccountApi(payload: {
  userId: string;
}): Promise<{ tradeAccount: TradeAccountStatus; assistantText?: string }> {
  return requestJson("/api/trade/account", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function scheduleAbandonmentReminderApi(payload: {
  cartId: string;
  userId?: string;
  delaySeconds: number;
}): Promise<{ ok: boolean; message: string }> {
  return requestJson("/api/cart/abandonment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

const toStockLevel = (inStock: boolean, qty?: number): StockLevel => {
  if (!inStock) {
    return "out_of_stock";
  }

  if (typeof qty === "number" && qty <= 3) {
    return "low_stock";
  }

  return "in_stock";
};

export async function fetchInventory(
  productId: string,
  locationId?: string,
): Promise<InventoryStatus> {
  const cacheKey = `${productId}:${locationId ?? "global"}`;
  const cached = inventoryCache.get(cacheKey);
  if (cached?.isFresh) {
    return cached.value;
  }

  const { stock } = await getStockApi(productId);
  const normalized: InventoryStatus = {
    productId,
    level: toStockLevel(stock.inStock, stock.qty),
    qty: stock.qty,
    locationId,
    updatedAt: stock.updatedAt,
  };

  inventoryCache.set(cacheKey, normalized);
  return normalized;
}

export async function fetchInventoryBatch(
  productIds: string[],
  locationId?: string,
): Promise<Record<string, InventoryStatus>> {
  const pairs = await Promise.all(
    productIds.map(async (productId) => {
      const inventory = await fetchInventory(productId, locationId);
      return [productId, inventory] as const;
    }),
  );

  return Object.fromEntries(pairs);
}

const normalizeDestination = (
  destination: FulfillmentContext["deliveryAddress"] | null,
): FulfillmentContext["deliveryAddress"] | null => {
  if (!destination?.postalCode) {
    return null;
  }
  return destination;
};

const deliveryCacheKey = (
  productId: string,
  destination: FulfillmentContext["deliveryAddress"] | null,
  pickupStoreId?: string | null,
): string =>
  `${productId}:${destination?.postalCode ?? "missing"}:${pickupStoreId ?? "none"}`;

const requestDeliveryOptions = async (
  productId: string,
  destination: NonNullable<FulfillmentContext["deliveryAddress"]>,
  opts?: { pickupStoreId?: string | null },
): Promise<DeliveryStatus> => {
  try {
    const rates = await getShippingRates({
      destination_address: {
        street: destination.street,
        city: destination.city ?? "",
        province: destination.province,
        postal_code: destination.postalCode ?? "",
        country: "ZA",
      },
      items: [{ id: productId, quantity: 1 }],
    });

    const options = rates.map((rate, index) => ({
      id: rate.service_code,
      type: "delivery" as const,
      label: rate.service_name,
      etaText: rate.expected_delivery_date
        ? `Estimated Arrival: ${rate.expected_delivery_date}`
        : "Estimated Arrival: This week",
      etaDate: rate.expected_delivery_date,
      etaDays: normalizeEtaDays(
        rate.expected_delivery_date,
        rate.expected_delivery_date
          ? `Estimated Arrival: ${rate.expected_delivery_date}`
          : "Estimated Arrival: This week",
      ),
      price: rate.total_price,
      isFree: rate.total_price === 0,
      badge: index === 0 ? "Faster" : undefined,
      locationId: opts?.pickupStoreId ?? undefined,
    }));

    return {
      productId,
      destination: {
        street: destination.street,
        city: destination.city,
        province: destination.province,
        postalCode: destination.postalCode,
      },
      options,
      selectedOptionId: options[0]?.id,
      updatedAt: nowIso(),
    };
  } catch {
    return {
      productId,
      destination: {
        street: destination.street,
        city: destination.city,
        province: destination.province,
        postalCode: destination.postalCode,
      },
      options: [
        {
          id: "fallback-standard",
          type: "delivery",
          label: "Standard Delivery",
          etaText: "Estimated Arrival: 2-4 business days",
          etaDate: undefined,
          etaDays: normalizeEtaDays(
            undefined,
            "Estimated Arrival: 2-4 business days",
          ),
          price: 75,
        },
      ],
      selectedOptionId: "fallback-standard",
      updatedAt: nowIso(),
    };
  }
};

export async function fetchDeliveryOptions(
  productId: string,
  destination: FulfillmentContext["deliveryAddress"] | null,
  opts?: { pickupStoreId?: string | null },
): Promise<DeliveryStatus | { missingAddress: true }> {
  const normalizedDestination = normalizeDestination(destination);
  if (!normalizedDestination) {
    return { missingAddress: true };
  }

  const key = deliveryCacheKey(
    productId,
    normalizedDestination,
    opts?.pickupStoreId,
  );
  const cached = deliveryCache.get(key);

  if (cached) {
    if (!cached.isFresh) {
      void requestDeliveryOptions(productId, normalizedDestination, opts).then(
        (fresh) => {
          deliveryCache.set(key, fresh);
        },
      );
    }
    return cached.value;
  }

  const delivery = await requestDeliveryOptions(
    productId,
    normalizedDestination,
    opts,
  );
  deliveryCache.set(key, delivery);
  return delivery;
}

export async function fetchDeliveryBatch(
  productIds: string[],
  destination: FulfillmentContext["deliveryAddress"] | null,
  opts?: { pickupStoreId?: string | null },
): Promise<Record<string, DeliveryStatus> | { missingAddress: true }> {
  const normalizedDestination = normalizeDestination(destination);
  if (!normalizedDestination) {
    return { missingAddress: true };
  }

  if (deliveryBatchAbortController) {
    deliveryBatchAbortController.abort();
  }
  deliveryBatchAbortController = new AbortController();

  const pairs = await Promise.all(
    productIds.map(async (productId) => {
      const delivery = await fetchDeliveryOptions(
        productId,
        normalizedDestination,
        opts,
      );
      if ("missingAddress" in delivery) {
        return [productId, null] as const;
      }
      return [productId, delivery] as const;
    }),
  );

  const filtered = pairs.filter(
    (entry): entry is readonly [string, DeliveryStatus] => entry[1] !== null,
  );

  return Object.fromEntries(filtered);
}
