export interface Product {
  id: string;
  name: string;
  category: string; // Final price (VAT-inclusive)
  price: number;
  regular_price?: number;
  sale_price?: number;
  price_excl_vat?: number;
  image: string;
  images?: string[]; // For gallery
  rating: number;
  reviews: number;
  stock: number; // Current stock
  maxStock: number; // For the stock bar visual
  weight?: number; // Weight in kg for shipping calculation
  isBundle?: boolean;
  bundleSavings?: number;
  description?: string;
  colors?: string[];
  brand?: string;
  sku?: string;
  features?: string[];
  specifications?: { label: string; value: string }[];
  tags?: string[]; // For AI matching
  bundleCandidates?: BundleCandidate[];
  in_stock?: boolean;
}

export interface BundleCandidate {
  id: string;
  name: string;
  price: number;
  regular_price?: number;
  image: string;
  category?: string;
  rating?: number;
  reviews?: number;
  stock?: number;
}

export interface Store {
  id: string;
  name: string;
  address: string;
  distance?: number;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Category {
  id: string;
  name: string;
  image: string;
  subcategories: string[];
}

export interface CategoryNode {
  id: string;
  label: string;
  children?: CategoryNode[];
}

export enum StockStatus {
  IN_STOCK = "In Stock",
  LOW_STOCK = "Low Stock",
  OUT_OF_STOCK = "Out of Stock",
}

export interface PaintRecommendation {
  colorName: string;
  hexCode: string;
  description: string;
  mood: string;
}

export interface AIRecommendation {
  productId: string;
  reason: string;
  matchScore: number;
}

export interface CompetitorPrice {
  storeName: string;
  price: number;
  url: string;
  isCheaper: boolean;
  difference: number;
}

export interface PriceMatchResult {
  analysis: string;
  sources: { title: string; uri: string }[];
}
