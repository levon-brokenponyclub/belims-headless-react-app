import React from "react";
import { Link } from "react-router-dom";
import { Package } from "lucide-react";
import { HomeCategory } from "../hooks/useHomeCategories";
import { SectionHeading } from "./SectionHeading";
import { Skeleton } from "./Skeleton";

const TILE_COUNT = 2;

interface PopularCategoriesProps {
  categories: HomeCategory[];
  isLoading: boolean;
}

export const PopularCategories: React.FC<PopularCategoriesProps> = ({
  categories,
  isLoading,
}) => {
  const tiles = categories.slice(0, TILE_COUNT);
  if (!isLoading && tiles.length === 0) return null;

  return (
    <section className="bg-surface py-10 md:py-14" aria-labelledby="home-popular-title">
      <div className="container mx-auto px-4">
        <SectionHeading id="home-popular-title" eyebrow="Biggest ranges" title="Top categories" />
        <div className="grid gap-4 lg:grid-cols-2">
          {isLoading
            ? Array.from({ length: TILE_COUNT }).map((_, index) => (
                <Skeleton key={`popular-skel-${index}`} height="244px" borderRadius="var(--radius-md)" />
              ))
            : tiles.map((cat) => (
                <Link
                  key={cat.slug}
                  to={`/shop/${encodeURIComponent(cat.slug)}`}
                  className="group grid items-center gap-6 rounded-md border-2 border-transparent bg-surface-muted p-6 transition-colors hover:border-border-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:grid-cols-[minmax(0,1fr)_180px] md:p-8"
                >
                  <div>
                    <h3 className="font-heading text-h3 font-bold uppercase font-condensed text-text">
                      {cat.name}
                    </h3>
                    <span className="mt-5 inline-flex h-12 items-center rounded-md border border-border-strong px-6 font-heading text-button uppercase font-condensed tracking-wide text-belims-blue transition-colors group-hover:bg-surface-dark group-hover:text-white">
                      Shop now
                    </span>
                  </div>
                  <span className="hidden aspect-square items-center justify-center rounded-sm bg-surface p-4 sm:flex">
                    {cat.image ? (
                      <img
                        src={cat.image}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <Package size={40} strokeWidth={1.5} className="text-text-tertiary" aria-hidden="true" />
                    )}
                  </span>
                </Link>
              ))}
        </div>
      </div>
    </section>
  );
};
