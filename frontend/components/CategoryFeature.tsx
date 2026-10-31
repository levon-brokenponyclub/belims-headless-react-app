import React from "react";
import { Link } from "react-router-dom";

export interface CategoryFeatureConfig {
  slug: string;
  title: string;
  description: string;
  image: string;
  imageWidth: number;
}

// Pre-generated -640/-1080 WebP variants sit beside each original.
const srcSetFor = (src: string, width: number) =>
  `${src.replace(".webp", "-640.webp")} 640w, ${src.replace(".webp", "-1080.webp")} 1080w, ${src} ${width}w`;

export const CategoryFeature: React.FC<{ feature: CategoryFeatureConfig }> = ({
  feature,
}) => (
  <Link
    to={`/shop/${encodeURIComponent(feature.slug)}`}
    className="group relative flex min-h-[220px] items-end overflow-hidden rounded-md bg-surface-dark text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 lg:min-h-[420px]"
  >
    <img
      src={feature.image}
      srcSet={srcSetFor(feature.image, feature.imageWidth)}
      sizes="(min-width: 1024px) 360px, 100vw"
      alt=""
      loading="lazy"
      decoding="async"
      className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03] motion-reduce:transition-none"
    />
    <div className="relative w-full bg-gradient-to-t from-black/80 to-transparent p-6">
      <p className="text-eyebrow font-semibold text-white/80">Category spotlight</p>
      <h3 className="mt-1 font-heading text-h3 font-bold uppercase font-condensed">
        {feature.title}
      </h3>
      <p className="mt-2 text-base text-white/90">{feature.description}</p>
      <span className="mt-4 inline-flex h-12 items-center rounded-md bg-surface px-6 font-heading text-button uppercase font-condensed tracking-wide text-text transition-colors group-hover:bg-primary group-hover:text-primary-on">
        Shop {feature.title.toLowerCase()}
      </span>
    </div>
  </Link>
);
