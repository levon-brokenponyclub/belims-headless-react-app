import React, { useEffect, useState } from "react";
import { Product } from "../types";
import { ProductCard, PRODUCT_CARD_PRESETS } from "./ProductCard";
import { getRecentlyViewed } from "../services/storageService";
import { SectionHeading } from "./SectionHeading";

interface RecentlyViewedProps {
  addToCart: (product: Product) => void;
  onBuyNow: (product: Product) => void;
  onProductClick: (product: Product) => void;
  onCompare?: (product: Product) => void;
  currentProductId?: string; // To exclude the currently viewed product from the list
  isAuthenticated?: boolean;
  isTradeApproved?: boolean;
}

export const RecentlyViewed: React.FC<RecentlyViewedProps> = ({
  addToCart,
  onBuyNow,
  onProductClick,
  onCompare,
  currentProductId,
  isAuthenticated = false,
  isTradeApproved = false,
}) => {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const items = getRecentlyViewed();
    setProducts(items);
  }, [currentProductId]); // Reload when current product changes

  // Filter out the current product if we are on a single product page
  const displayProducts = currentProductId
    ? products.filter((p) => p.id !== currentProductId)
    : products;

  if (displayProducts.length === 0) return null;

  return (
    <section className="border-t border-border bg-white py-12" aria-labelledby="recently-viewed">
      <div className="container mx-auto px-4">
        <SectionHeading id="recently-viewed" eyebrow="Your history" title="Recently viewed" titleSize="h2" />

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5 lg:gap-5">
          {displayProducts.slice(0, 5).map((product) => (
            <div key={product.id}>
              <ProductCard
                product={product}
                addToCart={addToCart}
                onBuyNow={onBuyNow}
                onCompare={onCompare}
                isAuthenticated={isAuthenticated}
                isTradeApproved={isTradeApproved}
                customizations={PRODUCT_CARD_PRESETS.railCard}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
