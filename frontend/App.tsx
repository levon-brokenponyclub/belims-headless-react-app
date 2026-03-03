import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
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
import { SearchModal } from "./components/SearchModal";
/* import { FreeShippingWidget } from "./components/FreeShippingWidget"; */
import { OnboardingWizard } from "./components/OnboardingWizard";
import { AiAssistant } from "./components/AiAssistant.tsx";
import { BelimsChatbot } from "./src/features/chatbot/components/BelimsChatbot";
import { PriceMatchModal } from "./components/PriceMatchModal";
import { ComparisonModal } from "./components/ComparisonModal";
import { Footer } from "./components/Footer";
import { Checkout } from "./components/Checkout";
import { OrderConfirmation } from "./components/OrderConfirmation";
import { AdminOrderPreview } from "./components/AdminOrderPreview";
import { AdminAccountPreview } from "./components/AdminAccountPreview";
import { Archive } from "./components/Archive";
import { RecentlyViewed } from "./components/RecentlyViewed";
import { FeaturedGrid } from "./components/FeaturedGrid";
import { FilterSearch } from "./components/FilterSearch";
import { ShopByCategory } from "./components/ShopByCategory";
import { DealsSection } from "./components/DealsSection";
import { CategoryGrid } from "./components/CategoryGrid";
import { TradeDeals } from "./components/TradeDeals";
import { TrackOrderPage } from "./components/TrackOrderPage";
import { BrandStrip } from "./components/BrandStrip";
import { AuthPage } from "./components/AuthPage";
import { AccountPage } from "./components/AccountPage";
import { Toast } from "./components/Toast";
import { CookieConsent } from "./components/CookieConsent";
import { Skeleton, SkeletonLine, SkeletonImage } from "./components/Skeleton";
import HeroBanner from "./components/HeroBanner";
import { CountdownTimer } from "./components/CountdownTimer";
import CollageGrid from "./components/CollageGrid";
import ProjectInspiration from "./components/ProjectInspiration";
import { PopularCategories } from "./components/PopularCategories";
import { getCurrentUser, UserData, logoutUser } from "./services/authService";

import { Product, CartItem, Store } from "./types";
import {
  fetchProducts,
  fetchProductById,
  fetchFeaturedProducts,
  fetchCategories,
  getApiBaseUrl,
} from "./services/wooCommerceService";

import {
  STORES,
  HERO_SLIDES,
  CATEGORY_PILLS,
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
  isLoadingProducts,
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
  const [hydratedProduct, setHydratedProduct] = useState<Product | null>(null);
  const [isHydratingProduct, setIsHydratingProduct] = useState(false);

  useEffect(() => {
    if (!id) return;

    let isMounted = true;
    const controller = new AbortController();

    const baseProduct = products.find((p) => String(p.id) === id) || null;
    const hasDetailPayload = Boolean(
      baseProduct?.description ||
      (baseProduct?.images && baseProduct.images.length > 0) ||
      (baseProduct?.specifications && baseProduct.specifications.length > 0),
    );

    if (baseProduct && hasDetailPayload) {
      setHydratedProduct(baseProduct);
      return () => {
        isMounted = false;
        controller.abort();
      };
    }

    setIsHydratingProduct(true);
    fetchProductById(String(id), { signal: controller.signal })
      .then((fullProduct) => {
        if (!isMounted) return;
        if (fullProduct) {
          setHydratedProduct(fullProduct);
        } else {
          setHydratedProduct(baseProduct);
        }
      })
      .finally(() => {
        if (!isMounted) return;
        setIsHydratingProduct(false);
      });

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [id, products]);

  const resolvedProduct = hydratedProduct || product;

  if (
    !resolvedProduct &&
    !isLoadingProducts &&
    !isHydratingProduct &&
    products.length > 0
  )
    return <div className="p-10 text-center">Product not found</div>;
  if (!resolvedProduct && !isLoadingProducts && !isHydratingProduct)
    return <div className="p-10 text-center">Product not found</div>;
  if (!resolvedProduct || isHydratingProduct)
    return (
      <div className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-8">
          <div className="space-y-4">
            <SkeletonImage height="420px" />
            <div className="grid grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={`thumb-skel-${index}`} height="80px" />
              ))}
            </div>
          </div>
          <div className="space-y-5">
            <Skeleton height="1.75rem" width="80%" />
            <Skeleton height="1rem" width="40%" />
            <Skeleton height="2rem" width="55%" />
            <SkeletonLine count={3} height="0.9rem" />
            <Skeleton height="2.75rem" borderRadius="0.5rem" />
          </div>
        </div>
      </div>
    );

  return (
    <SingleProduct
      product={resolvedProduct}
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
  isLoadingProducts,
  addToCart,
  onBuyNow,
  onCompare,
  isAuthenticated,
  isTradeApproved,
}) => {
  const { categorySlug } = useParams();
  const [searchParams] = useSearchParams();

  const categoryParam = searchParams.get("category") || undefined;
  const rangeParam = searchParams.get("range") || undefined;
  const categoryLabel = categorySlug
    ? decodeURIComponent(categorySlug).replace(/-/g, " ")
    : categoryParam;

  const brand = searchParams.get("brand") || undefined;
  const searchQuery = searchParams.get("search") || undefined;

  return (
    <Archive
      products={products}
      isLoadingProducts={isLoadingProducts}
      category={categoryLabel}
      brand={brand}
      range={rangeParam}
      searchQuery={searchQuery}
      addToCart={addToCart}
      onBuyNow={onBuyNow}
      onCompare={onCompare}
      isAuthenticated={isAuthenticated}
      isTradeApproved={isTradeApproved}
    />
  );
};

