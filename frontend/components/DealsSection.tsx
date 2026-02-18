import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Product } from "../types";
import { ProductCard, PRODUCT_CARD_PRESETS } from "./ProductCard";
import { SkeletonProductCard } from "./Skeleton";

type DealTabKey = "deal_of_day" | "weekly" | "trade_deals";

type DealTabConfig = {
  key: DealTabKey;
  label: string;
  title: string;
  description: string;
  image: string;
  link: string;
  linkLabel: string;
};

const DEAL_TABS: DealTabConfig[] = [
  {
    key: "deal_of_day",
    label: "Daily Deals",
    title: "Daily Deals",
    description: "Fresh discounts daily. New savings every morning.",
    image: "/images/development/athens-mosaic-04a.webp",
    link: "/deals",
    linkLabel: "View daily deals",
  },
  {
    key: "weekly",
    label: "Weekly Deals",
    title: "Weekly Deals",
    description: "Weekly savings across selected products.",
    image: "/images/development/athens-mosaic-03.webp",
    link: "/deals/weekly",
    linkLabel: "View weekly deals",
  },
  {
    key: "trade_deals",
    label: "Trade Deals",
    title: "Trade Deals",
    description: "Exclusive trade pricing for approved trade accounts.",
    image: "/images/development/athens-mosaic-02d.webp",
    link: "/trade/deals",
    linkLabel: "View trade deals",
  },
];

interface DealsSectionProps {
  products: Product[];
  isLoadingProducts?: boolean;
  addToCart: (product: Product) => void;
  onBuyNow: (product: Product) => void;
  onCompare: (product: Product) => void;
  isAuthenticated?: boolean;
  isTradeApproved?: boolean;
}

export const DealsSection: React.FC<DealsSectionProps> = ({
  products,
  isLoadingProducts = false,
  addToCart,
  onBuyNow,
  onCompare,
  isAuthenticated = false,
  isTradeApproved = false,
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<DealTabKey>("deal_of_day");

  const tabProducts = useMemo(() => {
    const filtered = products.filter((product) => {
      const consumerType = product.deals_resolved?.consumer?.bestDeal?.type;
      const tradeType = product.deals_resolved?.trade?.bestDeal?.type;

      if (activeTab === "deal_of_day") {
        return consumerType === "deal_of_day";
      }

      if (activeTab === "weekly") {
        return consumerType === "weekly_special";
      }

      if (activeTab === "trade_deals") {
        return tradeType === "trade_special";
      }

      if (tradeType || consumerType) return true;

      return (
        (product.sale_price && parseFloat(String(product.sale_price)) > 0) ||
        product.isFeatured
      );
    });

    return filtered.slice(0, 10);
  }, [activeTab, products]);

  const showSkeletons = isLoadingProducts;

  const width = useWindowWidth();
  const railRef = useRef<HTMLDivElement | null>(null);
  const [railWidth, setRailWidth] = useState(0);
  const [stepWidth, setStepWidth] = useState(0);
  const [index, setIndex] = useState(0);

  const itemsLength = showSkeletons ? 5 : tabProducts.length;

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

  useEffect(() => {
    if (!railRef.current) return;
    setIndex(0);
    railRef.current.scrollTo({ left: 0, behavior: "smooth" });
  }, [activeTab]);

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

  // Hide section if no deals available across all tabs
  const hasAnyDeals = useMemo(() => {
    return products.some((product) => {
      const consumerType = product.deals_resolved?.consumer?.bestDeal?.type;
      const tradeType = product.deals_resolved?.trade?.bestDeal?.type;
      return (
        consumerType === "deal_of_day" ||
        consumerType === "weekly_special" ||
        consumerType === "clearance" ||
        tradeType === "trade_special" ||
        (product.sale_price && parseFloat(String(product.sale_price)) > 0)
      );
    });
  }, [products]);

  if (!hasAnyDeals && !isLoadingProducts) {
    return null;
  }

  return (
    <section className="w-full py-10">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between gap-6 mb-5">
          <h2 className="text-2xl font-bold tracking-tight text-grey md:text-[28px]">
            Shop Deals
          </h2>
          <div className="flex items-center gap-4" role="tablist">
            {DEAL_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setActiveTab(tab.key);
                  setIndex(0);
                  scrollToIndex(0);
                }}
                className={`text-lg font-semibold transition-colors ${
                  activeTab === tab.key
                    ? "text-grey"
                    : "text-grey-medium hover:text-grey"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-5 h-auto animate-fadeIn">
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
                ? Array.from({ length: 5 }).map((_, itemIndex) => (
                    <div
                      key={`deals-skel-${itemIndex}`}
                      className="flex-shrink-0 snap-start basis-[82%] sm:basis-[48%] lg:basis-[calc((100%-4rem)/5)] min-w-0"
                      data-slider-item
                    >
                      <SkeletonProductCard className="w-full" />
                    </div>
                  ))
                : tabProducts.map((product) => (
                    <div
                      key={product.id}
                      className="flex-shrink-0 snap-start basis-[82%] sm:basis-[48%] lg:basis-[calc((100%-4rem)/5)] min-w-0"
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
        </div>

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
