import { Product, WooCommerceCategory } from "../types";
import { enrichProductWithDeals } from "./dealService";
import { getAuthHeaders } from "./authService";

/**
 * BELIMS HEADLESS API SERVICE
 * ------------------------------------
 * Automatically detects environment and uses appropriate API endpoint
 *
 * Production (https://belims-headless-react-app.netlify.app):
 *   Uses Netlify proxy: /api/belims/v1/* → cms.belims.co.za/wp-json/belims/v1/*
 *
 * Development (http://localhost:3000):
 *   Uses Vite proxy: /api/belims/v1/* → cms.belims.co.za/wp-json/belims/v1/*
 *
 * Endpoints:
 * - GET /products
 * - GET /products/:id
 * - GET /categories
 * - POST /orders
 */

// Detect environment and set appropriate API base URL
export function getApiBaseUrl(): string {
  if (
    typeof window !== "undefined" &&
    window.location.hostname === "localhost"
  ) {
    // Use Vite proxy: /api/belims/v1/* → cms.belims.co.za/wp-json/belims/v1/*
    // Keeps auth cookies on localhost:3000 origin for proper credentials:"include"
    return "/api/belims/v1";
  }

  // In production (Vercel) - use relative proxy path
  return "/api/belims/v1";
}

const BASE_URL = getApiBaseUrl();

type CacheEntry<T> = {
  expiresAt: number;
  promise: Promise<T>;
};

const GET_CACHE_TTL_MS = 60_000;
const RETRY_DELAY_MS = 600;
// Cold full-catalogue responses take ~10s to start; real stalls run 60s+.
const RESPONSE_TIMEOUT_MS = 25_000;
const RETRYABLE_STATUSES = new Set([403, 429, 502, 503, 504]);

class RetryableError extends Error {
  constructor(message: string, readonly retryable: boolean) {
    super(message);
  }
}
const GET_CACHE_MAX_ENTRIES = 120;
const getCache = new Map<string, CacheEntry<unknown>>();

const touchCacheKey = (key: string, value: CacheEntry<unknown>) => {
  getCache.delete(key);
  getCache.set(key, value);
};

const pruneCacheIfNeeded = () => {
  while (getCache.size > GET_CACHE_MAX_ENTRIES) {
    const oldestKey = getCache.keys().next().value;
    if (!oldestKey) break;
    getCache.delete(oldestKey);
  }
};

const buildCacheKey = (url: string, options: RequestInit) => {
  const headers = options.headers ? JSON.stringify(options.headers) : "";
  return `${url}::${headers}`;
};

export const cachedGetJson = async <T>(
  url: string,
  options: RequestInit = {},
): Promise<T> => {
  const cacheKey = buildCacheKey(url, options);
  const hasAbortSignal = Boolean(options.signal);
  const cached = hasAbortSignal ? null : getCache.get(cacheKey);
  const now = Date.now();

  if (cached && cached.expiresAt > now) {
    touchCacheKey(cacheKey, cached);
    return cached.promise as Promise<T>;
  }

  // The timeout covers waiting for the response to start (an origin stall),
  // not the body download, so large catalogue payloads on slow links still finish.
  const attempt = () => {
    const controller = new AbortController();
    const abortFromCaller = () => controller.abort();
    if (options.signal?.aborted) controller.abort();
    options.signal?.addEventListener("abort", abortFromCaller, { once: true });
    const timer = setTimeout(() => controller.abort(), RESPONSE_TIMEOUT_MS);

    return fetch(url, {
      ...options,
      signal: controller.signal,
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    })
      .catch((error) => {
        if (controller.signal.aborted && !options.signal?.aborted) {
          throw new RetryableError(`No response from ${url} within ${RESPONSE_TIMEOUT_MS}ms`, true);
        }
        throw error;
      })
      .finally(() => clearTimeout(timer))
      .then(async (response) => {
      if (!response.ok) {
        if (response.status === 304 && cached) {
          return cached.promise as Promise<T>;
        }
        const responseText = await response.text();
        throw new RetryableError(
          `Request failed: ${response.status} ${response.statusText} ${responseText.substring(0, 200)}`,
          RETRYABLE_STATUSES.has(response.status),
        );
      }

      const contentLengthHeader = response.headers.get("content-length");
      if (contentLengthHeader) {
        const contentLength = Number(contentLengthHeader);
        if (Number.isFinite(contentLength)) {
          console.log(
            `[Performance][API] ${url} payload: ${(contentLength / 1024).toFixed(1)}kb`,
          );
        }
      }

      // A bot-protection challenge (HTML) or a body cut off in transit both
      // surface as a parse failure — worth one retry.
      const body = await response.text();
      try {
        return JSON.parse(body) as T;
      } catch (parseError) {
        throw new RetryableError(
          `Invalid JSON from ${url} (${body.length} bytes): ${(parseError as Error).message}`,
          true,
        );
      }
    });
  };

  const requestPromise = attempt()
    .catch(async (error) => {
      if (!(error instanceof RetryableError) || !error.retryable || options.signal?.aborted) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      return attempt();
    })
    .catch((error) => {
      if (!hasAbortSignal) {
        getCache.delete(cacheKey);
      }
      throw error;
    });

  if (!hasAbortSignal) {
    getCache.set(cacheKey, {
      expiresAt: now + GET_CACHE_TTL_MS,
      promise: requestPromise,
    });
    pruneCacheIfNeeded();
  }

  return requestPromise;
};

