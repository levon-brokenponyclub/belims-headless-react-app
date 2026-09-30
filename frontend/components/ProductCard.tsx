// ProductCard.tsx
import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Bell,
  CheckCircle,
  Zap,
  ShoppingCart,
  Eye,
  Heart,
} from "lucide-react";
import { Product } from "../types";
import { formatCurrency, isProductPurchasable } from "../utils/price";
import { buildProductUrl } from "../utils/product";
import { QuickView } from "./QuickView";
import {
  getWishlist,
  toggleWishlist,
  isInWishlist,
} from "../services/wishlistService";

interface ProductCardProps {
  product: Product;
  addToCart: (product: Product) => void;
  onNotify?: (product: Product) => Promise<void> | void;
  onBuyNow?: (product: Product) => void;
  onCompare?: (product: Product) => void;
  isAuthenticated?: boolean;
  isTradeApproved?: boolean;
  className?: string;
  showDealName?: boolean;
  variant?: "default" | "flat" | "flat-horizontal";
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
  imageBlockClassName?: string;
  imageClassName?: string;
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

export const PRODUCT_CARD_PRESETS: Record<
  "compactCard" | "searchCard" | "perfectMatchCard",
  ProductCardCustomizations
> = {
  compactCard: createProductCardCustomizations({
    imageBlockClassName: "aspect-square w-full",
  }),
  searchCard: createProductCardCustomizations({
    hiddenElements: ["category", "quickViewIcon"],
    imageBlockClassName: "aspect-square w-full",
  }),
  perfectMatchCard: createProductCardCustomizations({
    hiddenElements: ["category", "quickViewIcon"],
    imageBlockClassName: "aspect-square w-full",
  }),
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
  product,
  addToCart,
  onNotify,
  onBuyNow,
  className = "",
  variant = "default",
  customizations,
}) => {
  const isFlatHorizontal = variant === "flat-horizontal";
  const navigate = useNavigate();

  const [notifyStatus, setNotifyStatus] = useState<
    "idle" | "pending" | "sent" | "error"
  >("idle");
  const [shouldRenderQuickView, setShouldRenderQuickView] = useState(false);
  const [isQuickViewClosing, setIsQuickViewClosing] = useState(false);
  const [isQuickViewOpening, setIsQuickViewOpening] = useState(false);

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

  const handleQuickViewBuyNow = (quantity: number) => {
    if (!isProductPurchasable(product)) return;
    for (let count = 0; count < quantity; count += 1) {
      addWithPriceMode(isTradeSpecial ? "trade" : "retail");
    }
    closeQuickView();
    if (onBuyNow) {
      onBuyNow(product);
    } else {
      navigate("/checkout");
    }
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
          `group flex flex-col h-full rounded-2xl border border-border/70 bg-white p-3 sm:p-4 shadow-xs hover:shadow-md hover:border-border-strong transition-all duration-300 ${
            isFlatHorizontal ? "sm:flex-row sm:gap-4" : ""
          }`,
          className,
        ].join(" ")}
      >
        {customizations?.slots?.beforeImage?.(product)}

        {/* Image Container */}
        <div
          className={`relative aspect-square w-full rounded-xl bg-[#F8F9FA] overflow-hidden flex items-center justify-center p-3 mb-3 ${
            isFlatHorizontal ? "sm:w-48 sm:mb-0 sm:flex-shrink-0" : ""
          }`}
        >
          {/* Main Product Image Link */}
          <Link
            to={productUrl}
            className="flex h-full w-full items-center justify-center"
          >
            {product.image ? (
              <img
                src={product.image}
                alt={product.name}
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                className="max-h-full max-w-full object-contain mix-blend-multiply transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-text-tertiary">
                No image
              </div>
            )}
          </Link>

          {/* Wishlist Floating Button (shows on hover) */}
          <button
            type="button"
            onClick={handleToggleWishlist}
            className={`absolute right-2.5 top-2.5 z-10 flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur-xs text-text transition-all duration-200 hover:bg-white hover:text-red-500 ${
              isWishlisted
                ? "opacity-100 text-red-500"
                : "opacity-0 group-hover:opacity-100"
            }`}
            aria-label={
              isWishlisted ? "Remove from wishlist" : "Add to wishlist"
            }
            title={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
          >
            <Heart
              size={17}
              className={isWishlisted ? "fill-red-500 text-red-500" : ""}
            />
          </button>

          {/* Deal / Sale Badge (Top Left) */}
          {badgeLabel && !isHidden("badge") && (
            <span
              className={`absolute left-2.5 top-2.5 z-10 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-xs ${badgeClass}`}
            >
              {badgeLabel}
            </span>
          )}

          {/* Daily Deal Timer Badge if active */}
          {isDailyDeal && !isFlatHorizontal && !isHidden("dailyMarquee") && (
            <div className="absolute left-2 right-2 bottom-2 z-10 px-1 py-1 rounded bg-white/95 border border-border text-center shadow-xs backdrop-blur-xs">
              <span className="text-deal-sale font-semibold text-[11px]">
                {formatTwo(dailyTimeLeft.hours)}h {formatTwo(dailyTimeLeft.minutes)}m {formatTwo(dailyTimeLeft.seconds)}s
              </span>
            </div>
          )}
        </div>

        {customizations?.slots?.afterImage?.(product)}

        {/* Content */}
        {customizations?.slots?.beforeContent?.(product)}
        <div className="flex flex-1 flex-col justify-between">
          <div>
            {/* Category above title */}
            {!isHidden("category") && (
              <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-1 truncate">
                {displayCategory}
              </p>
            )}

            {/* Product Title */}
            <h3 className="font-heading font-semibold text-text text-sm sm:text-[15px] line-clamp-2 min-h-[38px] leading-snug hover:text-belims-blue transition-colors mb-2">
              <Link to={productUrl}>{product.name}</Link>
            </h3>
          </div>

          {/* Price Area: Dominant Price + Sale Price replacing stars */}
          <div className="mt-auto pt-1">
            <div className="flex items-center justify-between gap-2 min-h-[26px]">
              <span className="font-heading text-base sm:text-lg font-bold text-text">
                {formatMoney(displayPrice)}
              </span>

              {hasConsumerStrike && consumerCompareAt ? (
                <span className="text-xs sm:text-sm font-semibold text-text-tertiary line-through">
                  {formatMoney(consumerCompareAt)}
                </span>
              ) : isTradeSpecial && tradePrice > 0 ? (
                <span className="text-xs font-bold text-belims-accent bg-belims-accent/10 px-1.5 py-0.5 rounded">
                  Trade: {formatMoney(tradePrice)}
                </span>
              ) : null}
            </div>

            {/* Action Buttons: Add to cart + Quick View square button */}
            <div className="mt-3 flex items-center gap-2">
              {product.stock > 0 ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    addWithPriceMode(isTradeSpecial ? "trade" : "retail");
                  }}
                  className="flex flex-1 items-center justify-center gap-1.5 sm:gap-2 rounded-lg border border-border bg-white px-2.5 sm:px-3 py-2 text-xs sm:text-sm font-semibold font-heading text-text shadow-2xs transition-all duration-200 hover:bg-belims-blue hover:border-belims-blue hover:text-white"
                >
                  <ShoppingCart size={15} />
                  <span className="truncate">Add to cart</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleNotify}
                  disabled={notifyStatus === "pending" || notifyStatus === "sent"}
                  className="flex flex-1 items-center justify-center gap-1.5 sm:gap-2 rounded-lg border border-border bg-gray-50 px-2.5 sm:px-3 py-2 text-xs sm:text-sm font-semibold font-heading text-text-tertiary shadow-2xs transition-colors hover:bg-gray-100"
                >
                  {notifyStatus === "sent" ? (
                    <CheckCircle size={15} className="text-green-600" />
                  ) : (
                    <Bell size={15} />
                  )}
                  <span className="truncate">
                    {notifyStatus === "sent"
                      ? "Notified"
                      : notifyStatus === "pending"
                        ? "Setting..."
                        : "Notify me"}
                  </span>
                </button>
              )}

              {/* Quick View Button (Square) */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  openQuickView();
                }}
                className="flex h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0 items-center justify-center rounded-lg border border-border bg-white text-text shadow-2xs transition-all duration-200 hover:border-text hover:bg-surface-dark hover:text-white"
                title="Quick View"
                aria-label="Quick View"
              >
                <Eye size={17} />
              </button>
            </div>
          </div>
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
        onBuyNow={handleQuickViewBuyNow}
      />
    </>
  );
};
