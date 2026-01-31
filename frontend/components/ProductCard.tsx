import React from "react";
import { Link } from "react-router-dom";
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
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  addToCart,
  onBuyNow,
  onCompare,
  onNotify,
  className = "",
  showDealName = false,
}) => {
  const [notifyStatus, setNotifyStatus] = React.useState<
    "idle" | "pending" | "sent" | "error"
  >("idle");

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

  return (
    <div
      className={`bg-white border border-gray-200 rounded shadow-sm hover:shadow-lg transition-all duration-200 flex flex-col h-full group overflow-hidden relative min-w-[320px] max-w-[320px] ${className}`}
    >
      {/* Bundle Badge */}
      {/* {product.isBundle && (
        <div className="absolute top-3 left-0 bg-belims-accent text-white text-xs font-bold px-3 py-1 z-10 shadow-sm font-heading tracking-wide">
          BUNDLE DEAL
        </div>
      )} */}

      {/* Deal / Sale Badge */}
      {(() => {
        const deal = product.deals_resolved?.consumer;
        // Prioritize deal label
        if (deal?.label) {
          let bgClass = "bg-red-600";
          if (deal.badgeStyle === "trade") bgClass = "bg-belims-accent";
          else if (deal.badgeStyle === "clearance") bgClass = "bg-orange-600";
          else if (deal.badgeStyle === "info") bgClass = "bg-gray-600";

          return (
            <div
              className={`absolute top-2 left-2 ${bgClass} text-white text-xs font-bold px-2 py-1 rounded z-10 uppercase`}
            >
              {deal.label}
            </div>
          );
        }
        // Fallback to standard sale badge
        if (product.regular_price && product.price < product.regular_price) {
          return (
            <div className="absolute top-2 left-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded z-10">
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

      {/* Trade Special Badge */}
      {product.deals_resolved?.trade?.bestDeal?.type === "trade_special" && (
        <div className="absolute top-2 right-2 z-10 bg-green-600 text-white text-xs font-bold px-2 py-1 rounded">
          TRADE SPECIAL
        </div>
      )}

      <Link
        to={`/product/${product.id}`}
        className="relative h-48 overflow-hidden p-4 flex items-center justify-center transition-colors cursor-pointer"
      >
        <img
          src={product.image}
          alt={product.name}
          className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-500"
        />
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

        {/* Price and Stock Info */}
        <div className="mb-3 flex items-center justify-between">
          <div>
            {(() => {
              const deal = product.deals_resolved?.consumer;
              const hasDeal = !!deal?.bestDeal;
              const isTradeSpecial =
                deal?.bestDeal?.type === "trade_special" ||
                product.deals_resolved?.trade?.bestDeal?.type ===
                  "trade_special";

              const showPrice = deal ? deal.showPrice : true;
              if (!showPrice) {
                return (
                  <span className="font-bold text-gray-800 text-sm">
                    Log in to view price
                  </span>
                );
              }

              // For trade_special, ignore deal price and use regular price
              const displayPrice = isTradeSpecial
                ? product.regular_price || product.price
                : hasDeal
                  ? deal!.price
                  : product.price;

              const originalPrice =
                hasDeal && deal!.compareAtPrice && !isTradeSpecial
                  ? deal!.compareAtPrice
                  : product.regular_price &&
                      displayPrice < product.regular_price
                    ? product.regular_price
                    : null;

              return originalPrice ? (
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-bold text-red-600">
                    {CURRENCY_SYMBOL}
                    {formatPrice(displayPrice)}
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
                    {formatPrice(displayPrice)}
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

        {/* Actions: Add to Cart */}
        {product.stock > 0 ? (
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