type FetchProductsOptions = {
  page?: number;
  perPage?: number;
  fields?: string[];
  view?: "listing" | "detail";
  signal?: AbortSignal;
};

const DEFAULT_LISTING_FIELDS = [
  "id",
  "name",
  "slug",
  "category",
  "price",
  "regular_price",
  "sale_price",
  "price_excl_vat",
  "image",
  "featured_image",
  "stock",
  "stock_status",
  "maxStock",
  
  "isFeatured",
  "deals",
  "best_deal_consumer",
  "best_deal_trade",
  "acf",
  "cross_sell_ids",
];

/**
 * Fetch Products from WooCommerce via custom API
 */
export const fetchProducts = async (
  category?: string,
  search?: string,
  options: FetchProductsOptions = {},
): Promise<Product[]> => {
  try {
    let endpoint = `${BASE_URL}/products`;
    const params = new URLSearchParams();

    const view = options.view || "listing";
    params.append("view", view);

    const requestedFields =
      options.fields && options.fields.length > 0
        ? options.fields
        : view === "listing"
          ? DEFAULT_LISTING_FIELDS
          : undefined;

    if (requestedFields && requestedFields.length > 0) {
      params.append("fields", requestedFields.join(","));
    }

    if (options.page && options.page > 0) {
      params.append("page", String(options.page));
    }

    if (options.perPage && options.perPage > 0) {
      params.append("per_page", String(options.perPage));
    }

    if (category) {
      params.append("category", category);
    }

    if (search) {
      params.append("search", search);
    }

    const url = params.toString() ? `${endpoint}?${params}` : endpoint;
    // console.log(`Fetching products from: ${url}`);

    const data = await cachedGetJson<any[]>(url);

    return (data as Product[]).map((item) =>
      enrichProductWithDeals({
        ...item,
        image: item.image || item.featured_image || "",
      }),
    );
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return [];
    }
    console.error("Belims API Error:", error);
    return [];
  }
};

/**
 * Fetch Featured Products from WooCommerce
 */
export const fetchFeaturedProducts = async (): Promise<Product[]> => {
  try {
    const params = new URLSearchParams();
    params.append("featured", "true");
    params.append("view", "listing");
    params.append("fields", DEFAULT_LISTING_FIELDS.join(","));
    const url = `${BASE_URL}/products?${params.toString()}`;
    // console.log(`Fetching featured products from: ${url}`);

    const data = await cachedGetJson<any[]>(url);
    return (data as Product[]).map((item) =>
      enrichProductWithDeals({
        ...item,
        image: item.image || item.featured_image || "",
      }),
    );
  } catch (error) {
    console.error("Belims API Error:", error);
    return [];
  }
};

