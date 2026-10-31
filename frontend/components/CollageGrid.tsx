import React from "react";
import { Link } from "react-router-dom";
import { SectionHeading } from "./SectionHeading";

const tiles = [
  {
    title: "Power tools",
    slug: "power-tools",
    image: "/images/development/athens-mosaic-03.webp",
    imageWidth: 1420,
    sizes: "(min-width: 768px) 60vw, 100vw",
    className: "",
  },
  {
    title: "Garden & patio",
    slug: "outdoor-garden-and-patio",
    image: "/images/development/athens-mosaic-02d.webp",
    imageWidth: 1420,
    sizes: "(min-width: 768px) 60vw, 100vw",
    className: "",
  },
  {
    title: "Drills",
    slug: "drills",
    image: "/images/development/rotary_01.webp",
    imageWidth: 1280,
    sizes: "(min-width: 768px) 40vw, 100vw",
    className: "md:col-start-2 md:row-span-2 md:row-start-1",
  },
];

// Pre-generated -640/-1080 WebP variants sit beside each original.
const srcSetFor = (src: string, width: number) =>
  `${src.replace(".webp", "-640.webp")} 640w, ${src.replace(".webp", "-1080.webp")} 1080w, ${src} ${width}w`;

const CollageGrid: React.FC = () => (
  <section className="bg-surface py-10 md:py-14" aria-labelledby="home-collage-title">
    <div className="container mx-auto px-4">
      <SectionHeading id="home-collage-title" eyebrow="Find your fit" title="Tools for every trade" />
      <div className="grid auto-rows-[200px] gap-4 md:grid-cols-[3fr_2fr] md:auto-rows-[240px]">
        {tiles.map((tile) => (
          <Link
            key={tile.slug}
            to={`/shop/${tile.slug}`}
            className={`group relative flex items-end overflow-hidden rounded-md bg-surface-dark text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${tile.className}`}
          >
            <img
              src={tile.image}
              srcSet={srcSetFor(tile.image, tile.imageWidth)}
              sizes={tile.sizes}
              alt=""
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03] motion-reduce:transition-none"
            />
            <div className="relative w-full bg-gradient-to-t from-black/75 to-transparent p-5">
              <h3 className="font-heading text-h4 font-bold uppercase font-condensed md:text-h3">
                {tile.title}
              </h3>
              <span className="mt-2 inline-block border-b-2 border-white text-base font-bold">
                Shop now
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  </section>
);

export default CollageGrid;
