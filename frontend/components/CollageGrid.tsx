import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * Desktop layout to match the provided reference:
 *  - Left column: 2 small banners on top, 1 wide banner beneath.
 *  - Right column: 1 tall banner spanning both rows.
 *
 * The reference markup uses ratio-based wrappers (via CSS variable
 * like --gz-ratio-percent). We mirror that here so the collage scales naturally
 * without hard-coded heights.
 */

const banners = [
  {
    title: "Macbook M4",
    subTitle: "APPLE BRAND",
    description: "Starting at $1.579.99",
    cta: "View All",
    href: "#",
    image: "/images/development/rotary_01.webp",
    ratioPercent: 88,
  },
  {
    title: "Limited Edition",
    subTitle: "SAVE 30—50% ELECTRONICS",
    description: "",
    cta: "View All",
    href: "#",
    image: "/images/development/athens-mosaic-06.webp",
    ratioPercent: 88,
    align: "center" as const,
  },
  {
    title: "Speaker Save Up To $178",
    subTitle: "",
    description: "Limited Time: Online Only!",
    cta: "View All",
    href: "#",
    image: "/images/development/athens-mosaic-03.webp",
    ratioPercent: 42,
  },
  {
    title: "Limited Edition",
    subTitle: "SAVE 40—50% ELECTRONICS",
    description: "Choose the right laptop screen for the best experience.",
    cta: "Shop Now",
    href: "#",
    image: "/images/development/athens-mosaic-02d.webp",
    ratioPercent: 88,
    align: "center" as const,
    ctaVariant: "light" as const,
  },
];

type Banner = (typeof banners)[number];

export const CollageGrid: React.FC = () => {
  const width = useWindowWidth();
  const isMobileSlider = width < 768;

  // Keep your existing auto-advance behavior on mobile
  const slidesPerView = useMemo(() => (width < 768 ? 2 : 3), [width]);

  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const maxIndex = Math.max(0, banners.length - slidesPerView);
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

  const BannerCard = ({ banner }: { banner: Banner }) => {
    const align =
      banner.align === "center"
        ? "items-center text-center"
        : "items-start text-left";
    const ctaClass =
      banner.ctaVariant === "light"
        ? "bg-white text-gray-900 hover:bg-white/90"
        : "bg-white/10 text-white hover:bg-white/15";

    return (
      <a
        href={banner.href}
        className={
          "group relative block w-full overflow-hidden rounded-[14px] bg-gray-900 shadow-sm " +
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-belims-accent"
        }
        aria-label={banner.title}
      >
        {/* Ratio wrapper (matches the reference's --gz-ratio-percent) */}
        <div
          className="relative w-full"
          style={{ paddingBottom: `${banner.ratioPercent}%` }}
        >
          {/* media */}
          <img
            src={banner.image}
            alt={banner.title}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            loading="lazy"
            decoding="async"
          />

          {/* overlays */}
          <div className="absolute inset-0 bg-gradient-to-br from-black/45 via-black/25 to-black/10" />
          <div className="absolute inset-0 bg-black/10 transition-colors group-hover:bg-black/15" />

          {/* content */}
          <div
            className={
              "absolute inset-0 z-10 flex flex-col justify-start gap-3 p-6 md:p-7 " +
              align
            }
          >
            {banner.subTitle ? (
              <div className="text-xs font-semibold uppercase tracking-wide text-white/90">
                {banner.subTitle}
              </div>
            ) : null}

            <h3 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
              {banner.title}
            </h3>

            {banner.description ? (
              <p className="max-w-[40ch] text-sm text-white/85 md:text-[15px]">
                {banner.description}
              </p>
            ) : null}

            <div className="mt-auto pt-4">
              <span
                className={
                  "inline-flex items-center justify-center rounded-full px-8 py-3 text-sm font-semibold transition " +
                  ctaClass
                }
              >
                {banner.cta}
              </span>
            </div>
          </div>
        </div>
      </a>
    );
  };

  return (
    <section className="bg-gray-100 py-8 md:py-14">
      <div className="container mx-auto px-4">
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
              {banners.map((banner) => (
                <div
                  key={banner.title + banner.subTitle}
                  className="shrink-0 snap-start"
                  style={{ width: `${mobileCardWidthPct * 100}%` }}
                >
                  <BannerCard banner={banner} />
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

        {/* Desktop collage layout */}
        <div className="hidden md:block">
          <div className="grid grid-cols-2 gap-5 lg:gap-6">
            <div className="grid grid-cols-2 gap-5 lg:gap-6">
              <BannerCard banner={banners[0]} />
              <BannerCard banner={banners[1]} />
              <div className="col-span-2">
                <BannerCard banner={banners[2]} />
              </div>
            </div>

            <div>
              <BannerCard banner={banners[3]} />
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
