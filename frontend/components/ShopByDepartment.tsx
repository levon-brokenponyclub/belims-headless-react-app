import React from "react";
import { Link } from "react-router-dom";
import { Package } from "lucide-react";
import { HomeCategory } from "../hooks/useHomeCategories";
import { SectionHeading, ViewAllLink } from "./SectionHeading";
import { Skeleton } from "./Skeleton";

interface ShopByDepartmentProps {
  departments: HomeCategory[];
  isLoading: boolean;
}

export const ShopByDepartment: React.FC<ShopByDepartmentProps> = ({
  departments,
  isLoading,
}) => {
  if (!isLoading && departments.length === 0) return null;

  return (
    <section className="bg-belims-blue py-10 md:py-14" aria-labelledby="home-departments-title">
      <div className="container mx-auto px-4">
        <SectionHeading id="home-departments-title" eyebrow="Browse" title="Shop by department" tone="inverse">
          <ViewAllLink to="/shop" inverse>All products</ViewAllLink>
        </SectionHeading>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 xl:grid-cols-8">
          {isLoading
            ? Array.from({ length: 8 }).map((_, index) => (
                <li key={`dept-skel-${index}`} className="space-y-2">
                  <Skeleton height="auto" borderRadius="var(--radius-md)" className="aspect-square" />
                  <Skeleton height="0.9rem" width="70%" />
                </li>
              ))
            : departments.map((dept) => (
                <li key={dept.slug}>
                  <Link
                    to={`/shop/${encodeURIComponent(dept.slug)}`}
                    className="group block focus:outline-none"
                  >
                    <span className="flex aspect-square items-center justify-center overflow-hidden rounded-md border-2 border-transparent bg-surface p-4 transition-colors group-hover:border-primary group-focus-visible:ring-2 group-focus-visible:ring-white">
                      {dept.image ? (
                        <img
                          src={dept.image}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <Package size={32} strokeWidth={1.5} className="text-text-tertiary" aria-hidden="true" />
                      )}
                    </span>
                    <span className="mt-2 block text-base font-bold leading-snug text-white group-hover:underline group-hover:decoration-primary group-hover:decoration-2 group-hover:underline-offset-4">
                      {dept.name}
                    </span>
                  </Link>
                </li>
              ))}
        </ul>
      </div>
    </section>
  );
};
