import React, { useState, useEffect } from "react";
import { Product } from "../types";
import { CURRENCY_SYMBOL } from "../constants";

interface BundleProduct {
  id: string;
  name: string;
  price: number;
  image: string;
  stock?: number;
  category?: string;
}

interface BundledProductsProps {
  product: Product;
  allProducts: Product[];
  addToCart: (product: Product) => void;
}

export const BundledProducts: React.FC<BundledProductsProps> = ({
  product,
  allProducts,
  addToCart,
}) => {
  const [selectedBundleItems, setSelectedBundleItems] = useState<string[]>([]);

  // Reset bundle selection when product changes
  useEffect(() => {
    setSelectedBundleItems([]);
  }, [product.id]);

  // Calculate discount based on number of items selected
  const getDiscount = (count: number) => {
    if (count === 1) return 0.03;
    if (count === 2) return 0.05;
    if (count >= 3) return 0.1;
    return 0;
  };

  const toggleBundleItem = (id: string) => {
    setSelectedBundleItems((prev) => {
      if (prev.includes(id)) {
        return prev.filter((itemId) => itemId !== id);
      }
      return [...prev, id];
    });
  };

  // Determine bundle products
  let bundleProducts: BundleProduct[] = product.bundleCandidates || [];

  // Hardcoded test data for product 1856
  if (product.id === "1856" && allProducts.length > 0) {
    bundleProducts = allProducts
      .filter((p) => p.id === "1276" || p.id === "1301" || p.id === "1304")
      .map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        image: p.image,
        stock: p.stock,
        category: p.category,
      }));
  }

  // Limit to a maximum of three bundle products
  bundleProducts = bundleProducts.slice(0, 3);

  // Don't render if no bundle products
  if (!bundleProducts || bundleProducts.length === 0) {
    return null;
  }

  const selectedBundleProducts = bundleProducts.filter((item) =>
    selectedBundleItems.includes(item.id),
  );

  // Always include main product price in total
  const mainProductPrice = product.price || 0;
  const bundleItemsTotal = selectedBundleProducts.reduce(
    (sum, item) => sum + (item.price || 0),
    0,
  );
  const originalTotal = mainProductPrice + bundleItemsTotal;

  const totalCount = selectedBundleItems.length;
  const discount = getDiscount(totalCount);
  const discountedTotal = originalTotal * (1 - discount);
  const savings = originalTotal - discountedTotal;

  const handleAddBundleToCart = () => {
    // Add main product plus all selected bundle items to cart
    addToCart(product);
    selectedBundleProducts.forEach((item) => {
      addToCart(item as any);
    });
  };

  return (
    <section className="p-0">
      <div className="container mx-auto px-0">
        <div className="w-full mx-auto relative">
          {/* <h3 className="text-2xl font-bold text-gray-900 font-heading mb-8 text-center">
            Buy more & save
          </h3> */}
          {discount > 0 && (
            <div className="bg-red-500 z-30 text-white text-sm font-bold px-4 py-2 rounded absolute top-3 left-3">
              {(discount * 100).toFixed(0)}% Discount
            </div>
          )}
          <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-4">
            {/* Products Row */}
            <div className="flex items-center justify-center gap-3 mb-6 flex-wrap">
              {/* Bundle Items */}
              {bundleProducts.map((item, index) => (
                <React.Fragment key={item.id}>
                  {index > 0 && (
                    <div className="text-2xl font-bold text-gray-400">+</div>
                  )}
                  <div
                    onClick={() => toggleBundleItem(item.id)}
                    className={`relative flex flex-col w-[155px] rounded border bg-white transition-all cursor-pointer ${
                      selectedBundleItems.includes(item.id)
                        ? "border-belims-blue ring-2 ring-belims-blue ring-opacity-50"
                        : "border-[#E0E0E0] hover:shadow-[0_6px_18px_rgba(16,24,40,0.08)]"
                    }`}
                  >
                    {/* Selection Indicator */}
                    {selectedBundleItems.includes(item.id) && (
                      <div className="absolute top-3 right-3 z-10 w-6 h-6 bg-belims-blue rounded-full flex items-center justify-center shadow-md">
                        <svg
                          className="w-4 h-4 text-white"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    )}

                    {/* Image */}
                    <div className="flex items-center justify-center bg-[#F9F9F9] h-22 p-4">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="max-h-full max-w-full object-contain mix-blend-multiply"
                        loading="lazy"
                        decoding="async"
                      />
                    </div>

                    {/* Content */}
                    <div className="flex flex-col p-3">
                      {/* Category */}
                      {/* <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#565969]">
                        {item.category || "PRODUCT"}
                      </div> */}

                      {/* Title */}
                      <div className="line-clamp-2 font-heading font-semibold leading-[1.35] text-gray-900 hover:underline text-[12px] min-h-[45px] mt-0">
                        {item.name}
                      </div>

                      {/* Price */}
                      <div className="mt-auto">
                        <div className="font-heading text-[15px] font-bold text-[#04223E]">
                          {CURRENCY_SYMBOL}
                          {item.price?.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              ))}
            </div>

            {/* Discount Badge & Pricing */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-6 border-t border-gray-200">
              <div className="gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-gray-600">Total:</span>
                  <span className="text-2xl font-bold text-gray-900">
                    {CURRENCY_SYMBOL}
                    {discountedTotal.toFixed(2)}
                  </span>
                  {discount > 0 && (
                    <span className="text-lg text-gray-400 line-through">
                      {CURRENCY_SYMBOL}
                      {originalTotal.toFixed(2)}
                    </span>
                  )}
                </div>
                {discount > 0 && (
                  <div className="mt-0 text-left text-sm text-gray-600">
                    Discount: {CURRENCY_SYMBOL}
                    {savings.toFixed(2)}
                  </div>
                )}
              </div>

              <button
                onClick={handleAddBundleToCart}
                className="bg-white border-2 border-gray-300 text-gray-900 font-bold px-6 py-3 rounded-lg hover:border-belims-blue hover:text-belims-blue transition-all whitespace-nowrap"
              >
                Add bundle to cart
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
