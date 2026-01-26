import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  Route as RouteIcon,
  MapPin,
  CheckCircle2,
  RefreshCcw,
  Copy,
  Sparkles,
  TimerReset,
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

/* -------------------------------------------------------
   TRACKING (Enhanced + Polished)
-------------------------------------------------------- */

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
      s.includes("created") ||
      s.includes("submitted") ||
      s.includes("booked") ||
      s.includes("pending collection") ||
      s.includes("pending"),
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
    Icon: RouteIcon,
    match: (s) =>
      s.includes("in transit") ||
      s.includes("transit") ||
      s.includes("linehaul"),
  },
  {
    key: "out_for_delivery",
    label: "Out for delivery",
    Icon: MapPin,
    match: (s) =>
      s.includes("out for delivery") ||
      s.includes("delivery run") ||
      s.includes("driver") ||
      s.includes("on route"),
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

  // Special case: "Pending collection" means CREATED stage
  if (s.includes("pending collection")) return 0;

  const idx = TRACK_STEPS.findIndex((st) => st.match(s));
  return idx >= 0 ? idx : 0;
}

function safeDate(value: any): Date | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function formatFriendlyDate(value: any) {
  const d = safeDate(value);
  if (!d) return value ? String(value) : "";
  return d.toLocaleString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatEtaText(eta?: any) {
  if (!eta) return "";

  const text = String(eta);

  // Already a nice range
  if (text.includes("–")) return text;
  if (text.includes(" - ")) return text.replace(" - ", " – ");

  // Sometimes API sends ISO-ish "2026-01-30 17:00:00+02:00"
  // Try normalize for Date parsing:
  const cleaned = text.replace(" ", "T");
  const d = safeDate(cleaned);
  if (d) {
    return d.toLocaleDateString(undefined, {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  }

  return text;
}

function pickEventLabel(ev: any) {
  const raw =
    ev?.label ||
    ev?.status_description ||
    ev?.statusDescription ||
    ev?.status ||
    ev?.event ||
    ev?.description ||
    ev?.message ||
    ev?.title ||
    ev?.name ||
    "";

  const s = String(raw || "").trim();
  if (!s) return "Tracking update";

  // Make it nicer
  if (s.toLowerCase() === "update") return "Tracking update";
  return s;
}

function pickEventTime(ev: any) {
  return (
    ev?.time ||
    ev?.timestamp ||
    ev?.created_at ||
    ev?.createdAt ||
    ev?.created ||
    ev?.date ||
    ev?.datetime ||
    ""
  );
}

function pickEventLocation(ev: any) {
  return (
    ev?.location ||
    ev?.location_name ||
    ev?.hub ||
    ev?.facility ||
    ev?.city ||
    ev?.area ||
    ev?.branch ||
    ""
  );
}

type NormalizedEvent = {
  label: string;
  timestamp: string;
  location?: string;
  status?: string;
};

type NormalizedTracking = {
  trackingRef: string;
  status: string;
  statusBadge: string;
  etaText?: string;
  lastUpdated?: string;
  details?: {
    orderNo?: string | number;
    courier?: string;
    serviceLevel?: string;
    customer?: string;
  };
  events: NormalizedEvent[];
};

function normalizeTrackingResult(data: any): NormalizedTracking {
  const trackingRef =
    data?.trackingRef ||
    data?.tracking_reference ||
    data?.reference ||
    data?.ref ||
    "";

  const rawStatus =
    data?.status ||
    data?.current_status ||
    data?.raw?.status ||
    data?.raw?.current_status ||
    "";

  const status = String(rawStatus || "Pending collection");

  const eta =
    data?.eta_range ||
    data?.etaText ||
    data?.eta ||
    data?.expected_delivery_date ||
    data?.raw?.expected_delivery_date ||
    data?.raw?.eta ||
    "";

  const rawEvents =
    data?.events ||
    data?.raw?.events ||
    data?.raw?.tracking_events ||
    data?.raw?.history ||
    [];

  const events: NormalizedEvent[] = (Array.isArray(rawEvents) ? rawEvents : [])
    .map((ev) => ({
      label: pickEventLabel(ev),
      timestamp: String(pickEventTime(ev) || ""),
      location: String(pickEventLocation(ev) || "") || undefined,
      status: String(ev?.status || ev?.state || ev?.event || "") || undefined,
    }))
    .filter((ev) => ev.label || ev.timestamp);

  // Sort newest -> oldest when timestamps exist
  events.sort((a, b) => {
    const da = safeDate(a.timestamp)?.getTime() ?? 0;
    const db = safeDate(b.timestamp)?.getTime() ?? 0;
    return db - da;
  });

  const details = {
    orderNo:
      data?.orderNo ||
      data?.raw?.order_number ||
      data?.raw?.order ||
      data?.raw?.order_id ||
      undefined,
    serviceLevel:
      data?.serviceLevel ||
      data?.raw?.service_level ||
      data?.raw?.serviceLevel ||
      data?.raw?.service ||
      undefined,
    courier: data?.courier || data?.raw?.courier || data?.raw?.provider,
    customer: data?.customer || data?.raw?.customer,
  };

  const badge =
    normalizeStatus(status).includes("delivered") ||
    normalizeStatus(status).includes("complete")
      ? "Delivered"
      : normalizeStatus(status).includes("out for delivery")
        ? "Out for delivery"
        : normalizeStatus(status).includes("transit")
          ? "In transit"
          : normalizeStatus(status).includes("collected")
            ? "Collected"
            : "Pending collection";

  const lastUpdated = events?.[0]?.timestamp
    ? formatFriendlyDate(events[0].timestamp)
    : "";

  return {
    trackingRef: String(trackingRef || "").toUpperCase(),
    status,
    statusBadge: badge,
    etaText: eta ? formatEtaText(eta) : "",
    lastUpdated,
    details,
    events,
  };
}

/* -----------------------------------
   Polished Tracking Card Component
------------------------------------ */

const TrackingProgressCard = ({
  data,
  onRefresh,
  loading,
  autoRefresh,
  onToggleAutoRefresh,
}: {
  data: NormalizedTracking;
  onRefresh: () => void;
  loading: boolean;
  autoRefresh: boolean;
  onToggleAutoRefresh: (v: boolean) => void;
}) => {
  const activeIdx = activeStepIndexFromStatus(data.status);
  const progressPct =
    TRACK_STEPS.length === 1 ? 0 : (activeIdx / (TRACK_STEPS.length - 1)) * 100;

  const badgeTone =
    data.statusBadge === "Delivered"
      ? "bg-green-50 text-green-700 border-green-200"
      : data.statusBadge === "Out for delivery"
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : data.statusBadge === "In transit"
          ? "bg-blue-50 text-belims-blue border-blue-200"
          : "bg-gray-50 text-gray-700 border-gray-200";

  const copyLink = async () => {
    const link = `${window.location.origin}/track-order?order-number=${encodeURIComponent(
      data.trackingRef,
    )}`;
    try {
      await navigator.clipboard.writeText(link);
      alert("Tracking link copied ✅");
    } catch {
      // fallback
      prompt("Copy this tracking link:", link);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header / Summary Card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 md:px-6 md:py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-belims-blue">
                <Package size={18} />
              </div>

              <div className="min-w-0">
                <div className="text-xs text-gray-500">Tracking reference</div>
                <div className="text-lg font-extrabold tracking-tight text-gray-900 font-heading truncate">
                  {data.trackingRef}
                </div>
              </div>

              <span
                className={`ml-auto md:ml-0 inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold ${badgeTone}`}
              >
                <Sparkles size={14} />
                {data.statusBadge}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
              {data.details?.courier ? (
                <span className="inline-flex items-center rounded-full bg-gray-50 border border-gray-200 px-3 py-1">
                  Courier:{" "}
                  <span className="ml-1 font-bold">{data.details.courier}</span>
                </span>
              ) : null}

              {data.details?.serviceLevel ? (
                <span className="inline-flex items-center rounded-full bg-gray-50 border border-gray-200 px-3 py-1">
                  Service:{" "}
                  <span className="ml-1 font-bold">
                    {data.details.serviceLevel}
                  </span>
                </span>
              ) : null}

              {data.etaText ? (
                <span className="inline-flex items-center rounded-full bg-gray-50 border border-gray-200 px-3 py-1">
                  ETA: <span className="ml-1 font-bold">{data.etaText}</span>
                </span>
              ) : null}

              {data.lastUpdated ? (
                <span className="inline-flex items-center rounded-full bg-gray-50 border border-gray-200 px-3 py-1">
                  <TimerReset size={14} className="mr-1" />
                  Updated:{" "}
                  <span className="ml-1 font-bold">{data.lastUpdated}</span>
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={copyLink}
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 transition"
            >
              <Copy size={16} />
              Copy link
            </button>

            <button
              onClick={onRefresh}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 transition disabled:opacity-60"
            >
              <RefreshCcw
                size={16}
                className={`${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>
        </div>

        {/* Progress */}
        <div className="px-5 pb-5 md:px-6 md:pb-6">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Order tracking</span>

            <label className="inline-flex items-center gap-2 select-none">
              <span className="font-semibold text-gray-600">Auto-refresh</span>
              <button
                type="button"
                onClick={() => onToggleAutoRefresh(!autoRefresh)}
                className={[
                  "relative h-6 w-11 rounded-full border transition",
                  autoRefresh
                    ? "bg-belims-blue border-belims-blue"
                    : "bg-gray-200 border-gray-300",
                ].join(" ")}
              >
                <span
                  className={[
                    "absolute top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-white shadow transition",
                    autoRefresh ? "left-6" : "left-1",
                  ].join(" ")}
                />
              </button>
            </label>
          </div>

          {/* Progress line */}
          <div className="relative mt-4">
            <div className="h-[3px] bg-gray-200 rounded-full" />
            <div
              className="absolute top-0 left-0 h-[3px] bg-belims-blue rounded-full transition-[width] duration-700 ease-out"
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
                        ? "bg-belims-blue text-white shadow-md"
                        : isActive
                          ? "bg-white border-2 border-belims-blue text-belims-blue shadow-sm"
                          : "bg-gray-100 text-gray-400",
                    ].join(" ")}
                    style={
                      isActive
                        ? ({
                            animation: "softPulse 2.3s ease-in-out infinite",
                          } as React.CSSProperties)
                        : undefined
                    }
                  >
                    <Icon size={20} />
                  </div>

                  <div className="mt-3 text-[11px] md:text-xs font-bold uppercase tracking-wide text-gray-600 text-center">
                    {step.label}
                  </div>

                  {/* Timestamp hints */}
                  {idx === 0 && data.events?.length ? (
                    <div className="mt-1 text-[11px] text-gray-500 tabular-nums text-center">
                      {formatFriendlyDate(
                        data.events[data.events.length - 1]?.timestamp,
                      )}
                    </div>
                  ) : idx === activeIdx && data.events?.length ? (
                    <div className="mt-1 text-[11px] text-gray-500 tabular-nums text-center">
                      {formatFriendlyDate(data.events[0]?.timestamp)}
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
            <span
              className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-bold ${badgeTone}`}
            >
              {data.statusBadge}
            </span>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="rounded-xl border border-gray-100 p-4">
            <div className="text-gray-500">Shipment</div>
            <div className="font-bold text-gray-900">{data.trackingRef}</div>

            {data.details?.orderNo && (
              <>
                <div className="mt-3 text-gray-500">Order</div>
                <div className="font-bold text-gray-900">
                  {data.details.orderNo}
                </div>
              </>
            )}
          </div>

          <div className="rounded-xl border border-gray-100 p-4">
            {data.details?.serviceLevel && (
              <>
                <div className="text-gray-500">Service level</div>
                <div className="font-bold text-gray-900">
                  {data.details.serviceLevel}
                </div>
              </>
            )}

            {data.details?.courier && (
              <>
                <div className="mt-3 text-gray-500">Courier</div>
                <div className="font-bold text-gray-900">
                  {data.details.courier}
                </div>
              </>
            )}

            {data.etaText ? (
              <>
                <div className="mt-3 text-gray-500">Estimated delivery</div>
                <div className="font-bold text-gray-900 tabular-nums">
                  {data.etaText}
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* Events timeline */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 md:p-6">
        <div className="flex items-center justify-between">
          <div className="text-lg font-extrabold text-gray-900 font-heading">
            Tracking events
          </div>
          <div className="text-xs text-gray-500">Latest first</div>
        </div>

        {Array.isArray(data.events) && data.events.length > 0 ? (
          <div className="mt-5 relative">
            <div className="absolute left-[11px] top-1 bottom-1 w-[2px] bg-gray-100" />

            <div className="space-y-4">
              {data.events.map((ev, idx) => (
                <div
                  key={idx}
                  className="relative pl-10"
                  style={{
                    opacity: 1,
                    transform: "translateY(0px)",
                    transition: "all 250ms ease",
                    transitionDelay: `${idx * 35}ms`,
                  }}
                >
                  <div
                    className={[
                      "absolute left-[3px] top-[6px] h-5 w-5 rounded-full border-2 flex items-center justify-center",
                      idx === 0
                        ? "border-belims-blue bg-blue-50"
                        : "border-gray-200 bg-white",
                    ].join(" ")}
                  >
                    <div
                      className={[
                        "h-2.5 w-2.5 rounded-full",
                        idx === 0 ? "bg-belims-blue" : "bg-gray-300",
                      ].join(" ")}
                    />
                  </div>

                  <div className="rounded-xl border border-gray-100 bg-white p-4 hover:border-gray-200 hover:shadow-sm transition">
                    <div className="flex items-start justify-between gap-3">
                      <div className="font-bold text-gray-900">{ev.label}</div>

                      <div className="text-xs text-gray-500 tabular-nums">
                        {formatFriendlyDate(ev.timestamp)}
                      </div>
                    </div>

                    {ev.location ? (
                      <div className="mt-1 text-sm text-gray-600">
                        {ev.location}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-gray-200 p-5 text-sm text-gray-600">
            No tracking events yet. Your shipment will update once Bob Go
            registers the first scan.
          </div>
        )}
      </div>

      {/* CSS keyframes (once) */}
      <style>{`
        @keyframes softPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(30, 64, 175, .18); }
          50% { box-shadow: 0 0 0 12px rgba(30, 64, 175, 0); }
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

  const [rawResult, setRawResult] = useState<any>(null);
  const [normalized, setNormalized] = useState<NormalizedTracking | null>(null);

  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    setOrderNumber(urlOrder);
  }, [urlOrder]);

  const track = async (value: string) => {
    setLoading(true);
    setError(null);

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

      setRawResult(data);
      setNormalized(normalizeTrackingResult(data));
    } catch (e: any) {
      setError(e?.message || "Unable to fetch tracking right now.");
      setRawResult(null);
      setNormalized(null);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = orderNumber.trim().toUpperCase();
    if (!value) return;

    setSearchParams({ "order-number": value }, { replace: true });
    track(value);
  };

  // Auto run when URL contains ?order-number=
  useEffect(() => {
    if (urlOrder.trim()) {
      track(urlOrder.trim().toUpperCase());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlOrder]);

  // Auto refresh poll (20s)
  useEffect(() => {
    if (!autoRefresh) return;
    if (!normalized?.trackingRef) return;

    const id = window.setInterval(() => {
      track(normalized.trackingRef);
    }, 20000);

    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, normalized?.trackingRef]);

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
            className="flex-1 border rounded-lg px-3 py-2 font-semibold tracking-wide uppercase"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-belims-blue text-white px-5 py-2 rounded-lg font-bold disabled:opacity-60 inline-flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <RefreshCcw className="animate-spin" size={16} />
                Tracking...
              </>
            ) : (
              "Track"
            )}
          </button>
        </form>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {!error && !normalized && (
          <div className="mt-6 rounded-xl border border-dashed border-gray-200 p-6 text-sm text-gray-600">
            <div className="font-bold text-gray-900 mb-1">
              Tip: Paste your tracking ref
            </div>
            Once you’ve placed an order, you’ll receive a tracking reference
            like <span className="font-bold">UASS33KZ</span>.
          </div>
        )}

        {normalized && (
          <div className="mt-6">
            <TrackingProgressCard
              data={normalized}
              loading={loading}
              autoRefresh={autoRefresh}
              onToggleAutoRefresh={setAutoRefresh}
              onRefresh={() => {
                const v = normalized.trackingRef.trim();
                if (v) track(v);
              }}
            />
          </div>
        )}

        {/* Debug (optional) */}
        {false && rawResult ? (
          <pre className="mt-6 text-xs bg-gray-50 border rounded p-4 overflow-auto">
            {JSON.stringify(rawResult, null, 2)}
          </pre>
        ) : null}
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

  // Slider State
  const [heroCategoryIndex, setHeroCategoryIndex] = useState(0);
  const [projectSlideIndex, setProjectSlideIndex] = useState(0);
  const [activeCategory, setActiveCategory] = useState(CATEGORY_PILLS[0]);

  const currentSliderContent =
    CATEGORY_SLIDER_DATA[activeCategory] || CATEGORY_SLIDER_DATA["default"];

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const apiBase = getApiBaseUrl();

        const response = await fetch(`${apiBase}/categories`);
        if (response.ok) {
          const categories = await response.json();
          const childCategories = categories
            .filter((cat: any) => cat.parent !== null)
            .map((cat: any) => cat.name)
            .sort();

          if (childCategories.length > 0) {
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

  const clearCart = useCallback(() => {
    setCartItems([]);
    setIsCartOpen(false);
  }, []);

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
        clearCart={clearCart}
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
                onClearCart={props.clearCart}
              />
            }
          />

          <Route path="/track-order" element={<TrackOrderPage />} />

          <Route path="/order-confirmation" element={<OrderConfirmation />} />
        </Routes>
      </main>

      <footer className="bg-[#1a1f2e] text-gray-400 py-12 text-sm pb-24">
        <div className="container mx-auto px-4 text-center">
          &copy; 2024 Belims Hardware.
        </div>
      </footer>

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
