export type CustomerContext = {
  userId?: string;
  isReturning: boolean;
  lastViewedCategories: string[];
  lastViewedProducts: string[];
  recentPurchases: {
    productId: string;
    title?: string;
    date: string;
    price: number;
  }[];
  preferredBrands?: string[];
  preferredPriceRange?: {
    min?: number;
    max?: number;
  };
  frequentlyBoughtCategories?: string[];
  lastSessionContext?: {
    lastQuery?: string;
    lastResults?: string;
  };
  deliveryLocation?: string;
  updatedAt: string;
};

export const createDefaultCustomerContext = (
  userId?: string,
): CustomerContext => ({
  userId,
  isReturning: false,
  lastViewedCategories: [],
  lastViewedProducts: [],
  recentPurchases: [],
  preferredBrands: [],
  preferredPriceRange: {},
  frequentlyBoughtCategories: [],
  lastSessionContext: {},
  updatedAt: new Date().toISOString(),
});
