import React, { useState, useEffect, useRef, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Product } from "../types";
import { SkeletonProductCard } from "./Skeleton";
import { ProductCard } from "./ProductCard";
import { SectionHeading, ViewAllLink } from "./SectionHeading";

type Collection = "new-arrivals" | "best-sellers";

const COLLECTION_TABS: { key: Collection; label: string }[] = [
  { key: "new-arrivals", label: "New arrivals" },
  { key: "best-sellers", label: "Best sellers" },
];

const ARROW_CLASS =
  "flex h-10 w-10 items-center justify-center rounded-md border border-border bg-surface text-text transition-colors hover:border-border-strong hover:bg-surface-dark hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-primary";

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
  const [activeCollection, setActiveCollection] =
    useState<Collection>("new-arrivals");

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
    <section className="w-full bg-surface py-10 md:py-14" aria-labelledby="home-range-title">
      <div className="container mx-auto px-4">
        <SectionHeading id="home-range-title" eyebrow="Just landed" title="Shop the range">
          <div className="flex gap-6 overflow-x-auto no-scrollbar" role="tablist">
            {COLLECTION_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={activeCollection === tab.key}
                onClick={() => {
                  setActiveCollection(tab.key);
                  setIndex(0);
                  scrollToIndex(0);
                }}
                className={`h-11 shrink-0 whitespace-nowrap border-b-2 text-lg font-semibold transition-colors ${
                  activeCollection === tab.key
                    ? "border-primary text-text"
                    : "border-transparent text-text-tertiary hover:text-text"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <ViewAllLink to="/shop">View all</ViewAllLink>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={prev}
                className={ARROW_CLASS}
                aria-label="Previous products"
              >
                <ChevronLeft size={20} strokeWidth={1.75} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={next}
                className={ARROW_CLASS}
                aria-label="Next products"
              >
                <ChevronRight size={20} strokeWidth={1.75} aria-hidden="true" />
              </button>
            </div>
          </div>
        </SectionHeading>

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
                    className="flex-shrink-0 snap-start basis-[calc((100%-1rem)/2)] sm:basis-[calc((100%-2rem)/3)] lg:basis-[calc((100%-3rem)/4)] min-w-0"
                    data-slider-item
                  >
                    <SkeletonProductCard className="w-full" />
                  </div>
                ))
              : categoryProducts.map((product) => (
                  <div
                    key={product.id}
                    className="flex-shrink-0 snap-start basis-[calc((100%-1rem)/2)] sm:basis-[calc((100%-2rem)/3)] lg:basis-[calc((100%-3rem)/4)] min-w-0"
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
        <div className="mt-5 h-0.5 overflow-hidden bg-border" aria-hidden="true">
          <div
            className="h-full bg-text transition-[width] duration-300 ease-out motion-reduce:transition-none"
            style={{ width: `${indicatorPct}%` }}
          />
        </div>
      </div>
    </section>
  );
};
