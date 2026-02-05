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
import { MobileBottomNav } from "./components/MobileBottomNav";
/* import { FreeShippingWidget } from "./components/FreeShippingWidget"; */
import { OnboardingWizard } from "./components/OnboardingWizard";
import { PriceMatchModal } from "./components/PriceMatchModal";
import { ComparisonModal } from "./components/ComparisonModal";
import { Footer } from "./components/Footer";
import { Checkout } from "./components/Checkout";
import { OrderConfirmation } from "./components/OrderConfirmation";
import { AdminOrderPreview } from "./components/AdminOrderPreview";
import { AdminAccountPreview } from "./components/AdminAccountPreview";
import { Archive } from "./components/Archive";
import { RecentlyViewed } from "./components/RecentlyViewed";
import { ShopByCategory } from "./components/ShopByCategory";
import { TrackOrderPage } from "./components/TrackOrderPage";
import { BrandStrip } from "./components/BrandStrip";
import { AuthPage } from "./components/AuthPage";
import { AccountPage } from "./components/AccountPage";
import { Toast } from "./components/Toast";
import HeroBanner from "./components/HeroBanner";
import { CountdownTimer } from "./components/CountdownTimer";
import CollageGrid from "./components/CollageGrid";
import { getCurrentUser, UserData, logoutUser } from "./services/authService";

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
} from "lucide-react";

// ========== ROUTE WRAPPER COMPONENTS ==========

const ProductPage = ({
  products,
  addToCart,
  onBuyNow,
  onCompare,
  setPriceMatchProduct,
  isAuthenticated,
  isTradeApproved,
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
      allProducts={products}
      addToCart={addToCart}
      onBuyNow={onBuyNow}
      onCompare={onCompare}
      onPriceMatch={setPriceMatchProduct}
      onBrandClick={(brand) =>
        navigate(`/shop?brand=${encodeURIComponent(brand)}`)
      }
      isAuthenticated={isAuthenticated}
      isTradeApproved={isTradeApproved}
    />
  );
};

const ArchivePage = ({
  products,
  addToCart,
  onBuyNow,
  onCompare,
  isAuthenticated,
  isTradeApproved,
}) => {
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
      isAuthenticated={isAuthenticated}
      isTradeApproved={isTradeApproved}
    />
  );
};

type DealFilter =
  | "all"
  | "deal_of_day"
  | "featured"
  | "trade_special"
  | "clearance"
  | "weekly";

