import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { WooCommerceCategory } from "../types";
import { fetchCategories } from "../services/wooCommerceService";

const fallbackCategories: WooCommerceCategory[] = [
  {
    id: "boards-sheeting",
    name: "Boards & Sheeting",
    slug: "boards-sheeting",
    parent: null,
    count: 0,
  },
  {
    id: "ceiling-accessories",
    name: "Ceiling Accessories",
    slug: "ceiling-accessories",
    parent: null,
    count: 0,
  },
  {
    id: "tiles-adhesives",
    name: "Tiles & Adhesives",
    slug: "tiles-adhesives",
    parent: null,
    count: 0,
  },
  {
    id: "window-film",
    name: "Window Film",
    slug: "window-film",
    parent: null,
    count: 0,
  },
  {
    id: "fasteners",
    name: "Fasteners",
    slug: "fasteners",
    parent: null,
    count: 0,
  },
  {
    id: "power-tool-accessories",
    name: "Power Tool Accessories",
    slug: "power-tool-accessories",
    parent: null,
    count: 0,
  },
  {
    id: "sealants",
    name: "Sealants",
    slug: "sealants",
    parent: null,
    count: 0,
  },
  {
    id: "safety-wear",
    name: "Safety Wear",
    slug: "safety-wear",
    parent: null,
    count: 0,
  },
  {
    id: "electrical-components",
    name: "Electrical Components",
    slug: "electrical-components",
    parent: null,
    count: 0,
  },
  {
    id: "plumbing-fittings",
    name: "Plumbing Fittings",
    slug: "plumbing-fittings",
    parent: null,
    count: 0,
  },
];

const getParentValue = (value: WooCommerceCategory["parent"]) =>
  value === null ? "0" : String(value);

const categoryMedia: Record<
  string,
  { icon: string; lifestyle: string; slider: string }
