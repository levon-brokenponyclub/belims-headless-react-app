import { Product, Category } from "../types";

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
function getApiBaseUrl(): string {
  // In development (localhost:3000)
  if (
    typeof window !== "undefined" &&
    window.location.hostname === "localhost"
  ) {
    return "http://belims-headless.local/wp-json/belims/v1";
  }

  // In production (Netlify) - use relative proxy path
  return "/api/belims/v1";
}

const BASE_URL = getApiBaseUrl();

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

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // Include cookies for CORS requests
    });

    if (!response.ok) {
      console.error(`API Error: ${response.status} ${response.statusText}`);
      const responseText = await response.text();
      console.error("Response:", responseText.substring(0, 200));
      throw new Error(`Failed to fetch products: ${response.status}`);
    }

    const data = await response.json();

    // Data is already formatted by our custom plugin!
    return data;
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

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    if (!response.ok) {
      console.error(`API Error: ${response.status} ${response.statusText}`);
      throw new Error(`Failed to fetch featured products: ${response.status}`);
    }

    const data = await response.json();
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
    const url = `${BASE_URL}/categories`;
    console.log(`Fetching categories from: ${url}`);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    if (!response.ok) {
      console.error(`API Error: ${response.status} ${response.statusText}`);
      throw new Error("Failed to fetch categories");
    }

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
