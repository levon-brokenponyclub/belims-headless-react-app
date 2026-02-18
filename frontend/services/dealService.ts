import { Product, Deal, DealResolvedInfo } from "../types";
import { formatCurrency } from "../utils/price";

// Helper: Normalize deals from product
export function normalizeDealsFromProduct(product: any): Deal[] {
  // 1. Prefer acf.deals
  if (product.acf && Array.isArray(product.acf.deals)) {
    return product.acf.deals;
  }

  // 2. Fallback: meta_data
  if (Array.isArray(product.meta_data)) {
    const dealsMeta = product.meta_data.find(
      (m: any) => m.key === "deals" || m.key === "acf:deals",
    );
    if (dealsMeta && dealsMeta.value) {
      if (Array.isArray(dealsMeta.value)) return dealsMeta.value;
      if (typeof dealsMeta.value === "string") {
        try {
          return JSON.parse(dealsMeta.value);
        } catch (e) {
          console.warn("Failed to parse deals meta", e);
        }
      }
    }
  }

  return [];
}

// Helper: Check if deal is active
export function isDealActive(deal: Deal, nowDate: Date = new Date()): boolean {
  if (deal.is_active_override) return true;

  const nowTime = nowDate.getTime();
  const start = deal.start_at ? new Date(deal.start_at).getTime() : null;
  const end = deal.end_at ? new Date(deal.end_at).getTime() : null;

  if (start && nowTime < start) return false;
  if (end && nowTime > end) return false;

  return true;
}

// Helper: Priority mapping
const TYPE_PRIORITY: Record<string, number> = {
  clearance: 10,
  trade_special: 20,
  deal_of_day: 30,
  weekly_special: 40,
  sale: 50,
  bundle: 90,
  promo: 90,
  default: 100,
};

// Helper: Resolve best deal
export function resolveBestDeal(
  deals: Deal[],
  audienceContext: "consumer" | "trade",
): Deal | null {
  const activeDeals = deals.filter((d) => isDealActive(d));

  const candidates = activeDeals.filter((d) => {
    // Audience match
    if (audienceContext === "consumer") {
      if (d.audience === "trade") return false;
      // Rule: "If audienceContext === consumer and deal.audience is trade/both: allow ONLY if visibility is public/teaser"
      if (d.audience === "both" && d.visibility === "gated") return false;
    } else {
      // Trade context
      if (d.audience === "consumer") return false;
    }

    // Visibility Gating
    if (d.visibility === "gated" && audienceContext !== "trade") return false;

    return true;
  });

  if (candidates.length === 0) return null;

  // Sort candidates
  candidates.sort((a, b) => {
    // (A) Type priority
    const pA = TYPE_PRIORITY[a.type] || TYPE_PRIORITY.default;
    const pB = TYPE_PRIORITY[b.type] || TYPE_PRIORITY.default;
    if (pA !== pB) return pA - pB;

    // (B) Deal priority
    const dpA = a.priority ?? 999;
    const dpB = b.priority ?? 999;
    if (dpA !== dpB) return dpA - dpB;

    // (C) Deeper discount (Approximate logic: percent first)
    const discA = a.discount_percent ?? 0;
    const discB = b.discount_percent ?? 0;
    if (discA !== discB) return discB - discA; // Higher discount wins

    // (D) Earliest end_at
    const endA = a.end_at ? new Date(a.end_at).getTime() : Infinity;
    const endB = b.end_at ? new Date(b.end_at).getTime() : Infinity;
    return endA - endB;
  });

  return candidates[0];
}

