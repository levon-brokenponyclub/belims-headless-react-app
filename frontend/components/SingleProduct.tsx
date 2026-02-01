import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Truck,
  Store,
  Heart,
  Share2,
  ChevronRight,
  Minus,
  Plus,
  Check,
  RefreshCw,
  Package,
  Zap,
  Clock,
  MapPin,
} from "lucide-react";
import { Product, ShippingAddress } from "../types";
import { CURRENCY_SYMBOL, STORES } from "../constants";
import { StockBar } from "./StockBar";
import { DeliveryLocationModal } from "./DeliveryLocationModal";
import { generateProductDescription } from "../services/geminiService";
import { addToRecentlyViewed } from "../services/storageService";
import { getApiBaseUrl } from "../services/wooCommerceService";
import {
  getFallbackShipping,
  getShippingRates,
} from "../services/bobGoService";
import {
  buildAddressLabel,
  readStoredAddress,
  saveStoredAddress,
} from "../services/shippingAddress";
import { RecentlyViewed } from "./RecentlyViewed";
import { StoreLocator } from "./StoreLocator";
import { BundlePanel } from "./BundlePanel";
import { ProductCard } from "./ProductCard";
import { ProductPriceDisplay } from "./ProductPriceDisplay";
import { DealBadge } from "./DealBadge";
import ReactMarkdown from "react-markdown";

interface SingleProductProps {
  product: Product;
  allProducts?: Product[];
  addToCart: (product: Product) => void;
  onBuyNow: (product: Product) => void;
  onCompare: (product: Product) => void;
  onPriceMatch: (product: Product) => void;
  onBrandClick?: (brand: string) => void;
  isAuthenticated?: boolean;
  isTradeApproved?: boolean;
}

type ShippingTier = "Express" | "Standard" | "Economy";

interface ShippingRate {
  service_name: string;
  total_price: number;
  expected_delivery_date?: string;
  tier?: ShippingTier;
}

const classifyRate = (
  rate: ShippingRate,
  allRates: ShippingRate[],
): ShippingTier => {
  if (rate.tier) return rate.tier;

  const prices = allRates.map((r) => r.total_price).sort((a, b) => a - b);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  if (rate.total_price === minPrice && minPrice < maxPrice) return "Economy";
  if (rate.total_price === maxPrice) return "Express";
  return "Standard";
};

const formatEta = (dateStr?: string | null): string => {
  if (!dateStr) return "Estimated delivery";

  // If it's already a human-readable string (not a date format), return it directly
  if (
    dateStr.includes("Tomorrow") ||
    dateStr.includes("Days") ||
    dateStr.includes("day") ||
    dateStr.includes("Today")
  ) {
    return dateStr;
  }

  try {
    const date = new Date(dateStr);
    if (!date || Number.isNaN(date.getTime())) return "Estimated delivery";
    return `Arrives ${date.toLocaleDateString("en-ZA", {
      weekday: "short",
      month: "short",
      day: "numeric",
    })}`;
  } catch {
    return "Estimated delivery";
  }
};

