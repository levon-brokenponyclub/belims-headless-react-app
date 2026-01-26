import React, { useState, useEffect, useMemo } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
  useParams,
  useSearchParams,
  useLocation,
} from "react-router-dom";
import { Header } from "./components/Header";
import { ProductCard } from "./components/ProductCard";
import { CartDrawer } from "./components/CartDrawer";
import { StoreLocator } from "./components/StoreLocator";
import { PaintAssistant } from "./components/PaintAssistant";
import { SingleProduct } from "./components/SingleProduct";
import { FreeShippingWidget } from "./components/FreeShippingWidget";
import { OnboardingWizard } from "./components/OnboardingWizard";
import { PriceMatchModal } from "./components/PriceMatchModal";
import { ComparisonModal } from "./components/ComparisonModal";
import { Checkout } from "./components/Checkout";
import { OrderConfirmation } from "./components/OrderConfirmation";
import { Archive } from "./components/Archive";
import { RecentlyViewed } from "./components/RecentlyViewed";
import { ShopByCategory } from "./components/ShopByCategory";
import { Product, CartItem, Store } from "./types";
import {
  fetchProducts,
  fetchFeaturedProducts,
  getApiBaseUrl,
} from "./services/wooCommerceService";
import {
  STORES,
  HERO_SLIDES,
  CATEGORY_PILLS,
  PROJECT_IDEAS,
  CATEGORY_SLIDER_DATA,
} from "./constants";
import {
  ArrowLeft,
  ArrowRight,
  Truck,
  ShieldCheck,
  CreditCard,
  ChevronRight,
  X,
  Package,
  Route,
  MapPin,
  CheckCircle2,
  RefreshCcw,
} from "lucide-react";

// --- WRAPPER COMPONENTS FOR ROUTING ---

const ProductPage = ({
  products,
  addToCart,
  onBuyNow,
  onCompare,
  setPriceMatchProduct,
}) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const product = products.find((p) => String(p.id) === id);

  if (!product && products.length > 0)
    return <div className="p-10 text-center">Product not found</div>;
  if (!product) return <div className="p-10 text-center">Loading...</div>;

  return (
    <SingleProduct
      product={product}
      addToCart={addToCart}
      onBuyNow={onBuyNow}
      onCompare={onCompare}
      onPriceMatch={setPriceMatchProduct}
      onBrandClick={(brand) =>
        navigate(`/shop?brand=${encodeURIComponent(brand)}`)
      }
    />
  );
};

const ArchivePage = ({ products, addToCart, onBuyNow, onCompare }) => {
  const { categorySlug } = useParams();
  const [searchParams] = useSearchParams();

  // Helper to find category name from slug if needed, or pass slug directly if Archive supports it.
  // Assuming Archive expects the Label/Name currently.
  // In a real app, you'd map slug back to ID/Label using your categoryTree.
  // For now, we decode it assuming the URL might contain the label or a close match.
  const categoryLabel = categorySlug
    ? decodeURIComponent(categorySlug).replace(/-/g, " ")
    : undefined;

  const brand = searchParams.get("brand") || undefined;
  const searchQuery = searchParams.get("search") || undefined;

  return (
    <Archive
      products={products}
      category={categoryLabel}
      brand={brand}
      searchQuery={searchQuery}
      addToCart={addToCart}
      onBuyNow={onBuyNow}
      onCompare={onCompare}
    />
  );
};

