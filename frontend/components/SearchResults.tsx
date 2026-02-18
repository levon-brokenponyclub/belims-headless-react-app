import React, { useMemo } from "react";
import { Search, ArrowRight } from "lucide-react";
import { Product, CategoryNode } from "../types";
import { ProductCard, PRODUCT_CARD_PRESETS } from "./ProductCard";

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
  onProductSelect,
  addToCart,
  onBuyNow,
  onCompare,
  isAuthenticated = false,
  isTradeApproved = false,
}) => {
  if (!searchResults) return null;

  const displayProducts = searchResults.products.slice(0, 10).slice(0, 5);

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

  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 w-screen z-50 shadow-lg bg-white border-t border-gray-200"
      style={{ top: "calc(100% + 19px)" }}
    >
      {/* Main Content */}
      <div className="w-full container mx-auto flex gap-6 py-6">
        {/* Left Column: Products (75%) */}
        <div className="flex-1">
          {displayProducts.length > 0 ? (
            <>
              <h3 className="text-lg font-bold text-gray-900 mb-4">
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
                onClick={onViewAllResults}
                className="inline-flex items-center gap-2 px-6 py-3 bg-belims-accent text-white font-bold rounded-lg hover:bg-opacity-90 transition-colors"
              >
                See all results
                <ArrowRight size={16} />
              </button>
            </>
          ) : (
            <div className="text-center py-12">
              <Search size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">No products found</p>
            </div>
          )}
        </div>

        {/* Right Column: Suggestions & Departments (25%) */}
        <div className="hidden lg:block w-72 pl-6 border-l border-gray-200">
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
            <div>
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
        </div>
      </div>
    </div>
  );
};
