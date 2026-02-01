import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Star,
  Truck,
  Store,
  Heart,
  Share2,
  ChevronRight,
  Minus,
  Plus,
  Check,
  X,
  ArrowLeft,
  ArrowRight,
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
  const [mainImage, setMainImage] = useState(product.image);
  const [qty, setQty] = useState(1);

  const [selectedTab, setSelectedTab] = useState<"desc" | "specs">("desc");
  const [productTab, setProductTab] = useState<"description" | "reviews">(
    "description",
  );

  const [aiDescription, setAiDescription] = useState<string | null>(null);
  const [generatingDesc, setGeneratingDesc] = useState(false);
  const [expandedPolicy, setExpandedPolicy] = useState<string | null>(null);
  const [ecommercePolicies, setEcommercePolicies] = useState<any>(null);

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);
  const [showBottomCta, setShowBottomCta] = useState(false);
  const [secondaryNavVisible, setSecondaryNavVisible] = useState(true);
  const lastScrollYRef = useRef(0);

  // Breadcrumb positions: 124px when secondary nav visible (desktop), 73px when hidden (scrolled)
  const breadcrumbTop = secondaryNavVisible ? (isMobile ? 73 : 124) : 73;
  const contentPaddingTop = isMobile ? "12px" : "50px";

  // Sticky Bar Logic
  const [isStickyExpanded, setIsStickyExpanded] = useState(false);
  const rightBuyBoxRef = useRef<HTMLDivElement>(null);

  // Buy Box Progressive Reveal
  const [scrollY, setScrollY] = useState(0);
  const [showBuyBoxMinimal, setShowBuyBoxMinimal] = useState(false);
  const [showBuyBoxFull, setShowBuyBoxFull] = useState(false);

  // Gallery Modal State
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);

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
    setMainImage(product.image);
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

  // Scroll listener for progressive buy box reveal and secondary nav visibility
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setScrollY(currentScrollY);

      setShowBuyBoxMinimal(currentScrollY > 200);
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

  // Scroll Observer to trigger Left Sticky Bar Expansion and Full Buy Box
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        const isBelow = entry.boundingClientRect.top < 100;
        setIsStickyExpanded(!entry.isIntersecting && isBelow);
        setShowBuyBoxFull(!entry.isIntersecting && isBelow);

        if (product.bundleCandidates && product.bundleCandidates.length > 0) {
          setShowBundleTrigger(!entry.isIntersecting && isBelow);
        }
      },
      { threshold: 0.1, rootMargin: "-140px 0px 0px 0px" },
    );

    if (rightBuyBoxRef.current) observer.observe(rightBuyBoxRef.current);
    return () => observer.disconnect();
  }, [product]);

  const gallery =
    product.images && product.images.length > 0
      ? product.images
      : [product.image];

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

  const handleBuyNowAction = () => {
    // Keep existing behavior but respect current trade selection
    handleAddToCart();
    onBuyNow(product);
  };

  const handleGenerateDescription = async () => {
    setGeneratingDesc(true);
    const desc = await generateProductDescription(product);
    setAiDescription(desc);
    setGeneratingDesc(false);
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    const currentIndex = gallery.indexOf(mainImage);
    const nextIndex = (currentIndex + 1) % gallery.length;
    setMainImage(gallery[nextIndex]);
  };

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    const currentIndex = gallery.indexOf(mainImage);
    const prevIndex = (currentIndex - 1 + gallery.length) % gallery.length;
    setMainImage(gallery[prevIndex]);
  };

  const hasDeliveryLocation = !!deliveryAddress;

  const handleOpenDeliveryLocation = () => {
    setIsDeliveryModalOpen(true);
  };

  return (
    <div className="animate-fadeIn relative">
      {/* Full Screen Gallery Modal */}
      {isGalleryOpen && (
        <div className="fixed inset-0 z-[80] bg-black/95 flex flex-col items-center justify-center p-4 animate-fadeIn">
          <button
            onClick={() => setIsGalleryOpen(false)}
            className="absolute top-6 right-6 text-white hover:text-gray-300 z-50"
          >
            <X size={32} />
          </button>

          <div className="relative w-full max-w-5xl h-[70vh] flex items-center justify-center">
            {gallery.length > 1 && (
              <button
                onClick={handlePrevImage}
                className="absolute left-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-50"
              >
                <ArrowLeft size={32} />
              </button>
            )}

            <img
              src={mainImage}
              alt={product.name}
              className="max-w-full max-h-full object-contain"
            />

            {gallery.length > 1 && (
              <button
                onClick={handleNextImage}
                className="absolute right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-50"
              >
                <ArrowRight size={32} />
              </button>
            )}
          </div>

          <div className="mt-8 flex gap-4 overflow-x-auto max-w-full p-2 no-scrollbar">
            {gallery.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setMainImage(img)}
                className={`w-20 h-20 rounded border-2 overflow-hidden transition-all flex-shrink-0 ${
                  mainImage === img
                    ? "border-belims-blue opacity-100"
                    : "border-transparent opacity-50 hover:opacity-80"
                }`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>

          <div className="text-white mt-4 font-bold font-heading text-lg">
            {gallery.indexOf(mainImage) + 1} / {gallery.length}
          </div>
        </div>
      )}

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
                  src={mainImage}
                  alt={product.name}
                  className="max-w-full max-h-full object-contain transition-transform duration-300 group-hover:scale-105"
                  onClick={() => setIsGalleryOpen(true)}
                />
              </div>

              {/* Mobile Image Dots */}
              {isMobile && gallery.length > 1 && (
                <div className="flex justify-center gap-2 pb-4">
                  {gallery.map((img, idx) => {
                    const active = mainImage === img;
                    return (
                      <button
                        key={idx}
                        onClick={() => setMainImage(img)}
                        className={`w-2.5 h-2.5 rounded-full transition-all ${
                          active
                            ? "bg-belims-blue scale-110"
                            : "bg-gray-300 hover:bg-belims-blue/70"
                        }`}
                        aria-label={`Go to image ${idx + 1}`}
                      />
                    );
                  })}
                </div>
              )}

              {/* STICKY OVERLAP BAR (Bottom Aligned) - Progressive Reveal (Desktop/Tablet only) */}
              {!isMobile && (
                <div
                  className={`absolute bottom-4 left-4 right-4 bg-white/98 backdrop-blur-md rounded border border-gray-200 z-30 transition-all duration-500 ${
                    !showBuyBoxMinimal
                      ? "opacity-0 translate-y-4 pointer-events-none"
                      : "opacity-100 translate-y-0"
                  } ${showBuyBoxFull ? "p-5" : "p-3"}`}
                >
                  {/* EXPANDABLE SECTION: Brand, Title, Price, Stock */}
                  <div
                    className={`overflow-hidden transition-all duration-500 ease-in-out ${
                      isStickyExpanded && showBuyBoxFull
                        ? "max-h-[220px] opacity-100 mb-3 border-b border-gray-200 pb-3"
                        : "max-h-0 opacity-0"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <div
                          className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-0.5 hover:text-belims-blue cursor-pointer transition-colors"
                          onClick={() =>
                            product.brand && onBrandClick?.(product.brand)
                          }
                        >
                          {product.brand}
                        </div>
                        <h3 className="font-bold text-gray-900 font-heading text-base line-clamp-1">
                          {product.name}
                        </h3>
                      </div>
                      <div className="text-right">
                        <div
                          className={`text-2xl font-extrabold font-heading ${
                            product.deals_resolved?.consumer
                              ? "text-red-600"
                              : "text-belims-blue"
                          }`}
                        >
                          {CURRENCY_SYMBOL}
                          {(
                            product.deals_resolved?.consumer?.price ??
                            product.price
                          ).toFixed(2)}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 w-full hidden sm:block">
                      <StockBar
                        current={product.stock}
                        max={product.maxStock}
                      />
                    </div>
                  </div>

                  {/* Controls */}
                  <div
                    className={`flex flex-col transition-all duration-300 ${showBuyBoxFull ? "gap-3" : "gap-2"}`}
                  >
                    {showBuyBoxFull ? (
                      <div className="flex items-center gap-3">
                        {/* Quantity */}
                        <div className="flex items-center border border-gray-300 rounded bg-white h-11">
                          <button
                            onClick={() => setQty(Math.max(1, qty - 1))}
                            className="px-3 hover:bg-gray-100 text-gray-600 h-full rounded"
                          >
                            <Minus size={16} />
                          </button>
                          <div className="w-8 text-center font-bold text-sm">
                            {qty}
                          </div>
                          <button
                            onClick={() =>
                              setQty(Math.min(product.stock, qty + 1))
                            }
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

                        <button
                          onClick={handleBuyNowAction}
                          disabled={product.stock === 0}
                          className="flex-1 bg-belims-accent text-white font-bold text-sm h-11 rounded hover:bg-orange-600 transition-all active:scale-95 font-heading flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          <Zap size={18} fill="currentColor" />{" "}
                          {product.stock > 0 ? "Buy Now" : "Out of Stock"}
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center border border-gray-300 rounded bg-white h-9">
                          <button
                            onClick={() => setQty(Math.max(1, qty - 1))}
                            className="px-2 hover:bg-gray-100 text-gray-600 h-full rounded"
                          >
                            <Minus size={14} />
                          </button>
                          <div className="w-6 text-center font-bold text-xs">
                            {qty}
                          </div>
                          <button
                            onClick={() =>
                              setQty(Math.min(product.stock, qty + 1))
                            }
                            className="px-2 hover:bg-gray-100 text-gray-600 h-full rounded"
                          >
                            <Plus size={14} />
                          </button>
                        </div>

                        <button
                          onClick={handleAddToCart}
                          disabled={product.stock === 0}
                          className="flex-1 bg-belims-blue text-white font-bold text-xs h-9 rounded hover:bg-belims-light transition-all active:scale-95 font-heading flex items-center justify-center gap-1 disabled:opacity-50"
                        >
                          Add to cart
                        </button>

                        <button
                          onClick={handleBuyNowAction}
                          disabled={product.stock === 0}
                          className="flex-1 bg-belims-accent text-white font-bold text-xs h-9 rounded hover:bg-orange-600 transition-all active:scale-95 font-heading flex items-center justify-center gap-1 disabled:opacity-50"
                        >
                          <Zap size={14} /> Buy Now
                        </button>
                      </div>
                    )}

                    {showBuyBoxFull && (
                      <div className="flex gap-4 text-[10px] font-semibold text-gray-500 justify-center sm:justify-start items-center pt-1">
                        <span
                          className="flex items-center gap-1 hover:text-belims-blue cursor-pointer"
                          onClick={() => setIsLocatorOpen(true)}
                        >
                          <Store size={12} /> Pick Up Available
                        </span>
                        <span
                          className="flex items-center gap-1 hover:text-belims-blue cursor-pointer"
                          onClick={() => setIsDeliveryModalOpen(true)}
                        >
                          <Truck size={12} /> Delivery Available
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="lg:col-span-5 flex flex-col gap-4 pt-4">
            {/* Header Info */}
            <div>
              <div className="mb-4">
                <h1 className="text-2xl font-bold text-gray-900 font-heading letterspacing-tight mb-0">
                  {product.name}
                </h1>
                <div className="text-xs text-gray-400 font-mono">
                  SKU: {product.sku || "N/A"}
                </div>
                {/* {product.features && product.features.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-sm font-bold text-gray-700 mb-2 font-heading">
                      Key Features:
                    </h3>
                    <ul className="space-y-1.5">
                      {product.features.map((feature, idx) => (
                        <li
                          key={idx}
                          className="text-sm text-gray-600 flex items-start gap-2"
                        >
                          <Check
                            size={16}
                            className="text-green-600 flex-shrink-0 mt-0.5"
                          />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )} */}
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

              {/* <StockBar current={product.stock} max={product.maxStock} /> */}

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

                        <div className="text-xs text-gray-500">
                          Rates calculated for {qty} unit{qty > 1 ? "s" : ""}.
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

            {/* Payment & Security */}
            <div className="border border-gray-200 rounded bg-white p-4">
              <div className="mb-3">
                <div className="text-sm font-bold text-gray-900 font-heading mb-3">
                  Payment & Security
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {/* Visa */}
                  <svg className="w-10 h-6" viewBox="0 0 38 24" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Visa">
                    <path opacity=".07" d="M35 0H3C1.3 0 0 1.3 0 3v18c0 1.7 1.4 3 3 3h32c1.7 0 3-1.3 3-3V3c0-1.7-1.4-3-3-3z"></path>
                    <path fill="#fff" d="M35 1c1.1 0 2 .9 2 2v18c0 1.1-.9 2-2 2H3c-1.1 0-2-.9-2-2V3c0-1.1.9-2 2-2h32"></path>
                    <path d="M28.3 10.1H28c-.4 1-.7 1.5-1 3h1.9c-.3-1.5-.3-2.2-.6-3zm2.9 5.9h-1.7c-.1 0-.1 0-.2-.1l-.2-.9-.1-.2h-2.4c-.1 0-.2 0-.2.2l-.3.9c0 .1-.1.1-.1.1h-2.1l.2-.5L27 8.7c0-.5.3-.7.8-.7h1.5c.1 0 .2 0 .2.2l1.4 6.5c.1.4.2.7.2 1.1.1.1.1.1.1.2zm-13.4-.3l.4-1.8c.1 0 .2.1.2.1.7.3 1.4.5 2.1.4.2 0 .5-.1.7-.2.5-.2.5-.7.1-1.1-.2-.2-.5-.3-.8-.5-.4-.2-.8-.4-1.1-.7-1.2-1-.8-2.4-.1-3.1.6-.4.9-.8 1.7-.8 1.2 0 2.5 0 3.1.2h.1c-.1.6-.2 1.1-.4 1.7-.5-.2-1-.4-1.5-.4-.3 0-.6 0-.9.1-.2 0-.3.1-.4.2-.2.2-.2.5 0 .7l.5.4c.4.2.8.4 1.1.6.5.3 1 .8 1.1 1.4.2.9-.1 1.7-.9 2.3-.5.4-.7.6-1.4.6-1.4 0-2.5.1-3.4-.2-.1.2-.1.2-.2.1zm-3.5.3c.1-.7.1-.7.2-1 .5-2.2 1-4.5 1.4-6.7.1-.2.1-.3.3-.3H18c-.2 1.2-.4 2.1-.7 3.2-.3 1.5-.6 3-1 4.5 0 .2-.1.2-.3.2M5 8.2c0-.1.2-.2.3-.2h3.4c.5 0 .9.3 1 .8l.9 4.4c0 .1 0 .1.1.2 0-.1.1-.1.1-.1l2.1-5.1c-.1-.1 0-.2.1-.2h2.1c0 .1 0 .1-.1.2l-3.1 7.3c-.1.2-.1.3-.2.4-.1.1-.3 0-.5 0H9.7c-.1 0-.2 0-.2-.2L7.9 9.5c-.2-.2-.5-.5-.9-.6-.6-.3-1.7-.5-1.9-.5L5 8.2z" fill="#142688"></path>
                  </svg>
                  {/* Mastercard */}
                  <svg className="w-10 h-6" viewBox="0 0 38 24" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Mastercard">
                    <path opacity=".07" d="M35 0H3C1.3 0 0 1.3 0 3v18c0 1.7 1.4 3 3 3h32c1.7 0 3-1.3 3-3V3c0-1.7-1.4-3-3-3z"></path>
                    <path fill="#fff" d="M35 1c1.1 0 2 .9 2 2v18c0 1.1-.9 2-2 2H3c-1.1 0-2-.9-2-2V3c0-1.1.9-2 2-2h32"></path>
                    <circle fill="#EB001B" cx="15" cy="12" r="7"></circle>
                    <circle fill="#F79E1B" cx="23" cy="12" r="7"></circle>
                    <path fill="#FF5F00" d="M22 12c0-2.4-1.2-4.5-3-5.7-1.8 1.3-3 3.4-3 5.7s1.2 4.5 3 5.7c1.8-1.2 3-3.3 3-5.7z"></path>
                  </svg>
                  {/* American Express */}
                  <svg className="w-10 h-6" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="American Express" viewBox="0 0 38 24">
                    <path fill="#000" d="M35 0H3C1.3 0 0 1.3 0 3v18c0 1.7 1.4 3 3 3h32c1.7 0 3-1.3 3-3V3c0-1.7-1.4-3-3-3Z" opacity=".07"></path>
                    <path fill="#006FCF" d="M35 1c1.1 0 2 .9 2 2v18c0 1.1-.9 2-2 2H3c-1.1 0-2-.9-2-2V3c0-1.1.9-2 2-2h32Z"></path>
                    <path fill="#FFF" d="M22.012 19.936v-8.421L37 11.528v2.326l-1.732 1.852L37 17.573v2.375h-2.766l-1.47-1.622-1.46 1.628-9.292-.02Z"></path>
                    <path fill="#006FCF" d="M23.013 19.012v-6.57h5.572v1.513h-3.768v1.028h3.678v1.488h-3.678v1.01h3.768v1.531h-5.572Z"></path>
                    <path fill="#006FCF" d="m28.557 19.012 3.083-3.289-3.083-3.282h2.386l1.884 2.083 1.89-2.082H37v.051l-3.017 3.23L37 18.92v.093h-2.307l-1.917-2.103-1.898 2.104h-2.321Z"></path>
                    <path fill="#FFF" d="M22.71 4.04h3.614l1.269 2.881V4.04h4.46l.77 2.159.771-2.159H37v8.421H19l3.71-8.421Z"></path>
                    <path fill="#006FCF" d="m23.395 4.955-2.916 6.566h2l.55-1.315h2.98l.55 1.315h2.05l-2.904-6.566h-2.31Zm.25 3.777.875-2.09.873 2.09h-1.748Z"></path>
                    <path fill="#006FCF" d="M28.581 11.52V4.953l2.811.01L32.84 9l1.456-4.046H37v6.565l-1.74.016v-4.51l-1.644 4.494h-1.59L30.35 7.01v4.51h-1.768Z"></path>
                  </svg>
                  {/* PayPal */}
                  <svg className="w-10 h-6" viewBox="0 0 38 24" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="PayPal">
                    <path opacity=".07" d="M35 0H3C1.3 0 0 1.3 0 3v18c0 1.7 1.4 3 3 3h32c1.7 0 3-1.3 3-3V3c0-1.7-1.4-3-3-3z"></path>
                    <path fill="#fff" d="M35 1c1.1 0 2 .9 2 2v18c0 1.1-.9 2-2 2H3c-1.1 0-2-.9-2-2V3c0-1.1.9-2 2-2h32"></path>
                    <path fill="#003087" d="M23.9 8.3c.2-1 0-1.7-.6-2.3-.6-.7-1.7-1-3.1-1h-4.1c-.3 0-.5.2-.6.5L14 15.6c0 .2.1.4.3.4H17l.4-3.4 1.8-2.2 4.7-2.1z"></path>
                    <path fill="#3086C8" d="M23.9 8.3l-.2.2c-.5 2.8-2.2 3.8-4.6 3.8H18c-.3 0-.5.2-.6.5l-.6 3.9-.2 1c0 .2.1.4.3.4H19c.3 0 .5-.2.5-.4v-.1l.4-2.4v-.1c0-.2.3-.4.5-.4h.3c2.1 0 3.7-.8 4.1-3.2.2-1 .1-1.8-.4-2.4-.1-.5-.3-.7-.5-.8z"></path>
                    <path fill="#012169" d="M23.3 8.1c-.1-.1-.2-.1-.3-.1-.1 0-.2 0-.3-.1-.3-.1-.7-.1-1.1-.1h-3c-.1 0-.2 0-.2.1-.2.1-.3.2-.3.4l-.7 4.4v.1c0-.3.3-.5.6-.5h1.3c2.5 0 4.1-1 4.6-3.8v-.2c-.1-.1-.3-.2-.5-.2h-.1z"></path>
                  </svg>
                  {/* Diners Club */}
                  <svg className="w-10 h-6" viewBox="0 0 38 24" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Diners Club">
                    <path opacity=".07" d="M35 0H3C1.3 0 0 1.3 0 3v18c0 1.7 1.4 3 3 3h32c1.7 0 3-1.3 3-3V3c0-1.7-1.4-3-3-3z"></path>
                    <path fill="#fff" d="M35 1c1.1 0 2 .9 2 2v18c0 1.1-.9 2-2 2H3c-1.1 0-2-.9-2-2V3c0-1.1.9-2 2-2h32"></path>
                    <path d="M12 12v3.7c0 .3-.2.3-.5.2-1.9-.8-3-3.3-2.3-5.4.4-1.1 1.2-2 2.3-2.4.4-.2.5-.1.5.2V12zm2 0V8.3c0-.3 0-.3.3-.2 2.1.8 3.2 3.3 2.4 5.4-.4 1.1-1.2 2-2.3 2.4-.4.2-.4.1-.4-.2V12zm7.2-7H13c3.8 0 6.8 3.1 6.8 7s-3 7-6.8 7h8.2c3.8 0 6.8-3.1 6.8-7s-3-7-6.8-7z" fill="#3086C8"></path>
                  </svg>
                  {/* Discover */}
                  <svg className="w-10 h-6" viewBox="0 0 38 24" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Discover">
                    <path fill="#000" opacity=".07" d="M35 0H3C1.3 0 0 1.3 0 3v18c0 1.7 1.4 3 3 3h32c1.7 0 3-1.3 3-3V3c0-1.7-1.4-3-3-3z"></path>
                    <path d="M35 1c1.1 0 2 .9 2 2v18c0 1.1-.9 2-2 2H3c-1.1 0-2-.9-2-2V3c0-1.1.9-2 2-2h32z" fill="#fff"></path>
                  </svg>
                </div>
              </div>
              <p className="text-xs text-gray-600">
                Your payment information is processed securely. We do not store credit card details nor have access to your credit card information.
              </p>
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

              <button
                onClick={handleBuyNowAction}
                disabled={product.stock === 0}
                className="flex-1 bg-belims-accent text-white font-bold text-sm h-11 rounded hover:bg-orange-600 transition-all active:scale-95 font-heading flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Zap size={16} />{" "}
                {product.stock > 0 ? "Buy Now" : "Out of Stock"}
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
