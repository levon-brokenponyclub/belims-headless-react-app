
import React, { useEffect, useState } from 'react';
import { Product } from '../types';
import { ProductCard } from './ProductCard';
import { getRecentlyViewed } from '../services/storageService';
import { History } from 'lucide-react';

interface RecentlyViewedProps {
  addToCart: (product: Product) => void;
  onBuyNow: (product: Product) => void;
  onProductClick: (product: Product) => void;
  onCompare?: (product: Product) => void;
  currentProductId?: string; // To exclude the currently viewed product from the list
}

export const RecentlyViewed: React.FC<RecentlyViewedProps> = ({ addToCart, onBuyNow, onProductClick, onCompare, currentProductId }) => {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const items = getRecentlyViewed();
    setProducts(items);
  }, [currentProductId]); // Reload when current product changes

  // Filter out the current product if we are on a single product page
  const displayProducts = currentProductId 
    ? products.filter(p => p.id !== currentProductId) 
    : products;

  if (displayProducts.length === 0) return null;

  return (
    <section className="py-8 bg-white border-t border-gray-100 mb-8">
      <div className="flex items-center gap-2 mb-6 px-1">
        <History className="text-belims-blue" size={20} />
        <h3 className="text-xl font-bold text-gray-900 font-heading">Recently Viewed</h3>
      </div>
      
      <div className="overflow-x-auto no-scrollbar pb-4 -mx-1 px-1">
        <div className="flex gap-4 min-w-max">
          {displayProducts.map(product => (
            <div key={product.id} className="w-[220px]">
              <ProductCard 
                product={product} 
                addToCart={addToCart}
                onBuyNow={onBuyNow} 
                onClick={onProductClick}
                onCompare={onCompare}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
