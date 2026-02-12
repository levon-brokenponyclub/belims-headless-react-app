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
  Target,
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
import { BundledProducts } from "./BundledProducts";
import { ProductCard } from "./ProductCard";
import { ProductPriceDisplay } from "./ProductPriceDisplay";
import { DealBadge } from "./DealBadge";
import { FulfillmentTiles, ShippingSelectionTiles } from "./FulfillmentTiles";
import { DeliveryRateOption } from "./DeliveryRateOption";
import {
  Skeleton,
  SkeletonLine,
  SkeletonImage,
  SkeletonProductCard,
} from "./Skeleton";
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

const formatEtaDateLabel = (date: Date): string =>
  date.toLocaleDateString("en-ZA", {
    month: "short",
    day: "numeric",
  });

const parseEarliestDateFromEta = (eta?: string | null): Date | null => {
  if (!eta) return null;
  const value = eta.trim();
  if (!value) return null;

  const [startRaw] = value.split(" - ");
  const parsed = new Date(startRaw.trim());
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

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
  if (!dateStr) return "Estimated Arrival";
  const value = dateStr.trim();
  if (!value) return "Estimated Arrival";

  const formatDate = (input: string) => {
    const parsed = new Date(input);
    if (Number.isNaN(parsed.getTime())) return "";
    return parsed.toLocaleDateString("en-ZA", {
      month: "short",
      day: "numeric",
    });
  };

  if (value.includes(" - ")) {
    const [startRaw, endRaw] = value.split(" - ").map((part) => part.trim());
    const start = formatDate(startRaw);
    const end = formatDate(endRaw);

    if (start && end) {
      return start === end
        ? `Estimated Arrival: ${start}`
        : `Estimated Arrival: ${start} - ${end}`;
    }
  }

  const single = formatDate(value);
  if (single) return `Estimated Arrival: ${single}`;

  return value;
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

  // Breadcrumb positions: 144px when secondary nav visible (desktop), 40px when hidden (scrolled)
  const breadcrumbTop = secondaryNavVisible ? (isMobile ? 73 : 144) : 40;
  const contentPaddingTop = isMobile ? "12px" : "50px";

  // Sticky Bar Logic
  const rightBuyBoxRef = useRef<HTMLDivElement>(null);
  const rightColumnEndRef = useRef<HTMLDivElement>(null);
  const howAboutTheseRef = useRef<HTMLDivElement>(null);

  // Buy Box Progressive Reveal
  const [scrollY, setScrollY] = useState(0);
  const [showBuyBoxFull, setShowBuyBoxFull] = useState(false);
  const [showLeftBundle, setShowLeftBundle] = useState(false);

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

  // Trade Deal View Toggle (for non-approved users)
  const [showTradeDeal, setShowTradeDeal] = useState(false);

  // Fulfillment Selection
  const [fulfillmentType, setFulfillmentType] = useState<
    "pickup" | "delivery" | null
  >(null);

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

  const earliestDeliveryEta = useMemo(() => {
    if (!deliveryRates.length) return "";

    const parsedDates = deliveryRates
      .map((rate) => parseEarliestDateFromEta(rate.expected_delivery_date))
      .filter((date): date is Date => Boolean(date));

    if (parsedDates.length > 0) {
      const earliestDate = new Date(
        Math.min(...parsedDates.map((date) => date.getTime())),
      );
      return formatEtaDateLabel(earliestDate);
    }

    const fallbackEta = formatEta(deliveryRates[0]?.expected_delivery_date);
    return fallbackEta.replace(/^Estimated Arrival:\s*/i, "") || "";
  }, [deliveryRates]);

  // ✅ Trade logic:
  // - If trade approved & trade special => ALWAYS trade price (no toggle needed)
  // - Else allow user toggle if trade price exists
  const effectiveUseTradePrice =
    isTradeApproved && isTradeSpecial ? true : useTradePrice;

  const consumerDeal = product.deals_resolved?.consumer;
  const consumerBestDeal = consumerDeal?.bestDeal;
  const isDealOfDay = consumerBestDeal?.type === "deal_of_day";

  const tradeBestDeal = pricingInfo.tradeDealsInfo?.bestDeal;
  const tradeDealName = isTradeSpecial
    ? tradeBestDeal?.deal_name ||
      pricingInfo.tradeDealsInfo?.label ||
      "Trade Special"
    : undefined;

  const parseDateSafe = (value?: string | number | null): Date | null => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const dealEndAt =
    parseDateSafe(consumerBestDeal?.end_at) ||
    parseDateSafe((consumerDeal as any)?.end_at);

  const tradeEndAt = parseDateSafe(tradeBestDeal?.end_at);

  const hasDealCountdown = isDealOfDay && !!dealEndAt;
  const hasTradeCountdown = isTradeSpecial && !!tradeEndAt;
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

  const tradeCountdownText = hasTradeCountdown
    ? formatDealOfDayCountdown(Math.max(0, tradeEndAt!.getTime() - dealNowMs))
    : null;

  useEffect(() => {
    if (!hasDealCountdown && !hasTradeCountdown) return;
    const interval = setInterval(() => setDealNowMs(Date.now()), 60000);
    return () => clearInterval(interval);
  }, [hasDealCountdown, hasTradeCountdown]);

  useEffect(() => {
    addToRecentlyViewed(product);
    setMainImage(product.image);
    setQty(1);
    setAiDescription(null);
    setIsBundleSectionExpanded(false);
    setUseTradePrice(false);
    setShowTradeDeal(false);
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

  // Scroll listener for secondary nav visibility
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setScrollY(currentScrollY);
      setSecondaryNavVisible(currentScrollY < 50);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Scroll Observer to trigger Left Sticky Bar Expansion and Full Buy Box
  useEffect(() => {
    const buyBoxObserver = new IntersectionObserver(
      ([entry]) => {
        const isBelow = entry.boundingClientRect.top < 100;
        setShowBuyBoxFull(!entry.isIntersecting && isBelow);

        if (product.bundleCandidates && product.bundleCandidates.length > 0) {
          setShowBundleTrigger(!entry.isIntersecting && isBelow);
        }
      },
      { threshold: 0.1, rootMargin: "-140px 0px 0px 0px" },
    );

    // Observer for bundle reveal when right column has been fully scrolled
    const rightColumnEndObserver = new IntersectionObserver(
      ([entry]) => {
        setShowLeftBundle(entry.isIntersecting);
      },
      { threshold: 0, rootMargin: "0px" },
    );

    // Observer for sticky bottom bar - triggers when "How About These" is 95px from top
    const stickyBarObserver = new IntersectionObserver(
      ([entry]) => {
        // Show bar when section's top edge is at or above 95px from viewport top
        const sectionTop = entry.boundingClientRect.top;
        setShowBottomCta(sectionTop <= 95);
      },
      { threshold: [0, 0.1, 1] },
    );

    if (rightBuyBoxRef.current) buyBoxObserver.observe(rightBuyBoxRef.current);
    if (rightColumnEndRef.current)
      rightColumnEndObserver.observe(rightColumnEndRef.current);
    if (howAboutTheseRef.current)
      stickyBarObserver.observe(howAboutTheseRef.current);

    return () => {
      buyBoxObserver.disconnect();
      rightColumnEndObserver.disconnect();
      stickyBarObserver.disconnect();
    };
  }, [product]);

  const gallery =
    product.images && product.images.length > 0
      ? product.images
      : [product.image];

  const expandedBuyBox = showBuyBoxFull || showLeftBundle;

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
    <div className="relative">
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
                className="absolute left-4 p-2 bg-white/10 hover:bg-white/20 rounded text-white transition-colors z-50"
              >
                <ArrowLeft size={32} />
              </button>
            )}

            <img
              src={mainImage}
              alt={product.name}
              loading="lazy"
              decoding="async"
              className="max-w-full max-h-full object-contain"
            />

            {gallery.length > 1 && (
              <button
                onClick={handleNextImage}
                className="absolute right-4 p-2 bg-white/10 hover:bg-white/20 rounded text-white transition-colors z-50"
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
                <img
                  src={img}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover"
                />
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

      <div className="container mx-auto px-4 mb-0">
        {/* Main Grid Layout */}
        <div
          className="grid grid-cols-1 lg:flex lg:flex-row gap-[3rem] mb-0 items-start relative px-0"
          style={{ paddingTop: contentPaddingTop }}
        >
          {/* Background Highlight for Left Section - Bleeds to left edge of screen and stops at right column */}
          <div className="absolute inset-y-0 -left-[100vw] lg:right-[calc(55%+0.5rem)] bg-gray-50 z-10 hidden lg:block" />

          {/* LEFT COLUMN: Sticky Image + Overlapping Sticky Control Box */}
          <div
            className={`w-full lg:w-[46%] ${
              isMobile ? "" : "sticky top-[190px] h-[calc(100vh-220px)]"
            } flex flex-col relative z-30`}
            style={{ paddingLeft: "0" }}
          >
            {/* <div
              className={`bundleContainer w-full transition-all duration-500 ease-out absolute bottom-0 overflow-hidden z-[9999] pr-3 ${
                showLeftBundle
                  ? "max-h-[420px] opacity-100 translate-y-0 mb-4"
                  : "max-h-0 opacity-0 translate-y-6 mb-0 pointer-events-none"
              }`}
            > */}
            {/* Product Bundle Section - Shows on scroll */}
            {/* <BundledProducts
                product={product}
                allProducts={allProducts}
                addToCart={addToCart}
              />
            </div> */}

            {/* Image Container */}
            <div className="flex-1 bg-[#F9F9F9] relative group cursor-zoom-in overflow-hidden flex flex-col">
              {/* Main Image */}
              <div className="w-full h-full flex items-center justify-center p-6 pl-0">
                <img
                  src={mainImage}
                  alt={product.name}
                  loading="eager"
                  decoding="async"
                  className="max-w-full max-h-full object-contain transition-transform duration-300 group-hover:scale-105 mix-blend-multiply"
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
                        className={`w-2.5 h-2.5 rounded transition-all ${
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
                  className={`absolute bottom-4 left-0 right-4 bg-white rounded z-30 transition-all duration-500 ${
                    !expandedBuyBox
                      ? "opacity-0 translate-y-4 pointer-events-none p-3"
                      : "opacity-100 translate-y-0 p-5"
                  }`}
                >
                  {/* EXPANDABLE SECTION: Brand, Title, Price, Stock */}
                  <div className="overflow-hidden transition-all duration-500 ease-in-out max-h-[220px] opacity-100 mb-3 border-b border-gray-200 pb-1">
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

                    <div className="mt-3 w-full hidden sm:block"></div>
                  </div>

                  {/* Controls */}
                  <div className="flex flex-col gap-3">
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
                        className="flex-1 bg-belims-blue text-white font-bold text-sm h-11 rounded hover:bg-red-600 transition-all active:scale-95 font-heading flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {product.stock > 0 ? "Add to cart" : "Out of Stock"}
                      </button>

                      {/* <button
                        onClick={handleBuyNowAction}
                        disabled={product.stock === 0}
                        className="flex-1 bg-belims-accent text-white font-bold text-sm h-11 rounded hover:bg-orange-600 transition-all active:scale-95 font-heading flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <Zap size={18} fill="currentColor" />{" "}
                        {product.stock > 0 ? "Buy Now" : "Out of Stock"}
                      </button> */}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="w-full lg:w-[54%] flex flex-col gap-3 py-10 pb-3 bg-white z-11 relative">
            {/* Header Info */}
            <div>
              <div className="mb-4">
                <h1 className="text-2xl font-bold text-gray-900 font-heading letterspacing-tight mb-0">
                  {product.name}
                </h1>

                <div className="text-xs text-gray-400 font-mono">
                  SKU: {product.sku || "N/A"}
                </div>
                {product.features && product.features.length > 0 && (
                  <div className="mt-4">
                    <h3 className="font-bold text-base text-gray-900 font-heading group-hover:text-belims-blue transition-colors mb-2">
                      Key Features:
                    </h3>
                    <ul className="space-y-1">
                      {product.features.map((feature, idx) => (
                        <li
                          key={idx}
                          className="text-[12px] text-gray-600 flex items-center gap-2 linex"
                        >
                          <Target
                            size={8}
                            className="text-green-600 flex-shrink-0 mt-0.5"
                          />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* BUY BOX */}
            <div ref={rightBuyBoxRef} className="">
              {/* Price row */}
              <div className="flex justify-between items-start mb-4 border-b border-gray-200 pb-4">
                <div className="flex-1">
                  <ProductPriceDisplay
                    product={product}
                    deal={
                      isTradeSpecial && !isTradeApproved && !showTradeDeal
                        ? undefined
                        : product.deals_resolved?.consumer
                    }
                    overridePrice={
                      (isTradeApproved || showTradeDeal) && isTradeSpecial
                        ? pricingInfo.tradePrice
                        : undefined
                    }
                    isTradeToggleActive={isTradeApproved || showTradeDeal}
                    showDualTradePricing={false}
                    showCountdown={false}
                  />
                  <StockBar current={product.stock} max={product.maxStock} />
                </div>

                {product.isBundle &&
                  !(isTradeSpecial && !isTradeApproved && !showTradeDeal) && (
                    <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded ml-4 flex-shrink-0">
                      Bundle Savings
                    </span>
                  )}
              </div>

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
                    className="flex-1 bg-belims-blue text-white font-semibold text-base h-12 rounded hover:bg-red-600 transition-all active:scale-95 font-heading flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {product.stock > 0 ? "Add to cart" : "Out of Stock"}
                  </button>
                </div>
              </div>

              {/* Trade Price Block */}
              {pricingInfo.hasTradePrice && isTradeSpecial && (
                <div className="mb-4 mt-6 bg-blue-50 border border-blue-200 rounded p-5">
                  {isTradeApproved ? (
                    // Approved users: Always show trade deal details
                    <>
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <h3 className="text-sm font-bold text-gray-700">
                          Trade price
                        </h3>
                        <span className="bg-green-100 border uppercase border-green-500 px-5 py-1 text-xs font-extrabold text-green-700 rounded-full tabular-nums">
                          Applied
                        </span>
                      </div>

                      {/* Summary grid */}
                      <div className="grid grid-cols-3 gap-3 text-center rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                        <div className="flex flex-col items-center justify-center">
                          <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                            Retail
                          </div>
                          <div className="mt-1 text-base font-bold text-gray-900 tabular-nums">
                            {CURRENCY_SYMBOL}
                            {pricingInfo.retailPrice.toFixed(2)}
                          </div>
                        </div>
                        <div className="relative flex flex-col items-center justify-center rounded bg-belims-blue p-3">
                          <div className="text-[10px] font-bold text-white uppercase tracking-wide">
                            Trade
                          </div>
                          <div className="mt-1 text-base font-extrabold text-white tabular-nums">
                            {CURRENCY_SYMBOL}
                            {pricingInfo.tradePrice.toFixed(2)}
                          </div>

                          {/* <div className="mt-2 inline-flex items-center rounded-full bg-belims-blue/10 px-2 py-0.5 text-[10px] font-semibold text-belims-blue">
                            Trade special
                          </div> */}
                        </div>
                        <div className="flex flex-col items-center justify-center">
                          <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                            Discount
                          </div>
                          <div className="mt-1 inline-flex items-center gap-1 rounded bg-green-100 border border-green-500 px-5 py-1 text-sm font-extrabold text-green-700 tabular-nums">
                            {CURRENCY_SYMBOL}
                            {pricingInfo.savings.toFixed(2)}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 text-xs text-gray-600 text-center">
                        <span className="font-medium">
                          Trade pricing applied.
                        </span>
                      </div>
                    </>
                  ) : (
                    // Non-approved users: Collapsible trade deal section
                    <>
                      {!showTradeDeal ? (
                        // Collapsed state: Show message and button
                        <div className="collapsedBlock">
                          <div className="text-sm font-bold text-gray-900 mb-1">
                            Trade pricing available
                          </div>
                          <div className="text-xs text-gray-600 mb-5">
                            Available to contractors with a Belims trade
                            account.
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowTradeDeal(true)}
                            className="w-full border-2 border-belims-blue text-belims-blue bg-white font-bold text-sm py-2.5 px-4 rounded hover:bg-belims-blue hover:text-white transition-all"
                          >
                            VIEW TRADE DEAL
                          </button>
                          <div className="flex flex-col sm:flex-row sm:justify-center sm:items-center gap-4 mt-2">
                            <a
                              href="/trade-accounts"
                              className="mt-3 text-center text-xs text-gray-500 underline hover:text-gray-700"
                            >
                              Learn about the Belims trade accounts
                            </a>
                            <a
                              href="/trade-accounts"
                              className="inline mt-3 text-center text-xs text-gray-500 underline hover:text-gray-700"
                            >
                              Register for a Belims trade account
                            </a>
                          </div>
                        </div>
                      ) : (
                        // Expanded state: Show full trade deal details
                        <>
                          <div className="flex items-center justify-between gap-3 mb-3">
                            <div className="expandedTitle">
                              <div className="text-sm font-bold text-gray-900 mb-1">
                                Trade deal details
                              </div>
                              <div className="text-xs text-gray-600 mb-3">
                                Available to contractors with a Belims trade
                                account.
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => setShowTradeDeal(false)}
                              className="text-[11px] font-bold uppercase tracking-wide text-gray-600 bg-white px-2 py-1 rounded border border-gray-300 hover:border-gray-400 transition-colors"
                            >
                              VIEW RETAIL PRICE
                            </button>
                          </div>

                          {/* Summary grid */}
                          <div className="grid grid-cols-3 gap-3 text-center rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                            <div className="flex flex-col items-center justify-center">
                              <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                                Retail
                              </div>
                              <div className="mt-1 text-base font-bold text-gray-900 tabular-nums">
                                {CURRENCY_SYMBOL}
                                {pricingInfo.retailPrice.toFixed(2)}
                              </div>
                            </div>
                            <div className="relative flex flex-col items-center justify-center rounded-lg bg-orange-100 p-2">
                              <div className="text-[10px] font-bold text-orange-700 uppercase tracking-wide">
                                Trade
                              </div>
                              <div className="mt-1 text-base font-extrabold text-orange-700 tabular-nums">
                                {CURRENCY_SYMBOL}
                                {pricingInfo.tradePrice.toFixed(2)}
                              </div>

                              <div className="mt-2 inline-flex items-center rounded-full bg-belims-accent px-4 py-0.5 text-[10px] font-semibold text-white">
                                Trade discount
                              </div>
                            </div>
                            <div className="flex flex-col items-center justify-center">
                              <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                                Save
                              </div>
                              <div className="mt-1 inline-flex items-center gap-1 rounded bg-green-100 border border-green-500 px-5 py-1 text-sm font-extrabold text-green-700 tabular-nums">
                                {CURRENCY_SYMBOL}
                                {pricingInfo.savings.toFixed(2)}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row sm:justify-center sm:items-center gap-4 mt-2">
                            <a
                              href="/trade-accounts"
                              className="mt-3 text-center text-xs text-gray-500 underline hover:text-gray-700"
                            >
                              Learn about the Belims trade accounts
                            </a>
                            <a
                              href="/trade-accounts"
                              className="inline mt-3 text-center text-xs text-gray-500 underline hover:text-gray-700"
                            >
                              Register for a Belims trade account
                            </a>
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Pickup and Delivery Buttons */}
            <div className="mb-4 border-b border bg-gray-50 border-gray-200 py-6 px-5 rounded-lg">
              <div className="font-bold text-gray-900 font-heading text-lg  group-hover:text-belims-blue transition-colors mb-4">
                Available pickup or delivery
              </div>
              <FulfillmentTiles
                selectedType={fulfillmentType}
                onSelect={setFulfillmentType}
                onSetDeliveryLocation={handleOpenDeliveryLocation}
                deliveryLocationSet={hasDeliveryLocation}
                deliveryAddress={deliveryAddress}
                pickup={{
                  type: "pickup",
                  available: product.stock,
                  eta: "Today",
                  price: 0,
                  isFree: true,
                }}
                delivery={{
                  type: "delivery",
                  available: product.stock,
                  eta: earliestDeliveryEta,
                  price:
                    deliveryRates.length > 0 ? deliveryRates[0].total_price : 0,
                  isFree:
                    deliveryRates.length > 0
                      ? deliveryRates[0].total_price === 0
                      : false,
                }}
                onSchedulePickup={() => setIsLocatorOpen(true)}
                loading={loadingDeliveryRates}
              />

              {/* Delivery Rates Listing */}
              {fulfillmentType === "delivery" &&
                hasDeliveryLocation &&
                (loadingDeliveryRates ||
                  !!deliveryRatesError ||
                  deliveryRates.length > 0) && (
                  <div className="mt-6">
                    <div className="font-bold text-gray-900 font-heading group-hover:text-belims-blue transition-colors mb-3">
                      Available options
                    </div>

                    {loadingDeliveryRates ? (
                      <div className="flex items-center justify-center gap-2 py-6 text-gray-500">
                        <RefreshCw size={16} className="animate-spin" />
                        <span className="text-xs">
                          Finding delivery options...
                        </span>
                      </div>
                    ) : deliveryRatesError ? (
                      <div className="rounded border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                        <p>{deliveryRatesError}</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-1 gap-3">
                        {deliveryRates.map((rate, idx) => {
                          const tier = classifyRate(rate, deliveryRates);
                          const isSelected =
                            selectedDeliveryOptionId === `rate-${idx}`;
                          const isFaster = tier === "Express";

                          return (
                            <DeliveryRateOption
                              key={`rate-${idx}`}
                              option={{
                                id: `rate-${idx}`,
                                serviceName: rate.service_name,
                                eta: formatEta(rate.expected_delivery_date),
                                price: rate.total_price,
                                isFree: rate.total_price === 0,
                                badge: isFaster ? "Faster" : undefined,
                                isFaster: isFaster,
                              }}
                              isSelected={isSelected}
                              onSelect={(id) => {
                                setSelectedDeliveryOptionId(id);
                                sessionStorage.setItem(
                                  "selectedDeliveryOptionId",
                                  id,
                                );
                              }}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
            </div>

            {/* Product Description */}
            <div className="bg-white rounded p-0">
              <h3 className="font-bold text-gray-900 font-heading text-medium mb-4">
                Product Description
              </h3>
              <div className="prose prose-sm max-w-none text-gray-700 text-[13px] [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-gray-900 [&_h3]:mt-4 [&_h3]:mb-2 [&_h4]:text-sm [&_h4]:font-semibold [&_h4]:text-gray-800 [&_h4]:mt-3 [&_h4]:mb-2 [&_strong]:font-bold [&_strong]:text-gray-900 [&_b]:font-bold [&_b]:text-gray-900 [&_em]:italic [&_i]:italic [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ul]:mb-3 [&_ul]:mt-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1 [&_ol]:mb-3 [&_ol]:mt-2 [&_li]:text-gray-700 [&_li]:leading-relaxed [&_p]:mb-2 [&_p]:leading-relaxed [&_br]:content-[''] [&_table]:w-full [&_table]:border-collapse [&_table]:mb-3 [&_th]:border [&_th]:border-gray-300 [&_th]:bg-gray-100 [&_th]:p-2 [&_th]:text-left [&_th]:font-semibold [&_td]:border [&_td]:border-gray-300 [&_td]:p-2">
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
            <div className="border rounded border-gray-200 bg-gray-100 py-6 mt-4">
              <div className="mb-0 centered-flex gap-2">
                {/* Payment & Security */}
                <div className="flex flex-wrap justify-center gap-3 mb-0">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="33"
                    height="20"
                    viewBox="0 0 33 20"
                    fill="none"
                  >
                    <path
                      d="M16.5 16.85C14.9081 18.2384 12.8717 19.0018 10.7651 19C5.8823 19 1.92419 14.9705 1.92419 10C1.92419 5.0295 5.8823 1 10.7651 1C12.9538 1 14.9562 1.8095 16.5 3.15C18.0919 1.76164 20.1284 0.998188 22.2349 1C27.1177 1 31.0758 5.0295 31.0758 10C31.0758 14.9705 27.1177 19 22.2349 19C20.1284 19.0018 18.0919 18.2384 16.5 16.85Z"
                      fill="#ED0006"
                    ></path>
                    <path
                      d="M16.5001 16.85C17.4775 16.0006 18.261 14.9488 18.7972 13.7666C19.3333 12.5843 19.6094 11.2995 19.6066 10C19.6094 8.70048 19.3333 7.41567 18.7972 6.23343C18.261 5.05119 17.4775 3.99941 16.5001 3.15C18.092 1.76164 20.1285 0.998188 22.2351 1C27.1178 1 31.0759 5.0295 31.0759 10C31.0759 14.9705 27.1178 19 22.2351 19C20.1285 19.0018 18.092 18.2384 16.5001 16.85Z"
                      fill="#F9A000"
                    ></path>
                    <path
                      d="M16.5002 16.8494C17.4775 16 18.261 14.9482 18.7972 13.766C19.3333 12.5837 19.6094 11.2989 19.6066 9.99941C19.6094 8.69989 19.3333 7.41508 18.7972 6.23284C18.261 5.0506 17.4775 3.99882 16.5002 3.14941C15.5229 3.99887 14.7394 5.05067 14.2034 6.23291C13.6673 7.41514 13.3913 8.69993 13.3942 9.99941C13.3913 11.2989 13.6673 12.5837 14.2034 13.7659C14.7394 14.9482 15.5229 16 16.5002 16.8494Z"
                      fill="#FF5E00"
                    ></path>
                  </svg>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="34"
                    height="20"
                    viewBox="0 0 34 20"
                    fill="none"
                  >
                    <g clipPath="url(#clip0_9598_4481)">
                      <path
                        d="M8.37382 15.2505H5.49963L3.34412 6.97633C3.24183 6.59553 3.02453 6.25899 2.70494 6.10059C1.90782 5.70166 1.02908 5.38486 0.0703125 5.22486V4.90593H4.70092C5.3401 4.90593 5.81922 5.38486 5.89872 5.94059L7.01702 11.9097L9.89015 4.90593H12.6848L8.37382 15.2505ZM14.2828 15.2505H11.5681L13.8031 4.90539H16.5178L14.2828 15.2505ZM20.0301 7.77153C20.1096 7.21419 20.5893 6.89579 21.1484 6.89579C22.0272 6.81579 22.9843 6.97579 23.783 7.37313L24.2622 5.14539C23.4734 4.83414 22.6343 4.67196 21.7871 4.66699C19.153 4.66699 17.2354 6.10006 17.2354 8.08886C17.2354 9.60139 18.5933 10.3961 19.5521 10.8745C20.5893 11.3518 20.9884 11.6702 20.9089 12.1475C20.9089 12.8633 20.1096 13.1822 19.3125 13.1822C18.3537 13.1822 17.3955 12.9433 16.5178 12.5449L16.0387 14.7737C16.9975 15.1705 18.0341 15.3305 18.9929 15.3305C21.9471 15.4094 23.783 13.9774 23.783 11.8291C23.783 9.12299 20.0301 8.96459 20.0301 7.77153ZM33.2838 15.2505L31.1283 4.90539H28.8122C28.3331 4.90539 27.854 5.22433 27.6939 5.70113L23.703 15.2505H26.4972L27.0547 13.739H30.4886L30.8082 15.2505H33.2838ZM29.2124 7.69153L30.01 11.5902H27.7745L29.2124 7.69153Z"
                        fill="#172B85"
                      ></path>
                    </g>
                    <defs>
                      <clipPath id="clip0_9598_4481">
                        <rect width="34" height="20" fill="white"></rect>
                      </clipPath>
                    </defs>
                  </svg>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="44"
                    height="20"
                    viewBox="0 0 44 20"
                    fill="none"
                  >
                    <g clipPath="url(#clip0_9598_4484)">
                      <path
                        d="M7.79347 5.37018C7.25507 5.00065 6.55251 4.81543 5.68578 4.81543H2.33027C2.06456 4.81543 1.91777 4.9481 1.88988 5.21313L0.52674 13.7558C0.512573 13.8398 0.533599 13.9165 0.589624 13.9862C0.645329 14.0562 0.715393 14.091 0.799304 14.091H2.39315C2.6727 14.091 2.82635 13.9586 2.85456 13.6931L3.232 11.3901C3.24578 11.2785 3.29494 11.1877 3.37885 11.1178C3.4627 11.0481 3.56757 11.0024 3.69341 10.9815C3.81924 10.9608 3.93789 10.9503 4.04994 10.9503C4.16168 10.9503 4.29443 10.9574 4.44847 10.9713C4.60212 10.9852 4.70007 10.992 4.74206 10.992C5.94437 10.992 6.88809 10.6538 7.57328 9.97658C8.25815 9.29965 8.60097 8.36097 8.60097 7.16033C8.60097 6.33677 8.33161 5.74004 7.79347 5.36992V5.37018ZM6.06334 7.9353C5.99321 8.42394 5.81168 8.74484 5.51809 8.89844C5.22443 9.05223 4.80501 9.12865 4.25982 9.12865L3.5677 9.14964L3.9243 6.90919C3.95212 6.75578 4.04296 6.67898 4.19687 6.67898H4.59546C5.15443 6.67898 5.56014 6.75943 5.8118 6.91969C6.06334 7.08033 6.14725 7.41901 6.06334 7.9353Z"
                        fill="#003087"
                      ></path>
                      <path
                        d="M43.2048 4.81543H41.653C41.4988 4.81543 41.4081 4.89223 41.3804 5.04577L40.0171 13.7562L39.9961 13.798C39.9961 13.8682 40.0241 13.9342 40.0801 13.997C40.1358 14.0597 40.206 14.0911 40.2898 14.0911H41.6741C41.9394 14.0911 42.0862 13.9588 42.1146 13.6934L43.4777 5.12954V5.10874C43.4776 4.91335 43.3864 4.81562 43.2048 4.81562V4.81543Z"
                        fill="#009CDE"
                      ></path>
                      <path
                        d="M24.4558 8.18667C24.4558 8.11704 24.4278 8.05061 24.3721 7.98789C24.316 7.92511 24.2531 7.89355 24.1833 7.89355H22.5685C22.4144 7.89355 22.2887 7.9637 22.191 8.1029L19.968 11.3695L19.0453 8.22866C18.975 8.00543 18.8214 7.89355 18.5839 7.89355H17.0108C16.9407 7.89355 16.8778 7.92504 16.8222 7.98789C16.7661 8.05061 16.7383 8.11711 16.7383 8.18667C16.7383 8.21483 16.8746 8.62642 17.1472 9.42207C17.4198 10.2178 17.7134 11.0763 18.028 11.9977C18.3426 12.9189 18.5067 13.4077 18.5208 13.4632C17.3743 15.0267 16.8012 15.8643 16.8012 15.9758C16.8012 16.1574 16.8921 16.248 17.0739 16.248H18.6887C18.8424 16.248 18.9682 16.1784 19.0662 16.0387L24.4141 8.33311C24.4419 8.30539 24.4558 8.25675 24.4558 8.18661V8.18667Z"
                        fill="#003087"
                      ></path>
                      <path
                        d="M39.4927 7.89369H37.8988C37.7029 7.89369 37.5844 8.12403 37.5425 8.5847C37.1785 8.02662 36.5148 7.74707 35.55 7.74707C34.5433 7.74707 33.6868 8.12403 32.9809 8.87782C32.2748 9.63168 31.9219 10.5182 31.9219 11.5371C31.9219 12.3608 32.163 13.0168 32.6453 13.5052C33.1276 13.9941 33.7742 14.2381 34.5854 14.2381C34.9907 14.2381 35.4032 14.1542 35.8226 13.9868C36.2421 13.8193 36.5703 13.5961 36.8084 13.3168C36.8084 13.3308 36.7942 13.3935 36.7665 13.5051C36.7383 13.617 36.7245 13.7009 36.7245 13.7564C36.7245 13.98 36.8151 14.0913 36.9972 14.0913H38.4444C38.7096 14.0913 38.8637 13.959 38.9055 13.6935L39.7654 8.22861C39.7792 8.14483 39.7583 8.06816 39.7025 7.99827C39.6464 7.9287 39.5766 7.89369 39.4927 7.89369ZM36.7559 12.0186C36.3994 12.3676 35.9694 12.5421 35.4662 12.5421C35.0605 12.5421 34.7323 12.4306 34.4805 12.2071C34.2287 11.9842 34.1028 11.6771 34.1028 11.2858C34.1028 10.7697 34.2776 10.3332 34.6273 9.97722C34.9764 9.62125 35.4102 9.44326 35.9275 9.44326C36.3187 9.44326 36.6438 9.55846 36.9026 9.78867C37.1611 10.019 37.2908 10.3367 37.2908 10.7415C37.2907 11.244 37.1124 11.6698 36.7559 12.0186Z"
                        fill="#009CDE"
                      ></path>
                      <path
                        d="M15.6686 7.89369H14.0748C13.8787 7.89369 13.7602 8.12403 13.7182 8.5847C13.3407 8.02662 12.6765 7.74707 11.7258 7.74707C10.7191 7.74707 9.86266 8.12403 9.15669 8.87782C8.45054 9.63168 8.09766 10.5182 8.09766 11.5371C8.09766 12.3608 8.33887 13.0168 8.82125 13.5052C9.30362 13.9941 9.95009 14.2381 10.7611 14.2381C11.1524 14.2381 11.5581 14.1542 11.9775 13.9868C12.3969 13.8193 12.7325 13.5961 12.9841 13.3168C12.928 13.4842 12.9002 13.6308 12.9002 13.7564C12.9002 13.98 12.9911 14.0913 13.1728 14.0913H14.6199C14.8853 14.0913 15.0393 13.959 15.0813 13.6935L15.9411 8.22861C15.9549 8.14483 15.9339 8.06816 15.8782 7.99827C15.8223 7.9287 15.7525 7.89369 15.6686 7.89369ZM12.9318 12.029C12.5752 12.3715 12.138 12.5421 11.6211 12.5421C11.2153 12.5421 10.8903 12.4306 10.6458 12.2071C10.401 11.9842 10.2787 11.6771 10.2787 11.2858C10.2787 10.7697 10.4534 10.3332 10.8031 9.97722C11.1524 9.62125 11.5859 9.44326 12.1034 9.44326C12.4946 9.44326 12.8197 9.55846 13.0786 9.78873C13.3371 10.0191 13.4666 10.3368 13.4666 10.7416C13.4666 11.258 13.2883 11.6874 12.9318 12.029Z"
                        fill="#003087"
                      ></path>
                      <path
                        d="M31.6178 5.37018C31.0794 5.00065 30.377 4.81543 29.5101 4.81543H26.1755C25.8958 4.81543 25.7419 4.9481 25.7142 5.21313L24.351 13.7558C24.3368 13.8398 24.3578 13.9165 24.4138 13.9863C24.4693 14.0562 24.5396 14.091 24.6235 14.091H26.3431C26.5109 14.091 26.6227 14.0003 26.6787 13.8188L27.0563 11.3901C27.0701 11.2785 27.1191 11.1877 27.2031 11.1178C27.287 11.0481 27.3917 11.0024 27.5177 10.9815C27.6435 10.9608 27.7621 10.9503 27.8742 10.9503C27.986 10.9503 28.1187 10.9574 28.2726 10.9713C28.4263 10.9852 28.5246 10.992 28.5662 10.992C29.7687 10.992 30.7122 10.6538 31.3974 9.97658C32.0826 9.29965 32.4251 8.36097 32.4251 7.16033C32.4252 6.33684 32.1559 5.7401 31.6178 5.36999V5.37018ZM29.4681 8.81466C29.1605 9.02401 28.6991 9.12865 28.084 9.12865L27.4129 9.14964L27.7694 6.90919C27.7971 6.75578 27.888 6.67898 28.042 6.67898H28.4194C28.7269 6.67898 28.9715 6.69293 29.1536 6.72077C29.3351 6.74893 29.5101 6.83591 29.6779 6.98247C29.8457 7.12909 29.9296 7.34202 29.9296 7.62119C29.9296 8.20743 29.7756 8.60519 29.4681 8.81466Z"
                        fill="#009CDE"
                      ></path>
                    </g>
                    <defs>
                      <clipPath id="clip0_9598_4484">
                        <rect width="44" height="20" fill="white"></rect>
                      </clipPath>
                    </defs>
                  </svg>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="43"
                    height="20"
                    viewBox="0 0 43 20"
                    fill="none"
                  >
                    <path
                      d="M31.5822 4.25383L30.7542 6.17327H32.4148L31.5822 4.25383ZM22.027 5.44327C22.1831 5.36537 22.275 5.19594 22.275 4.98553C22.275 4.77934 22.1785 4.63001 22.0224 4.55983C21.8803 4.48205 21.6615 4.47306 21.4518 4.47306H19.9704V5.54253H21.432C21.666 5.54259 21.8617 5.5393 22.027 5.44327ZM3.04444 4.25383L2.22576 6.17327H3.86806L3.04444 4.25383ZM41.161 16.5503H38.8377V15.5176H41.1517C41.3811 15.5176 41.5417 15.4888 41.6384 15.3983C41.7299 15.3176 41.7816 15.2035 41.7807 15.0843C41.7807 14.9439 41.7224 14.8325 41.6336 14.7658C41.5465 14.6923 41.4192 14.6588 41.2097 14.6588C40.0801 14.6221 38.6708 14.6922 38.6708 13.1682C38.6708 12.4698 39.1345 11.7345 40.397 11.7345H42.7935V10.7763H40.5669C39.895 10.7763 39.4068 10.9302 39.0612 11.1697V10.7763H35.7679C35.2414 10.7763 34.6232 10.9012 34.3309 11.1697V10.7763H28.4496V11.1697C27.9816 10.8467 27.1918 10.7763 26.8275 10.7763H22.9482V11.1697C22.578 10.8267 21.7544 10.7763 21.2527 10.7763H16.9112L15.9178 11.8048L14.9873 10.7763H8.50197V17.4967H14.865L15.8885 16.4517L16.8528 17.4967L20.775 17.5V15.9191H21.1607C21.6811 15.9271 22.2948 15.9069 22.8365 15.683V17.4965H26.0716V15.7449H26.2276C26.4267 15.7449 26.4465 15.7528 26.4465 15.9432V17.4961H36.2744C36.8983 17.4961 37.5506 17.3435 37.9117 17.0659V17.4961H41.0291C41.6777 17.4961 42.3113 17.4091 42.7933 17.1864V15.9346C42.5012 16.3433 41.9315 16.5506 41.1609 16.5506L41.161 16.5503ZM21.2122 14.9635H19.7111V16.5788H17.3727L15.8913 14.9846L14.3518 16.5788H9.58632V11.7629H14.4251L15.9052 13.3415L17.4355 11.7629H21.2797C22.2345 11.7629 23.3072 12.0158 23.3072 13.3495C23.3072 14.6873 22.2638 14.9635 21.2122 14.9635ZM28.4306 14.7451C28.6006 14.9802 28.6251 15.1996 28.63 15.6242V16.5789H27.4221V15.9764C27.4221 15.6867 27.4513 15.2576 27.2276 15.0337C27.052 14.8613 26.7839 14.8201 26.3449 14.8201H25.0592V16.5789H23.8504V11.763H26.6278C27.2371 11.763 27.6806 11.7889 28.0755 11.9902C28.4552 12.2096 28.6941 12.5103 28.6941 13.0597C28.694 13.8283 28.1581 14.2204 27.8414 14.3409C28.1091 14.4354 28.3279 14.6048 28.4306 14.7451ZM33.4003 12.7589H30.583V13.6344H33.3314V14.617H30.583V15.5753L33.4003 15.5795V16.5788H29.3849V11.7629H33.4003V12.7589ZM36.4917 16.5788H34.1486V15.5461H36.4824C36.7107 15.5461 36.8725 15.5172 36.9739 15.4267C37.0565 15.3523 37.116 15.244 37.116 15.1129C37.116 14.9724 37.0516 14.861 36.9692 14.7941C36.8771 14.7207 36.7501 14.6875 36.5407 14.6875C35.4156 14.6506 34.0066 14.7206 34.0066 13.1968C34.0066 12.4982 34.4655 11.763 35.7267 11.763H38.1387V12.7878H35.9316C35.7129 12.7878 35.5707 12.7958 35.4497 12.875C35.3178 12.953 35.269 13.0687 35.269 13.2214C35.269 13.403 35.3809 13.5267 35.5322 13.5801C35.6591 13.6223 35.7954 13.6347 36.0003 13.6347L36.6481 13.6516C37.3009 13.6666 37.7494 13.7749 38.0219 14.0388C38.256 14.2706 38.3818 14.5635 38.3818 15.0591C38.3817 16.0951 37.705 16.5788 36.4917 16.5788ZM27.1609 12.8366C27.0156 12.754 26.8011 12.7496 26.587 12.7496H25.1055V13.8312H26.5672C26.8012 13.8312 27.0002 13.8232 27.1609 13.7319C27.3169 13.6417 27.4102 13.4756 27.4102 13.2697C27.4102 13.0637 27.3169 12.9146 27.1609 12.8366ZM40.603 12.7495C40.3842 12.7495 40.2386 12.7574 40.1161 12.8365C39.9892 12.9146 39.9404 13.0302 39.9404 13.183C39.9404 13.3646 40.0476 13.4882 40.2035 13.5418C40.3305 13.584 40.4666 13.5963 40.667 13.5963L41.3192 13.6129C41.9771 13.6285 42.4165 13.7368 42.6843 14.0008C42.7331 14.0374 42.7624 14.0786 42.7959 14.1199V12.7496H40.6031L40.603 12.7495ZM21.2539 12.7495H19.6852V13.9761H21.2399C21.7022 13.9761 21.9896 13.7566 21.9898 13.34C21.9896 12.9189 21.6882 12.7495 21.2539 12.7495ZM10.7846 12.7495V13.6251H13.4257V14.6077H10.7846V15.5658H13.7424L15.1167 14.153L13.8008 12.7495H10.7846ZM18.5083 16.1173V12.2563L16.6612 14.1557L18.5083 16.1173ZM10.8855 8.38512V9.21492H20.9367L20.9321 7.45944H21.1266C21.2628 7.46399 21.3024 7.47599 21.3024 7.69111V9.21498H26.501V8.80626C26.9203 9.02122 27.5724 9.21498 28.4306 9.21498H30.6177L31.0857 8.14556H32.1234L32.5812 9.21498H36.7956V8.19914L37.4337 9.21492H40.811V2.5H37.4688V3.29305L37.0007 2.5H33.5711V3.29305L33.1414 2.5H28.5087C27.7331 2.5 27.0516 2.60353 26.501 2.89211V2.5H23.304V2.89211C22.9535 2.59466 22.4761 2.5 21.9453 2.5H10.2656L9.48202 4.23444L8.67722 2.5H4.9985V3.29305L4.59429 2.5H1.45696L5.48677e-05 5.69279V8.24669L2.15438 3.43186H3.94192L5.98793 7.99048V3.43186H7.95159L9.52602 6.69811L10.9724 3.43186H12.9755V8.24669H11.7423L11.7378 4.4758L9.99327 8.24669H8.93696L7.18794 4.47246V8.24669H4.74084L4.27858 7.17273H1.77365L1.30662 8.24669H0V9.21531H2.05567L2.51914 8.14584H3.55691L4.01917 9.21531H8.06363V8.39761L8.42461 9.2187H10.5242L10.8852 8.38528L10.8855 8.38512ZM26.7242 3.99308C27.1129 3.6088 27.7221 3.43159 28.5512 3.43159H29.7159V4.46326H28.5756C28.1368 4.46326 27.8886 4.52571 27.6499 4.74855C27.4447 4.95124 27.304 5.33448 27.304 5.83911C27.304 6.35497 27.4113 6.72687 27.6348 6.96982C27.82 7.16035 28.1567 7.21814 28.4733 7.21814H29.0138L30.7093 3.43175H32.5119L34.5488 7.98582V3.43181H36.3806L38.4954 6.78505V3.43181H39.7277V8.24647H38.0229L35.7425 4.63275V8.24647H33.2923L32.8242 7.17251H30.3249L29.8707 8.24647H28.4628C27.8781 8.24647 27.1377 8.12277 26.7184 7.7139C26.2956 7.30513 26.0758 6.75136 26.0758 5.87587C26.0755 5.1617 26.2068 4.50894 26.7242 3.99308ZM24.2496 3.43164H25.4771V8.24647H24.2496V3.43164ZM18.7151 3.43164H21.4822C22.0969 3.43164 22.5501 3.44725 22.9391 3.66227C23.3197 3.87733 23.5478 4.19133 23.5478 4.72828C23.5478 5.49602 23.0122 5.89257 22.7003 6.01172C22.9634 6.10759 23.1884 6.27691 23.2955 6.41715C23.4654 6.65664 23.4946 6.87056 23.4946 7.30053V8.24641H22.2812L22.2767 7.63923C22.2767 7.34945 22.3056 6.93279 22.0868 6.70129C21.911 6.53202 21.643 6.49515 21.2098 6.49515H19.9183V8.24647H18.7153L18.7151 3.43164ZM13.8652 3.43164H17.8842V4.43428H15.0684V5.30216H17.8166V6.28913H15.0684V7.25068H17.8842V8.24641H13.8652V3.43164Z"
                      fill="#2557D6"
                    ></path>
                  </svg>
                </div>
                <div className="flex justify-center items-center gap-2 mt-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="29"
                    height="28"
                    viewBox="0 0 29 28"
                    fill="none"
                  >
                    <path
                      d="M6.07178 8.18676C6.07177 7.50195 6.4712 6.88006 7.09397 6.59526L13.7719 3.54133C14.2341 3.32997 14.7654 3.32997 15.2276 3.54133L21.9056 6.59527C22.5283 6.88007 22.9277 7.50193 22.9278 8.18672L22.9278 14.5626C22.9279 16.2022 22.4254 17.8057 21.3948 19.0808C19.5488 21.3648 16.4535 24.7918 14.4999 24.7918C12.5463 24.7918 9.45087 21.3647 7.6049 19.0807C6.57437 17.8057 6.07189 16.2022 6.07187 14.5628L6.07178 8.18676Z"
                      fill="#16A34A"
                    ></path>
                    <path
                      d="M17.9728 10.785L13.2923 15.4655L11.0271 13.2003M14.4999 24.7918C16.4535 24.7918 19.5488 21.3648 21.3948 19.0808C22.4254 17.8057 22.9279 16.2022 22.9278 14.5626L22.9278 8.18672C22.9277 7.50193 22.5283 6.88007 21.9056 6.59527L15.2276 3.54133C14.7654 3.32997 14.2341 3.32997 13.7719 3.54133L7.09397 6.59526C6.4712 6.88006 6.07177 7.50195 6.07178 8.18676L6.07187 14.5628C6.07189 16.2022 6.57437 17.8057 7.6049 19.0807C9.45087 21.3647 12.5463 24.7918 14.4999 24.7918Z"
                      stroke="white"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    ></path>
                  </svg>
                  <p className="text-sm text-gray-600">
                    Secure checkout with encrypted payment processing
                  </p>
                </div>
              </div>
            </div>

            <div ref={rightColumnEndRef} className="h-1 w-full" />
          </div>
        </div>

        {/* Sticky Bottom CTA - All Devices */}
        <div
          data-sticky-cart-bar
          className={`fixed left-0 right-0 bottom-0 z-[260] bg-white border-t border-gray-200 px-4 py-3 transition-transform duration-300 ${
            showBottomCta ? "translate-y-0" : "translate-y-full"
          }`}
        >
          <div className="flex items-center gap-4 container mx-auto px-4">
            {/* Product Info Column */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <img
                src={product.image}
                alt={product.name}
                className="w-12 h-12 object-contain bg-gray-50 rounded border border-gray-200 flex-shrink-0"
                loading="lazy"
                decoding="async"
              />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm text-gray-900 truncate">
                  {product.name}
                </div>
                <div className="text-sm font-bold text-belims-blue">
                  {CURRENCY_SYMBOL}
                  {(
                    product.deals_resolved?.consumer?.price ?? product.price
                  ).toFixed(2)}
                </div>
              </div>
            </div>

            {/* Quantity & Add to Cart */}
            <div className="flex items-center gap-3 flex-shrink-0">
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
                className="bg-belims-blue text-white font-bold text-sm h-11 px-6 rounded hover:bg-red-600 transition-all w-[160px] active:scale-95 font-heading flex items-center justify-center gap-2 disabled:opacity-50 whitespace-nowrap"
              >
                {product.stock > 0 ? "Add to cart" : "Out of Stock"}
              </button>
            </div>

            {/* <button
              onClick={handleBuyNowAction}
              disabled={product.stock === 0}
              className="flex-1 bg-belims-accent text-white font-bold text-sm h-11 rounded hover:bg-orange-600 transition-all active:scale-95 font-heading flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Zap size={16} />{" "}
              {product.stock > 0 ? "Buy Now" : "Out of Stock"}
            </button> */}
          </div>
        </div>
      </div>

      {/* How About These Section */}
      {allProducts.length > 0 && (
        <section
          ref={howAboutTheseRef}
          className="py-12 bg-white border-t border-gray-200 mb-0"
        >
          <div className="container mx-auto px-4">
            <h3 className="text-2xl font-bold text-gray-900 font-heading mb-8">
              How about these
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {allProducts
                .filter(
                  (p) => p.id !== product.id && p.category === product.category,
                )
                .slice(0, 4)
                .map((p) => (
                  <div key={p.id}>
                    <ProductCard product={p} addToCart={addToCart} />
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
          <section className="py-12 bg-gray-50 border-t border-gray-200 mb-0">
            <div className="container mx-auto px-4">
              <h3 className="text-2xl font-bold text-gray-900 font-heading mb-8">
                Frequently bought together
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {recommendedProducts.map((p) => (
                  <div key={p.id}>
                    <ProductCard product={p} addToCart={addToCart} />
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
        }}
        onCompare={onCompare}
        currentProductId={product.id}
        isAuthenticated={isAuthenticated}
        isTradeApproved={isTradeApproved}
      />
    </div>
  );
};
