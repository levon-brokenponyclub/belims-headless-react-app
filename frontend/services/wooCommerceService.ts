import { Product, Category } from "../types";

/**
 * BELIMS HEADLESS API SERVICE
 * ------------------------------------
 * Uses custom WordPress plugin endpoints (no API keys needed!)
 *
 * Setup:
 * 1. Activate "Belims Headless API" plugin in WordPress
 * 2. Set VITE_WOO_SITE_URL in .env to your WordPress URL
 *
 * Endpoints:
 * - GET /wp-json/belims/v1/products
 * - GET /wp-json/belims/v1/products/:id
 * - GET /wp-json/belims/v1/categories
 * - POST /wp-json/belims/v1/orders
 */

// Environment variable - just the site URL
const SITE_URL =
  import.meta.env.REACT_APP_WOO_SITE_URL ||
  "https://wordpress-1482444-6163809.cloudwaysapps.com";

// Base URL for custom API
const BASE_URL = `${SITE_URL}/wp-json/belims/v1`;

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
