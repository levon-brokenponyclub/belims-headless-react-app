import React, { useEffect, useState } from "react";

const HERO = {
  href: "/shop",
  buttonText: "Shop Now",
  title: "Trade pricing that works as hard as you do",
  description:
    "Get access to exclusive trade-only rates, expert support, and logistical advantages designed to keep your projects on track and your business growing.",
  imageSrc:
    "https://athens-theme.myshopify.com/cdn/shop/files/athens-hero-02a.jpg?v=1747138637&width=2840",
  imageAlt: "Trade tools",
  videoHlsSrc:
    "https://athens-theme.myshopify.com/cdn/shop/videos/c/vp/2d30e4d882bb45b9bb7dee5e078cb9d0/2d30e4d882bb45b9bb7dee5e078cb9d0.m3u8?v=0",
  videoMp4Src:
    "https://athens-theme.myshopify.com/cdn/shop/videos/c/vp/2d30e4d882bb45b9bb7dee5e078cb9d0/2d30e4d882bb45b9bb7dee5e078cb9d0.HD-720p-1.6Mbps-60607784.mp4?v=0",
};

const HeroBanner: React.FC = () => {
  const [shouldPlayVideo, setShouldPlayVideo] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const startPlayback = () => setShouldPlayVideo(true);
    let idleHandle: number | null = null;
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: IdleRequestCallback) => number;
      cancelIdleCallback?: (handle: number) => void;
    };

    if (idleWindow.requestIdleCallback) {
      idleHandle = idleWindow.requestIdleCallback(startPlayback);
    } else {
      timeoutHandle = setTimeout(startPlayback, 1500);
    }

    return () => {
      if (idleHandle !== null && idleWindow.cancelIdleCallback) {
        idleWindow.cancelIdleCallback(idleHandle);
      }
      if (timeoutHandle !== null) clearTimeout(timeoutHandle);
    };
  }, []);

  return (
    <section className="bg-[#F2F3F7] py-4 md:py-4 lg:py-8">
      <div className="container mx-auto max-w-[1400px] px-3 lg:px-6">
        <a
          href={HERO.href}
          aria-label={HERO.title}
          className="
            group/card relative block w-full
            h-[240px] sm:h-[280px] md:h-[320px] lg:h-[360px]
            overflow-hidden rounded-2xl bg-gray-900 shadow-sm
            focus:outline-none focus-visible:ring-2 focus-visible:ring-belims-blue
          "
        >
          <div className="absolute inset-0">
            <img
              src={HERO.imageSrc}
              alt={HERO.imageAlt}
              className="h-full w-full object-cover transition-transform duration-700 group-hover/card:scale-[1.03]"
              loading="lazy"
            />

            <video
              className="absolute inset-0 h-full w-full object-cover"
              muted
              playsInline
              loop
              preload="none"
              autoPlay={shouldPlayVideo}
            >
              {shouldPlayVideo && (
                <source type="application/x-mpegURL" src={HERO.videoHlsSrc} />
              )}
              {shouldPlayVideo && (
                <source type="video/mp4" src={HERO.videoMp4Src} />
              )}
            </video>

            <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/30 to-transparent" />
            <div className="absolute inset-0 bg-black/10" />
          </div>

          <div className="relative z-10 flex h-full flex-col justify-end p-5 sm:p-6 md:p-7 lg:p-10">
            <h3 className="max-w-[640px] text-2xl font-semibold tracking-tight text-white md:text-[32px] lg:text-[40px] lg:leading-[1.15]">
              {HERO.title}
            </h3>

            <p className="mt-3 max-w-[560px] text-sm leading-relaxed text-white/85 md:text-base">
              {HERO.description}
            </p>

            <div className="mt-6">
              <span
                className="
                  group relative inline-flex h-12 items-center justify-center
                  overflow-hidden rounded-pill bg-belims-blue px-12
                  text-white transition-colors
                "
              >
                <span className="absolute inset-0 origin-left scale-x-0 bg-black/25 transition-transform duration-300 ease-out group-hover:scale-x-100" />
                <span className="relative z-10 font-heading font-semibold text-base transition-colors group-hover:text-white">
                  {HERO.buttonText}
                </span>
              </span>
            </div>
          </div>

          {!shouldPlayVideo && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShouldPlayVideo(true);
              }}
              className="
                absolute bottom-5 right-5 z-20
                rounded-full bg-black/45 px-4 py-2
                text-base font-bold text-white
                backdrop-blur-sm transition
                hover:bg-black/60
              "
              aria-label="Play background video"
            >
              Play
            </button>
          )}
        </a>
      </div>
    </section>
  );
};

export default HeroBanner;
