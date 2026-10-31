import React from "react";
import { Link } from "react-router-dom";
import { Package } from "lucide-react";
import homepage from "virtual:homepage";
import { HomeCategory } from "../hooks/useHomeCategories";
import { SectionHeading } from "./SectionHeading";
import { Skeleton } from "./Skeleton";

const TILE_COUNT = 2;

interface PopularCategoriesProps {
  /** Every visible category: resolves the cards picked in Site Settings → Homepage. */
  categories: HomeCategory[];
  /** Shown when no cards are configured (the biggest second-level categories). */
  fallback: HomeCategory[];
  isLoading: boolean;
}

interface Tile {
  slug: string;
  title: string;
  description: string;
  buttonText: string;
  image?: string | null;
  count: number;
}

const formatCount = (count: number) => `${count.toLocaleString("en-ZA")} ${count === 1 ? "product" : "products"}`;

export const PopularCategories: React.FC<PopularCategoriesProps> = ({ categories, fallback, isLoading }) => {
  const config = homepage.topCategories;

  const tiles: Tile[] = (config?.cards.length
    ? config.cards.flatMap((card) => {
        const cat = categories.find((c) => c.slug === card.category);
        return cat
          ? [
              {
                slug: cat.slug,
                title: card.title || cat.name,
                description: card.description,
                buttonText: card.buttonText || "Shop now",
                image: card.image ?? cat.image,
                count: cat.count,
              },
            ]
          : [];
      })
    : fallback.slice(0, TILE_COUNT).map((cat) => ({
        slug: cat.slug,
        title: cat.name,
        description: "",
        buttonText: "Shop now",
        image: cat.image,
        count: cat.count,
      }))
  ).slice(0, TILE_COUNT);

  if (!isLoading && tiles.length === 0) return null;

  return (
    <section className="bg-surface-muted py-10 md:py-14" aria-labelledby="home-popular-title">
      <div className="container mx-auto px-4">
        <SectionHeading
          id="home-popular-title"
          eyebrow={config?.eyebrow || "Biggest ranges"}
          title={config?.title || "Top categories"}
        />
        <div className="grid gap-4 lg:grid-cols-2">
          {isLoading
            ? Array.from({ length: TILE_COUNT }).map((_, index) => (
                <Skeleton key={`popular-skel-${index}`} height="244px" borderRadius="var(--radius-md)" />
              ))
            : tiles.map((tile) => (
                <Link
                  key={tile.slug}
                  to={`/shop/${encodeURIComponent(tile.slug)}`}
                  className="group grid items-center gap-6 rounded-md border-2 border-border bg-white p-6 transition-colors hover:border-text focus:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:grid-cols-[minmax(0,1fr)_180px] md:p-8"
                >
                  <div>
                    {tile.count > 0 && (
                      <p className="text-caption font-semibold uppercase tracking-wider text-text-tertiary">
                        {formatCount(tile.count)}
                      </p>
                    )}
                    <h3 className="mt-1 font-heading text-h3 font-bold uppercase font-condensed text-text">
                      {tile.title}
                    </h3>
                    {tile.description && (
                      <p className="mt-2 text-base text-text-secondary">{tile.description}</p>
                    )}
                    <span className="mt-5 inline-flex h-12 items-center rounded-md border border-border-strong px-6 font-heading text-button uppercase font-condensed tracking-wide text-text transition-colors group-hover:bg-surface-dark group-hover:text-white">
                      {tile.buttonText}
                    </span>
                  </div>
                  <span className="hidden aspect-square items-center justify-center rounded-sm bg-surface-muted p-4 sm:flex">
                    {tile.image ? (
                      <img
                        src={tile.image}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-contain mix-blend-multiply"
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
