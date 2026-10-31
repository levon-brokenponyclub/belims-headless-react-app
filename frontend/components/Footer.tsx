import React from "react";
import { Link } from "react-router-dom";
import {
  Phone,
  Mail,
  MapPin,
  Facebook,
  Instagram,
  Linkedin,
} from "lucide-react";
import visaIcon from "@aaronfagan/ccicons/logo/visa.svg";
import mastercardIcon from "@aaronfagan/ccicons/logo/mastercard.svg";
import paypalIcon from "@aaronfagan/ccicons/logo/paypal.svg";
import amexIcon from "@aaronfagan/ccicons/logo/amex.svg";
import { TrustStrip } from "./TrustStrip";

interface FooterProps {
  onSelectStore: () => void;
}

const shopLinks = [
  { label: "All products", to: "/shop" },
  { label: "Power tools", to: "/shop/power-tools" },
  { label: "Tools & machinery", to: "/shop/tools-and-machinery" },
  { label: "Deals", to: "/shop?offer=daily,weekly,trade" },
];

const accountLinks = [
  { label: "Track an order", to: "/track-order" },
  { label: "My account", to: "/account" },
  { label: "Wishlist", to: "/wishlist" },
  { label: "Cart", to: "/cart" },
];

const supportLinks = [
  { label: "Delivery & collection", href: "#delivery" },
  { label: "Returns", href: "#returns" },
  { label: "Warranty", href: "#warranty" },
  { label: "Contact", href: "mailto:info@belims.co.za" },
];

const socialLinks = [
  { label: "Facebook", Icon: Facebook },
  { label: "Instagram", Icon: Instagram },
  { label: "LinkedIn", Icon: Linkedin },
];

export const Footer: React.FC<FooterProps> = ({ onSelectStore }) => {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-white pb-14 text-[15px] leading-6 text-text-secondary lg:pb-0">
      <section className="border-b-4 border-primary bg-surface-muted" aria-label="Contact Belims">
        <div className="container mx-auto flex flex-col gap-4 px-4 py-6 sm:px-6 md:flex-row md:items-center md:justify-between md:py-7">
          <div>
            <p className="font-heading text-xs font-bold uppercase leading-5 tracking-[0.1em] text-primary">
              Need help with a project?
            </p>
            <h2 className="mt-1 font-heading text-[22px] font-bold leading-tight text-text sm:text-2xl">
              Talk to the Belims team.
            </h2>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <a
              href="tel:+27399742082"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-sm bg-primary px-4 font-heading text-sm font-bold uppercase tracking-wide text-white transition-colors hover:bg-belims-blue active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <Phone size={16} aria-hidden="true" />
              Call 039 974 2082
            </a>
            <a
              href="mailto:info@belims.co.za"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-sm border border-belims-blue px-4 font-heading text-sm font-bold uppercase tracking-wide text-belims-blue transition-colors hover:bg-belims-blue hover:text-white active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <Mail size={16} aria-hidden="true" />
              Email our team
            </a>
          </div>
        </div>
      </section>

      <TrustStrip />

      <section className="bg-belims-blue text-white">
        <div className="container mx-auto grid grid-cols-1 gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(220px,0.95fr)_2.1fr] lg:gap-14 lg:py-9">
          <div>
            <Link to="/" aria-label="Belims home" className="inline-flex">
              <img
                alt="Belims Hardware"
                src="/images/belims-logo-white.webp"
                className="h-9 w-auto"
                width="136"
                height="36"
                loading="lazy"
                decoding="async"
              />
            </Link>
            <p className="mt-4 max-w-[29ch] text-[15px] leading-6 text-white/75">
              Hardware and tools for builders, tradespeople and home projects.
            </p>

            <address className="mt-5 grid gap-2.5 not-italic text-[15px] leading-6 text-white/85">
              <a
                href="tel:+27399742082"
                className="inline-flex min-h-10 items-center gap-2.5 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <Phone size={17} aria-hidden="true" />
                039 974 2082
              </a>
              <a
                href="mailto:info@belims.co.za"
                className="inline-flex min-h-10 items-center gap-2.5 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <Mail size={17} aria-hidden="true" />
                info@belims.co.za
              </a>
              <button
                type="button"
                onClick={onSelectStore}
                className="inline-flex min-h-10 items-center gap-2.5 text-left transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <MapPin size={17} aria-hidden="true" />
                Select a store
              </button>
            </address>
          </div>

          <nav
            aria-label="Footer navigation"
            className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 sm:gap-x-7"
          >
            <div>
              <h2 className="mb-3 font-heading text-[13px] font-bold uppercase leading-5 tracking-[0.09em] text-white/70">
                Shop
              </h2>
              <ul className="grid gap-2">
                {shopLinks.map(({ label, to }) => (
                  <li key={label}>
                    <Link
                      to={to}
                      className="inline-flex min-h-9 items-center text-[15px] leading-6 text-white/85 transition-colors hover:text-white hover:underline hover:decoration-primary hover:decoration-2 hover:underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h2 className="mb-3 font-heading text-[13px] font-bold uppercase leading-5 tracking-[0.09em] text-white/70">
                Orders &amp; account
              </h2>
              <ul className="grid gap-2">
                {accountLinks.map(({ label, to }) => (
                  <li key={label}>
                    <Link
                      to={to}
                      className="inline-flex min-h-9 items-center text-[15px] leading-6 text-white/85 transition-colors hover:text-white hover:underline hover:decoration-primary hover:decoration-2 hover:underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h2 className="mb-3 font-heading text-[13px] font-bold uppercase leading-5 tracking-[0.09em] text-white/70">
                Policies &amp; support
              </h2>
              <ul className="grid gap-2">
                {supportLinks.map(({ label, href }) => (
                  <li key={label}>
                    <a
                      href={href}
                      className="inline-flex min-h-9 items-center text-[15px] leading-6 text-white/85 transition-colors hover:text-white hover:underline hover:decoration-primary hover:decoration-2 hover:underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </nav>
        </div>
      </section>

      <section className="border-t border-white/15 bg-[#272064] text-white/75">
        <div className="container mx-auto flex flex-col gap-4 px-4 py-4 sm:px-6 md:flex-row md:items-center md:justify-between">
          <p className="text-[13px] leading-5">© {year} Belims Hardware</p>

          <div className="flex items-center gap-2" role="group" aria-label="Accepted payments">
            <img
              src={visaIcon}
              alt="Visa"
              className="h-6 w-auto rounded-sm bg-white px-1 py-0.5"
              loading="lazy"
              decoding="async"
            />
            <img
              src={mastercardIcon}
              alt="Mastercard"
              className="h-6 w-auto rounded-sm bg-white px-1 py-0.5"
              loading="lazy"
              decoding="async"
            />
            <img
              src={paypalIcon}
              alt="PayPal"
              className="h-6 w-auto rounded-sm bg-white px-1 py-0.5"
              loading="lazy"
              decoding="async"
            />
            <img
              src={amexIcon}
              alt="American Express"
              className="h-6 w-auto rounded-sm bg-white px-1 py-0.5"
              loading="lazy"
              decoding="async"
            />
          </div>

          <div className="flex items-center gap-2" role="group" aria-label="Social media">
            {socialLinks.map(({ label, Icon }) => (
              <a
                key={label}
                href="#"
                aria-label={label}
                className="grid h-9 w-9 place-items-center rounded-sm text-white/75 transition-colors hover:bg-white/15 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <Icon size={16} aria-hidden="true" />
              </a>
            ))}
          </div>
        </div>
      </section>
    </footer>
  );
};