> = {
  "Fasteners and Adhesives": {
    icon: "https://cdn.jsdelivr.net/npm/lucide-static@0.436.0/icons/nut.svg",
    lifestyle: "https://images.unsplash.com/photo-1586864387967-d02ef85d93e8",
    slider: "https://pngimg.com/uploads/screw/screw_PNG40.png",
  },
  Adhesives: {
    icon: "https://cdn.jsdelivr.net/npm/lucide-static@0.436.0/icons/droplet.svg",
    lifestyle: "https://images.unsplash.com/photo-1581092918484-8313f08e01c7",
    slider: "https://pngimg.com/uploads/glue/glue_PNG23.png",
  },
  "General Purpose Adhesive": {
    icon: "https://cdn.jsdelivr.net/npm/lucide-static@0.436.0/icons/paint-bucket.svg",
    lifestyle: "https://images.unsplash.com/photo-1607400201515-c2c41cbe4c3b",
    slider: "https://pngimg.com/uploads/glue/glue_PNG34.png",
  },
  Nails: {
    icon: "https://cdn.jsdelivr.net/npm/lucide-static@0.436.0/icons/hammer.svg",
    lifestyle: "https://images.unsplash.com/photo-1567789884554-0b844b597180",
    slider: "https://pngimg.com/uploads/nail/nail_PNG40.png",
  },
  "Nail-in Anchors": {
    icon: "https://cdn.jsdelivr.net/npm/lucide-static@0.436.0/icons/anchor.svg",
    lifestyle: "https://images.unsplash.com/photo-1603791440384-56cd371ee9a7",
    slider: "https://pngimg.com/uploads/screw/screw_PNG30.png",
  },
  "Tape and Seal Strips": {
    icon: "https://cdn.jsdelivr.net/npm/lucide-static@0.436.0/icons/scissors.svg",
    lifestyle: "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc",
    slider: "https://pngimg.com/uploads/tape/tape_PNG27.png",
  },
  "General Purpose Tapes": {
    icon: "https://cdn.jsdelivr.net/npm/lucide-static@0.436.0/icons/scissors.svg",
    lifestyle: "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc",
    slider: "https://pngimg.com/uploads/tape/tape_PNG20.png",
  },
  "Outdoor Garden and Patio": {
    icon: "https://cdn.jsdelivr.net/npm/lucide-static@0.436.0/icons/leaf.svg",
    lifestyle: "https://images.unsplash.com/photo-1591857177580-dc82b9ac4e1e",
    slider: "https://pngimg.com/uploads/chainsaw/chainsaw_PNG14.png",
  },
  "Gardening Tools": {
    icon: "https://cdn.jsdelivr.net/npm/lucide-static@0.436.0/icons/shovel.svg",
    lifestyle: "https://images.unsplash.com/photo-1523348837708-15d4a09cfac2",
    slider: "https://pngimg.com/uploads/shovel/shovel_PNG29.png",
  },
  Chainsaws: {
    icon: "https://cdn.jsdelivr.net/npm/lucide-static@0.436.0/icons/zap.svg",
    lifestyle: "https://images.unsplash.com/photo-1581578731548-c64695cc6952",
    slider: "https://pngimg.com/uploads/chainsaw/chainsaw_PNG9.png",
  },
  "Garden Cordless Power Tools": {
    icon: "https://cdn.jsdelivr.net/npm/lucide-static@0.436.0/icons/battery.svg",
    lifestyle: "https://images.unsplash.com/photo-1621600411688-4be93c5f5b21",
    slider: "https://pngimg.com/uploads/drill/drill_PNG143.png",
  },
  "Garden Spray Bottles": {
    icon: "https://cdn.jsdelivr.net/npm/lucide-static@0.436.0/icons/spray-can.svg",
    lifestyle: "https://images.unsplash.com/photo-1589927986089-35812388d1f4",
    slider: "https://pngimg.com/uploads/spray/spray_PNG10.png",
  },
  "Safety and Protective Wear": {
    icon: "https://cdn.jsdelivr.net/npm/lucide-static@0.436.0/icons/hard-hat.svg",
    lifestyle: "https://images.unsplash.com/photo-1581092160607-ee22621dd758",
    slider: "https://pngimg.com/uploads/gloves/gloves_PNG8024.png",
  },
  "Safety Equipment": {
    icon: "https://cdn.jsdelivr.net/npm/lucide-static@0.436.0/icons/shield.svg",
    lifestyle: "https://images.unsplash.com/photo-1581092335397-9583eb92d232",
    slider: "https://pngimg.com/uploads/helmet/helmet_PNG37.png",
  },
  Gloves: {
    icon: "https://cdn.jsdelivr.net/npm/lucide-static@0.436.0/icons/hand.svg",
    lifestyle: "https://images.unsplash.com/photo-1607013407627-6ee814329547",
    slider: "https://pngimg.com/uploads/gloves/gloves_PNG8030.png",
  },
  "Tools and Machinery": {
    icon: "https://cdn.jsdelivr.net/npm/lucide-static@0.436.0/icons/drill.svg",
    lifestyle: "https://images.unsplash.com/photo-1581147036324-c1c7b6d6c7c8",
    slider: "https://pngimg.com/uploads/drill/drill_PNG143.png",
  },
  "Drill Accessories": {
    icon: "https://cdn.jsdelivr.net/npm/lucide-static@0.436.0/icons/settings.svg",
    lifestyle: "https://images.unsplash.com/photo-1586864387967-d02ef85d93e8",
    slider: "https://pngimg.com/uploads/drill/drill_PNG132.png",
  },
  "Chucks and Keys": {
    icon: "https://cdn.jsdelivr.net/npm/lucide-static@0.436.0/icons/settings-2.svg",
    lifestyle: "https://images.unsplash.com/photo-1581147036324-c1c7b6d6c7c8",
    slider: "https://pngimg.com/uploads/drill/drill_PNG109.png",
  },
  "Electrical Hand Tools": {
    icon: "https://cdn.jsdelivr.net/npm/lucide-static@0.436.0/icons/plug.svg",
    lifestyle: "https://images.unsplash.com/photo-1581147036324-c1c7b6d6c7c8",
    slider: "https://pngimg.com/uploads/tools/tools_PNG62.png",
  },
  "Staple Guns and Staples": {
    icon: "https://cdn.jsdelivr.net/npm/lucide-static@0.436.0/icons/paperclip.svg",
    lifestyle: "https://images.unsplash.com/photo-1590080875852-ba44f83ff2c1",
    slider: "https://pngimg.com/uploads/tools/tools_PNG73.png",
  },
  "Grinding Accessories": {
    icon: "https://cdn.jsdelivr.net/npm/lucide-static@0.436.0/icons/disc.svg",
    lifestyle: "https://images.unsplash.com/photo-1604147706283-8d7b3dfd3c4e",
    slider: "https://pngimg.com/uploads/grinder/grinder_PNG21.png",
  },
  "Abrasive Grinding Disc": {
    icon: "https://cdn.jsdelivr.net/npm/lucide-static@0.436.0/icons/disc.svg",
    lifestyle: "https://images.unsplash.com/photo-1604147706283-8d7b3dfd3c4e",
    slider: "https://pngimg.com/uploads/disc/disc_PNG5.png",
  },
  "Hand Tools": {
    icon: "https://cdn.jsdelivr.net/npm/lucide-static@0.436.0/icons/hammer.svg",
    lifestyle: "https://images.unsplash.com/photo-1581147036324-c1c7b6d6c7c8",
    slider: "https://pngimg.com/uploads/tools/tools_PNG21.png",
  },
  Pliers: {
    icon: "https://cdn.jsdelivr.net/npm/lucide-static@0.436.0/icons/scissors.svg",
    lifestyle: "https://images.unsplash.com/photo-1586864387967-d02ef85d93e8",
    slider: "https://pngimg.com/uploads/pliers/pliers_PNG32.png",
  },
  "Screwdrivers and Allen Keys": {
    icon: "https://cdn.jsdelivr.net/npm/lucide-static@0.436.0/icons/tool.svg",
    lifestyle: "https://images.unsplash.com/photo-1586864387967-d02ef85d93e8",
    slider: "https://pngimg.com/uploads/screwdriver/screwdriver_PNG46.png",
  },
  Wrenches: {
    icon: "https://cdn.jsdelivr.net/npm/lucide-static@0.436.0/icons/wrench.svg",
    lifestyle: "https://images.unsplash.com/photo-1586864387967-d02ef85d93e8",
    slider: "https://pngimg.com/uploads/wrench/wrench_PNG33.png",
  },
  Machinery: {
    icon: "https://cdn.jsdelivr.net/npm/lucide-static@0.436.0/icons/factory.svg",
    lifestyle: "https://images.unsplash.com/photo-1513828583688-c52646db42da",
    slider:
      "https://pngimg.com/uploads/pressure_washer/pressure_washer_PNG9.png",
  },
  "Pressure Washer": {
    icon: "https://cdn.jsdelivr.net/npm/lucide-static@0.436.0/icons/droplet.svg",
    lifestyle: "https://images.unsplash.com/photo-1513828583688-c52646db42da",
    slider:
      "https://pngimg.com/uploads/pressure_washer/pressure_washer_PNG11.png",
  },
  "Power Tools": {
    icon: "https://cdn.jsdelivr.net/npm/lucide-static@0.436.0/icons/zap.svg",
    lifestyle: "https://images.unsplash.com/photo-1581147036324-c1c7b6d6c7c8",
    slider: "https://pngimg.com/uploads/drill/drill_PNG143.png",
  },
  Drills: {
    icon: "https://cdn.jsdelivr.net/npm/lucide-static@0.436.0/icons/drill.svg",
    lifestyle: "https://images.unsplash.com/photo-1581147036324-c1c7b6d6c7c8",
    slider: "https://pngimg.com/uploads/drill/drill_PNG135.png",
  },
  Grinders: {
    icon: "https://cdn.jsdelivr.net/npm/lucide-static@0.436.0/icons/disc.svg",
    lifestyle: "https://images.unsplash.com/photo-1604147706283-8d7b3dfd3c4e",
    slider: "https://pngimg.com/uploads/grinder/grinder_PNG16.png",
  },
  Saws: {
    icon: "https://cdn.jsdelivr.net/npm/lucide-static@0.436.0/icons/activity.svg",
    lifestyle: "https://images.unsplash.com/photo-1603791440384-56cd371ee9a7",
    slider: "https://pngimg.com/uploads/saw/saw_PNG24.png",
  },
  "Water Tanks and Filtration": {
    icon: "https://cdn.jsdelivr.net/npm/lucide-static@0.436.0/icons/droplet.svg",
    lifestyle: "https://images.unsplash.com/photo-1564419320408-38e24e0383ef",
    slider: "https://pngimg.com/uploads/water_tank/water_tank_PNG15.png",
  },
  "Water Storage": {
    icon: "https://cdn.jsdelivr.net/npm/lucide-static@0.436.0/icons/database.svg",
    lifestyle: "https://images.unsplash.com/photo-1564419320408-38e24e0383ef",
    slider: "https://pngimg.com/uploads/water_tank/water_tank_PNG18.png",
  },
  "Water Tank Pumps": {
    icon: "https://cdn.jsdelivr.net/npm/lucide-static@0.436.0/icons/droplet.svg",
    lifestyle: "https://images.unsplash.com/photo-1581093458791-9d42f6c90c77",
    slider: "https://pngimg.com/uploads/pump/pump_PNG40.png",
  },
};

