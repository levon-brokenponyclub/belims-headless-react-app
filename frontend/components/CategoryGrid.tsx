import React from "react";
import {
  Anchor,
  Droplet,
  Hand,
  PaintBucket,
  Plug,
  Scissors,
  Settings,
  Zap,
  type LucideIcon,
} from "lucide-react";

const categoryMedia: Record<string, { image?: string; icon?: LucideIcon }> = {
  Sale: {
    image: "/images/development/collection-sales.webp",
  },
  Adhesives: {
    icon: Droplet,
  },
  "General Purpose Adhesive": {
    icon: PaintBucket,
  },
  "Nail-in Anchors": {
    icon: Anchor,
  },
  "Tape and Seal Strips": {
    icon: Scissors,
  },
  "General Purpose Tapes": {
    icon: Scissors,
  },
  Chainsaws: {
    icon: Zap,
  },
  Gloves: {
    icon: Hand,
  },
  "Drill Accessories": {
    icon: Settings,
  },
  "Electrical Hand Tools": {
    icon: Plug,
  },
  "Power Tools": {
    icon: Zap,
  },
  "Pressure Washer": {
    icon: Droplet,
  },
};

const categories = [
  {
    title: "Sale",
  },
  {
    title: "Adhesives",
  },
  {
    title: "General Purpose Adhesive",
  },
  {
    title: "Nail-in Anchors",
  },
  {
    title: "Tape and Seal Strips",
  },
  {
    title: "General Purpose Tapes",
  },
  {
    title: "Chainsaws",
  },
  {
    title: "Gloves",
  },
  {
    title: "Drill Accessories",
  },
  {
    title: "Electrical Hand Tools",
  },
  {
    title: "Power Tools",
  },
  {
    title: "Pressure Washer",
  },
];

export const CategoryGrid: React.FC = () => {
  return (
    <section className="w-full py-14 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="flex items-start justify-between gap-6 mb-6">
          <h2 className="font-heading text-2xl md:text-3xl text-grey">
            Shop By Categories
          </h2>
          <a
            href="/shop"
            className="text-base font-semibold text-grey hover:text-belims-accent inline-flex items-center gap-2"
          >
            Shop All Products <span aria-hidden>›</span>
          </a>
        </div>

        <div className="rounded-lg border border-black/10 border-b-0 overflow-hidden bg-white">
          <div className="grid grid-cols-3 lg:grid-cols-6 gap-0">
            {categories.map((category) =>
              (() => {
                const Icon = categoryMedia[category.title]?.icon;
                const image = categoryMedia[category.title]?.image;

                return (
                  <article
                    key={category.title}
                    className="border border-black/10 -ml-px -mt-px bg-white"
                  >
                    <a
                      href="#"
                      className="flex h-full flex-col items-center justify-center px-4 py-8 text-center"
                    >
                      <span className="flex h-[110px] w-[110px] items-center justify-center rounded-full bg-grey-light overflow-hidden">
                        {category.title === "Sale" && image ? (
                          <img
                            className="h-full w-full object-cover"
                            alt={category.title}
                            src={image}
                            loading="lazy"
                            decoding="async"
                          />
                        ) : Icon ? (
                          <Icon
                            size={46}
                            strokeWidth={1}
                            className="text-grey"
                          />
                        ) : null}
                      </span>
                      <span className="mt-4 text-base font-semibold text-gray-900">
                        {category.title}
                      </span>
                    </a>
                  </article>
                );
              })(),
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
