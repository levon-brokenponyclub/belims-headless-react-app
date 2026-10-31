import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

export interface ArchiveCrumb {
  label: string;
  to?: string;
}

export interface ArchiveDiscoveryItem {
  id: string;
  label: string;
  count: number;
  image?: string;
}

interface ArchiveHeroProps {
  /** "banner" = Hero A (All products), "compact" = Hero C (category / brand / search). */
  variant: "banner" | "compact";
  title: string;
  crumbs: ArchiveCrumb[];
  countText: string;
  eyebrow?: string;
  description?: string;
  brandCount?: number;
  dealCount?: number;
  dealsHref?: string;
  discovery: ArchiveDiscoveryItem[];
  discoveryLabel: string;
  /** Compact only: search within the current listing (`q` param). */
  withinSearch?: {
    value: string;
    placeholder: string;
    onSubmit: (value: string) => void;
  };
}

// Development placeholder until the CMS supplies category/hero imagery.
const BANNER_IMAGE = "/images/development/athens-mosaic-03";

const Breadcrumbs: React.FC<{ crumbs: ArchiveCrumb[]; inverse?: boolean }> = ({
  crumbs,
  inverse = false,
}) => (
  <nav aria-label="Breadcrumb">
    <ol
      className={`flex flex-wrap items-center gap-1.5 text-sm ${
        inverse ? "text-white/80" : "text-text-secondary"
      }`}
    >
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1;
        return (
          <li key={`${crumb.label}-${index}`} className="flex items-center gap-1.5">
            {isLast || !crumb.to ? (
              <span
                aria-current={isLast ? "page" : undefined}
                className={`font-semibold ${inverse ? "text-white" : "text-text"}`}
              >
                {crumb.label}
              </span>
            ) : (
              <Link
                to={crumb.to}
                className={`underline-offset-4 hover:underline ${
                  inverse ? "hover:text-white" : "hover:text-belims-blue"
                }`}
              >
                {crumb.label}
              </Link>
            )}
            {!isLast && <ChevronRight size={12} aria-hidden="true" />}
          </li>
        );
      })}
    </ol>
  </nav>
);

const Thumb: React.FC<{ src?: string; className: string }> = ({ src, className }) =>
  src ? (
    <img src={src} alt="" loading="lazy" className={`${className} object-contain bg-white`} />
  ) : (
    <span className={`${className} bg-surface-muted`} aria-hidden="true" />
  );

export const ArchiveHero: React.FC<ArchiveHeroProps> = ({
  variant,
  title,
  crumbs,
  countText,
  eyebrow,
  description,
  brandCount,
  dealCount = 0,
  dealsHref,
  discovery,
  discoveryLabel,
  withinSearch,
}) => {
  const [within, setWithin] = useState(withinSearch?.value ?? "");
  useEffect(() => setWithin(withinSearch?.value ?? ""), [withinSearch?.value]);

  if (variant === "banner") {
    return (
      <>
        <section className="relative overflow-hidden bg-belims-blue text-white">
          <img
            src={`${BANNER_IMAGE}-1080.webp`}
            srcSet={`${BANNER_IMAGE}-640.webp 640w, ${BANNER_IMAGE}-1080.webp 1080w`}
            sizes="100vw"
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-right"
          />
          <div
            className="absolute inset-0 bg-[linear-gradient(0deg,rgba(50,39,131,.96)_20%,rgba(50,39,131,.5))] md:bg-[linear-gradient(90deg,rgba(50,39,131,.96)_0%,rgba(50,39,131,.8)_40%,rgba(50,39,131,.1)_85%)]"
            aria-hidden="true"
          />
          <div className="container relative mx-auto flex min-h-[260px] flex-col px-4 pb-7 pt-2 md:min-h-[320px] md:pb-10">
            <div className="mb-auto">
              <Breadcrumbs crumbs={crumbs} inverse />
            </div>
            {eyebrow && (
              <p className="mt-7 text-eyebrow uppercase tracking-widest text-white/80">{eyebrow}</p>
            )}
            <h1 className="mt-1 max-w-[14ch] font-heading font-condensed text-display-sm font-extrabold uppercase leading-[.95] tracking-tight md:text-display-lg">
              {title}
            </h1>
            {description && (
              <p className="mt-3 max-w-[520px] text-base text-white/90">{description}</p>
            )}
            <p className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-base font-bold">
              <span>{countText}</span>
              {brandCount ? <span>{brandCount} brands</span> : null}
              {dealCount > 0 && dealsHref && (
                <Link
                  to={dealsHref}
                  className="underline decoration-primary decoration-2 underline-offset-4"
                >
                  {dealCount} on deal →
                </Link>
              )}
            </p>
          </div>
        </section>
        {discovery.length > 0 && (
          <div className="border-b border-border bg-white">
            <div className="container mx-auto px-4">
              <ul
                className="no-scrollbar flex gap-2 overflow-x-auto py-3.5"
                aria-label={discoveryLabel}
              >
                {discovery.map((item) => (
                  <li key={item.id} className="shrink-0">
                    <Link
                      to={`/shop/${encodeURIComponent(item.id)}`}
                      className="flex h-11 items-center gap-2 rounded-md border border-border bg-white py-1 pl-1 pr-3 text-base font-semibold text-text transition-colors hover:border-belims-blue"
                    >
                      <Thumb src={item.image} className="h-9 w-9 rounded-sm" />
                      <span className="whitespace-nowrap">{item.label}</span>
                      <span className="text-sm font-medium text-text-tertiary">{item.count}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <section className="border-b border-border bg-white">
      <div className="container mx-auto px-4 pt-4">
        <Breadcrumbs crumbs={crumbs} />
        <div className="flex flex-wrap items-end justify-between gap-4 pb-5 pt-3">
          <div>
            <h1 className="inline font-heading font-condensed text-h1 font-extrabold uppercase leading-none lg:text-display-sm">
              {title}
            </h1>
            <span className="ml-3 inline-block align-middle text-base font-bold text-text-tertiary">
              {countText}
            </span>
          </div>
          {withinSearch && (
            <form
              role="search"
              className="flex w-full gap-2 sm:w-[420px]"
              onSubmit={(e) => {
                e.preventDefault();
                withinSearch.onSubmit(within.trim());
              }}
            >
              <label htmlFor="archive-within" className="sr-only">
                {withinSearch.placeholder}
              </label>
              <input
                id="archive-within"
                type="search"
                value={within}
                onChange={(e) => setWithin(e.target.value)}
                placeholder={withinSearch.placeholder}
                className="h-12 min-w-0 flex-1 rounded-md border border-border-strong px-3.5 text-base text-text placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-belims-blue"
              />
              <button
                type="submit"
                className="h-12 rounded-md bg-belims-blue px-5 font-heading font-condensed text-button font-bold uppercase text-white transition-colors hover:bg-primary"
              >
                Search
              </button>
            </form>
          )}
        </div>
        {discovery.length > 0 && (
          <ul
            className="no-scrollbar -mx-1 flex gap-4 overflow-x-auto px-1 pb-5"
            aria-label={discoveryLabel}
          >
            {discovery.map((item) => (
              <li key={item.id} className="w-24 shrink-0">
                <Link
                  to={`/shop/${encodeURIComponent(item.id)}`}
                  className="group flex flex-col items-center gap-2 text-center text-sm font-semibold leading-tight text-text"
                >
                  <Thumb
                    src={item.image}
                    className="h-20 w-20 rounded-full border-2 border-border p-2 transition-colors group-hover:border-primary"
                  />
                  <span>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};