const HomePage = ({
  products,
  featuredProducts,
  isLoadingProducts,
  addToCart,
  handleBuyNow,
  handleProductClick,
  addToCompare,
  categoryPills,
  isAuthenticated,
  isTradeApproved,
}) => {
  const navigate = useNavigate();
  const homeLoadLoggedRef = useRef(false);

  // Filter products for Clearance

  const brandOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach((product) => {
      const brand = product.brand?.trim();
      if (!brand) return;
      counts[brand] = (counts[brand] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [products]);

  const categoryOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach((product) => {
      const category = product.category?.trim();
      if (!category) return;
      counts[category] = (counts[category] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [products]);

  const rangeOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach((product) => {
      const rawRange =
        product.acf?.range_label ||
        product.acf?.range ||
        product.acf?.range_slug;
      const range = rawRange ? String(rawRange).trim() : "";
      if (!range) return;
      counts[range] = (counts[range] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [products]);

  useEffect(() => {
    if (homeLoadLoggedRef.current) return;
    if (isLoadingProducts || products.length === 0) return;

    let rafB = 0;
    const rafA = window.requestAnimationFrame(() => {
      rafB = window.requestAnimationFrame(() => {
        const loadTimeMs = performance.now();
        console.log(
          `[Performance][Optimized] Home page loaded with products in ${loadTimeMs.toFixed(0)}ms (products: ${products.length})`,
        );
        homeLoadLoggedRef.current = true;
      });
    });

    return () => {
      window.cancelAnimationFrame(rafA);
      if (rafB) window.cancelAnimationFrame(rafB);
    };
  }, [isLoadingProducts, products]);

  return (
    <>
      <HeroBanner />

      {/* <FilterSearch
        brands={brandOptions}
        categories={categoryOptions}
        ranges={rangeOptions}
      /> */}

      <ShopByCategory
        products={products}
        isLoadingProducts={isLoadingProducts}
        addToCart={addToCart}
        onBuyNow={handleBuyNow}
        onCompare={addToCompare}
        isAuthenticated={isAuthenticated}
        isTradeApproved={isTradeApproved}
      />

      <FeaturedGrid />
      {/* Collage Grid */}
      <CollageGrid />

      <DealsSection
        products={products}
        isLoadingProducts={isLoadingProducts}
        addToCart={addToCart}
        onBuyNow={handleBuyNow}
        onCompare={addToCompare}
        isAuthenticated={isAuthenticated}
        isTradeApproved={isTradeApproved}
      />

      {/* Featured Category Spotlights */}
      <CategoryGrid />

      <TradeDeals
        products={products}
        addToCart={addToCart}
        onBuyNow={handleBuyNow}
        onCompare={addToCompare}
        isAuthenticated={isAuthenticated}
        isTradeApproved={isTradeApproved}
      />

      <PopularCategories />

      {/* <section className="mb-16" aria-label="Featured categories">
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
      </section> */}

      {/* Brand Strip */}
      <BrandStrip />

      {/* <ProjectInspiration /> */}

      {/* Lifestyle Section */}
      {/*  <section
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
      </section> */}

      {/* Seasonal Block */}
      {/*  <section className="mb-16" aria-label="Seasonal essentials">
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
      </section> */}

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
  const getDefaultStore = (stores: Store[]) =>
    stores.find((store) => store.name.toLowerCase().includes("umzinto")) ||
    stores[0] ||
    null;
  const shouldSkipDefaultStore = () =>
    import.meta.env.DEV &&
    typeof window !== "undefined" &&
    localStorage.getItem("devSkipDefaultStore") === "true";
  const [products, setProducts] = useState<Product[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const cartStorageKey = "belimsCartItems";
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = window.localStorage.getItem(cartStorageKey);
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn("Failed to restore cart from storage", error);
      return [];
    }
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLocatorOpen, setIsLocatorOpen] = useState(false);
  const [isPaintOpen, setIsPaintOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(() => {
    // Temporarily disabled - onboarding won't show on site load
    return false;
    // const hasSeen = localStorage.getItem("hasSeenOnboarding");
    // return !hasSeen;
  });
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);
  const [storeLocations, setStoreLocations] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<Store | null>(
    shouldSkipDefaultStore() ? null : getDefaultStore(STORES),
  );
  const [pickupSchedule, setPickupSchedule] = useState<{
    date: string;
    time: string;
  } | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem("pickupSchedule");
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { date?: string; time?: string };
      if (parsed?.date && parsed?.time) {
        return { date: parsed.date, time: parsed.time };
      }
    } catch (error) {
      console.warn("Failed to restore pickup schedule", error);
    }
    return null;
  });
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
  const hasLoadedProductsRef = useRef(false);
  const hasLoadedCategoriesRef = useRef(false);
  const hasPromptedLocationRef = useRef(false);
  const hasLoadedStoresRef = useRef(false);

  // Trigger browser permission prompt on app load
  useEffect(() => {
    if (hasPromptedLocationRef.current) return;
    hasPromptedLocationRef.current = true;

    const shouldShow = typeof window !== "undefined";

    if (shouldShow) {
      const requestBrowserPermission = async () => {
        if (!("geolocation" in navigator)) return;
        if (
          localStorage.getItem("locationPermissionGranted") === "true" ||
          localStorage.getItem("locationPermissionDenied") === "true"
        ) {
          return;
        }
        try {
          if ("permissions" in navigator && navigator.permissions?.query) {
            const status = await navigator.permissions.query({
              name: "geolocation" as PermissionName,
            });
            if (status.state !== "prompt") return;
          }
        } catch (error) {
          console.warn("Failed to read geolocation permission", error);
        }

        navigator.geolocation.getCurrentPosition(
          () => {},
          () => {},
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
        );
      };

      requestBrowserPermission();
    }
  }, [cartStorageKey]);

  useEffect(() => {
    if (hasLoadedCategoriesRef.current) return;
    hasLoadedCategoriesRef.current = true;

    const loadCategories = async () => {
      try {
        const categories = await fetchCategories();
        const childCategories = categories
          .filter((cat: any) => cat.parent !== null)
          .map((cat: any) => cat.name)
          .sort();
        if (childCategories.length > 0) {
          setCategoryPills(["Top Deals", ...childCategories]);
        }
      } catch (error) {
        console.error("Failed to load categories:", error);
      }
    };
    loadCategories();
  }, []);

  useEffect(() => {
    if (hasLoadedStoresRef.current) return;
    hasLoadedStoresRef.current = true;

    const loadStores = async () => {
      try {
        const apiBase = getApiBaseUrl();
        const response = await fetch(`${apiBase}/ecommerce-policies`);
        const data = await response.json();
        const rawStores = Array.isArray(data?.store_locations)
          ? data.store_locations
          : [];
        const normalized = rawStores
          .map((store: any, index: number) => {
            const name = String(store?.name || "").trim();
            const address = String(store?.address || "")
              .replace(/\s*\n\s*/g, ", ")
              .trim();
            if (!name && !address) return null;
            const latitudeValue = Number(store?.latitude);
            const longitudeValue = Number(store?.longitude);
            return {
              id: String(store?.id || name || index + 1),
              name: name || `Store ${index + 1}`,
              address: address || "",
              phone: store?.phone ? String(store.phone) : undefined,
              mapUrl: store?.map_url ? String(store.map_url) : undefined,
              latitude: Number.isNaN(latitudeValue) ? undefined : latitudeValue,
              longitude: Number.isNaN(longitudeValue)
                ? undefined
                : longitudeValue,
              hours: {
                mon: {
                  open: store?.mon_open,
                  close: store?.mon_close,
                  breakStart: store?.mon_break_start,
                  breakEnd: store?.mon_break_end,
                  closed: Boolean(store?.mon_closed),
                  note: store?.mon_note,
                },
                tue: {
                  open: store?.tue_open,
                  close: store?.tue_close,
                  breakStart: store?.tue_break_start,
                  breakEnd: store?.tue_break_end,
                  closed: Boolean(store?.tue_closed),
                  note: store?.tue_note,
                },
                wed: {
                  open: store?.wed_open,
                  close: store?.wed_close,
                  breakStart: store?.wed_break_start,
                  breakEnd: store?.wed_break_end,
                  closed: Boolean(store?.wed_closed),
                  note: store?.wed_note,
                },
                thu: {
                  open: store?.thu_open,
                  close: store?.thu_close,
                  breakStart: store?.thu_break_start,
                  breakEnd: store?.thu_break_end,
                  closed: Boolean(store?.thu_closed),
                  note: store?.thu_note,
                },
                fri: {
                  open: store?.fri_open,
                  close: store?.fri_close,
                  breakStart: store?.fri_break_start,
                  breakEnd: store?.fri_break_end,
                  closed: Boolean(store?.fri_closed),
                  note: store?.fri_note,
                },
                sat: {
                  open: store?.sat_open,
                  close: store?.sat_close,
                  breakStart: store?.sat_break_start,
                  breakEnd: store?.sat_break_end,
                  closed: Boolean(store?.sat_closed),
                  note: store?.sat_note,
                },
                sun: {
                  open: store?.sun_open,
                  close: store?.sun_close,
                  breakStart: store?.sun_break_start,
                  breakEnd: store?.sun_break_end,
                  closed: Boolean(store?.sun_closed),
                  note: store?.sun_note,
                },
              },
            } as Store;
          })
          .filter(Boolean) as Store[];

        const resolvedStores = normalized.length > 0 ? normalized : STORES;
        setStoreLocations(resolvedStores);

        if (shouldSkipDefaultStore()) {
          setSelectedStore(null);
          return;
        }

        const stored = localStorage.getItem("selectedPickupStore");
        if (stored) {
          try {
            const parsed = JSON.parse(stored) as Store;
            const matched = resolvedStores.find(
              (store) => store.id === parsed.id,
            );
            if (matched) {
              setSelectedStore(matched);
              return;
            }
          } catch (error) {
            console.warn("Failed to restore selected store", error);
          }
        }

        setSelectedStore((prev) => {
          if (prev && resolvedStores.some((store) => store.id === prev.id)) {
            return prev;
          }
          return getDefaultStore(resolvedStores);
        });
      } catch (error) {
        console.error("Failed to load store locations:", error);
        setStoreLocations(STORES);
      }
    };

    loadStores();
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      const user = await getCurrentUser();
      setCurrentUser(user);
    };
    checkAuth();

    // Listen for user updates (e.g., from account details save)
    const handleUserUpdate = () => {
      checkAuth();
    };
    const handleResetPickupStore = () => {
      if (import.meta.env.DEV) {
        setSelectedStore(null);
      }
    };
    const handleEnableDefaultStore = () => {
      if (!import.meta.env.DEV) return;
      localStorage.removeItem("devSkipDefaultStore");
      if (!storeLocations.length) return;
      const defaultStore = getDefaultStore(storeLocations);
      setSelectedStore(defaultStore);
      if (defaultStore) {
        localStorage.setItem(
          "selectedPickupStore",
          JSON.stringify(defaultStore),
        );
        localStorage.setItem("pickupStoreSelected", "true");
      }
    };
    const handlePickupStoreUpdated = (event: Event) => {
      const detail = (event as CustomEvent).detail as Store | undefined;
      if (detail) {
        setSelectedStore(detail);
      }
    };
    window.addEventListener("user-updated", handleUserUpdate);
    window.addEventListener(
      "belims:reset-pickup-store",
      handleResetPickupStore,
    );
    window.addEventListener(
      "belims:enable-default-store",
      handleEnableDefaultStore,
    );
    window.addEventListener(
      "belims:pickup-store-updated",
      handlePickupStoreUpdated,
    );

    return () => {
      window.removeEventListener("user-updated", handleUserUpdate);
      window.removeEventListener(
        "belims:reset-pickup-store",
        handleResetPickupStore,
      );
      window.removeEventListener(
        "belims:enable-default-store",
        handleEnableDefaultStore,
      );
      window.removeEventListener(
        "belims:pickup-store-updated",
        handlePickupStoreUpdated,
      );
    };
  }, [storeLocations]);

  useEffect(() => {
    if (hasLoadedProductsRef.current) return;
    hasLoadedProductsRef.current = true;

    const loadProducts = async () => {
      setIsLoadingProducts(true);
      try {
        const productsFetchStart = performance.now();
        const apiProducts = await fetchProducts();
        const productsFetchMs = performance.now() - productsFetchStart;
        console.log(
          `[Performance][Optimized] Products API fetched in ${productsFetchMs.toFixed(0)}ms (products: ${apiProducts?.length || 0})`,
        );
        if (apiProducts?.length) setProducts(apiProducts);

        const apiFeatured = await fetchFeaturedProducts();
        if (apiFeatured?.length) setFeaturedProducts(apiFeatured);
      } catch (error) {
        console.error("Failed to load products:", error);
      } finally {
        setIsLoadingProducts(false);
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
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(cartStorageKey);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(cartStorageKey, JSON.stringify(cartItems));
    } catch (error) {
      console.warn("Failed to persist cart to storage", error);
    }
  }, [cartItems, cartStorageKey]);

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
        isLoadingProducts={isLoadingProducts}
        cartItems={cartItems}
        isCartOpen={isCartOpen}
        setIsCartOpen={setIsCartOpen}
        isLocatorOpen={isLocatorOpen}
        setIsLocatorOpen={setIsLocatorOpen}
        isPaintOpen={isPaintOpen}
        setIsPaintOpen={setIsPaintOpen}
        isOnboardingOpen={isOnboardingOpen}
        setIsOnboardingOpen={setIsOnboardingOpen}
        isAiAssistantOpen={isAiAssistantOpen}
        setIsAiAssistantOpen={setIsAiAssistantOpen}
        isSearchModalOpen={isSearchModalOpen}
        setIsSearchModalOpen={setIsSearchModalOpen}
        selectedStore={selectedStore}
        setSelectedStore={setSelectedStore}
        storeLocations={storeLocations}
        pickupSchedule={pickupSchedule}
        setPickupSchedule={setPickupSchedule}
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
  const PAGE_FADE_DURATION_MS = 550;
  const COOKIE_ACCEPTED_STORAGE_KEY = "cookieConsentAccepted";

  const [displayLocation, setDisplayLocation] = useState(location);
  const [isRouteTransitioning, setIsRouteTransitioning] = useState(false);
  const [isCookieConsentOpen, setIsCookieConsentOpen] = useState(false);

  useEffect(() => {
    const isSameLocation =
      location.pathname === displayLocation.pathname &&
      location.search === displayLocation.search;

    if (isSameLocation) return;

    setIsRouteTransitioning(true);

    const timeoutId = window.setTimeout(() => {
      setDisplayLocation(location);
      setIsRouteTransitioning(false);
    }, PAGE_FADE_DURATION_MS);

    return () => window.clearTimeout(timeoutId);
  }, [location, displayLocation, PAGE_FADE_DURATION_MS]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  }, [displayLocation.pathname, displayLocation.search]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedAccepted = window.localStorage.getItem(
      COOKIE_ACCEPTED_STORAGE_KEY,
    );

    if (savedAccepted === "true") return;

    const openDrawer = () => {
      window.setTimeout(() => {
        setIsCookieConsentOpen(true);
      }, 150);
    };

    if (document.readyState === "complete") {
      openDrawer();
      return;
    }

    window.addEventListener("load", openDrawer, { once: true });
    return () => window.removeEventListener("load", openDrawer);
  }, []);

  const handleOpenCookieConsent = () => {
    setIsCookieConsentOpen(true);
  };

  const handleCloseCookieConsent = () => {
    setIsCookieConsentOpen(false);
  };

  const handleCookieCancel = () => {
    setIsCookieConsentOpen(false);
  };

  const handleCookieAccept = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(COOKIE_ACCEPTED_STORAGE_KEY, "true");
    }
    setIsCookieConsentOpen(false);
  };

  const chatbotUserId = props.currentUser?.id
    ? String(props.currentUser.id)
    : undefined;
  const chatbotCartId = `belims-cart-${chatbotUserId ?? "guest"}`;

  const chatbotAddToCart = async (productId) => {
    const normalizedId = String(productId);
    let product = props.products.find(
      (item) => String(item.id) === normalizedId,
    );

    if (!product) {
      product = await fetchProductById(normalizedId);
    }

    if (!product) {
      props.showToast?.("Product not found", "error");
      return;
    }

    props.addToCart(product);
  };

  const chatbotBuyNow = async (productId) => {
    const normalizedId = String(productId);
    let product = props.products.find(
      (item) => String(item.id) === normalizedId,
    );

    if (!product) {
      product = await fetchProductById(normalizedId);
    }

    if (!product) {
      props.showToast?.("Product not found", "error");
      return;
    }

    props.handleBuyNow(product);
  };

  const chatbotCheckout = () => {
    props.setIsCartOpen(false);
    navigate("/checkout");
  };

  const chatbotEscalate = () => {
    props.showToast?.(
      "Support team notified. We'll follow up shortly.",
      "success",
    );
  };

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
        onOpenAiAssistant={() => props.setIsAiAssistantOpen(true)}
        onCompare={props.addToCompare}
        products={props.products}
        currentUser={props.currentUser}
        setCurrentUser={props.setCurrentUser}
      />

      <main className="flex-1 w-full px-0 relative">
        <div
          className={`transition-opacity ease-out ${
            isRouteTransitioning ? "opacity-0" : "opacity-100"
          }`}
          style={{ transitionDuration: `${PAGE_FADE_DURATION_MS}ms` }}
        >
          <Routes location={displayLocation}>
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
                  isLoadingProducts={props.isLoadingProducts}
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
                  isLoadingProducts={props.isLoadingProducts}
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
                  isLoadingProducts={props.isLoadingProducts}
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
                  onSchedulePickup={() => props.setIsLocatorOpen(true)}
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
            <Route
              path="/admin/order-preview"
              element={<AdminOrderPreview />}
            />
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
        </div>
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

      {props.isSearchModalOpen && (
        <SearchModal
          isOpen={props.isSearchModalOpen}
          onClose={() => props.setIsSearchModalOpen(false)}
          products={props.products}
          onCompare={props.addToCompare}
        />
      )}

      {props.isLocatorOpen && (
        <StoreLocator
          currentStore={props.selectedStore}
          stores={props.storeLocations}
          pickupSchedule={props.pickupSchedule}
          onSelectStore={props.setSelectedStore}
          onSaveSchedule={(date, time) => {
            props.setPickupSchedule({ date, time });
            localStorage.setItem(
              "pickupSchedule",
              JSON.stringify({ date, time }),
            );
          }}
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
          products={props.products}
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

      {props.isAiAssistantOpen && (
        <AiAssistant
          products={props.products}
          onClose={() => props.setIsAiAssistantOpen(false)}
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

      <CookieConsent
        isOpen={isCookieConsentOpen}
        onOpen={handleOpenCookieConsent}
        onClose={handleCloseCookieConsent}
        onCancel={handleCookieCancel}
        onAccept={handleCookieAccept}
      />

      <BelimsChatbot
        userId={chatbotUserId}
        cartId={chatbotCartId}
        onAddToCart={chatbotAddToCart}
        onBuyNow={chatbotBuyNow}
        onCheckout={chatbotCheckout}
        onEscalateToHuman={chatbotEscalate}
      />

      <MobileBottomNav
        onSearch={() => props.setIsSearchModalOpen(true)}
        onCart={() => props.setIsCartOpen(true)}
      />
    </div>
  );
}
