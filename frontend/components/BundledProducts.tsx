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
  const maxBundleCount = 3;

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

  const formatMoney = (value: number) =>
    `${CURRENCY_SYMBOL}${value.toLocaleString("en-ZA", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

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
  bundleProducts = bundleProducts.slice(0, maxBundleCount);

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
  const progress = Math.min(totalCount / maxBundleCount, 1) * 100;

  const handleAddBundleToCart = () => {
    // Add main product plus all selected bundle items to cart
    addToCart(product);
    selectedBundleProducts.forEach((item) => {
      addToCart(item as any);
    });
  };

  return (
    <section className="py-10 bg-[#F5F691]">
      <div className="container mx-auto px-4">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {bundleProducts.map((item) => {
              const isSelected = selectedBundleItems.includes(item.id);

              return (
                <div
                  key={item.id}
                  className={`relative flex h-full w-full min-w-0 max-w-full flex-col overflow-hidden rounded-lg border bg-white transition-shadow ${
                    isSelected
                      ? "border-grey shadow-[0_6px_18px_rgba(16,24,40,0.08)]"
                      : "border-grey-light shadow-[0_1px_2px_rgba(16,24,40,0.06)] hover:shadow-[0_6px_18px_rgba(16,24,40,0.08)]"
                  }`}
                >
                  <div className="relative flex h-52 min-h-[260px] items-center justify-center rounded-lg bg-grey-light p-5">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        loading="lazy"
                        decoding="async"
                        className="absolute max-h-[165px] max-w-[160px] p-4 object-contain mix-blend-multiply"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center rounded bg-[#ECF0F1] text-sm text-[#565969]">
                        No image
                      </div>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col py-5 pb-0 px-1">
                    <div className="mb-2 text-[11px] font-semibold uppercase text-grey-medium">
                      {item.category || "Product"}
                    </div>
                    <div className="mb-2 min-h-[35px] line-clamp-2 font-heading text-base font-semibold leading-[1.35] text-grey">
                      {item.name}
                    </div>

                    <div className="mt-auto pb-4">
                      <span className="font-heading text-base font-bold text-red-muted">
                        {formatMoney(item.price || 0)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleBundleItem(item.id)}
                      className={`h-11 w-full rounded-full border text-sm font-semibold transition-colors ${
                        isSelected
                          ? "border-grey bg-grey text-white"
                          : "border-grey bg-white text-grey hover:bg-grey hover:text-white"
                      }`}
                    >
                      {isSelected ? "Added to Bundle" : "Add to Bundle"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <aside className="h-fit lg:sticky lg:top-6">
            <div className="rounded-2xl border-2 border-[#1f1f1f] bg-white p-6 shadow-sm">
              <div className="text-xl font-heading font-semibold text-gray-900">
                Bundle Contents
              </div>
              <p className="mt-1 text-sm text-[#565969]">
                Add {maxBundleCount} products and save 10%.
              </p>

              <div className="mt-4 h-2 w-full rounded-full bg-[#E6E6E6]">
                <div
                  className="h-full rounded-full bg-[#1f1f1f] transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="mt-6 space-y-5">
                {selectedBundleProducts.map((item) => (
                  <div key={item.id} className="flex items-start gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#F0F0F0]">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          loading="lazy"
                          decoding="async"
                          className="h-10 w-10 object-contain mix-blend-multiply"
                        />
                      ) : (
                        <span className="text-xs text-[#565969]">No image</span>
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="line-clamp-2 text-[14px] font-semibold text-gray-900">
                        {item.name}
                      </div>
                      <div className="mt-1 text-[14px] font-semibold text-[#D32A2A]">
                        {formatMoney(item.price || 0)}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleBundleItem(item.id)}
                      aria-label={`Remove ${item.name} from bundle`}
                      className="mt-1 text-[#565969] hover:text-[#1f1f1f]"
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M8 6v-2a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                        <line x1="10" y1="11" x2="10" y2="17" />
                        <line x1="14" y1="11" x2="14" y2="17" />
                      </svg>
                    </button>
                  </div>
                ))}

                {selectedBundleProducts.length < maxBundleCount &&
                  Array.from({
                    length: maxBundleCount - selectedBundleProducts.length,
                  }).map((_, index) => (
                    <div
                      key={`bundle-placeholder-${index}`}
                      className="flex items-start gap-4"
                    >
                      <div className="h-16 w-16 rounded-full bg-[#EDEDED]" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-3/4 rounded-full bg-[#E6E6E6]" />
                        <div className="h-3 w-1/2 rounded-full bg-[#E6E6E6]" />
                        <div className="h-3 w-2/3 rounded-full bg-[#E6E6E6]" />
                      </div>
                    </div>
                  ))}
              </div>

              <div className="mt-6 border-t border-[#E6E6E6] pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-[15px] font-semibold text-gray-900">
                    Total
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-semibold text-gray-900">
                      {formatMoney(discountedTotal)}
                    </span>
                    {savings > 0 && (
                      <span className="rounded border border-[#DF1119] px-2 py-0.5 text-[12px] font-semibold uppercase text-[#DF1119]">
                        Save: {formatMoney(savings)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddBundleToCart}
                className="mt-4 h-12 w-full rounded-full bg-[#1f1f1f] font-heading text-sm font-semibold text-white transition-colors hover:bg-[#111111]"
              >
                Add all to Cart
              </button>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
};
