import { Product, Category } from "../types";
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
const getCache = new Map<string, CacheEntry<unknown>>();

export const cachedGetJson = async <T>(
  url: string,
  options: RequestInit = {},
): Promise<T> => {
  const cached = getCache.get(url);
  const now = Date.now();

  if (cached && cached.expiresAt > now) {
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
        const responseText = await response.text();
        throw new Error(
          `Request failed: ${response.status} ${response.statusText} ${responseText.substring(0, 200)}`,
        );
      }
      return response.json() as Promise<T>;
    })
    .catch((error) => {
      getCache.delete(url);
      throw error;
    });

  getCache.set(url, {
    expiresAt: now + GET_CACHE_TTL_MS,
    promise: requestPromise,
  });
  return requestPromise;
};

/**
 * Fetch Products from WooCommerce via custom API
 */
export const fetchProducts = async (category?: string): Promise<Product[]> => {
  try {
    let endpoint = `${BASE_URL}/products`;
    const params = new URLSearchParams();

    if (category) {
      params.append("category", category);
    }

    const url = params.toString() ? `${endpoint}?${params}` : endpoint;
    console.log(`Fetching products from: ${url}`);

    const data = await cachedGetJson<any[]>(url);

    // Data is already formatted by our custom plugin!
    // But we need to resolve deals
    return (data as any[]).map(enrichProductWithDeals);
  } catch (error) {
    console.error("Belims API Error:", error);
    return [];
  }
};

/**
 * Fetch Featured Products from WooCommerce
 */
export const fetchFeaturedProducts = async (): Promise<Product[]> => {
  try {
    const url = `${BASE_URL}/products?featured=true`;
    console.log(`Fetching featured products from: ${url}`);

    const data = await cachedGetJson<any[]>(url);
    return (data as any[]).map(enrichProductWithDeals);
  } catch (error) {
    console.error("Belims API Error:", error);
    return [];
  }
};

/**
 * Fetch Categories from WooCommerce via custom API
 */
export const fetchCategories = async (): Promise<Category[]> => {
  try {
    const url = `${BASE_URL}/categories`;
    console.log(`Fetching categories from: ${url}`);

    return await cachedGetJson<Category[]>(url);
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
