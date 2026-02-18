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
  const [activeMobileSlide, setActiveMobileSlide] = useState(0);

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
        key: "planers",
        href: "/collections/planers",
        title: "Planers",
        description:
          "Get the job done with much less effort with an affordable and powerful planer from top brands.",
        buttonText: "Shop now",
        imageSrc:
          "https://athens-theme.myshopify.com/cdn/shop/files/athens-mosaic-03.jpg?v=1747138889&width=2840",
        imageAlt: "Planer tool",
      },
    ],
    [],
  );

  useEffect(() => {
    if (cards.length <= 1) return;
    const timer = window.setInterval(() => {
      setActiveMobileSlide((prev) => (prev + 1) % cards.length);
    }, 6000);

    return () => window.clearInterval(timer);
  }, [cards.length]);

  const goToPrevMobileSlide = () => {
    setActiveMobileSlide((prev) => (prev - 1 + cards.length) % cards.length);
  };

  const goToNextMobileSlide = () => {
    setActiveMobileSlide((prev) => (prev + 1) % cards.length);
  };

  return (
    <section className="bg-[#F2F3F7] py-4 md:py-4 lg:py-8">
      <div className="container mx-auto max-w-[1400px] px-3 lg:px-6">
        <div className="md:hidden">
          <div className="relative h-[360px] overflow-hidden rounded-2xl bg-gray-900">
            {cards.map((card, idx) => {
              const hasVideo = !!card.videoMp4Src || !!card.videoHlsSrc;
              const isTradeCard = card.key === "trade";
              const isActive = idx === activeMobileSlide;

              return (
                <a
                  key={`mobile-${card.key}`}
                  href={card.href}
                  aria-label={card.title}
                  className={`absolute inset-0 transition-opacity duration-500 ease-out ${
                    isActive
                      ? "opacity-100 pointer-events-auto"
                      : "opacity-0 pointer-events-none"
                  }`}
                >
                  <div className="absolute inset-0">
                    <img
                      src={card.imageSrc}
                      alt={card.imageAlt}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />

                    {hasVideo && isTradeCard && isActive && (
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

                  <div className="relative z-10 flex h-full flex-col items-center justify-center p-5 text-center">
                    <h3 className="text-2xl font-semibold tracking-tight text-white">
                      {card.title}
                    </h3>

                    <p className="mt-2 text-sm leading-relaxed text-white/85">
                      {card.description}
                    </p>

                    {isTradeCard ? (
                      <div className="mt-5 grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          className="group relative h-12 w-full overflow-hidden rounded-pill bg-belims-accent text-white transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.location.href = "/trade/deals";
                          }}
                        >
                          <span className="absolute inset-0 origin-left scale-x-0 bg-blue-700 transition-transform duration-300 ease-out group-hover:scale-x-100" />
                          <span className="relative z-10 px-3 text-lg font-semibold font-heading transition-colors group-hover:text-white">
                            View Trade Deals
                          </span>
                        </button>

                        <button
                          type="button"
                          className="group relative h-12 w-full overflow-hidden rounded-pill border-2 border-white bg-transparent text-white transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.location.href = "/trade/register";
                          }}
                        >
                          <span className="absolute inset-0 origin-left scale-x-0 bg-white transition-transform duration-300 ease-out group-hover:scale-x-100" />
                          <span className="relative z-10 px-3 text-lg font-semibold font-heading transition-colors group-hover:text-black">
                            Apply for Trade Account
                          </span>
                        </button>
                      </div>
                    ) : (
                      <div className="mt-5">
                        <span className="group relative inline-flex h-11 items-center justify-center overflow-hidden rounded-pill bg-belims-blue px-12 text-white transition-colors">
                          <span className="absolute inset-0 origin-left scale-x-0 bg-red-muted transition-transform duration-300 ease-out group-hover:scale-x-100 px-3" />
                          <span className="relative z-10 font-heading font-bold text-base px-3 transition-colors group-hover:text-white">
                            {card.buttonText}
                          </span>
                        </span>
                      </div>
                    )}
                  </div>
                </a>
              );
            })}

            <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-4">
              <button
                type="button"
                aria-label="Previous slide"
                onClick={goToPrevMobileSlide}
                className="flex h-8 w-8 items-center justify-center text-white/90 transition hover:text-white"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12.5 16.25L6.25 10L12.5 3.75"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              <div className="flex items-center gap-2">
                {cards.map((card, idx) => (
                  <button
                    key={`bullet-${card.key}`}
                    type="button"
                    aria-label={`Go to slide ${idx + 1}`}
                    aria-current={idx === activeMobileSlide}
                    onClick={() => setActiveMobileSlide(idx)}
                    className={`h-2.5 w-2.5 rounded-full transition-all ${
                      idx === activeMobileSlide
                        ? "bg-white"
                        : "bg-white/45 hover:bg-white/70"
                    }`}
                  />
                ))}
              </div>

              <button
                type="button"
                aria-label="Next slide"
                onClick={goToNextMobileSlide}
                className="flex h-8 w-8 items-center justify-center text-white/90 transition hover:text-white"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M7.5 3.75L13.75 10L7.5 16.25"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Desktop/tablet: existing 25/50/25 grid */}
        <div className="-mx-3 px-3 lg:mx-0 lg:px-0">
          <div className="hidden overflow-x-auto md:block lg:overflow-visible">
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
                const isTradeCard = card.key === "trade";
                const isPrimary = idx === 0;

                // 50% / 25% / 25% on lg+
                const colSpan = isPrimary ? "lg:col-span-6" : "lg:col-span-3";

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
                      overflow-hidden rounded-2xl
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

                      {hasVideo && isTradeCard && (
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
                      {isTradeCard ? (
                        <div className="mt-5 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
                          <button
                            type="button"
                            className="
                              group relative h-12 w-full overflow-hidden
                              rounded-pill bg-belims-accent
                              text-white transition-colors
                              sm:w-auto sm:px-8
                            "
                            onClick={(e) => {
                              e.stopPropagation();
                              window.location.href = "/trade/deals";
                            }}
                          >
                            <span className="absolute inset-0 origin-left scale-x-0 bg-belims-blue transition-transform duration-300 ease-out group-hover:scale-x-100" />
                            <span className="relative z-10 text-base font-semibold px-2 font-heading transition-colors group-hover:text-white">
                              View Trade Deals
                            </span>
                          </button>

                          <button
                            type="button"
                            className="
                              group relative h-12 w-full overflow-hidden
                              rounded-pill border-2 border-white bg-transparent
                              text-white transition-colors
                              sm:w-auto sm:px-8
                            "
                            onClick={(e) => {
                              e.stopPropagation();
                              window.location.href = "/trade/register";
                            }}
                          >
                            <span className="absolute inset-0 origin-left scale-x-0 bg-white transition-transform duration-300 ease-out group-hover:scale-x-100" />
                            <span className="relative z-10 text-base font-semibold px-5 font-heading transition-colors group-hover:text-black">
                              Apply for Trade Account
                            </span>
                          </button>
                        </div>
                      ) : (
                        <div className="mt-5">
                          <span
                            className="
                              group relative inline-flex h-12 items-center justify-center
                              overflow-hidden rounded-pill bg-belims-blue px-12
                              text-white transition-colors
                            "
                          >
                            <span className="absolute inset-0 origin-left scale-x-0 bg-red-muted transition-transform duration-300 ease-out group-hover:scale-x-100" />
                            <span className="relative z-10 font-heading font-semibold text-base transition-colors group-hover:text-white">
                              {card.buttonText}
                            </span>
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Middle card video play affordance */}
                    {isTradeCard && hasVideo && !shouldPlayVideo && (
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
