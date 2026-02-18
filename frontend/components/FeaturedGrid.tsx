import React from "react";
import { Link } from "react-router-dom";
import { Tag, Eye, Flame, Briefcase, Globe } from "lucide-react";

const featuredCategories = [
  {
    id: "on-sale",
    title: "On Sale",
    icon: Tag,
    href: "/shop/on-sale",
  },
  {
    id: "most-viewed",
    title: "Most Viewed",
    icon: Eye,
    href: "/shop/most-viewed",
  },
  {
    id: "trending-now",
    title: "Trending Now",
    icon: Flame,
    href: "/shop/trending-now",
  },
  {
    id: "trade-exclusive",
    title: "Trade Exclusive",
    icon: Briefcase,
    href: "/shop/trade-exclusive",
  },
  {
    id: "online-only",
    title: "Online Only",
    icon: Globe,
    href: "/shop/online-only",
  },
];

export const FeaturedGrid: React.FC = () => {
  return (
    <section className="w-full pb-14">
      <div className="container mx-auto px-4">
        <div
          className="flex items-stretch no-scrollbar py-10 px-8 gap-12 bg-[#f4f691] rounded-xl"
          aria-roledescription="carousel"
        >
          {featuredCategories.map((category) => (
            <div key={category.id} className="w-1/5">
              <Link
                className="group relative flex h-full w-full items-center overflow-hidden rounded-full border border-white bg-white px-3 py-2 text-base font-bold text-grey transition-colors hover:border-grey hover:text-white"
                to={category.href}
              >
                <span className="absolute inset-0 origin-left scale-x-0 bg-grey transition-transform duration-300 ease-out group-hover:scale-x-100" />
                <span className="relative z-10 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-grey-light transition-colors group-hover:bg-white">
                    <category.icon
                      size={24}
                      className="text-grey transition-colors group-hover:text-grey"
                      aria-hidden="true"
                    />
                  </span>
                  <span className="transition-colors group-hover:text-white">
                    {category.title}
                  </span>
                </span>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
