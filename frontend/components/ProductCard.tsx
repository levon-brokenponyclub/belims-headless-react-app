import React from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Bell,
  CheckCircle,
  Star,
  ShoppingCart,
  Scale,
  Zap,
} from "lucide-react";
import { Product } from "../types";
import { StockBar } from "./StockBar";
import { CURRENCY_SYMBOL } from "../constants";

interface ProductCardProps {
  product: Product;
  addToCart: (product: Product) => void;
  onBuyNow?: (product: Product) => void;
  onCompare?: (product: Product) => void;
  onNotify?: (product: Product) => Promise<void> | void;
  className?: string;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  addToCart,
  onBuyNow,
  onCompare,
  onNotify,
  className = "",
}) => {
  const [notifyStatus, setNotifyStatus] = React.useState<
    "idle" | "pending" | "sent" | "error"
  >("idle");

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
      className={`bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-lg transition-all duration-200 flex flex-col h-full group overflow-hidden relative ${className}`}
    >
      {/* Bundle Badge */}
      {product.isBundle && (
        <div className="absolute top-3 left-0 bg-belims-accent text-white text-xs font-bold px-3 py-1 z-10 shadow-sm font-heading tracking-wide">
          BUNDLE DEAL
        </div>
      )}

      {/* Compare Button */}
      {onCompare && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCompare(product);
          }}
          className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-full text-gray-500 hover:bg-belims-blue hover:text-white transition-colors shadow-sm z-10 border border-gray-100"
          title="Add to Compare"
        >
          <Scale size={18} />
        </button>
      )}

      <Link
        to={`/product/${product.id}`}
        className="relative h-48 overflow-hidden p-4 flex items-center justify-center bg-gray-50 group-hover:bg-white transition-colors cursor-pointer"
      >
        <img
          src={product.image}
          alt={product.name}
          className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-500"
        />
      </Link>

      <div className="p-4 flex-1 flex flex-col">
        <div className="text-xs text-gray-500 mb-1 font-medium">
          {product.category}
        </div>
        <Link
          to={`/product/${product.id}`}
          className="font-bold text-gray-900 text-sm md:text-base leading-5 line-clamp-2 mb-2 flex-1 font-heading group-hover:text-belims-blue transition-colors cursor-pointer block"
        >
          {product.name}
        </Link>

        {/* Ratings */}
        <div className="flex items-center mb-2">
          <div className="flex text-yellow-400 text-xs">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                size={14}
                fill={i < Math.round(product.rating) ? "currentColor" : "none"}
              />
            ))}
          </div>
          <span className="text-xs text-gray-400 ml-1 font-medium">
            ({product.reviews})
          </span>
        </div>

        {/* Price */}
        <div className="mb-3">
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-gray-900 font-heading">
              {CURRENCY_SYMBOL}
              {product.price.toFixed(2)}
            </span>
            {product.isBundle && (
              <span className="text-xs text-green-600 font-bold bg-green-50 px-1.5 py-0.5 rounded">
                Save {CURRENCY_SYMBOL}
                {product.bundleSavings?.toFixed(2)}
              </span>
            )}
          </div>
        </div>

        {/* Stock Bar (hide when out of stock) */}
        {product.stock > 0 && (
          <StockBar current={product.stock} max={product.maxStock} />
        )}

        {/* Actions: Add to Cart & Buy Now */}
        {product.stock > 0 ? (
          <div
            className={`mt-4 grid ${onBuyNow ? "grid-cols-2" : "grid-cols-1"} gap-2`}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                addToCart(product);
              }}
              className="py-2.5 rounded font-bold text-sm leading-5 flex items-center justify-center gap-1 transition-all font-heading bg-[#322783] text-white hover:bg-[#e40613]"
            >
              <ShoppingCart size={14} />
              Add
            </button>
            {onBuyNow && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onBuyNow(product);
                }}
                className="py-2.5 rounded font-bold text-sm leading-5 flex items-center justify-center gap-1 transition-all font-heading shadow-sm bg-belims-accent text-white hover:brightness-110"
              >
                <Zap size={14} fill="currentColor" />
                Buy Now
              </button>
            )}
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-2">
            <div className="flex items-center gap-2 py-2.5 px-3 text-sm leading-5 font-semibold text-red-700 bg-red-50 border border-red-200 rounded">
              <AlertTriangle size={14} />
              Currently out of stock
            </div>
            <button
              onClick={handleNotify}
              disabled={notifyStatus === "pending" || notifyStatus === "sent"}
              className={`py-2.5 rounded font-bold text-sm leading-5 flex items-center justify-center gap-1 transition-all font-heading shadow-sm ${notifyStatus === "sent" ? "bg-green-100 text-green-800 border border-green-200" : notifyStatus === "error" ? "bg-red-100 text-red-700 border border-red-200" : "bg-belims-accent text-white hover:brightness-110"} ${notifyStatus === "pending" ? "opacity-70 cursor-wait" : ""}`}
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
                    : "Notify Me"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
