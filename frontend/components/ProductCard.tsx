import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertTriangle, Bell, CheckCircle, Scale } from "lucide-react";
import { Product } from "../types";
import { CURRENCY_SYMBOL } from "../constants";

interface ProductCardProps {
  product: Product;
  addToCart: (product: Product) => void;
  onBuyNow?: (product: Product) => void;
  onCompare?: (product: Product) => void;
  onNotify?: (product: Product) => Promise<void> | void;
  className?: string;
  showDealName?: boolean; // Show deal name instead of category
  isAuthenticated?: boolean; // Whether user is logged in
  isTradeApproved?: boolean; // Whether user has trade approval
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  addToCart,
  onBuyNow,
  onCompare,
  onNotify,
  className = "",
  showDealName = false,
  isAuthenticated = false,
  isTradeApproved = false,
}) => {
  const navigate = useNavigate();
  const [notifyStatus, setNotifyStatus] = React.useState<
    "idle" | "pending" | "sent" | "error"
  >("idle");

  // Persist toggle selection per session
  const [priceMode, setPriceMode] = React.useState<"retail" | "trade">(() => {
    const saved = sessionStorage.getItem("priceMode");
    return (saved as "retail" | "trade") || "retail";
  });

  React.useEffect(() => {
    sessionStorage.setItem("priceMode", priceMode);
  }, [priceMode]);

  const formatPrice = (price: number): string => {
    return price.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handleNotify = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (notifyStatus === "pending" || notifyStatus === "sent") return;

    try {
      setNotifyStatus("pending");
      if (onNotify) {
        await onNotify(product);
      }
      setNotifyStatus("sent");
    } catch (error) {
      console.error("Failed to register back-in-stock notification", error);
      setNotifyStatus("error");
    }
  };

  // Check if product has trade special
  const hasTradeSpecial =
    product.deals_resolved?.trade?.bestDeal?.type === "trade_special";

  const consumerDeal = product.deals_resolved?.consumer;
  const consumerBestDeal = consumerDeal?.bestDeal;
  const hasConsumerBadge = !!consumerDeal?.label;
  const showExpiry =
    !hasTradeSpecial &&
    hasConsumerBadge &&
    (consumerBestDeal?.type === "deal_of_day" ||
      consumerBestDeal?.type === "weekly_special");

  const parseDateSafe = (value?: string | number | null): Date | null => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const clamp = (value: number, min = 0, max = 1) =>
    Math.min(max, Math.max(min, value));

  const getRemainingMs = (endAt?: Date | null) => {
    if (!endAt) return 0;
    return Math.max(0, endAt.getTime() - nowMs);
  };

  const formatDealOfDayExpiry = (remainingMs: number, hasEndAt: boolean) => {
    if (!hasEndAt) return "Limited time";
    const oneHour = 60 * 60 * 1000;
    const oneDay = 24 * oneHour;

    if (remainingMs > oneDay) return "Ends today";

    if (remainingMs >= oneHour) {
      const hours = Math.floor(remainingMs / oneHour);
      const minutes = Math.floor((remainingMs % oneHour) / (60 * 1000));
      return `Ends in ${hours}h ${minutes}m`;
    }

    const minutes = Math.max(1, Math.floor(remainingMs / (60 * 1000)));
    return `Ends in ${minutes} minutes`;
  };

  const formatWeeklyExpiry = (remainingMs: number, hasEndAt: boolean) => {
    if (!hasEndAt) return "Ends Sunday";
    const oneHour = 60 * 60 * 1000;
    const oneDay = 24 * oneHour;

    if (remainingMs > oneDay) return "Ends tonight";

    if (remainingMs >= oneHour) {
      const hours = Math.floor(remainingMs / oneHour);
      const minutes = Math.floor((remainingMs % oneHour) / (60 * 1000));
      return `Ends in ${hours}h ${minutes}m`;
    }

    const minutes = Math.max(1, Math.floor(remainingMs / (60 * 1000)));
    return `Ends in ${minutes} minutes`;
  };

  const getWeekProgress = (startAt?: Date | null, endAt?: Date | null) => {
    if (!endAt) return 0;
    let start = startAt;

    if (!start) {
      const now = new Date();
      const mondayOffset = (now.getDay() + 6) % 7;
      start = new Date(now);
      start.setDate(now.getDate() - mondayOffset);
      start.setHours(0, 0, 0, 0);
    }

    const duration = endAt.getTime() - start.getTime();
    if (duration <= 0) return 1;

    const progress = (Date.now() - start.getTime()) / duration;
    return clamp(progress, 0, 1);
  };

  const [nowMs, setNowMs] = React.useState(() => Date.now());

  const dealEndAt =
    parseDateSafe(consumerBestDeal?.end_at) ||
    parseDateSafe((consumerDeal as any)?.end_at);
  const dealStartAt =
    parseDateSafe(consumerBestDeal?.start_at) ||
    parseDateSafe((consumerDeal as any)?.start_at);
  const dealEndAtExists = !!dealEndAt;
  const isDealOfDay = consumerBestDeal?.type === "deal_of_day";
  const isWeeklyDeal = consumerBestDeal?.type === "weekly_special";

  React.useEffect(() => {
    if (!showExpiry || !dealEndAtExists) return;

    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 60000);

    return () => clearInterval(interval);
  }, [showExpiry, dealEndAtExists]);

  // Calculate pricing
  const regularPrice = product.regular_price || product.price;
  const tradePrice = hasTradeSpecial
    ? product.deals_resolved?.trade?.price || regularPrice
    : regularPrice;
  const tradeSavings = regularPrice - tradePrice;

  const showTradeToggle = hasTradeSpecial && !isTradeApproved;
  const effectivePriceMode = showTradeToggle ? priceMode : "trade";
  const displayPrice =
    effectivePriceMode === "trade" ? tradePrice : regularPrice;

  return (
    <div
      className={`bg-white border border-gray-200 rounded shadow-sm hover:shadow-lg transition-all duration-200 flex flex-col h-full group overflow-hidden relative min-w-[320px] max-w-[320px] ${className}`}
    >
      {/* Deal / Sale Badge (non-trade only) */}
      {!hasTradeSpecial &&
        (() => {
          const deal = product.deals_resolved?.consumer;
          if (deal?.label) {
            let bgClass = "bg-red-600";
            if (deal.badgeStyle === "trade") bgClass = "bg-belims-accent";
            else if (deal.badgeStyle === "clearance") bgClass = "bg-orange-600";
            else if (deal.badgeStyle === "info") bgClass = "bg-gray-600";

            return (
              <div
                className={`absolute top-2 left-2 ${bgClass} text-white text-[11px] leading-4 font-bold px-2 py-1 rounded z-10 uppercase`}
              >
                {deal.label}
              </div>
            );
          }
          if (product.regular_price && product.price < product.regular_price) {
            return (
              <div className="absolute top-2 left-2 bg-red-600 text-white text-[11px] leading-4 font-bold px-2 py-1 rounded z-10">
                -
                {Math.round(
                  ((product.regular_price - product.price) /
                    product.regular_price) *
                    100,
                )}
                %
              </div>
            );
          }
          return null;
        })()}

      {showExpiry && (
        <div className="absolute top-2 right-2 z-10 flex flex-col items-end gap-1">
          <div
            className={`text-[11px] leading-4 font-bold px-2 py-1 rounded border ${
              isDealOfDay
                ? "text-amber-700 bg-amber-50 border-amber-200"
                : "text-sky-700 bg-sky-50 border-sky-200"
            }`}
          >
            {isDealOfDay
              ? formatDealOfDayExpiry(
                  getRemainingMs(dealEndAt),
                  dealEndAtExists,
                )
              : formatWeeklyExpiry(getRemainingMs(dealEndAt), dealEndAtExists)}
          </div>

          {isWeeklyDeal && dealEndAtExists && (
            <div className="w-20 h-1 rounded-full bg-sky-100 overflow-hidden">
              <div
                className="h-full bg-sky-400"
                style={{
                  width: `${Math.round(
                    getWeekProgress(dealStartAt, dealEndAt) * 100,
                  )}%`,
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* Trade Special Badge */}
      {hasTradeSpecial && (
        <div className="absolute top-2 right-2 z-10 bg-belims-accent text-white text-[11px] leading-4 font-bold px-2 py-1 rounded uppercase">
          TRADE SPECIAL
        </div>
      )}

      <Link
        to={`/product/${product.id}`}
        className="relative h-48 overflow-hidden p-4 flex items-center justify-center transition-colors cursor-pointer"
      >
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="max-h-full max-w-full flex items-center justify-center text-gray-300 bg-gray-100 w-full h-full">
            No Image
          </div>
        )}
      </Link>

      <div className="p-4 flex-1 flex flex-col">
        <div
          className={
            showDealName &&
            product.deals_resolved?.consumer?.bestDeal?.deal_name
              ? "text-xs text-red-600 mb-1 font-bold uppercase"
              : "text-sm text-gray-500 mb-1"
          }
        >
          {showDealName && product.deals_resolved?.consumer?.bestDeal?.deal_name
            ? product.deals_resolved.consumer.bestDeal.deal_name
            : product.category}
        </div>
        <div className="flex-1 mb-[1.5625rem]">
          <Link
            to={`/product/${product.id}`}
            className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-belims-blue transition-colors cursor-pointer block"
          >
            {product.name}
          </Link>
          <div
            className="text-[0.70rem] mt-1 font-medium"
            style={{ color: "#64748b" }}
          >
            {product.sku || product.id}
          </div>
        </div>

        {/* Price Toggle - Only show if product has trade special */}
        {showTradeToggle && (
          <div className="mb-3">
            <div className="inline-flex rounded-md border border-gray-200 bg-gray-50 p-0.5">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setPriceMode("retail");
                }}
                className={`px-3 py-1 text-xs font-bold rounded transition-all ${
                  priceMode === "retail"
                    ? "bg-white text-belims-blue shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Retail
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setPriceMode("trade");
                }}
                className={`px-3 py-1 text-xs font-bold rounded transition-all ${
                  priceMode === "trade"
                    ? "bg-white text-belims-accent shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Trade
              </button>
            </div>
          </div>
        )}

        {/* Price Display */}
        {hasTradeSpecial ? (
          <div className="mb-3">
            <div>
              <div className="flex items-baseline gap-2 mb-1">
                <span
                  className={`text-lg font-bold ${effectivePriceMode === "trade" ? "text-belims-accent" : "text-gray-900"}`}
                >
                  {CURRENCY_SYMBOL}
                  {formatPrice(displayPrice)}
                </span>
              </div>

              {/* Secondary Price Info */}
              {showTradeToggle && tradeSavings > 0 && (
                <div className="text-xs text-gray-600">
                  {priceMode === "retail" ? (
                    <>
                      Trade available: {CURRENCY_SYMBOL}
                      {formatPrice(tradePrice)} • Save {CURRENCY_SYMBOL}
                      {formatPrice(tradeSavings)}
                    </>
                  ) : (
                    <>
                      Retail: {CURRENCY_SYMBOL}
                      {formatPrice(regularPrice)} • Save {CURRENCY_SYMBOL}
                      {formatPrice(tradeSavings)}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="mb-3 flex items-center justify-between">
            <div>
              {(() => {
                const deal = product.deals_resolved?.consumer;
                const hasDeal = !!deal?.bestDeal;
                const showPrice = deal ? deal.showPrice : true;
                if (!showPrice) {
                  return (
                    <span className="font-bold text-gray-800 text-sm">
                      Log in to view price
                    </span>
                  );
                }

                const displayNonTradePrice = hasDeal
                  ? deal!.price
                  : product.price;
                const originalPrice =
                  hasDeal && deal!.compareAtPrice
                    ? deal!.compareAtPrice
                    : product.regular_price &&
                        displayNonTradePrice < product.regular_price
                      ? product.regular_price
                      : null;

                return originalPrice ? (
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-bold text-red-600">
                      {CURRENCY_SYMBOL}
                      {formatPrice(displayNonTradePrice)}
                    </span>
                    <span className="text-sm line-through text-gray-400">
                      {CURRENCY_SYMBOL}
                      {formatPrice(originalPrice)}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-bold text-gray-900">
                      {CURRENCY_SYMBOL}
                      {formatPrice(displayNonTradePrice)}
                    </span>
                    {product.isBundle && (
                      <span className="text-xs text-green-600 font-bold bg-green-50 px-1.5 py-0.5 rounded">
                        Save {CURRENCY_SYMBOL}
                        {formatPrice(product.bundleSavings || 0)}
                      </span>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* Actions: Dynamic CTA based on mode and auth state */}
        {product.stock > 0 ? (
          hasTradeSpecial ? (
            <div className="mt-0 space-y-2">
              {isTradeApproved ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    addToCart(product);
                  }}
                  className="w-full px-4 py-2 bg-belims-blue text-white font-semibold rounded hover:bg-belims-accent transition-colors text-sm"
                >
                  Add to Cart
                </button>
              ) : priceMode === "trade" ? (
                <>
                  {/* Primary CTA: Register for Trade Deals */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate("/register?type=trade");
                    }}
                    className="w-full px-4 py-2 bg-belims-accent text-white font-semibold rounded hover:brightness-110 transition-all text-sm"
                  >
                    Register for Trade Deals
                  </button>
                  {/* Secondary CTA: Log in (only if not authenticated) */}
                  {!isAuthenticated && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate("/login");
                      }}
                      className="w-full px-4 py-2 bg-white text-belims-blue font-semibold rounded border border-belims-blue hover:bg-blue-50 transition-colors text-sm"
                    >
                      Log in
                    </button>
                  )}
                </>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    addToCart(product);
                  }}
                  className="w-full px-4 py-2 bg-belims-blue text-white font-semibold rounded hover:bg-belims-accent transition-colors text-sm"
                >
                  Add to Cart
                </button>
              )}
            </div>
          ) : (
            <div className="mt-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  addToCart(product);
                }}
                className="w-full px-4 py-2 bg-belims-blue text-white font-semibold rounded hover:bg-belims-accent transition-colors text-sm"
              >
                Add to Cart
              </button>
            </div>
          )
        ) : (
          <div className="mt-0">
            <button
              onClick={handleNotify}
              disabled={notifyStatus === "pending" || notifyStatus === "sent"}
              className={`w-full px-4 py-2 font-semibold rounded text-sm flex items-center justify-center gap-1 transition-colors ${notifyStatus === "sent" ? "bg-green-100 text-green-800 border border-green-200" : notifyStatus === "error" ? "bg-red-100 text-red-700 border border-red-200" : "bg-belims-accent text-white hover:brightness-110"} ${notifyStatus === "pending" ? "opacity-70 cursor-wait" : ""}`}
            >
              {notifyStatus === "sent" ? (
                <CheckCircle size={14} />
              ) : (
                <Bell size={14} />
              )}
              {notifyStatus === "sent"
                ? "Notification set"
                : notifyStatus === "pending"
                  ? "Setting reminder..."
                  : notifyStatus === "error"
                    ? "Try again"
                    : "Notify me"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
