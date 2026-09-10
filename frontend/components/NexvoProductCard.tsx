import React from "react";
import { Link } from "react-router-dom";
import { Bell, CheckCircle, Eye, Zap, ShoppingBag } from "lucide-react";
import { Product } from "../types";
import { formatCurrency } from "../utils/price";
import { QuickView } from "./QuickView";

interface NexvoProductCardProps {
  product: Product;
  addToCart: (product: Product) => void;
  onNotify?: (product: Product) => Promise<void> | void;
  onBuyNow?: (product: Product) => void;
  onCompare?: (product: Product) => void;
  isAuthenticated?: boolean;
  isTradeApproved?: boolean;
  className?: string;
}

const formatMoney = (value: number) => formatCurrency(value);
const formatTwo = (value: number) => value.toString().padStart(2, "0");

const getTimeLeft = (target: Date) => {
  const diff = target.getTime() - new Date().getTime();
  if (diff <= 0) return { hours: 0, minutes: 0, seconds: 0 };
  return {
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / 1000 / 60) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
};

export const NexvoProductCard: React.FC<NexvoProductCardProps> = ({
  product,
  addToCart,
  onNotify,
  onBuyNow,
  className = "",
}) => {
  const [notifyStatus, setNotifyStatus] = React.useState<
    "idle" | "pending" | "sent" | "error"
  >("idle");
  const [shouldRenderQuickView, setShouldRenderQuickView] = React.useState(false);
  const [isQuickViewClosing, setIsQuickViewClosing] = React.useState(false);
  const [isQuickViewOpening, setIsQuickViewOpening] = React.useState(false);

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

  // ── Deal resolution ──────────────────────────────────────────────────
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

  // ── Prices ──────────────────────────────────────────────────────────
  const retailPrice = (product.regular_price || product.price || 0) as number;
  const consumerPrice = ((consumerDeal?.price ??
    product.price ??
    product.sale_price ??
    retailPrice) || retailPrice) as number;

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

  // ── Badge ────────────────────────────────────────────────────────────
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
    const type = (activeDeal as any)?.type;
    if (isTradeSpecial) return "TRADE SPECIAL";
    if (type === "clearance") return "CLEARANCE";
    if (percentOff > 0) return `${percentOff}% OFF`;
    if (consumerDeal?.label) return consumerDeal.label;
    return "SALE";
  };

  const badgeLabel = getBadgeLabel();

  // ── Cart ─────────────────────────────────────────────────────────────
  const addWithPriceMode = (mode: "retail" | "trade") => {
    const p = { ...product };
    if (mode === "trade" && isTradeSpecial && tradeBest?.deal_id) {
      p.cartMetadata = { priceMode: "trade", dealId: tradeBest.deal_id };
    } else {
      p.cartMetadata = undefined;
    }
    addToCart(p);
  };

  // ── QuickView ────────────────────────────────────────────────────────
  const quickViewId = `QuickView-${product.id}`;

  const openQuickView = () => {
    setShouldRenderQuickView(true);
    setIsQuickViewClosing(false);
    setIsQuickViewOpening(true);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setIsQuickViewOpening(false));
    });
  };

  const closeQuickView = () => {
    setIsQuickViewClosing(true);
    window.setTimeout(() => {
      setShouldRenderQuickView(false);
      setIsQuickViewClosing(false);
      setIsQuickViewOpening(false);
    }, 300);
  };

  const handleQuickViewAddToCart = (quantity: number) => {
    if (product.stock <= 0) return;
    for (let count = 0; count < quantity; count += 1) {
      addWithPriceMode(isTradeSpecial ? "trade" : "retail");
    }
  };

  const handleQuickViewBuyNow = (quantity: number) => {
    if (product.stock <= 0) return;
    handleQuickViewAddToCart(quantity);
    onBuyNow?.(product);
    closeQuickView();
  };

  React.useEffect(() => {
    if (!shouldRenderQuickView) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeQuickView();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shouldRenderQuickView]);

  const stockLevel = product.stock ?? 0;
  const notifyLabel =
    notifyStatus === "sent"
      ? "Notification set"
      : notifyStatus === "pending"
        ? "Setting…"
        : notifyStatus === "error"
          ? "Try again"
          : "Notify me";

  return (
    <>
      <style>{`@keyframes deal-marquee{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}`}</style>

      <div
        className={`product-card product-card-style-card color-scheme-1${product.images?.[1] ? " has-second-image" : ""}${className ? ` ${className}` : ""}`}
      >
        <div className="product-card__wrapper h-full">
          {/* ── Image wrapper ── */}
          <div className="product-card__image-wrapper">
            <Link
              to={`/product/${product.id}`}
              aria-label={product.name}
              tabIndex={-1}
            >
              {/* Main image */}
              <div
                className="media-wrapper product-card__image product-card__image--main"
                style={{ "--aspect-ratio": 1 } as React.CSSProperties}
              >
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.name}
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "var(--color-surface-muted)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "12px",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    No image
                  </div>
                )}
              </div>

              {/* Second image (hover overlay) */}
              {product.images?.[1] && (
                <div
                  className="media-wrapper product-card__image product-card__image--second"
                  style={{ "--aspect-ratio": 1 } as React.CSSProperties}
                >
                  <img
                    src={product.images[1]}
                    alt={product.name}
                    loading="lazy"
                  />
                </div>
              )}
            </Link>

            {/* Badge */}
            {badgeLabel && (
              <div className="product-card__badge">
                <span
                  className={`f-badge ${isTradeSpecial ? "f-badge--trade" : "f-badge--sale"}`}
                >
                  {badgeLabel}
                </span>
              </div>
            )}

            {/* QuickView icon button */}
            <button
              type="button"
              className="product-card__quickview"
              aria-label="Quick view"
              aria-controls={quickViewId}
              aria-haspopup="dialog"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                openQuickView();
              }}
            >
              <Eye size={16} strokeWidth={2} />
            </button>

            {/* Deal tickers */}
            {isDailyDeal && (
              <div className="product-card__deal-ticker">
                <div className="flex items-center justify-center gap-4 py-2 pl-3 pr-4">
                  <span
                    style={{
                      color: "var(--color-deal-sale)",
                      fontWeight: 600,
                      fontSize: "13px",
                    }}
                  >
                    {formatTwo(dailyTimeLeft.hours)}H{" "}
                    {formatTwo(dailyTimeLeft.minutes)}M{" "}
                    {formatTwo(dailyTimeLeft.seconds)}S
                  </span>
                </div>
              </div>
            )}

            {isWeeklyDeal && !isDailyDeal && (
              <div className="product-card__deal-ticker">
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                    padding: "8px 16px",
                    whiteSpace: "nowrap",
                    animation: "deal-marquee 25s linear infinite",
                    width: "max-content",
                  }}
                >
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        fontWeight: 600,
                        fontSize: "13px",
                        color: "var(--color-text)",
                      }}
                    >
                      <Zap
                        size={14}
                        style={{ color: "var(--color-primary)" }}
                      />
                      <span>Weekly Deal</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isTradeSpecial &&
              tradePrice > 0 &&
              !isDailyDeal &&
              !isWeeklyDeal && (
                <div className="product-card__deal-ticker">
                  <div
                    style={{
                      padding: "8px 12px",
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "var(--color-primary)",
                    }}
                  >
                    Trade price available
                  </div>
                </div>
              )}

            {isLowStockUrgent &&
              !isDailyDeal &&
              !isWeeklyDeal &&
              !(isTradeSpecial && tradePrice > 0) && (
                <div className="product-card__deal-ticker">
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "16px",
                      padding: "8px 16px",
                      whiteSpace: "nowrap",
                      animation: "deal-marquee 35s linear infinite",
                      width: "max-content",
                    }}
                  >
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          fontWeight: 600,
                          fontSize: "13px",
                          color: "var(--color-text)",
                        }}
                      >
                        <Zap
                          size={14}
                          style={{ color: "var(--color-primary)" }}
                        />
                        <span>Low stock. Order soon</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* ATC action bar */}
            <div className="product-card__main-actions">
              {stockLevel > 0 ? (
                <button
                  type="button"
                  className="btn btn--white product-card__atc"
                  aria-label="Add to cart"
                  onClick={(e) => {
                    e.stopPropagation();
                    addWithPriceMode(isTradeSpecial ? "trade" : "retail");
                  }}
                >
                  <span className="btn__text">
                    <span
                      className="product-card__atc-icon"
                      style={{ display: "inline-flex" }}
                    >
                      <ShoppingBag size={15} strokeWidth={1.5} />
                    </span>
                    <span className="product-card__atc-text">Add to cart</span>
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn--white product-card__atc"
                  onClick={handleNotify}
                  disabled={
                    notifyStatus === "pending" || notifyStatus === "sent"
                  }
                  aria-label={notifyLabel}
                >
                  <span className="btn__text">
                    {notifyStatus === "sent" ? (
                      <CheckCircle size={15} />
                    ) : (
                      <Bell size={15} />
                    )}
                    <span className="product-card__atc-text">
                      {notifyLabel}
                    </span>
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* ── Info ── */}
          <div className="product-card__info text-left">
            <h3 className="product-card__title text-pcard-title">
              <Link to={`/product/${product.id}`} className="reversed-link">
                <span className="reversed-link__text">{product.name}</span>
              </Link>
            </h3>

            <div className="f-price f-price--left">
              {hasConsumerStrike ? (
                <>
                  <span className="f-price-item f-price-item--sale">
                    {formatMoney(consumerPrice)}
                  </span>
                  <span className="f-price-item f-price-item--regular">
                    <s>{formatMoney(consumerCompareAt as number)}</s>
                  </span>
                </>
              ) : isTradeSpecial && tradePrice > 0 ? (
                <>
                  <span className="f-price-item f-price-item--sale">
                    {formatMoney(tradePrice)}
                  </span>
                  <span className="f-price-item f-price-item--regular">
                    <s>{formatMoney(retailPrice)}</s>
                  </span>
                </>
              ) : (
                <span className="f-price-item f-price-item--regular">
                  {formatMoney(displayPrice)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

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
