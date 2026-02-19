import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Product } from "../types";
import { ProductCard, PRODUCT_CARD_PRESETS } from "./ProductCard";
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
  const [activeCollection, setActiveCollection] = useState<
    "new-arrivals" | "best-sellers"
  >("new-arrivals");

  const toNumericId = (id: string) => {
    const value = Number(id);
    return Number.isFinite(value) ? value : 0;
  };

  const categoryProducts = useMemo(() => {
    const list = [...products];

    if (activeCollection === "best-sellers") {
      return list
        .sort((a, b) => {
          if ((b.reviews || 0) !== (a.reviews || 0)) {
            return (b.reviews || 0) - (a.reviews || 0);
          }
          if ((b.rating || 0) !== (a.rating || 0)) {
            return (b.rating || 0) - (a.rating || 0);
          }
          return toNumericId(b.id) - toNumericId(a.id);
        })
        .slice(0, 10);
    }

    return list
      .sort((a, b) => toNumericId(b.id) - toNumericId(a.id))
      .slice(0, 10);
  }, [products, activeCollection]);

  const showSkeletons = isLoadingProducts;

  const sectionTitle =
    activeCollection === "new-arrivals" ? "New Arrivals" : "Best Sellers";
  const sectionDescription =
    activeCollection === "new-arrivals"
      ? "Fresh arrivals from top brands, ready for your next project."
      : "Top-rated picks trusted by customers for quality and value.";

  const openChatBot = () => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new Event("belims:open-chat"));
  };

  // -----------------------------
  // Slider functionality (ported from ProjectInspiration)
  // -----------------------------
  const railRef = useRef<HTMLDivElement | null>(null);
  const [railWidth, setRailWidth] = useState(0);
  const [stepWidth, setStepWidth] = useState(0);
  const [index, setIndex] = useState(0);

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
  }, [itemsLength]);

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
    <section className="w-full py-10">
      <div className="container mx-auto px-4">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-7">
          <h2 className="text-2xl font-bold tracking-tight text-grey md:text-[28px]">
            {sectionTitle}
          </h2>
          <div
            className="flex w-full items-center justify-start gap-4 md:w-auto"
            role="tablist"
          >
            <button
              type="button"
              onClick={() => {
                setActiveCollection("new-arrivals");
                setIndex(0);
                scrollToIndex(0);
              }}
              className={`text-lg font-semibold transition-colors ${
                activeCollection === "new-arrivals"
                  ? "text-grey"
                  : "text-grey-medium hover:text-grey"
              }`}
            >
              New Arrivals
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveCollection("best-sellers");
                setIndex(0);
                scrollToIndex(0);
              }}
              className={`text-lg font-semibold transition-colors ${
                activeCollection === "best-sellers"
                  ? "text-grey"
                  : "text-grey-medium hover:text-grey"
              }`}
            >
              Best Sellers
            </button>
          </div>
        </div>

        {/* Category Preview Section */}
        <div className="flex flex-col lg:flex-row gap-5 h-auto animate-fadeIn">
          {/* Left: Category Hero Video - Always visible now, adjusted for mobile */}
          <div className="w-full lg:w-1/5 rounded-xl overflow-hidden relative group flex-shrink-0">
            <img
              src="/images/development/athens-mosaic-06.webp"
              alt={sectionTitle}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 filter brightness-[0.85]"
            />

            <div className="absolute inset-0 p-6 flex flex-col justify-end items-start text-left">
              <h3 className="text-white text-3xl font-bold font-heading">
                {sectionTitle}
              </h3>
              <p className="mt-3 mb-6 text-lg font-semibold text-white/90 max-w-[260px]">
                {sectionDescription}
              </p>
              <button
                type="button"
                onClick={openChatBot}
                className="group relative h-12 px-6 overflow-hidden rounded-pill bg-white text-gray-900 transition-colors"
              >
                <span className="absolute inset-0 origin-left scale-x-0 bg-gray-900 transition-transform duration-300 ease-out group-hover:scale-x-100" />
                <span className="relative z-10 font-heading font-bold transition-colors group-hover:text-white">
                  Get Started
                </span>
              </button>
            </div>
          </div>

          {/* Right: Product Slider (same styling; added slider functionality) */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <div
              ref={railRef}
              className="flex-1 overflow-x-auto no-scrollbar flex gap-4 lg:gap-5 items-stretch snap-x snap-mandatory scroll-pl-0"
              aria-roledescription="carousel"
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
                      className="flex-shrink-0 snap-start basis-[calc((100%-1rem)/2.15)] sm:basis-[48%] lg:basis-[calc((100%-3.75rem)/4)] min-w-0"
                      data-slider-item
                    >
                      <SkeletonProductCard className="w-full" />
                    </div>
                  ))
                : categoryProducts.map((product) => (
                    <div
                      key={product.id}
                      className="flex-shrink-0 snap-start basis-[calc((100%-1rem)/2.15)] sm:basis-[48%] lg:basis-[calc((100%-3.75rem)/4)] min-w-0"
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
                        customizations={PRODUCT_CARD_PRESETS.compactCard}
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
              className="group relative h-12 w-12 overflow-hidden rounded-full border border-subtle bg-white text-grey transition-colors duration-300 ease-out hover:border-grey hover:bg-grey hover:text-white"
              aria-label="Previous products"
            >
              <span className="absolute inset-0 origin-right scale-x-0 bg-grey transition-transform duration-300 ease-out group-hover:scale-x-100" />
              <span className="relative z-10 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="26"
                  height="26"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-chevron-left"
                  aria-hidden="true"
                >
                  <path d="m15 18-6-6 6-6"></path>
                </svg>
              </span>
            </button>
            <button
              type="button"
              onClick={next}
              className="group relative h-12 w-12 overflow-hidden rounded-full border border-subtle bg-white text-grey transition-colors duration-300 ease-out hover:border-grey hover:bg-grey hover:text-white"
              aria-label="Next products"
            >
              <span className="absolute inset-0 origin-left scale-x-0 bg-grey transition-transform duration-300 ease-out group-hover:scale-x-100"></span>
              <span className="relative z-10 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="26"
                  height="26"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-chevron-right"
                  aria-hidden="true"
                >
                  <path d="m9 18 6-6-6-6"></path>
                </svg>
              </span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
