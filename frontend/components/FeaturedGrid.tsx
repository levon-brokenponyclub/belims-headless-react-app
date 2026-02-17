import React, { useEffect, useMemo, useState } from "react";

const featuredCategories = [
  {
    title: "Sale Items",
    image: "/images/development/collection-sales.webp",
  },
  {
    title: "Most viewed",
    image: "/images/development/Image_55.webp",
  },
  {
    title: "Recently viewed",
    image: "/images/development/Image_60.webp",
  },
  {
    title: "New arrivals",
    image: "/images/development/Image_44.webp",
  },
  {
    title: "Trending now",
    image: "/images/development/Image_44.webp",
  },
  {
    title: "Chairs",
    image: "/images/development/Image_55.webp",
  },
  {
    title: "Storage",
    image: "/images/development/Image_60.webp",
  },
  {
    title: "Accessories",
    image: "/images/development/Image_44.webp",
  },
  {
    title: "Tables",
    image: "/images/development/Image_55.webp",
  },
  {
    title: "Bar Chairs",
    image: "/images/development/Image_60.webp",
  },
];

export const FeaturedGrid: React.FC = () => {
  const width = useWindowWidth();
  const isMobileSlider = width < 768;
  const slidesPerView = useMemo(() => {
    if (width >= 1024) return 9;
    if (width >= 768) return 5;
    return 2;
  }, [width]);

  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const maxIndex = Math.max(0, featuredCategories.length - slidesPerView);

  useEffect(() => {
    setIndex((prev) => Math.min(prev, maxIndex));
  }, [maxIndex]);

  useEffect(() => {
    if (!isMobileSlider || isPaused || maxIndex === 0) return;
    const interval = window.setInterval(() => {
      setIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
    }, 5000);
    return () => window.clearInterval(interval);
  }, [isMobileSlider, isPaused, maxIndex]);

  const prev = () => setIndex((i) => (i <= 0 ? maxIndex : i - 1));
  const next = () => setIndex((i) => (i >= maxIndex ? 0 : i + 1));
  const translatePct = (index * 100) / slidesPerView;

  const renderCard = (category: (typeof featuredCategories)[number]) => (
    <article className="group">
      <a href="#" className="flex flex-col items-center text-center">
        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-100 overflow-hidden">
          <img
            className="h-full w-full object-cover"
            alt={`${category.title} category`}
            src={category.image}
            loading="lazy"
            decoding="async"
          />
        </span>
        <span className="mt-3 text-base text-gray">{category.title}</span>
      </a>
    </article>
  );

  return (
    <section className="w-full pt-8 bg-white">
      <div className="container mx-auto px-4">
        <div className="w-full mx-auto">
          {/* <div className="flex items-start justify-between gap-6 mb-6">
            <div className="text-left">
              <h2 className="font-heading text-2xl md:text-3xl text-gray-900">
                Built for Every Job
              </h2>
              <p className="text-sm md:text-base text-gray-600 mt-1 max-w-2xl">
                Quickly access our most popular, recently viewed, and expertly
                selected products.
              </p>
            </div>
            <div
              className={`flex items-center gap-2 ${
                maxIndex > 0 ? "" : "hidden"
              }`}
            >
              <button
                type="button"
                onClick={prev}
                aria-label="Previous featured"
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
                aria-label="Next featured"
                className={[
                  "grid h-9 w-9 place-items-center rounded-lg",
                  "border border-black/10 bg-white text-gray-600",
                  "transition-colors hover:bg-gray-50 hover:text-gray-900",
                ].join(" ")}
              >
                ›
              </button>
            </div>
          </div> */}

          <div
            className="relative overflow-hidden"
            aria-roledescription="carousel"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            <div
              className="-mx-3 flex transition-transform duration-500 ease-out"
              style={{ transform: `translateX(-${translatePct}%)` }}
            >
              {featuredCategories.map((category) => (
                <div
                  key={category.title}
                  className="shrink-0 px-3"
                  style={{ width: `${100 / slidesPerView}%` }}
                >
                  {renderCard(category)}
                </div>
              ))}
            </div>
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
