import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Anchor,
  ChevronLeft,
  ChevronRight,
  Droplet,
  Hand,
  PaintBucket,
  Plug,
  Scissors,
  Settings,
  Zap,
  type LucideIcon,
} from "lucide-react";

interface CategoryTile {
  title: string;
  icon?: LucideIcon;
  image?: string;
  accent?: "sale";
}

const categories: CategoryTile[] = [
  {
    title: "Sale",
    image: "/images/development/collection-sales.webp",
    accent: "sale",
  },
  { title: "Adhesives", icon: Droplet },
  { title: "General Purpose Adhesive", icon: PaintBucket },
  { title: "Nail-in Anchors", icon: Anchor },
  { title: "Tape and Seal Strips", icon: Scissors },
  { title: "General Purpose Tapes", icon: Scissors },
  { title: "Chainsaws", icon: Zap },
  { title: "Gloves", icon: Hand },
  { title: "Drill Accessories", icon: Settings },
  { title: "Electrical Hand Tools", icon: Plug },
  { title: "Power Tools", icon: Zap },
  { title: "Pressure Washer", icon: Droplet },
];

export const CategoryGrid: React.FC = () => {
  const sliderRef = useRef<HTMLDivElement | null>(null);
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
  }, []);

  const scrollByPage = (direction: 1 | -1) => {
    const el = sliderRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth, behavior: "smooth" });
  };

  const scrollToPage = (page: number) => {
    const el = sliderRef.current;
    if (!el) return;
    el.scrollTo({ left: page * el.clientWidth, behavior: "smooth" });
  };

  return (
    <section className="w-full py-14 bg-surface" aria-label="Shop by categories">
      <div className="container mx-auto px-4">
        <div className="flex items-end justify-between gap-4 mb-6">
          <h2 className="font-heading text-2xl md:text-3xl font-bold text-text">
            Shop By Categories
          </h2>
          <div className="flex items-center gap-3">
            <Link
              to="/shop"
              className="hidden sm:inline-flex text-sm font-heading font-bold text-text hover:text-primary items-center gap-2 transition-colors"
            >
              Shop All Products <span aria-hidden>›</span>
            </Link>
            <div className="hidden md:flex items-center gap-2">
              <button
                type="button"
                onClick={() => scrollByPage(-1)}
                aria-label="Scroll categories left"
                className="btn-icon-circle hover:border-primary hover:text-primary transition-colors"
              >
                <ChevronLeft size={18} strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={() => scrollByPage(1)}
                aria-label="Scroll categories right"
                className="btn-icon-circle hover:border-primary hover:text-primary transition-colors"
              >
                <ChevronRight size={18} strokeWidth={2} />
              </button>
            </div>
          </div>
        </div>

        <div
          ref={sliderRef}
          className="flex gap-6 md:gap-8 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-2"
          aria-roledescription="carousel"
          aria-label="Shop by categories"
        >
          {categories.map((category) => {
            const Icon = category.icon;
            const isSale = category.accent === "sale";
            return (
              <Link
                key={category.title}
                to={`/shop/${encodeURIComponent(category.title)}`}
                className="group flex-shrink-0 snap-start flex flex-col items-center gap-3 w-24 md:w-28 lg:w-32 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 rounded-lg"
                aria-label={category.title}
              >
                <div
                  className={`relative flex items-center justify-center w-24 h-24 md:w-28 md:h-28 lg:w-32 lg:h-32 rounded-circle overflow-hidden transition-all duration-300 group-hover:ring-4 group-hover:ring-primary/25 group-hover:shadow-card ${
                    isSale
                      ? "bg-primary text-white group-hover:bg-primary/90"
                      : "bg-surface-muted text-text-secondary group-hover:bg-white"
                  }`}
                >
                  {isSale && category.image ? (
                    <img
                      src={category.image}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="max-w-[70%] max-h-[70%] object-contain mix-blend-multiply"
                    />
                  ) : Icon ? (
                    <Icon
                      size={40}
                      strokeWidth={1.5}
                      className="transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <span className="text-lg font-heading font-bold">
                      {category.title.slice(0, 2)}
                    </span>
                  )}
                </div>
                <span className="text-center text-sm font-heading font-bold text-text leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                  {category.title}
                </span>
              </Link>
            );
          })}
        </div>

        {pageCount > 1 && (
          <div
            className="flex items-center justify-center gap-2 mt-6"
            role="tablist"
            aria-label="Categories pages"
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
    </section>
  );
};