export const PopularCategories: React.FC = () => {
  const [categories, setCategories] = useState<WooCommerceCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const sliderRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const data = await fetchCategories();
        if (!isMounted) return;
        setCategories(data);
      } catch (error) {
        if (!isMounted) return;
        setCategories([]);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  const categoryPool = useMemo(() => {
    const source = categories.length ? categories : fallbackCategories;
    const usable = categories.length
      ? source.filter((cat) => cat.count > 0)
      : source;

    const topLevel = usable.filter((cat) => getParentValue(cat.parent) === "0");
    const pool = topLevel.length ? topLevel : usable;

    return [...pool].sort((a, b) => (b.count || 0) - (a.count || 0));
  }, [categories]);

  const featuredCategories = useMemo(() => {
    if (categoryPool.length >= 2) return categoryPool.slice(0, 2);
    if (categoryPool.length === 1)
      return [...categoryPool, ...fallbackCategories.slice(0, 1)];
    return fallbackCategories.slice(0, 2);
  }, [categoryPool]);

  const sliderCategories = useMemo(() => {
    const featuredSlugs = new Set(featuredCategories.map((cat) => cat.slug));
    const rest = categoryPool.filter((cat) => !featuredSlugs.has(cat.slug));
    const list = rest.length >= 10 ? rest : [...rest, ...categoryPool];
    const unique = new Map<string, WooCommerceCategory>();
    list.forEach((cat) => {
      if (!unique.has(cat.slug)) unique.set(cat.slug, cat);
    });
    return Array.from(unique.values()).slice(0, 10);
  }, [categoryPool, featuredCategories]);

  const scrollByAmount = () =>
    sliderRef.current?.clientWidth ? sliderRef.current.clientWidth * 0.65 : 320;

  const handlePrev = () => {
    if (!sliderRef.current) return;
    sliderRef.current.scrollBy({ left: -scrollByAmount(), behavior: "smooth" });
  };

  const handleNext = () => {
    if (!sliderRef.current) return;
    sliderRef.current.scrollBy({ left: scrollByAmount(), behavior: "smooth" });
  };

  const featuredStyles = ["bg-[#F7E6E8]", "bg-[#E5F4EA]"];

  const featuredBadges = [
    { label: "Save", value: "40%", tone: "bg-[#F3F58E] text-gray-900" },
    { label: "Save", value: "30%", tone: "bg-[#C9341A] text-white" },
  ];

  const featuredCopy = [
    "Elevate your space with 40% off our timeless designs!",
    "Get 30% off elegant, timeless seating. Do not miss out!",
  ];

  const featuredImages = [
    "/images/bosch-impact-kit.jpg",
    "/images/Makita-Saws.jpg",
  ];

  return (
    <section className="mb-16" aria-label="Popular categories">
      <div className="container mx-auto px-4">
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {featuredCategories.map((category, index) => {
            const media = categoryMedia[category.name];
            const badge = featuredBadges[index % featuredBadges.length];
            const copy = featuredCopy[index % featuredCopy.length];

            return (
              <Link
                key={category.slug}
                to={`/shop/${encodeURIComponent(category.slug)}`}
                className={`group relative overflow-hidden rounded-3xl ${featuredStyles[index % featuredStyles.length]} px-6 py-8 md:px-10 md:py-10`}
              >
                <div className="relative z-10 flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
                  <div className="max-w-md">
                    <h3 className="text-3xl font-semibold text-gray-900">
                      {category.name}
                    </h3>
                    <p className="mt-3 text-base text-gray-600 leading-relaxed">
                      {copy}
                    </p>
                    <span className="mt-7 inline-flex">
                      <span className="group relative h-12 px-10 rounded-full bg-white text-gray-900 overflow-hidden transition-colors p-3">
                        <span className="absolute inset-0 bg-gray-900 transform scale-x-0 origin-left transition-transform duration-300 ease-out group-hover:scale-x-100" />
                        <span className="relative flex items-center gap-2 z-10 transition-colors group-hover:text-white">
                          <span className="font-heading font-semibold">
                            Shop Now
                          </span>
                        </span>
                      </span>
                    </span>
                  </div>

                  <div className="relative flex items-center justify-center sm:justify-end z-1">
                    <div className="relative h-40 w-40 sm:h-52 sm:w-52 p-6 bg-white rounded-lg">
                      <img
                        src={
                          featuredImages[index % featuredImages.length] ||
                          media?.slider ||
                          media?.lifestyle ||
                          "/placeholder.png"
                        }
                        alt={category.name}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-contain mix-blend-multiply"
                      />
                    </div>
                  </div>
                </div>

                <div
                  className={`absolute right-6 top-6 flex h-20 w-20 flex-col items-center justify-center rounded-full text-center z-10 ${badge.tone}`}
                >
                  <span className="text-sm font-semibold">{badge.label}</span>
                  <span className="text-2xl font-semibold leading-tight">
                    {badge.value}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        <QuickShopsCarousel
          items={isLoading ? fallbackCategories : sliderCategories}
          sliderRef={sliderRef}
          onPrev={handlePrev}
          onNext={handleNext}
        />
      </div>
    </section>
  );
};

interface QuickShopsCarouselProps {
  items: WooCommerceCategory[];
  sliderRef: React.RefObject<HTMLDivElement>;
  onPrev: () => void;
  onNext: () => void;
}

const QuickShopsCarousel: React.FC<QuickShopsCarouselProps> = ({
  items,
  sliderRef,
  onPrev,
  onNext,
}) => {
  const [pageCount, setPageCount] = useState(1);
  const [activePage, setActivePage] = useState(0);

  useEffect(() => {
    const el = sliderRef.current;
    if (!el) return;

    const recompute = () => {
      const cw = el.clientWidth || 1;
      setPageCount(Math.max(1, Math.ceil(el.scrollWidth / cw)));
      setActivePage(Math.round(el.scrollLeft / cw));
    };

    recompute();
    el.addEventListener("scroll", recompute, { passive: true });

    const ro = new ResizeObserver(recompute);
    ro.observe(el);

    return () => {
      el.removeEventListener("scroll", recompute);
      ro.disconnect();
    };
  }, [items.length, sliderRef]);

  const scrollToPage = (page: number) => {
    const el = sliderRef.current;
    if (!el) return;
    el.scrollTo({ left: page * el.clientWidth, behavior: "smooth" });
  };

  return (
    <div className="mt-10">
      <div className="flex items-end justify-between gap-4 mb-5">
        <h3 className="font-heading font-bold text-xl md:text-2xl uppercase tracking-widest text-text">
          Quick Shops
        </h3>
        <div className="hidden md:flex items-center gap-2">
          <button
            type="button"
            onClick={onPrev}
            aria-label="Scroll quick shops left"
            className="btn-icon-circle hover:border-primary hover:text-primary transition-colors"
          >
            <ChevronLeft size={18} strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={onNext}
            aria-label="Scroll quick shops right"
            className="btn-icon-circle hover:border-primary hover:text-primary transition-colors"
          >
            <ChevronRight size={18} strokeWidth={2} />
          </button>
        </div>
      </div>

      <div
        ref={sliderRef}
        className="flex gap-6 md:gap-8 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-2"
        aria-roledescription="carousel"
        aria-label="Quick shops"
      >
        {items.map((cat, index) => {
          const media = categoryMedia[cat.name];
          return (
            <Link
              key={`${cat.slug}-${index}`}
              to={`/shop/${encodeURIComponent(cat.slug)}`}
              className="group flex-shrink-0 snap-start flex flex-col items-center gap-3 w-24 md:w-28 lg:w-32 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 rounded-lg"
              aria-label={cat.name}
            >
              <div className="relative flex items-center justify-center w-24 h-24 md:w-28 md:h-28 lg:w-32 lg:h-32 rounded-circle bg-surface-muted overflow-hidden transition-all duration-300 group-hover:bg-white group-hover:ring-4 group-hover:ring-primary/25 group-hover:shadow-card">
                {media?.slider || media?.icon ? (
                  <img
                    src={media?.slider || media?.icon}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="max-w-[70%] max-h-[70%] object-contain transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <span className="text-lg font-heading font-bold text-text-secondary">
                    {cat.name.slice(0, 2)}
                  </span>
                )}
              </div>
              <span className="text-center text-sm font-heading font-bold text-text leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                {cat.name}
              </span>
            </Link>
          );
        })}
      </div>

      {pageCount > 1 && (
        <div
          className="flex items-center justify-center gap-2 mt-6"
          role="tablist"
          aria-label="Quick shops pages"
        >
          {Array.from({ length: pageCount }).map((_, i) => {
            const isActive = i === activePage;
            return (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={`Go to page ${i + 1}`}
                onClick={() => scrollToPage(i)}
                className={`h-2 rounded-pill transition-all duration-300 ${
                  isActive
                    ? "w-6 bg-primary"
                    : "w-2 bg-border hover:bg-text-tertiary"
                }`}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
