import React from "react";

const categories = [
  {
    title: "Sale Items",
    image: "/images/development/collection-sales.webp",
  },
  {
    title: "Press Tables",
    image: "/images/development/Image_55.webp",
  },
  {
    title: "Lighting",
    image: "/images/development/Image_60.webp",
  },
  {
    title: "Spoke Sofa",
    image: "/images/development/Image_44.webp",
  },
  {
    title: "Storage",
    image: "/images/development/Image_55.webp",
  },
  {
    title: "Turn Chairs",
    image: "/images/development/Image_60.webp",
  },
  {
    title: "Lounge Chairs",
    image: "/images/development/Image_44.webp",
  },
  {
    title: "Curve Coat",
    image: "/images/development/Image_55.webp",
  },
  {
    title: "Cross Tables",
    image: "/images/development/Image_60.webp",
  },
  {
    title: "Bend Chairs",
    image: "/images/development/Image_44.webp",
  },
  {
    title: "Bar Chairs",
    image: "/images/development/Image_55.webp",
  },
  {
    title: "Accessories",
    image: "/images/development/Image_60.webp",
  },
];

export const CategoryGrid: React.FC = () => {
  return (
    <section className="w-full py-12 bg-white border-b border-black/5">
      <div className="container mx-auto px-4">
        <div className="flex items-start justify-between gap-6 mb-6">
          <h2 className="font-heading text-2xl md:text-3xl text-gray-900">
            Shop By Categories
          </h2>
          <a
            href="/shop"
            className="text-sm font-semibold text-gray-900 hover:text-belims-accent inline-flex items-center gap-2"
          >
            Shop All Products <span aria-hidden>›</span>
          </a>
        </div>

        <div className="rounded-2xl border border-black/10 overflow-hidden bg-white">
          <div className="grid grid-cols-3 lg:grid-cols-6 gap-0">
            {categories.map((category) => (
              <article
                key={category.title}
                className="border border-black/10 -ml-px -mt-px bg-white"
              >
                <a
                  href="#"
                  className="flex h-full flex-col items-center justify-center px-4 py-8 text-center"
                >
                  <span className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-100 overflow-hidden">
                    <img
                      className="h-full w-full object-cover"
                      alt={category.title}
                      src={category.image}
                      loading="lazy"
                      decoding="async"
                    />
                  </span>
                  <span className="mt-4 text-base font-semibold text-gray-900">
                    {category.title}
                  </span>
                </a>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
