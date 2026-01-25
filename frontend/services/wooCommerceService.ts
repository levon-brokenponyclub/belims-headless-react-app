import { Product, Category } from "../types";

/**
 * BELIMS HEADLESS API SERVICE
 * ------------------------------------
 * Uses Netlify proxy to bypass CORS in production
 *
 * Production: /api/belims/v1/* → Netlify proxies to cms.belims.co.za/wp-json/belims/v1/*
 * Development: http://localhost:5173/api/belims/v1/* (also uses proxy in dev for consistency)
 *
 * Endpoints:
 * - GET /api/belims/v1/products
 * - GET /api/belims/v1/products/:id
 * - GET /api/belims/v1/categories
 * - POST /api/belims/v1/orders
 */

// Always use the Netlify proxy endpoint
const BASE_URL = "/api/belims/v1";

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
