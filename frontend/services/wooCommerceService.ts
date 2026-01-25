import { Product, Category } from "../types";

/**
 * BELIMS HEADLESS API SERVICE
 * ------------------------------------
 * Uses Netlify proxy to bypass CORS (production) or direct URL (development)
 *
 * Production: Requests go to /api/belims/v1/* → Netlify proxies to cms.belims.co.za/wp-json/belims/v1/*
 * Development: Requests go directly to https://cms.belims.co.za/wp-json/belims/v1/*
 *
 * Endpoints:
 * - GET /api/belims/v1/products
 * - GET /api/belims/v1/products/:id
 * - GET /api/belims/v1/categories
 * - POST /api/belims/v1/orders
 */

// Use Netlify proxy in production, direct URL in dev
const isDev = import.meta.env.DEV;
const BASE_URL = isDev
  ? "https://cms.belims.co.za/wp-json/belims/v1"
  : "/api/belims/v1";

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
    const response = await fetch(url);

    if (!response.ok) throw new Error("Failed to fetch products");

    const data = await response.json();

    // Data is already formatted by our custom plugin!
    return data;
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
    const response = await fetch(`${BASE_URL}/categories`);
    if (!response.ok) throw new Error("Failed to fetch categories");
    return await response.json();
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
