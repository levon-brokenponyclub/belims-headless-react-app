import { Product, Deal, DealResolvedInfo } from "../types";
import { formatCurrency } from "../utils/price";

type DealWithTs = Deal & {
  start_ts?: number | null;
  end_ts?: number | null;
};

// Helper: Normalize deals from product
export function normalizeDealsFromProduct(product: any): Deal[] {
  const normalizeWithTimestamps = (deals: any[]): DealWithTs[] =>
    deals
      .filter((deal) => deal && typeof deal === "object")
      .map((deal) => {
        const startTs =
          typeof deal.start_ts === "number"
            ? deal.start_ts
            : deal.start_at
              ? new Date(deal.start_at).getTime()
              : null;
        const endTs =
          typeof deal.end_ts === "number"
            ? deal.end_ts
            : deal.end_at
              ? new Date(deal.end_at).getTime()
              : null;

        return {
          ...deal,
          start_ts: Number.isFinite(startTs) ? startTs : null,
          end_ts: Number.isFinite(endTs) ? endTs : null,
        };
      });

  if (Array.isArray(product.deals)) {
    return normalizeWithTimestamps(product.deals);
  }

  // 1. Prefer acf.deals
  if (product.acf && Array.isArray(product.acf.deals)) {
    return normalizeWithTimestamps(product.acf.deals);
  }

  // 2. Fallback: meta_data
  if (Array.isArray(product.meta_data)) {
    const dealsMeta = product.meta_data.find(
      (m: any) => m.key === "deals" || m.key === "acf:deals",
    );
    if (dealsMeta && dealsMeta.value) {
      if (Array.isArray(dealsMeta.value)) {
        return normalizeWithTimestamps(dealsMeta.value);
      }
      if (typeof dealsMeta.value === "string") {
        try {
          const parsed = JSON.parse(dealsMeta.value);
          return Array.isArray(parsed) ? normalizeWithTimestamps(parsed) : [];
        } catch (e) {
          console.warn("Failed to parse deals meta", e);
        }
      }
    }
  }

  return [];
}

// Helper: Check if deal is active
export function isDealActive(
  deal: DealWithTs,
  nowTime: number = Date.now(),
): boolean {
  if (deal.is_active_override) return true;

  const start = deal.start_ts ?? null;
  const end = deal.end_ts ?? null;

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
  const nowTime = Date.now();
  let bestDeal: DealWithTs | null = null;
  let bestScore: [number, number, number, number] | null = null;

  for (const rawDeal of deals as DealWithTs[]) {
    const deal = rawDeal;
    if (!isDealActive(deal, nowTime)) continue;

    if (audienceContext === "consumer") {
      if (deal.audience === "trade") continue;
      if (deal.audience === "both" && deal.visibility === "gated") continue;
    } else if (deal.audience === "consumer") {
      continue;
    }

    if (deal.visibility === "gated" && audienceContext !== "trade") continue;

    const typePriority = TYPE_PRIORITY[deal.type] || TYPE_PRIORITY.default;
    const dealPriority = deal.priority ?? 999;
    const discountScore = -(deal.discount_percent ?? 0);
    const endScore = deal.end_ts ?? Number.POSITIVE_INFINITY;
    const score: [number, number, number, number] = [
      typePriority,
      dealPriority,
      discountScore,
      endScore,
    ];

    if (
      !bestScore ||
      score[0] < bestScore[0] ||
      (score[0] === bestScore[0] && score[1] < bestScore[1]) ||
      (score[0] === bestScore[0] &&
        score[1] === bestScore[1] &&
        score[2] < bestScore[2]) ||
      (score[0] === bestScore[0] &&
        score[1] === bestScore[1] &&
        score[2] === bestScore[2] &&
        score[3] < bestScore[3])
    ) {
      bestDeal = deal;
      bestScore = score;
    }
  }

  return bestDeal;
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

  return {
    ...product,
    deals_resolved: {
      raw: rawDeals,
      consumer: consumerDisplay,
      trade: tradeDisplay,
    },
  };
}
