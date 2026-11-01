import React from "react";
import { Link } from "react-router-dom";
import {
  Phone,
  Mail,
  Facebook,
  Instagram,
  Linkedin,
} from "lucide-react";
import visaIcon from "@aaronfagan/ccicons/logo/visa.svg";
import mastercardIcon from "@aaronfagan/ccicons/logo/mastercard.svg";
import paypalIcon from "@aaronfagan/ccicons/logo/paypal.svg";
import amexIcon from "@aaronfagan/ccicons/logo/amex.svg";
import { TrustStrip } from "./TrustStrip";

const shopLinks = [
  { label: "All products", to: "/shop" },
  { label: "Power tools", to: "/shop/power-tools" },
  { label: "Tools & machinery", to: "/shop/tools-and-machinery" },
  { label: "Deals", to: "/shop?offer=daily,weekly,trade" },
];

const accountLinks = [
  { label: "Track an order", to: "/track-order" },
  { label: "My account", to: "/account" },
  { label: "Wishlist", to: "/account/wishlist" },
  { label: "Cart", to: "/cart" },
];

const supportLinks = [
  { label: "Delivery & collection", to: "/faq#delivery" },
  { label: "Returns", to: "/faq#returns" },
  { label: "Warranty", to: "/faq#warranty" },
  { label: "Contact", href: "mailto:info@belims.co.za" },
];

const socialLinks = [
  { label: "Facebook", Icon: Facebook },
  { label: "Instagram", Icon: Instagram },
  { label: "LinkedIn", Icon: Linkedin },
];

const columns = [
  { title: "Shop", links: shopLinks },
  { title: "Orders & account", links: accountLinks },
  { title: "Policies & support", links: supportLinks },
];

const payments = [
  { src: visaIcon, alt: "Visa" },
  { src: mastercardIcon, alt: "Mastercard" },
  { src: paypalIcon, alt: "PayPal" },
  { src: amexIcon, alt: "American Express" },
];

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

const linkClass = `inline-flex min-h-9 items-center text-base leading-6 text-white/75 transition-colors hover:text-white hover:underline hover:decoration-primary hover:decoration-2 hover:underline-offset-4 ${focusRing}`;

const contactClass = `inline-flex min-h-10 items-center gap-2.5 text-left text-base transition-colors hover:text-white ${focusRing}`;

const FooterLink: React.FC<{ label: string; to?: string; href?: string }> = ({ label, to, href }) =>
  to ? (
    <Link to={to} className={linkClass}>
      {label}
    </Link>
  ) : (
    <a href={href} className={linkClass}>
      {label}
    </a>
  );

export const Footer: React.FC = () => {
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
        <div className="container mx-auto px-4 py-10 sm:px-6 lg:py-14">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(260px,1fr)_3fr] lg:gap-16">
            <div>
              <Link to="/" aria-label="Belims home" className="inline-flex">
                <img
                  alt="Belims Hardware"
                  src="/images/belims-logo-white.webp"
                  className="h-10 w-auto"
                  width="151"
                  height="40"
                  loading="lazy"
                  decoding="async"
                />
              </Link>
              <p className="mt-5 max-w-[32ch] text-base leading-7 text-white/75">
                Hardware and tools for builders, tradespeople and home projects.
              </p>

              <address className="mt-5 grid gap-1 not-italic text-white/85">
                <a href="tel:+27399742082" className={contactClass}>
                  <Phone size={17} aria-hidden="true" />
                  039 974 2082
                </a>
                <a href="mailto:info@belims.co.za" className={contactClass}>
                  <Mail size={17} aria-hidden="true" />
                  info@belims.co.za
                </a>
              </address>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4">
              <nav aria-label="Footer navigation" className="col-span-2 grid grid-cols-2 gap-x-6 gap-y-10 sm:col-span-3 sm:grid-cols-3">
                {columns.map(({ title, links }) => (
                  <div key={title}>
                    <h2 className="mb-3 font-heading text-h5 font-bold text-white">{title}</h2>
                    <ul className="grid gap-1">
                      {links.map((link) => (
                        <li key={link.label}>
                          <FooterLink {...link} />
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </nav>

              <div className="col-span-2 sm:col-span-1">
                <h2 className="mb-3 font-heading text-h5 font-bold text-white">Follow us</h2>
                <div className="flex flex-wrap items-center gap-3" role="group" aria-label="Social media">
                  {socialLinks.map(({ label, Icon }) => (
                    <a
                      key={label}
                      href="#"
                      aria-label={label}
                      className={`grid h-10 w-10 place-items-center rounded-full bg-primary text-white transition-colors hover:bg-white hover:text-primary ${focusRing}`}
                    >
                      <Icon size={18} aria-hidden="true" />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-4 border-t border-white/15 pt-6 md:flex-row md:items-center md:justify-between lg:mt-14">
            <p className="text-caption text-white/75">© {year} Belims Hardware</p>
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Accepted payments">
              {payments.map(({ src, alt }) => (
                <img
                  key={alt}
                  src={src}
                  alt={alt}
                  className="h-7 w-auto rounded-sm bg-white px-1.5 py-1"
                  loading="lazy"
                  decoding="async"
                />
              ))}
            </div>
          </div>
        </div>
      </section>
    </footer>
  );
};
