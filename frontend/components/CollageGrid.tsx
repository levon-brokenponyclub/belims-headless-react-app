// CollageGrid.tsx
import React, { useEffect, useMemo, useRef } from "react";

type CollageItem = {
  id: string;
  area: "main" | "sec" | "third" | "fourth";
  imageSrc: string;
  imageAlt?: string;
  href: string;

  // Content
  kicker?: string; // e.g. "Hand Tools"
  heading: string;
  text?: string;
  ctaLabel: string;
  ctaVariant?: "primary" | "link"; // matches Shopify button vs underlined-link

  // Optional countdown (main tile)
  countdown?: {
    title?: string; // "Limited Time Only"
    dateISO: string; // "2026-08-30T00:00:00Z" or "2026-08-30"
  };

  // Optional content surface style
  contentAlign?: "bottom-left" | "middle-left";
};

export interface CollageGridProps {
  className?: string;
  items?: CollageItem[];
}

const DEFAULT_ITEMS: CollageItem[] = [
  {
    id: "1",
    area: "main",
    imageSrc:
      "/images/development/midsection-worker-using-circular-saw-workshop.webp",
    href: "/collections/air-intakes-filters",
    kicker: "Air Compressor Filter",
    heading: "Deals of the Year",
    text: "Great deals are temporary, but quality tools are forever.",
    ctaLabel: "Shop sale",
    ctaVariant: "primary",
    countdown: { title: "Limited Time Only", dateISO: "2026-08-30" },
    contentAlign: "bottom-left",
  },
  {
    id: "2",
    area: "sec",
    imageSrc: "/images/development/Image_44.webp",
    href: "/collections/car-starter-plugs",
    heading: "High-Performance",
    text: "Engineered for Noise Reduction.",
    ctaLabel: "Shop now",
    ctaVariant: "link",
    contentAlign: "bottom-left",
  },
  {
    id: "3",
    area: "third",
    imageSrc: "/images/development/Image_55.webp",
    href: "/collections/car-starter-plugs",
    heading: "Premium Shock Absorbers",
    text: "Engineered for Smooth Handling.",
    ctaLabel: "Buy now",
    ctaVariant: "link",
    contentAlign: "bottom-left",
  },
  {
    id: "4",
    area: "fourth",
    imageSrc: "/images/development/Image_60.webp",
    href: "/collections/hand-tools",
    kicker: "Hand Tools",
    heading: "For the Expert",
    text: "Premium wrenches, pliers, and more at competitive prices.",
    ctaLabel: "Shop Hand Tools",
    ctaVariant: "primary",
    contentAlign: "middle-left",
  },
];

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function toMs(dateISO: string) {
  // Accept "YYYY-MM-DD" or full ISO
  const normalized = dateISO.includes("T") ? dateISO : `${dateISO}T00:00:00`;
  const ms = new Date(normalized).getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

function formatCountdown(msLeft: number) {
  if (msLeft <= 0) {
    return { days: "0", hours: "00", minutes: "00", seconds: "00" };
  }
  const totalSec = Math.floor(msLeft / 1000);
  const days = Math.floor(totalSec / (3600 * 24));
  const hours = Math.floor((totalSec % (3600 * 24)) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  const pad2 = (n: number) => String(n).padStart(2, "0");
  return {
    days: String(days),
    hours: pad2(hours),
    minutes: pad2(minutes),
    seconds: pad2(seconds),
  };
}

const CollageGrid: React.FC<CollageGridProps> = ({
  className = "",
  items = DEFAULT_ITEMS,
}) => {
  const mainItem = useMemo(() => items.find((i) => i.area === "main"), [items]);

  const [t, setT] = React.useState(() => Date.now());
  const rafRef = useRef<number | null>(null);

  // Smooth-ish timer without being expensive: tick every second only if needed
  useEffect(() => {
    if (!mainItem?.countdown?.dateISO) return;

    const tick = () => {
      setT(Date.now());
      rafRef.current = window.setTimeout(tick, 1000) as unknown as number;
    };

    tick();
    return () => {
      if (rafRef.current) window.clearTimeout(rafRef.current);
      rafRef.current = null;
    };
  }, [mainItem?.countdown?.dateISO]);

  const countdown = useMemo(() => {
    if (!mainItem?.countdown?.dateISO) return null;
    const endMs = toMs(mainItem.countdown.dateISO);
    const msLeft = Math.max(0, endMs - t);
    return formatCountdown(msLeft);
  }, [mainItem?.countdown?.dateISO, t]);

  const byArea = useMemo(() => {
    const map = new Map<string, CollageItem>();
    items.forEach((i) => map.set(i.area, i));
    return map;
  }, [items]);

  const Tile = ({ item }: { item: CollageItem }) => {
    const isMain = item.area === "main";

    const contentPos =
      item.contentAlign === "middle-left" ? "items-center" : "items-end";

    return (
      <a
        href={item.href}
        className={cn(
          "group relative overflow-hidden rounded-lg border border-gray-200 bg-white",
          "shadow-[0_1px_2px_rgba(16,24,40,0.06)] transition-all duration-200",
          "hover:shadow-[0_10px_26px_rgba(16,24,40,0.08)]",
          "focus:outline-none focus:ring-2 focus:ring-belims-blue/30",
        )}
        aria-label={item.heading}
      >
        {/* Image */}
        <div className="absolute inset-0">
          <img
            src={item.imageSrc}
            alt={item.imageAlt || item.heading}
            className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.04]"
            loading="lazy"
          />
        </div>

        {/* Gradient overlay (premium, consistent) */}
        <div
          className={cn(
            "absolute inset-0",
            isMain
              ? "bg-gradient-to-b from-black/40 via-black/35 to-black/55"
              : "bg-gradient-to-b from-black/35 via-black/30 to-black/55",
          )}
          aria-hidden="true"
        />

        {/* Belims red corner bar (attention-to-detail treatment) */}
        <span
          className="absolute left-0 top-0 z-10 h-1 w-12 rounded-br-lg bg-[#DF1119]"
          aria-hidden="true"
        />

        {/* Content */}
        <div className={cn("relative z-10 flex h-full", contentPos)}>
          <div
            className={cn(
              "w-full p-6 md:p-7",
              isMain ? "max-w-[36rem]" : "max-w-[28rem]",
            )}
          >
            {item.kicker && (
              <div className="font-body text-label text-white/80">
                {item.kicker}
              </div>
            )}

            <h3
              className={cn(
                "mt-2 font-heading font-bold text-white",
                isMain ? "text-display-sm" : "text-h3",
              )}
            >
              {item.heading}
            </h3>

            {item.text && (
              <p className="mt-2 font-body text-base text-white/85">
                {item.text}
              </p>
            )}

            {/* CTA */}
            <div className="mt-5">
              {item.ctaVariant === "link" ? (
                <span className="inline-flex items-center gap-2 font-body text-sm font-semibold text-white/90 group-hover:text-white">
                  {item.ctaLabel}
                  <span
                    className="transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  >
                    →
                  </span>
                </span>
              ) : (
                <span className="inline-flex h-11 items-center rounded-lg bg-belims-blue px-5 font-heading text-button font-semibold text-white transition-colors group-hover:bg-belims-light">
                  {item.ctaLabel}
                </span>
              )}
            </div>

            {/* Countdown (main only) */}
            {isMain && item.countdown && countdown && (
              <div className="mt-6 inline-flex flex-col gap-2 rounded-lg bg-black/70 px-4 py-3 text-white backdrop-blur-sm ring-1 ring-white/10">
                {item.countdown.title && (
                  <div className="font-body text-xs font-semibold uppercase tracking-wider text-white/80">
                    {item.countdown.title}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  {[
                    { label: "Days", value: countdown.days },
                    { label: "Hrs", value: countdown.hours },
                    { label: "Min", value: countdown.minutes },
                    { label: "Sec", value: countdown.seconds },
                  ].map((b) => (
                    <div
                      key={b.label}
                      className="rounded-lg bg-white px-3 py-2 text-center text-black shadow-[0_1px_2px_rgba(16,24,40,0.10)]"
                    >
                      <div className="font-heading text-[16px] font-bold leading-none">
                        {b.value}
                      </div>
                      <div className="mt-1 font-body text-[10px] font-semibold uppercase tracking-wider text-black/60">
                        {b.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </a>
    );
  };

  const main = byArea.get("main");
  const sec = byArea.get("sec");
  const third = byArea.get("third");
  const fourth = byArea.get("fourth");

  return (
    <section
      className={cn("w-full bg-gray-50", className)}
      aria-label="Collage promotions"
    >
      <div className="container mx-auto px-4">
        <div className="py-14">
          {/* Desktop grid (matches Shopify areas) */}
          <div
            className={cn(
              "hidden md:grid",
              "gap-5",
              // two rows; 4 columns like the Shopify template
              "grid-cols-4",
              // explicit area mapping
              "[grid-template-areas:'main_main_sec_third'_'main_main_fourth_fourth']",
              // give it a nice height baseline; tiles will stretch
              "auto-rows-[260px]",
            )}
          >
            {main && (
              <div className="[grid-area:main]">{<Tile item={main} />}</div>
            )}
            {sec && (
              <div className="[grid-area:sec]">{<Tile item={sec} />}</div>
            )}
            {third && (
              <div className="[grid-area:third]">{<Tile item={third} />}</div>
            )}
            {fourth && (
              <div className="[grid-area:fourth]">{<Tile item={fourth} />}</div>
            )}
          </div>

          {/* Mobile stack (Shopify switches to flex) */}
          <div className="grid gap-5 md:hidden">
            {main && <Tile item={main} />}
            {sec && <Tile item={sec} />}
            {third && <Tile item={third} />}
            {fourth && <Tile item={fourth} />}
          </div>
        </div>
      </div>
    </section>
  );
};

export default CollageGrid;
