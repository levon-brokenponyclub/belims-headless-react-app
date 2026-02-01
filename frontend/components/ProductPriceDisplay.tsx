import React, { useEffect, useState } from "react";
import { Product } from "../types";
import { DealResolvedInfo } from "../types";
import { CURRENCY_SYMBOL } from "../constants";
import { Clock, Lock } from "lucide-react";

interface ProductPriceDisplayProps {
  product: Product;
  deal?: DealResolvedInfo;
  className?: string; // Standard className prop
  overridePrice?: number; // Override display price (e.g., for trade price)
  isTradeToggleActive?: boolean; // Whether trade price toggle is selected
  showCountdown?: boolean;
}

export const ProductPriceDisplay: React.FC<ProductPriceDisplayProps> = ({
  product,
  deal,
  className = "",
  overridePrice,
  isTradeToggleActive = false,
  showCountdown = true,
}) => {
  const [timeLeft, setTimeLeft] = useState<string | null>(null);

  // Countdown Logic
  useEffect(() => {
    if (!showCountdown || !deal?.bestDeal?.end_at) {
      setTimeLeft(null);
      return;
    }

    const calculateTimeLeft = () => {
      const end = new Date(deal.bestDeal!.end_at!).getTime();
      const now = new Date().getTime();
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
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, [deal?.bestDeal?.end_at]);

  // Case 2: Standard Display (with or without Deal)
  // For trade_special, ignore deal price and use regular price unless override is provided
  const isTradeSpecial =
    deal?.bestDeal?.type === "trade_special" ||
    product.deals_resolved?.trade?.bestDeal?.type === "trade_special";
  const price =
    overridePrice !== undefined
      ? overridePrice
      : isTradeSpecial
        ? product.regular_price || product.price
        : deal
          ? deal.price
          : product.price;
  const compareAt = deal?.compareAtPrice;
  const savings = compareAt ? compareAt - price : 0;

  // Use product.regular_price fallback if no deal specific compareAt but price is lower
  // (e.g. standard sale not via deal service)
  const fallbackCompare =
    product.regular_price > price ? product.regular_price : null;
  const displayCompare = compareAt || fallbackCompare;
  const displaySavings = displayCompare ? displayCompare - price : 0;

  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-4 mb-2">
        {/* Left: Sale and Regular Price */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {/* Main Price */}
          <div
            className={`text-4xl font-extrabold font-heading ${
              isTradeSpecial && isTradeToggleActive
                ? "text-belims-accent"
                : deal && !isTradeSpecial
                  ? "text-red-600"
                  : isTradeSpecial
                    ? "text-red-600"
                    : "text-belims-accent"
            }`}
          >
            {CURRENCY_SYMBOL}
            {price.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>

          {/* Compare At Price (Strikethrough) - Only for non-trade_special deals */}
          {displayCompare && !isTradeSpecial && (
            <div className="text-xl text-gray-400 line-through font-heading">
              {CURRENCY_SYMBOL}
              {displayCompare.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
          )}
        </div>

        {/* Right: Savings Badge - Only for non-trade_special deals */}
        {displaySavings > 0 && !isTradeSpecial && (
          <div className="bg-red-50 text-red-600 text-sm font-bold px-3 py-1 rounded inline-flex items-center flex-shrink-0">
            Save {CURRENCY_SYMBOL}
            {displaySavings.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
        )}
      </div>

      {/* Timer */}
      <div className="flex items-center gap-3">
        {showCountdown && timeLeft && (
          <div className="text-red-600 text-xs font-bold uppercase flex items-center gap-1 bg-red-50 px-2 py-1 rounded">
            <Clock size={12} /> {timeLeft}
          </div>
        )}
      </div>
    </div>
  );
};
