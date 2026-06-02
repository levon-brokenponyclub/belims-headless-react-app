import React from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Loader2, Minus, Plus, X } from "lucide-react";
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
  const [activeImageIndex, setActiveImageIndex] = React.useState(0);

  const BUTTON_SPINNER_MIN_MS = 450;

  const gallery = React.useMemo(() => {
    const imgs: string[] = [];
    if (product.image) imgs.push(product.image);
    if (product.images) {
      for (const img of product.images) {
        if (img && !imgs.includes(img)) imgs.push(img);
      }
    }
    return imgs.length > 0 ? imgs : [""];
  }, [product.image, product.images]);

  React.useEffect(() => {
    if (shouldRender) {
      setQuickViewQty(1);
      setActiveImageIndex(0);
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
    if (action === "add") setIsAddToCartLoading(true);
    else setIsBuyNowLoading(true);

    const startedAt = Date.now();
    try {
      callback();
    } finally {
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, BUTTON_SPINNER_MIN_MS - elapsed);
      window.setTimeout(() => {
        if (action === "add") setIsAddToCartLoading(false);
        else setIsBuyNowLoading(false);
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
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/45 backdrop-blur-[2px] transition-opacity duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isQuickViewOpening || isQuickViewClosing ? "opacity-0" : "opacity-100"
        }`}
        onClick={closeQuickView}
      />

      {/* Dialog — auto height, capped */}
      <div
        id={quickViewId}
        role="dialog"
        aria-modal="true"
        className={`relative z-[1] w-full md:max-w-[1060px] rounded-t-[18px] md:rounded-[18px] bg-white border border-black/10 shadow-[0_22px_70px_rgba(15,23,42,0.22)] max-h-[88vh] md:max-h-[82vh] overflow-y-auto md:overflow-hidden overscroll-y-contain transform transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isQuickViewOpening || isQuickViewClosing
            ? "translate-y-full"
            : "translate-y-0"
        } md:translate-y-0`}
      >
        {/* Mobile drag handle */}
        <button
          type="button"
          onClick={closeQuickView}
          className="w-full h-9 md:hidden flex items-center justify-center px-0 rounded-t-[18px] hover:bg-slate-50 transition-colors"
          aria-label="Close quick view"
        >
          <span className="w-12 h-1.5 bg-slate-300 rounded-full" />
        </button>

        {/* Close button */}
        <button
          type="button"
          onClick={closeQuickView}
          className="absolute right-4 top-11 md:top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white text-grey-medium transition-colors hover:text-grey hover:border-black/20"
          aria-label="Close quick view"
        >
          <X size={18} />
        </button>

        {/* Two-column grid */}
        <div className="md:grid md:grid-cols-[1fr_1fr] md:max-h-[82vh]">

          {/* ── Left: image gallery ── */}
          <div className="flex flex-col border-r border-black/5 md:overflow-hidden">
            <div className="relative flex flex-1 items-center justify-center bg-grey-light/30 p-6 md:p-10">
              {gallery[activeImageIndex] ? (
                <img
                  key={activeImageIndex}
                  src={gallery[activeImageIndex]}
                  alt={product.name}
                  loading="lazy"
                  decoding="async"
                  className="max-h-[280px] md:max-h-[400px] w-full object-contain mix-blend-multiply"
                />
              ) : (
                <div className="flex h-[240px] w-full items-center justify-center rounded bg-soft text-sm text-muted">
                  No image
                </div>
              )}

              {gallery.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveImageIndex((i) =>
                        i === 0 ? gallery.length - 1 : i - 1,
                      )
                    }
                    disabled={activeImageIndex === 0}
                    className="absolute left-3 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-white shadow-sm transition-colors hover:bg-grey-light disabled:opacity-30"
                    aria-label="Previous image"
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveImageIndex((i) =>
                        i === gallery.length - 1 ? 0 : i + 1,
                      )
                    }
                    disabled={activeImageIndex === gallery.length - 1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-white shadow-sm transition-colors hover:bg-grey-light disabled:opacity-30"
                    aria-label="Next image"
                  >
                    <ChevronRight size={15} />
                  </button>
                </>
              )}
            </div>

            {gallery.length > 1 && (
              <div className="flex gap-2 p-3 border-t border-black/5 overflow-x-auto flex-shrink-0">
                {gallery.map((img, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActiveImageIndex(i)}
                    className={`flex-shrink-0 h-14 w-14 rounded-lg border-2 overflow-hidden transition-colors ${
                      i === activeImageIndex
                        ? "border-grey"
                        : "border-transparent hover:border-black/20"
                    }`}
                    aria-label={`Image ${i + 1}`}
                  >
                    <img
                      src={img}
                      alt=""
                      className="h-full w-full object-contain mix-blend-multiply bg-grey-light/30"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Right: product info ── */}
          <div className="bg-white md:overflow-y-auto px-6 py-6 md:px-8 md:py-8">

            {/* Brand / title / SKU */}
            <div className="pb-0">
              {product.brand && (
                <Link
                  to={`/shop?brand=${encodeURIComponent(product.brand)}`}
                  onClick={closeQuickView}
                  className="mb-2 inline-block text-sm font-semibold uppercase tracking-wide text-grey-medium hover:text-brand transition-colors"
                >
                  {product.brand}
                </Link>
              )}
              <h2 className="text-3xl font-bold text-grey font-heading mb-1">
                {product.name}
              </h2>
              {product.sku && (
                <div className="text-base text-grey-medium mb-3">
                  SKU: {product.sku}
                </div>
              )}
            </div>

            {/* Price + stock + CTAs */}
            <div className="mt-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex justify-start gap-2 items-end">
                    <div className="font-heading text-[28px] font-bold text-grey">
                      {formatCurrency(displayPrice)}
                    </div>
                    {product.regular_price &&
                      product.regular_price > displayPrice && (
                        <div className="font-heading text-base font-bold text-grey-medium line-through mb-1">
                          {formatCurrency(product.regular_price)}
                        </div>
                      )}
                  </div>
                  <StockBar
                    current={product.stock ?? 0}
                    max={quickViewMaxStock}
                  />
                </div>
              </div>

              {product.description && (
                <p className="text-sm text-gray-500 leading-relaxed line-clamp-3 mb-4">
                  {product.description}
                </p>
              )}

              <div className="space-y-3 mt-4 mb-4">
                <div className="flex gap-4">
                  <div className="flex items-center border border-gray-300 rounded-sm bg-white h-11">
                    <button
                      type="button"
                      onClick={() =>
                        setQuickViewQty((v) => Math.max(1, v - 1))
                      }
                      className="px-3 hover:bg-gray-100 text-gray-600 h-full rounded-sm"
                      aria-label="Decrease quantity"
                    >
                      <Minus size={15} />
                    </button>
                    <div className="w-7 text-center font-semibold text-sm">
                      {quickViewQty}
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setQuickViewQty((v) => Math.min(product.stock, v + 1))
                      }
                      className="px-3 hover:bg-gray-100 text-gray-600 h-full rounded"
                      aria-label="Increase quantity"
                    >
                      <Plus size={15} />
                    </button>
                  </div>

                  <div className="flex flex-1">
                    <button
                      type="button"
                      onClick={handleAddToCartClick}
                      disabled={
                        product.stock === 0 ||
                        isAddToCartLoading ||
                        isBuyNowLoading
                      }
                      className="group relative h-11 w-full overflow-hidden rounded-pill bg-belims-blue text-white transition-colors disabled:opacity-50"
                    >
                      <span className="absolute inset-0 origin-left scale-x-0 bg-red-muted transition-transform duration-300 ease-out group-hover:scale-x-100" />
                      <span className="relative z-10 flex items-center justify-center gap-2 font-heading font-bold transition-colors group-hover:text-white">
                        {isAddToCartLoading ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            Adding...
                          </>
                        ) : product.stock > 0 ? (
                          "Add to cart"
                        ) : (
                          "Out of Stock"
                        )}
                      </span>
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleBuyNowClick}
                  disabled={
                    product.stock === 0 ||
                    isAddToCartLoading ||
                    isBuyNowLoading
                  }
                  className="group relative h-11 w-full overflow-hidden rounded-pill bg-grey text-white transition-colors disabled:opacity-50"
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
            </div>

            {/* View full details */}
            <div className="pt-4 border-t border-black/5">
              <Link
                to={`/product/${product.id}`}
                onClick={closeQuickView}
                className="inline-flex items-center gap-1.5 text-sm font-bold text-brand hover:underline"
              >
                View full details
                <ChevronRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
