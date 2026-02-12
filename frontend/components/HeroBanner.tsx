import React, { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { CountdownTimer } from "./CountdownTimer";

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
      if (timeoutHandle !== null) {
        clearTimeout(timeoutHandle);
      }
    };
  }, []);

  return (
    <section className="bg-gray-200 py-6 md:py-8 lg:py-10">
      <div className="container mx-auto px-3 lg:px-6 max-w-[1400px]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
          {/* Main Trade Hero Block - 8cols on LG */}
          <div className="lg:col-span-8">
            <div className="relative h-full min-h-0 md:min-h-[500px] lg:h-[70vh] overflow-hidden rounded-lg bg-[#09111D] flex items-center shadow-lg">
              {/* Background Video Overlay */}
              <div className="absolute inset-0 opacity-90">
                <video
                  autoPlay={shouldPlayVideo}
                  loop
                  muted
                  playsInline
                  preload="none"
                  poster="/images/development/midsection-worker-using-circular-saw-workshop.webp"
                  className="h-full w-full object-cover"
                >
                  {shouldPlayVideo && (
                    <source
                      src="https://www.shutterstock.com/shutterstock/videos/3530100681/preview/stock-footage-helmet-worker-and-laughing-with-glasses-in-construction-safety-and-black-man-in-warehouse-face.webm"
                      type="video/webm"
                    />
                  )}
                  {/* Fallback Image */}
                  <img
                    src="/images/development/midsection-worker-using-circular-saw-workshop.webp"
                    alt="Trade Professional"
                    className="h-full w-full object-cover"
                  />
                </video>
                {!shouldPlayVideo && (
                  <button
                    type="button"
                    onClick={() => setShouldPlayVideo(true)}
                    className="absolute bottom-6 left-6 rounded-full bg-black/50 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-black/70"
                    aria-label="Play hero video"
                  >
                    Play
                  </button>
                )}
                <div className="absolute inset-0 bg-gradient-to-r from-[#09111D] via-[#09111D]/50 to-transparent"></div>
              </div>

              <div className="relative z-10 w-full lg:w-4/5 py-8 px-5 md:p-12 lg:p-16 flex flex-col items-center text-center md:items-start md:text-left">
                <span className="block text-base font-bold uppercase tracking-wider text-belims-accent mb-2 lg:mb-4 md:text-base">
                  Partner with Belims
                </span>
                <h1 className="mb-3 font-heading text-xl font-semibold text-white sm:text-5xl md:mb-6 md:text-4xl">
                  Trade pricing that <br className="hidden md:block" /> works as
                  hard as you do
                </h1>
                <p className="mb-5 max-w-[480px] font-body text-base text-gray-300 opacity-90 leading-relaxed md:mb-8 md:text-lg">
                  Get access to exclusive trade-only rates, expert support, and
                  logistical advantages designed to keep your projects on track
                  and your business growing.
                </p>

                {/* Trade Benefits List */}
                {/* <ul className="mb-10 grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6">
                  {[
                    "Trade-only prices",
                    "Bulk discounts",
                    "Priority delivery",
                    "Fast pickup",
                    "Dedicated trade support",
                  ].map((item) => (
                    <li
                      key={item}
                      className="flex items-center text-gray-200 text-sm md:text-base"
                    >
                      <Check className="h-5 w-5 text-blue-500 mr-3 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul> */}

                <div className="grid grid-cols-2 gap-4 sm:flex">
                  <a
                    href="/trade/deals"
                    className="inline-flex h-[42px] w-full items-center justify-center rounded-sm lg:rounded bg-belims-accent px-3 text-sm font-semibold text-white transition-all hover:bg-blue-700 shadow-md sm:h-11 sm:w-auto sm:px-8 sm:text-base"
                  >
                    View Trade Deals
                  </a>
                  <a
                    href="/trade/register"
                    className="inline-flex h-[42px] w-full items-center justify-center rounded-sm lg:rounded px-3 text-sm font-semibold text-white border backdrop-blur-sm transition-all hover:bg-white hover:text-belims-blue sm:h-11 sm:w-auto sm:px-8 sm:text-base"
                  >
                    Apply for Trade Account
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Secondary Promo Cards - 4cols on LG */}
          <div className="lg:col-span-4 grid grid-cols-2 gap-4 md:gap-6 lg:gap-8 lg:flex lg:flex-col">
            {/* Daily Deals Card - Top Right */}
            <div className="relative h-full bg-belims-blue rounded-lg overflow-hidden shadow-sm flex items-center p-4 md:p-5 min-h-0 md:min-h-[200px] lg:min-h-[240px]">
              <div className="z-10 w-full flex flex-col items-center text-center gap-2 lg:gap-4">
                <h3 className="text-[18px] lg:text-xl font-semibold lg:font-bold text-white font-heading letterspacing-tight">
                  Daily deals
                </h3>
                {/* <p className="text-base text-white leading-relaxed">
                  Fresh discounts daily.
                </p> */}
                <div className="origin-center scale-75 lg:scale-100">
                  <CountdownTimer
                    targetDate={new Date(new Date().setHours(23, 59, 59, 999))}
                    label=""
                    variant="inverse"
                    hideDays={true}
                  />
                </div>
                <a
                  href="/collections/all"
                  className="inline-flex h-[42px] lg:h-11 items-center justify-center rounded-sm lg:rounded bg-red-600 px-8 text-sm lg:text-base font-semibold text-white transition-color hover:bg-red-700 shadow-md"
                >
                  Shop Now
                </a>
              </div>
            </div>

            {/* Tool Servicing Card - Bottom Right */}
            <div className="relative h-full bg-[#F3F4F6] rounded-lg overflow-hidden flex items-center min-h-0 md:min-h-[200px] lg:min-h-[260px] shadow-sm">
              {/* Background Image */}
              <div className="absolute inset-0">
                <img
                  src="/images/development/hero-paint-block.jpg"
                  alt="Paint Inspiration"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#222f42] via-[#222f42]/60 to-transparent"></div>
              </div>

              <div className="relative z-10 w-full p-4 md:p-8">
                <div className="max-w-[300px] flex flex-col items-center text-center md:items-start md:text-left">
                  <h3 className="mb-2 text-[18px] font-semibold text-white font-heading letterspacing-tight md:text-xl">
                    Need inspiration?
                  </h3>
                  <p className="mb-3 lg:mb-6 text-[13px] text-balance text-white max-w-[280px] md:text-base">
                    Describe your mood or space, and let our AI suggest the
                    perfect paint palette.
                  </p>
                  <a
                    href="/paint-assistant"
                    className="inline-flex h-[42px] items-center justify-center rounded-sm lg:rounded bg-belims-blue px-8 text-sm font-semibold text-white transition-color hover:bg-red-700 shadow-md md:h-11 md:text-base"
                  >
                    Try It Now
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroBanner;
