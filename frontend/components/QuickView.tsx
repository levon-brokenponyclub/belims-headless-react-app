import React from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Loader2, X } from "lucide-react";
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
        className={`absolute inset-0 bg-black/45 backdrop-blur-[2px] transition-opacity duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isQuickViewOpening || isQuickViewClosing ? "opacity-0" : "opacity-100"
        }`}
        onClick={closeQuickView}
      />
      <div
        id={quickViewId}
        role="dialog"
        aria-modal="true"
        className={`relative z-[1] w-full md:max-w-[1140px] rounded-t-[18px] md:rounded-[18px] bg-white border border-black/10 shadow-[0_22px_70px_rgba(15,23,42,0.22)] max-h-[88vh] md:h-[88vh] overflow-y-auto md:overflow-hidden overscroll-y-contain transform transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isQuickViewOpening || isQuickViewClosing
            ? "translate-y-full"
            : "translate-y-0"
        } md:translate-y-0`}
      >
        <button
          type="button"
          onClick={closeQuickView}
          className="w-full h-9 md:hidden flex items-center justify-center px-0 rounded-t-[18px] hover:bg-slate-50 transition-colors"
          aria-label="Close quick view"
        >
          <span className="w-12 h-1.5 bg-slate-300 rounded-full" />
        </button>

        <button
          type="button"
          onClick={closeQuickView}
          className="absolute right-4 top-11 md:top-4 z-10 flex h-12 w-12 items-center justify-center rounded-full border border-black/10 bg-white text-grey-medium transition-colors hover:text-grey hover:border-black/20"
          aria-label="Close quick view"
        >
          <X size={20} />
        </button>

        <div className="grid gap-0 p-0 md:overflow-hidden md:grid-cols-[1.08fr_1fr] md:h-[88vh]">
          <div className="flex flex-col gap-0 md:h-full md:sticky md:top-0 border-r border-black/5">
            <div className="flex items-center justify-center bg-grey-light/40 p-4 md:p-8 md:h-full">
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.name}
                  loading="lazy"
                  decoding="async"
                  className="max-h-[320px] md:max-h-[620px] w-full object-contain mix-blend-multiply"
                />
              ) : (
                <div className="flex h-[260px] w-full items-center justify-center rounded bg-soft text-sm text-muted">
                  No image
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col md:max-h-full px-6 py-6 md:overflow-y-auto md:px-10 md:py-8">
            <div className="mb-2 text-[32px] md:text-[48px] leading-none text-black/10 select-none">
              ⠿⠿⠿⠿
            </div>
            {product.brand && (
              <Link
                to={`/shop?brand=${encodeURIComponent(product.brand)}`}
                onClick={closeQuickView}
                className="mb-2 inline-block text-sm font-semibold uppercase tracking-wide text-grey-medium hover:text-brand transition-colors"
              >
                {product.brand}
              </Link>
            )}
            <div className="text-3xl md:text-[52px] font-bold text-grey font-heading leading-[0.95]">
              {product.name}
            </div>

            <div className="mt-3 text-[38px] md:text-[48px] leading-none font-bold text-grey">
              {formatCurrency(displayPrice)}
            </div>

            <p className="mt-4 text-lg leading-relaxed text-grey-medium line-clamp-3">
              {product.description ||
                "Dive into a world of pristine audio clarity where every beat resonates perfectly."}
            </p>

            <div className="mt-5">
              <StockBar current={product.stock ?? 0} max={quickViewMaxStock} />
            </div>

            <div className="mt-5 rounded-2xl bg-white">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex items-center border border-subtle rounded-full overflow-hidden h-11 min-w-[124px]">
                  <button
                    type="button"
                    onClick={() =>
                      setQuickViewQty((value) => Math.max(1, value - 1))
                    }
                    className="h-full px-4 text-grey hover:bg-soft transition-colors"
                    aria-label="Decrease quantity"
                  >
                    <ChevronLeft size={16} />
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
                    <ChevronRight size={16} />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleAddToCartClick}
                  disabled={
                    product.stock <= 0 || isAddToCartLoading || isBuyNowLoading
                  }
                  className="group relative h-11 flex-1 overflow-hidden rounded-full bg-grey text-white transition-colors disabled:opacity-50"
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
                className="group relative h-11 w-full overflow-hidden rounded-full bg-red-muted text-white transition-colors disabled:opacity-50"
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
