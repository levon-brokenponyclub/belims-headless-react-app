import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Product } from "../types";
import { NexvoProductCard } from "./NexvoProductCard";
import { SkeletonProductCard } from "./Skeleton";

interface NexvoProductSliderProps {
  products: Product[];
  addToCart: (product: Product) => void;
  onBuyNow?: (product: Product) => void;
  onCompare?: (product: Product) => void;
  isAuthenticated?: boolean;
  isTradeApproved?: boolean;
  isLoading?: boolean;
  skeletonCount?: number;
  showProgress?: boolean;
  className?: string;
}

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

export const NexvoProductSlider: React.FC<NexvoProductSliderProps> = ({
  products,
  addToCart,
  onBuyNow,
  onCompare,
  isAuthenticated = false,
  isTradeApproved = false,
  isLoading = false,
  skeletonCount = 5,
  showProgress = true,
  className = "",
}) => {
  const width = useWindowWidth();
  const railRef = useRef<HTMLDivElement | null>(null);
  const [railWidth, setRailWidth] = useState(0);
  const [stepWidth, setStepWidth] = useState(0);
  const [index, setIndex] = useState(0);

  const itemsLength = isLoading ? skeletonCount : products.length;

  const slidesPerView = useMemo(() => {
    if (!railWidth || !stepWidth) return 1;
    return Math.max(1, Math.floor(railWidth / stepWidth));
  }, [railWidth, stepWidth]);

  const maxIndex = useMemo(
    () => Math.max(0, itemsLength - slidesPerView),
    [itemsLength, slidesPerView],
  );

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
    railRef.current.scrollTo({ left: nextIndex * stepWidth, behavior: "smooth" });
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

  const slideClass =
    "nexvo-slider-slide flex-shrink-0 snap-start " +
    "basis-[calc((100%-8px)/2.1)] sm:basis-[calc((100%-16px)/3.1)] lg:basis-[calc((100%-32px)/5)]";

  return (
    <div className={`nexvo-slider-wrapper swiper-show-nav-on-hover${className ? ` ${className}` : ""}`}>
      {/* Rail */}
      <div
        ref={railRef}
        className="nexvo-slider-rail"
        aria-roledescription="carousel"
        onScroll={() => {
          if (!railRef.current || !stepWidth) return;
          const nextIndex = Math.round(railRef.current.scrollLeft / stepWidth);
          setIndex(Math.min(maxIndex, Math.max(0, nextIndex)));
        }}
      >
        {isLoading
          ? Array.from({ length: skeletonCount }).map((_, i) => (
              <div
                key={`skel-${i}`}
                className={slideClass}
                data-slider-item
              >
                <SkeletonProductCard className="w-full h-full" />
              </div>
            ))
          : products.map((product) => (
              <div
                key={product.id}
                className={slideClass}
                data-slider-item
              >
                <NexvoProductCard
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

      {/* Arrows */}
      <button
        type="button"
        className="swiper-arrow swiper-arrow--prev"
        onClick={prev}
        aria-label="Previous"
      >
        <ChevronLeft size={20} strokeWidth={1.5} />
      </button>
      <button
        type="button"
        className="swiper-arrow swiper-arrow--next"
        onClick={next}
        aria-label="Next"
      >
        <ChevronRight size={20} strokeWidth={1.5} />
      </button>

      {/* Progress */}
      {showProgress && (
        <div className="mt-4 flex items-center justify-between gap-4">
          <div className="h-0.5 w-full rounded-full bg-gray-200 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${indicatorPct}%`,
                background: "var(--color-primary)",
              }}
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={prev}
              className="group relative h-10 w-10 overflow-hidden rounded-full border border-subtle bg-white text-grey transition-colors duration-300 ease-out hover:border-grey hover:bg-grey hover:text-white flex items-center justify-center"
              aria-label="Previous products"
            >
              <span className="absolute inset-0 origin-right scale-x-0 bg-grey transition-transform duration-300 ease-out group-hover:scale-x-100" />
              <ChevronLeft size={20} strokeWidth={1.5} className="relative z-10" />
            </button>
            <button
              type="button"
              onClick={next}
              className="group relative h-10 w-10 overflow-hidden rounded-full border border-subtle bg-white text-grey transition-colors duration-300 ease-out hover:border-grey hover:bg-grey hover:text-white flex items-center justify-center"
              aria-label="Next products"
            >
              <span className="absolute inset-0 origin-left scale-x-0 bg-grey transition-transform duration-300 ease-out group-hover:scale-x-100" />
              <ChevronRight size={20} strokeWidth={1.5} className="relative z-10" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
