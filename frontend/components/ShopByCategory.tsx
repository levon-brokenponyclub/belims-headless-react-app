import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Product, WooCommerceCategory } from "../types";
import { ProductCard } from "./ProductCard";
import { ArrowRight } from "lucide-react";
import { CATEGORY_SLIDER_DATA } from "../constants";
import { fetchCategories } from "../services/wooCommerceService";
import { SkeletonProductCard } from "./Skeleton";

interface ShopByCategoryProps {
  products: Product[];
  isLoadingProducts?: boolean;
  addToCart: (product: Product) => void;
  onBuyNow: (product: Product) => void;
  onCompare: (product: Product) => void;
  isAuthenticated?: boolean;
  isTradeApproved?: boolean;
}

export const ShopByCategory: React.FC<ShopByCategoryProps> = ({
  products,
  isLoadingProducts = false,
  addToCart,
  onBuyNow,
  onCompare,
  isAuthenticated = false,
  isTradeApproved = false,
}) => {
  const navigate = useNavigate();
  const [categoryPills, setCategoryPills] = useState<string[]>(["On Sale"]);
  const [activeCategory, setActiveCategory] = useState("On Sale");
  const hasLoadedCategoriesRef = useRef(false);

  console.log("ShopByCategory rendered, products count:", products.length);

  // Fetch child categories from WooCommerce
  useEffect(() => {
    const loadCategories = async () => {
      // Wait for products to load first
      if (products.length === 0) {
        console.log("Waiting for products to load before fetching categories");
        return;
      }

      if (hasLoadedCategoriesRef.current) return;
      hasLoadedCategoriesRef.current = true;

      try {
        console.log("Fetching categories from API cache");
        const categories: WooCommerceCategory[] = await fetchCategories();
        if (categories.length > 0) {
          console.log("Fetched categories:", categories);

          // Get unique categories that actually exist in products
          const productCategoryNames = [
            ...new Set(products.map((p) => p.category)),
          ];
          console.log("Categories from products:", productCategoryNames.sort());

          // Filter WooCommerce categories to only those that match product categories
          const matchingCategories = categories
            .filter((cat) =>
              productCategoryNames.some(
                (pc) => pc.toLowerCase() === cat.name.toLowerCase(),
              ),
            )
            .map((cat) => cat.name)
            .sort();

          console.log("Matching categories:", matchingCategories);

          if (matchingCategories.length > 0) {
            setCategoryPills(["On Sale", ...matchingCategories]);
          } else {
            console.warn("No matching categories found");
          }
        }
      } catch (error) {
        console.error("Failed to load categories:", error);
      }
    };
    loadCategories();
  }, [products]);

  // Get slider content based on active category
  const currentSliderContent =
    CATEGORY_SLIDER_DATA[activeCategory] || CATEGORY_SLIDER_DATA["default"];

  // Filter products by active category and limit to 10
  const categoryProducts = products
    .filter((product) => {
      if (activeCategory === "On Sale") {
        // Show consumer deals / on-sale items, exclude trade specials
        if (product.deals_resolved?.trade?.bestDeal?.type === "trade_special") {
          return false;
        }

        if (product.deals_resolved?.consumer?.bestDeal) return true;

        return (
          (product.sale_price && parseFloat(String(product.sale_price)) > 0) ||
          product.isFeatured
        );
      }

      // Check if product category matches the active category exactly
      const productCategory = (product.category || "").trim();
      const searchCategory = activeCategory.trim();

      // Try exact match first (case-insensitive)
      if (productCategory.toLowerCase() === searchCategory.toLowerCase()) {
        return true;
      }

      // Also check if product category contains the search term
      if (
        productCategory.toLowerCase().includes(searchCategory.toLowerCase())
      ) {
        return true;
      }

      return false;
    })
    .slice(0, 10);

  const showSkeletons = isLoadingProducts;

  // Debug: log when filtering and when no products found
  console.log(
    `Filtering for category: "${activeCategory}", found: ${categoryProducts.length} products`,
  );
  if (categoryProducts.length === 0 && activeCategory !== "On Sale") {
    console.log("No products found for category:", activeCategory);
    // Get unique categories from ALL products
    const uniqueCategories = [
      ...new Set(products.map((p) => p.category)),
    ].sort();
    console.log("All unique categories in products:", uniqueCategories);
    console.log(
      "Sample product categories (first 10):",
      products.slice(0, 10).map((p) => p.category),
    );
  }

  // -----------------------------
  // Slider functionality (ported from ProjectInspiration)
  // -----------------------------
  const width = useWindowWidth();
  const railRef = useRef<HTMLDivElement | null>(null);
  const [railWidth, setRailWidth] = useState(0);
  const [stepWidth, setStepWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const itemsLength = showSkeletons ? 5 : categoryProducts.length;

  // Determine how many cards fit in view (min 1)
  const slidesPerView = useMemo(() => {
    if (!railWidth || !stepWidth) return 1;
    return Math.max(1, Math.floor(railWidth / stepWidth));
  }, [railWidth, stepWidth]);

  const maxIndex = useMemo(() => {
    return Math.max(0, itemsLength - slidesPerView);
  }, [itemsLength, slidesPerView]);

  // Keep index in bounds when data/layout changes
  useEffect(() => {
    setIndex((prev) => Math.min(prev, maxIndex));
  }, [maxIndex]);

  // Measure rail width + step width (distance between items)
  useEffect(() => {
    if (!railRef.current) return;

    const measure = () => {
      const rail = railRef.current;
      if (!rail) return;

      setRailWidth(rail.clientWidth);

      const children = Array.from(
        rail.querySelectorAll<HTMLElement>("[data-slider-item]"),
      );
      if (children.length === 0) return;

      if (children.length >= 2) {
        const step = children[1].offsetLeft - children[0].offsetLeft;
        setStepWidth(step > 0 ? step : children[0].offsetWidth);
      } else {
        setStepWidth(children[0].offsetWidth);
      }
    };

    measure();

    const ro = new ResizeObserver(() => measure());
    ro.observe(railRef.current);

    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [width, itemsLength]);

  const scrollToIndex = (nextIndex: number) => {
    if (!railRef.current || !stepWidth) return;
    railRef.current.scrollTo({
      left: nextIndex * stepWidth,
      behavior: "smooth",
    });
  };

  const prev = () => {
    const nextIndex = index <= 0 ? maxIndex : index - 1;
    setIndex(nextIndex);
    scrollToIndex(nextIndex);
  };

  const next = () => {
    const nextIndex = index >= maxIndex ? 0 : index + 1;
    setIndex(nextIndex);
    scrollToIndex(nextIndex);
  };

  const indicatorPct =
    maxIndex === 0 ? 100 : Math.min(100, (index / maxIndex) * 100);

  return (
    <section className="w-full py-14">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl font-bold text-gray-900 font-heading letterspacing-tight mb-6">
          Shop by department
        </h2>

        {/* Category Pills */}
        <div className="mb-6 overflow-x-auto no-scrollbar pb-2">
          <div className="flex gap-3 min-w-max">
            {categoryPills.map((pill, index) => (
              <button
                key={index}
                onClick={() => {
                  setActiveCategory(pill);
                  // reset slider position when switching categories
                  setIndex(0);
                  scrollToIndex(0);
                }}
                className={`px-4 h-9 rounded-xl border font-semibold font-heading transition-colors whitespace-nowrap text-[13px] ${
                  activeCategory === pill
                    ? "bg-belims-blue text-white border-gray-200"
                    : "bg-white text-[#64748b] border-gray-200 hover:bg-belims-blue hover:text-white"
                }`}
              >
                {pill}
              </button>
            ))}
          </div>
        </div>

        {/* Category Preview Section */}
        <div className="flex flex-col lg:flex-row gap-6 h-auto animate-fadeIn">
          {/* Left: Category Hero Video - Always visible now, adjusted for mobile */}
          <div className="w-full lg:w-1/3 xl:w-1/5 rounded overflow-hidden relative group flex-shrink-0">
            <img
              src="/images/development/athens-mosaic-06.webp"
              alt={activeCategory}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 filter brightness-[0.85]"
            />

            <div className="absolute inset-0 p-6 flex flex-col justify-center items-start text-center lg:text-left">
              <h3 className="text-1xl md:text-2xl font-bold text-white mb-4 font-heading leading-tight drop-shadow-lg">
                {/* {currentSliderContent.title} */}
                {activeCategory}
              </h3>
              <button
                onClick={() =>
                  navigate(`/shop/${encodeURIComponent(activeCategory)}`)
                }
                className="mt-2 text-white font-semibold pb-0.5 hover:text-belims-accent hover:border-belims-accent transition-colors font-heading"
              >
                Shop All {/* {activeCategory} */}
              </button>
            </div>
          </div>

          {/* Right: Product Slider (same styling; added slider functionality) */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <div
              ref={railRef}
              className="flex-1 overflow-x-auto no-scrollbar flex gap-6 items-stretch snap-x snap-mandatory scroll-pl-0 scroll-pr-4"
              aria-roledescription="carousel"
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
              onScroll={() => {
                if (!railRef.current || !stepWidth) return;
                const nextIndex = Math.round(
                  railRef.current.scrollLeft / stepWidth,
                );
                setIndex(Math.min(maxIndex, Math.max(0, nextIndex)));
              }}
            >
              {showSkeletons
                ? Array.from({ length: 5 }).map((_, index) => (
                    <div
                      key={`shop-skel-${index}`}
                      className="flex-shrink-0 snap-start"
                      data-slider-item
                    >
                      <SkeletonProductCard className="w-[320px]" />
                    </div>
                  ))
                : categoryProducts.map((product) => (
                    <div
                      key={product.id}
                      className="flex-shrink-0 snap-start w-[320px]"
                      data-slider-item
                      onClick={() => navigate(`/product/${product.id}`)}
                    >
                      <ProductCard
                        product={product}
                        addToCart={addToCart}
                        onBuyNow={onBuyNow}
                        onCompare={onCompare}
                        isAuthenticated={isAuthenticated}
                        isTradeApproved={isTradeApproved}
                        className="h-full"
                      />
                    </div>
                  ))}
            </div>
          </div>

          {/* {categoryProducts.length === 0 && (
              <p className="text-gray-500">No products found in this category.</p>
            )}
          </div> */}
        </div>
        {/* Controls + progress (non-card UI only) */}
        <div className="mt-4 flex items-center justify-between gap-4">
          <div className="h-0.5 w-full rounded-full bg-gray-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-belims-blue transition-all duration-300"
              style={{ width: `${indicatorPct}%` }}
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={prev}
              aria-label="Previous products"
              className={[
                "grid h-9 w-9 place-items-center rounded-lg",
                "border border-black/10 bg-white text-gray-600",
                "transition-colors hover:bg-gray-50 hover:text-gray-900",
              ].join(" ")}
            >
              ‹
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next products"
              className={[
                "grid h-9 w-9 place-items-center rounded-lg",
                "border border-black/10 bg-white text-gray-600",
                "transition-colors hover:bg-gray-50 hover:text-gray-900",
              ].join(" ")}
            >
              ›
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

function useWindowWidth() {
  const [w, setW] = useState<number>(() =>
    typeof window === "undefined" ? 1024 : window.innerWidth,
  );
  useEffect(() => {
    const onResize = () => setW(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return w;
}