// Helper: Compute Display
export function computeDealDisplay(
  product: Product,
  deal: Deal | null,
  audienceContext: "consumer" | "trade",
  isTradeLoggedIn: boolean = false,
): DealResolvedInfo {
  const base = product.regular_price || 0;
  // Note: apply_base_price logic
  let calculationBase = base;
  if (deal?.apply_base_price === "sale_price" && product.sale_price) {
    calculationBase = product.sale_price;
  }

  if (!deal) {
    return {
      bestDeal: null,
      price: product.price,
      compareAtPrice: undefined,
      showPrice: true,
      label: undefined,
      badgeStyle: undefined,
    };
  }

  // Pricing Calculation
  let finalPrice = calculationBase;
  if (deal.is_price_affecting !== false) {
    if (
      deal.pricing_mode === "override_price" &&
      deal.deal_price !== undefined
    ) {
      finalPrice = Number(deal.deal_price);
    } else if (deal.pricing_mode === "fixed_discount" && deal.discount_value) {
      finalPrice = calculationBase - Number(deal.discount_value);
    } else if (
      deal.pricing_mode === "percent_discount" &&
      deal.discount_percent
    ) {
      finalPrice = calculationBase * (1 - Number(deal.discount_percent) / 100);
    }
  }
  finalPrice = Math.max(0, finalPrice);

  // Trade Validation for Visibility
  let showPrice = true;
  let requiresLogin = false;
  let ctaLabelLoggedOut = deal.cta_label_logged_out;
  let ctaLabelLoggedIn = deal.cta_label_logged_in;

  if (deal.audience === "trade" || deal.audience === "both") {
    if (!isTradeLoggedIn) {
      if (deal.requires_trade_login) {
        requiresLogin = true;
      }

      if (deal.visibility === "teaser") {
        showPrice = false;
      } else if (deal.visibility === "public") {
        if (!deal.reveal_trade_price_when_logged_out) {
          showPrice = false;
        }
      } else if (deal.visibility === "gated") {
        // Should be hidden by resolveBestDeal for consumer context,
        // but if we are manually checking 'trade' context from outside:
        // "If visibility is gated => hide from non-trade"
      }
    }
  }

  // Label Computation
  let label = "";
  let badgeStyle = deal.badge_style || "sale";

  // Calculate off for label
  const percentOff =
    calculationBase > 0
      ? Math.round(((calculationBase - finalPrice) / calculationBase) * 100)
      : 0;
  const amountOff = calculationBase - finalPrice;

  if (deal.label_mode === "manual") {
    label = deal.label_text || "";
  } else if (deal.label_mode === "template" && deal.label_template) {
    label = deal.label_template
      .replace("{deal_name}", deal.deal_name || "")
      .replace("{amount}", formatCurrency(amountOff))
      .replace("{percent_off}", `${percentOff}`);
  } else {
    // Auto
    switch (deal.type) {
      case "clearance":
        label = "CLEARANCE";
        badgeStyle = "clearance";
        break;
      case "trade_special":
        label = "TRADE SPECIAL";
        badgeStyle = "trade";
        break;
      case "deal_of_day":
        label = percentOff > 0 ? `${percentOff}% OFF` : "DEAL";
        break;
      case "sale":
      case "weekly_special":
        label = percentOff > 0 ? `${percentOff}% OFF` : "SALE";
        break;
      default:
        label = deal.deal_name || "SPECIAL";
    }
  }

  return {
    bestDeal: deal,
    price: finalPrice,
    compareAtPrice: deal.show_strikethrough ? calculationBase : undefined,
    label: deal.show_badge !== false ? label : undefined,
    badgeStyle,
    showPrice,
    requiresLogin,
    eligibilityCopy: deal.eligibility_copy,
    ctaLabelLoggedOut,
    ctaLabelLoggedIn,
  };
}

export function enrichProductWithDeals(product: Product): Product {
  const rawDeals = normalizeDealsFromProduct(product);

  // Resolve for Consumer
  const bestConsumer = resolveBestDeal(rawDeals, "consumer");
  // Ensure consumer always sees price unless specific logic hides it?
  // Usually consumer deals are public.
  const consumerDisplay = computeDealDisplay(
    product,
    bestConsumer,
    "consumer",
    false,
  );

  // Resolve for Trade
  const bestTrade = resolveBestDeal(rawDeals, "trade");
  // Pass false to simulate "logged out/public view" of the trade deal to determine login requirements
  const tradeDisplay = computeDealDisplay(product, bestTrade, "trade", false);

  product.deals_resolved = {
    raw: rawDeals,
    consumer: consumerDisplay,
    trade: tradeDisplay,
  };

  return product;
}
