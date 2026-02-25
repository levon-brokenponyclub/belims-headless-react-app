import React from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Loader2 } from "lucide-react";
import { Product } from "../types";
import { formatCurrency } from "../utils/price";
import { StockBar } from "./StockBar";

interface QuickViewProps {
  product: Product;
  quickViewId: string;
  shouldRender: boolean;
  isQuickViewOpening: boolean;
  isQuickViewClosing: boolean;
  closeQuickView: () => void;
  displayPrice: number;
  onAddToCart: (quantity: number) => void;
  onBuyNow: (quantity: number) => void;
}

export const QuickView: React.FC<QuickViewProps> = ({
  product,
  quickViewId,
  shouldRender,
  isQuickViewOpening,
  isQuickViewClosing,
  closeQuickView,
  displayPrice,
  onAddToCart,
  onBuyNow,
}) => {
  const [quickViewQty, setQuickViewQty] = React.useState(1);
  const [isAddToCartLoading, setIsAddToCartLoading] = React.useState(false);
  const [isBuyNowLoading, setIsBuyNowLoading] = React.useState(false);

  const BUTTON_SPINNER_MIN_MS = 450;

  React.useEffect(() => {
    if (shouldRender) {
      setQuickViewQty(1);
    }
  }, [shouldRender]);

  const quickViewMaxStock =
    product.maxStock && product.maxStock > 0
      ? product.maxStock
      : Math.max(product.stock ?? 0, 1);

  const runActionWithIndicator = (
    action: "add" | "buy",
    callback: () => void,
  ) => {
    if (action === "add") {
      setIsAddToCartLoading(true);
    } else {
      setIsBuyNowLoading(true);
    }

    const startedAt = Date.now();

    try {
      callback();
    } finally {
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, BUTTON_SPINNER_MIN_MS - elapsed);

      window.setTimeout(() => {
        if (action === "add") {
          setIsAddToCartLoading(false);
        } else {
          setIsBuyNowLoading(false);
        }
      }, remaining);
    }
  };

  const handleAddToCartClick = () => {
    if (product.stock <= 0 || isAddToCartLoading || isBuyNowLoading) return;
    runActionWithIndicator("add", () => onAddToCart(quickViewQty));
  };

  const handleBuyNowClick = () => {
    if (product.stock <= 0 || isAddToCartLoading || isBuyNowLoading) return;
    runActionWithIndicator("buy", () => onBuyNow(quickViewQty));
  };

  if (!shouldRender) return null;

  return (
    <div className="fixed inset-0 z-[1201] flex items-end md:items-center justify-center p-0 md:p-4">
      <div
        className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isQuickViewOpening || isQuickViewClosing ? "opacity-0" : "opacity-100"
        }`}
        onClick={closeQuickView}
      />
      <div
        id={quickViewId}
        role="dialog"
        aria-modal="true"
        className={`relative z-[1] w-full md:max-w-5xl rounded-t-2xl md:rounded-block bg-surface shadow-pop border border-subtle max-h-[65vh] md:max-h-[65vh] overflow-y-auto md:overflow-hidden overscroll-y-contain transform transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isQuickViewOpening || isQuickViewClosing
            ? "translate-y-full"
            : "translate-y-0"
        } md:translate-y-0`}
      >
        <button
          type="button"
          onClick={closeQuickView}
          className="w-full h-9 md:hidden flex items-center justify-center px-0 rounded-t-2xl hover:bg-slate-50 transition-colors"
          aria-label="Close quick view"
        >
          <span className="w-12 h-1.5 bg-slate-300 rounded-full" />
        </button>

        <button
          type="button"
          onClick={closeQuickView}
          className="absolute right-4 top-11 md:top-4 text-muted hover:text-ink"
          aria-label="Close quick view"
        >
          <span className="text-xl">X</span>
        </button>

        <div className="grid gap-6 p-0 md:overflow-hidden md:grid-cols-[1.1fr_1fr] md:h-[65vh]">
          <div className="flex flex-col gap-4 md:h-full md:sticky md:top-0">
            <div className="flex items-center justify-center rounded-block bg-grey-light p-4 md:h-full">
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.name}
                  loading="lazy"
                  decoding="async"
                  className="max-h-[280px] md:max-h-[520px] w-full object-contain mix-blend-multiply"
                />
              ) : (
                <div className="flex h-[260px] w-full items-center justify-center rounded bg-soft text-sm text-muted">
                  No image
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col md:max-h-full py-6 px-6 md:overflow-y-auto md:px-4 md:pr-8">
            <div className="mb-1 text-sm font-semibold uppercase text-muted tracking-wide">
              SKU: {product.sku || product.id}
            </div>
            <div className="text-xl md:text-3xl font-bold text-grey font-heading leading-tight">
              {product.name}
            </div>

            <div className="mt-4 text-2xl font-bold text-red-muted">
              {formatCurrency(displayPrice)}
            </div>

            <div className="mt-3">
              <StockBar current={product.stock ?? 0} max={quickViewMaxStock} />
            </div>

            <div className="mt-5 rounded-block bg-white">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center border border-subtle rounded-pill overflow-hidden h-11">
                  <button
                    type="button"
                    onClick={() =>
                      setQuickViewQty((value) => Math.max(1, value - 1))
                    }
                    className="h-full px-4 text-grey hover:bg-soft transition-colors"
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <span className="min-w-[44px] text-center text-sm font-bold text-ink">
                    {quickViewQty}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setQuickViewQty((value) =>
                        Math.min(Math.max(product.stock ?? 1, 1), value + 1),
                      )
                    }
                    className="h-full px-4 text-grey hover:bg-soft transition-colors"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleAddToCartClick}
                  disabled={
                    product.stock <= 0 || isAddToCartLoading || isBuyNowLoading
                  }
                  className="group relative h-11 flex-1 overflow-hidden rounded-pill bg-grey text-white transition-colors disabled:opacity-50"
                >
                  <span className="absolute inset-0 origin-left scale-x-0 bg-grey transition-transform duration-300 ease-out group-hover:scale-x-100" />
                  <span className="relative z-10 flex items-center justify-center gap-2 font-heading font-bold transition-colors group-hover:text-white">
                    {isAddToCartLoading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Adding...
                      </>
                    ) : product.stock > 0 ? (
                      "Add to cart"
                    ) : (
                      "Out of stock"
                    )}
                  </span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleBuyNowClick}
                disabled={
                  product.stock <= 0 || isAddToCartLoading || isBuyNowLoading
                }
                className="group relative h-11 w-full overflow-hidden rounded-pill bg-red-muted text-white transition-colors disabled:opacity-50"
              >
                <span className="absolute inset-0 origin-left scale-x-0 bg-red-muted transition-transform duration-300 ease-out group-hover:scale-x-100" />
                <span className="relative z-10 flex items-center justify-center gap-2 font-heading font-bold transition-colors">
                  {isBuyNowLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Buy Now"
                  )}
                </span>
              </button>
            </div>

            <Link
              to={`/product/${product.id}`}
              onClick={closeQuickView}
              className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-brand hover:underline"
            >
              View full details
              <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
