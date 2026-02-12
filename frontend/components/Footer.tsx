import React from "react";
import { Mail, Facebook, Twitter, Instagram, Linkedin } from "lucide-react";

export const Footer = () => {
  const [email, setEmail] = React.useState("");
  const [subscribed, setSubscribed] = React.useState(false);

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setEmail("");
      setTimeout(() => setSubscribed(false), 3000);
    }
  };

  return (
    <footer className="bg-belims-blue border-t border-blue-900 py-12 text-sm pb-24">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {/* Shop Column */}
          <div>
            <h3 className="font-semibold text-white mb-4 font-heading uppercase text-base">
              Shop
            </h3>
            <ul className="space-y-2">
              <li>
                <a
                  href="/shop/tools-machinery"
                  className="text-white hover:text-belims-blue-light transition-colors"
                >
                  Tools & Machinery
                </a>
              </li>
              <li>
                <a
                  href="/shop/paint"
                  className="text-white hover:text-belims-blue-light transition-colors"
                >
                  Paint
                </a>
              </li>
              <li>
                <a
                  href="/shop/building-materials"
                  className="text-white hover:text-belims-blue-light transition-colors"
                >
                  Building Materials
                </a>
              </li>
              <li>
                <a
                  href="/shop/plumbing"
                  className="text-white hover:text-belims-blue-light transition-colors"
                >
                  Plumbing
                </a>
              </li>
              <li>
                <a
                  href="/deals"
                  className="text-white hover:text-belims-blue-light transition-colors"
                >
                  Deals & Clearance
                </a>
              </li>
            </ul>
          </div>

          {/* Trade Column */}
          <div>
            <h3 className="font-semibold text-white mb-4 font-heading uppercase text-base">
              Trade
            </h3>
            <ul className="space-y-2">
              <li>
                <a
                  href="/trade-accounts"
                  className="text-white hover:text-belims-blue-light transition-colors"
                >
                  Trade Accounts
                </a>
              </li>
              <li>
                <a
                  href="/bulk-orders"
                  className="text-white hover:text-belims-blue-light transition-colors"
                >
                  Bulk Orders
                </a>
              </li>
              <li>
                <a
                  href="/delivery-areas"
                  className="text-white hover:text-belims-blue-light transition-colors"
                >
                  Delivery Areas
                </a>
              </li>
              <li>
                <a
                  href="/returns-warranty"
                  className="text-white hover:text-belims-blue-light transition-colors"
                >
                  Returns & Warranty
                </a>
              </li>
            </ul>
          </div>

          {/* Support Column */}
          <div>
            <h3 className="font-semibold text-white mb-4 font-heading uppercase text-base">
              Support
            </h3>
            <ul className="space-y-2">
              <li>
                <a
                  href="/contact"
                  className="text-white hover:text-belims-blue-light transition-colors"
                >
                  Contact Us
                </a>
              </li>
              <li>
                <a
                  href="/help"
                  className="text-white hover:text-belims-blue-light transition-colors"
                >
                  Help Centre
                </a>
              </li>
              <li>
                <a
                  href="/account"
                  className="text-white hover:text-belims-blue-light transition-colors"
                >
                  My Account
                </a>
              </li>
            </ul>
          </div>

          {/* Belims Column */}
          <div>
            <h3 className="font-semibold text-white mb-4 font-heading uppercase text-base">
              Belims
            </h3>
            <ul className="space-y-2">
              <li>
                <a
                  href="/about"
                  className="text-white hover:text-belims-blue-light transition-colors"
                >
                  About Belims
                </a>
              </li>
              <li>
                <a
                  href="/brands"
                  className="text-white hover:text-belims-blue-light transition-colors"
                >
                  Brands
                </a>
              </li>
              <li>
                <a
                  href="/terms"
                  className="text-white hover:text-belims-blue-light transition-colors"
                >
                  Terms & Conditions
                </a>
              </li>
              <li>
                <a
                  href="/privacy"
                  className="text-white hover:text-belims-blue-light transition-colors"
                >
                  Privacy Policy
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Newsletter Section */}
        <div className="border-t border-white/30 pt-8 pb-8">
          <div className="max-w-xl mx-auto mb-4 items-center text-center">
            <h4 className="font-semibold centered text-white mb-3 font-heading uppercase text-lg">
              Build Better with Belims
            </h4>
            <p className="text-white text-base mb-4 centered">
              Subscribe to receive product updates, exclusive deals, and expert
              renovation tips.{" "}
            </p>
            <form onSubmit={handleNewsletterSubmit} className="flex gap-2">
              <input
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 px-4 py-3 rounded bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-belims-accent"
                required
              />
              <button
                type="submit"
                className="bg-belims-accent hover:bg-red-700 text-white px-6 py-3 rounded font-bold transition-colors flex items-center gap-2"
              >
                <Mail size={16} />
                Subscribe
              </button>
            </form>
            {subscribed && (
              <p className="text-green-300 text-sm mt-2">
                Thank you for subscribing!
              </p>
            )}
            <p className="text-white/70 text-xs mt-3">
              *By signing up here I agree to receive Belims emails and
              newsletter
            </p>
          </div>

          {/* Social Media */}
          {/* <div className="flex gap-4 items-center mt-6">
            <a
              href="https://facebook.com/belims"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white hover:text-belims-accent transition-colors"
              aria-label="Facebook"
            >
              <Facebook size={24} />
            </a>
            <a
              href="https://twitter.com/belims"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white hover:text-belims-accent transition-colors"
              aria-label="Twitter"
            >
              <Twitter size={24} />
            </a>
            <a
              href="https://instagram.com/belims"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white hover:text-belims-accent transition-colors"
              aria-label="Instagram"
            >
              <Instagram size={24} />
            </a>
            <a
              href="https://linkedin.com/company/belims"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white hover:text-belims-accent transition-colors"
              aria-label="LinkedIn"
            >
              <Linkedin size={24} />
            </a>
          </div> */}
        </div>

        {/* Footer Bottom */}
        <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-white/30 text-white text-xs md:text-sm">
          <p>&copy; 2025 Belims Hardware. All Rights Reserved.</p>
          <p className="mt-4 md:mt-0">
            Trusted tools & materials for every build
          </p>
        </div>
      </div>
    </footer>
  );
};
