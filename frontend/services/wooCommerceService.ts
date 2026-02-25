import { Product, WooCommerceCategory } from "../types";
import { enrichProductWithDeals } from "./dealService";

/**
 * BELIMS HEADLESS API SERVICE
 * ------------------------------------
 * Automatically detects environment and uses appropriate API endpoint
 *
 * Production (https://belims-headless-react-app.netlify.app):
 *   Uses Netlify proxy: /api/belims/v1/* → cms.belims.co.za/wp-json/belims/v1/*
 *
 * Development (http://localhost:3000):
 *   Uses direct API: http://belims-headless.local/wp-json/belims/v1/*
 *
 * Endpoints:
 * - GET /products
 * - GET /products/:id
 * - GET /categories
 * - POST /orders
 */

// Detect environment and set appropriate API base URL
export function getApiBaseUrl(): string {
  // In development (localhost:3000)
  if (
    typeof window !== "undefined" &&
    window.location.hostname === "localhost"
  ) {
    // Use local domain which is reachable
    return "http://belims-headless.local/wp-json/belims/v1";
  }

  // In production (Netlify) - use relative proxy path
  return "/api/belims/v1";
}

const BASE_URL = getApiBaseUrl();

type CacheEntry<T> = {
  expiresAt: number;
  promise: Promise<T>;
};

const GET_CACHE_TTL_MS = 60_000;
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

  const requestPromise = fetch(url, {
    ...options,
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  })
    .then(async (response) => {
      if (!response.ok) {
        if (response.status === 304 && cached) {
          return cached.promise as Promise<T>;
        }
        const responseText = await response.text();
        throw new Error(
          `Request failed: ${response.status} ${response.statusText} ${responseText.substring(0, 200)}`,
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

      return response.json() as Promise<T>;
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
  "in_stock",
  "rating",
  "reviews",
  "sku",
  "brand",
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
    console.log(`Fetching products from: ${url}`);

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
    console.log(`Fetching featured products from: ${url}`);

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
    console.log(`Fetching categories from: ${url}`);

    return await cachedGetJson<WooCommerceCategory[]>(url);
  } catch (error) {
    console.error("Belims API Error:", error);
    return [];
  }
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
 * Fetch Customer Orders via custom API
 */
export const fetchCustomerOrders = async () => {
  try {
    const response = await fetch(`${BASE_URL}/orders`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // Include cookies for authentication
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
