// ProductCard.tsx
import React, { useState, useEffect, useMemo, useRef } from "react";
import { useLiveStock } from "../utils/liveStock";
import { Link } from "react-router-dom";
import {
  Bell,
  CheckCircle,
  Eye,
  Heart,
} from "lucide-react";
import { Product } from "../types";
import { formatCurrency, isProductPurchasable } from "../utils/price";
import { buildProductUrl } from "../utils/product";
import { CARD_IMAGE_SIZES, CARD_IMAGE_WIDTHS, cmsImage, cmsSrcSet } from "../utils/image";
import { QuickView } from "./QuickView";
import { Spinner } from "./Spinner";
import {
  getWishlist,
  toggleWishlist,
  isInWishlist,
} from "../services/wishlistService";

interface ProductCardProps {
  product: Product;
  addToCart: (product: Product) => void;
  onNotify?: (product: Product) => Promise<void> | void;
  /** No longer used by the card (quick view dropped Buy now); kept so existing callers compile. */
  onBuyNow?: (product: Product) => void;
  onCompare?: (product: Product) => void;
  isAuthenticated?: boolean;
  isTradeApproved?: boolean;
  className?: string;
  showDealName?: boolean;
  customizations?: ProductCardCustomizations;
}

export type ProductCardElementKey =
  | "badge"
  | "category"
  | "brand"
  | "quickViewIcon"
  | "quickViewButton"
  | "dailyMarquee"
  | "weeklyMarquee"
  | "tradeMarquee"
  | "lowStockMarquee";

export interface ProductCardActionHelpers {
  openQuickView: () => void;
  closeQuickView: () => void;
  addWithPriceMode: (mode: "retail" | "trade") => void;
  handleNotify: (e?: React.MouseEvent) => Promise<void>;
}

export interface ProductCardActionOverride {
  label?: string;
  icon?: React.ReactNode;
  className?: string;
  ariaLabel?: string;
  onClick?: (product: Product, helpers: ProductCardActionHelpers) => void;
}

export interface ProductCardSlots {
  beforeImage?: (product: Product) => React.ReactNode;
  afterImage?: (product: Product) => React.ReactNode;
  beforeContent?: (product: Product) => React.ReactNode;
  afterContent?: (product: Product) => React.ReactNode;
}

export interface ProductCardCustomizations {
  hiddenElements?: ProductCardElementKey[];
  categoryText?: string | ((product: Product) => string);
  actions?: {
    quickViewIcon?: ProductCardActionOverride;
    quickViewButton?: ProductCardActionOverride;
  };
  slots?: ProductCardSlots;
}

export const createProductCardCustomizations = (
  customizations: ProductCardCustomizations,
) => customizations;

const brandOrCategory = (product: Product) => product.brand || product.category || "";

// One card look everywhere; presets only choose which elements show.
const ADD_TO_CART_SPINNER_MS = 450;

export const PRODUCT_CARD_PRESETS: Record<
  "compactCard" | "archiveCard" | "railCard" | "searchCard" | "perfectMatchCard",
  ProductCardCustomizations
> = {
  compactCard: createProductCardCustomizations({}),
  archiveCard: createProductCardCustomizations({ categoryText: brandOrCategory }),
  railCard: createProductCardCustomizations({ categoryText: brandOrCategory }),
  searchCard: createProductCardCustomizations({ hiddenElements: ["category"] }),
  perfectMatchCard: createProductCardCustomizations({ hiddenElements: ["category"] }),
};

const formatMoney = (value: number) => formatCurrency(value);
const formatTwo = (value: number) => value.toString().padStart(2, "0");

const getTimeLeft = (target: Date) => {
  const diff = target.getTime() - new Date().getTime();
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / 1000 / 60) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
};

