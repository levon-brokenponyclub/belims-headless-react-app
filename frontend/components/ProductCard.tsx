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
import { CARD_IMAGE_SIZES, CARD_IMAGE_WIDTHS, cmsImage, cmsSrcSet } from "../utils/image";
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
  /** Named card treatments keep archive and product-page rail styling scoped to their consumers. */
  appearance?: "industrial" | "archive";
}

export const createProductCardCustomizations = (
  customizations: ProductCardCustomizations,
) => customizations;

export const PRODUCT_CARD_PRESETS: Record<
  "compactCard" | "archiveCard" | "railCard" | "searchCard" | "perfectMatchCard",
  ProductCardCustomizations
> = {
  compactCard: createProductCardCustomizations({
    imageBlockClassName: "aspect-square w-full",
  }),
  archiveCard: createProductCardCustomizations({
    appearance: "archive",
    categoryText: (product) => product.brand || product.category || "",
  }),
  railCard: createProductCardCustomizations({
    appearance: "industrial",
    categoryText: (product) => product.brand || product.category || "",
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
  const isArchive = customizations?.appearance === "archive";
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
  const isIndustrial = customizations?.appearance === "industrial";
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
          `group flex flex-col h-full ${
            isIndustrial
              ? "rounded-md border-2 border-border bg-white p-3 transition-colors hover:border-belims-blue"
              : isArchive
                ? "rounded-md border border-border bg-white transition-colors hover:border-border-strong"
              : "rounded-2xl border border-border/70 bg-white p-3 sm:p-4 shadow-xs hover:shadow-md hover:border-border-strong transition-all duration-300"
          } ${
            isFlatHorizontal ? "sm:flex-row sm:gap-4" : ""
          }`,
          className,
        ].join(" ")}
      >
        {customizations?.slots?.beforeImage?.(product)}

        {/* Image Container */}
        <div
          className={`relative aspect-square w-full ${isIndustrial || isArchive ? "bg-white" : "rounded-xl bg-[#F8F9FA]"} overflow-hidden flex items-center justify-center ${isArchive ? "p-3" : "p-3 mb-3"} ${
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
              <div className="flex h-full w-full items-center justify-center text-xs text-text-tertiary">
                No image
              </div>
            )}
          </Link>

          {/* Wishlist stays available on touch and pointer layouts. */}
          <button
            type="button"
            onClick={handleToggleWishlist}
            className={`absolute right-2.5 top-2.5 z-10 flex h-9 w-9 items-center justify-center rounded-sm border border-border bg-white text-text transition-colors hover:border-primary hover:text-red-500 ${
              isWishlisted
                ? "text-red-500"
                : ""
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

          {isArchive && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                openQuickView();
              }}
              className="absolute right-2.5 top-[3.25rem] z-10 grid h-9 w-9 place-items-center rounded-sm border border-border bg-white text-text transition-colors hover:border-primary hover:text-primary"
              title="Quick view"
              aria-label={`Quick view ${product.name}`}
            >
              <Eye size={17} />
            </button>
          )}

          {/* Deal / Sale Badge (Top Left) */}
          {badgeLabel && !isHidden("badge") && (
          <span
              className={`absolute left-2.5 top-2.5 z-10 rounded-sm px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${badgeClass}`}
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
        <div className={`flex flex-1 flex-col justify-between ${isArchive ? "px-3.5 pb-3.5 pt-1" : ""}`}>
          <div>
            {/* Category above title */}
            {!isHidden("category") && (
              <p className={`${isIndustrial ? "text-caption" : isArchive ? "text-[11px]" : "text-[11px] sm:text-xs"} font-semibold uppercase tracking-wider text-text-tertiary mb-1 truncate`}>
                {displayCategory}
              </p>
            )}

            {/* Product Title */}
            <h3 className={`font-heading font-semibold text-text ${isArchive ? "text-sm min-h-[2.7em]" : "text-sm sm:text-[15px] min-h-[38px]"} line-clamp-2 leading-snug hover:text-belims-blue transition-colors mb-1`}>
              <Link to={productUrl}>{product.name}</Link>
            </h3>
            {(isIndustrial || isArchive) && (
              <p className={`mb-1 flex items-center gap-1.5 text-sm font-semibold ${
                product.stock <= 0 ? "text-stock-out" : product.stock <= (isArchive ? 5 : 3) ? "text-stock-low" : "text-stock-ok"
              }`}>
                <span className="h-2 w-2 rounded-full bg-current" aria-hidden="true" />
                {product.stock <= 0 ? "Out of stock" : product.stock <= 3 ? `Only ${product.stock} left` : "In stock"}
              </p>
            )}
          </div>

          {/* Price Area: Dominant Price + Sale Price replacing stars */}
          <div className="mt-auto pt-1">
            <div className={`flex items-center gap-2 min-h-[26px] ${isArchive ? "justify-start" : "justify-between"}`}>
              <span className={`font-heading text-lg font-extrabold ${hasConsumerStrike ? "text-primary" : "text-text"}`}>
                {formatMoney(displayPrice)}
              </span>

              {hasConsumerStrike && consumerCompareAt ? (
                <span className="text-[13px] font-normal text-text-tertiary line-through">
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
                  className={
                    isIndustrial
                      ? "flex h-10 flex-1 items-center justify-center rounded-md bg-belims-blue px-3 font-heading font-condensed text-button font-bold uppercase text-white transition-colors hover:bg-primary"
                      : isArchive
                        ? "flex h-11 flex-1 items-center justify-center rounded-sm bg-secondary px-3 font-heading text-sm font-bold text-white transition-colors hover:bg-primary"
                      : "flex flex-1 items-center justify-center gap-1.5 sm:gap-2 rounded-lg border border-border bg-white px-2.5 sm:px-3 py-2 text-xs sm:text-sm font-semibold font-heading text-text shadow-2xs transition-all duration-200 hover:bg-belims-blue hover:border-belims-blue hover:text-white"
                  }
                >
                  {!isIndustrial && <ShoppingCart size={15} />}
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
              {!isIndustrial && !isArchive && <button
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
              </button>}
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
