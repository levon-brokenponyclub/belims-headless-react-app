import React, { useEffect, useMemo, useRef, useState } from "react";

type Brand = {
  name: string;
  logo: string;
  url?: string;
};

const BRANDS: Brand[] = [
  {
    name: "Bosch",
    logo: "https://cdn.worldvectorlogo.com/logos/bosch-938.svg",
    url: "/brands/bosch",
  },
  {
    name: "Makita",
    logo: "https://cdn.worldvectorlogo.com/logos/makita-1.svg",
    url: "/brands/makita",
  },
  {
    name: "DeWalt",
    logo: "https://cdn.worldvectorlogo.com/logos/dewalt-1.svg",
    url: "/brands/dewalt",
  },
  {
    name: "Stanley",
    logo: "https://cdn.worldvectorlogo.com/logos/stanley-3.svg",
    url: "/brands/stanley",
  },
  {
    name: "Einhell",
    logo: "https://cdn.worldvectorlogo.com/logos/einhell-1.svg",
    url: "/brands/einhell",
  },
  {
    name: "Ryobi",
    logo: "https://cdn.worldvectorlogo.com/logos/ryobi-1.svg",
    url: "/brands/ryobi",
  },
];

// Small hook: tracks viewport width for responsive “slides per view”
function useWindowWidth() {
  const [w, setW] = useState<number>(() =>
    typeof window === "undefined" ? 1380 : window.innerWidth,
  );
  useEffect(() => {
    const onResize = () => setW(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return w;
}

export function BrandStrip() {
  const width = useWindowWidth();

  // Tune these breakpoints to your design
  const slidesPerView = useMemo(() => {
    if (width < 640) return 2; // mobile
    if (width < 768) return 3; // sm
    if (width < 1024) return 4; // md
    return 6; // desktop
  }, [width]);

  // “Step” how many cards to move per click
  const step = useMemo(() => (slidesPerView >= 4 ? 2 : 1), [slidesPerView]);

  // Index points to the first visible slide
  const [index, setIndex] = useState(0);

  // Clamp when resizing
  useEffect(() => {
    setIndex((prev) =>
      Math.min(prev, Math.max(0, BRANDS.length - slidesPerView)),
    );
  }, [slidesPerView]);

  const maxIndex = Math.max(0, BRANDS.length - slidesPerView);

  const prev = () => setIndex((i) => Math.max(0, i - step));
  const next = () => setIndex((i) => Math.min(maxIndex, i + step));

  // Keyboard support
  const railRef = useRef<HTMLDivElement | null>(null);
  const onKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    if (e.key === "ArrowLeft") prev();
    if (e.key === "ArrowRight") next();
  };

  // Percent-based translate: each slide takes 100 / slidesPerView of the viewport width
  const translatePct = (index * 100) / slidesPerView;

  return (
    <section
      className="mb-16 py-10 bg-belims-blue border-y border-black/5"
      aria-label="Trusted brands"
    >
      <div className="container mx-auto px-4">
        {/* Header row (optional) */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-2xl font-bold text-white font-heading">
            Shop by brand
          </h3>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={prev}
              disabled={index === 0}
              aria-label="Previous brands"
              className="
                h-9 w-9 rounded bg-white/10 text-white
                ring-1 ring-white/15
                transition
                hover:bg-white/15
                disabled:opacity-40 disabled:hover:bg-white/10
              "
            >
              ‹
            </button>
            <button
              type="button"
              onClick={next}
              disabled={index === maxIndex}
              aria-label="Next brands"
              className="
                h-9 w-9 rounded bg-white/10 text-white
                ring-1 ring-white/15
                transition
                hover:bg-white/15
                disabled:opacity-40 disabled:hover:bg-white/10
              "
            >
              ›
            </button>
          </div>
        </div>

        {/* Carousel viewport */}
        <div
          ref={railRef}
          tabIndex={0}
          onKeyDown={onKeyDown}
          className="
            relative overflow-hidden rounded-lg
            focus:outline-none focus:ring-2 focus:ring-white/40
          "
          aria-roledescription="carousel"
        >
          {/* Track */}
          <div
            className="flex transition-transform duration-300 ease-out"
            style={{
              transform: `translateX(-${translatePct}%)`,
            }}
          >
            {BRANDS.map((brand) => (
              <div
                key={brand.name}
                className="shrink-0 px-3"
                style={{ width: `${100 / slidesPerView}%` }}
                aria-roledescription="slide"
              >
                <a
                  href={brand.url}
                  aria-label={`Shop ${brand.name}`}
                  className="
                    group flex flex-col items-center gap-2
                    rounded bg-white
                    px-4 py-4
                    ring-1 ring-black/5
                    transition-all duration-200 ease-out
                    hover:ring-black/10 hover:-translate-y-0.5
                  "
                >
                  {/* HEIGHT-LOCKED LOGO STAGE */}
                  <span className="flex items-center justify-center h-12 w-full overflow-hidden">
                    <img
                      src={brand.logo}
                      alt={brand.name}
                      loading="lazy"
                      className="
                        w-[65%] object-contain
                        transition-all duration-200 ease-out
                      "
                    />
                  </span>

                  {/* Brand label */}
                  <span
                    className="
                      text-xs font-semibold tracking-wide uppercase
                      text-gray-400
                      transition-colors duration-200
                      group-hover:text-gray-700
                    "
                  >
                    {brand.name}
                  </span>
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* Dots (optional) */}
        <div className="mt-4 flex justify-center gap-2">
          {Array.from({ length: maxIndex + 1 }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={[
                "h-2.5 w-2.5 rounded-full transition",
                i === index ? "bg-white" : "bg-white/35 hover:bg-white/60",
              ].join(" ")}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
