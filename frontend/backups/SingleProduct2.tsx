// ProductPriceDisplay.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Clock } from "lucide-react";
import { Product, DealResolvedInfo } from "../types";
import { CURRENCY_SYMBOL } from "../constants";

interface ProductPriceDisplayProps {
  product: Product;
  deal?: DealResolvedInfo;
  className?: string;

  /** Used when trade price is applied */
  overridePrice?: number;

  /** Optional: if you still use this upstream, keep it for compatibility */
  isTradeToggleActive?: boolean;

  showCountdown?: boolean;

  /** Optional copy below dual pricing row */
  secondaryCopy?: React.ReactNode;

  /** Forces dual pricing row when trade special exists */
  showDualTradePricing?: boolean;
}

const formatMoney = (value: number) =>
  `${CURRENCY_SYMBOL}${value.toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export const ProductPriceDisplay: React.FC<ProductPriceDisplayProps> = ({
  product,
  deal,
  className = "",
  overridePrice,
  isTradeToggleActive = false,
  showCountdown = true,
  secondaryCopy,
  showDualTradePricing = true,
}) => {
  const [timeLeft, setTimeLeft] = useState<string | null>(null);

  const tradeDeal = product.deals_resolved?.trade;
  const tradeBest = tradeDeal?.bestDeal;
  const tradePrice = (tradeDeal?.price ?? 0) as number;

  const retailPrice = (product.regular_price || product.price || 0) as number;

  const isTradeSpecial = tradeBest?.type === "trade_special";
  const hasTradePrice = tradePrice > 0;

  const dualMode = showDualTradePricing && isTradeSpecial && hasTradePrice;

  // Consumer deal pricing (non-trade)
  const consumerPrice = (deal?.price ?? product.price ?? retailPrice) as number;
  const consumerCompareAt = (deal?.compareAtPrice ?? null) as number | null;

  // Dominant price: trade if dualMode, otherwise consumer (or override if supplied)
  const dominantPrice =
    overridePrice !== undefined
      ? overridePrice
      : dualMode
        ? tradePrice
        : consumerPrice;

  const compareForNonTrade =
    consumerCompareAt ||
    (product.regular_price && product.regular_price > consumerPrice
      ? (product.regular_price as number)
      : null);

  const savings = useMemo(() => {
    if (dualMode) return Math.max(0, retailPrice - tradePrice);
    if (compareForNonTrade)
      return Math.max(0, compareForNonTrade - consumerPrice);
    return 0;
  }, [dualMode, retailPrice, tradePrice, compareForNonTrade, consumerPrice]);

  // Countdown (consumer deal only)
  useEffect(() => {
    if (!showCountdown || !deal?.bestDeal?.end_at || dualMode) {
      setTimeLeft(null);
      return;
    }

    const calculateTimeLeft = () => {
      const end = new Date(deal.bestDeal!.end_at!).getTime();
      const now = Date.now();
      const diff = end - now;

      if (diff <= 0) return "Expired";

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
      );
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 1) return `${days} days left`;
      if (days === 1) return `1 day left`;
      if (hours > 0) return `Ends in ${hours}h ${minutes}m`;
      return `Ends in ${minutes}m`;
    };

    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => setTimeLeft(calculateTimeLeft()), 60000);
    return () => clearInterval(timer);
  }, [deal?.bestDeal?.end_at, showCountdown, dualMode]);

  const headlineClass = useMemo(() => {
    if (dualMode || isTradeToggleActive) return "text-belims-blue";
    if (deal && deal.price && deal.compareAtPrice) return "text-red-600";
    return "text-gray-900";
  }, [dualMode, isTradeToggleActive, deal]);

  return (
    <div className={className}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div
            className={`font-heading text-[28px] leading-tight font-bold ${headlineClass}`}
          >
            {formatMoney(dominantPrice)}
          </div>

          {dualMode ? (
            <div className="mt-3">
              <div className="grid grid-cols-3 gap-3 rounded border border-gray-200 bg-white px-4 py-3">
                <div className="text-center">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                    Retail
                  </div>
                  <div className="mt-1 font-body text-sm font-semibold text-gray-900">
                    {formatMoney(retailPrice)}
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                    Trade
                  </div>
                  <div className="mt-1 font-body text-sm font-bold text-gray-900">
                    {formatMoney(tradePrice)}
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                    Save
                  </div>
                  <div className="mt-1 inline-flex items-center justify-center rounded-lg bg-green-50 px-2 py-1 font-body text-sm font-bold text-green-700">
                    {formatMoney(savings)}
                  </div>
                </div>
              </div>

              <div className="mt-2 font-body text-xs text-gray-600">
                {secondaryCopy ?? (
                  <span className="italic">
                    Add at trade price now — register at checkout to claim this
                    price.
                  </span>
                )}
              </div>
            </div>
          ) : (
            <>
              {compareForNonTrade && (
                <div className="mt-1 flex flex-wrap items-center gap-2 font-body text-sm text-gray-500">
                  <span className="line-through">
                    {formatMoney(compareForNonTrade)}
                  </span>
                  {savings > 0 && (
                    <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-[12px] font-semibold text-gray-700">
                      Save {formatMoney(savings)}
                    </span>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {showCountdown && timeLeft && !dualMode && (
          <div className="mt-1 inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 font-body text-xs font-semibold text-amber-700">
            <Clock size={14} />
            {timeLeft}
          </div>
        )}
      </div>
    </div>
  );
};
