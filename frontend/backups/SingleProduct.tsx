import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Star,
  ShoppingCart,
  Truck,
  Store,
  Heart,
  Share2,
  ChevronRight,
  ChevronDown,
  Minus,
  Plus,
  Check,
  Sparkles,
  Scale,
  ShieldCheck,
  X,
  ArrowLeft,
  ArrowRight,
  Images,
  RefreshCw,
  Package,
  Zap,
  CirclePlus,
} from "lucide-react";
import { Product } from "../types";
import { CURRENCY_SYMBOL, STORES } from "../constants";
import { StockBar } from "./StockBar";
import { DeliveryOptionsModal } from "./DeliveryOptionsModal";
import { generateProductDescription } from "../services/geminiService";
import { addToRecentlyViewed } from "../services/storageService";
import { getApiBaseUrl } from "../services/wooCommerceService";
import { RecentlyViewed } from "./RecentlyViewed";
import { StoreLocator } from "./StoreLocator";
import { BundlePanel } from "./BundlePanel";
import ReactMarkdown from "react-markdown";

interface SingleProductProps {
  product: Product;
  addToCart: (product: Product) => void;
  onBuyNow: (product: Product) => void;
  onCompare: (product: Product) => void;
  onPriceMatch: (product: Product) => void;
  onBrandClick?: (brand: string) => void;
}

