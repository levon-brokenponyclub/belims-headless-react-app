import React from "react";
import { ArrowRight } from "lucide-react";

interface HeroCard {
  title: string;
  kicker: string;
  subtitle: string;
  list: string[];
  primaryBtn: string;
  secondaryBtn: string;
  image: string;
  href: string;
  isPro?: boolean;
}

interface TrustItem {
  icon: string;
  label: string;
}

const HeroBanner: React.FC = () => {
  const heroCards: HeroCard[] = [
    {
      title: "Build. Fix. Upgrade.",
      kicker: "Home Improvement",
      subtitle: "Tools, materials & supplies for every job — big or small.",
      list: [
        "DIY Essentials",
        "Bathroom Makeovers",
        "Interior & Exterior Paint",
      ],
      primaryBtn: "Shop DIY",
      secondaryBtn: "Browse categories",
      image: "/images/hero/diy.jpg",
      href: "/shop",
      isPro: false,
    },
    {
      title: "Built for Contractors",
      kicker: "Pro & Trade Deals",
      subtitle: "Bulk pricing, site delivery & exclusive trade-only deals.",
      list: ["Tools & Machinery", "Fasteners & Adhesives", "Building Supplies"],
      primaryBtn: "Shop Trade",
      secondaryBtn: "See contractor benefits",
      image: "/images/hero/trade.jpg",
      href: "/pro",
      isPro: true,
    },
  ];

  const trustItems: TrustItem[] = [
    { icon: "🚚", label: "Fast Delivery" },
    { icon: "📦", label: "Bulk Pricing" },
    { icon: "✔️", label: "Trusted Brands" },
    { icon: "🎧", label: "Dedicated Support" },
  ];

  return (
    <section
      className="hero hero--split w-full py-14 bg-gray-50"
      aria-label="Primary entry"
    >
      <div className="container mx-auto px-4">
        {/* Hero Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {heroCards.map((card, index) => (
            <a
              key={index}
              href={card.href}
              className="hero-card relative overflow-hidden rounded-lg h-96 flex flex-col justify-between p-8 text-white"
              style={{
                backgroundImage: `url('${card.image}')`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
              aria-label={`Shop ${card.kicker}`}
            >
              {/* Background overlay */}
              <div
                className="absolute inset-0 bg-black/40"
                aria-hidden="true"
              ></div>

              {/* Content */}
              <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                  <span className="hero-kicker text-sm font-semibold text-orange-300 mb-2 block">
                    {card.kicker}
                  </span>
                  <h2 className="hero-title text-4xl font-bold mb-3 leading-tight">
                    {card.title}
                  </h2>
                  <p className="hero-sub text-lg mb-1">{card.subtitle}</p>

                  {/* List */}
                  <ul className="hero-list mb-6 space-y-2">
                    {card.list.map((item, i) => (
                      <li key={i} className="text-sm font-medium">
                        • {item}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Actions */}
                <div className="hero-actions flex gap-4">
                  <button
                    className={`px-6 py-2 rounded font-bold text-sm transition-colors ${
                      card.isPro
                        ? "bg-belims-accent hover:bg-red-600 text-white"
                        : "bg-belims-blue hover:bg-belims-accent text-white"
                    }`}
                  >
                    {card.primaryBtn}
                  </button>
                  <button className="px-6 py-2 rounded font-bold text-sm border-2 border-white hover:bg-white/10 transition-colors">
                    {card.secondaryBtn}
                  </button>
                </div>

                {/* Trade CTA */}
                {card.isPro && (
                  <div className="hero-trade-cta mt-6 border-t border-white/30 pt-4 flex justify-between items-center">
                    <span className="hero-trade-note text-sm block mb-2">
                      Trade pricing available after registration.
                    </span>
                    <div className="hero-trade-links space-y-1">
                      <div className="link-cta text-sm font-semibold hover:underline cursor-pointer">
                        Register for Trade Deals →
                      </div>
                      {/* <div className="link-muted text-sm text-gray-200 hover:underline cursor-pointer">
                        Already trade? Shop Trade →
                      </div> */}
                    </div>
                  </div>
                )}
              </div>
            </a>
          ))}
        </div>

        {/* Trust Row */}
        <div className="hero-trust w-full grid grid-cols-2 md:grid-cols-4 gap-4 py-8 border-t border-b border-gray-200">
          {trustItems.map((item, index) => (
            <div
              key={index}
              className="trust-item flex items-center justify-center gap-3"
              aria-label={item.label}
            >
              <span className="trust-ic text-2xl" aria-hidden="true">
                {item.icon}
              </span>
              <span className="trust-txt font-semibold text-sm text-gray-900">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HeroBanner;
