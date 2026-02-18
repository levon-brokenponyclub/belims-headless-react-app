// ProductCard.tsx
import React from "react";
import { Link } from "react-router-dom";
import {
  Bell,
  CheckCircle,
  Zap,
  ChevronRight,
  ShoppingCart,
  ShoppingBasket,
  Eye,
} from "lucide-react";
import { Product } from "../types";
import { formatCurrency } from "../utils/price";

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

const HIDE_ALL_MARQUEES: ProductCardElementKey[] = [
  "dailyMarquee",
  "weeklyMarquee",
  "tradeMarquee",
  "lowStockMarquee",
];

export const PRODUCT_CARD_PRESETS: Record<
  "compactCard" | "searchCard" | "perfectMatchCard",
  ProductCardCustomizations
> = {
  compactCard: createProductCardCustomizations({
    hiddenElements: [...HIDE_ALL_MARQUEES],
    imageBlockClassName: "h-44 min-h-[220px]",
  }),
  searchCard: createProductCardCustomizations({
    hiddenElements: ["category", "quickViewIcon", ...HIDE_ALL_MARQUEES],
    imageBlockClassName: "h-40 min-h-[190px]",
  }),
  perfectMatchCard: createProductCardCustomizations({
    hiddenElements: ["category", "quickViewIcon", ...HIDE_ALL_MARQUEES],
    imageBlockClassName: "h-44 min-h-[220px]",
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

/**
 * Rules:
 * - TRADE SPECIAL: show dominant RETAIL price; show trade price + savings line; add-to-cart uses trade metadata.
 * - ALL other deal types: show compare/regular strikethrough → sale price (when there is a true difference AND show_strikethrough !== false).
 * - Badges:
 *   - Trade specials: "TRADE SPECIAL" (red)
 *   - Other deals: use ACF label logic (manual/template/auto) and badge_style.
 */
export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  addToCart,
  onNotify,
  className = "",
  showDealName = false,
  variant = "default",
  customizations,
}) => {
  const isFlat = variant === "flat" || variant === "flat-horizontal";
  const isFlatHorizontal = variant === "flat-horizontal";
  const [notifyStatus, setNotifyStatus] = React.useState<
    "idle" | "pending" | "sent" | "error"
  >("idle");
  const [shouldRenderQuickView, setShouldRenderQuickView] =
    React.useState(false);
  const [isQuickViewClosing, setIsQuickViewClosing] = React.useState(false);
  const [isQuickViewOpening, setIsQuickViewOpening] = React.useState(false);
  const [isImageHovering, setIsImageHovering] = React.useState(false);
  const hiddenElements = React.useMemo(
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
  const isLowStockUrgent = product.stock > 0 && product.stock <= 2;

  const dailyDealEndsAt = React.useMemo(() => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return end;
  }, []);
  const [dailyTimeLeft, setDailyTimeLeft] = React.useState(() =>
    getTimeLeft(dailyDealEndsAt),
  );

  React.useEffect(() => {
    if (!isDailyDeal) return;
    const timer = window.setInterval(() => {
      setDailyTimeLeft(getTimeLeft(dailyDealEndsAt));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isDailyDeal, dailyDealEndsAt]);

  // Price sources
  const retailPrice = (product.regular_price || product.price || 0) as number;
  const productPrice = (product.price || 0) as number;

  // Consumer sale price:
  // prefer consumer deal price, else product.price, else sale_price fallback.
  const consumerPrice = ((consumerDeal?.price ??
    product.price ??
    product.sale_price ??
    retailPrice) ||
    retailPrice) as number;

  // Consumer compare-at:
  // prefer consumer deal compareAtPrice, else regular_price when it is higher.
  const consumerCompareAtRaw =
    (consumerDeal?.compareAtPrice as number | undefined | null) ??
    ((product.regular_price && product.regular_price > consumerPrice
      ? product.regular_price
      : null) as number | null);

  const consumerCompareAt =
    consumerCompareAtRaw && consumerCompareAtRaw > consumerPrice
      ? consumerCompareAtRaw
      : null;

  // ACF behavior: defaults to true if undefined
  const shouldShowStrikethrough = consumerBest?.show_strikethrough !== false;

  const hasConsumerStrike =
    !isTradeSpecial &&
    Boolean(consumerCompareAt) &&
    shouldShowStrikethrough &&
    consumerPrice < (consumerCompareAt as number);

  const consumerSavings = hasConsumerStrike
    ? Math.max(0, (consumerCompareAt as number) - consumerPrice)
    : 0;

  // Trade price
  const tradePrice =
    isTradeSpecial && tradeDeal?.price ? (tradeDeal.price as number) : 0;

  const tradeSavings =
    isTradeSpecial && tradePrice > 0
      ? Math.max(0, retailPrice - tradePrice)
      : 0;

  // Display price (dominant)
  // - Trade special: dominant price is RETAIL (per your requirement)
  // - Otherwise: consumer price
  const displayPrice = isTradeSpecial ? retailPrice : consumerPrice;

  // ----------------------------
  // Badge generation
  // ----------------------------
  const activeDeal = isTradeSpecial ? tradeBest : consumerBest;

  const labelMode = (activeDeal as any)?.label_mode || "auto";
  const showBadge = (activeDeal as any)?.show_badge !== false;

  // Percent off: only meaningful for non-trade strikes
  const percentOff =
    !isTradeSpecial && consumerCompareAt && consumerCompareAt > 0
      ? Math.round(
          ((consumerCompareAt - consumerPrice) / consumerCompareAt) * 100,
        )
      : 0;

  const getBadgeLabel = (): string | undefined => {
    if (!activeDeal || !showBadge) return undefined;

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

    // auto
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
    // premium defaults: red for "sale"; keep others restrained
    if (isTradeSpecial) return "left-3 bg-belims-accent text-white";
    if (badgeStyle === "clearance") return "left-3 bg-[#DF1119] text-white";
    if (badgeStyle === "info") return "left-3 bg-[#ECF0F1] text-[#04223E]";
    if (badgeStyle === "trade") return "right-3 bg-[#ECF0F1] text-[#04223E]";
    return "left-3 bg-[#DF1119] text-white";
  })();

  const stockLevel = product.stock ?? 0;
  const stockIndicator = (() => {
    if (stockLevel <= 0) {
      return {
        text: "Out of stock",
        tone: "text-[#922c2c]",
        dot: "bg-[#922c2c]",
        light: "bg-[#f7e5e5]",
      };
    }

    if (stockLevel <= 3) {
      return {
        text: `Only ${stockLevel} left`,
        tone: "text-[#bd6b1b]",
        dot: "bg-[#bd6b1b]",
        light: "bg-[#f8e1cb]",
      };
    }

    if (stockLevel <= 10) {
      return {
        text: "Low stock",
        tone: "text-[#bd6b1b]",
        dot: "bg-[#bd6b1b]",
        light: "bg-[#f8e1cb]",
      };
    }

    return {
      text: "In stock",
      tone: "text-[#337239]",
      dot: "bg-[#337239]",
      light: "bg-[#ddf0df]",
    };
  })();

  // ----------------------------
  // Add to cart (wire price mode)
  // ----------------------------
  const addWithPriceMode = (mode: "retail" | "trade") => {
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

  const quickViewIconAction = customizations?.actions?.quickViewIcon;
  const quickViewButtonAction = customizations?.actions?.quickViewButton;
  const resolvedCategoryText =
    typeof customizations?.categoryText === "function"
      ? customizations.categoryText(product)
      : customizations?.categoryText;
  const imageBlockClassName =
    customizations?.imageBlockClassName ||
    (isFlatHorizontal ? "h-full w-[33%]" : "h-52 min-h-[260px]");

  const openQuickView = actionHelpers.openQuickView;
  const closeQuickView = actionHelpers.closeQuickView;

  React.useEffect(() => {
    if (!shouldRenderQuickView) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeQuickView();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shouldRenderQuickView]);

  return (
    <>
      <style>
        {`@keyframes deal-marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }`}
      </style>
      <div
        className={[
          `relative flex h-full overflow-hidden ${
            isFlatHorizontal ? "flex-row" : "flex-col"
          }`,
          isFlat ? "min-w-full max-w-full w-full" : "w-full min-w-0 max-w-full",
          isFlat ? "bg-white" : "rounded-lg bg-white transition-shadow",
          className,
        ].join(" ")}
        onMouseEnter={() => setIsImageHovering(true)}
        onMouseLeave={() => setIsImageHovering(false)}
      >
        {customizations?.slots?.beforeImage?.(product)}

        {/* Deal Badge */}
        {badgeLabel && !isHidden("badge") && (
          <div
            className={[
              "absolute top-3 z-10 rounded-2xl px-2.5 py-1 font-semibold uppercase",
              isFlat ? "text-[10px]" : "text-[11px]",
              badgeClass,
            ].join(" ")}
          >
            {badgeLabel}
          </div>
        )}

        {/* Image */}
        <Link
          to={`/product/${product.id}`}
          className={`relative flex items-center justify-center rounded-lg bg-grey-light overflow-hidden ${
            imageBlockClassName
          } ${isFlat && !isFlatHorizontal ? "" : !isFlatHorizontal ? "p-5" : ""}`}
        >
          {/* Quick View Icon Button - Top Right */}
          {!isHidden("quickViewIcon") && (
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                if (quickViewIconAction?.onClick) {
                  quickViewIconAction.onClick(product, actionHelpers);
                  return;
                }
                openQuickView();
              }}
              className={[
                "group absolute right-2 top-4 z-20 h-10 w-10 overflow-hidden rounded-full border border-subtle bg-white text-grey transition-all duration-300 ease-out hover:border-grey hover:bg-grey hover:text-white",
                isImageHovering
                  ? "translate-x-0 opacity-100"
                  : "translate-x-4 opacity-0",
                quickViewIconAction?.className || "",
              ].join(" ")}
              aria-label={quickViewIconAction?.ariaLabel || "Quick view"}
            >
              <span className="absolute inset-0 origin-left scale-x-0 bg-grey transition-transform duration-300 ease-out group-hover:scale-x-100" />
              <span className="relative z-10 flex items-center justify-center">
                {quickViewIconAction?.icon || <Eye size={18} strokeWidth={2} />}
              </span>
            </button>
          )}

          {product.image ? (
            <>
              {/* Image */}
              <img
                src={product.image}
                alt={product.name}
                loading="lazy"
                decoding="async"
                className={[
                  "absolute max-h-[165px] max-w-[160px] p-4 object-contain transition-transform duration-300 mix-blend-multiply",
                  isImageHovering ? "scale-90" : "scale-100",
                  customizations?.imageClassName || "",
                ].join(" ")}
              />
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center rounded bg-[#F2F2F2] text-sm text-[#565969]">
              No image
            </div>
          )}

          {isDailyDeal && !isFlatHorizontal && !isHidden("dailyMarquee") && (
            <div
              className={`absolute left-4 right-4 bottom-3 z-10 px-1 overflow-hidden rounded bg-white border border-grey-light transition-opacity duration-200 ease-out ${
                isImageHovering ? "opacity-0" : "opacity-100"
              }`}
            >
              <div className="flex items-center justify-center gap-4 py-2 pl-3 pr-4">
                {/*  <span className="text-grey-900 font-semibold text-[13px]">
                  Deal ends:
                </span> */}
                <span className="text-red-muted font-semibold text-[13px] text-center">
                  {formatTwo(dailyTimeLeft.hours)}H{" "}
                  {formatTwo(dailyTimeLeft.minutes)}M{" "}
                  {formatTwo(dailyTimeLeft.seconds)}S
                </span>
              </div>
            </div>
          )}

          {isWeeklyDeal && !isFlatHorizontal && !isHidden("weeklyMarquee") && (
            <div
              className={`absolute left-4 right-4 bottom-3 z-10 px-1 overflow-hidden rounded bg-white border border-grey-light transition-opacity duration-200 ease-out ${
                isImageHovering ? "opacity-0" : "opacity-100"
              }`}
            >
              <div
                className="flex items-center gap-4 py-2 pl-3 pr-4 whitespace-nowrap"
                style={{
                  animation: "deal-marquee 25s linear infinite",
                  width: "max-content",
                }}
              >
                {Array.from({ length: 5 }).map((_, index) => (
                  <div
                    key={`weekly-deal-${index}`}
                    className="flex items-center gap-2 text-grey font-semibold text-[13px]"
                  >
                    <Zap className="h-4 w-4 text-accent" />
                    <span>Weekly Deal</span>
                  </div>
                ))}
                {Array.from({ length: 5 }).map((_, index) => (
                  <div
                    key={`weekly-deal-dup-${index}`}
                    className="flex items-center gap-2 text-grey font-semibold text-[13px]"
                  >
                    <Zap className="h-4 w-4 text-accent" />
                    <span>Weekly Deal</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isTradeSpecial &&
            tradePrice > 0 &&
            !isFlatHorizontal &&
            !isHidden("tradeMarquee") && (
              <div
                className={`absolute left-4 right-4 bottom-3 z-10 px-1 overflow-hidden rounded-md bg-white border border-grey-light transition-opacity duration-200 ease-out ${
                  isImageHovering ? "opacity-0" : "opacity-100"
                }`}
              >
                <div className="flex items-center justify-between gap-3 px-1.5 py-2">
                  <span className="text-[13px] font-semibold text-belims-accent">
                    Trade price available
                  </span>
                  {/* <span className="text-[13px] font-bold text-belims-accent">
                  {formatMoney(tradePrice)}
                </span> */}
                </div>
              </div>
            )}

          {isLowStockUrgent &&
            !isFlatHorizontal &&
            !isDailyDeal &&
            !isWeeklyDeal &&
            !(isTradeSpecial && tradePrice > 0) &&
            !isHidden("lowStockMarquee") && (
              <div
                className={`absolute left-4 right-4 bottom-3 z-10 px-1 overflow-hidden rounded bg-white border border-grey-light transition-opacity duration-200 ease-out ${
                  isImageHovering ? "opacity-0" : "opacity-100"
                }`}
              >
                <div
                  className="flex items-center gap-4 py-2 pl-3 pr-4 whitespace-nowrap"
                  style={{
                    animation: "deal-marquee 35s linear infinite",
                    width: "max-content",
                  }}
                >
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div
                      key={`low-stock-${index}`}
                      className="flex items-center gap-2 text-grey font-semibold text-[13px]"
                    >
                      <Zap className="h-4 w-4 text-accent" />
                      <span>Low stock. Order soon</span>
                    </div>
                  ))}
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div
                      key={`low-stock-dup-${index}`}
                      className="flex items-center gap-2 text-grey font-semibold text-[13px]"
                    >
                      <Zap className="h-4 w-4 text-accent" />
                      <span>Low stock. Order soon</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* Quick View Button - Animated Reveal */}
          {!isHidden("quickViewButton") && (
            <div
              className={`absolute bottom-3 left-0 right-0 flex justify-center transition-all duration-500 ease-in-out z-50 transform ${
                isImageHovering
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-7"
              }`}
            >
              <button
                aria-controls={quickViewId}
                aria-haspopup="dialog"
                type="button"
                className={
                  quickViewButtonAction?.className ||
                  "group absolute left-4 right-4 bottom-0 flex h-11 items-center justify-center overflow-hidden rounded-full border border-grey-light bg-white px-1 py-2 text-base font-bold text-grey transition-colors hover:border-grey hover:text-white"
                }
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  if (quickViewButtonAction?.onClick) {
                    quickViewButtonAction.onClick(product, actionHelpers);
                    return;
                  }
                  openQuickView();
                }}
              >
                <span className="absolute inset-0 origin-left scale-x-0 bg-grey transition-transform duration-300 ease-out group-hover:scale-x-100"></span>

                <span className="relative z-10 flex items-center gap-3">
                  {quickViewButtonAction?.icon && (
                    <span className="inline-flex items-center justify-center">
                      {quickViewButtonAction.icon}
                    </span>
                  )}
                  <span className="font-heading font-semibold transition-colors group-hover:text-white">
                    {quickViewButtonAction?.label || "Add to cart"}
                  </span>
                </span>
              </button>
            </div>
          )}
        </Link>

        {customizations?.slots?.afterImage?.(product)}

        {/* Content */}
        {customizations?.slots?.beforeContent?.(product)}
        <div
          className={`flex flex-1 flex-col ${
            isFlat ? "" : "py-5 pb-0 px-1"
          } ${isFlatHorizontal ? "px-4 pr-0" : ""}`}
        >
          {/* Category / Deal Name */}
          {!isFlat && !isHidden("category") && (
            <div className="mb-2 text-[11px] uppercase text-grey-medium font-semibold">
              {resolvedCategoryText ||
                (showDealName && consumerBest?.deal_name
                  ? consumerBest.deal_name
                  : product.category)}
            </div>
          )}

          {/* Title - Fixed height for 2 lines */}
          <Link
            to={`/product/${product.id}`}
            className={`mb-0 mt-0 line-clamp-2 font-heading font-semibold leading-[1.35] text-grey min-h-[35px] ${
              isFlat ? "text-[15px] min-h-[10px] mt-1" : "text-base"
            }`}
          >
            {product.name}
          </Link>

          {/* <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase text-[#565969]">
            <span
              className={`flex h-4 w-4 items-center justify-center rounded-full ${stockIndicator.light}`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${stockIndicator.dot}`}
              />
            </span>
            <span className={stockIndicator.tone}>{stockIndicator.text}</span>
          </div> */}

          {/* SKU */}
          {/* <div className="mb-4 text-[11px] font-semibold uppercase text-[#565969]">
            {product.sku || product.id}
          </div> */}

          {/* Price Block */}
          {isFlat ? (
            <div className="mt-auto py-2">
              {isTradeSpecial && tradePrice > 0 ? (
                isFlatHorizontal ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-left">
                      <span className="font-heading text-base font-bold text-belims-accent bg-belims-accent/10 inline-block rounded px-2 py-1">
                        {formatMoney(tradePrice)}
                      </span>
                    </div>
                    <div className="text-right flex flex-col justify-between">
                      <span className="font-heading text-[13] font-semibold text-[#9b9b9b] line-through">
                        {formatMoney(retailPrice)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <span className="text-[12px] font-semibold text-[#9b9b9b] line-through">
                      {formatMoney(retailPrice)}
                    </span>
                    <span className="font-heading text-[16px] font-bold text-belims-accent bg-belims-accent/10 inline-block rounded px-2 py-1">
                      {formatMoney(tradePrice)}
                    </span>
                  </div>
                )
              ) : (
                <span className="font-heading text-base font-bold text-grey">
                  {formatMoney(displayPrice)}
                </span>
              )}
            </div>
          ) : (
            <div className="mt-auto py-1 pb-3">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-2">
                {/* Dominant price */}
                <span className="font-heading text-base font-bold text-red-muted">
                  {formatMoney(displayPrice)}
                </span>

                {/* Non-trade deals: compare → sale */}
                {hasConsumerStrike && (
                  <span className="text-[14px] font-light text-grey-medium line-through">
                    {formatMoney(consumerCompareAt as number)}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* CTA */}
          {/* {product.stock > 0 ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                addWithPriceMode(isTradeSpecial ? "trade" : "retail");
              }}
              className={`mt-0 w-full rounded bg-[#04223E] font-heading text-sm font-semibold text-white transition-colors ${
                isTradeSpecial
                  ? "hover:bg-belims-accent"
                  : "hover:bg-[rgb(50_39_131_/_var(--tw-bg-opacity,1))]"
              } ${isFlat ? "h-9" : "h-11"}`}
            >
              Add to cart
            </button>
          ) : (
            <button
              onClick={handleNotify}
              disabled={notifyStatus === "pending" || notifyStatus === "sent"}
              className={[
                `mt-0 ${isFlat ? "h-9" : "h-11"} w-full rounded font-heading text-sm font-semibold`,
                "flex items-center justify-center gap-2 transition-colors",
                notifyStatus === "sent"
                  ? "bg-green-50 text-green-800 border border-green-200"
                  : notifyStatus === "error"
                    ? "bg-red-50 text-red-700 border border-red-200"
                    : "bg-[#04223E] text-white hover:bg-red-600",
                notifyStatus === "pending" ? "opacity-70 cursor-wait" : "",
              ].join(" ")}
            >
              {notifyStatus === "sent" ? (
                <CheckCircle size={16} />
              ) : (
                <Bell size={16} />
              )}
              {notifyStatus === "sent"
                ? "Notification set"
                : notifyStatus === "pending"
                  ? "Setting reminder…"
                  : notifyStatus === "error"
                    ? "Try again"
                    : "Notify me"}
            </button>
          )} */}
        </div>
        {customizations?.slots?.afterContent?.(product)}
      </div>

      {shouldRenderQuickView && (
        <div className="fixed inset-0 z-[700] flex items-end md:items-center justify-center p-0 md:p-4">
          <div
            className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              isQuickViewOpening || isQuickViewClosing
                ? "opacity-0"
                : "opacity-100"
            }`}
            onClick={closeQuickView}
          />
          <div
            id={quickViewId}
            role="dialog"
            aria-modal="true"
            className={`relative z-[1] w-full md:max-w-3xl rounded-t-2xl md:rounded-block bg-surface shadow-pop border border-subtle max-h-[85vh] md:max-h-[90vh] overflow-y-auto transform transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              isQuickViewOpening || isQuickViewClosing
                ? "translate-y-full"
                : "translate-y-0"
            } md:translate-y-0`}
          >
            <button
              type="button"
              onClick={closeQuickView}
              className="absolute right-4 top-4 text-muted hover:text-ink"
              aria-label="Close quick view"
            >
              <span className="text-xl">X</span>
            </button>

            <div className="grid gap-6 p-6 md:grid-cols-[1.1fr_1fr]">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-center rounded-block bg-grey-light p-4">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      loading="lazy"
                      decoding="async"
                      className="max-h-[360px] w-full object-contain"
                    />
                  ) : (
                    <div className="flex h-[260px] w-full items-center justify-center rounded bg-soft text-sm text-muted">
                      No image
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col">
                <div className="text-[11px] font-semibold uppercase text-muted">
                  {product.category} | {product.sku || product.id}
                </div>
                <div className="mt-2 text-xl font-bold text-ink font-heading">
                  {product.name}
                </div>
                <div className="mt-3 text-2xl font-bold text-ink">
                  {formatMoney(displayPrice)}
                </div>

                {/* <div className="mt-6">
                  {product.stock > 0 ? (
                    <button
                      onClick={() =>
                        addWithPriceMode(isTradeSpecial ? "trade" : "retail")
                      }
                      className="w-full rounded-pill bg-brand text-white font-bold text-sm h-12 hover:bg-ink transition-colors"
                    >
                      Add to cart
                    </button>
                  ) : (
                    <button
                      onClick={handleNotify}
                      disabled={
                        notifyStatus === "pending" || notifyStatus === "sent"
                      }
                      className={[
                        "w-full rounded-pill text-sm font-bold h-12",
                        "flex items-center justify-center gap-2 transition-colors",
                        notifyStatus === "sent"
                          ? "bg-green-50 text-green-800 border border-green-200"
                          : notifyStatus === "error"
                            ? "bg-red-50 text-red-700 border border-red-200"
                            : "bg-brand text-white hover:bg-ink",
                        notifyStatus === "pending"
                          ? "opacity-70 cursor-wait"
                          : "",
                      ].join(" ")}
                    >
                      {notifyStatus === "sent" ? (
                        <CheckCircle size={16} />
                      ) : (
                        <Bell size={16} />
                      )}
                      {notifyStatus === "sent"
                        ? "Notification set"
                        : notifyStatus === "pending"
                          ? "Setting reminder…"
                          : notifyStatus === "error"
                            ? "Try again"
                            : "Notify me"}
                    </button>
                  )}
                </div> */}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
