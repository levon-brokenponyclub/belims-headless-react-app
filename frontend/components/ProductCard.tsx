// ProductCard.tsx
import React from "react";
import { Link } from "react-router-dom";
import { Bell, CheckCircle } from "lucide-react";
import { Product } from "../types";
import { CURRENCY_SYMBOL } from "../constants";

interface ProductCardProps {
  product: Product;
  addToCart: (product: Product) => void;
  onNotify?: (product: Product) => Promise<void> | void;
  className?: string;
  showDealName?: boolean;
}

const formatMoney = (value: number) =>
  `${CURRENCY_SYMBOL}${value.toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

/**
 * Rules:
 * - TRADE SPECIAL: show dominant RETAIL price; show trade price + savings line; add-to-cart uses trade metadata.
 * - ALL other deal types: show compare/regular strikethrough → sale price (when there is a true difference AND show_strikethrough !== false).
 * - Badges:
 *   - Trade specials: "TRADE SPECIAL" (red)
 *   - Other deals: use ACF label logic (manual/template/auto) and badge_style.
 */
export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  addToCart,
  onNotify,
  className = "",
  showDealName = false,
}) => {
  const [notifyStatus, setNotifyStatus] = React.useState<
    "idle" | "pending" | "sent" | "error"
  >("idle");

  const handleNotify = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (notifyStatus !== "idle") return;

    try {
      setNotifyStatus("pending");
      if (onNotify) await onNotify(product);
      setNotifyStatus("sent");
    } catch {
      setNotifyStatus("error");
    }
  };

  // ----------------------------
  // Deal resolution
  // ----------------------------
  const tradeDeal = product.deals_resolved?.trade;
  const tradeBest = tradeDeal?.bestDeal;
  const isTradeSpecial = tradeBest?.type === "trade_special";

  const consumerDeal = product.deals_resolved?.consumer;
  const consumerBest = consumerDeal?.bestDeal;

  // Price sources
  const retailPrice = (product.regular_price || product.price || 0) as number;
  const productPrice = (product.price || 0) as number;

  // Consumer sale price:
  // prefer consumer deal price, else product.price, else sale_price fallback.
  const consumerPrice = ((consumerDeal?.price ??
    product.price ??
    product.sale_price ??
    retailPrice) ||
    retailPrice) as number;

  // Consumer compare-at:
  // prefer consumer deal compareAtPrice, else regular_price when it is higher.
  const consumerCompareAtRaw =
    (consumerDeal?.compareAtPrice as number | undefined | null) ??
    ((product.regular_price && product.regular_price > consumerPrice
      ? product.regular_price
      : null) as number | null);

  const consumerCompareAt =
    consumerCompareAtRaw && consumerCompareAtRaw > consumerPrice
      ? consumerCompareAtRaw
      : null;

  // ACF behavior: defaults to true if undefined
  const shouldShowStrikethrough = consumerBest?.show_strikethrough !== false;

  const hasConsumerStrike =
    !isTradeSpecial &&
    Boolean(consumerCompareAt) &&
    shouldShowStrikethrough &&
    consumerPrice < (consumerCompareAt as number);

  const consumerSavings = hasConsumerStrike
    ? Math.max(0, (consumerCompareAt as number) - consumerPrice)
    : 0;

  // Trade price
  const tradePrice =
    isTradeSpecial && tradeDeal?.price ? (tradeDeal.price as number) : 0;

  const tradeSavings =
    isTradeSpecial && tradePrice > 0
      ? Math.max(0, retailPrice - tradePrice)
      : 0;

  // Display price (dominant)
  // - Trade special: dominant price is RETAIL (per your requirement)
  // - Otherwise: consumer price
  const displayPrice = isTradeSpecial ? retailPrice : consumerPrice;

  // ----------------------------
  // Badge generation
  // ----------------------------
  const activeDeal = isTradeSpecial ? tradeBest : consumerBest;

  const labelMode = (activeDeal as any)?.label_mode || "auto";
  const showBadge = (activeDeal as any)?.show_badge !== false;

  // Percent off: only meaningful for non-trade strikes
  const percentOff =
    !isTradeSpecial && consumerCompareAt && consumerCompareAt > 0
      ? Math.round(
          ((consumerCompareAt - consumerPrice) / consumerCompareAt) * 100,
        )
      : 0;

  const getBadgeLabel = (): string | undefined => {
    if (!activeDeal || !showBadge) return undefined;

    if (isTradeSpecial) return "TRADE SPECIAL";

    if (labelMode === "manual") {
      return (
        (activeDeal as any)?.label_text || consumerDeal?.label || undefined
      );
    }

    if (labelMode === "template") {
      const tpl = (activeDeal as any)?.label_template as string | undefined;
      if (!tpl) return undefined;

      const dealName = (activeDeal as any)?.deal_name || "";
      return tpl
        .replace("{deal_name}", dealName)
        .replace("{amount}", formatMoney(consumerSavings))
        .replace("{percent_off}", String(percentOff));
    }

    // auto
    const type = (activeDeal as any)?.type;
    if (type === "clearance") return "CLEARANCE";
    if (percentOff > 0) return `${percentOff}% OFF`;
    if (consumerDeal?.label) return consumerDeal.label;
    return "SALE";
  };

  const badgeLabel = getBadgeLabel();
  const badgeStyle = ((activeDeal as any)?.badge_style ||
    consumerDeal?.badgeStyle ||
    "sale") as "sale" | "clearance" | "info" | "trade" | string;

  const badgeClass = (() => {
    // premium defaults: red for "sale"; keep others restrained
    if (isTradeSpecial) return "right-3 bg-[#DF1119] text-white";
    if (badgeStyle === "clearance") return "left-3 bg-[#DF1119] text-white";
    if (badgeStyle === "info") return "left-3 bg-[#ECF0F1] text-[#04223E]";
    if (badgeStyle === "trade") return "right-3 bg-[#ECF0F1] text-[#04223E]";
    return "left-3 bg-[#DF1119] text-white";
  })();

  // ----------------------------
  // Add to cart (wire price mode)
  // ----------------------------
  const addWithPriceMode = (mode: "retail" | "trade") => {
    const p = { ...product };

    if (mode === "trade" && isTradeSpecial && tradeBest?.deal_id) {
      p.cartMetadata = {
        priceMode: "trade",
        dealId: tradeBest.deal_id,
      };
    } else {
      p.cartMetadata = undefined;
    }

    addToCart(p);
  };

  return (
    <div
      className={[
        "relative flex h-full min-w-[310px] max-w-[310px] flex-col overflow-hidden",
        "rounded border border-[#E0E0E0] bg-white",
        "shadow-[0_1px_2px_rgba(16,24,40,0.06)] transition-shadow",
        "hover:shadow-[0_6px_18px_rgba(16,24,40,0.08)]",
        className,
      ].join(" ")}
    >
      {/* Deal Badge */}
      {badgeLabel && (
        <div
          className={[
            "absolute top-3 z-10 rounded px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide",
            badgeClass,
          ].join(" ")}
        >
          {badgeLabel}
        </div>
      )}

      {/* Image */}
      <Link
        to={`/product/${product.id}`}
        className="flex h-52 items-center justify-center bg-[#F9F9F9] p-5"
      >
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="max-h-full max-w-full object-contain transition-transform duration-300 hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded bg-[#ECF0F1] text-sm text-[#565969]">
            No image
          </div>
        )}
      </Link>

      {/* Content */}
      <div className="flex flex-1 flex-col p-5">
        {/* Category / Deal Name */}
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#565969]">
          {showDealName && consumerBest?.deal_name
            ? consumerBest.deal_name
            : product.category}
        </div>

        {/* Title - Fixed height for 2 lines */}
        <Link
          to={`/product/${product.id}`}
          className="mb-3 line-clamp-2 font-heading text-[15px] font-semibold leading-[1.35] text-gray-900 hover:underline min-h-[41px]"
        >
          {product.name}
        </Link>

        {/* SKU */}
        {/* <div className="mb-4 text-[11px] font-semibold uppercase tracking-wide text-[#565969]">
          {product.sku || product.id}
        </div> */}

        {/* Trade Special Price Options */}
        {isTradeSpecial && tradePrice > 0 && (
          <div className="mt-auto grid grid-cols-2 gap-6 py-4 border-t border-[#E0E0E0]">
            <div>
              <div className="text-xs font-semibold text-[#565969] mb-2">
                Retail Price
              </div>
              <div className="text-[18px] font-bold text-[#04223E]">
                {formatMoney(retailPrice)}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-[#565969] mb-2">
                Trade Price
              </div>
              <div className="text-[18px] font-bold text-[#04223E]">
                {formatMoney(tradePrice)}
              </div>
            </div>
          </div>
        )}

        {/* Price Block */}
        {!isTradeSpecial && (
          <div className="mt-auto py-4">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-2">
              {/* Dominant price */}
              <span className="font-heading text-[20px] font-bold text-[#04223E]">
                {formatMoney(displayPrice)}
              </span>

              {/* Non-trade deals: compare → sale */}
              {hasConsumerStrike && (
                <span className="text-[16px] font-light text-[#9b9b9b] line-through">
                  {formatMoney(consumerCompareAt as number)}
                </span>
              )}
            </div>
          </div>
        )}

        {/* CTA */}
        {product.stock > 0 ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              addWithPriceMode(isTradeSpecial ? "trade" : "retail");
            }}
            className="mt-0 h-11 w-full rounded bg-[#04223E] font-heading text-sm font-semibold text-white transition-colors hover:bg-[#02172A]"
          >
            Add to cart
          </button>
        ) : (
          <button
            onClick={handleNotify}
            disabled={notifyStatus === "pending" || notifyStatus === "sent"}
            className={[
              "mt-0 h-11 w-full rounded font-heading text-sm font-semibold",
              "flex items-center justify-center gap-2 transition-colors",
              notifyStatus === "sent"
                ? "bg-green-50 text-green-800 border border-green-200"
                : notifyStatus === "error"
                  ? "bg-red-50 text-red-700 border border-red-200"
                  : "bg-[#04223E] text-white hover:bg-[#02172A]",
              notifyStatus === "pending" ? "opacity-70 cursor-wait" : "",
            ].join(" ")}
          >
            {notifyStatus === "sent" ? (
              <CheckCircle size={16} />
            ) : (
              <Bell size={16} />
            )}
            {notifyStatus === "sent"
              ? "Notification set"
              : notifyStatus === "pending"
                ? "Setting reminder…"
                : notifyStatus === "error"
                  ? "Try again"
                  : "Notify me"}
          </button>
        )}
      </div>
    </div>
  );
};
