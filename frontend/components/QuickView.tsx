import React from "react";
import ReactDOM from "react-dom";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Heart, Minus, Plus, X } from "lucide-react";
import { Product } from "../types";
import { formatCurrency } from "../utils/price";
import { buildProductUrl } from "../utils/product";
import { useLiveStock } from "../utils/liveStock";
import { buyButtonClass } from "./ui/classes";
import { Spinner } from "./Spinner";

interface QuickViewProps {
  product: Product;
  quickViewId: string;
  shouldRender: boolean;
  isQuickViewOpening: boolean;
  isQuickViewClosing: boolean;
  closeQuickView: () => void;
  displayPrice: number;
  onAddToCart: (quantity: number) => void;
  isWishlisted: boolean;
  onToggleWishlist: (e: React.MouseEvent) => void;
}

const BUTTON_SPINNER_MIN_MS = 450;

/** Descriptions arrive as HTML from WooCommerce; the quick view shows a short plain-text summary. */
const toPlainText = (html?: string) => {
  if (!html) return "";
  const doc = new DOMParser().parseFromString(html, "text/html");
  return (doc.body.textContent || "").replace(/\s+/g, " ").trim();
};

// Layout after shadcnblocks product-quick-view4: full-bleed image carousel left, details right.
export const QuickView: React.FC<QuickViewProps> = ({
  product: productProp,
  quickViewId,
  shouldRender,
  isQuickViewOpening,
  isQuickViewClosing,
  closeQuickView,
  displayPrice,
  onAddToCart,
  isWishlisted,
  onToggleWishlist,
}) => {
  // Stock reflects cart holds made since this product was fetched.
  const product = useLiveStock(productProp);
  const [quantity, setQuantity] = React.useState(1);
  const [isAdding, setIsAdding] = React.useState(false);
  const [activeImageIndex, setActiveImageIndex] = React.useState(0);

  const gallery = React.useMemo(() => {
    const imgs: string[] = [];
    if (product.image) imgs.push(product.image);
    for (const img of product.images || []) {
      if (img && !imgs.includes(img)) imgs.push(img);
    }
    return imgs.length > 0 ? imgs : [""];
  }, [product.image, product.images]);

  const summary = React.useMemo(
    () => toPlainText(product.short_description || product.description),
    [product.short_description, product.description],
  );

  React.useEffect(() => {
    if (shouldRender) {
      setQuantity(1);
      setActiveImageIndex(0);
    }
  }, [shouldRender]);

  React.useEffect(() => {
    if (!shouldRender) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeQuickView();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [shouldRender, closeQuickView]);

  const inStock = product.stock > 0;
  const regularPrice = Number(product.regular_price) || 0;
  const showWasPrice = regularPrice > displayPrice;
  const stockLabel = !inStock
    ? { text: "Out of stock", tone: "text-stock-out" }
    : product.stock <= 3
      ? { text: `In stock — only ${product.stock} left`, tone: "text-stock-low" }
      : { text: "In stock", tone: "text-stock-ok" };

  const handleAddToCart = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!inStock || isAdding) return;
    setIsAdding(true);
    const startedAt = Date.now();
    try {
      onAddToCart(quantity);
    } finally {
      const remaining = Math.max(0, BUTTON_SPINNER_MIN_MS - (Date.now() - startedAt));
      window.setTimeout(() => setIsAdding(false), remaining);
    }
  };

  if (!shouldRender || typeof document === "undefined") return null;

  const hidden = isQuickViewOpening || isQuickViewClosing;
  const productUrl = buildProductUrl(product);
  const arrowClass =
    "absolute top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border-2 border-border bg-white text-text transition-colors hover:border-text disabled:opacity-40";

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-[1201] flex items-end justify-center p-0 md:items-center md:p-4"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          hidden ? "opacity-0" : "opacity-100"
        }`}
        onClick={closeQuickView}
        aria-hidden
      />

      <div
        id={quickViewId}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${quickViewId}-title`}
        className={`relative z-[1] grid max-h-[92vh] w-full overflow-y-auto overscroll-y-contain rounded-t-lg border-2 border-border bg-white transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] md:max-w-[880px] md:grid-cols-2 md:overflow-hidden md:rounded-lg ${
          hidden ? "translate-y-full" : "translate-y-0"
        } md:translate-y-0`}
      >
        <button
          type="button"
          onClick={closeQuickView}
          className="absolute right-3 top-3 z-20 grid h-10 w-10 place-items-center rounded-md bg-white/90 text-text-secondary transition-colors hover:text-text"
          aria-label="Close quick view"
        >
          <X size={20} />
        </button>

        {/* Image carousel */}
        <div className="relative aspect-square bg-surface-muted md:aspect-auto md:min-h-[480px]">
          {gallery[activeImageIndex] ? (
            <img
              src={gallery[activeImageIndex]}
              alt={product.name}
              className="absolute inset-0 h-full w-full object-contain p-8"
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-text-tertiary">No image</div>
          )}
          {gallery.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => setActiveImageIndex((i) => (i === 0 ? gallery.length - 1 : i - 1))}
                className={`${arrowClass} left-3`}
                aria-label="Previous image"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                onClick={() => setActiveImageIndex((i) => (i === gallery.length - 1 ? 0 : i + 1))}
                className={`${arrowClass} right-3`}
                aria-label="Next image"
              >
                <ChevronRight size={18} />
              </button>
              <p className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-pill bg-white/90 px-2 py-0.5 text-xs font-bold text-text-secondary">
                {activeImageIndex + 1} / {gallery.length}
              </p>
            </>
          )}
        </div>

        {/* Details */}
        <div className="flex flex-col gap-4 p-6 md:overflow-y-auto md:p-8">
          <div className="pr-10">
            {product.brand && (
              <p className="text-xs font-bold uppercase tracking-wider text-text-tertiary">{product.brand}</p>
            )}
            <h2 id={`${quickViewId}-title`} className="mt-1 text-h4 font-bold leading-tight text-text">
              {product.name}
            </h2>
            {summary && <p className="mt-2 line-clamp-2 text-base text-text-secondary">{summary}</p>}
          </div>

          <p className="flex items-baseline gap-2">
            <span className="text-h4 font-bold text-text">{formatCurrency(displayPrice)}</span>
            {showWasPrice && (
              <span className="text-base text-deal-strike line-through">{formatCurrency(regularPrice)}</span>
            )}
          </p>

          <p className={`flex items-center gap-2 text-base font-semibold ${stockLabel.tone}`}>
            <span className="h-2 w-2 rounded-full bg-current" aria-hidden />
            {stockLabel.text}
          </p>

          <div className="flex items-stretch gap-2">
            <div className="inline-flex h-12 items-center rounded-md border-2 border-border">
              <button
                type="button"
                onClick={() => setQuantity((v) => Math.max(1, v - 1))}
                disabled={quantity <= 1}
                className="grid h-full w-10 place-items-center text-text-secondary transition-colors hover:text-text disabled:opacity-40"
                aria-label="Decrease quantity"
              >
                <Minus size={16} />
              </button>
              <span className="w-8 text-center text-base font-bold tabular-nums" aria-live="polite">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((v) => Math.min(Math.max(product.stock, 1), v + 1))}
                disabled={quantity >= product.stock}
                className="grid h-full w-10 place-items-center text-text-secondary transition-colors hover:text-text disabled:opacity-40"
                aria-label="Increase quantity"
              >
                <Plus size={16} />
              </button>
            </div>
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={!inStock || isAdding}
              className={`${buyButtonClass} min-w-0 flex-1`}
            >
              {isAdding ? (
                <>
                  <Spinner data-icon="inline-start" />
                  Adding...
                </>
              ) : inStock ? (
                "Add to cart"
              ) : (
                "Out of stock"
              )}
            </button>
            <button
              type="button"
              onClick={onToggleWishlist}
              aria-pressed={isWishlisted}
              aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
              className={`grid h-12 w-12 shrink-0 place-items-center rounded-md border-2 bg-white transition-colors ${
                isWishlisted ? "border-primary text-primary" : "border-border text-text hover:border-text"
              }`}
            >
              <Heart size={18} className={isWishlisted ? "fill-current" : ""} />
            </button>
          </div>

          <Link
            to={productUrl}
            onClick={closeQuickView}
            className="inline-flex items-center gap-1 self-start text-base font-bold text-belims-blue underline underline-offset-4 hover:text-primary"
          >
            View product details
            <ChevronRight size={16} aria-hidden />
          </Link>
        </div>
      </div>
    </div>,
    document.body,
  );
};