const HomePage = ({
  products,
  featuredProducts,
  addToCart,
  handleBuyNow,
  handleProductClick,
  addToCompare,
  categoryPills,
  isAuthenticated,
  isTradeApproved,
}) => {
  const navigate = useNavigate();
  const [activeDealFilter, setActiveDealFilter] = useState<DealFilter>("all");
  const isTradeLoggedIn = !!isTradeApproved;

  // Filter products for Deals of the Day
  const dealsOfTheDay = useMemo(() => {
    return products
      .filter(
        (product) =>
          product.deals_resolved?.consumer?.bestDeal?.type === "deal_of_day",
      )
      .slice(0, 4);
  }, [products]);

  // Filter products for Featured Deals
  const featuredDeals = useMemo(() => {
    return products
      .filter((product) => {
        if (product.deals_resolved?.trade?.bestDeal?.type === "trade_special") {
          return false;
        }
        // If we have a resolved deal, it's featured worthy
        if (product.deals_resolved?.consumer?.bestDeal) return true;
        // Fallback to standard WooCommerce sale price check or native featured flag
        return (
          (product.sale_price && parseFloat(String(product.sale_price)) > 0) ||
          product.isFeatured
        );
      })
      .sort((a, b) => {
        // Sort by priority (lower is better/higher priority)
        // Deal priorities: day(10), clearance(20), weekly(30), trade(40), sale(50)
        // We assign arbitrary priority to native featured (e.g., 45) and generic sale (100)
        const pA =
          a.deals_resolved?.consumer?.bestDeal?.priority ??
          (a.isFeatured ? 45 : 100);
        const pB =
          b.deals_resolved?.consumer?.bestDeal?.priority ??
          (b.isFeatured ? 45 : 100);
        return pA - pB;
      })
      .slice(0, 4);
  }, [products]);

  // Filter products for Trade Specials
  const tradeSpecials = useMemo(() => {
    return products
      .filter(
        (product) =>
          product.deals_resolved?.trade?.bestDeal?.type === "trade_special",
      )
      .slice(0, 4);
  }, [products]);

  // Filter products for Clearance
  const clearanceDeals = useMemo(() => {
    return products
      .filter(
        (product) =>
          product.deals_resolved?.consumer?.bestDeal?.type === "clearance",
      )
      .slice(0, 4);
  }, [products]);

  // Filter products for Weekly Deals
  const weeklyDeals = useMemo(() => {
    return products
      .filter(
        (product) =>
          product.deals_resolved?.consumer?.bestDeal?.type === "weekly_special",
      )
      .slice(0, 4);
  }, [products]);

  const shouldShowSection = (sectionType: DealFilter) => {
    if (activeDealFilter === "all") return true;
    return activeDealFilter === sectionType;
  };

  return (
    <>
      <HeroBanner />

      <ShopByCategory
        products={products}
        addToCart={addToCart}
        onBuyNow={handleBuyNow}
        onCompare={addToCompare}
        isAuthenticated={isAuthenticated}
        isTradeApproved={isTradeApproved}
      />

      {/* Deal Filter Chips */}
      <section
        className=" bg-gray-50 border-t border-black/5 py-12 pb-0"
        aria-label="Deal filters"
      >
        <div className="container mx-auto px-4 flex flex-col gap-4 md:flex-row md:gap-8 md:items-center">
          <div className="mb-0">
            <h2 className="text-2xl font-bold text-gray-900 font-heading">
              {activeDealFilter === "all" ? "Browse all Deals" : "Browse Deals"}
            </h2>
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar">
            {[
              { key: "all", label: "All deals", hasProducts: true },
              {
                key: "deal_of_day",
                label: "Deals of the day",
                hasProducts: dealsOfTheDay.length > 0,
              },
              {
                key: "weekly",
                label: "Weekly deals",
                hasProducts: weeklyDeals.length > 0,
              },
              {
                key: "trade_special",
                label: "Trade specials",
                hasProducts: tradeSpecials.length > 0,
              },
              {
                key: "clearance",
                label: "Clearance",
                hasProducts: clearanceDeals.length > 0,
              },
            ]
              .filter((f) => f.hasProducts)
              .map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => setActiveDealFilter(filter.key as DealFilter)}
                  className={`px-4 h-9 rounded border font-semibold font-heading transition-colors whitespace-nowrap text-[13px] ${
                    activeDealFilter === filter.key
                      ? "bg-belims-blue text-white border-gray-100"
                      : "bg-white text-[#64748b] border-gray-100 hover:bg-belims-blue hover:text-white"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
          </div>
        </div>
      </section>

      {/* Featured + Daily + Weekly Deals Grid (All Deals View) */}
      {activeDealFilter === "all" && (
        <section
          className="pt-6 pb-14 bg-gray-50 border-b border-black/5"
          aria-label="Deals highlights"
        >
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="rounded-lg border border-gray-200 bg-white p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 font-heading">
                      Deals of the day
                    </h2>
                    <p className="text-gray-500 text-xs mt-1">
                      Fresh discounts daily — expire at midnight.
                    </p>
                  </div>
                  <a
                    href="/deals"
                    className="text-xs font-semibold text-belims-blue hover:text-belims-accent whitespace-nowrap"
                  >
                    View all →
                  </a>
                </div>
                {dealsOfTheDay.length > 0 ? (
                  <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4">
                    {dealsOfTheDay.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        addToCart={addToCart}
                        className="min-w-full max-w-full w-full"
                        variant="flat"
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 text-gray-500 rounded-lg border border-gray-100">
                    <p>No deals available today. Check back soon!</p>
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 font-heading">
                      Trade specials
                    </h2>
                    <p className="text-gray-500 text-xs mt-1">
                      Contractor pricing available — log in to purchase.
                    </p>
                  </div>
                  <a
                    href="/deals?type=trade_special"
                    className="text-xs font-semibold text-belims-blue hover:text-belims-accent whitespace-nowrap"
                  >
                    View all →
                  </a>
                </div>
                {tradeSpecials.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4">
                    {tradeSpecials.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        addToCart={addToCart}
                        className="min-w-full max-w-full w-full"
                        variant="flat-horizontal"
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 text-gray-500 rounded-lg border border-gray-100">
                    <p>No trade specials currently.</p>
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 font-heading">
                      Weekly deals
                    </h2>
                    <p className="text-gray-500 text-xs mt-1">
                      Weekly savings across selected products.
                    </p>
                  </div>
                  <a
                    href="/deals/weekly"
                    className="text-xs font-semibold text-belims-blue hover:text-belims-accent whitespace-nowrap"
                  >
                    View all →
                  </a>
                </div>
                {weeklyDeals.length > 0 ? (
                  <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4">
                    {weeklyDeals.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        addToCart={addToCart}
                        className="min-w-full max-w-full w-full"
                        variant="flat"
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 text-gray-500 rounded-lg border border-gray-100">
                    <p>
                      No weekly specials available right now. Check back soon!
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Featured Deals */}
      {activeDealFilter !== "all" && shouldShowSection("featured") && (
        <section
          className="pt-6 pb-14 bg-gray-50 border-b border-black/5"
          aria-label="Featured deals"
        >
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-end mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 font-heading">
                  On Sale
                </h2>
                <p className="text-gray-500 text-sm mt-1">
                  Hand-picked savings across the store
                </p>
              </div>
              <a
                href="/deals"
                className="text-sm font-semibold text-belims-blue hover:text-belims-accent hidden md:block"
              >
                View all →
              </a>
            </div>

            {featuredDeals.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {featuredDeals.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    addToCart={addToCart}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p>No featured deals right now. Check back soon!</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Deals of the Day */}
      {activeDealFilter !== "all" && shouldShowSection("deal_of_day") && (
        <section
          className="py-14 bg-belims-gray border-b border-black/5"
          aria-label="Deals of the day"
        >
          <div className="container mx-auto px-4">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4 mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 font-heading">
                  Deals of the day
                </h2>
                <p className="text-gray-500 text-sm mt-1">
                  Fresh discounts daily — expire at midnight. While stocks last.
                </p>
              </div>
              <div className="flex items-center gap-4">
                <CountdownTimer
                  targetDate={new Date(new Date().setHours(23, 59, 59, 999))}
                  label="Hurry up! Offer ends in"
                />
                <a
                  href="/deals"
                  className="text-sm font-semibold text-belims-blue hover:text-belims-accent hidden md:block whitespace-nowrap"
                >
                  View all →
                </a>
              </div>
            </div>

            {dealsOfTheDay.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {dealsOfTheDay.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    addToCart={addToCart}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p>No deals available today. Check back soon!</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Collage Grid */}
      <CollageGrid />

      {/* Weekly Deals */}
      {activeDealFilter !== "all" && shouldShowSection("weekly") && (
        <section
          className="py-14  bg-belims-gray border-b border-black/5"
          aria-label="Weekly deals and bulk savings"
        >
          <div className="container mx-auto px-4">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4 mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 font-heading">
                  Weekly deals
                </h2>
                <p className="text-gray-500 text-sm mt-1">
                  Weekly savings across selected products. — available until
                  Sunday at midnight.
                </p>
              </div>
              <div className="flex items-center gap-4">
                {(() => {
                  const now = new Date();
                  const dayOfWeek = now.getDay();
                  const daysUntilSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek;
                  const sunday = new Date(now);
                  sunday.setDate(now.getDate() + daysUntilSunday);
                  sunday.setHours(23, 59, 59, 999);

                  const timeRemaining = sunday.getTime() - now.getTime();
                  const hoursRemaining = timeRemaining / (1000 * 60 * 60);

                  const dayName = sunday.toLocaleDateString("en-US", {
                    weekday: "long",
                  });
                  const date = sunday.toLocaleDateString("en-US", {
                    day: "numeric",
                    month: "long",
                  });

                  if (hoursRemaining < 24) {
                    return (
                      <div className="flex flex-col items-end">
                        <CountdownTimer targetDate={sunday} label="Ends" />
                        <span className="text-xs text-gray-500 mt-1">
                          {dayName}, {date}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div className="flex flex-col items-end">
                      <span className="text-sm font-semibold text-gray-900">
                        Deals End
                      </span>
                      <span className="text-xs text-gray-500 mt-1">
                        {dayName}, {date}
                      </span>
                    </div>
                  );
                })()}
                <a
                  href="/deals/weekly"
                  className="text-sm font-semibold text-belims-blue hover:text-belims-accent hidden md:block whitespace-nowrap"
                >
                  All weekly deals →
                </a>
              </div>
            </div>

            {/* <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <a
                href="/deals/paint-week"
                className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg p-6 hover:from-blue-600 hover:to-blue-700 transition-all"
              >
                <div className="text-sm font-semibold mb-1">This Week</div>
                <div className="text-xl font-bold">Paint Week</div>
                <div className="text-sm opacity-90 mt-2">Up to 30% off</div>
              </a>

              <a
                href="/deals/power-tools"
                className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-lg p-6 hover:from-orange-600 hover:to-orange-700 transition-all"
              >
                <div className="text-sm font-semibold mb-1">Limited Time</div>
                <div className="text-xl font-bold">Power Tools</div>
                <div className="text-sm opacity-90 mt-2">Save R200+</div>
              </a>

              <a
                href="/deals/bulk-cement"
                className="bg-gradient-to-br from-gray-700 to-gray-800 text-white rounded-lg p-6 hover:from-gray-800 hover:to-gray-900 transition-all"
              >
                <div className="text-sm font-semibold mb-1">Bulk Buy</div>
                <div className="text-xl font-bold">Cement</div>
                <div className="text-sm opacity-90 mt-2">10+ bags save 15%</div>
              </a>

              <a
                href="/deals/trade-bundles"
                className="bg-gradient-to-br from-green-600 to-green-700 text-white rounded-lg p-6 hover:from-green-700 hover:to-green-800 transition-all"
              >
                <div className="text-sm font-semibold mb-1">Trade Only</div>
                <div className="text-xl font-bold">Bundles</div>
                <div className="text-sm opacity-90 mt-2">Special pricing</div>
              </a>
            </div> */}

            {weeklyDeals.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {weeklyDeals.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    addToCart={addToCart}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg">
                <p>No weekly specials available right now. Check back soon!</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Trade Specials */}
      {shouldShowSection("trade_special") && (
        <section
          className="py-14 bg-belims-gray border-b border-black/5"
          aria-label="Trade specials"
        >
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-end mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 font-heading">
                  Trade specials
                </h2>
                <p className="text-gray-500 text-sm mt-1">
                  {isTradeLoggedIn
                    ? "Exclusive contractor pricing for your account"
                    : "Contractor pricing available — log in to purchase at trade rate"}
                </p>
              </div>
              <a
                href="/deals?type=trade_special"
                className="text-sm font-semibold text-belims-blue hover:text-belims-accent hidden md:block"
              >
                See all trade deals →
              </a>
            </div>

            {tradeSpecials.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {tradeSpecials.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    addToCart={addToCart}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p>No trade specials currently.</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Trade Essentials */}
      <section
        className="bg-belims-gray border-y border-black/5"
        aria-label="Trade essentials"
      >
        <div className="container mx-auto px-4 py-12 md:py-14">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h2 className="font-heading text-h3 text-gray-900">
                Trade essentials
              </h2>
              <p className="mt-2 font-body text-base text-gray-500">
                Quick access for everyday jobs
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
            {[
              { href: "/shop/ladders-trestles", label: "Ladders & Trestles" },
              { href: "/shop/power-tools", label: "Power Tools" },
              { href: "/shop/fasteners", label: "Fasteners" },
              { href: "/shop/sealants-adhesives", label: "Sealants" },
              { href: "/shop/safety-wear", label: "Safety Wear" },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className={[
                  "group relative block",
                  "rounded-lg border border-black/10 bg-white",
                  "p-5 shadow-[0_1px_2px_rgba(16,24,40,0.06)]",
                  "transition-all duration-200",
                  "hover:shadow-[0_8px_24px_rgba(16,24,40,0.08)]",
                  "hover:-translate-y-0.5",
                ].join(" ")}
              >
                {/* subtle red accent bar (Belims accent) */}
                <span className="absolute left-0 top-0 h-1 w-10 rounded-br-lg bg-red-600" />

                <div className="font-heading text-h5 text-gray-900 mb-3">
                  {item.label}
                </div>

                <div className="inline-flex items-center gap-2 font-body text-sm font-semibold text-gray-500 transition-colors group-hover:text-belims-blue">
                  Shop now <span aria-hidden>→</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Brand Strip */}
      <BrandStrip />

      {/* Featured Category Spotlights */}
      <section className="mb-16" aria-label="Featured categories">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-end mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 font-heading">
                Featured categories
              </h2>
              <p className="text-gray-500 text-sm mt-1">
                Top departments and their most-used subcategories
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Paint & Coatings
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                Interior, exterior and prep — everything for a clean finish.
              </p>
              <ul className="space-y-2 mb-4">
                <li>
                  <a
                    href="/shop/paint/interior"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Interior Paint
                  </a>
                </li>
                <li>
                  <a
                    href="/shop/paint/exterior"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Exterior Paint
                  </a>
                </li>
                <li>
                  <a
                    href="/shop/paint/primers-sealers"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Primers & Sealers
                  </a>
                </li>
              </ul>
              <a
                href="/shop/paint"
                className="text-sm font-semibold text-belims-blue hover:text-belims-accent"
              >
                Shop Paint →
              </a>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Plumbing & Sanitaryware
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                Pipes, fittings and fixtures for bathrooms and kitchens.
              </p>
              <ul className="space-y-2 mb-4">
                <li>
                  <a
                    href="/shop/plumbing/pipes-fittings"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Pipes & Fittings
                  </a>
                </li>
                <li>
                  <a
                    href="/shop/plumbing/bathroom-accessories"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Bathroom Accessories
                  </a>
                </li>
                <li>
                  <a
                    href="/shop/plumbing/kitchen-fixtures"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Kitchen Fixtures
                  </a>
                </li>
              </ul>
              <a
                href="/shop/plumbing-bathroom-kitchen"
                className="text-sm font-semibold text-belims-blue hover:text-belims-accent"
              >
                Shop Plumbing →
              </a>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Doors & Windows
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                Frames, hardware and security fittings for every opening.
              </p>
              <ul className="space-y-2 mb-4">
                <li>
                  <a
                    href="/shop/doors-windows/frames"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Frames
                  </a>
                </li>
                <li>
                  <a
                    href="/shop/doors-windows/hardware"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Hardware
                  </a>
                </li>
                <li>
                  <a
                    href="/shop/doors-windows/security"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Security Fittings
                  </a>
                </li>
              </ul>
              <a
                href="/shop/doors-windows"
                className="text-sm font-semibold text-belims-blue hover:text-belims-accent"
              >
                Shop Doors & Windows →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Project Inspiration */}
      <section className="mb-16" aria-label="Project inspiration">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-end mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 font-heading">
                Get the job done
              </h2>
              <p className="text-gray-500 text-sm mt-1">
                Curated essentials for common home and trade projects
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {PROJECT_IDEAS.map((project) => (
              <div
                key={project.id}
                className="bg-white border border-gray-200 rounded-lg overflow-hidden"
              >
                <img
                  src={project.image}
                  alt={project.title}
                  className="h-40 w-full object-cover"
                />
                <div className="p-4">
                  <h3 className="font-bold text-gray-900 mb-2">
                    {project.title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    {project.description}
                  </p>
                  <a
                    href="#"
                    className="text-sm font-semibold text-belims-blue hover:text-belims-accent"
                  >
                    {project.linkText} →
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Lifestyle Section */}
      <section
        className="mb-16 bg-gray-50 py-12"
        aria-label="Built for real projects"
      >
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Built for real projects — at home and on site
              </h2>
              <p className="text-gray-600 mb-6">
                From quick DIY fixes to full-scale renovations, Belims supplies
                trusted tools, materials and finishes used by professionals and
                homeowners across South Africa.
              </p>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span>Trade-grade products</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span>Reliable stock & delivery</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span>Clear pricing, no guesswork</span>
                </li>
              </ul>
              <a
                href="/shop"
                className="inline-block px-6 py-3 bg-belims-blue text-white font-semibold rounded hover:bg-belims-accent transition-colors"
              >
                Start your project →
              </a>
            </div>
            <img
              src="/images/development/midsection-worker-using-circular-saw-workshop.webp"
              alt="Worker using tools"
              className="h-64 lg:h-96 w-full object-cover rounded-lg"
            />
          </div>
        </div>
      </section>

      {/* Seasonal Block */}
      <section className="mb-16" aria-label="Seasonal essentials">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Load Shedding Essentials
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                Lighting, power backup & safety solutions.
              </p>
              <a
                href="/shop/load-shedding"
                className="text-sm font-semibold text-belims-blue hover:text-belims-accent"
              >
                Shop essentials →
              </a>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Rainy Season Prep
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                Sealants, waterproofing & drainage.
              </p>
              <a
                href="/shop/waterproofing"
                className="text-sm font-semibold text-belims-blue hover:text-belims-accent"
              >
                Prepare now →
              </a>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Outdoor Maintenance
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                Garden tools, coatings & repairs.
              </p>
              <a
                href="/shop/outdoor"
                className="text-sm font-semibold text-belims-blue hover:text-belims-accent"
              >
                Shop outdoor →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* SEO Categories */}
      <section className="mb-16" aria-label="Popular categories">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-gray-900 font-heading mb-6">
            Popular Categories
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <a
              href="/shop/boards-sheeting"
              className="text-sm text-blue-600 hover:underline"
            >
              Boards & Sheeting
            </a>
            <a
              href="/shop/ceiling-accessories"
              className="text-sm text-blue-600 hover:underline"
            >
              Ceiling Accessories
            </a>
            <a
              href="/shop/tiles-adhesives"
              className="text-sm text-blue-600 hover:underline"
            >
              Tiles & Adhesives
            </a>
            <a
              href="/shop/window-film"
              className="text-sm text-blue-600 hover:underline"
            >
              Window Film
            </a>
            <a
              href="/shop/fasteners"
              className="text-sm text-blue-600 hover:underline"
            >
              Fasteners
            </a>
            <a
              href="/shop/power-tool-accessories"
              className="text-sm text-blue-600 hover:underline"
            >
              Power Tool Accessories
            </a>
            <a
              href="/shop/sealants"
              className="text-sm text-blue-600 hover:underline"
            >
              Sealants
            </a>
            <a
              href="/shop/safety-wear"
              className="text-sm text-blue-600 hover:underline"
            >
              Safety Wear
            </a>
            <a
              href="/shop/electrical-components"
              className="text-sm text-blue-600 hover:underline"
            >
              Electrical Components
            </a>
            <a
              href="/shop/plumbing-fittings"
              className="text-sm text-blue-600 hover:underline"
            >
              Plumbing Fittings
            </a>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      {/* <section className="mb-16">
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
            />
          ))}
        </div>
      </section> */}

      {/* <RecentlyViewed
        addToCart={addToCart}
        onBuyNow={handleBuyNow}
        onProductClick={handleProductClick}
        onCompare={addToCompare}
      /> */}
    </>
  );
};

// ========== MAIN APP COMPONENT ==========

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLocatorOpen, setIsLocatorOpen] = useState(false);
  const [isPaintOpen, setIsPaintOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(() => {
    // Temporarily disabled - onboarding won't show on site load
    return false;
    // const hasSeen = localStorage.getItem("hasSeenOnboarding");
    // return !hasSeen;
  });
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [userType, setUserType] = useState<"personal" | "business">("personal");
  const [comparisonList, setComparisonList] = useState<Product[]>([]);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [priceMatchProduct, setPriceMatchProduct] = useState<Product | null>(
    null,
  );
  const [categoryPills, setCategoryPills] = useState<string[]>(CATEGORY_PILLS);
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

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
          }
        }
      } catch (error) {
        console.error("Failed to load categories:", error);
      }
    };
    loadCategories();
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      const user = await getCurrentUser();
      setCurrentUser(user);
    };
    checkAuth();
  }, []);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const apiProducts = await fetchProducts();
        if (apiProducts?.length) setProducts(apiProducts);

        const apiFeatured = await fetchFeaturedProducts();
        if (apiFeatured?.length) setFeaturedProducts(apiFeatured);
      } catch (error) {
        console.error("Failed to load products:", error);
      }
    };
    loadProducts();
  }, []);

  const addToCart = (product: Product) => {
    setCartItems((prev) => {
      const exists = prev.find((item) => item.id === product.id);
      if (exists) {
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

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
  };

  const handleLogin = (user: UserData) => {
    setCurrentUser(user);
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      setCurrentUser(null);
      showToast("Successfully logged out", "success");
    } catch (error) {
      showToast("Error logging out", "error");
    }
  };

  return (
    <Router>
      <MainApp
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
        categoryPills={categoryPills}
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
        showToast={showToast}
        toast={toast}
        setToast={setToast}
        handleLogin={handleLogin}
        handleLogout={handleLogout}
      />
    </Router>
  );
}

function MainApp(props) {
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = !!props.currentUser;
  const isTradeApproved = !!props.currentUser?.roles?.includes("contractor");

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
        setSelectedStore={props.setSelectedStore}
        cartItems={props.cartItems}
        toggleCart={() => props.setIsCartOpen(true)}
        toggleStoreLocator={() => props.setIsLocatorOpen(true)}
        onOpenPaintAssistant={() => props.setIsPaintOpen(true)}
        onOpenTrackOrder={() => navigate("/track-order")}
        onOpenOnboarding={() => props.setIsOnboardingOpen(true)}
        onCompare={props.addToCompare}
        products={props.products}
        currentUser={props.currentUser}
        setCurrentUser={props.setCurrentUser}
      />

      <main className="flex-1 w-full px-0 relative">
        <Routes>
          <Route
            path="/"
            element={
              <HomePage
                {...props}
                handleProductClick={handleProductClick}
                isAuthenticated={isAuthenticated}
                isTradeApproved={isTradeApproved}
              />
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
                isAuthenticated={isAuthenticated}
                isTradeApproved={isTradeApproved}
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
                isAuthenticated={isAuthenticated}
                isTradeApproved={isTradeApproved}
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
                isAuthenticated={isAuthenticated}
                isTradeApproved={isTradeApproved}
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
          <Route
            path="/login"
            element={
              <AuthPage
                mode="login"
                onSuccess={props.handleLogin}
                showToast={props.showToast}
              />
            }
          />
          <Route
            path="/register"
            element={
              <AuthPage
                mode="register"
                onSuccess={props.handleLogin}
                showToast={props.showToast}
              />
            }
          />
          <Route path="/track-order" element={<TrackOrderPage />} />
          <Route path="/order-confirmation" element={<OrderConfirmation />} />
          <Route path="/admin/order-preview" element={<AdminOrderPreview />} />
          <Route
            path="/admin/account-preview"
            element={<AdminAccountPreview />}
          />
          <Route
            path="/account"
            element={
              <AccountPage
                user={props.currentUser}
                onLogout={props.handleLogout}
              />
            }
          />
        </Routes>
      </main>

      <Footer />

      {/* <FreeShippingWidget cartItems={props.cartItems} /> */}

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
        recommendedProducts={
          props.featuredProducts.length > 0
            ? props.featuredProducts.slice(0, 8)
            : props.products.filter((p) => p.onSale).slice(0, 8)
        }
        addToCart={props.addToCart}
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
          isAuthenticated={isAuthenticated}
          isTradeApproved={isTradeApproved}
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

      {props.toast && (
        <Toast
          message={props.toast.message}
          type={props.toast.type}
          onClose={() => props.setToast(null)}
        />
      )}

      <MobileBottomNav />
    </div>
  );
}
