import React, { useEffect, useMemo, useState } from "react";

type Card = {
  key: string;
  href: string;
  title: string;
  description: string;
  buttonText?: string; // optional now (middle uses 2 buttons)
  imageSrc: string;
  imageAlt: string;
  videoMp4Src?: string;
  videoHlsSrc?: string;
  badge?: { line1: string; line2: string };
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

  const cards: Card[] = useMemo(
    () => [
      {
        key: "orbital-sanders",
        href: "/collections/orbital-sanders",
        title: "Orbital Sanders",
        description:
          "Find the perfect orbital sander for all your cards like bodywork polishing, decorating and finishing work.",
        buttonText: "Shop now",
        imageSrc:
          "https://athens-theme.myshopify.com/cdn/shop/files/athens-mosaic-05.jpg?v=1747139046&width=2840",
        imageAlt: "Orbital sander",
      },
      {
        key: "trade",
        href: "/trade",
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
      },
      {
        key: "planers",
        href: "/collections/planers",
        title: "Planers",
        description:
          "Get the job done with much less effort with an affordable and powerful planer from top brands like Makita, Metabo and Dewalt.",
        buttonText: "Shop now",
        imageSrc:
          "https://athens-theme.myshopify.com/cdn/shop/files/athens-mosaic-03.jpg?v=1747138889&width=2840",
        imageAlt: "Planer tool",
      },
    ],
    [],
  );

  return (
    <section className="bg-white py-6 md:py-8 lg:py-10">
      <div className="container mx-auto max-w-[1400px] px-3 lg:px-6">
        {/* Mobile: horizontal scroller. Desktop: 25/50/25 grid */}
        <div className="-mx-3 px-3 lg:mx-0 lg:px-0">
          <div className="overflow-x-auto lg:overflow-visible">
            <div
              className="
                flex gap-4 md:gap-6
                lg:grid lg:grid-cols-12 lg:gap-6
                snap-x snap-mandatory
                pb-2
              "
            >
              {cards.map((card, idx) => {
                const hasVideo = !!card.videoMp4Src || !!card.videoHlsSrc;
                const isMiddle = idx === 1;

                // 25% / 50% / 25% on lg+
                const colSpan = isMiddle ? "lg:col-span-6" : "lg:col-span-3";

                return (
                  <a
                    key={card.key}
                    href={card.href}
                    className={`
                      group relative
                      ${colSpan}
                      w-[88%] min-w-[88%] sm:w-[70%] sm:min-w-[70%] md:w-[52%] md:min-w-[52%]
                      lg:w-auto lg:min-w-0
                      h-[320px] sm:h-[360px] md:h-[420px] lg:h-[520px]
                      overflow-hidden rounded-md
                      bg-gray-900
                      shadow-sm
                      snap-start
                      focus:outline-none focus-visible:ring-2 focus-visible:ring-belims-accent
                    `}
                    aria-label={card.title}
                  >
                    {/* Media */}
                    <div className="absolute inset-0">
                      <img
                        src={card.imageSrc}
                        alt={card.imageAlt}
                        className="
                          h-full w-full object-cover
                          transition-transform duration-700
                          group-hover:scale-[1.03]
                        "
                        loading="lazy"
                      />

                      {hasVideo && isMiddle && (
                        <video
                          className="absolute inset-0 h-full w-full object-cover"
                          muted
                          playsInline
                          loop
                          preload="none"
                          autoPlay={shouldPlayVideo}
                        >
                          {shouldPlayVideo && card.videoHlsSrc && (
                            <source
                              type="application/x-mpegURL"
                              src={card.videoHlsSrc}
                            />
                          )}
                          {shouldPlayVideo && card.videoMp4Src && (
                            <source type="video/mp4" src={card.videoMp4Src} />
                          )}
                        </video>
                      )}

                      <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/30 to-transparent" />
                      <div className="absolute inset-0 bg-black/10" />
                    </div>

                    {/* Badge */}
                    {card.badge && (
                      <div className="absolute left-4 top-4 z-20 rounded-lg bg-[#0568ff] px-4 py-3 text-white shadow-sm">
                        <div className="text-xs font-semibold leading-none opacity-95">
                          {card.badge.line1}
                        </div>
                        <div className="mt-1 text-sm font-semibold leading-none">
                          {card.badge.line2}
                        </div>
                      </div>
                    )}

                    {/* Content */}
                    <div className="relative z-10 flex h-full flex-col justify-end p-5 sm:p-6 md:p-7">
                      <h3 className="text-2xl font-semibold tracking-tight text-white md:text-[28px]">
                        {card.title}
                      </h3>

                      <p className="mt-2 max-w-[520px] text-sm leading-relaxed text-white/85 md:text-base">
                        {card.description}
                      </p>

                      {/* Buttons */}
                      {isMiddle ? (
                        <div className="mt-5 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
                          <button
                            type="button"
                            className="
                              inline-flex h-11 w-full items-center justify-center
                              rounded-sm bg-belims-accent px-4
                              text-sm font-semibold text-white
                              shadow-sm transition
                              hover:bg-blue-700
                              sm:w-auto sm:px-8
                            "
                            onClick={(e) => {
                              e.stopPropagation();
                              window.location.href = "/trade/deals";
                            }}
                          >
                            View Trade Deals
                          </button>

                          <button
                            type="button"
                            className="
                              inline-flex h-11 w-full items-center justify-center
                              rounded-sm border-2 border-white bg-transparent px-4
                              text-sm font-semibold text-white
                              shadow-sm transition
                              hover:bg-white hover:text-black
                              sm:w-auto sm:px-8
                            "
                            onClick={(e) => {
                              e.stopPropagation();
                              window.location.href = "/trade/register";
                            }}
                          >
                            Apply for Trade Account
                          </button>
                        </div>
                      ) : (
                        <div className="mt-5">
                          <span
                            className="
                              inline-flex h-11 items-center justify-center
                              rounded-sm bg-belims-blue px-8
                              font-semibold text-sm text-white
                              shadow-sm transition
                              group-hover:bg-red-600
                            "
                          >
                            {card.buttonText}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Middle card video play affordance */}
                    {isMiddle && hasVideo && !shouldPlayVideo && (
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
                          text-xs font-semibold text-white
                          backdrop-blur-sm transition
                          hover:bg-black/60
                        "
                        aria-label="Play background video"
                      >
                        Play
                      </button>
                    )}
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroBanner;
