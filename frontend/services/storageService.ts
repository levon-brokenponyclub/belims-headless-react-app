
import { Product } from '../types';

const STORAGE_KEY = 'belims_recently_viewed';
const MAX_ITEMS = 10;

export const getRecentlyViewed = (): Product[] => {
  try {
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
    const filtered = current.filter(p => p.id !== product.id);
    
    // Add new product to the beginning
    const updated = [product, ...filtered].slice(0, MAX_ITEMS);
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error("Failed to save recently viewed product", e);
  }
};
