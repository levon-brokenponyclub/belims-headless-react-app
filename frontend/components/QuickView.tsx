import React from "react";
import { Link } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
  AlertTriangle,
} from "lucide-react";
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

  // Build gallery: deduplicate featured_image + images array
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

  const isLowStock =
    product.stock > 0 && product.stock <= 5;

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
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/45 backdrop-blur-[2px] transition-opacity duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isQuickViewOpening || isQuickViewClosing ? "opacity-0" : "opacity-100"
        }`}
        onClick={closeQuickView}
      />

      {/* Dialog */}
      <div
        id={quickViewId}
        role="dialog"
        aria-modal="true"
        className={`relative z-[1] w-full md:max-w-[1140px] rounded-t-[18px] md:rounded-[18px] bg-white border border-black/10 shadow-[0_22px_70px_rgba(15,23,42,0.22)] max-h-[92vh] md:h-[88vh] overflow-y-auto md:overflow-hidden overscroll-y-contain transform transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
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

        {/* Two-column layout */}
        <div className="grid md:grid-cols-[1.08fr_1fr] md:h-[88vh]">

          {/* ── Left: image gallery ── */}
          <div className="flex flex-col md:h-full border-r border-black/5">
            {/* Main image */}
            <div className="relative flex items-center justify-center bg-grey-light/30 flex-1 p-6 md:p-10 overflow-hidden">
              {gallery[activeImageIndex] ? (
                <img
                  key={activeImageIndex}
                  src={gallery[activeImageIndex]}
                  alt={product.name}
                  loading="lazy"
                  decoding="async"
                  className="max-h-[300px] md:max-h-[480px] w-full object-contain mix-blend-multiply transition-opacity duration-200"
                />
              ) : (
                <div className="flex h-[260px] w-full items-center justify-center rounded bg-soft text-sm text-muted">
                  No image
                </div>
              )}

              {/* Prev / next if multiple images */}
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
                    <ChevronLeft size={16} />
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
                    <ChevronRight size={16} />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnail strip */}
            {gallery.length > 1 && (
              <div className="flex gap-2 p-3 border-t border-black/5 overflow-x-auto">
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
          <div className="flex flex-col px-6 py-6 md:px-8 md:py-8 md:overflow-y-auto">

            {/* Badges */}
            {(product.isFeatured || product.deals?.length) ? (
              <div className="mb-3 flex flex-wrap gap-2">
                {product.isFeatured && (
                  <span className="inline-block rounded-full bg-amber-100 px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-amber-700">
                    Featured
                  </span>
                )}
                {product.deals?.map((d, i) => (
                  <span
                    key={i}
                    className="inline-block rounded-full bg-red-50 px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-red-600"
                  >
                    {d.label_text ?? d.deal_name ?? d.type}
                  </span>
                ))}
              </div>
            ) : null}

            {/* Brand */}
            {product.brand && (
              <Link
                to={`/shop?brand=${encodeURIComponent(product.brand)}`}
                onClick={closeQuickView}
                className="mb-1 inline-block text-xs font-semibold uppercase tracking-widest text-grey-medium hover:text-brand transition-colors"
              >
                {product.brand}
              </Link>
            )}

            {/* Name */}
            <h2 className="text-2xl md:text-[34px] font-bold text-grey font-heading leading-[1.05]">
              {product.name}
            </h2>

            {/* Meta: SKU / category */}
            {(product.sku || product.category) && (
              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-grey-medium">
                {product.category && (
                  <span>
                    <span className="font-semibold">Type:</span>{" "}
                    <Link
                      to={`/shop?category=${encodeURIComponent(product.category)}`}
                      onClick={closeQuickView}
                      className="hover:text-brand transition-colors"
                    >
                      {product.category}
                    </Link>
                  </span>
                )}
                {product.sku && (
                  <span>
                    <span className="font-semibold">SKU:</span> {product.sku}
                  </span>
                )}
              </div>
            )}

            {/* Price */}
            <div className="mt-4 flex items-baseline gap-3">
              <span className="text-[36px] md:text-[44px] leading-none font-bold text-grey">
                {formatCurrency(displayPrice)}
              </span>
              {product.regular_price &&
                product.regular_price > displayPrice && (
                  <span className="text-lg text-grey-medium line-through">
                    {formatCurrency(product.regular_price)}
                  </span>
                )}
            </div>

            {/* Description */}
            {product.description && (
              <p className="mt-3 text-sm leading-relaxed text-grey-medium line-clamp-3">
                {product.description}
              </p>
            )}

            {/* Stock bar + low-stock warning */}
            <div className="mt-4">
              {isLowStock && (
                <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-amber-600">
                  <AlertTriangle size={13} />
                  Hurry up, only <strong>{product.stock}</strong>{" "}
                  {product.stock === 1 ? "item" : "items"} left in stock.
                </p>
              )}
              <StockBar current={product.stock ?? 0} max={quickViewMaxStock} />
            </div>

            {/* Quantity + Add to Cart */}
            <div className="mt-5">
              <div className="mb-2.5 flex items-center gap-3">
                {/* Qty stepper */}
                <div className="flex items-center border border-subtle rounded-full overflow-hidden h-11 min-w-[116px]">
                  <button
                    type="button"
                    onClick={() =>
                      setQuickViewQty((v) => Math.max(1, v - 1))
                    }
                    disabled={quickViewQty <= 1}
                    className="h-full px-4 text-grey hover:bg-soft transition-colors disabled:opacity-40"
                    aria-label="Decrease quantity"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="min-w-[40px] text-center text-sm font-bold text-ink">
                    {quickViewQty}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setQuickViewQty((v) =>
                        Math.min(Math.max(product.stock ?? 1, 1), v + 1),
                      )
                    }
                    disabled={quickViewQty >= Math.max(product.stock ?? 1, 1)}
                    className="h-full px-4 text-grey hover:bg-soft transition-colors disabled:opacity-40"
                    aria-label="Increase quantity"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>

                {/* Add to cart */}
                <button
                  type="button"
                  onClick={handleAddToCartClick}
                  disabled={
                    product.stock <= 0 ||
                    isAddToCartLoading ||
                    isBuyNowLoading
                  }
                  className="group relative h-11 flex-1 overflow-hidden rounded-full bg-grey text-white transition-colors disabled:opacity-50"
                >
                  <span className="absolute inset-0 origin-left scale-x-0 bg-black/20 transition-transform duration-300 ease-out group-hover:scale-x-100" />
                  <span className="relative z-10 flex items-center justify-center gap-2 text-sm font-heading font-bold">
                    {isAddToCartLoading ? (
                      <>
                        <Loader2 size={15} className="animate-spin" />
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

              {/* Buy now */}
              <button
                type="button"
                onClick={handleBuyNowClick}
                disabled={
                  product.stock <= 0 ||
                  isAddToCartLoading ||
                  isBuyNowLoading
                }
                className="group relative h-11 w-full overflow-hidden rounded-full border-2 border-grey text-grey transition-colors disabled:opacity-50 hover:bg-grey hover:text-white"
              >
                <span className="relative z-10 flex items-center justify-center gap-2 text-sm font-heading font-bold">
                  {isBuyNowLoading ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Buy it now"
                  )}
                </span>
              </button>
            </div>

            {/* View full details */}
            <div className="mt-4 pt-4 border-t border-black/5">
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