export const SingleProduct: React.FC<SingleProductProps> = ({
  product,
  addToCart,
  onBuyNow,
  onCompare,
  onPriceMatch,
  onBrandClick,
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
  const lastScrollYRef = useRef(0);
  const breadcrumbTop = isMobile ? 64 : 130;
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

  // Bundle Panel State
  const [isBundleOpen, setIsBundleOpen] = useState(false);
  const [isBundleSectionExpanded, setIsBundleSectionExpanded] = useState(false); // Accordion state
  const [showBundleTrigger, setShowBundleTrigger] = useState(false);

  useEffect(() => {
    addToRecentlyViewed(product);
    setMainImage(product.image);
    setQty(1);
    setAiDescription(null);
    setIsBundleSectionExpanded(false); // Reset accordion on product change
    window.scrollTo({ top: 0, behavior: "smooth" });
    setShowBottomCta(false);

    // Fetch ecommerce policies
    const apiBase = getApiBaseUrl();
    fetch(`${apiBase}/ecommerce-policies`)
      .then((res) => res.json())
      .then((data) => setEcommercePolicies(data))
      .catch((err) => console.error("Failed to fetch policies:", err));
  }, [product]);

  // Track viewport for mobile-specific UX
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px)");
    const handleChange = (e: MediaQueryListEvent | MediaQueryList) =>
      setIsMobile(e.matches);
    handleChange(mql);
    mql.addEventListener("change", handleChange as EventListener);
    return () =>
      mql.removeEventListener("change", handleChange as EventListener);
  }, []);

  // Scroll listener for progressive buy box reveal
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setScrollY(currentScrollY);

      // Show minimal buy box after 200px scroll
      setShowBuyBoxMinimal(currentScrollY > 200);

      // Mobile bottom CTA: reveal on scroll down, hide on scroll up
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
        // Expand sticky bar if scrolled past
        setIsStickyExpanded(!entry.isIntersecting && isBelow);
        // Show full buy box when price scrolls past
        setShowBuyBoxFull(!entry.isIntersecting && isBelow);

        // Show bundle trigger if scrolled past and product has bundles
        if (product.bundleCandidates && product.bundleCandidates.length > 0) {
          setShowBundleTrigger(!entry.isIntersecting && isBelow);
        }
      },
      { threshold: 0.1, rootMargin: "-140px 0px 0px 0px" },
    );

    if (rightBuyBoxRef.current) {
      observer.observe(rightBuyBoxRef.current);
    }

    return () => observer.disconnect();
  }, [product]);

  const gallery =
    product.images && product.images.length > 0
      ? product.images
      : [product.image];

  const handleAddToCart = () => {
    for (let i = 0; i < qty; i++) {
      addToCart(product);
    }
  };

  const handleBuyNowAction = () => {
    // For Buy Now, we usually just add 1 item or the current qty
    // If current qty > 1, add all? Assume yes.
    for (let i = 0; i < qty; i++) {
      addToCart(product);
    }
    // Trigger the open cart logic handled by App.tsx via onBuyNow wrapper,
    // but here onBuyNow usually takes product. We can implement it simpler:
    // Just call the prop with the product, assuming prop handles cart add + open.
    // But wait, if I call onBuyNow, it adds ONE item.
    // Let's trust the prop does the right thing for a "Buy Now" flow (Add 1 item & Checkout).
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
                className={`w-20 h-20 rounded border-2 overflow-hidden transition-all flex-shrink-0 ${mainImage === img ? "border-belims-blue opacity-100" : "border-transparent opacity-50 hover:opacity-80"}`}
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

      {/* Delivery Options Modal */}
      {isDeliveryModalOpen && (
        <DeliveryOptionsModal onClose={() => setIsDeliveryModalOpen(false)} />
      )}

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
          className="fixed bottom-24 right-4 z-40 bg-belims-accent text-white px-6 py-3 rounded-full shadow-xl font-bold font-heading flex items-center gap-2 animate-bounce hover:bg-orange-600 transition-colors"
        >
          <Package size={20} /> Bundle & Save
        </button>
      )}

      {/* Fixed Breadcrumbs */}
      {/* <div
        className="fixed left-0 right-0 bg-white/98 backdrop-blur-md border-b border-gray-200 z-50 px-6 py-4 shadow-sm"
        style={{ top: `${breadcrumbTop}px` }}
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-sm text-gray-600 flex items-center gap-2">
            <span
              className="cursor-pointer hover:text-belims-blue transition-colors"
              onClick={() => navigate(-1)}
            >
              Home
            </span>
            <ChevronRight size={14} className="text-gray-400" />
            <span className="cursor-pointer hover:text-belims-blue transition-colors">
              {product.category}
            </span>
            <ChevronRight size={14} className="text-gray-400" />
            <span className="font-bold text-gray-900 line-clamp-1">
              {product.name}
            </span>
          </div>
        </div>
      </div> */}

      <div className="container mx-auto px-4 mb-16">
        {/* Main Grid Layout */}
        <div
          className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16 items-start relative"
          style={{ paddingTop: contentPaddingTop }}
        >
          {/* LEFT COLUMN: Sticky Image + Overlapping Sticky Control Box */}
          <div
            className={`lg:col-span-7 ${isMobile ? "" : "sticky top-[190px] h-[calc(100vh-220px)]"} flex flex-col relative z-30`}
            style={{ paddingLeft: "0" }}
          >
            {/* Image Container */}
            <div className="flex-1 bg-white border border-gray-200 rounded relative group cursor-zoom-in shadow-sm overflow-hidden flex flex-col">
              {/* Gallery Trigger (Top Left) */}
              <button
                onClick={() => setIsGalleryOpen(true)}
                className="absolute top-4 left-4 bg-white/90 backdrop-blur text-gray-800 px-4 py-2 rounded-full shadow-md hover:bg-belims-blue hover:text-white transition-all z-20 flex items-center gap-2 text-sm font-bold font-heading hover:scale-105"
              >
                <Images size={16} /> View Gallery{" "}
                {gallery.length > 1 ? `(+${gallery.length - 1})` : ""}
              </button>

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
                        className={`w-2.5 h-2.5 rounded-full transition-all ${active ? "bg-belims-blue scale-110" : "bg-gray-300 hover:bg-belims-blue/70"}`}
                        aria-label={`Go to image ${idx + 1}`}
                      />
                    );
                  })}
                </div>
              )}

              {/* STICKY OVERLAP BAR (Bottom Aligned) - Progressive Reveal (Desktop/Tablet only) */}
              {!isMobile && (
                <div
                  className={`absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-md rounded border border-gray-200 shadow-2xl z-30 transition-all duration-500 ${!showBuyBoxMinimal ? "opacity-0 translate-y-4 pointer-events-none" : "opacity-100 translate-y-0"} ${showBuyBoxFull ? "p-5" : "p-3"}`}
                >
                  {/* EXPANDABLE SECTION: Brand, Title, Price, Stock */}
                  {/* Only visible when right column buy box is scrolled out AND in full mode */}
                  <div
                    className={`overflow-hidden transition-all duration-500 ease-in-out ${isStickyExpanded && showBuyBoxFull ? "max-h-[200px] opacity-100 mb-3 border-b border-gray-100 pb-3" : "max-h-0 opacity-0"}`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <div
                          className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-0.5 hover:text-belims-blue cursor-pointer transition-colors"
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
                        <div className="text-2xl font-extrabold text-belims-blue font-heading">
                          {CURRENCY_SYMBOL}
                          {product.price.toFixed(2)}
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

                  {/* PROGRESSIVE SECTION: Controls & Fulfillment */}
                  <div
                    className={`flex flex-col transition-all duration-300 ${showBuyBoxFull ? "gap-3" : "gap-2"}`}
                  >
                    {showBuyBoxFull ? (
                      // FULL MODE: Add to Cart and Buy Now - Side by Side with Quantity
                      <div className="flex items-center gap-3">
                        {/* Quantity */}
                        <div className="flex items-center border border-gray-300 rounded bg-gray-50 h-11">
                          <button
                            onClick={() => setQty(Math.max(1, qty - 1))}
                            className="px-3 hover:bg-gray-200 text-gray-600 h-full rounded-l-lg"
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
                            className="px-3 hover:bg-gray-200 text-gray-600 h-full rounded-r-lg"
                          >
                            <Plus size={16} />
                          </button>
                        </div>

                        <button
                          onClick={handleAddToCart}
                          disabled={product.stock === 0}
                          className="flex-1 bg-belims-blue text-white font-bold text-sm h-11 rounded shadow-md hover:bg-belims-light transition-all active:scale-95 font-heading flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {product.stock > 0 ? "Add to cart" : "Out of Stock"}
                        </button>

                        <button
                          onClick={handleBuyNowAction}
                          disabled={product.stock === 0}
                          className="flex-1 bg-belims-accent text-white font-bold text-sm h-11 rounded shadow-md hover:bg-orange-600 transition-all active:scale-95 font-heading flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          <Zap size={18} fill="currentColor" />{" "}
                          {product.stock > 0 ? "Buy Now" : "Out of Stock"}
                        </button>
                      </div>
                    ) : (
                      // MINIMAL MODE: Just Add to Cart button
                      <div className="flex items-center gap-2">
                        <div className="flex items-center border border-gray-300 rounded bg-gray-50 h-9">
                          <button
                            onClick={() => setQty(Math.max(1, qty - 1))}
                            className="px-2 hover:bg-gray-200 text-gray-600 h-full rounded-l-lg"
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
                            className="px-2 hover:bg-gray-200 text-gray-600 h-full rounded-r-lg"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                        <button
                          onClick={handleAddToCart}
                          disabled={product.stock === 0}
                          className="flex-1 bg-belims-blue text-white font-bold text-xs h-9 rounded shadow-md hover:bg-belims-light transition-all active:scale-95 font-heading flex items-center justify-center gap-1 disabled:opacity-50"
                        >
                          Add to cart
                        </button>
                        <button
                          onClick={handleBuyNowAction}
                          disabled={product.stock === 0}
                          className="flex-1 bg-belims-accent text-white font-bold text-xs h-9 rounded shadow-md hover:bg-orange-600 transition-all active:scale-95 font-heading flex items-center justify-center gap-1 disabled:opacity-50"
                        >
                          <Zap size={14} /> Buy Now
                        </button>
                      </div>
                    )}

                    {/* Fulfillment Status (Compact Line) - Only in full mode */}
                    {showBuyBoxFull && (
                      <div className="flex gap-4 text-[10px] font-bold text-gray-500 justify-center sm:justify-start items-center pt-1">
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

          {/* RIGHT COLUMN: Content (Scrollable) */}
          <div className="lg:col-span-5 flex flex-col gap-8 pt-0">
            {/* Header Info */}
            <div>
              {/* First Row: Stars/Reviews with SKU below, Wishlist/Compare on right */}
              <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-3">
                    <div className="flex text-yellow-400">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={18}
                          fill={
                            i < Math.round(product.rating)
                              ? "currentColor"
                              : "none"
                          }
                        />
                      ))}
                    </div>
                    <span className="text-sm font-medium text-gray-500 hover:text-belims-blue cursor-pointer underline decoration-dotted">
                      {product.reviews} Reviews
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 font-mono">
                    SKU: {product.sku || "N/A"}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0 items-center">
                  <button className="p-2 rounded-full bg-gray-100 hover:bg-red-50 hover:text-belims-accent transition-colors">
                    <Heart size={20} />
                  </button>
                  <button className="p-2 rounded-full bg-gray-100 hover:bg-blue-50 hover:text-belims-blue transition-colors">
                    <Share2 size={20} />
                  </button>
                </div>
              </div>

              {/* Second Row: Brand and Title only */}
              <div className="mb-4">
                <div
                  className="text-sm font-bold text-gray-500 mb-1 uppercase tracking-wider font-heading hover:text-belims-blue cursor-pointer transition-colors"
                  onClick={() => product.brand && onBrandClick?.(product.brand)}
                >
                  {product.brand}
                </div>
                <h1
                  className="font-extrabold text-gray-900 font-heading leading-tight"
                  style={{ fontSize: "1.6rem" }}
                >
                  {product.name}
                </h1>

                {/* Key Features */}
                {product.features && product.features.length > 0 && (
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
                )}
              </div>
            </div>

            {/* RIGHT COLUMN BUY BOX (Scroll Target) */}
            <div
              ref={rightBuyBoxRef}
              className="bg-gray-50 p-6 rounded border border-gray-200 shadow-sm"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  {product.sale_price &&
                  product.sale_price > 0 &&
                  product.sale_price < product.regular_price ? (
                    <div className="flex items-baseline gap-3">
                      <div className="text-3xl font-extrabold text-red-600 font-heading">
                        {CURRENCY_SYMBOL}
                        {product.sale_price.toFixed(2)}
                      </div>
                      <div className="text-xl text-gray-400 line-through font-heading">
                        {CURRENCY_SYMBOL}
                        {product.regular_price.toFixed(2)}
                      </div>
                    </div>
                  ) : (
                    <div className="text-3xl font-extrabold text-belims-blue font-heading">
                      {CURRENCY_SYMBOL}
                      {product.price.toFixed(2)}
                    </div>
                  )}
                </div>
                {product.isBundle && (
                  <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded">
                    Bundle Savings
                  </span>
                )}
              </div>

              <StockBar current={product.stock} max={product.maxStock} />

              <div className="space-y-3 mt-6 mb-4">
                <div className="flex gap-4">
                  <div className="flex items-center border border-gray-300 rounded bg-white h-12 shadow-sm">
                    <button
                      onClick={() => setQty(Math.max(1, qty - 1))}
                      className="px-3 hover:bg-gray-100 text-gray-600 h-full rounded-l-lg"
                    >
                      <Minus size={18} />
                    </button>
                    <div className="w-10 text-center font-bold text-base">
                      {qty}
                    </div>
                    <button
                      onClick={() => setQty(Math.min(product.stock, qty + 1))}
                      className="px-3 hover:bg-gray-100 text-gray-600 h-full rounded-r-lg"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                  <button
                    onClick={handleAddToCart}
                    disabled={product.stock === 0}
                    className="flex-1 bg-belims-blue text-white font-semibold text-base h-12 rounded shadow-md hover:bg-belims-light transition-all active:scale-95 font-heading flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {product.stock > 0 ? "Add to cart" : "Out of Stock"}
                  </button>
                </div>
              </div>

              {/* Fulfillment Options: Side-by-Side Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                {/* PICK UP CARD */}
                <div
                  className="bg-white border border-gray-200 rounded p-4 cursor-pointer hover:border-belims-blue hover:bg-blue-50/50 transition-all shadow-sm relative group flex flex-col justify-between h-full"
                  onClick={() => setIsLocatorOpen(true)}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 bg-blue-50 text-belims-blue rounded-full">
                      <Store size={16} />
                    </div>
                    <h4 className="font-bold text-gray-900 font-heading text-sm">
                      Pick Up
                    </h4>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">
                    Check availability at nearby stores
                  </p>
                  <div className="text-xs font-bold text-belims-blue flex items-center gap-1 mt-auto">
                    Select Store <ChevronRight size={12} />
                  </div>
                </div>

                {/* DELIVERY CARD */}
                <div
                  className="bg-white border border-gray-200 rounded p-4 cursor-pointer hover:border-belims-blue hover:bg-blue-50/50 transition-all shadow-sm relative group flex flex-col justify-between h-full"
                  onClick={() => setIsDeliveryModalOpen(true)}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 bg-gray-100 text-gray-600 rounded-full group-hover:bg-blue-100 group-hover:text-belims-blue transition-colors">
                      <Truck size={16} />
                    </div>
                    <h4 className="font-bold text-gray-900 font-heading text-sm">
                      Delivery
                    </h4>
                  </div>
                  <p className="text-xs text-gray-500 mb-1">
                    Free for orders &gt; {CURRENCY_SYMBOL}1,000
                  </p>
                  <div className="text-[10px] text-green-600 font-bold flex items-center gap-1 mt-auto">
                    Earliest: Tomorrow
                  </div>
                </div>
              </div>
            </div>

            {/* COMPARE BUTTONS */}
            <div className="mb-6">
              <div className="flex gap-3">
                <button
                  onClick={() => onCompare(product)}
                  className="flex-1 text-sm font-bold text-gray-700 hover:text-belims-blue hover:border-belims-blue bg-white px-4 py-3 rounded border border-gray-200 shadow-sm transition-all flex items-center justify-center gap-2"
                >
                  <Scale size={18} /> Compare
                </button>
                <button
                  onClick={() => onPriceMatch(product)}
                  className="flex-1 text-sm font-bold text-belims-blue hover:text-white hover:bg-belims-blue bg-blue-50 px-4 py-3 rounded border border-blue-100 shadow-sm transition-all flex items-center justify-center gap-2"
                >
                  <ShieldCheck size={18} /> Price Match
                </button>
              </div>
            </div>

            {/* Product Description */}
            <div className="bg-white border border-gray-200 rounded p-6 shadow-sm">
              <h3 className="font-bold text-gray-900 font-heading text-lg mb-4">
                Product Description
              </h3>
              <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed [&_strong]:font-bold [&_strong]:text-gray-900 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_li]:text-gray-700 [&_p]:mb-3">
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

            {/* Bundle Section - Outside Buy Block with Blue Theme */}
            {product.bundleCandidates &&
              product.bundleCandidates.length > 0 && (
                <div className="mb-8">
                  <div className="rounded border transition-all duration-300 border-belims-blue bg-blue-50">
                    <div
                      className="p-5 flex items-center justify-between cursor-pointer"
                      onClick={() =>
                        setIsBundleSectionExpanded(!isBundleSectionExpanded)
                      }
                    >
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-100 p-2 rounded text-belims-blue">
                          <Package size={24} />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 font-heading text-lg leading-none">
                            Bundle & Save
                          </h3>
                          <p className="text-xs text-gray-500 mt-1">
                            Add accessories to unlock up to 10% off.
                          </p>
                        </div>
                      </div>
                      <div
                        className={`transform transition-transform duration-300 text-belims-blue ${isBundleSectionExpanded ? "rotate-180" : ""}`}
                      >
                        <ChevronDown size={24} />
                      </div>
                    </div>
                    {isBundleSectionExpanded && (
                      <div className="overflow-hidden transition-all duration-300 ease-in-out border-t border-blue-100">
                        <div className="p-5 pt-2">
                          <div className="flex items-center gap-3 mb-5 overflow-x-auto no-scrollbar pb-2">
                            <div className="relative w-16 h-16 bg-white rounded border border-gray-200 p-1 flex-shrink-0 shadow-sm">
                              <img
                                alt=""
                                className="w-full h-full object-contain"
                                src={product.image}
                              />
                              <div className="absolute -bottom-2 -right-2 bg-green-500 text-white rounded-full p-0.5">
                                <Check size={10} strokeWidth={3} />
                              </div>
                            </div>
                            <CirclePlus
                              size={20}
                              className="text-gray-300 flex-shrink-0"
                            />
                            {product.bundleCandidates
                              .slice(0, 3)
                              .map((item) => (
                                <div
                                  key={item.id}
                                  className="w-16 h-16 bg-white rounded border border-dashed border-gray-300 p-1 flex-shrink-0 opacity-80 hover:opacity-100 transition-opacity"
                                >
                                  <img
                                    alt=""
                                    className="w-full h-full object-contain"
                                    src={item.image}
                                  />
                                </div>
                              ))}
                          </div>
                          <button
                            onClick={() => setIsBundleOpen(true)}
                            className="w-full bg-white text-belims-blue border-2 border-belims-blue py-2.5 rounded font-bold hover:bg-belims-blue hover:text-white transition-colors font-heading shadow-sm"
                          >
                            Customize Your Bundle
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

            {/* Policy Accordions */}
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
                  <ChevronDown
                    size={20}
                    className={`text-gray-500 transition-transform ${expandedPolicy === "return" ? "rotate-180" : ""}`}
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
                  <ChevronDown
                    size={20}
                    className={`text-gray-500 transition-transform ${expandedPolicy === "change_mind" ? "rotate-180" : ""}`}
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
                  <ChevronDown
                    size={20}
                    className={`text-gray-500 transition-transform ${expandedPolicy === "warranty" ? "rotate-180" : ""}`}
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
                  <ChevronDown
                    size={20}
                    className={`text-gray-500 transition-transform ${expandedPolicy === "shipping" ? "rotate-180" : ""}`}
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

        {/* DETAILED PRODUCT SECTIONS */}
        <div className="border-t border-gray-200 bg-white">
          <div className="max-w-7xl mx-auto px-6 py-16">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
              {/* Left: Main Description & AI */}
              <div className="lg:col-span-8 space-y-12">
                {/* AI Summary (Moved here) */}
                <div className="bg-gradient-to-br from-purple-50 to-white border border-purple-100 rounded p-8 shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-purple-100 rounded-full -mr-16 -mt-16 opacity-50"></div>
                  <div className="flex items-center justify-between mb-6 relative z-10">
                    <div className="flex items-center gap-3">
                      <div className="bg-white p-2 rounded shadow-sm text-purple-600">
                        <Sparkles size={24} />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-purple-900 font-heading leading-none">
                          AI Product Insights
                        </h3>
                        <p className="text-xs text-purple-500 mt-1">
                          Powered by Google Gemini
                        </p>
                      </div>
                    </div>
                    {(aiDescription || !generatingDesc) && (
                      <button
                        onClick={handleGenerateDescription}
                        className="text-xs font-bold bg-white hover:bg-purple-50 text-purple-700 border border-purple-200 px-4 py-2 rounded-full transition-all shadow-sm flex items-center gap-2"
                      >
                        <RefreshCw
                          size={14}
                          className={generatingDesc ? "animate-spin" : ""}
                        />
                        {aiDescription
                          ? "Regenerate Analysis"
                          : "Analyze Product"}
                      </button>
                    )}
                  </div>

                  {generatingDesc ? (
                    <div className="space-y-4 animate-pulse">
                      <div className="h-4 bg-purple-200 rounded w-full"></div>
                      <div className="h-4 bg-purple-200 rounded w-5/6"></div>
                      <div className="h-4 bg-purple-200 rounded w-4/6"></div>
                    </div>
                  ) : aiDescription ? (
                    <div className="prose prose-purple max-w-none relative z-10">
                      <ReactMarkdown>{aiDescription}</ReactMarkdown>
                    </div>
                  ) : (
                    <div className="text-center py-6 bg-white/50 rounded border border-purple-100 border-dashed">
                      <p className="text-purple-800 font-medium mb-2">
                        Want a quick expert summary?
                      </p>
                      <p className="text-sm text-purple-600 mb-4">
                        Let our AI analyze the specs and reviews for you.
                      </p>
                      <button
                        onClick={handleGenerateDescription}
                        className="bg-purple-600 text-white font-bold py-2 px-6 rounded shadow hover:bg-purple-700 transition-colors"
                      >
                        Generate Summary
                      </button>
                    </div>
                  )}
                </div>

                {/* Main Description */}
                <div>
                  <h2 className="text-2xl font-extrabold text-gray-900 font-heading mb-6">
                    Product Description
                  </h2>
                  <div className="prose prose-lg text-gray-600 max-w-none leading-relaxed">
                    <p>{product.description}</p>
                    {/* Placeholder for more rich text content if we had html description */}
                  </div>
                </div>
              </div>

              {/* Right: Accordion Sections */}
              <div className="lg:col-span-4 space-y-4">
                {/* Specs Accordion */}
                <div className="border border-gray-200 rounded overflow-hidden">
                  <button
                    onClick={() =>
                      setSelectedTab(selectedTab === "specs" ? "desc" : "specs")
                    } // Reusing state for toggle
                    className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                  >
                    <span className="font-bold text-gray-900 font-heading">
                      Technical Specifications
                    </span>
                    <ChevronDown
                      size={20}
                      className={`text-gray-500 transition-transform ${selectedTab === "specs" ? "rotate-180" : ""}`}
                    />
                  </button>
                  {selectedTab === "specs" && (
                    <div className="p-4 bg-white border-t border-gray-200 animate-fadeIn">
                      {product.specifications ? (
                        <table className="w-full text-sm">
                          <tbody>
                            {product.specifications.map((spec, idx) => (
                              <tr
                                key={idx}
                                className="border-b border-gray-100 last:border-0"
                              >
                                <td className="py-2 text-gray-500 w-1/3">
                                  {spec.label}
                                </td>
                                <td className="py-2 text-gray-900 font-medium text-right">
                                  {spec.value}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <p className="text-gray-500 text-sm">
                          No specifications available.
                        </p>
                      )}
                    </div>
                  )}
                </div>

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
                    <ChevronDown
                      size={20}
                      className={`text-gray-500 transition-transform ${expandedPolicy === "return" ? "rotate-180" : ""}`}
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
                    <ChevronDown
                      size={20}
                      className={`text-gray-500 transition-transform ${expandedPolicy === "change_mind" ? "rotate-180" : ""}`}
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
                    <ChevronDown
                      size={20}
                      className={`text-gray-500 transition-transform ${expandedPolicy === "warranty" ? "rotate-180" : ""}`}
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
                    <ChevronDown
                      size={20}
                      className={`text-gray-500 transition-transform ${expandedPolicy === "shipping" ? "rotate-180" : ""}`}
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
        </div>

        {/* Mobile Bottom CTA (reveals on scroll down, hides on scroll up) */}
        {isMobile && (
          <div
            className={`fixed left-0 right-0 bottom-0 z-[260] bg-white border-t border-gray-200 shadow-2xl px-4 py-3 transition-transform duration-300 ${showBottomCta ? "translate-y-0" : "translate-y-full"}`}
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center border border-gray-300 rounded bg-gray-50 h-11 flex-shrink-0">
                <button
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  className="px-3 hover:bg-gray-200 text-gray-600 h-full rounded-l-lg"
                >
                  <Minus size={16} />
                </button>
                <div className="w-8 text-center font-bold text-sm">{qty}</div>
                <button
                  onClick={() => setQty(Math.min(product.stock, qty + 1))}
                  className="px-3 hover:bg-gray-200 text-gray-600 h-full rounded-r-lg"
                >
                  <Plus size={16} />
                </button>
              </div>
              <button
                onClick={handleAddToCart}
                disabled={product.stock === 0}
                className="flex-1 bg-belims-blue text-white font-bold text-sm h-11 rounded shadow-md hover:bg-belims-light transition-all active:scale-95 font-heading flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {product.stock > 0 ? "Add to cart" : "Out of Stock"}
              </button>
              <button
                onClick={handleBuyNowAction}
                disabled={product.stock === 0}
                className="flex-1 bg-belims-accent text-white font-bold text-sm h-11 rounded shadow-md hover:bg-orange-600 transition-all active:scale-95 font-heading flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Zap size={16} />{" "}
                {product.stock > 0 ? "Buy Now" : "Out of Stock"}
              </button>
            </div>
          </div>
        )}

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
        />
      </div>
    </div>
  );
};
