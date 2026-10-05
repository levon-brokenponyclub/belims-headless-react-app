import React, { useMemo } from "react";
import { Search } from "lucide-react";
import { Product, CategoryNode } from "../types";
import { ProductCard, PRODUCT_CARD_PRESETS } from "./ProductCard";
import { BRAND_LOGOS } from "./BrandStrip";

export interface SearchBrand {
  name: string;
  slug: string;
  count: number;
}

interface SearchResultsProps {
  searchResults: {
    categories: Array<{
      id: string;
      label: string;
      fullPath: string;
    }>;
    products: Product[];
  } | null;
  searchQuery: string;
  onViewAllResults: () => void;
  onCategorySelect: (categoryLabel: string) => void;
  /** All storefront brands (product_brand terms) — matched against the query */
  brands?: SearchBrand[];
  onBrandSelect?: (brandSlug: string) => void;
  onProductSelect: (product: Product) => void;
  addToCart: (product: Product) => void;
  onBuyNow: (product: Product) => void;
  onCompare?: (product: Product) => void;
  isAuthenticated?: boolean;
  isTradeApproved?: boolean;
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  searchResults,
  searchQuery,
  onViewAllResults,
  onCategorySelect,
  brands: allBrands = [],
  onBrandSelect,
  onProductSelect,
  addToCart,
  onBuyNow,
  onCompare,
  isAuthenticated = false,
  isTradeApproved = false,
}) => {
  if (!searchResults) return null;

  const displayProducts = searchResults.products.slice(0, 30);

  // Auto-generate suggestions based on search query and products
  const suggestions = useMemo(() => {
    if (!searchQuery.trim()) return [];

    const baseSuggestions = [searchQuery];

    // Add related product names that match
    const relatedNames = searchResults.products
      .slice(0, 4)
      .map((p) => p.name)
      .filter((name) => name.toLowerCase() !== searchQuery.toLowerCase());

    return [...baseSuggestions, ...relatedNames].slice(0, 5);
  }, [searchQuery, searchResults.products]);

  // Extract unique departments from categories
  const departments = useMemo(() => {
    const deptSet = new Set<string>();
    (searchResults.categories || []).forEach((cat) => {
      const parts = cat.fullPath.split(" / ");
      if (parts.length > 0) {
        deptSet.add(parts[0]);
      }
    });
    return Array.from(deptSet).slice(0, 10);
  }, [searchResults.categories]);

  // Brands whose name matches the query, then brands of the matched products
  const brands = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const bySlug = new Map(allBrands.map((b) => [b.slug, b]));
    const picked = new Map<string, SearchBrand>();
    if (query) {
      allBrands
        .filter((b) => b.name.toLowerCase().includes(query))
        .forEach((b) => picked.set(b.slug, b));
    }
    searchResults.products.forEach((product) => {
      const slug = product.brand_slug;
      if (!slug || picked.has(slug)) return;
      picked.set(slug, bySlug.get(slug) ?? { name: product.brand || slug, slug, count: 0 });
    });
    return Array.from(picked.values()).slice(0, 8);
  }, [allBrands, searchQuery, searchResults.products]);

  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 w-screen z-50 shadow-lg bg-white border-t border-gray-200"
      style={{ top: "calc(100% + 19px)", maxHeight: "calc(100vh - 160px)" }}
    >
      {/* Main Content */}
      <div className="w-full container mx-auto flex gap-6 py-6 h-full" style={{ maxHeight: "calc(100vh - 160px)" }}>
        {/* Left Column: Products (75%) */}
        <div className="flex-1 overflow-y-auto pr-2">
          {displayProducts.length > 0 ? (
            <>
              <h3 className="text-lg font-semibold text-text mb-4">
                Related Products
              </h3>
              <ul className="grid grid-cols-5 gap-4 mb-6">
                {displayProducts.map((product) => (
                  <li
                    key={product.id}
                    onClick={() => onProductSelect(product)}
                    className="cursor-pointer"
                  >
                    <ProductCard
                      product={product}
                      addToCart={addToCart}
                      onBuyNow={onBuyNow}
                      onCompare={onCompare}
                      className="h-full"
                      isAuthenticated={isAuthenticated}
                      isTradeApproved={isTradeApproved}
                      customizations={PRODUCT_CARD_PRESETS.searchCard}
                    />
                  </li>
                ))}
              </ul>

              <button
                type="button"
                className="group relative h-12 rounded-full border border-border bg-white px-14 pr-1 overflow-hidden transition-colors hover:border-border-strong hover:text-white"
                onClick={onViewAllResults}
              >
                <span className="absolute inset-0 origin-left scale-x-0 bg-surface-dark transition-transform duration-300 ease-out group-hover:scale-x-100"></span>
                <div className="relative z-10 flex items-center gap-3">
                  <span className="text-base mr-5 font-bold text-text transition-colors group-hover:text-white">
                    See all results
                  </span>
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-muted text-text transition-colors group-hover:bg-white">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="26"
                      height="26"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="lucide lucide-chevron-right"
                      aria-hidden="true"
                    >
                      <path d="m9 18 6-6-6-6"></path>
                    </svg>
                  </span>
                </div>
              </button>
            </>
          ) : (
            <div className="text-center py-12">
              <Search size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">No products found</p>
            </div>
          )}
        </div>

        {/* Right Column: Suggestions, Departments & Brands (25%) */}
        <div className="hidden lg:block w-72 pl-6 border-l border-gray-200 overflow-y-auto">
          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div className="mb-8">
              <h4 className="font-bold text-gray-900 mb-4 text-sm uppercase tracking-wide">
                Suggestions
              </h4>
              <div className="space-y-3">
                {suggestions.map((suggestion, idx) => (
                  <button
                    key={`${suggestion}-${idx}`}
                    type="button"
                    className="flex items-center gap-3 w-full text-left text-sm text-gray-700 hover:text-belims-accent transition-colors group"
                  >
                    <Search
                      size={16}
                      className="text-gray-400 group-hover:text-belims-accent flex-shrink-0"
                    />
                    <span className="truncate">{suggestion}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Departments */}
          {departments.length > 0 && (
            <div className="mb-8">
              <h4 className="font-bold text-gray-900 mb-4 text-sm uppercase tracking-wide">
                Departments
              </h4>
              <div className="space-y-2">
                {departments.map((dept) => (
                  <button
                    key={dept}
                    type="button"
                    onClick={() => onCategorySelect(dept)}
                    className="block w-full text-left text-sm text-gray-700 hover:text-belims-accent transition-colors"
                  >
                    {dept}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Brands */}
          {brands.length > 0 && (
            <div>
              <h4 className="font-bold text-gray-900 mb-4 text-sm uppercase tracking-wide">
                Brands
              </h4>
              <div className="space-y-2">
                {brands.map((brand) => {
                  const logo = BRAND_LOGOS[brand.slug];
                  return (
                    <button
                      key={brand.slug}
                      type="button"
                      onClick={() => onBrandSelect?.(brand.slug)}
                      className="flex items-center gap-3 w-full text-left text-sm text-gray-700 hover:text-belims-accent transition-colors"
                    >
                      <span className="flex h-8 w-14 flex-shrink-0 items-center justify-center rounded border border-gray-200 bg-white">
                        {logo ? (
                          <img src={logo} alt="" className="max-h-6 max-w-12 object-contain" />
                        ) : (
                          <span className="text-xs font-semibold text-gray-500">
                            {brand.name.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </span>
                      <span className="truncate">{brand.name}</span>
                      {brand.count > 0 && (
                        <span className="ml-auto text-xs text-gray-400">{brand.count}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
