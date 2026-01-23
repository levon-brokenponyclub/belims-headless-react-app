import React, { useState, useEffect, useMemo } from "react";
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
import { Archive } from "./components/Archive";
import { RecentlyViewed } from "./components/RecentlyViewed";
import { Product, CartItem, Store } from "./types";
import { fetchProducts } from "./services/wooCommerceService";
import {
  FEATURED_PRODUCTS,
  STORES,
  HERO_SLIDES,
  CATEGORY_PILLS,
  PROJECT_IDEAS,
  CATEGORY_SLIDER_DATA,
  SYNCED_PRODUCTS,
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

export default function App() {
  // State
  const [view, setView] = useState<"home" | "product" | "archive" | "checkout">(
    "home",
  );
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [currentCategory, setCurrentCategory] = useState<string>("");
  const [currentBrand, setCurrentBrand] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Product data state
  const [products, setProducts] = useState<Product[]>(SYNCED_PRODUCTS);
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

  // Feature State
  const [comparisonList, setComparisonList] = useState<Product[]>([]);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [priceMatchProduct, setPriceMatchProduct] = useState<Product | null>(
    null,
  );

  // Category Slider State
  const [heroCategoryIndex, setHeroCategoryIndex] = useState(0);
  const [projectSlideIndex, setProjectSlideIndex] = useState(0);
  const [activeCategory, setActiveCategory] = useState(CATEGORY_PILLS[0]);

  // Derived State for Slider Content
  const currentSliderContent =
    CATEGORY_SLIDER_DATA[activeCategory] || CATEGORY_SLIDER_DATA["default"];

  // Load products from API on mount
  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      try {
        const apiProducts = await fetchProducts();
        if (apiProducts && apiProducts.length > 0) {
          setProducts(apiProducts);
          console.log(`Loaded ${apiProducts.length} products from Belims API`);
        }
      } catch (error) {
        console.error("Failed to load products:", error);
        // Fallback to constants if API fails
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
    // Small timeout to allow cart to update before opening (visual smoothness)
    setTimeout(() => {
      setIsCartOpen(true);
    }, 100);
  };

  const updateQuantity = (id: string, delta: number) => {
    setCartItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const newQty = Math.max(1, item.quantity + delta);
          return { ...item, quantity: newQty };
        }
        return item;
      }),
    );
  };

  const removeItem = (id: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleProductClick = (product: Product) => {
    setActiveProduct(product);
    setView("product");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCategoryClick = (category: string) => {
    setCurrentCategory(category);
    setCurrentBrand("");
    setSearchQuery("");
    setView("archive");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBrandClick = (brand: string) => {
    setCurrentBrand(brand);
    setCurrentCategory("");
    setSearchQuery("");
    setView("archive");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentCategory("");
    setCurrentBrand("");
    setView("archive");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Comparison Logic
  const addToCompare = (product: Product) => {
    setComparisonList((prev) => {
      if (prev.find((p) => p.id === product.id)) return prev; // Already added
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

  const activeHero = heroCategorySlides[heroCategoryIndex];
  const activeProject = projectSlides[projectSlideIndex];

  return (
    <div className="min-h-screen flex flex-col bg-white font-sans">
      <Header
        selectedStore={selectedStore}
        cartItems={cartItems}
        toggleCart={() => setIsCartOpen(true)}
        toggleStoreLocator={() => setIsLocatorOpen(true)}
        onOpenPaintAssistant={() => setIsPaintOpen(true)}
        onOpenOnboarding={() => setIsOnboardingOpen(true)}
        onProductClick={handleProductClick}
        onCompare={addToCompare}
        onCategoryClick={handleCategoryClick}
        onSearch={handleSearch}
      />

      {/* Personal / Business Toggle - Top of Page (Only visible on Home) */}
      {view === "home" && (
        <div className="bg-white border-b border-gray-200">
          <div className="container mx-auto px-4 flex gap-8">
            <button
              className={`py-3 text-sm font-bold border-b-4 transition-colors font-heading ${userType === "personal" ? "border-belims-blue text-belims-blue" : "border-transparent text-gray-500 hover:text-gray-700"}`}
              onClick={() => setUserType("personal")}
            >
              Personal
            </button>
            <button
              className={`py-3 text-sm font-bold border-b-4 transition-colors font-heading ${userType === "business" ? "border-belims-blue text-belims-blue" : "border-transparent text-gray-500 hover:text-gray-700"}`}
              onClick={() => setUserType("business")}
            >
              Business
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 container mx-auto px-4 py-6 relative">
        {view === "product" && activeProduct ? (
          <SingleProduct
            product={activeProduct}
            addToCart={addToCart}
            onBuyNow={handleBuyNow}
            onBack={() => setView("home")}
            onCompare={addToCompare}
            onPriceMatch={setPriceMatchProduct}
            onProductClick={handleProductClick}
          />
        ) : view === "checkout" ? (
          <Checkout
            cartItems={cartItems}
            onBack={() => setView("home")}
            onClearCart={() => {
              setCartItems([]);
              setView("home");
            }}
          />
        ) : view === "archive" ? (
          <Archive
            products={SYNCED_PRODUCTS}
            category={currentCategory}
            searchQuery={searchQuery}
            addToCart={addToCart}
            onBuyNow={handleBuyNow}
            onProductClick={handleProductClick}
            onCompare={addToCompare}
          />
        ) : (
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
                    <button className="bg-white text-belims-blue font-bold py-3 px-6 rounded hover:bg-belims-accent hover:text-white transition-colors font-heading w-fit">
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
                          aria-label={`Show ${slide.category}`}
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
                        aria-label="Previous project"
                      >
                        <ArrowLeft size={16} />
                      </button>
                      <button
                        onClick={nextProjectSlide}
                        className="h-9 w-9 rounded-full border border-white/40 bg-black/30 flex items-center justify-center hover:bg-white/20 transition"
                        aria-label="Next project"
                      >
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="relative p-4 space-y-3">
                    <p className="text-sm leading-relaxed text-white/90 max-w-md">
                      {activeProject.description}
                    </p>
                    <span className="text-belims-accent font-bold text-sm underline font-heading">
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
                    From laying bricks to wiring a plug, get expert advice for
                    your next project.
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
            <div className="mb-16">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 font-heading">
                Shop by Category
              </h2>
              <p className="text-gray-500 mb-6">
                Hover over a category to preview top products.
              </p>

              {/* Category Pills Navigation (Hover Enabled for Desktop) */}
              <div className="mb-6 overflow-x-auto no-scrollbar pb-2">
                <div className="flex gap-3 min-w-max">
                  {CATEGORY_PILLS.map((pill, index) => (
                    <button
                      key={index}
                      onMouseEnter={() => setActiveCategory(pill)}
                      onClick={() => setActiveCategory(pill)} // Keep click for mobile
                      className={`px-5 py-2.5 rounded-full border font-bold font-heading transition-all whitespace-nowrap text-[0.8rem]
                        ${
                          activeCategory === pill
                            ? "bg-belims-blue text-white border-belims-blue shadow-md"
                            : "bg-white text-gray-700 border-gray-300 hover:border-belims-blue hover:text-belims-blue"
                        }`}
                    >
                      {pill}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Content Area (Left Banner + Right Slider) */}
              <div className="flex flex-col lg:flex-row gap-6 h-auto lg:h-[420px] animate-fadeIn">
                {/* Left Banner - Changes based on category */}
                <div className="w-full lg:w-1/3 xl:w-1/4 rounded-lg overflow-hidden relative group shadow-md h-[360px] lg:h-[420px]">
                  <img
                    src={currentSliderContent.image}
                    alt={currentSliderContent.title}
                    key={currentSliderContent.image} // key forces re-render animation
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 animate-fadeIn"
                  />
                  <div className="absolute inset-0 bg-black/30"></div>{" "}
                  {/* Overlay */}
                  <div className="absolute inset-0 p-8 flex flex-col justify-center items-start text-center lg:text-left">
                    <h3 className="text-3xl md:text-4xl font-extrabold text-white mb-4 font-heading leading-tight drop-shadow-lg">
                      {currentSliderContent.title}
                    </h3>
                    <button className="mt-2 border-b-2 border-white text-white font-bold text-lg pb-0.5 hover:text-belims-accent hover:border-belims-accent transition-colors font-heading">
                      Shop All {activeCategory}
                    </button>
                  </div>
                </div>

                {/* Right Slider (Horizontal Scroll) - Products change based on category */}
                <div className="flex-1 overflow-x-auto no-scrollbar flex gap-4 items-stretch">
                  {currentSliderContent.products.map((product) => (
                    <div
                      key={product.id}
                      className="min-w-[280px] max-w-[280px] h-full"
                    >
                      <ProductCard
                        product={product}
                        addToCart={addToCart}
                        onBuyNow={handleBuyNow}
                        onClick={handleProductClick}
                        onCompare={addToCompare}
                        className="h-full"
                      />
                    </div>
                  ))}
                  {/* See All Card */}
                  <div className="min-w-[150px] flex flex-col items-center justify-center bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors group">
                    <div className="w-12 h-12 rounded-full bg-white shadow flex items-center justify-center text-belims-blue group-hover:scale-110 transition-transform mb-3">
                      <ArrowRight size={24} />
                    </div>
                    <span className="font-bold text-belims-blue font-heading">
                      View All {activeCategory}
                    </span>
                  </div>
                </div>
              </div>
            </div>
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
                <a
                  href="#"
                  className="text-belims-blue font-bold text-sm hover:text-belims-accent hover:underline flex items-center gap-1 mb-2 font-heading"
                >
                  View All <ChevronRight size={16} />
                </a>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {FEATURED_PRODUCTS.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    addToCart={addToCart}
                    onBuyNow={handleBuyNow}
                    onClick={handleProductClick}
                    onCompare={addToCompare}
                  />
                ))}
              </div>
            </section>
            {/* RECENTLY VIEWED PRODUCTS */}
            <RecentlyViewed
              addToCart={addToCart}
              onBuyNow={handleBuyNow}
              onProductClick={handleProductClick}
              onCompare={addToCompare}
            />{" "}
            {/* Banner Strip */}
            <div className="bg-belims-gray rounded-xl p-8 mb-16 flex flex-col md:flex-row items-center justify-between gap-8 border border-gray-200">
              <div>
                <h2 className="text-3xl font-bold text-belims-blue mb-2 font-heading">
                  Get More Done with Pro
                </h2>
                <p className="text-gray-600 max-w-lg text-lg">
                  Exclusive volume savings, dedicated support, and job site
                  delivery for professionals.
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
        )}
      </main>

      {/* Footer */}
      <footer className="bg-[#1a1f2e] text-gray-400 py-12 text-sm pb-24">
        {" "}
        {/* Extra padding bottom for sticky widget */}
        <div className="container mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <h4 className="text-white font-bold mb-4 uppercase tracking-wider font-heading">
              Customer Support
            </h4>
            <ul className="space-y-3">
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Contact Us
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Order Status
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Returns & Exchanges
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Shipping Info
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4 uppercase tracking-wider font-heading">
              Services
            </h4>
            <ul className="space-y-3">
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Installation Services
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Tool Rental
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Gift Cards
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Pro Customers
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4 uppercase tracking-wider font-heading">
              About Belims
            </h4>
            <ul className="space-y-3">
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Careers
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Corporate Info
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Suppliers
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4 uppercase tracking-wider font-heading">
              Stay Connected
            </h4>
            <p className="mb-4 text-xs">
              Sign up for exclusive offers and tips.
            </p>
            <div className="flex">
              <input
                type="email"
                placeholder="Email Address"
                className="bg-gray-800 border-none rounded-l px-3 py-2 w-full focus:ring-1 focus:ring-belims-accent outline-none text-white"
              />
              <button className="bg-belims-accent text-white font-bold px-4 rounded-r hover:bg-red-700 transition-colors">
                Go
              </button>
            </div>
          </div>
        </div>
        <div className="container mx-auto px-4 mt-12 pt-8 border-t border-gray-800 text-center text-xs">
          &copy; 2024 Belims Hardware. All rights reserved. Prices are in ZAR.
        </div>
      </footer>

      {/* Sticky Footer: Free Shipping Progress */}
      <FreeShippingWidget cartItems={cartItems} />

      {/* Drawers & Modals */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        updateQuantity={updateQuantity}
        removeItem={removeItem}
        onCheckout={() => {
          setIsCartOpen(false);
          setView("checkout");
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />

      {isLocatorOpen && (
        <StoreLocator
          currentStore={selectedStore}
          onSelectStore={setSelectedStore}
          onClose={() => setIsLocatorOpen(false)}
        />
      )}

      {/* Comparison Modal */}
      {isCompareOpen && (
        <ComparisonModal
          products={comparisonList}
          onClose={() => setIsCompareOpen(false)}
          onRemove={removeFromCompare}
          addToCart={addToCart}
        />
      )}

      {/* Price Match Modal */}
      {priceMatchProduct && (
        <PriceMatchModal
          product={priceMatchProduct}
          onClose={() => setPriceMatchProduct(null)}
        />
      )}

      {/* AI Onboarding Wizard - Opens on first load or when manually triggered */}
      {isOnboardingOpen && (
        <OnboardingWizard
          onClose={() => {
            setIsOnboardingOpen(false);
            localStorage.setItem("hasSeenOnboarding", "true");
          }}
          onNavigateToProduct={handleProductClick}
          addToCart={addToCart}
          onBuyNow={handleBuyNow}
          onCompare={addToCompare}
        />
      )}

      {/* Paint Assistant Modal (Accessible from Header) */}
      {isPaintOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsPaintOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10"
            >
              <X size={24} />
            </button>
            <div className="p-8">
              <h2 className="text-2xl font-bold mb-2 text-belims-blue font-heading">
                Belims AI Paint Assistant
              </h2>
              <p className="text-gray-600 mb-6">
                Describe your room or mood, and let us find your perfect color.
              </p>
              <PaintAssistant />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
