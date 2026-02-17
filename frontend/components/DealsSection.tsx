import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Product } from "../types";
import { ProductCard } from "./ProductCard";
import { CountdownTimer } from "./CountdownTimer";
import { SkeletonProductCard } from "./Skeleton";

type DealTabKey =
  | "all"
  | "deal_of_day"
  | "weekly"
  | "trade_special"
  | "clearance";

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
  // {
  //   key: "all",
  //   label: "All deals",
  //   title: "All deals",
  //   description: "The best savings across the store, all in one place.",
  //   image: "/images/development/collection-sales.webp",
  //   link: "/deals",
  //   linkLabel: "Shop all deals",
  // },
  {
    key: "deal_of_day",
    label: "Deals of the day",
    title: "Deals of the day",
    description: "Fresh discounts daily. New savings every morning.",
    image: "/images/development/athens-mosaic-04a.webp",
    link: "/deals",
    linkLabel: "View daily deals",
  },
  {
    key: "weekly",
    label: "Weekly deals",
    title: "Weekly deals",
    description: "Weekly savings across selected products.",
    image: "/images/development/athens-mosaic-03.webp",
    link: "/deals/weekly",
    linkLabel: "View weekly deals",
  },
  {
    key: "trade_special",
    label: "Trade specials",
    title: "Trade specials",
    description: "Contractor pricing for approved trade accounts.",
    image:
      "/images/development/man-portrait-tools-with-arms-crossed-home-development-construction-renovation-workshop-carpenter-male-employee-contractor-maintenance-drill-repair-work-diy.webp",
    link: "/deals?type=trade_special",
    linkLabel: "View trade specials",
  },
  {
    key: "clearance",
    label: "Clearance",
    title: "Clearance",
    description: "Last-chance pricing on end-of-line items.",
    image: "/images/development/athens-mosaic-02d.webp",
    link: "/deals?type=clearance",
    linkLabel: "Shop clearance",
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
  const tabConfig =
    DEAL_TABS.find((tab) => tab.key === activeTab) || DEAL_TABS[0];
  const dealsOfDayEndsAt = useMemo(() => {
    const now = new Date();
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return end;
  }, []);

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

      if (activeTab === "trade_special") {
        return tradeType === "trade_special";
      }

      if (activeTab === "clearance") {
        return consumerType === "clearance";
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

  return (
    <section className="w-full py-14 bg-gray-50 border-t border-black/5">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 font-heading">
              Shop deals
            </h2>
            <p className="text-sm text-gray-500">
              Find the best offers across today, weekly, trade, and clearance.
            </p>
          </div>
        </div>

        <div className="mb-6 overflow-x-auto no-scrollbar pb-2">
          <div className="flex gap-3 min-w-max">
            {DEAL_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 h-9 rounded-xl border font-semibold font-heading transition-colors whitespace-nowrap text-[13px] ${
                  activeTab === tab.key
                    ? "bg-belims-blue text-white border-gray-200"
                    : "bg-white text-[#64748b] border-gray-200 hover:bg-belims-blue hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 h-auto animate-fadeIn">
          <div className="w-full lg:w-1/3 xl:w-1/3 rounded overflow-hidden relative group flex-shrink-0">
            <img
              src={tabConfig.image}
              alt={tabConfig.title}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 filter brightness-[0.85]"
            />
            <div className="absolute inset-0 p-6 flex flex-col justify-center items-start text-center lg:text-left">
              <h3 className="text-xl md:text-2xl font-bold text-white mb-3 font-heading leading-tight drop-shadow-lg">
                {tabConfig.title}
              </h3>
              <p className="text-sm text-white/90 font-medium max-w-[16rem]">
                {tabConfig.description}
              </p>
              {activeTab === "deal_of_day" && (
                <div className="mt-4">
                  <CountdownTimer
                    targetDate={dealsOfDayEndsAt}
                    label="Ends in"
                    variant="inverse"
                    hideDays
                  />
                </div>
              )}
              <button
                type="button"
                onClick={() => navigate(tabConfig.link)}
                className="mt-3 text-white font-semibold pb-0.5 hover:text-belims-accent hover:border-belims-accent transition-colors font-heading"
              >
                {tabConfig.linkLabel}
              </button>
            </div>
          </div>

          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <div
              ref={railRef}
              className="flex-1 overflow-x-auto no-scrollbar flex gap-6 items-stretch snap-x snap-mandatory scroll-pl-0 scroll-pr-4"
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
                      className="flex-shrink-0 snap-start"
                      data-slider-item
                    >
                      <SkeletonProductCard className="w-[320px]" />
                    </div>
                  ))
                : tabProducts.map((product) => (
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

            {!showSkeletons && tabProducts.length === 0 && (
              <div className="mt-4 rounded-lg border border-black/5 bg-white px-4 py-6 text-sm text-gray-500">
                No deals available for this tab right now. Check back soon.
              </div>
            )}
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
              aria-label="Previous deals"
              className={[
                "grid h-9 w-9 place-items-center rounded-lg",
                "border border-black/10 bg-white text-gray-600",
                "transition-colors hover:bg-gray-50 hover:text-gray-900",
              ].join(" ")}
            >
              <span aria-hidden>‹</span>
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next deals"
              className={[
                "grid h-9 w-9 place-items-center rounded-lg",
                "border border-black/10 bg-white text-gray-600",
                "transition-colors hover:bg-gray-50 hover:text-gray-900",
              ].join(" ")}
            >
              <span aria-hidden>›</span>
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
