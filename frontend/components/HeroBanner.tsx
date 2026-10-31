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
      {/* Brand scrim from the home mockup: solid blue on the copy side fading to clear. */}
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(50,39,131,.92)_0%,rgba(50,39,131,.55)_45%,rgba(0,0,0,0)_80%)]" />

      <div className="container relative z-10 mx-auto px-4 py-14">
        <div className="max-w-[560px] text-white">
          {hero.eyebrow && (
            <p className="text-eyebrow font-semibold uppercase tracking-[0.08em] text-white/80">{hero.eyebrow}</p>
          )}
          <h1 className="mb-4 mt-2 font-heading text-[44px] font-black uppercase leading-none tracking-[-0.02em] font-condensed md:text-[72px]">
            {hero.title}
          </h1>
          {hero.description && <p className="mb-6 text-lg text-white/90">{hero.description}</p>}
          <a
            href={hero.button.link}
            className="inline-flex h-12 items-center justify-center rounded-md bg-primary px-6 font-heading text-button font-bold uppercase font-condensed tracking-wide text-primary-on transition-colors hover:bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          >
            {hero.button.text}
          </a>
        </div>
      </div>
    </section>
  );
};

export default HeroBanner;
