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
  isFeatured?: boolean; // WooCommerce featured product flag
  bundleSavings?: number;
  description?: string;
  colors?: string[];
  brand?: string;
  sku?: string;
  features?: string[];
  specifications?: { label: string; value: string }[];
  tags?: string[]; // For AI matching
  bundleCandidates?: BundleCandidate[];
  cross_sell_ids?: string[]; // WooCommerce cross-sell product IDs
  breadcrumbs?: BreadcrumbItem[]; // Breadcrumb navigation hierarchy
  in_stock?: boolean;
  acf?: {
    deals?: Deal[];
    [key: string]: any;
  };
  deals_resolved?: {
    raw: Deal[];
    consumer: DealResolvedInfo;
    trade: DealResolvedInfo;
  };
  cartMetadata?: {
    priceMode?: "retail" | "trade";
    dealId?: string;
  };
}

export interface Deal {
  deal_id?: string;
  audience: "consumer" | "trade" | "both";
  type:
    | "sale"
    | "clearance"
    | "deal_of_day"
    | "weekly_special"
    | "trade_special"
    | "bundle"
    | "promo";
  visibility: "public" | "teaser" | "gated";
  priority?: number;
  is_active_override?: boolean;
  start_at?: string;
  end_at?: string;

  // Label/Badge
  deal_name?: string;
  label_mode?: "auto" | "template" | "manual";
  badge_style?: "sale" | "clearance" | "trade" | "info";
  label_text?: string;
  label_template?: string;

  // Pricing
  is_price_affecting?: boolean;
  pricing_mode?: "override_price" | "fixed_discount" | "percent_discount";
  apply_base_price?: "regular_price" | "sale_price";
  deal_price?: number;
  discount_value?: number;
  discount_percent?: number;

  // Display flags
  show_badge?: boolean;
  show_on_plp?: boolean;
  show_on_pdp?: boolean;
  show_strikethrough?: boolean;

  // Trade gating
  requires_trade_login?: boolean;
  reveal_trade_price_when_logged_out?: boolean;
  eligibility_copy?: string;
  cta_label_logged_out?: string;
  cta_label_logged_in?: string;
}

export interface DealResolvedInfo {
  bestDeal: Deal | null;
  price: number; // The effective price to show
  compareAtPrice?: number; // The struck-through price
  label?: string;
  badgeStyle?: string;
  showPrice: boolean; // false if hidden (teaser)
  requiresLogin?: boolean;
  eligibilityCopy?: string;
  ctaLabelLoggedOut?: string;
  ctaLabelLoggedIn?: string;
}

export interface BreadcrumbItem {
  label: string;
  slug?: string;
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
