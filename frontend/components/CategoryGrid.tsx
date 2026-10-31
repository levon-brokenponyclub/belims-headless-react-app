import React from "react";
import { Link } from "react-router-dom";
import { HomeCategory } from "../hooks/useHomeCategories";

const MAX_PILLS = 12;

export const CategoryGrid: React.FC<{ categories: HomeCategory[] }> = ({
  categories,
}) => {
  if (categories.length === 0) return null;

  return (
    <nav className="border-b border-border bg-surface" aria-label="Shop by category">
      <div className="container mx-auto flex items-center gap-2 overflow-x-auto px-4 py-3.5 no-scrollbar">
        <span className="mr-2 shrink-0 whitespace-nowrap text-base font-bold uppercase tracking-wider text-belims-blue">
          Shop by category
        </span>
        {categories.slice(0, MAX_PILLS).map((cat) => (
          <Link
            key={cat.slug}
            to={`/shop/${encodeURIComponent(cat.slug)}`}
            className="inline-flex h-11 shrink-0 items-center whitespace-nowrap rounded-pill border border-border px-4 text-base font-medium md:h-9 text-text-secondary transition-colors hover:border-primary hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {cat.name}
          </Link>
        ))}
      </div>
    </nav>
  );
};
