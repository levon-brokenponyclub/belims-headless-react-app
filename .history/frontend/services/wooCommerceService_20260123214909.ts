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
  import.meta.env.VITE_WOO_SITE_URL || "http://belims-headless.local";

// Base URL for custom API
const BASE_URL = `${SITE_URL}/wp-json/belims/v1`;

/**
 * Fetch Products from WooCommerce
 */
export const fetchProducts = async (category?: string): Promise<Product[]> => {
  if (!SITE_URL) {
    console.warn("WooCommerce URL not set. Using mock data.");
    return [];
  }

  try {
    let endpoint = `/products${getAuthParams()}`;
    if (category) {
      // You would need to fetch the category ID first in a real scenario,
      // or use the 'category' slug filter if supported by your custom endpoint.
      endpoint += `&category=${category}`;
    }

    const response = await fetch(`${BASE_URL}${endpoint}`);
    if (!response.ok) throw new Error("Failed to fetch products");

    const data = await response.json();

    // Map WooCommerce structure to our app's Product interface
    return data.map((item: any) => ({
      id: item.id.toString(),
      name: item.name,
      category: item.categories[0]?.name || "Uncategorized",
      price: parseFloat(item.price),
      image: item.images[0]?.src || "",
      images: item.images.map((img: any) => img.src),
      rating: parseFloat(item.average_rating),
      reviews: item.rating_count,
      stock: item.stock_quantity || 0,
      maxStock: 100, // WooCommerce doesn't typically send "max stock", this is UI logic
      description: item.description.replace(/<[^>]*>?/gm, ""), // Strip HTML
      isBundle: item.type === "grouped" || item.type === "bundle",
      sku: item.sku,
      tags: item.tags.map((t: any) => t.name),
    }));
  } catch (error) {
    console.error("WooCommerce API Error:", error);
    return [];
  }
};

/**
 * Fetch Categories from WooCommerce
 */
export const fetchCategories = async (): Promise<Category[]> => {
  if (!SITE_URL) return [];

  try {
    const response = await fetch(
      `${BASE_URL}/products/categories${getAuthParams()}`,
    );
    if (!response.ok) throw new Error("Failed to fetch categories");
    const data = await response.json();

    return data.map((item: any) => ({
      id: item.slug,
      name: item.name,
      image: item.image?.src || "",
      subcategories: [], // You would need to recursively fetch or structure this
    }));
  } catch (error) {
    console.error("WooCommerce API Error:", error);
    return [];
  }
};

/**
 * Create an Order
 */
export const createOrder = async (orderData: any) => {
  if (!SITE_URL) return;

  try {
    const response = await fetch(`${BASE_URL}/orders${getAuthParams()}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(orderData),
    });
    return await response.json();
  } catch (error) {
    console.error("Create Order Error:", error);
    throw error;
  }
};
