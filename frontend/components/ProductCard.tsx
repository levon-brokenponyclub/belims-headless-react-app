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
      className={`bg-white border border-gray-200 rounded shadow-sm hover:shadow-lg transition-all duration-200 flex flex-col h-full group overflow-hidden relative min-w-[320px] max-w-[320px] ${className}`}
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
        className="relative h-48 overflow-hidden p-4 flex items-center justify-center transition-colors cursor-pointer"
      >
        <img
          src={product.image}
          alt={product.name}
          className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-500"
        />
      </Link>

      <div className="p-4 flex-1 flex flex-col">
        <div className="text-xs mb-1 font-medium" style={{ color: "#64748b" }}>
          {product.category}
        </div>
        <div className="flex-1 mb-[1.5625rem]">
          <Link
            to={`/product/${product.id}`}
            className="font-heading text-gray-900 text-[0.9375rem] font-semibold leading-5 line-clamp-2 mb-1 group-hover:text-belims-blue transition-colors cursor-pointer block"
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

        {/* Price */}
        <div className="mb-3">
          <div className="flex items-baseline gap-2">
            <span
              className="text-[1.1rem] font-bold text-gray-900 font-heading"
              style={{ fontWeight: 800 }}
            >
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

        {product.stock > 0 ? (
          <div className="product-fulfillment">
            <span className="pill pickup">Pickup</span>
            <span className="pill delivery">Delivery</span>
          </div>
        ) : (
          <div className="text-xs font-semibold text-red-700">Out of stock</div>
        )}

        {/* Actions: Add to Cart */}
        {product.stock > 0 ? (
          <div className="mt-4 grid grid-cols-1 gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                addToCart(product);
              }}
              className="py-2.5 rounded font-bold text-[0.8125rem] leading-5 transition-all font-heading bg-[#322783] text-white hover:bg-[#e40613]"
            >
              Add to cart
            </button>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-2">
            <button
              onClick={handleNotify}
              disabled={notifyStatus === "pending" || notifyStatus === "sent"}
              className={`py-2.5 rounded font-bold text-[0.8125rem] leading-5 flex items-center justify-center gap-1 transition-all font-heading shadow-sm ${notifyStatus === "sent" ? "bg-green-100 text-green-800 border border-green-200" : notifyStatus === "error" ? "bg-red-100 text-red-700 border border-red-200" : "bg-belims-accent text-white hover:brightness-110"} ${notifyStatus === "pending" ? "opacity-70 cursor-wait" : ""}`}
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
