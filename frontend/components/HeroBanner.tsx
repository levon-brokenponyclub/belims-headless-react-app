import React from "react";
// Baked in at build time from CMS Site Settings → Homepage (build/homepagePlugin.ts),
// which also preloads these exact image URLs on the homepage only.
import homepage from "virtual:homepage";

const HeroBanner: React.FC = () => {
  const hero = homepage.hero;
  if (!hero) return null;
  const { image, imageMobile } = hero;

  return (
    <section className="bg-[#F2F3F7] py-4 md:py-4 lg:py-8">
      <div className="container mx-auto max-w-[1400px] px-3 lg:px-6">
        <a
          href={hero.button.link}
          aria-label={hero.title}
          className="
            group/card relative block w-full
            h-[240px] sm:h-[280px] md:h-[320px] lg:h-[360px]
            overflow-hidden rounded-2xl bg-secondary shadow-sm
            focus:outline-none focus-visible:ring-2 focus-visible:ring-belims-blue
          "
        >
          <div className="absolute inset-0">
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
                className="h-full w-full object-cover transition-transform duration-700 group-hover/card:scale-[1.03]"
                loading="eager"
                fetchPriority="high"
                decoding="async"
              />
            </picture>

            <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/30 to-transparent" />
            <div className="absolute inset-0 bg-black/10" />
          </div>

          <div className="relative z-10 flex h-full flex-col justify-end p-5 sm:p-6 md:p-7 lg:p-10">
            <h3 className="max-w-[640px] text-h4 font-bold tracking-tight text-white md:text-h3">
              {hero.title}
            </h3>

            {hero.description && (
              <p className="mt-3 max-w-[560px] text-sm leading-relaxed text-white/85 md:text-base">
                {hero.description}
              </p>
            )}

            <div className="mt-6">
              <span
                className="
                  group relative inline-flex h-12 items-center justify-center
                  overflow-hidden rounded-md bg-belims-blue px-12
                  text-white transition-colors
                "
              >
                <span className="absolute inset-0 origin-left scale-x-0 bg-black/25 transition-transform duration-300 ease-out group-hover:scale-x-100" />
                <span className="relative z-10 font-heading font-semibold text-base transition-colors group-hover:text-white">
                  {hero.button.text}
                </span>
              </span>
            </div>
          </div>
        </a>
      </div>
    </section>
  );
};

export default HeroBanner;
