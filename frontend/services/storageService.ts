import { Product } from "../types";

const STORAGE_KEY = "belims_recently_viewed";
const VERSION_KEY = "belims_storage_version";
const CURRENT_VERSION = "2.0"; // Incremented to clear old hardcoded products
const MAX_ITEMS = 10;

// Clear old localStorage data if version doesn't match
const checkStorageVersion = () => {
  try {
    const storedVersion = localStorage.getItem(VERSION_KEY);
    if (storedVersion !== CURRENT_VERSION) {
      console.log("Storage version mismatch. Clearing old data...");
      localStorage.removeItem(STORAGE_KEY);
      localStorage.setItem(VERSION_KEY, CURRENT_VERSION);
    }
  } catch (e) {
    console.error("Failed to check storage version", e);
  }
};

export const getRecentlyViewed = (): Product[] => {
  try {
    checkStorageVersion(); // Clear old data if needed
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error("Failed to load recently viewed products", e);
    return [];
  }
};

export const addToRecentlyViewed = (product: Product) => {
  try {
    const current = getRecentlyViewed();
    // Remove if already exists to prevent duplicates and move to top
    const filtered = current.filter((p) => p.id !== product.id);

    // Add new product to the beginning
    const updated = [product, ...filtered].slice(0, MAX_ITEMS);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error("Failed to save recently viewed product", e);
  }
};