export const SingleProduct: React.FC<SingleProductProps> = ({
  product,
  allProducts = [],
  addToCart,
  onBuyNow,
  onCompare,
  onPriceMatch,
  onBrandClick,
  isAuthenticated = false,
  isTradeApproved = false,
}) => {
  const navigate = useNavigate();
  const [qty, setQty] = useState(1);

  const [aiDescription, setAiDescription] = useState<string | null>(null);
  const [generatingDesc, setGeneratingDesc] = useState(false);
  const [expandedPolicy, setExpandedPolicy] = useState<string | null>(null);
  const [ecommercePolicies, setEcommercePolicies] = useState<any>(null);

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);
  const [showBottomCta, setShowBottomCta] = useState(false);
  const [secondaryNavVisible, setSecondaryNavVisible] = useState(true);
  const lastScrollYRef = useRef(0);

  // Breadcrumb positions
  const breadcrumbTop = secondaryNavVisible ? (isMobile ? 73 : 124) : 73;
  const contentPaddingTop = isMobile ? "12px" : "50px";

  // Right buy box ref for intersection observer
  const rightBuyBoxRef = useRef<HTMLDivElement>(null);

  // Store Locator State
  const [isLocatorOpen, setIsLocatorOpen] = useState(false);
  const [selectedStore, setSelectedStore] = useState(STORES[0]);

  // Delivery Modal State
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [deliveryAddress, setDeliveryAddress] =
    useState<ShippingAddress | null>(null);
  const [legacyDeliveryLabel, setLegacyDeliveryLabel] = useState<string | null>(
    null,
  );
  const [deliveryRates, setDeliveryRates] = useState<ShippingRate[]>([]);
  const [loadingDeliveryRates, setLoadingDeliveryRates] = useState(false);
  const [deliveryRatesError, setDeliveryRatesError] = useState<string | null>(
    null,
  );
  const [selectedDeliveryOptionId, setSelectedDeliveryOptionId] = useState(
    () => sessionStorage.getItem("selectedDeliveryOptionId") || "standard",
  );

  // Bundle Panel State
  const [isBundleOpen, setIsBundleOpen] = useState(false);
  const [isBundleSectionExpanded, setIsBundleSectionExpanded] = useState(false);
  const [showBundleTrigger, setShowBundleTrigger] = useState(false);

  // Trade Price Toggle
  const [useTradePrice, setUseTradePrice] = useState(false);

  // Compute pricing info
  const pricingInfo = useMemo(() => {
    const tradeDealsInfo = product.deals_resolved?.trade;
    const tradePrice = tradeDealsInfo?.price;
    const retailPrice = product.regular_price || product.price;
    const savings =
      tradePrice && tradePrice > 0 ? Math.max(0, retailPrice - tradePrice) : 0;
    const hasTradePrice = !!tradePrice && tradePrice > 0;

    return {
      retailPrice,
      tradePrice: tradePrice || 0,
      savings,
      hasTradePrice,
      tradeDealsInfo,
    };
  }, [product]);

  const isTradeSpecial =
    pricingInfo.tradeDealsInfo?.bestDeal?.type === "trade_special";

  // ✅ Trade logic:
  // - If trade approved & trade special => ALWAYS trade price (no toggle needed)
  // - Else allow user toggle if trade price exists
  const effectiveUseTradePrice =
    isTradeApproved && isTradeSpecial ? true : useTradePrice;

  const consumerDeal = product.deals_resolved?.consumer;
  const consumerBestDeal = consumerDeal?.bestDeal;
  const isDealOfDay = consumerBestDeal?.type === "deal_of_day";

  const parseDateSafe = (value?: string | number | null): Date | null => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const dealEndAt =
    parseDateSafe(consumerBestDeal?.end_at) ||
    parseDateSafe((consumerDeal as any)?.end_at);

  const hasDealCountdown = isDealOfDay && !!dealEndAt;
  const [dealNowMs, setDealNowMs] = useState(() => Date.now());

  const formatDealOfDayCountdown = (remainingMs: number) => {
    const oneHour = 60 * 60 * 1000;
    const oneDay = 24 * oneHour;

    if (remainingMs > oneDay) return "Ends today";

    if (remainingMs >= oneHour) {
      const hours = Math.floor(remainingMs / oneHour);
      const minutes = Math.floor((remainingMs % oneHour) / (60 * 1000));
      return `Offer ends in ${hours}h ${minutes}m`;
    }

    const minutes = Math.max(1, Math.floor(remainingMs / (60 * 1000)));
    return `Ends in ${minutes} minutes`;
  };

  const dealCountdownText = hasDealCountdown
    ? formatDealOfDayCountdown(Math.max(0, dealEndAt!.getTime() - dealNowMs))
    : null;

  useEffect(() => {
    if (!hasDealCountdown) return;
    const interval = setInterval(() => setDealNowMs(Date.now()), 60000);
    return () => clearInterval(interval);
  }, [hasDealCountdown]);

  useEffect(() => {
    addToRecentlyViewed(product);
    setQty(1);
    setAiDescription(null);
    setIsBundleSectionExpanded(false);
    setUseTradePrice(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
    setShowBottomCta(false);

    const apiBase = getApiBaseUrl();
    fetch(`${apiBase}/ecommerce-policies`)
      .then((res) => res.json())
      .then((data) => setEcommercePolicies(data))
      .catch((err) => console.error("Failed to fetch policies:", err));
  }, [product]);

  const refreshStoredAddress = () => {
    const { address, legacyLabel } = readStoredAddress();
    setDeliveryAddress(address);
    setLegacyDeliveryLabel(legacyLabel);
  };

  useEffect(() => {
    refreshStoredAddress();
  }, []);

  useEffect(() => {
    if (!isDeliveryModalOpen) refreshStoredAddress();
  }, [isDeliveryModalOpen]);

  useEffect(() => {
    sessionStorage.setItem(
      "selectedDeliveryOptionId",
      selectedDeliveryOptionId,
    );
  }, [selectedDeliveryOptionId]);

  const deliveryLabel = deliveryAddress
    ? deliveryAddress.label || buildAddressLabel(deliveryAddress)
    : legacyDeliveryLabel || "";

  const hasStructuredAddress = Boolean(
    deliveryAddress?.city && deliveryAddress?.province,
  );

  useEffect(() => {
    const fetchDeliveryRates = async () => {
      if (!hasStructuredAddress || !deliveryAddress) {
        setDeliveryRates([]);
        return;
      }

      setLoadingDeliveryRates(true);
      setDeliveryRatesError(null);

      try {
        const items = [
          {
            id: product.id,
            sku: product.sku,
            quantity: qty,
            grams: product.weight
              ? Math.round(product.weight * 1000)
              : undefined,
          },
        ];

        const rates = await getShippingRates({
          destination_address: {
            street: deliveryAddress.street,
            city: deliveryAddress.city,
            province: deliveryAddress.province,
            postal_code: deliveryAddress.postalCode,
            country: deliveryAddress.country,
          },
          items,
        });

        const finalRates = rates?.length ? rates : getFallbackShipping();
        const classifiedRates = finalRates.map((rate: any) => ({
          ...rate,
          tier: classifyRate(rate, finalRates),
        }));

        setDeliveryRates(classifiedRates);
      } catch (error) {
        console.error("Failed to fetch delivery rates:", error);
        const fallbackRates = getFallbackShipping().map((rate: any) => ({
          ...rate,
          tier: classifyRate(rate, getFallbackShipping()),
        }));
        setDeliveryRates(fallbackRates);
        setDeliveryRatesError(
          "Unable to fetch live rates. Showing estimated delivery options.",
        );
      } finally {
        setLoadingDeliveryRates(false);
      }
    };

    fetchDeliveryRates();
  }, [
    deliveryAddress?.street,
    deliveryAddress?.city,
    deliveryAddress?.province,
    deliveryAddress?.postalCode,
    deliveryAddress?.country,
    qty,
    product.id,
    product.sku,
    product.weight,
    hasStructuredAddress,
  ]);

  // Track viewport for mobile-specific UX
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px)");
    const handleChange = (e: MediaQueryListEvent | MediaQueryList) =>
      setIsMobile(
        (e as MediaQueryList).matches ?? (e as MediaQueryListEvent).matches,
      );
    handleChange(mql);
    mql.addEventListener("change", handleChange as EventListener);
    return () =>
      mql.removeEventListener("change", handleChange as EventListener);
  }, []);

  // Scroll listener for secondary nav visibility and mobile bottom CTA
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setSecondaryNavVisible(currentScrollY < 50);

      if (isMobile) {
        const scrollingDown = currentScrollY > lastScrollYRef.current;
        const beyondThreshold = currentScrollY > 180;
        if (scrollingDown && beyondThreshold) setShowBottomCta(true);
        if (!scrollingDown) setShowBottomCta(false);
        lastScrollYRef.current = currentScrollY;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isMobile]);

  // Scroll Observer for Bundle Trigger and Sticky Buy Box
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        const isBelow = entry.boundingClientRect.top < 100;

        if (product.bundleCandidates && product.bundleCandidates.length > 0) {
          setShowBundleTrigger(!entry.isIntersecting && isBelow);
        }
      },
      { threshold: 0.1, rootMargin: "-140px 0px 0px 0px" },
    );

    if (rightBuyBoxRef.current) observer.observe(rightBuyBoxRef.current);
    return () => observer.disconnect();
  }, [product]);

  const handleAddToCart = () => {
    for (let i = 0; i < qty; i++) {
      const productToAdd = { ...product };

      // ✅ Trade special cart metadata (restored / enforced)
      if (
        effectiveUseTradePrice &&
        isTradeSpecial &&
        pricingInfo.tradeDealsInfo?.bestDeal
      ) {
        productToAdd.cartMetadata = {
          priceMode: "trade",
          dealId: pricingInfo.tradeDealsInfo.bestDeal.deal_id,
        };
      } else {
        // Ensure we don't accidentally persist prior metadata
        productToAdd.cartMetadata = undefined;
      }

      addToCart(productToAdd);
    }
  };

  const handleGenerateDescription = async () => {
    setGeneratingDesc(true);
    const desc = await generateProductDescription(product);
    setAiDescription(desc);
    setGeneratingDesc(false);
  };

  const hasDeliveryLocation = !!deliveryAddress;

  const handleOpenDeliveryLocation = () => {
    setIsDeliveryModalOpen(true);
  };

  return (
    <div className="animate-fadeIn relative">
      {/* Store Locator Modal */}
      {isLocatorOpen && (
        <StoreLocator
          currentStore={selectedStore}
          onSelectStore={(store) => {
            setSelectedStore(store);
            setIsLocatorOpen(false);
          }}
          onClose={() => setIsLocatorOpen(false)}
          checkingProduct={product}
        />
      )}

      {/* Delivery Location Modal */}
      <DeliveryLocationModal
        isOpen={isDeliveryModalOpen}
        onClose={() => setIsDeliveryModalOpen(false)}
        currentAddress={deliveryAddress || undefined}
        onAddressSelect={(address) => {
          setDeliveryAddress(address);
          if (address) {
            saveStoredAddress(address);
          } else {
            setDeliveryAddress(null);
            localStorage.removeItem("deliveryAddressV2");
            localStorage.removeItem("deliveryAddress");
          }
        }}
      />

      {/* Bundle Panel */}
      {product.bundleCandidates && (
        <BundlePanel
          isOpen={isBundleOpen}
          onClose={() => setIsBundleOpen(false)}
          mainProduct={product}
          candidates={product.bundleCandidates}
          addToCart={addToCart}
        />
      )}

      {/* Floating Bundle Trigger (Visible on Scroll) */}
      {showBundleTrigger && (
        <button
          onClick={() => setIsBundleOpen(true)}
          className="fixed bottom-24 right-4 z-40 bg-belims-accent text-white px-6 py-3 rounded font-bold font-heading flex items-center gap-2 hover:bg-orange-600 transition-colors"
        >
          <Package size={20} /> Bundle & Save
        </button>
      )}

      {/* Fixed Breadcrumbs - Positioned below secondary nav */}
      <div
        className="fixed left-0 right-0 bg-white/98 backdrop-blur-md border-b border-gray-200 z-40 px-6 py-3"
        style={{ top: `${breadcrumbTop}px` }}
      >
        <div className="container mx-auto px-4 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <div className="text-sm text-gray-600 flex items-center gap-2 whitespace-nowrap">
            <span
              className="cursor-pointer hover:text-belims-blue transition-colors"
              onClick={() => navigate(-1)}
            >
              Home
            </span>
            {product.breadcrumbs && product.breadcrumbs.length > 0 && (
              <>
                {product.breadcrumbs.map((breadcrumb, idx) => (
                  <React.Fragment key={idx}>
                    <ChevronRight
                      size={14}
                      className="text-gray-400 flex-shrink-0"
                    />
                    <span className="text-gray-600">{breadcrumb.label}</span>
                  </React.Fragment>
                ))}
                <ChevronRight
                  size={14}
                  className="text-gray-400 flex-shrink-0"
                />
              </>
            )}
            <span className="font-bold text-gray-900 flex-shrink-0">
              {product.name}
            </span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 mb-16">
        {/* Main Grid Layout */}
        <div
          className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16 items-start relative"
          style={{ paddingTop: contentPaddingTop }}
        >
          {/* LEFT COLUMN: Sticky Image + Overlapping Sticky Control Box */}
          <div
            className={`lg:col-span-7 ${
              isMobile ? "" : "sticky top-[190px] h-[calc(100vh-220px)]"
            } flex flex-col relative z-30`}
            style={{ paddingLeft: "0" }}
          >
            {/* Image Container */}
            <div className="flex-1 bg-white border border-gray-200 rounded relative group cursor-zoom-in overflow-hidden flex flex-col">
              {/* Deal Badge (Top Left) */}
              <DealBadge deal={product.deals_resolved?.consumer} />

              {/* Trade Special Label (Top Right) */}
              {product.deals_resolved?.trade?.bestDeal?.type ===
                "trade_special" && (
                <div className="absolute top-4 right-4 z-20 text-white text-xs font-bold px-3 py-1.5 rounded uppercase tracking-wide font-heading bg-green-600">
                  TRADE SPECIAL
                </div>
              )}

              {/* Main Image */}
              <div className="w-full h-full flex items-center justify-center p-6">
                <img
                  src={product.image}
                  alt={product.name}
                  className="max-w-full max-h-full object-contain transition-transform duration-300 group-hover:scale-105"
                />
              </div>

              {/* STICKY OVERLAP BAR (Bottom Aligned) - Progressive Reveal (Desktop/Tablet only) */}
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="lg:col-span-5 flex flex-col gap-4 pt-4">
            {/* Header Info - Brand, Title, SKU (Conversion-first) */}
            <div>
              <div className="mb-4">
                {product.brand && (
                  <div
                    className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-2 hover:text-belims-blue cursor-pointer transition-colors"
                    onClick={() =>
                      product.brand && onBrandClick?.(product.brand)
                    }
                  >
                    {product.brand}
                  </div>
                )}
                <h1 className="text-2xl font-bold text-gray-900 font-heading mb-2">
                  {product.name}
                </h1>
                <div className="text-xs text-gray-400 font-mono">
                  SKU: {product.sku || "N/A"}
                </div>
              </div>
            </div>

            {/* BUY BOX */}
            <div ref={rightBuyBoxRef} className="">
              {/* Price row */}
              <div className="flex justify-between items-start mb-4 border-b border-gray-200 pb-4">
                <div className="flex-1">
                  <ProductPriceDisplay
                    product={product}
                    deal={product.deals_resolved?.consumer}
                    overridePrice={
                      effectiveUseTradePrice && isTradeSpecial
                        ? pricingInfo.tradePrice
                        : undefined
                    }
                    isTradeToggleActive={effectiveUseTradePrice}
                    showCountdown={false}
                  />
                </div>

                {product.isBundle && (
                  <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded ml-4 flex-shrink-0">
                    Bundle Savings
                  </span>
                )}
              </div>

              {/* Deal countdown */}
              {dealCountdownText && (
                <div className="mb-4">
                  <div className="inline-flex items-center gap-2 text-amber-700 text-sm bg-amber-50 border border-amber-200 px-3 py-2 rounded">
                    <Clock size={14} />
                    <span className="font-medium">{dealCountdownText}</span>
                  </div>
                </div>
              )}

              {/* Trade Price Block */}
              {pricingInfo.hasTradePrice && isTradeSpecial && (
                <div className="mb-4 border-b border-gray-200 pb-4">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <h3 className="text-sm font-bold text-gray-700">
                      Trade price
                    </h3>

                    {/* If approved, show status; if not approved, show toggle */}
                    {isTradeApproved ? (
                      <span className="text-[11px] font-bold uppercase tracking-wide text-green-700 bg-green-100 px-2 py-1 rounded">
                        Active
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setUseTradePrice(!useTradePrice)}
                        className={`text-[11px] font-bold uppercase tracking-wide px-2 py-1 rounded border transition-colors ${
                          useTradePrice
                            ? "border-belims-blue text-belims-blue bg-white"
                            : "border-gray-300 text-gray-600 bg-white hover:border-gray-400"
                        }`}
                        aria-pressed={useTradePrice}
                      >
                        {useTradePrice ? "Trade" : "Retail"}
                      </button>
                    )}
                  </div>

                  {/* Summary grid */}
                  <div className="grid grid-cols-3 gap-3 text-center border border-gray-200 bg-white rounded p-3">
                    <div>
                      <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                        Retail
                      </div>
                      <div className="text-sm font-bold text-gray-800">
                        {CURRENCY_SYMBOL}
                        {pricingInfo.retailPrice.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-semibold text-belims-blue uppercase tracking-wide mb-1">
                        Trade
                      </div>
                      <div className="text-sm font-extrabold text-belims-blue">
                        {CURRENCY_SYMBOL}
                        {pricingInfo.tradePrice.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                        Save
                      </div>
                      <div className="inline-block bg-green-100 text-green-700 text-sm font-bold px-2 py-1 rounded">
                        {CURRENCY_SYMBOL}
                        {pricingInfo.savings.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 text-xs text-gray-600">
                    {isTradeApproved ? (
                      <span className="font-medium">
                        Trade pricing applied at checkout.
                      </span>
                    ) : pricingInfo.tradeDealsInfo?.eligibilityCopy ? (
                      <span className="italic">
                        {pricingInfo.tradeDealsInfo.eligibilityCopy}
                      </span>
                    ) : (
                      <span className="italic">
                        Available to approved contractor accounts.
                      </span>
                    )}
                  </div>
                </div>
              )}

              <StockBar current={product.stock} max={product.maxStock} />

              {/* Qty + Add */}
              <div className="space-y-3 mt-6 mb-4">
                <div className="flex gap-4">
                  <div className="flex items-center border border-gray-300 rounded bg-white h-12">
                    <button
                      onClick={() => setQty(Math.max(1, qty - 1))}
                      className="px-3 hover:bg-gray-100 text-gray-600 h-full rounded"
                    >
                      <Minus size={18} />
                    </button>
                    <div className="w-10 text-center font-bold text-base">
                      {qty}
                    </div>
                    <button
                      onClick={() => setQty(Math.min(product.stock, qty + 1))}
                      className="px-3 hover:bg-gray-100 text-gray-600 h-full rounded"
                    >
                      <Plus size={18} />
                    </button>
                  </div>

                  <button
                    onClick={handleAddToCart}
                    disabled={product.stock === 0}
                    className="flex-1 bg-belims-blue text-white font-semibold text-base h-12 rounded hover:bg-belims-light transition-all active:scale-95 font-heading flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {product.stock > 0 ? "Add to cart" : "Out of Stock"}
                  </button>
                </div>
              </div>

              {/* Delivery */}
              <div className="mt-4 mb-2 border-t border-gray-200 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-bold text-gray-900 font-heading">
                    Delivery
                  </div>

                  {hasDeliveryLocation && (
                    <button
                      onClick={handleOpenDeliveryLocation}
                      className="text-xs font-semibold text-belims-blue hover:text-belims-accent"
                    >
                      Change
                    </button>
                  )}
                </div>

                {hasDeliveryLocation ? (
                  <>
                    <div className="flex items-center gap-2 text-xs text-gray-600 mb-3">
                      <MapPin size={14} className="text-gray-400" />
                      <span className="font-medium">Delivery to:</span>
                      <span className="truncate">
                        {deliveryAddress?.street}, {deliveryAddress?.city},{" "}
                        {deliveryAddress?.province}
                        {deliveryAddress?.postalCode &&
                          `, ${deliveryAddress.postalCode}`}
                      </span>
                    </div>

                    {loadingDeliveryRates ? (
                      <div className="flex items-center justify-center gap-2 py-6 text-gray-500">
                        <RefreshCw size={16} className="animate-spin" />
                        <span className="text-xs">
                          Finding delivery options...
                        </span>
                      </div>
                    ) : deliveryRatesError ? (
                      <div className="rounded border border-red-200 bg-red-50 p-3 text-xs text-red-700 mb-2">
                        <p className="font-semibold mb-1">Delivery error</p>
                        <p>{deliveryRatesError}</p>
                      </div>
                    ) : deliveryRates.length > 0 ? (
                      <>
                        <div
                          role="radiogroup"
                          aria-label="Delivery options"
                          className="grid grid-cols-1 gap-3 mb-2"
                        >
                          {deliveryRates.map((rate, idx) => {
                            const tier = classifyRate(rate, deliveryRates);
                            const isSelected =
                              selectedDeliveryOptionId === `rate-${idx}`;

                            return (
                              <button
                                key={`rate-${idx}`}
                                type="button"
                                role="radio"
                                aria-checked={isSelected}
                                onClick={() => {
                                  setSelectedDeliveryOptionId(`rate-${idx}`);
                                  sessionStorage.setItem(
                                    "selectedDeliveryOptionId",
                                    `rate-${idx}`,
                                  );
                                }}
                                className={[
                                  "text-left rounded border p-4 transition-all focus:outline-none focus:ring-2 focus:ring-belims-blue/40 bg-white",
                                  isSelected
                                    ? "border-belims-blue bg-blue-50/60"
                                    : "border-gray-200 hover:border-belims-blue hover:bg-blue-50/50",
                                ].join(" ")}
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div className="min-w-0">
                                    <div className="font-bold text-gray-900 text-sm">
                                      {rate.service_name}
                                    </div>
                                    <div className="text-xs text-gray-600 mt-1">
                                      {formatEta(rate.expected_delivery_date)}
                                    </div>
                                  </div>

                                  <div className="text-right flex-shrink-0">
                                    <div className="text-[10px] font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded uppercase tracking-wide inline-block">
                                      {tier}
                                    </div>
                                    <div className="text-sm font-bold text-gray-900 mt-2">
                                      {CURRENCY_SYMBOL}
                                      {rate.total_price.toFixed(2)}
                                    </div>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </>
                    ) : (
                      <div className="rounded border border-yellow-200 bg-yellow-50 p-3 text-xs text-yellow-700">
                        <p className="font-semibold mb-1">
                          No delivery options
                        </p>
                        <p>
                          Unable to calculate delivery rates for your location.
                          Rates will be calculated at checkout.
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="rounded border border-blue-100 bg-blue-50 p-3 text-xs text-gray-700 flex items-center justify-between gap-3">
                    <span>
                      Set your delivery location to see delivery estimates.
                    </span>
                    <button
                      onClick={handleOpenDeliveryLocation}
                      className="bg-belims-blue text-white px-3 py-1.5 rounded font-bold text-xs hover:bg-belims-light whitespace-nowrap"
                    >
                      Set delivery location
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Product Description */}
            <div className="bg-white rounded p-0">
              <h3 className="font-bold text-gray-900 font-heading text-medium mb-4">
                Product Description
              </h3>
              <div className="prose prose-sm max-w-none text-gray-700 text-sm leading-relaxed [&_strong]:font-bold [&_strong]:text-gray-900 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_li]:text-gray-700 [&_p]:mb-3">
                {product.description ? (
                  <div
                    dangerouslySetInnerHTML={{ __html: product.description }}
                  />
                ) : (
                  <p className="text-gray-400 italic">
                    No description available.
                  </p>
                )}
              </div>
            </div>

            {/* Policies */}
            <div className="space-y-3">
              {/* 15-Days Return Policy */}
              <div className="border border-gray-200 rounded overflow-hidden">
                <button
                  onClick={() =>
                    setExpandedPolicy(
                      expandedPolicy === "return" ? null : "return",
                    )
                  }
                  className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors text-left group"
                >
                  <span className="font-bold text-gray-900 font-heading group-hover:text-belims-blue transition-colors">
                    15-Days Return Policy
                  </span>
                  <ChevronRight
                    size={20}
                    className={`text-gray-500 transition-transform ${expandedPolicy === "return" ? "rotate-90" : ""}`}
                  />
                </button>
                {expandedPolicy === "return" && (
                  <div className="p-4 bg-white border-t border-gray-200 animate-fadeIn">
                    <div
                      className="text-sm text-gray-600 leading-relaxed prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{
                        __html:
                          ecommercePolicies?.return_policy || "Loading...",
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Change of Mind Return */}
              <div className="border border-gray-200 rounded overflow-hidden">
                <button
                  onClick={() =>
                    setExpandedPolicy(
                      expandedPolicy === "change_mind" ? null : "change_mind",
                    )
                  }
                  className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors text-left group"
                >
                  <span className="font-bold text-gray-900 font-heading group-hover:text-belims-blue transition-colors">
                    Change of Mind Return
                  </span>
                  <ChevronRight
                    size={20}
                    className={`text-gray-500 transition-transform ${expandedPolicy === "change_mind" ? "rotate-90" : ""}`}
                  />
                </button>
                {expandedPolicy === "change_mind" && (
                  <div className="p-4 bg-white border-t border-gray-200 animate-fadeIn">
                    <div
                      className="text-sm text-gray-600 leading-relaxed prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{
                        __html:
                          ecommercePolicies?.change_of_mind || "Loading...",
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Warranty */}
              <div className="border border-gray-200 rounded overflow-hidden">
                <button
                  onClick={() =>
                    setExpandedPolicy(
                      expandedPolicy === "warranty" ? null : "warranty",
                    )
                  }
                  className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors text-left group"
                >
                  <span className="font-bold text-gray-900 font-heading group-hover:text-belims-blue transition-colors">
                    Warranty
                  </span>
                  <ChevronRight
                    size={20}
                    className={`text-gray-500 transition-transform ${expandedPolicy === "warranty" ? "rotate-90" : ""}`}
                  />
                </button>
                {expandedPolicy === "warranty" && (
                  <div className="p-4 bg-white border-t border-gray-200 animate-fadeIn">
                    <div
                      className="text-sm text-gray-600 leading-relaxed prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{
                        __html: ecommercePolicies?.warranty || "Loading...",
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Delivery and Shipping */}
              <div className="border border-gray-200 rounded overflow-hidden">
                <button
                  onClick={() =>
                    setExpandedPolicy(
                      expandedPolicy === "shipping" ? null : "shipping",
                    )
                  }
                  className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors text-left group"
                >
                  <span className="font-bold text-gray-900 font-heading group-hover:text-belims-blue transition-colors">
                    Delivery and Shipping
                  </span>
                  <ChevronRight
                    size={20}
                    className={`text-gray-500 transition-transform ${expandedPolicy === "shipping" ? "rotate-90" : ""}`}
                  />
                </button>
                {expandedPolicy === "shipping" && (
                  <div className="p-4 bg-white border-t border-gray-200 animate-fadeIn">
                    <div
                      className="text-sm text-gray-600 leading-relaxed prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{
                        __html: ecommercePolicies?.shipping || "Loading...",
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Bottom CTA */}
        {isMobile && (
          <div
            className={`fixed left-0 right-0 bottom-0 z-[260] bg-white border-t border-gray-200 px-4 py-3 transition-transform duration-300 ${
              showBottomCta ? "translate-y-0" : "translate-y-full"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center border border-gray-300 rounded bg-white h-11 flex-shrink-0">
                <button
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  className="px-3 hover:bg-gray-100 text-gray-600 h-full rounded"
                >
                  <Minus size={16} />
                </button>
                <div className="w-8 text-center font-bold text-sm">{qty}</div>
                <button
                  onClick={() => setQty(Math.min(product.stock, qty + 1))}
                  className="px-3 hover:bg-gray-100 text-gray-600 h-full rounded"
                >
                  <Plus size={16} />
                </button>
              </div>

              <button
                onClick={handleAddToCart}
                disabled={product.stock === 0}
                className="flex-1 bg-belims-blue text-white font-bold text-sm h-11 rounded hover:bg-belims-light transition-all active:scale-95 font-heading flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {product.stock > 0 ? "Add to cart" : "Out of Stock"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* How About These Section */}
      {allProducts.length > 0 && (
        <section className="py-12 bg-gray-50 border-t border-gray-200 mb-8">
          <div className="container mx-auto px-4">
            <h3 className="text-2xl font-bold text-gray-900 font-heading mb-8">
              How about these
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {allProducts
                .filter(
                  (p) => p.id !== product.id && p.category === product.category,
                )
                .slice(0, 4)
                .map((p) => (
                  <div key={p.id}>
                    <ProductCard
                      product={p}
                      addToCart={addToCart}
                      onBuyNow={onBuyNow}
                      onCompare={onCompare}
                      isAuthenticated={isAuthenticated}
                      isTradeApproved={isTradeApproved}
                    />
                  </div>
                ))}
            </div>
          </div>
        </section>
      )}

      {/* Frequently Bought Together Section */}
      {(() => {
        const mainCategory =
          product.breadcrumbs?.find((b) => b.label !== "Shop")?.label ||
          product.category;

        let recommendedProducts: Product[] = [];

        if (product.cross_sell_ids && product.cross_sell_ids.length > 0) {
          const crossSellIds = product.cross_sell_ids;
          recommendedProducts = allProducts
            .filter((p) => crossSellIds.includes(p.id))
            .slice(0, 4);
        }

        if (recommendedProducts.length < 4) {
          const mainCategoryProducts = allProducts
            .filter((p) => {
              if (p.id === product.id) return false;
              if (recommendedProducts.some((rp) => rp.id === p.id))
                return false;
              return (p.breadcrumbs || []).some(
                (b) => b.label === mainCategory,
              );
            })
            .slice(0, 4 - recommendedProducts.length);

          recommendedProducts = [
            ...recommendedProducts,
            ...mainCategoryProducts,
          ];
        }

        if (recommendedProducts.length === 0) return null;

        return (
          <section className="py-12 bg-white border-t border-gray-200 mb-8">
            <div className="container mx-auto px-4">
              <h3 className="text-2xl font-bold text-gray-900 font-heading mb-8">
                Frequently bought together
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {recommendedProducts.map((p) => (
                  <div key={p.id}>
                    <ProductCard
                      product={p}
                      addToCart={addToCart}
                      onBuyNow={onBuyNow}
                      onCompare={onCompare}
                      isAuthenticated={isAuthenticated}
                      isTradeApproved={isTradeApproved}
                    />
                  </div>
                ))}
              </div>
            </div>
          </section>
        );
      })()}

      {/* Recently Viewed Section */}
      <RecentlyViewed
        addToCart={addToCart}
        onBuyNow={onBuyNow}
        onProductClick={(p) => {
          navigate(`/product/${p.id}`);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        onCompare={onCompare}
        currentProductId={product.id}
        isAuthenticated={isAuthenticated}
        isTradeApproved={isTradeApproved}
      />
    </div>
  );
};
