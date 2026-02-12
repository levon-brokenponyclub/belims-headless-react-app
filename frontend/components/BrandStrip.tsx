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

  const slidesPerView = useMemo(() => {
    if (width < 640) return 2;
    if (width < 768) return 3;
    if (width < 1024) return 4;
    return 6;
  }, [width]);

  const step = useMemo(() => (slidesPerView >= 4 ? 2 : 1), [slidesPerView]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex((prev) =>
      Math.min(prev, Math.max(0, BRANDS.length - slidesPerView)),
    );
  }, [slidesPerView]);

  const maxIndex = Math.max(0, BRANDS.length - slidesPerView);

  const prev = () => setIndex((i) => Math.max(0, i - step));
  const next = () => setIndex((i) => Math.min(maxIndex, i + step));

  const railRef = useRef<HTMLDivElement | null>(null);
  const onKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    if (e.key === "ArrowLeft") prev();
    if (e.key === "ArrowRight") next();
  };

  const translatePct = (index * 100) / slidesPerView;

  return (
    <section
      className="mb-16 bg-belims-blue border-y border-black/5"
      aria-label="Trusted brands"
    >
      <div className="container mx-auto px-4 py-14 pb-16 md:py-14 md:pb-16">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-heading text-h3 text-white">Trusted brands</h3>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={prev}
              disabled={index === 0}
              aria-label="Previous brands"
              className={[
                "grid h-10 w-10 place-items-center rounded-lg",
                "border border-white/15 bg-white/5 text-white/80",
                "transition-colors hover:bg-white/10 hover:text-white",
                "disabled:opacity-40 disabled:hover:bg-white/5",
              ].join(" ")}
            >
              ‹
            </button>

            <button
              type="button"
              onClick={next}
              disabled={index === maxIndex}
              aria-label="Next brands"
              className={[
                "grid h-10 w-10 place-items-center rounded-lg",
                "border border-white/15 bg-white/5 text-white/80",
                "transition-colors hover:bg-white/10 hover:text-white",
                "disabled:opacity-40 disabled:hover:bg-white/5",
              ].join(" ")}
            >
              ›
            </button>
          </div>
        </div>

        <div
          ref={railRef}
          tabIndex={0}
          onKeyDown={onKeyDown}
          className={[
            "relative overflow-hidden rounded-lg",
            "focus:outline-none focus:ring-2 focus:ring-white/40",
          ].join(" ")}
          aria-roledescription="carousel"
        >
          <div
            className="-mx-2 flex transition-transform duration-300 ease-out"
            style={{ transform: `translateX(-${translatePct}%)` }}
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
                  className={[
                    "group flex flex-col items-center gap-2",
                    "rounded-lg bg-white px-4 py-5",
                    "border border-black/10",
                    "shadow-[0_1px_2px_rgba(16,24,40,0.06)]",
                    "transition-all duration-200",
                    "hover:shadow-[0_8px_24px_rgba(16,24,40,0.08)] hover:-translate-y-0.5",
                  ].join(" ")}
                >
                  <span className="flex items-center justify-center h-12 w-full overflow-hidden">
                    <img
                      src={brand.logo}
                      alt={brand.name}
                      loading="lazy"
                      decoding="async"
                      className="w-[65%] object-contain"
                    />
                  </span>

                  <span className="font-body text-xs font-semibold uppercase tracking-wider text-gray-400 group-hover:text-gray-700 transition-colors">
                    {brand.name}
                  </span>
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* <div className="mt-6 flex justify-center gap-2">
          {Array.from({ length: maxIndex + 1 }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={[
                "h-2 w-2 rounded-full transition-colors",
                i === index ? "bg-white" : "bg-white/30 hover:bg-white/60",
              ].join(" ")}
            />
          ))}
        </div> */}
      </div>
    </section>
  );
}
