import React, { useEffect, useMemo, useRef, useState } from "react";

type Brand = {
  name: string;
  logo?: string;
  logoCandidates?: string[];
  slug?: string;
  url?: string;
};

type CmsBrandTerm = {
  id: number;
  name: string;
  slug: string;
  count?: number;
};

const FALLBACK_BRANDS: Brand[] = [
  {
    name: "Bosch",
    logo: "https://cdn.worldvectorlogo.com/logos/bosch-938.svg",
    slug: "bosch",
    url: "/brands/bosch",
  },
  {
    name: "Makita",
    logo: "https://cdn.worldvectorlogo.com/logos/makita-1.svg",
    slug: "makita",
    url: "/brands/makita",
  },
  {
    name: "DeWalt",
    logo: "https://cdn.worldvectorlogo.com/logos/dewalt-1.svg",
    slug: "dewalt",
    url: "/brands/dewalt",
  },
  {
    name: "Stanley",
    logo: "https://cdn.worldvectorlogo.com/logos/stanley-3.svg",
    slug: "stanley",
    url: "/brands/stanley",
  },
  {
    name: "Einhell",
    logo: "https://cdn.worldvectorlogo.com/logos/einhell-1.svg",
    slug: "einhell",
    url: "/brands/einhell",
  },
  {
    name: "Ryobi",
    logo: "https://cdn.worldvectorlogo.com/logos/ryobi-1.svg",
    slug: "ryobi",
    url: "/brands/ryobi",
  },
];

const WORLD_VECTOR_LOGO_BASE = "https://cdn.worldvectorlogo.com/logos";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getWorldVectorLogoCandidates(name: string, slug?: string) {
  const base = slugify(slug || "");
  const byName = slugify(name);
  const tokens = [base, byName].filter(Boolean);
  const candidates = new Set<string>();

  tokens.forEach((token) => {
    candidates.add(`${WORLD_VECTOR_LOGO_BASE}/${token}.svg`);
    candidates.add(`${WORLD_VECTOR_LOGO_BASE}/${token}-1.svg`);
    candidates.add(`${WORLD_VECTOR_LOGO_BASE}/${token}-2.svg`);
    candidates.add(`${WORLD_VECTOR_LOGO_BASE}/${token}-3.svg`);
  });

  return Array.from(candidates);
}

