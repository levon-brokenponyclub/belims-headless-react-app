import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Product } from "../types";
import { isProductPurchasable } from "../utils/price";
import { buildProductUrl } from "../utils/product";
import { ProductCard, PRODUCT_CARD_PRESETS } from "./ProductCard";
import { SkeletonProductCard } from "./Skeleton";
import { SectionHeading } from "./SectionHeading";
import { CategoryFeature, CategoryFeatureConfig } from "./CategoryFeature";

type DealTabKey = "deal_of_day" | "weekly" | "trade_deals";

const DEAL_TABS: { key: DealTabKey; label: string; description: string }[] = [
  {
    key: "deal_of_day",
    label: "Daily deals",
    description: "Fresh discounts daily. New savings every morning.",
  },
  {
    key: "weekly",
    label: "Weekly deals",
    description: "Weekly savings across selected products.",
  },
  {
    key: "trade_deals",
    label: "Trade deals",
    description: "Exclusive trade pricing for approved trade accounts.",
  },
];

const SPOTLIGHT: CategoryFeatureConfig = {
  slug: "hand-tools",
  title: "Hand tools",
  description: "Built for daily use on site and at home.",
  image: "/images/development/athens-mosaic-06.webp",
  imageWidth: 1420,
};

const MAX_DEALS = 6;

interface DealsSectionProps {
  products: Product[];
  isLoadingProducts?: boolean;
  addToCart: (product: Product) => void;
  onBuyNow: (product: Product) => void;
  onCompare: (product: Product) => void;
  isAuthenticated?: boolean;
  isTradeApproved?: boolean;
}

export const DealsSection: React.FC<DealsSectionProps> = ({
  products,
  isLoadingProducts = false,
  addToCart,
  onBuyNow,
  onCompare,
  isAuthenticated = false,
  isTradeApproved = false,
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<DealTabKey>("deal_of_day");
  const activeTabConfig = DEAL_TABS.find((tab) => tab.key === activeTab)!;

  const tabProducts = useMemo(() => {
    const filtered = products.filter((product) => {
      // Never surface backorder or zero-price products in deal slots
      if (!isProductPurchasable(product)) return false;

      const consumerType = product.deals_resolved?.consumer?.bestDeal?.type;
      const tradeType = product.deals_resolved?.trade?.bestDeal?.type;

      if (activeTab === "deal_of_day") {
        return consumerType === "deal_of_day";
      }

      if (activeTab === "weekly") {
        return consumerType === "weekly_special";
      }

      if (activeTab === "trade_deals") {
        return tradeType === "trade_special";
      }

      if (tradeType || consumerType) return true;

      return (
        (product.sale_price && parseFloat(String(product.sale_price)) > 0) ||
        product.isFeatured
      );
    });

    return filtered.slice(0, MAX_DEALS);
  }, [activeTab, products]);

  return (
    <section className="w-full bg-belims-blue py-10 md:py-14" aria-labelledby="home-deals-title">
      <div className="container mx-auto px-4">
        <SectionHeading id="home-deals-title" eyebrow="Save more" title="Shop deals" tone="inverse">
          <div className="flex gap-6 overflow-x-auto no-scrollbar" role="tablist">
            {DEAL_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`h-11 shrink-0 whitespace-nowrap border-b-2 text-lg font-semibold transition-colors ${
                  activeTab === tab.key
                    ? "border-primary text-white"
                    : "border-transparent text-white/60 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </SectionHeading>

        <p className="-mt-2 mb-5 text-base text-white/75" aria-live="polite">
          {activeTabConfig.description}
        </p>

        <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
          <CategoryFeature feature={SPOTLIGHT} />

          {isLoadingProducts ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
              {Array.from({ length: MAX_DEALS }).map((_, index) => (
                <SkeletonProductCard key={`deals-skel-${index}`} className="w-full" />
              ))}
            </div>
          ) : tabProducts.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
              {tabProducts.map((product) => (
                <div
                  key={product.id}
                  className="min-w-0"
                  onClick={() => navigate(buildProductUrl(product))}
                >
                  <ProductCard
                    product={product}
                    addToCart={addToCart}
                    onBuyNow={onBuyNow}
                    onCompare={onCompare}
                    isAuthenticated={isAuthenticated}
                    isTradeApproved={isTradeApproved}
                    className="h-full"
                    customizations={PRODUCT_CARD_PRESETS.compactCard}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex min-h-[220px] flex-col items-center justify-center rounded-md border border-dashed border-border bg-surface p-6 text-center">
              <p className="font-heading text-h5 font-bold text-text">
                No {activeTabConfig.label.toLowerCase()} right now
              </p>
              <p className="mt-1 text-base text-text-secondary">
                Check back soon, or browse the full range.
              </p>
              <Link
                to="/shop"
                className="mt-4 inline-flex h-12 items-center rounded-md border border-border-strong px-6 font-heading text-button uppercase font-condensed tracking-wide text-belims-blue transition-colors hover:bg-surface-dark hover:text-white"
              >
                Browse all products
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
