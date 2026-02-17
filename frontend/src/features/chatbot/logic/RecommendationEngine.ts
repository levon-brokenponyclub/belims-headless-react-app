import { Product, UserProfile } from "../types";

interface RankConfig {
  profile: UserProfile;
  intent:
    | "PRODUCT_SEARCH"
    | "PROJECT_BASED"
    | "PRICE_FOCUSED"
    | "DELIVERY_LOGISTICS"
    | "TOOL_KIT_BUILDER"
    | "UNSURE_GUIDANCE"
    | "COMPARISON"
    | "CART_ASSISTANCE"
    | "GREETING"
    | "UNKNOWN";
  constraints: {
    maxPrice?: number;
    preferredBrand?: string;
    preferredBrands?: string[];
    budgetMode?: "CHEAPEST" | "BEST_VALUE";
  };
}

export class RecommendationEngine {
  static rank(products: Product[], config: RankConfig): Product[] {
    const { profile, intent } = config;

    // Filter by availability first (always)
    let filtered = products.filter((p) => p.inStock);

    // Apply strict filters like preferred brand if strong pref
    if (config.constraints.preferredBrand) {
      filtered = filtered.filter(
        (p) =>
          p.category.includes(config.constraints.preferredBrand!) ||
          p.specs.brand === config.constraints.preferredBrand,
      );
    }

    // Scoring
    const scored = filtered.map((p) => {
      let score = 0;

      // Base score on rating
      score += (p.rating || 0) * 10;

      // Delivery preference
      if (profile.deliveryPreference === "fastest" && p.eta.includes("Today"))
        score += 20;
      if (profile.deliveryPreference === "cheapest" && p.price < 50)
        score += 10;

      // Price sensitivity
      if (profile.budgetSensitivity === "low" && p.price < 20) score += 15;
      if (profile.budgetSensitivity === "high" && p.price > 100) score += 5; // Maybe user wants premium?

      // Skill level for project based
      if (
        profile.skillLevel === "PRO" &&
        (p.specs.grade === "Pro" || p.price > 100)
      )
        score += 20;

      return { product: p, score };
    });

    // Sort by score
    scored.sort((a, b) => b.score - a.score);

    // Return top 3
    return scored.slice(0, 3).map((s) => s.product);
  }

  static categorize(products: Product[]): {
    good: Product | null;
    better: Product | null;
    best: Product | null;
  } {
    if (products.length === 0) return { good: null, better: null, best: null };

    // Sort by price
    const sorted = [...products].sort((a, b) => a.price - b.price);

    // Naive logic:
    // Good = Cheapest
    // Better = Mid-range / Best Value (maybe highest rating in mid price)
    // Best = Most expensive / Highest Specs

    const good = sorted[0];
    const best = sorted[sorted.length - 1];

    // Find 'better' - closest to average price or highest rating excluding good/best
    let better = sorted.find((p) => p.id !== good.id && p.id !== best.id);

    if (!better) {
      // If only 2 products
      if (sorted.length > 1) better = sorted[1];
      else better = null;
    }

    return { good, better, best };
  }
}
