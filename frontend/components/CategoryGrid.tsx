import React, { useRef } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";

const categories = [
  { title: "Sale", slug: "sale" },
  { title: "Adhesives" },
  { title: "General Purpose Adhesive" },
  { title: "Nail-in Anchors" },
  { title: "Tape & Seal" },
  { title: "General Purpose Tapes" },
  { title: "Chainsaws" },
  { title: "Gloves" },
  { title: "Drill Accessories" },
  { title: "Electrical Hand Tools" },
  { title: "Power Tools" },
  { title: "Pressure Washers" },
];

export const CategoryGrid: React.FC = () => {
  const sliderRef = useRef<HTMLDivElement | null>(null);

  const scroll = (direction: 1 | -1) => {
    const el = sliderRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * 320, behavior: "smooth" });
  };

  return (
    <section className="w-full py-3 bg-surface border-b border-border" aria-label="Shop by categories">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-3">

          <h2 className="shrink-0 text-sm font-heading font-bold text-text whitespace-nowrap">
            Shop by Category
          </h2>

          <button
            type="button"
            onClick={() => scroll(-1)}
            aria-label="Scroll categories left"
            className="shrink-0 flex items-center justify-center w-6 h-6 rounded-full border border-border text-text-secondary hover:border-primary hover:text-primary transition-colors"
          >
            <ChevronLeft size={13} strokeWidth={2.5} />
          </button>

          <div
            ref={sliderRef}
            className="flex gap-2 overflow-x-auto no-scrollbar"
          >
            {categories.map((cat) => (
              <Link
                key={cat.title}
                to={`/shop/${encodeURIComponent(cat.slug ?? cat.title)}`}
                className="shrink-0 px-4 py-1.5 rounded-full border border-border bg-white text-sm font-medium text-text-secondary whitespace-nowrap transition-colors hover:border-primary hover:text-primary"
              >
                {cat.title}
              </Link>
            ))}
          </div>

          <button
            type="button"
            onClick={() => scroll(1)}
            aria-label="Scroll categories right"
            className="shrink-0 flex items-center justify-center w-6 h-6 rounded-full border border-border text-text-secondary hover:border-primary hover:text-primary transition-colors"
          >
            <ChevronRight size={13} strokeWidth={2.5} />
          </button>

        </div>
      </div>
    </section>
  );
};
