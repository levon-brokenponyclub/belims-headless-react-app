import React from "react";
import {
  Phone,
  Mail,
  MapPin,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Package,
  ShieldCheck,
  MessageCircle,
} from "lucide-react";
import visaIcon from "@aaronfagan/ccicons/logo/visa.svg";
import mastercardIcon from "@aaronfagan/ccicons/logo/mastercard.svg";
import paypalIcon from "@aaronfagan/ccicons/logo/paypal.svg";
import amexIcon from "@aaronfagan/ccicons/logo/amex.svg";

export const Footer = () => {
  return (
    <footer className="border-t border-gray-200 bg-white text-sm text-gray-600 pb-14 lg:pb-0">
      <section className="mx-auto w-full container py-10">
        <div className="grid gap-8 md:grid-cols-3">
          <div className="flex flex-col items-center text-center gap-3">
            <div className="text-gray-900">
              <Package size={28} strokeWidth={1.75} />
            </div>
            <div>
              <h4 className="font-heading text-base font-semibold text-gray-900">
                Free Shipping
              </h4>
              <p className="mt-2 text-sm text-gray-600">
                Enjoy free worldwide shipping and returns, with customs and
                duties taxes included.
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center text-center gap-3">
            <div className="text-gray-900">
              <ShieldCheck size={28} strokeWidth={1.75} />
            </div>
            <div>
              <h4 className="font-heading text-base font-semibold text-gray-900">
                Free Returns
              </h4>
              <p className="mt-2 text-sm text-gray-600">
                Free returns within 15 days, please make sure the items are in
                undamaged condition.
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center text-center gap-3">
            <div className="text-gray-900">
              <MessageCircle size={28} strokeWidth={1.75} />
            </div>
            <div>
              <h4 className="font-heading text-base font-semibold text-gray-900">
                Support Online
              </h4>
              <p className="mt-2 text-sm text-gray-600">
                We support customers 24/7, send questions we will solve for you
                immediately.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="w-full border-t border-gray-200">
        <div className="mx-auto w-full container py-12">
          <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <a href="/" className="inline-flex">
                <img
                  alt="logo"
                  src="/images/belims-logo-dark.png"
                  className="h-8 w-auto"
                />
              </a>

              <ul className="mt-6 space-y-3 text-sm text-gray-700">
                <li className="flex items-start gap-3">
                  <Phone size={18} className="mt-0.5 text-gray-500" />
                  <span>039 974 2082</span>
                </li>
                <li className="flex items-start gap-3">
                  <Mail size={18} className="mt-0.5 text-gray-500" />
                  <span>info@belims.co.za</span>
                </li>
                <li className="flex items-start gap-3">
                  <MapPin size={18} className="mt-0.5 text-gray-500" />
                  <span>Select a Store</span>
                </li>
              </ul>
            </div>

            <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
              <div>
                <h4 className="font-heading text-base font-semibold text-gray-900">
                  Shop
                </h4>
                <ul className="mt-4 space-y-3">
                  <li>
                    <a
                      href="#"
                      className="transition-colors hover:text-gray-900"
                    >
                      New Arrivals
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      className="transition-colors hover:text-gray-900"
                    >
                      Best Sellers
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      className="transition-colors hover:text-gray-900"
                    >
                      Categories
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      className="transition-colors hover:text-gray-900"
                    >
                      Gift Cards
                    </a>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-heading text-base font-semibold text-gray-900">
                  Services
                </h4>
                <ul className="mt-4 space-y-3">
                  <li>
                    <a
                      href="#"
                      className="transition-colors hover:text-gray-900"
                    >
                      FAQs
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      className="transition-colors hover:text-gray-900"
                    >
                      Shipping &amp; Returns
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      className="transition-colors hover:text-gray-900"
                    >
                      Track Order
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      className="transition-colors hover:text-gray-900"
                    >
                      Contact Us
                    </a>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-heading text-base font-semibold text-gray-900">
                  Company
                </h4>
                <ul className="mt-4 space-y-3">
                  <li>
                    <a
                      href="#"
                      className="transition-colors hover:text-gray-900"
                    >
                      About Us
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      className="transition-colors hover:text-gray-900"
                    >
                      Career
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      className="transition-colors hover:text-gray-900"
                    >
                      Press
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      className="transition-colors hover:text-gray-900"
                    >
                      Privacy Policy
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-gray-200">
        <div className="mx-auto flex w-full container flex-col gap-4 py-5 md:flex-row md:items-center md:justify-between">
          <p className="text-xs text-gray-600 md:text-sm">
            © Copyright 2026 - Belims. All Right Reserved
          </p>

          <div className="flex items-center gap-2">
            <img
              src={mastercardIcon}
              alt="Mastercard"
              className="h-5 w-auto"
              loading="lazy"
              decoding="async"
            />
            <img
              src={visaIcon}
              alt="Visa"
              className="h-5 w-auto"
              loading="lazy"
              decoding="async"
            />
            <img
              src={paypalIcon}
              alt="PayPal"
              className="h-5 w-auto"
              loading="lazy"
              decoding="async"
            />
            <img
              src={amexIcon}
              alt="American Express"
              className="h-5 w-auto"
              loading="lazy"
              decoding="async"
            />
          </div>

          <div className="flex items-center gap-2">
            <a
              href="#"
              aria-label="Facebook"
              className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
            >
              <Facebook size={16} />
            </a>
            <a
              href="#"
              aria-label="Twitter"
              className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
            >
              <Twitter size={16} />
            </a>
            <a
              href="#"
              aria-label="Instagram"
              className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
            >
              <Instagram size={16} />
            </a>
            <a
              href="#"
              aria-label="LinkedIn"
              className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
            >
              <Linkedin size={16} />
            </a>
          </div>
        </div>
      </section>
    </footer>
  );
};
