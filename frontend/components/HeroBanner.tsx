import React from "react";
// Baked in at build time from CMS Site Settings → Homepage (build/homepagePlugin.ts),
// which also preloads these exact image URLs on the homepage only.
import homepage from "virtual:homepage";

const HeroBanner: React.FC = () => {
  const hero = homepage.hero;
  if (!hero) return null;
  const { image, imageMobile } = hero;

  return (
    <section className="relative flex min-h-[440px] items-end overflow-hidden bg-surface-dark md:min-h-[520px]">
      <picture>
        {imageMobile && (
          <source
            media="(max-width: 767px)"
            srcSet={imageMobile.srcSet ?? imageMobile.src}
            sizes={imageMobile.sizes}
            width={imageMobile.width}
            height={imageMobile.height}
          />
        )}
        <img
          src={image.src}
          srcSet={image.srcSet}
          sizes={image.sizes}
          alt={image.alt}
          width={image.width}
          height={image.height}
          className="absolute inset-0 h-full w-full object-cover"
          loading="eager"
          fetchPriority="high"
          decoding="async"
        />
      </picture>
      <div className="absolute inset-0 bg-gradient-to-r from-belims-blue/90 via-belims-blue/50 to-transparent" />

      <div className="container relative z-10 mx-auto px-4 py-10 md:py-14">
        <div className="max-w-[560px] text-white">
          <h1 className="font-heading text-display-sm font-bold uppercase font-condensed md:text-display-lg">
            {hero.title}
          </h1>
          {hero.description && (
            <p className="mt-4 text-lg text-white/90">{hero.description}</p>
          )}
          <a
            href={hero.button.link}
            className="mt-6 inline-flex h-12 items-center justify-center rounded-md bg-primary px-6 font-heading text-button uppercase font-condensed tracking-wide text-primary-on transition-colors hover:bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          >
            {hero.button.text}
          </a>
        </div>
      </div>
    </section>
  );
};

export default HeroBanner;