export const ProductCard: React.FC<ProductCardProps> = ({
  product: productProp,
  addToCart,
  onNotify,
  className = "",
  customizations,
}) => {
  // Stock reflects cart holds made since this product was fetched.
  const product = useLiveStock(productProp);

  const [notifyStatus, setNotifyStatus] = useState<
    "idle" | "pending" | "sent" | "error"
  >("idle");
  const [shouldRenderQuickView, setShouldRenderQuickView] = useState(false);
  const [isQuickViewClosing, setIsQuickViewClosing] = useState(false);
  const [isQuickViewOpening, setIsQuickViewOpening] = useState(false);

  // Same minimum "Adding..." state as the SingleProduct button.
  const [isAdding, setIsAdding] = useState(false);
  const addingTimerRef = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (addingTimerRef.current) window.clearTimeout(addingTimerRef.current);
    },
    [],
  );

  // Wishlist state tracking
  const [isWishlisted, setIsWishlisted] = useState<boolean>(() =>
    isInWishlist(Number(product.id)),
  );

  useEffect(() => {
    const handleWishlistChange = () => {
      setIsWishlisted(isInWishlist(Number(product.id)));
    };
    window.addEventListener("belims:wishlist-updated", handleWishlistChange);
    return () => {
      window.removeEventListener("belims:wishlist-updated", handleWishlistChange);
    };
  }, [product.id]);

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const updated = toggleWishlist({
      id: Number(product.id),
      name: product.name,
      sku: product.sku || "",
      price: product.price,
      image: product.image || "",
      slug: product.slug || "",
      brand: product.brand,
      category: product.category,
    });
    setIsWishlisted(updated);
  };

  const hiddenElements = useMemo(
    () => new Set(customizations?.hiddenElements || []),
    [customizations?.hiddenElements],
  );
  const isHidden = (key: ProductCardElementKey) => hiddenElements.has(key);

  const handleNotify = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (notifyStatus !== "idle") return;

    try {
      setNotifyStatus("pending");
      if (onNotify) await onNotify(product);
      setNotifyStatus("sent");
    } catch {
      setNotifyStatus("error");
    }
  };

  // ----------------------------
  // Deal resolution
  // ----------------------------
  const tradeDeal = product.deals_resolved?.trade;
  const tradeBest = tradeDeal?.bestDeal;
  const isTradeSpecial = tradeBest?.type === "trade_special";

  const consumerDeal = product.deals_resolved?.consumer;
  const consumerBest = consumerDeal?.bestDeal;
  const isDailyDeal = consumerBest?.type === "deal_of_day";
  const isWeeklyDeal = consumerBest?.type === "weekly_special";

  const dailyDealEndsAt = useMemo(() => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return end;
  }, []);
  const [dailyTimeLeft, setDailyTimeLeft] = useState(() =>
    getTimeLeft(dailyDealEndsAt),
  );

  useEffect(() => {
    if (!isDailyDeal) return;
    const timer = window.setInterval(() => {
      setDailyTimeLeft(getTimeLeft(dailyDealEndsAt));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isDailyDeal, dailyDealEndsAt]);

  // Price sources
  const retailPrice = (product.regular_price || product.price || 0) as number;

  const consumerPrice = ((consumerDeal?.price ??
    product.price ??
    product.sale_price ??
    retailPrice) ||
    retailPrice) as number;

  const consumerCompareAtRaw =
    (consumerDeal?.compareAtPrice as number | undefined | null) ??
    ((product.regular_price && product.regular_price > consumerPrice
      ? product.regular_price
      : null) as number | null);

  const consumerCompareAt =
    consumerCompareAtRaw && consumerCompareAtRaw > consumerPrice
      ? consumerCompareAtRaw
      : null;

  const shouldShowStrikethrough = consumerBest?.show_strikethrough !== false;

  const hasConsumerStrike =
    !isTradeSpecial &&
    Boolean(consumerCompareAt) &&
    shouldShowStrikethrough &&
    consumerPrice < (consumerCompareAt as number);

  const consumerSavings = hasConsumerStrike
    ? Math.max(0, (consumerCompareAt as number) - consumerPrice)
    : 0;

  const tradePrice =
    isTradeSpecial && tradeDeal?.price ? (tradeDeal.price as number) : 0;

  const tradeSavings =
    isTradeSpecial && tradePrice > 0
      ? Math.max(0, retailPrice - tradePrice)
      : 0;

  const displayPrice = isTradeSpecial ? retailPrice : consumerPrice;

  // Badge generation
  const activeDeal = isTradeSpecial ? tradeBest : consumerBest;
  const labelMode = (activeDeal as any)?.label_mode || "auto";
  const showBadge = (activeDeal as any)?.show_badge !== false;

  const percentOff =
    !isTradeSpecial && consumerCompareAt && consumerCompareAt > 0
      ? Math.round(
          ((consumerCompareAt - consumerPrice) / consumerCompareAt) * 100,
        )
      : 0;

  const getBadgeLabel = (): string | undefined => {
    if (!activeDeal || !showBadge) {
      if (product.sale_price && product.regular_price && product.regular_price > product.sale_price) {
        return "SALE";
      }
      return undefined;
    }

    if (labelMode === "manual") {
      return (
        (activeDeal as any)?.label_text ||
        (isTradeSpecial ? tradeDeal?.label : consumerDeal?.label) ||
        undefined
      );
    }

    if (labelMode === "template") {
      const tpl = (activeDeal as any)?.label_template as string | undefined;
      if (!tpl) return undefined;

      const dealName = (activeDeal as any)?.deal_name || "";
      const amount = isTradeSpecial
        ? formatMoney(tradeSavings)
        : formatMoney(consumerSavings);
      const pct = isTradeSpecial
        ? retailPrice > 0
          ? Math.round(((retailPrice - tradePrice) / retailPrice) * 100)
          : 0
        : percentOff;

      return tpl
        .replace("{deal_name}", dealName)
        .replace("{amount}", amount)
        .replace("{percent_off}", String(pct));
    }

    const type = (activeDeal as any)?.type;
    if (isTradeSpecial) return "TRADE SPECIAL";
    if (type === "clearance") return "CLEARANCE";
    if (percentOff > 0) return `${percentOff}% OFF`;
    if (consumerDeal?.label) return consumerDeal.label;
    return "SALE";
  };

  const badgeLabel = getBadgeLabel();
  const badgeStyle = ((activeDeal as any)?.badge_style ||
    consumerDeal?.badgeStyle ||
    "sale") as "sale" | "clearance" | "info" | "trade" | string;

  const badgeClass = (() => {
    if (isTradeSpecial) return "bg-belims-accent text-white";
    if (badgeStyle === "clearance") return "bg-[#DF1119] text-white";
    if (badgeStyle === "info") return "bg-[#ECF0F1] text-[#04223E]";
    if (badgeStyle === "trade") return "bg-[#ECF0F1] text-[#04223E]";
    return "bg-deal-sale text-white";
  })();

  const addWithPriceMode = (mode: "retail" | "trade") => {
    if (!isProductPurchasable(product)) return;

    const p = { ...product };
    if (mode === "trade" && isTradeSpecial && tradeBest?.deal_id) {
      p.cartMetadata = {
        priceMode: "trade",
        dealId: tradeBest.deal_id,
      };
    } else {
      p.cartMetadata = undefined;
    }

    addToCart(p);
  };

  const handleAddToCartClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isAdding) return;
    setIsAdding(true);
    addWithPriceMode(isTradeSpecial ? "trade" : "retail");
    addingTimerRef.current = window.setTimeout(() => setIsAdding(false), ADD_TO_CART_SPINNER_MS);
  };

  const quickViewId = `QuickView-${product.id}`;

  const actionHelpers: ProductCardActionHelpers = {
    openQuickView: () => {
      setShouldRenderQuickView(true);
      setIsQuickViewClosing(false);
      setIsQuickViewOpening(true);
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setIsQuickViewOpening(false));
      });
    },
    closeQuickView: () => {
      setIsQuickViewClosing(true);
      window.setTimeout(() => {
        setShouldRenderQuickView(false);
        setIsQuickViewClosing(false);
        setIsQuickViewOpening(false);
      }, 300);
    },
    addWithPriceMode,
    handleNotify,
  };

  const openQuickView = actionHelpers.openQuickView;
  const closeQuickView = actionHelpers.closeQuickView;

  const handleQuickViewAddToCart = (quantity: number) => {
    if (!isProductPurchasable(product)) return;
    for (let count = 0; count < quantity; count += 1) {
      addWithPriceMode(isTradeSpecial ? "trade" : "retail");
    }
    closeQuickView();
  };

  useEffect(() => {
    if (!shouldRenderQuickView) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeQuickView();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shouldRenderQuickView]);

  const productUrl = buildProductUrl(product);
  const displayCategory =
    (typeof customizations?.categoryText === "function"
      ? customizations.categoryText(product)
      : customizations?.categoryText) ||
    product.category ||
    product.brand ||
    "Hardware";

  return (
    <>
      <article
        className={[
          "group flex h-full flex-col overflow-hidden rounded-md border-2 border-border bg-white transition-colors hover:border-text",
          className,
        ].join(" ")}
      >
        {customizations?.slots?.beforeImage?.(product)}

        {/* Image block: grey tile inset 12px, as in the home mockup */}
        <div className="relative aspect-square w-full">
          <Link
            to={productUrl}
            className="absolute inset-3 flex items-center justify-center overflow-hidden rounded-sm bg-surface-muted p-3"
          >
            {product.image ? (
              <img
                src={cmsImage(product.image, 480)}
                srcSet={cmsSrcSet(product.image, CARD_IMAGE_WIDTHS)}
                sizes={CARD_IMAGE_SIZES}
                alt={product.name}
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                className="max-h-full max-w-full object-contain mix-blend-multiply transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <span className="text-xs text-text-tertiary">No image</span>
            )}
          </Link>

          {badgeLabel && !isHidden("badge") && (
            <span
              className={`absolute left-5 top-5 z-10 rounded-sm px-2 py-1 text-sm font-bold uppercase tracking-wide ${badgeClass}`}
            >
              {badgeLabel}
            </span>
          )}

          {/* Wishlist and quick view stay available on touch and pointer layouts. */}
          <div className="absolute right-5 top-5 z-10 flex flex-col gap-2">
            <button
              type="button"
              onClick={handleToggleWishlist}
              className={`flex h-10 w-10 items-center justify-center rounded-md border-2 border-border bg-white transition-colors hover:border-primary hover:text-red-500 ${
                isWishlisted ? "text-red-500" : "text-text"
              }`}
              aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
              title={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
            >
              <Heart size={17} className={isWishlisted ? "fill-red-500 text-red-500" : ""} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                openQuickView();
              }}
              className="grid h-10 w-10 place-items-center rounded-md border-2 border-border bg-white text-text transition-colors hover:border-primary hover:text-primary"
              title="Quick view"
              aria-label={`Quick view ${product.name}`}
            >
              <Eye size={17} />
            </button>
          </div>

          {isDailyDeal && !isHidden("dailyMarquee") && (
            <div className="absolute inset-x-5 bottom-5 z-10 rounded-sm border border-border bg-white/95 px-1 py-1 text-center">
              <span className="text-xs font-semibold text-deal-sale">
                {formatTwo(dailyTimeLeft.hours)}h {formatTwo(dailyTimeLeft.minutes)}m {formatTwo(dailyTimeLeft.seconds)}s
              </span>
            </div>
          )}
        </div>

        {customizations?.slots?.afterImage?.(product)}

        {customizations?.slots?.beforeContent?.(product)}
        <div className="flex flex-1 flex-col gap-1.5 px-3.5 pb-3.5 pt-1">
          {!isHidden("category") && (
            <p className="truncate text-sm font-bold uppercase tracking-wider text-text-tertiary">
              {displayCategory}
            </p>
          )}

          <h3 className="line-clamp-2 min-h-[2.7em] font-heading text-base font-semibold leading-snug text-text transition-colors hover:text-belims-blue">
            <Link to={productUrl}>{product.name}</Link>
          </h3>

          <p
            className={`flex items-center gap-1.5 text-caption font-semibold ${
              product.stock <= 0 ? "text-stock-out" : product.stock <= 3 ? "text-stock-low" : "text-stock-ok"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-current" aria-hidden="true" />
            {product.stock <= 0 ? "Out of stock" : product.stock <= 3 ? `Only ${product.stock} left` : "In stock"}
          </p>

          <div className="mt-auto flex flex-wrap items-baseline gap-x-2 gap-y-1 pt-1">
            <span className={`font-heading text-xl font-extrabold ${hasConsumerStrike ? "text-primary" : "text-text"}`}>
              {formatMoney(displayPrice)}
            </span>
            {hasConsumerStrike && consumerCompareAt ? (
              <span className="text-caption text-deal-strike line-through">{formatMoney(consumerCompareAt)}</span>
            ) : isTradeSpecial && tradePrice > 0 ? (
              <span className="rounded bg-belims-accent/10 px-1.5 py-0.5 text-xs font-bold text-belims-accent">
                Trade: {formatMoney(tradePrice)}
              </span>
            ) : null}
          </div>

          {product.stock > 0 ? (
            <button
              type="button"
              onClick={handleAddToCartClick}
              disabled={isAdding}
              className="mt-2 flex h-10 w-full items-center justify-center rounded-md bg-primary px-3 font-heading font-condensed text-button font-bold uppercase tracking-wide text-white transition-colors hover:bg-belims-blue disabled:opacity-50"
            >
              <span className="flex items-center justify-center gap-2 [&>[data-icon=inline-start]]:-ml-0.5">
                {isAdding ? (
                  <>
                    <Spinner data-icon="inline-start" />
                    Adding...
                  </>
                ) : (
                  "Add to cart"
                )}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNotify}
              disabled={notifyStatus === "pending" || notifyStatus === "sent"}
              className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-md border-2 border-border-strong bg-white px-3 font-heading font-condensed text-button font-bold uppercase tracking-wide text-text-secondary transition-colors hover:bg-surface-muted"
            >
              {notifyStatus === "sent" ? <CheckCircle size={15} className="text-green-600" /> : <Bell size={15} />}
              <span className="truncate">
                {notifyStatus === "sent" ? "Notified" : notifyStatus === "pending" ? "Setting..." : "Notify me"}
              </span>
            </button>
          )}
        </div>

        {customizations?.slots?.afterContent?.(product)}
      </article>

      {/* Quick View Modal */}
      <QuickView
        product={product}
        quickViewId={quickViewId}
        shouldRender={shouldRenderQuickView}
        isQuickViewOpening={isQuickViewOpening}
        isQuickViewClosing={isQuickViewClosing}
        closeQuickView={closeQuickView}
        displayPrice={displayPrice}
        onAddToCart={handleQuickViewAddToCart}
        isWishlisted={isWishlisted}
        onToggleWishlist={handleToggleWishlist}
      />
    </>
  );
};
