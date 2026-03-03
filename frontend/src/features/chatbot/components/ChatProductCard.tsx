import React from "react";
import { Eye, Heart, Loader2, Package, Scale, Truck } from "lucide-react";
import { Product } from "../types.ts";
import { formatCurrency } from "../../../../utils/price";

interface ChatProductCardProps {
  product: Product;
  onAddToCart: (productId: string) => void;
  onBuyNow: (productId: string) => void;
  onCheckStock: (productId: string) => void;
  variant?: "chat" | "grid";
  highlight?: boolean;
  deliveryLocationSet?: boolean;
  onRequestDeliveryAddress?: () => void;
  onFocusProduct?: (productId: string) => void;
}

export const ChatProductCard: React.FC<ChatProductCardProps> = ({
  product,
  onAddToCart,
  onBuyNow,
  onCheckStock,
  variant = "chat",
  highlight = false,
  deliveryLocationSet = false,
  onRequestDeliveryAddress,
  onFocusProduct,
}) => {
  const [isAdding, setIsAdding] = React.useState(false);
  const BUTTON_SPINNER_MIN_MS = 450;

  const handleAddClick = () => {
    if (isAdding) return;

    setIsAdding(true);
    const startedAt = Date.now();

    try {
      onAddToCart(product.id);
    } finally {
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, BUTTON_SPINNER_MIN_MS - elapsed);

      window.setTimeout(() => {
        setIsAdding(false);
      }, remaining);
    }
  };

  const stockLabel = !product.inStock
    ? "Out of stock"
    : (product.stockQty ?? 0) <= 3
      ? "Low stock"
      : "In stock";

  const stockClass = !product.inStock
    ? "bg-red-100 text-red-700"
    : (product.stockQty ?? 0) <= 3
      ? "bg-yellow-100 text-yellow-800"
      : "bg-green-100 text-green-700";

  const isLowStock = Boolean(product.inStock && (product.stockQty ?? 0) <= 3);

  return (
    <div
      onMouseEnter={() => onFocusProduct?.(product.id)}
      onClick={() => onFocusProduct?.(product.id)}
      className={`group border rounded-2xl p-3 bg-white shadow-sm hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 flex flex-col ${
        highlight
          ? "border-violet-400 ring-2 ring-violet-200"
          : "border-gray-200"
      } ${
        variant === "chat"
          ? "w-52 flex-shrink-0 mr-2"
          : "w-full hover:scale-[1.02]"
      }`}
    >
      <div
        className={`relative w-full bg-gray-50 mb-2 flex items-center justify-center text-gray-400 rounded-xl overflow-hidden ${
          variant === "chat" ? "h-28" : "h-40"
        }`}
      >
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.title}
            className="w-full h-full object-contain rounded"
          />
        ) : (
          <span className="text-xs">No Image</span>
        )}

        {variant === "grid" && (
          <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              className="h-7 w-7 rounded-full bg-white/95 border border-gray-200 text-gray-700 inline-flex items-center justify-center"
              title="Preview"
            >
              <Eye size={14} />
            </button>
            <button
              type="button"
              className="h-7 w-7 rounded-full bg-white/95 border border-gray-200 text-gray-700 inline-flex items-center justify-center"
              title="Save"
            >
              <Heart size={14} />
            </button>
            <button
              type="button"
              className="h-7 w-7 rounded-full bg-white/95 border border-gray-200 text-gray-700 inline-flex items-center justify-center"
              title="Compare"
            >
              <Scale size={14} />
            </button>
          </div>
        )}
      </div>
      <h4 className="text-sm font-semibold line-clamp-2 min-h-[2.5em]">
        {product.title}
      </h4>

      {highlight && (
        <div className="mt-1 inline-flex items-center rounded-full bg-violet-100 text-violet-800 text-[10px] font-semibold px-2 py-0.5 w-max">
          Best Fit
        </div>
      )}

      {product.isFastestOption && (
        <div className="mt-1 inline-flex items-center rounded-full bg-amber-100 text-amber-800 text-[10px] font-semibold px-2 py-0.5 w-max">
          Fastest option
        </div>
      )}

      <div className="mt-1 flex flex-wrap items-center gap-1.5">
        <div
          className={`text-[10px] rounded-full px-2 py-0.5 w-max font-semibold inline-flex items-center gap-1 ${stockClass}`}
        >
          <Package size={11} />
          {stockLabel}
        </div>
        {variant === "grid" && (
          <>
            <span className="text-[10px] rounded-full px-2 py-0.5 bg-indigo-100 text-indigo-700 font-semibold">
              Best Value
            </span>
            <span className="text-[10px] rounded-full px-2 py-0.5 bg-blue-100 text-blue-700 font-semibold">
              Most Popular
            </span>
          </>
        )}
        {isLowStock && (
          <span className="text-[10px] rounded-full px-2 py-0.5 bg-orange-100 text-orange-700 font-semibold">
            Only 3 left
          </span>
        )}
        {typeof product.stockQty === "number" && (
          <span className="text-[10px] rounded-full px-2 py-0.5 bg-gray-100 text-gray-700 font-semibold">
            Qty: {product.stockQty}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between mt-auto pt-2">
        <span className="font-bold text-gray-900">
          {formatCurrency(product.price)}
        </span>
        <button
          onClick={handleAddClick}
          disabled={isAdding}
          className="bg-violet-700 text-white text-xs px-3 py-1.5 rounded-full hover:bg-violet-800 transition inline-flex items-center justify-center gap-1 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isAdding ? (
            <>
              <Loader2 size={12} className="animate-spin" />
              Adding...
            </>
          ) : (
            "Add"
          )}
        </button>
      </div>

      {deliveryLocationSet ? (
        <button
          type="button"
          onClick={onRequestDeliveryAddress}
          className="mt-1 inline-flex items-center gap-1 text-[11px] text-gray-600 hover:text-gray-800"
        >
          <Truck size={12} className="text-violet-600" />
          {product.deliveryEtaText
            ? `${product.deliveryEtaText}${typeof product.deliveryPrice === "number" ? ` • ${formatCurrency(product.deliveryPrice)}` : ""}`
            : "View delivery options"}
        </button>
      ) : (
        <button
          type="button"
          onClick={onRequestDeliveryAddress}
          className="mt-1 inline-flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-700"
        >
          <Truck size={12} />
          Enter address to see delivery rates
        </button>
      )}

      <div className="mt-2 grid grid-cols-2 gap-1.5">
        <button
          className="text-[11px] border border-gray-200 rounded-full px-2 py-1.5 hover:bg-gray-50"
          onClick={() => onBuyNow(product.id)}
        >
          Buy now
        </button>
        <button
          className="text-[11px] border border-gray-200 rounded-full px-2 py-1.5 hover:bg-gray-50"
          onClick={() => onCheckStock(product.id)}
        >
          Check stock
        </button>
      </div>
    </div>
  );
};
