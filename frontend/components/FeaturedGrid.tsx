import React, { useEffect, useMemo, useState } from "react";

const featuredCategories = [
  {
    title: "Hand-picked products",
    image: "/images/development/Image_44.webp",
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
];

export const FeaturedGrid: React.FC = () => {
  const width = useWindowWidth();
  const isMobileSlider = width < 768;
  const slidesPerView = useMemo(() => {
    if (width < 768) return 2;
    return 3;
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
    <article className="group rounded-xl border border-black/10 bg-white p-3 shadow-[0_1px_2px_rgba(16,24,40,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(16,24,40,0.08)]">
      <a
        href="#"
        className="flex items-center justify-center rounded-lg bg-slate-100 h-36 overflow-hidden"
      >
        <img
          className="h-full w-full object-cover"
          alt={`${category.title} category`}
          src={category.image}
          loading="lazy"
          decoding="async"
        />
      </a>
      <div className="pt-4 text-left">
        <h3 className="text-base font-semibold text-slate-900">
          {category.title}
        </h3>
        <p className="text-sm text-gray-600 mt-1">Shop now</p>
      </div>
    </article>
  );

  return (
    <section className="w-full py-14 bg-gray-50 border-b border-black/5">
      <div className="container mx-auto px-4">
        <div className="w-full mx-auto">
          <div className="flex items-start justify-between gap-6 mb-6">
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
                isMobileSlider ? "" : "hidden"
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
          </div>

          <div className="md:hidden">
            <div
              className="relative overflow-hidden rounded-xl"
              aria-roledescription="carousel"
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
            >
              <div
                className="-mx-2 flex transition-transform duration-500 ease-out"
                style={{ transform: `translateX(-${translatePct}%)` }}
              >
                {featuredCategories.map((category) => (
                  <div
                    key={category.title}
                    className="shrink-0 px-2"
                    style={{ width: `${100 / slidesPerView}%` }}
                  >
                    {renderCard(category)}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="hidden md:grid grid-cols-2 lg:grid-cols-5 gap-6">
            {featuredCategories.map((category) => (
              <div key={category.title}>{renderCard(category)}</div>
            ))}
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