function getCmsBaseUrl() {
  if (typeof window !== "undefined" && window.location.hostname === "localhost") {
    return "http://belims-headless.local/wp-json";
  }
  return "/api";
}

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
  const [brands, setBrands] = useState<Brand[]>(FALLBACK_BRANDS);
  const [logoAttemptByBrand, setLogoAttemptByBrand] = useState<Record<string, number>>({});

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const loadBrands = async () => {
      try {
        const url =
          `${getCmsBaseUrl()}/wp/v2/product_brand` +
          "?per_page=100&hide_empty=true&_fields=id,name,slug,count";
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) {
          throw new Error(`Failed to fetch brands (${response.status})`);
        }

        const terms = (await response.json()) as CmsBrandTerm[];
        const mapped = (Array.isArray(terms) ? terms : [])
          .filter((term) => term && term.slug && term.name)
          .map((term) => ({
            name: term.name,
            slug: term.slug,
            logoCandidates: getWorldVectorLogoCandidates(term.name, term.slug),
            url: `/brands/${term.slug}`,
          }));

        if (isMounted && mapped.length > 0) {
          setBrands(mapped);
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        console.error("Failed to load CMS brands for BrandStrip:", error);
      }
    };

    loadBrands();
    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    setLogoAttemptByBrand({});
  }, [brands]);

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
      Math.min(prev, Math.max(0, brands.length - slidesPerView)),
    );
  }, [brands.length, slidesPerView]);

  const maxIndex = Math.max(0, brands.length - slidesPerView);
  const hasOverflow = brands.length > slidesPerView;
  const pageStops = useMemo(() => {
    if (maxIndex <= 0) return [0];
    const stops: number[] = [0];
    for (let pos = step; pos < maxIndex; pos += step) {
      stops.push(pos);
    }
    if (stops[stops.length - 1] !== maxIndex) {
      stops.push(maxIndex);
    }
    return stops;
  }, [maxIndex, step]);

  const prev = () =>
    setIndex((i) => {
      if (!hasOverflow) return 0;
      if (i <= 0) return maxIndex;
      return Math.max(0, i - step);
    });
  const next = () =>
    setIndex((i) => {
      if (!hasOverflow) return 0;
      if (i >= maxIndex) return 0;
      return Math.min(maxIndex, i + step);
    });

  const railRef = useRef<HTMLDivElement | null>(null);
  const onKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    if (e.key === "ArrowLeft") prev();
    if (e.key === "ArrowRight") next();
  };

  useEffect(() => {
    if (!hasOverflow) return;
    const timer = window.setInterval(() => {
      setIndex((i) => (i >= maxIndex ? 0 : Math.min(maxIndex, i + step)));
    }, 4500);
    return () => window.clearInterval(timer);
  }, [hasOverflow, maxIndex, step]);

  const translatePct = (index * 100) / slidesPerView;

  return (
    <section
      className="bg-belims-blue border-y border-black/5"
      aria-label="Trusted brands"
    >
      <div className="container mx-auto px-4 py-14 pb-16 md:py-14 md:pb-16">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="font-heading text-h3 text-white">Trusted brands</h3>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={prev}
              disabled={!hasOverflow}
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
              disabled={!hasOverflow}
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
            {brands.map((brand) => (
              <div
                key={brand.slug || brand.name}
                className="shrink-0 px-3"
                style={{ width: `${100 / slidesPerView}%` }}
                aria-roledescription="slide"
              >
                {(() => {
                  const key = brand.slug || brand.name;
                  const attemptIndex = logoAttemptByBrand[key] || 0;
                  const candidateLogo =
                    brand.logo ||
                    brand.logoCandidates?.[attemptIndex] ||
                    "";
                  const showLogo =
                    Boolean(candidateLogo) &&
                    (brand.logo ? true : attemptIndex < (brand.logoCandidates?.length || 0));

                  return (
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
                    {showLogo ? (
                      <img
                        src={candidateLogo}
                        alt={brand.name}
                        loading="lazy"
                        decoding="async"
                        className="w-[65%] object-contain"
                        onError={() => {
                          const fallbackCount = brand.logoCandidates?.length || 0;
                          if (brand.logo) {
                            return;
                          }
                          if (fallbackCount > 0 && attemptIndex < fallbackCount - 1) {
                            setLogoAttemptByBrand((prev) => ({
                              ...prev,
                              [key]: attemptIndex + 1,
                            }));
                            return;
                          }
                          setLogoAttemptByBrand((prev) => ({
                            ...prev,
                            [key]: Number.MAX_SAFE_INTEGER,
                          }));
                        }}
                      />
                    ) : (
                      <span className="inline-flex h-10 min-w-[5rem] items-center justify-center rounded-md bg-gray-100 px-3 text-xs font-semibold uppercase tracking-wider text-gray-600">
                        {brand.name}
                      </span>
                    )}
                  </span>

                  <span className="font-body text-xs font-semibold uppercase tracking-wider text-gray-400 group-hover:text-gray-700 transition-colors">
                    {brand.name}
                  </span>
                </a>
                  );
                })()}
              </div>
            ))}
          </div>
        </div>

        {hasOverflow && (
          <div className="mt-6 flex justify-center gap-2">
            {pageStops.map((stop, i) => (
            <button
              key={`${stop}-${i}`}
              type="button"
              onClick={() => setIndex(stop)}
              aria-label={`Go to slide ${i + 1}`}
              className={[
                "h-2 w-2 rounded-full transition-colors",
                stop === index ? "bg-white" : "bg-white/30 hover:bg-white/60",
              ].join(" ")}
            />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
