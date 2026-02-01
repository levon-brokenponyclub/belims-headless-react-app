import React, { useEffect, useState } from "react";
import { Product } from "../types";
import { ProductCard } from "./ProductCard";
import { getRecentlyViewed } from "../services/storageService";
import { History } from "lucide-react";

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
    <section className="py-12 bg-white border-t border-gray-100 mb-8">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-2 mb-8">
          <History className="text-belims-blue" size={20} />
          <h3 className="text-2xl font-bold text-gray-900 font-heading">
            Recently Viewed
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {displayProducts.slice(0, 4).map((product) => (
            <div key={product.id}>
              <ProductCard
                product={product}
                addToCart={addToCart}
                onBuyNow={onBuyNow}
                onCompare={onCompare}
                isAuthenticated={isAuthenticated}
                isTradeApproved={isTradeApproved}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
