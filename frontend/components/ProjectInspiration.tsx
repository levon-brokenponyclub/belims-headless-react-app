import React, { useEffect, useMemo, useRef, useState } from "react";
import { PROJECT_IDEAS } from "../constants";

export const ProjectInspiration: React.FC = () => {
  const width = useWindowWidth();
  const isMobileSlider = width < 768;
  const slidesPerView = useMemo(() => {
    if (width < 768) return 2;
    return 4;
  }, [width]);

  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const maxIndex = Math.max(0, PROJECT_IDEAS.length - slidesPerView);
  const railRef = useRef<HTMLDivElement | null>(null);
  const [railWidth, setRailWidth] = useState(0);
  const mobileCardWidthPct = 0.75;

  useEffect(() => {
    setIndex((prev) => Math.min(prev, maxIndex));
  }, [maxIndex]);

  useEffect(() => {
    if (!isMobileSlider || isPaused || maxIndex === 0) return;
    const interval = window.setInterval(() => {
      setIndex((prev) => {
        const nextIndex = prev >= maxIndex ? 0 : prev + 1;
        scrollToIndex(nextIndex);
        return nextIndex;
      });
    }, 5000);
    return () => window.clearInterval(interval);
  }, [isMobileSlider, isPaused, maxIndex, railWidth]);

  useEffect(() => {
    if (!railRef.current) return;
    const handleResize = () => {
      setRailWidth(railRef.current?.clientWidth || 0);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [width]);

  const itemWidth =
    railWidth > 0
      ? railWidth * (isMobileSlider ? mobileCardWidthPct : 1 / slidesPerView)
      : 0;

  const scrollToIndex = (nextIndex: number) => {
    if (!railRef.current || !itemWidth) return;
    railRef.current.scrollTo({
      left: nextIndex * itemWidth,
      behavior: "smooth",
    });
  };

  const prev = () => {
    const nextIndex = index <= 0 ? maxIndex : index - 1;
    setIndex(nextIndex);
    scrollToIndex(nextIndex);
  };

  const next = () => {
    const nextIndex = index >= maxIndex ? 0 : index + 1;
    setIndex(nextIndex);
    scrollToIndex(nextIndex);
  };

  const indicatorPct =
    maxIndex === 0 ? 100 : Math.min(100, (index / maxIndex) * 100);

  return (
    <section className="mb-16" aria-label="Project inspiration">
      <div className="container mx-auto px-4">
        <div className="flex items-end justify-between gap-6 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 font-heading">
              Get the job done
            </h2>
            <p className="text-gray-500 text-sm mt-1">
              Curated essentials for common home and trade projects
            </p>
          </div>
          <div className="flex items-center gap-2 md:hidden">
            <button
              type="button"
              onClick={prev}
              aria-label="Previous project"
              className={[
                "grid h-9 w-9 place-items-center rounded-lg",
                "border border-black/10 bg-white text-gray-600",
                "transition-colors hover:bg-gray-50 hover:text-gray-900",
              ].join(" ")}
            >
              ‹
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next project"
              className={[
                "grid h-9 w-9 place-items-center rounded-lg",
                "border border-black/10 bg-white text-gray-600",
                "transition-colors hover:bg-gray-50 hover:text-gray-900",
              ].join(" ")}
            >
              ›
            </button>
          </div>
        </div>

        <div className="md:hidden">
          <div
            className="relative overflow-x-auto no-scrollbar snap-x snap-mandatory scroll-pl-0 scroll-pr-4"
            aria-roledescription="carousel"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onScroll={() => {
              if (!railRef.current || !itemWidth) return;
              const nextIndex = Math.round(
                railRef.current.scrollLeft / itemWidth,
              );
              setIndex(Math.min(maxIndex, Math.max(0, nextIndex)));
            }}
            ref={railRef}
          >
            <div className="flex gap-4">
              {PROJECT_IDEAS.map((project) => (
                <div
                  key={project.id}
                  className="shrink-0 snap-start"
                  style={{ width: `${mobileCardWidthPct * 100}%` }}
                >
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <img
                      src={project.image}
                      alt={project.title}
                      className="h-40 w-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                    <div className="p-4">
                      <h3 className="font-bold text-gray-900 mb-2">
                        {project.title}
                      </h3>
                      <p className="text-sm text-gray-600 mb-3">
                        {project.description}
                      </p>
                      <button
                        type="button"
                        className="text-sm font-semibold text-belims-blue hover:text-belims-accent"
                      >
                        {project.linkText} →
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-belims-blue transition-all duration-300"
              style={{ width: `${indicatorPct}%` }}
            />
          </div>
        </div>

        <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {PROJECT_IDEAS.map((project) => (
            <div
              key={project.id}
              className="bg-white border border-gray-200 rounded-lg overflow-hidden"
            >
              <img
                src={project.image}
                alt={project.title}
                className="h-40 w-full object-cover"
                loading="lazy"
                decoding="async"
              />
              <div className="p-4">
                <h3 className="font-bold text-gray-900 mb-2">
                  {project.title}
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  {project.description}
                </p>
                <button
                  type="button"
                  className="text-sm font-semibold text-belims-blue hover:text-belims-accent"
                >
                  {project.linkText} →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

function useWindowWidth() {
  const [w, setW] = useState<number>(() =>
    typeof window === "undefined" ? 1024 : window.innerWidth,
  );
  useEffect(() => {
    const onResize = () => setW(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return w;
}

export default ProjectInspiration;