const HomePage = ({
  products,
  featuredProducts,
  heroCategorySlides,
  heroCategoryIndex,
  setHeroCategoryIndex,
  projectSlides,
  projectSlideIndex,
  setProjectSlideIndex,
  nextHeroCategory,
  prevHeroCategory,
  nextProjectSlide,
  prevProjectSlide,
  activeCategory,
  setActiveCategory,
  currentSliderContent,
  addToCart,
  handleBuyNow,
  handleProductClick,
  addToCompare,
  categoryPills,
}) => {
  const navigate = useNavigate();
  const activeHero = heroCategorySlides[heroCategoryIndex];
  const activeProject = projectSlides[projectSlideIndex];

  return (
    <>
      {/* Hero Section Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[45%_30%_25%] gap-6 mb-12 items-stretch overflow-hidden">
        {/* Left: Category Hero Carousel */}
        <div className="lg:col-span-1 relative rounded-lg overflow-hidden shadow-lg min-h-[420px] h-full">
          <img
            src={activeHero.image}
            alt={activeHero.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-transparent" />
          <div className="absolute inset-0 p-8 flex flex-col justify-between text-white">
            <div className="max-w-lg space-y-4">
              <div className="flex items-center gap-3">
                <span className="bg-belims-accent text-white px-2 py-1 text-xs font-bold uppercase tracking-wider rounded-sm font-heading">
                  {activeHero.tag}
                </span>
                <span className="text-xs font-bold uppercase tracking-wide text-gray-200 font-heading">
                  {activeHero.category}
                </span>
              </div>
              <div className="space-y-3">
                <h2 className="text-4xl font-bold leading-tight font-heading">
                  {activeHero.title}
                </h2>
                <p className="text-lg text-gray-100 font-medium">
                  {activeHero.subtitle}
                </p>
              </div>
              <button
                onClick={() =>
                  navigate(`/shop/${encodeURIComponent(activeHero.category)}`)
                }
                className="bg-white text-belims-blue font-bold py-3 px-6 rounded hover:bg-belims-accent hover:text-white transition-colors font-heading w-fit"
              >
                {activeHero.cta}
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                {heroCategorySlides.map((slide, idx) => (
                  <button
                    key={slide.category}
                    className={`h-1.5 w-8 rounded-full transition-colors ${idx === heroCategoryIndex ? "bg-belims-accent" : "bg-white/40"}`}
                    onClick={() => setHeroCategoryIndex(idx)}
                  />
                ))}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={prevHeroCategory}
                  className="h-10 w-10 rounded-full bg-white/15 border border-white/30 backdrop-blur flex items-center justify-center hover:bg-white/25 transition"
                >
                  <ArrowLeft className="text-white" size={18} />
                </button>
                <button
                  onClick={nextHeroCategory}
                  className="h-10 w-10 rounded-full bg-white/15 border border-white/30 backdrop-blur flex items-center justify-center hover:bg-white/25 transition"
                >
                  <ArrowRight className="text-white" size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Middle: DIY Projects Slider + Tips */}
        <div className="lg:col-span-1 flex flex-col gap-4 min-h-[420px] h-full">
          <div
            className="relative border border-gray-200 rounded-lg shadow-sm overflow-hidden flex flex-col justify-between text-white flex-[3]"
            style={{
              backgroundImage: `url(${activeProject.image})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/45 to-black/25" />
            <div className="relative flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-belims-accent font-heading">
                  DIY Project Ideas
                </p>
                <h3 className="text-lg font-bold font-heading">
                  {activeProject.title}
                </h3>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={prevProjectSlide}
                  className="h-9 w-9 rounded-full border border-white/40 bg-black/30 flex items-center justify-center hover:bg-white/20 transition"
                >
                  <ArrowLeft size={16} />
                </button>
                <button
                  onClick={nextProjectSlide}
                  className="h-9 w-9 rounded-full border border-white/40 bg-black/30 flex items-center justify-center hover:bg-white/20 transition"
                >
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
            <div className="relative p-4 space-y-3">
              <p className="text-sm leading-relaxed text-white/90 max-w-md">
                {activeProject.description}
              </p>
              <span className="text-belims-accent font-bold text-sm underline font-heading cursor-pointer">
                {activeProject.linkText}
              </span>
            </div>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 shadow-sm flex-1 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-belims-blue font-heading">
                  DIY Tips & Tricks
                </p>
                <h4 className="text-lg font-bold text-gray-900 font-heading">
                  Pro how-tos for this weekend
                </h4>
              </div>
              <ChevronRight className="text-belims-blue" size={18} />
            </div>
            <p className="text-sm text-gray-600">
              From laying bricks to wiring a plug, get expert advice for your
              next project.
            </p>
          </div>
        </div>

        {/* Right: Pro Rewards */}
        <div className="lg:col-span-1 bg-belims-blue rounded-lg p-5 text-white flex flex-col relative overflow-hidden shadow-lg min-h-[420px] h-full">
          <div className="relative z-10">
            <div className="border-b-4 border-belims-accent w-12 mb-4"></div>
            <h2 className="text-xl font-extrabold mb-1 font-heading tracking-tight">
              MyBelims
            </h2>
            <h3 className="text-2xl font-extrabold mb-5 text-white font-heading tracking-tight">
              Pro Rewards
            </h3>
            <div className="mb-6">
              <p className="text-lg font-bold mb-2 font-heading">
                Build. Earn. Save.
              </p>
              <p className="text-sm text-blue-100">
                Contractor benefits include:
              </p>
            </div>
            <ul className="space-y-3 text-sm font-medium text-blue-50 mb-8">
              <li className="flex gap-2 items-center">
                <div className="bg-white text-belims-blue rounded text-[10px] p-0.5 font-bold">
                  %
                </div>{" "}
                Bulk Pricing.
              </li>
              <li className="flex gap-2 items-center">
                <div className="bg-white text-belims-blue rounded text-[10px] p-0.5 font-bold">
                  Job
                </div>{" "}
                Site Delivery.
              </li>
              <li className="flex gap-2 items-center">
                <Truck size={14} /> Dedicated Support.
              </li>
            </ul>
            <button className="w-full bg-white text-belims-blue py-2.5 rounded font-bold hover:bg-gray-100 transition-colors font-heading">
              Register as Pro
            </button>
          </div>
          <div className="absolute -right-10 -bottom-20 w-64 h-64 bg-indigo-900 rounded-full opacity-50"></div>
        </div>
      </div>

      {/* INTERACTIVE CATEGORY PREVIEW SECTION */}
      <ShopByCategory
        products={products}
        addToCart={addToCart}
        onBuyNow={handleBuyNow}
        onCompare={addToCompare}
      />

      {/* Featured Products Grid */}
      <section className="mb-16">
        <div className="flex justify-between items-end mb-6 border-b border-gray-200 pb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 font-heading">
              Top Rated Hardware
            </h2>
            <p className="text-gray-500 text-sm mt-1 font-medium">
              Essential tools and materials for the job.
            </p>
          </div>
          <button
            onClick={() => navigate("/shop")}
            className="text-belims-blue font-bold text-sm hover:text-belims-accent hover:underline flex items-center gap-1 mb-2 font-heading"
          >
            View All <ChevronRight size={16} />
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {(featuredProducts.length > 0
            ? featuredProducts
            : products.slice(0, 4)
          ).map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              addToCart={addToCart}
              onBuyNow={handleBuyNow}
              onCompare={addToCompare}
            />
          ))}
        </div>
      </section>

      <RecentlyViewed
        addToCart={addToCart}
        onBuyNow={handleBuyNow}
        onProductClick={handleProductClick}
        onCompare={addToCompare}
      />

      {/* Banner Strip */}
      <div className="bg-belims-gray rounded-xl p-8 mb-16 flex flex-col md:flex-row items-center justify-between gap-8 border border-gray-200">
        <div>
          <h2 className="text-3xl font-bold text-belims-blue mb-2 font-heading">
            Get More Done with Pro
          </h2>
          <p className="text-gray-600 max-w-lg text-lg">
            Exclusive volume savings, dedicated support, and job site delivery
            for professionals.
          </p>
        </div>
        <button className="bg-belims-blue text-white px-8 py-4 rounded-full font-bold hover:bg-belims-accent transition-colors shadow-lg whitespace-nowrap text-lg font-heading">
          Join Pro Program
        </button>
      </div>

      {/* Value Props */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 border-t pt-12 pb-12">
        <div className="flex items-start gap-4">
          <div className="bg-blue-50 p-3 rounded-full text-belims-blue">
            <Truck size={24} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 mb-1 font-heading">
              Free Delivery
            </h3>
            <p className="text-sm text-gray-500">
              On orders over R1,000. Fast reliable shipping nationwide.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-4">
          <div className="bg-blue-50 p-3 rounded-full text-belims-blue">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 mb-1 font-heading">
              Extended Warranty
            </h3>
            <p className="text-sm text-gray-500">
              Free 1-year extended warranty on all power tools.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-4">
          <div className="bg-blue-50 p-3 rounded-full text-belims-blue">
            <CreditCard size={24} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 mb-1 font-heading">
              Secure Payment
            </h3>
            <p className="text-sm text-gray-500">
              100% secure payment processing with top SA gateways.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

type StepKey =
  | "created"
  | "collected"
  | "in_transit"
  | "out_for_delivery"
  | "delivered";

const TRACK_STEPS: {
  key: StepKey;
  label: string;
  Icon: any;
  match: (s: string) => boolean;
}[] = [
  {
    key: "created",
    label: "Created",
    Icon: Package,
    match: (s) =>
      s.includes("created") || s.includes("submitted") || s.includes("booked"),
  },
  {
    key: "collected",
    label: "Collected",
    Icon: Truck,
    match: (s) => s.includes("collected") || s.includes("collection"),
  },
  {
    key: "in_transit",
    label: "In transit",
    Icon: Route,
    match: (s) =>
      s.includes("in transit") ||
      s.includes("transit") ||
      s.includes("linehaul"),
  },
  {
    key: "out_for_delivery",
    label: "Out for delivery",
    Icon: MapPin,
    match: (s) => s.includes("out for delivery") || s.includes("delivery run"),
  },
  {
    key: "delivered",
    label: "Delivered",
    Icon: CheckCircle2,
    match: (s) => s.includes("delivered") || s.includes("complete"),
  },
];

function normalizeStatus(status?: string): string {
  return (status || "").toLowerCase().trim();
}

function activeStepIndexFromStatus(status?: string): number {
  const s = normalizeStatus(status);
  if (!s) return 0;

  // Most common BobGo UI status:
  if (s.includes("pending collection")) return 0;

  // Otherwise match steps
  const idx = TRACK_STEPS.findIndex((st) => st.match(s));
  return idx >= 0 ? idx : 0;
}

function formatEta(eta?: string) {
  if (!eta) return null;
  // If it’s already a range string, keep it
  if (eta.includes("–") || eta.includes("-")) return eta;

  // Otherwise try to render a nicer date
  const d = new Date(eta);
  if (Number.isNaN(d.getTime())) return eta;

  return d.toLocaleString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function pickEventLabel(ev: any) {
  return (
    ev?.label ||
    ev?.status ||
    ev?.event ||
    ev?.description ||
    ev?.message ||
    "Update"
  );
}

function pickEventTime(ev: any) {
  return ev?.time || ev?.timestamp || ev?.created_at || ev?.created || "";
}

function pickEventLocation(ev: any) {
  return ev?.location || ev?.hub || ev?.facility || ev?.city || "";
}

const TrackingProgressCard = ({
  trackingRef,
  status,
  eta,
  details,
  events,
  onRefresh,
  loading,
}: {
  trackingRef: string;
  status?: string;
  eta?: string;
  details?: {
    orderNo?: string | number;
    serviceLevel?: string;
    courier?: string;
    customer?: string;
  };
  events?: any[];
  onRefresh: () => void;
  loading: boolean;
}) => {
  const activeIdx = activeStepIndexFromStatus(status);
  const progressPct =
    TRACK_STEPS.length === 1 ? 0 : (activeIdx / (TRACK_STEPS.length - 1)) * 100;

  return (
    <div className="space-y-5">
      {/* Progress Card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 md:px-6 md:py-5 flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500">Tracking reference</div>
            <div className="text-lg font-extrabold tracking-tight text-gray-900 font-heading">
              {trackingRef}
            </div>
          </div>

          <button
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 transition disabled:opacity-60"
            title="Refresh tracking"
          >
            <RefreshCcw
              size={16}
              className={`${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>

        <div className="px-5 pb-5 md:px-6 md:pb-6">
          {/* Progress line */}
          <div className="relative mt-2">
            <div className="h-[2px] bg-gray-200 rounded-full" />
            <div
              className="absolute top-0 left-0 h-[2px] bg-belims-blue rounded-full transition-[width] duration-500 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {/* Steps */}
          <div className="mt-6 grid grid-cols-5 gap-2 md:gap-4">
            {TRACK_STEPS.map((step, idx) => {
              const Icon = step.Icon;
              const isDone = idx < activeIdx;
              const isActive = idx === activeIdx;

              return (
                <div key={step.key} className="flex flex-col items-center">
                  <div
                    className={[
                      "relative flex h-12 w-12 items-center justify-center rounded-full transition-all",
                      isDone
                        ? "bg-belims-blue text-white shadow-sm"
                        : isActive
                          ? "bg-white border-2 border-belims-blue text-belims-blue shadow-sm"
                          : "bg-gray-100 text-gray-400",
                    ].join(" ")}
                    style={
                      isActive
                        ? ({
                            animation: "softPulse 2.6s ease-in-out infinite",
                          } as React.CSSProperties)
                        : undefined
                    }
                  >
                    <Icon size={20} />
                  </div>

                  <div className="mt-3 text-[11px] md:text-xs font-bold uppercase tracking-wide text-gray-600 text-center">
                    {step.label}
                  </div>

                  {/* Optional: show created timestamp under first step if we have it */}
                  {idx === 0 && events?.length ? (
                    <div className="mt-1 text-[11px] text-gray-500 tabular-nums text-center">
                      {pickEventTime(events[0])}
                    </div>
                  ) : (
                    <div className="mt-1 h-[14px]" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Shipping details */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-extrabold text-gray-900 font-heading">
              Shipping details
            </div>
            <div className="mt-1 text-sm text-gray-600">
              Live updates from Bob Go
            </div>
          </div>

          <div className="shrink-0">
            <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-sm font-bold text-belims-blue">
              {status || "—"}
            </span>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="rounded-xl border border-gray-100 p-4">
            <div className="text-gray-500">Shipment</div>
            <div className="font-bold text-gray-900">{trackingRef}</div>

            {details?.orderNo && (
              <>
                <div className="mt-3 text-gray-500">Order</div>
                <div className="font-bold text-gray-900">{details.orderNo}</div>
              </>
            )}
          </div>

          <div className="rounded-xl border border-gray-100 p-4">
            {details?.serviceLevel && (
              <>
                <div className="text-gray-500">Service level</div>
                <div className="font-bold text-gray-900">
                  {details.serviceLevel}
                </div>
              </>
            )}

            {details?.courier && (
              <>
                <div className="mt-3 text-gray-500">Courier</div>
                <div className="font-bold text-gray-900">{details.courier}</div>
              </>
            )}

            {eta && (
              <>
                <div className="mt-3 text-gray-500">Estimated delivery</div>
                <div className="font-bold text-gray-900 tabular-nums">
                  {formatEta(eta)}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Events list (optional but looks pro) */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 md:p-6">
        <div className="text-lg font-extrabold text-gray-900 font-heading">
          Tracking events
        </div>

        {Array.isArray(events) && events.length > 0 ? (
          <div className="mt-4 space-y-3">
            {events.map((ev, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-gray-100 p-4 transition-all duration-200"
                style={{
                  opacity: 1,
                  transform: "translateY(0px)",
                  transitionDelay: `${idx * 60}ms`,
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="font-bold text-gray-900">
                    {pickEventLabel(ev)}
                  </div>
                  <div className="text-xs text-gray-500 tabular-nums">
                    {pickEventTime(ev)}
                  </div>
                </div>

                {pickEventLocation(ev) ? (
                  <div className="mt-1 text-sm text-gray-600">
                    {pickEventLocation(ev)}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-gray-500">No tracking events yet.</p>
        )}
      </div>

      {/* CSS keyframes (once) */}
      <style>{`
        @keyframes softPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(30, 64, 175, .18); }
          50% { box-shadow: 0 0 0 10px rgba(30, 64, 175, 0); }
        }
      `}</style>
    </div>
  );
};

const TrackOrderPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const urlOrder = searchParams.get("order-number") || "";

  const [orderNumber, setOrderNumber] = useState<string>(urlOrder);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    setOrderNumber(urlOrder);
  }, [urlOrder]);

  const track = async (value: string) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(
        "https://cms.belims.co.za/wp-json/belims/v1/track",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ trackingRef: value }),
        },
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Tracking request failed (${res.status})`);
      }

      const data = await res.json();
      setResult(data);
    } catch (e: any) {
      setError(e?.message || "Unable to fetch tracking right now.");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = orderNumber.trim();
    if (!value) return;

    setSearchParams({ "order-number": value }, { replace: true });

    track(value);
  };

  useEffect(() => {
    if (urlOrder.trim()) {
      track(urlOrder.trim());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlOrder]);

  return (
    <div className="container mx-auto px-4 py-8 min-h-[60vh]">
      <h1 className="text-2xl md:text-3xl font-bold text-belims-blue font-heading mb-2">
        Track Your Order
      </h1>
      <p className="text-sm md:text-base text-gray-600 max-w-xl mb-4">
        Enter your tracking reference to view live tracking updates.
      </p>

      <div className="bg-white rounded-xl shadow border border-gray-200 p-4 md:p-6">
        <form onSubmit={onSubmit} className="flex flex-col md:flex-row gap-3">
          <input
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="e.g. UASSBNJ9"
            className="flex-1 border rounded-lg px-3 py-2"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-belims-blue text-white px-5 py-2 rounded-lg font-bold disabled:opacity-60"
          >
            {loading ? "Tracking..." : "Track"}
          </button>
        </form>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        {result && (
          <div className="mt-6">
            <TrackingProgressCard
              trackingRef={result.trackingRef || urlOrder || orderNumber}
              status={result.status}
              eta={result.eta}
              details={{
                // If your WP endpoint returns these later, plug them in.
                // For now you can keep them undefined or derive them from result.raw if present.
                orderNo:
                  result.raw?.order_number || result.raw?.order || undefined,
                serviceLevel:
                  result.raw?.service_level ||
                  result.raw?.serviceLevel ||
                  result.raw?.service ||
                  undefined,
                courier:
                  result.raw?.courier || result.raw?.provider || undefined,
                customer: result.raw?.customer || undefined,
              }}
              events={result.events || []}
              loading={loading}
              onRefresh={() => {
                const v = (
                  result.trackingRef ||
                  urlOrder ||
                  orderNumber ||
                  ""
                ).trim();
                if (v) track(v);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

// --- MAIN APP COMPONENT ---

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLocatorOpen, setIsLocatorOpen] = useState(false);
  const [isPaintOpen, setIsPaintOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(() => {
    const hasSeen = localStorage.getItem("hasSeenOnboarding");
    return !hasSeen;
  });
  const [selectedStore, setSelectedStore] = useState<Store | null>(STORES[0]);
  const [userType, setUserType] = useState<"personal" | "business">("personal");
  const [comparisonList, setComparisonList] = useState<Product[]>([]);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [priceMatchProduct, setPriceMatchProduct] = useState<Product | null>(
    null,
  );
  const [categoryPills, setCategoryPills] = useState<string[]>(CATEGORY_PILLS);

  // Slider State (Moved up to pass to HomePage)
  const [heroCategoryIndex, setHeroCategoryIndex] = useState(0);
  const [projectSlideIndex, setProjectSlideIndex] = useState(0);
  const [activeCategory, setActiveCategory] = useState(CATEGORY_PILLS[0]);

  // Derived State for Slider Content
  const currentSliderContent =
    CATEGORY_SLIDER_DATA[activeCategory] || CATEGORY_SLIDER_DATA["default"];

  // Load categories from WooCommerce
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const apiBase = getApiBaseUrl();

        const response = await fetch(`${apiBase}/categories`);
        if (response.ok) {
          const categories = await response.json();
          // Filter for child categories only (those with a parent)
          const childCategories = categories
            .filter((cat: any) => cat.parent !== null)
            .map((cat: any) => cat.name)
            .sort();

          if (childCategories.length > 0) {
            // Add "Top Deals" at the beginning
            setCategoryPills(["Top Deals", ...childCategories]);
            setActiveCategory("Top Deals");
          }
        }
      } catch (error) {
        console.error("Failed to load categories:", error);
      }
    };
    loadCategories();
  }, []);

  // Load products
  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      try {
        const apiProducts = await fetchProducts();
        if (apiProducts && apiProducts.length > 0) setProducts(apiProducts);
        const apiFeaturedProducts = await fetchFeaturedProducts();
        if (apiFeaturedProducts && apiFeaturedProducts.length > 0)
          setFeaturedProducts(apiFeaturedProducts);
      } catch (error) {
        console.error("Failed to load products:", error);
      } finally {
        setLoading(false);
      }
    };
    loadProducts();
  }, []);

  // Actions
  const addToCart = (product: Product) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const handleBuyNow = (product: Product) => {
    addToCart(product);
    setTimeout(() => setIsCartOpen(true), 100);
  };

  const updateQuantity = (id: string, delta: number) => {
    setCartItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, quantity: Math.max(1, item.quantity + delta) }
          : item,
      ),
    );
  };

  const removeItem = (id: string) =>
    setCartItems((prev) => prev.filter((item) => item.id !== id));

  const addToCompare = (product: Product) => {
    setComparisonList((prev) => {
      if (prev.find((p) => p.id === product.id)) return prev;
      if (prev.length >= 4) {
        alert("You can compare up to 4 products.");
        return prev;
      }
      return [...prev, product];
    });
    setIsCompareOpen(true);
  };

  const removeFromCompare = (id: string) => {
    setComparisonList((prev) => prev.filter((p) => p.id !== id));
    if (comparisonList.length <= 1) setIsCompareOpen(false);
  };

  // Memoized Slides
  const heroCategorySlides = useMemo(
    () => [
      {
        tag: "Power Tool Sale",
        title: "Build It Better",
        subtitle: "Exclusive power deals plus seasonal savings.",
        category: "Christmas",
        image: HERO_SLIDES[0].image,
        cta: "Shop Christmas",
      },
      {
        tag: "Paint & Prep",
        title: "Refresh every room",
        subtitle: "Primers, rollers, and color-matched finishes.",
        category: "Paint",
        image: HERO_SLIDES[1]?.image || HERO_SLIDES[0].image,
        cta: "Shop Paint",
      },
      {
        tag: "Pro Power",
        title: "Tools that work harder",
        subtitle: "Top drills, grinders, and saws for every job.",
        category: "Power Tools",
        image: HERO_SLIDES[2]?.image || HERO_SLIDES[0].image,
        cta: "Shop Power Tools",
      },
    ],
    [],
  );
  const projectSlides = useMemo(() => PROJECT_IDEAS.slice(0, 4), []);

  const nextHeroCategory = () =>
    setHeroCategoryIndex((prev) => (prev + 1) % heroCategorySlides.length);
  const prevHeroCategory = () =>
    setHeroCategoryIndex(
      (prev) =>
        (prev - 1 + heroCategorySlides.length) % heroCategorySlides.length,
    );
  const nextProjectSlide = () =>
    setProjectSlideIndex((prev) => (prev + 1) % projectSlides.length);
  const prevProjectSlide = () =>
    setProjectSlideIndex(
      (prev) => (prev - 1 + projectSlides.length) % projectSlides.length,
    );

  // Wrapper for handlers to work with Router inside Child components
  // We don't have Router context here in App itself yet, so we return Router wrapping content
  return (
    <Router>
      <InnerApp
        products={products}
        featuredProducts={featuredProducts}
        cartItems={cartItems}
        isCartOpen={isCartOpen}
        setIsCartOpen={setIsCartOpen}
        isLocatorOpen={isLocatorOpen}
        setIsLocatorOpen={setIsLocatorOpen}
        isPaintOpen={isPaintOpen}
        setIsPaintOpen={setIsPaintOpen}
        isOnboardingOpen={isOnboardingOpen}
        setIsOnboardingOpen={setIsOnboardingOpen}
        selectedStore={selectedStore}
        setSelectedStore={setSelectedStore}
        userType={userType}
        setUserType={setUserType}
        addToCart={addToCart}
        handleBuyNow={handleBuyNow}
        updateQuantity={updateQuantity}
        removeItem={removeItem}
        comparisonList={comparisonList}
        addToCompare={addToCompare}
        removeFromCompare={removeFromCompare}
        isCompareOpen={isCompareOpen}
        setIsCompareOpen={setIsCompareOpen}
        priceMatchProduct={priceMatchProduct}
        setPriceMatchProduct={setPriceMatchProduct}
        heroCategorySlides={heroCategorySlides}
        projectSlides={projectSlides}
        heroCategoryIndex={heroCategoryIndex}
        setHeroCategoryIndex={setHeroCategoryIndex}
        projectSlideIndex={projectSlideIndex}
        setProjectSlideIndex={setProjectSlideIndex}
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
        nextHeroCategory={nextHeroCategory}
        prevHeroCategory={prevHeroCategory}
        nextProjectSlide={nextProjectSlide}
        prevProjectSlide={prevProjectSlide}
        currentSliderContent={currentSliderContent}
        categoryPills={categoryPills}
      />
    </Router>
  );
}

// Separate component to allow using useNavigate hooks
function InnerApp(props) {
  const navigate = useNavigate();
  const location = useLocation();

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [location.pathname]);

  const handleProductClick = (product: Product) => {
    navigate(`/product/${product.id}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-white font-sans">
      <Header
        selectedStore={props.selectedStore}
        cartItems={props.cartItems}
        toggleCart={() => props.setIsCartOpen(true)}
        toggleStoreLocator={() => props.setIsLocatorOpen(true)}
        onOpenPaintAssistant={() => props.setIsPaintOpen(true)}
        onOpenTrackOrder={() => navigate("/track-order")}
        onOpenOnboarding={() => props.setIsOnboardingOpen(true)}
        onCompare={props.addToCompare}
        products={props.products}
      />

      {/* Personal / Business Toggle (Only visible on Home) */}
      {location.pathname === "/" && (
        <div className="bg-white border-b border-gray-200">
          <div className="container mx-auto px-4 flex gap-8">
            <button
              className={`py-3 text-sm font-bold border-b-4 transition-colors font-heading ${props.userType === "personal" ? "border-belims-blue text-belims-blue" : "border-transparent text-gray-500 hover:text-gray-700"}`}
              onClick={() => props.setUserType("personal")}
            >
              Personal
            </button>
            <button
              className={`py-3 text-sm font-bold border-b-4 transition-colors font-heading ${props.userType === "business" ? "border-belims-blue text-belims-blue" : "border-transparent text-gray-500 hover:text-gray-700"}`}
              onClick={() => props.setUserType("business")}
            >
              Business
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 container mx-auto px-4 py-6 relative">
        <Routes>
          <Route
            path="/"
            element={
              <HomePage {...props} handleProductClick={handleProductClick} />
            }
          />

          <Route
            path="/product/:id"
            element={
              <ProductPage
                products={props.products}
                addToCart={props.addToCart}
                onBuyNow={props.handleBuyNow}
                onCompare={props.addToCompare}
                setPriceMatchProduct={props.setPriceMatchProduct}
              />
            }
          />

          <Route
            path="/shop"
            element={
              <ArchivePage
                products={props.products}
                addToCart={props.addToCart}
                onBuyNow={props.handleBuyNow}
                onCompare={props.addToCompare}
              />
            }
          />

          {/* Allow path params for category */}
          <Route
            path="/shop/:categorySlug"
            element={
              <ArchivePage
                products={props.products}
                addToCart={props.addToCart}
                onBuyNow={props.handleBuyNow}
                onCompare={props.addToCompare}
              />
            }
          />

          <Route
            path="/checkout"
            element={
              <Checkout
                cartItems={props.cartItems}
                onBack={() => navigate(-1)}
                onClearCart={() => {
                  // You might need to expose clearCart from App or just empty items
                  // For now, assuming direct prop passed down if Checkout used it,
                  // but App.tsx original didn't pass clearCart directly, it did inline.
                  // Ideally pass a clearCart handler from App state.
                  navigate("/");
                }}
              />
            }
          />

          <Route path="/track-order" element={<TrackOrderPage />} />

          <Route path="/order-confirmation" element={<OrderConfirmation />} />
        </Routes>
      </main>

      {/* Footer (Static) */}
      <footer className="bg-[#1a1f2e] text-gray-400 py-12 text-sm pb-24">
        {/* ... existing footer content ... */}
        <div className="container mx-auto px-4 text-center">
          &copy; 2024 Belims Hardware.
        </div>
      </footer>

      {/* Overlays */}
      <FreeShippingWidget cartItems={props.cartItems} />

      <CartDrawer
        isOpen={props.isCartOpen}
        onClose={() => props.setIsCartOpen(false)}
        items={props.cartItems}
        updateQuantity={props.updateQuantity}
        removeItem={props.removeItem}
        onCheckout={() => {
          props.setIsCartOpen(false);
          navigate("/checkout");
        }}
      />

      {props.isLocatorOpen && (
        <StoreLocator
          currentStore={props.selectedStore}
          onSelectStore={props.setSelectedStore}
          onClose={() => props.setIsLocatorOpen(false)}
        />
      )}

      {props.isCompareOpen && (
        <ComparisonModal
          products={props.comparisonList}
          onClose={() => props.setIsCompareOpen(false)}
          onRemove={props.removeFromCompare}
          addToCart={props.addToCart}
        />
      )}

      {props.priceMatchProduct && (
        <PriceMatchModal
          product={props.priceMatchProduct}
          onClose={() => props.setPriceMatchProduct(null)}
        />
      )}

      {props.isOnboardingOpen && (
        <OnboardingWizard
          onClose={() => {
            props.setIsOnboardingOpen(false);
            localStorage.setItem("hasSeenOnboarding", "true");
          }}
          onNavigateToProduct={handleProductClick}
          addToCart={props.addToCart}
          onBuyNow={props.handleBuyNow}
          onCompare={props.addToCompare}
        />
      )}

      {props.isPaintOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => props.setIsPaintOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10"
            >
              <X size={24} />
            </button>
            <div className="p-8">
              <h2 className="text-2xl font-bold mb-2 text-belims-blue font-heading">
                Belims AI Paint Assistant
              </h2>
              <PaintAssistant />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