/**
 * Homepage rail products (~100 newest / best-stocked / deal / hand-tools items)
 * — lets the homepage render without waiting for the full catalogue.
 */
export const fetchHomeProducts = async (): Promise<Product[]> => {
  try {
    const params = new URLSearchParams();
    params.append("fields", DEFAULT_LISTING_FIELDS.join(","));
    const data = await cachedGetJson<any[]>(`${BASE_URL}/products/home?${params.toString()}`);
    return (data as Product[]).map((item) =>
      enrichProductWithDeals({
        ...item,
        image: item.image || item.featured_image || "",
      }),
    );
  } catch (error) {
    console.error("Belims API Error:", error);
    return [];
  }
};

/**
 * Store locations + ecommerce policies. Routed through cachedGetJson so the
 * several components that need it on one page share a single request.
 */
export const fetchEcommercePolicies = <T = any>(): Promise<T> =>
  cachedGetJson<T>(`${BASE_URL}/ecommerce-policies`);

export const fetchProductById = async (
  id: string,
  options: { fields?: string[]; signal?: AbortSignal } = {},
): Promise<Product | null> => {
  try {
    const params = new URLSearchParams();
    params.append("view", "detail");
    if (options.fields?.length) {
      params.append("fields", options.fields.join(","));
    }
    const url = `${BASE_URL}/products/${encodeURIComponent(id)}?${params.toString()}`;
    const data = await cachedGetJson<Product>(url, { signal: options.signal });
    return enrichProductWithDeals({
      ...data,
      image: data.image || data.featured_image || "",
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return null;
    }
    console.error("Belims API Error:", error);
    return null;
  }
};

/**
 * Fetch Categories from WooCommerce via custom API
 */
export const fetchCategories = async (): Promise<WooCommerceCategory[]> => {
  try {
    const url = `${BASE_URL}/categories`;
    // console.log(`Fetching categories from: ${url}`);

    return await cachedGetJson<WooCommerceCategory[]>(url);
  } catch (error) {
    console.error("Belims API Error:", error);
    return [];
  }
};

export interface ProductFiltersData {
  range?: Array<{ id: number; name: string; slug: string; count: number }>;
  color?: Array<{ id: number; name: string; slug: string; count: number }>;
  brand?: Array<{ id: number; name: string; slug: string; count: number }>;
}

/**
 * Fetch Product dynamic filters (range, color, brand)
 */
export const fetchProductFilters = async (): Promise<ProductFiltersData> => {
  try {
    const url = `${BASE_URL}/products/filters`;
    const data = await cachedGetJson<ProductFiltersData>(url);
    if (data && typeof data === "object") {
      return data;
    }
  } catch {}

  return { range: [], color: [], brand: [] };
};

/**
 * Create an Order via custom API
 */
export const createOrder = async (orderData: any) => {
  try {
    const response = await fetch(`${BASE_URL}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(orderData),
    });

    if (!response.ok) throw new Error("Failed to create order");
    return await response.json();
  } catch (error) {
    console.error("Create Order Error:", error);
    throw error;
  }
};

/**
 * Validate a WooCommerce coupon code.
 * Returns the coupon object if valid, throws with a user-facing message if not.
 */
export const validateCoupon = async (
  code: string,
): Promise<{ code: string; discount_type: string; amount: string }> => {
  const response = await fetch(
    `${BASE_URL}/coupons?code=${encodeURIComponent(code.trim())}`,
    { headers: { "Content-Type": "application/json" } },
  );

  if (!response.ok) {
    throw new Error("Could not validate coupon. Please try again.");
  }

  const data = await response.json();
  const coupon = Array.isArray(data) ? data[0] : data?.coupon ?? null;

  if (!coupon) {
    throw new Error("Invalid or expired coupon code.");
  }

  return coupon;
};

/**
 * Fetch Customer Orders via custom API
 */
export const fetchCustomerOrders = async () => {
  try {
    const response = await fetch(`${BASE_URL}/orders`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
    });

    if (!response.ok) {
      console.error(`API Error: ${response.status} ${response.statusText}`);
      throw new Error(`Failed to fetch orders: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Fetch Orders Error:", error);
    return [];
  }
};
