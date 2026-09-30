import React, { useState, useEffect, useRef, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Product } from "../types";
import { SkeletonProductCard } from "./Skeleton";
import { ProductCard } from "./ProductCard";

interface ShopByCategoryProps {
  products: Product[];
  isLoadingProducts?: boolean;
  addToCart: (product: Product) => void;
  onBuyNow?: (product: Product) => void;
  onCompare?: (product: Product) => void;
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
          if ((b.maxStock || 0) !== (a.maxStock || 0)) {
            return (b.maxStock || 0) - (a.maxStock || 0);
          }
          return toNumericId(b.id) - toNumericId(a.id);
        })
        .slice(0, 16);
    }

    return list
      .sort((a, b) => toNumericId(b.id) - toNumericId(a.id))
      .slice(0, 16);
  }, [products, activeCollection]);

  const showSkeletons = isLoadingProducts;

  // -----------------------------
  // Carousel Slider functionality
  // -----------------------------
  const railRef = useRef<HTMLDivElement | null>(null);
  const [railWidth, setRailWidth] = useState(0);
  const [stepWidth, setStepWidth] = useState(0);
  const [index, setIndex] = useState(0);

  const itemsLength = showSkeletons ? 4 : categoryProducts.length;

  const slidesPerView = useMemo(() => {
    if (!railWidth || !stepWidth) return 1;
    return Math.max(1, Math.floor(railWidth / stepWidth));
  }, [railWidth, stepWidth]);

  const maxIndex = useMemo(() => {
    return Math.max(0, itemsLength - slidesPerView);
  }, [itemsLength, slidesPerView]);

  useEffect(() => {
    setIndex((prev) => Math.min(prev, maxIndex));
  }, [maxIndex]);

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
        setStepWidth(step > 0 ? step : children[0].offsetWidth + 16);
      } else {
        setStepWidth(children[0].offsetWidth + 16);
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
    maxIndex === 0
      ? 100
      : Math.min(100, Math.max(8, ((index + 1) / (maxIndex + 1)) * 100));

  return (
    <section className="w-full py-10 bg-white">
      <div className="container mx-auto px-4">
        {/* Section Header: Title on Left, Tabs Centered, Nav Arrows on Right */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Header Title on Left */}
          <div className="flex-shrink-0">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-text font-heading">
              Step into Style
            </h2>
          </div>

          {/* New Arrivals and Best Sellers Tabs Centered */}
          <div
            className="flex items-center justify-center gap-6 sm:flex-1"
            role="tablist"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeCollection === "new-arrivals"}
              onClick={() => {
                setActiveCollection("new-arrivals");
                setIndex(0);
                scrollToIndex(0);
              }}
              className={`text-sm sm:text-base font-semibold transition-colors pb-1 ${
                activeCollection === "new-arrivals"
                  ? "text-belims-blue border-b-2 border-belims-blue"
                  : "text-text-tertiary hover:text-text"
              }`}
            >
              New Arrivals
            </button>
            <span className="text-text-tertiary/40">·</span>
            <button
              type="button"
              role="tab"
              aria-selected={activeCollection === "best-sellers"}
              onClick={() => {
                setActiveCollection("best-sellers");
                setIndex(0);
                scrollToIndex(0);
              }}
              className={`text-sm sm:text-base font-semibold transition-colors pb-1 ${
                activeCollection === "best-sellers"
                  ? "text-belims-blue border-b-2 border-belims-blue"
                  : "text-text-tertiary hover:text-text"
              }`}
            >
              Best Sellers
            </button>
          </div>

          {/* Nav Arrow Buttons on Right */}
          <div className="flex items-center justify-end gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={prev}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-white text-text shadow-xs transition-all duration-200 hover:border-text hover:bg-surface-dark hover:text-white"
              aria-label="Previous products"
            >
              <ChevronLeft size={20} strokeWidth={1.75} />
            </button>
            <button
              type="button"
              onClick={next}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-white text-text shadow-xs transition-all duration-200 hover:border-text hover:bg-surface-dark hover:text-white"
              aria-label="Next products"
            >
              <ChevronRight size={20} strokeWidth={1.75} />
            </button>
          </div>
        </div>

        {/* Carousel Slider (Mobile: 2 Cards, Tablet: 3 Cards, Desktop: 4 Cards - Contained) */}
        <div className="relative w-full overflow-hidden">
          <div
            ref={railRef}
            className="flex w-full overflow-x-auto no-scrollbar gap-4 items-stretch snap-x snap-mandatory scroll-pl-0 pb-2"
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
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={`shop-skel-${i}`}
                    className="flex-shrink-0 snap-start basis-[calc((100%-1rem)/2)] sm:basis-[calc((100%-2rem)/3)] lg:basis-[calc((100%-4rem)/5)] min-w-0"
                    data-slider-item
                  >
                    <SkeletonProductCard className="w-full" />
                  </div>
                ))
              : categoryProducts.map((product) => (
                  <div
                    key={product.id}
                    className="flex-shrink-0 snap-start basis-[calc((100%-1rem)/2)] sm:basis-[calc((100%-2rem)/3)] lg:basis-[calc((100%-4rem)/5)] min-w-0"
                    data-slider-item
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

        {/* Carousel Progress Indicator */}
        <div className="mt-6 flex items-center justify-between gap-4">
          <div className="h-1 flex-1 rounded-full bg-surface-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-belims-blue transition-all duration-300 ease-out"
              style={{ width: `${indicatorPct}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  );
};
