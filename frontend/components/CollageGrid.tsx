import React, { useEffect, useMemo, useRef, useState } from "react";

const categories = [
  {
    title: "Power Tools",
    count: "1,240 Pieces",
    image: "/images/development/rotary_01.webp",
    badge: { line1: "Up to", line2: "50% Off!" },
  },
  {
    title: "Hand Tools",
    count: "850 Pieces",
    image: "/images/development/athens-mosaic-06.webp",
  },
  {
    title: "Safety Equipment",
    count: "420 Pieces",
    image: "/images/development/athens-mosaic-03.webp",
  },
  {
    title: "Plumbing",
    count: "680 Pieces",
    image: "/images/development/lf_01.webp",
  },
  {
    title: "Electrical",
    count: "540 Pieces",
    image: "/images/development/athens-mosaic-04a.webp",
  },
  {
    title: "Chainsaws",
    count: "540 Pieces",
    image: "/images/development/athens-mosaic-02d.webp",
  },
];

type Category = (typeof categories)[number];

export const CollageGrid: React.FC = () => {
  const width = useWindowWidth();
  const isMobileSlider = width < 768;

  // Keep your existing auto-advance behavior on mobile
  const slidesPerView = useMemo(() => (width < 768 ? 2 : 3), [width]);

  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const maxIndex = Math.max(0, categories.length - slidesPerView);
  const railRef = useRef<HTMLDivElement | null>(null);
  const [railWidth, setRailWidth] = useState(0);

  // This section in the screenshot uses fairly wide cards in the scroller
  const mobileCardWidthPct = 0.8;

  useEffect(() => {
    setIndex((prev) => Math.min(prev, maxIndex));
  }, [maxIndex]);

  useEffect(() => {
    if (!isMobileSlider || isPaused || maxIndex === 0) return;
    const interval = window.setInterval(() => {
      setIndex((prev) => {
        const next = prev >= maxIndex ? 0 : prev + 1;
        scrollToIndex(next);
        return next;
      });
    }, 5000);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobileSlider, isPaused, maxIndex, railWidth]);

  useEffect(() => {
    if (!railRef.current) return;
    const handleResize = () => setRailWidth(railRef.current?.clientWidth || 0);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [width]);

  const itemWidth =
    railWidth > 0
      ? railWidth * (isMobileSlider ? mobileCardWidthPct : 1 / slidesPerView)
      : 0;

  const scrollToIndex = (nextIndex: number) => {
    if (!railRef.current || !itemWidth) return;
    railRef.current.scrollTo({
      left: nextIndex * itemWidth,
      behavior: "smooth",
    });
  };

  const indicatorPct =
    maxIndex === 0 ? 100 : Math.min(100, (index / maxIndex) * 100);

  const CategoryCard = ({
    cat,
    variant,
  }: {
    cat: Category;
    variant: "large" | "small" | "wide";
  }) => {
    const isLarge = variant === "large";
    const isWide = variant === "wide";

    // Heights approximate the screenshot proportions
    const heightClass = isLarge
      ? "h-[260px] md:h-[300px] lg:h-[320px]"
      : isWide
        ? "h-[220px] md:h-[240px] lg:h-[260px]"
        : "h-[220px] md:h-[240px] lg:h-[260px]";

    return (
      <a
        href="#"
        className={`
          group relative overflow-hidden rounded-2xl bg-gray-900 shadow-sm
          ${heightClass}
          focus:outline-none focus-visible:ring-2 focus-visible:ring-belims-accent
        `}
        aria-label={cat.title}
      >
        {/* media */}
        <img
          src={cat.image}
          alt={cat.title}
          className="
            absolute inset-0 h-full w-full object-cover
            transition-transform duration-700
            group-hover:scale-[1.03]
          "
          loading="lazy"
          decoding="async"
        />

        {/* subtle pattern-ish overlay feel */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/35 via-black/15 to-black/10" />
        <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors" />

        {/* top tiny blue bar like screenshot */}
        <div className="absolute left-5 top-0 z-10 h-[6px] w-12 rounded-b bg-[#2f6bff]" />

        {/* badge (only first card in screenshot) */}
        {"badge" in cat && cat.badge ? (
          <div className="absolute left-5 top-5 z-20 rounded-lg bg-[#004fc7] px-4 py-3 text-white shadow-sm">
            <div className="text-xs font-semibold leading-none opacity-95">
              {cat.badge.line1}
            </div>
            <div className="mt-1 text-xl font-semibold leading-none">
              {cat.badge.line2}
            </div>
          </div>
        ) : null}

        {/* text bottom-left */}
        <div className="relative z-10 flex h-full flex-col justify-end p-5 md:p-6">
          <h3
            className={`
              text-white font-semibold tracking-tight
              ${isLarge ? "text-2xl md:text-3xl" : "text-xl md:text-2xl"}
            `}
          >
            {cat.title}
          </h3>

          {/* The screenshot version is title-only; keep count hidden for desktop.
              (If you want it back, uncomment below) */}
          {/* <span className="mt-1 text-xs md:text-sm text-white/70 italic">
            {cat.count}
          </span> */}
        </div>
      </a>
    );
  };

  return (
    <section className="py-10 md:py-12">
      <div className="container mx-auto px-4">
        {/* Headings row like screenshot */}
        {/* <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight md:text-2xl">
              Popular categories
            </h2>
          </div>
          <a
            href="/collections"
            className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900"
          >
            All categories
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path
                d="M7.29167 15.833L12.5 10.6247L7.29167 5.41634"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>
        </div> */}

        {/* Mobile scroller */}
        <div className="md:hidden">
          <div
            className="relative overflow-x-auto no-scrollbar snap-x snap-mandatory"
            aria-roledescription="carousel"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onScroll={() => {
              if (!railRef.current || !itemWidth) return;
              const nextIndex = Math.round(
                railRef.current.scrollLeft / itemWidth,
              );
              setIndex(Math.min(maxIndex, Math.max(0, nextIndex)));
            }}
            ref={railRef}
          >
            <div className="flex gap-4 pr-4">
              {categories.map((cat, i) => (
                <div
                  key={cat.title}
                  className="shrink-0 snap-start"
                  style={{ width: `${mobileCardWidthPct * 100}%` }}
                >
                  <CategoryCard
                    cat={cat}
                    variant={i === 0 ? "large" : "small"}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-belims-blue transition-all duration-300"
              style={{ width: `${indicatorPct}%` }}
            />
          </div>
        </div>

        {/* Desktop collage-6 layout (matches screenshot) */}
        <div className="hidden md:block">
          <div className="grid grid-cols-12 gap-4 md:gap-5 lg:gap-6">
            {/* Row 1: Large left (8 cols), two small (2 cols each) */}
            <div className="col-span-6 md:col-span-6 h-[340px]">
              <CategoryCard cat={categories[0]} variant="large" />
            </div>

            <div className="col-span-6 md:col-span-3">
              <CategoryCard cat={categories[1]} variant="small" />
            </div>

            <div className="col-span-6 md:col-span-3">
              <CategoryCard cat={categories[2]} variant="small" />
            </div>

            {/* Row 2: two small (3 cols each), wide right (6 cols) */}
            <div className="col-span-6 md:col-span-3 h-[340px]">
              <CategoryCard cat={categories[3]} variant="small" />
            </div>

            <div className="col-span-6 md:col-span-3">
              <CategoryCard cat={categories[4]} variant="small" />
            </div>

            {/* If you later add a 6th category, it becomes the wide card.
                For now we reuse categories[2] as the wide tile to keep the layout. */}
            <div className="col-span-12 md:col-span-6">
              <CategoryCard cat={categories[5]} variant="wide" />
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

export default CollageGrid;
