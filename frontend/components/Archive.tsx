import React, { useState, useMemo, useEffect } from "react";
import { Product, CategoryNode } from "../types";
import { ProductCard } from "./ProductCard";
import { Filter, ChevronDown, ChevronRight, Search, X } from "lucide-react";
import { CATEGORY_TREE } from "../categoryTree";
import { getApiBaseUrl } from "../services/wooCommerceService";

interface FilterOption {
  id: number;
  slug: string;
  name: string;
  count: number;
}

interface ArchiveProps {
  products: Product[];
  category?: string; // The selected category slug or name
  brand?: string; // The selected brand
  searchQuery?: string;
  addToCart: (product: Product) => void;
  onBuyNow: (product: Product) => void;
  onCompare: (product: Product) => void;
}

export const Archive: React.FC<ArchiveProps> = ({
  products,
  category,
  brand,
  searchQuery,
  addToCart,
  onBuyNow,
  onCompare,
}) => {
  const [sortBy, setSortBy] = useState<
    "featured" | "price-asc" | "price-desc" | "name"
  >("featured");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Additional local filters
  const [filterInStock, setFilterInStock] = useState(false);
  const [filterOnSale, setFilterOnSale] = useState(false);
  const [selectedRanges, setSelectedRanges] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);

  // Filter data from API
  const [rangeFilters, setRangeFilters] = useState<FilterOption[]>([]);
  const [colorFilters, setColorFilters] = useState<FilterOption[]>([]);

  // Fetch filters from API
  useEffect(() => {
    const fetchFilters = async () => {
      const apiBase = getApiBaseUrl();
      try {
        const response = await fetch(`${apiBase}/products/filters`);
        if (!response.ok) {
          const body = await response.text();
          throw new Error(
            `HTTP ${response.status} ${response.statusText}: ${body.slice(0, 200)}`,
          );
        }
        const data = await response.json();
        setRangeFilters(data.range || []);
        setColorFilters(data.color || []);
      } catch (error) {
        console.error("Failed to fetch product filters:", error);
      }
    };
    fetchFilters();
  }, []);

  // Dynamic Facet Data
  const uniqueBrands = useMemo(() => {
    const brands = new Set<string>();
    products.forEach((p) => {
      if (p.brand) brands.add(p.brand);
    });
    return Array.from(brands).sort();
  }, [products]);

  const [selectedFacetBrands, setSelectedFacetBrands] = useState<string[]>([]);

  // Helper to get all subcategories recursively
  const getCategoryMatches = (
    rootLabel: string,
    nodes: CategoryNode[],
  ): string[] => {
    let matches: string[] = [];

    for (const node of nodes) {
      if (node.label.toLowerCase() === rootLabel.toLowerCase()) {
        // Found the root, collect all its children recursively
        matches.push(node.label);
        const collectChildren = (n: CategoryNode) => {
          if (n.children) {
            n.children.forEach((child) => {
              matches.push(child.label);
              collectChildren(child);
            });
          }
        };
        collectChildren(node);
        return matches;
      }

      // If not found at this level, check children
      if (node.children) {
        const childMatches = getCategoryMatches(rootLabel, node.children);
        if (childMatches.length > 0) {
          return childMatches;
        }
      }
    }
    return matches;
  };

  // Filter Logic
  const filteredProducts = useMemo(() => {
    let filtered = [...products];

    // 1. Filter by Category (Recursive)
    if (category) {
      const validCategories = getCategoryMatches(category, CATEGORY_TREE);
      if (validCategories.length > 0) {
        filtered = filtered.filter(
          (p) =>
            validCategories.some(
              (cat) => p.category.toLowerCase() === cat.toLowerCase(),
            ) || p.category.toLowerCase().includes(category.toLowerCase()),
        );
      } else {
        filtered = filtered.filter((p) =>
          p.category.toLowerCase().includes(category.toLowerCase()),
        );
      }
    }

    // 2. Filter by Brand (Prop)
    if (brand) {
      filtered = filtered.filter(
        (p) => p.brand && p.brand.toLowerCase() === brand.toLowerCase(),
      );
    }

    // 2.5 Filter by Facet Brands (Local)
    if (selectedFacetBrands.length > 0) {
      filtered = filtered.filter(
        (p) => p.brand && selectedFacetBrands.includes(p.brand),
      );
    }

    // 3. Filter by Search Query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query) ||
          p.sku.toLowerCase().includes(query),
      );
    }

    // 4. Filter by Price
    filtered = filtered.filter(
      (p) => p.price >= priceRange[0] && p.price <= priceRange[1],
    );

    // 4.5 Additional Facets
    if (filterInStock) {
      filtered = filtered.filter((p) => p.stock > 0);
    }

    // 5. Sort
    switch (sortBy) {
      case "price-asc":
        filtered.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        filtered.sort((a, b) => b.price - a.price);
        break;
      case "name":
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        break;
    }

    return filtered;
  }, [
    products,
    category,
    brand,
    searchQuery,
    priceRange,
    sortBy,
    filterInStock,
    selectedFacetBrands,
  ]);

  // Get min/max price for slider
  const maxPrice = useMemo(() => {
    return Math.max(...products.map((p) => p.price), 1000);
  }, [products]);

  const title = brand
    ? `${brand} Products`
    : category
      ? category
      : searchQuery
        ? `Search: "${searchQuery}"`
        : "All Products";

  const toggleBrand = (b: string) => {
    if (selectedFacetBrands.includes(b)) {
      setSelectedFacetBrands((prev) => prev.filter((x) => x !== b));
    } else {
      setSelectedFacetBrands((prev) => [...prev, b]);
    }
  };

  const toggleRange = (r: string) => {
    if (selectedRanges.includes(r)) {
      setSelectedRanges((prev) => prev.filter((x) => x !== r));
    } else {
      setSelectedRanges((prev) => [...prev, r]);
    }
  };

  const toggleColor = (c: string) => {
    if (selectedColors.includes(c)) {
      setSelectedColors((prev) => prev.filter((x) => x !== c));
    } else {
      setSelectedColors((prev) => [...prev, c]);
    }
  };

  return (
    <div className="shopify-section section-collection-template bg-white">
      {/* Breadcrumb Section */}
      <nav
        className="border-b border-gray-200 bg-gray-50 mb-8"
        aria-label="Breadcrumb"
      >
        <div className="container mx-auto px-4 py-3">
          <ol className="flex items-center space-x-2 text-sm text-gray-500">
            <li>
              <a
                href="#"
                className="hover:text-belims-accent transition-colors"
              >
                Home
              </a>
            </li>
            <li>
              <ChevronRight size={14} />
            </li>
            {brand && (
              <>
                <li>
                  <span className="font-medium text-gray-900">{brand}</span>
                </li>
              </>
            )}
            {category && (
              <>
                <li>
                  <span className="font-medium text-gray-900">{category}</span>
                </li>
              </>
            )}
            {!category && !brand && (
              <li>
                <span className="font-medium text-gray-900">Shop</span>
              </li>
            )}
          </ol>
        </div>
      </nav>

      <div className="container mx-auto px-4 pb-12">
        {/* Main Collection Text & Image (Hero) */}
        <div className="collection-hero flex flex-col md:flex-row items-center gap-8 mb-12 bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm">
          <div className="flex-1 p-8 md:p-12">
            <h1 className="text-3xl md:text-5xl font-bold text-gray-900 font-heading mb-4 capitalize">
              {title}
            </h1>
            <p className="text-gray-600 text-lg max-w-2xl leading-relaxed">
              {brand
                ? `Explore our premium selection of ${brand} tools and equipment. Designed for professionals.`
                : `Browse our extensive collection of ${title.toLowerCase()}. Find the perfect tools for your next project.`}
            </p>
          </div>
          <div className="w-full md:w-1/3 h-48 md:h-64 bg-gray-100 flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200"></div>
            <div className="relative z-10 text-gray-400 font-heading text-6xl opacity-20 transform -rotate-12 select-none">
              BELIMS
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Facet Filters Sidebar */}
          <aside className="hidden lg:block w-72 flex-shrink-0">
            <div className="sticky top-24 pr-4">
              <h2 className="text-lg font-bold mb-6 font-heading flex items-center gap-2">
                <Filter size={20} /> Filters
              </h2>

              <form className="facet-filters-form space-y-6">
                {/* Availability Filter */}
                <div className="border-b border-gray-200 pb-6">
                  <details className="group" open>
                    <summary className="flex justify-between items-center cursor-pointer list-none text-gray-900 font-medium mb-4">
                      <span>Availability</span>
                      <span className="transition group-open:rotate-180">
                        <ChevronDown size={16} />
                      </span>
                    </summary>
                    <div className="space-y-3 pt-2">
                      <label className="flex items-center space-x-3 cursor-pointer group/item">
                        <div className="relative flex items-start">
                          <input
                            type="checkbox"
                            className="peer h-5 w-5 rounded border-gray-300 text-belims-accent focus:ring-belims-accent"
                            checked={filterInStock}
                            onChange={(e) => setFilterInStock(e.target.checked)}
                          />
                        </div>
                        <span className="text-gray-600 group-hover/item:text-gray-900 transition-colors">
                          In Stock
                        </span>
                        <span className="text-gray-400 text-sm ml-auto">
                          ({products.filter((p) => p.stock > 0).length})
                        </span>
                      </label>
                      <label className="flex items-center space-x-3 cursor-pointer group/item">
                        <div className="relative flex items-start">
                          <input
                            type="checkbox"
                            className="peer h-5 w-5 rounded border-gray-300 text-belims-accent focus:ring-belims-accent"
                            checked={filterOnSale}
                            onChange={(e) => setFilterOnSale(e.target.checked)}
                          />
                        </div>
                        <span className="text-gray-600 group-hover/item:text-gray-900 transition-colors">
                          On Sale
                        </span>
                      </label>
                    </div>
                  </details>
                </div>

                {/* Price Filter */}
                <div className="border-b border-gray-200 pb-6">
                  <details className="group" open>
                    <summary className="flex justify-between items-center cursor-pointer list-none text-gray-900 font-medium mb-4">
                      <span>Price</span>
                      <span className="transition group-open:rotate-180">
                        <ChevronDown size={16} />
                      </span>
                    </summary>
                    <div className="pt-2 px-1">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-[45%]">
                          <label className="text-xs text-gray-500 mb-1 block">
                            Min Price
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                              R
                            </span>
                            <input
                              type="number"
                              className="w-full pl-7 px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:border-belims-accent"
                              value={priceRange[0]}
                              onChange={(e) =>
                                setPriceRange([
                                  parseInt(e.target.value) || 0,
                                  priceRange[1],
                                ])
                              }
                            />
                          </div>
                        </div>
                        <div className="text-gray-400 mt-5">-</div>
                        <div className="w-[45%]">
                          <label className="text-xs text-gray-500 mb-1 block">
                            Max Price
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                              R
                            </span>
                            <input
                              type="number"
                              className="w-full pl-7 px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:border-belims-accent"
                              value={priceRange[1]}
                              onChange={(e) =>
                                setPriceRange([
                                  priceRange[0],
                                  parseInt(e.target.value) || maxPrice,
                                ])
                              }
                            />
                          </div>
                        </div>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max={maxPrice}
                        value={priceRange[1]}
                        onChange={(e) =>
                          setPriceRange([
                            priceRange[0],
                            parseInt(e.target.value),
                          ])
                        }
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-belims-accent"
                      />
                    </div>
                  </details>
                </div>

                {/* Brand Filter (Dynamic) */}
                {uniqueBrands.length > 0 && !brand && (
                  <div className="border-b border-gray-200 pb-6">
                    <details className="group">
                      <summary className="flex justify-between items-center cursor-pointer list-none text-gray-900 font-medium mb-4">
                        <span>Brand</span>
                        <span className="transition group-open:rotate-180">
                          <ChevronDown size={16} />
                        </span>
                      </summary>
                      <div className="space-y-3 pt-2 max-h-48 overflow-y-auto">
                        {uniqueBrands.map((b) => (
                          <label
                            key={b}
                            className="flex items-center space-x-3 cursor-pointer group/item"
                          >
                            <div className="relative flex items-start">
                              <input
                                type="checkbox"
                                className="peer h-5 w-5 rounded border-gray-300 text-belims-accent focus:ring-belims-accent"
                                checked={selectedFacetBrands.includes(b)}
                                onChange={() => toggleBrand(b)}
                              />
                            </div>
                            <span className="text-gray-600 group-hover/item:text-gray-900 transition-colors">
                              {b}
                            </span>
                          </label>
                        ))}
                      </div>
                    </details>
                  </div>
                )}

                {/* Range Filter */}
                {rangeFilters.length > 0 && (
                  <div className="border-b border-gray-200 pb-6">
                    <details className="group" open>
                      <summary className="flex justify-between items-center cursor-pointer list-none text-gray-900 font-medium mb-4">
                        <span>Range</span>
                        <span className="transition group-open:rotate-180">
                          <ChevronDown size={16} />
                        </span>
                      </summary>
                      <div className="space-y-3 pt-2 max-h-48 overflow-y-auto">
                        {rangeFilters.map((r) => (
                          <label
                            key={r.slug}
                            className="flex items-center space-x-3 cursor-pointer group/item"
                          >
                            <div className="relative flex items-start">
                              <input
                                type="checkbox"
                                className="peer h-5 w-5 rounded border-gray-300 text-belims-accent focus:ring-belims-accent"
                                checked={selectedRanges.includes(r.slug)}
                                onChange={() => toggleRange(r.slug)}
                              />
                            </div>
                            <span className="text-gray-600 group-hover/item:text-gray-900 transition-colors">
                              {r.name}
                            </span>
                            <span className="text-gray-400 text-sm ml-auto">
                              ({r.count})
                            </span>
                          </label>
                        ))}
                      </div>
                    </details>
                  </div>
                )}

                {/* Color Filter */}
                {colorFilters.length > 0 && (
                  <div className="border-b border-gray-200 pb-6">
                    <details className="group" open>
                      <summary className="flex justify-between items-center cursor-pointer list-none text-gray-900 font-medium mb-4">
                        <span>Color</span>
                        <span className="transition group-open:rotate-180">
                          <ChevronDown size={16} />
                        </span>
                      </summary>
                      <div className="space-y-3 pt-2 max-h-48 overflow-y-auto">
                        {colorFilters.map((c) => (
                          <label
                            key={c.slug}
                            className="flex items-center space-x-3 cursor-pointer group/item"
                          >
                            <div className="relative flex items-start">
                              <input
                                type="checkbox"
                                className="peer h-5 w-5 rounded border-gray-300 text-belims-accent focus:ring-belims-accent"
                                checked={selectedColors.includes(c.slug)}
                                onChange={() => toggleColor(c.slug)}
                              />
                            </div>
                            <span className="text-gray-600 group-hover/item:text-gray-900 transition-colors">
                              {c.name}
                            </span>
                            <span className="text-gray-400 text-sm ml-auto">
                              ({c.count})
                            </span>
                          </label>
                        ))}
                      </div>
                    </details>
                  </div>
                )}
              </form>
            </div>
          </aside>

          {/* Main Product Grid */}
          <div className="flex-1">
            {/* Toolbar */}
            <div className="flex flex-wrap gap-4 justify-between items-center mb-8 pb-4 border-b border-gray-200">
              <div className="text-gray-500">
                <span className="font-medium text-gray-900">
                  {filteredProducts.length}
                </span>{" "}
                products
              </div>

              <div className="flex items-center gap-4">
                <button
                  className="lg:hidden flex items-center gap-2 font-bold text-gray-700 border border-gray-300 px-4 py-2 rounded-md hover:bg-gray-50"
                  onClick={() => setMobileFiltersOpen(true)}
                >
                  <Filter size={18} /> Filters
                </button>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 hidden sm:inline">
                    Sort by:
                  </span>
                  <div className="relative">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="appearance-none bg-transparent border-none py-2 pl-2 pr-8 text-gray-900 font-medium focus:ring-0 cursor-pointer text-sm"
                    >
                      <option value="featured">Featured</option>
                      <option value="price-asc">Price: Low to High</option>
                      <option value="price-desc">Price: High to Low</option>
                      <option value="name">Name: A-Z</option>
                    </select>
                    <ChevronDown
                      size={14}
                      className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Grid */}
            {filteredProducts.length > 0 ? (
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredProducts.map((product) => (
                  <li key={product.id} className="grid__item">
                    <ProductCard
                      product={product}
                      addToCart={addToCart}
                      onBuyNow={onBuyNow}
                      onCompare={onCompare}
                      className="product-card h-full"
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-24 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                <Search size={48} className="mx-auto text-gray-300 mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  No products found
                </h3>
                <p className="text-gray-500 mb-6">
                  Try adjusting your filters or search query.
                </p>
                <button
                  onClick={() => {
                    setPriceRange([0, maxPrice]);
                    setSortBy("featured");
                    setFilterInStock(false);
                    setSelectedFacetBrands([]);
                  }}
                  className="px-6 py-2 bg-black text-white rounded-md font-medium hover:bg-gray-800 transition-colors"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filters Modal */}
      {mobileFiltersOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-end"
          onClick={() => setMobileFiltersOpen(false)}
        >
          <div
            className="w-full max-w-xs bg-white h-full shadow-2xl p-6 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6 pt-2">
              <h3 className="font-bold text-xl font-heading">Filters</h3>
              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-8">
              {/* Mobile Price */}
              <div>
                <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-gray-500">
                  Price
                </h4>
                <div className="flex gap-4 mb-4">
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    placeholder="Min"
                    value={priceRange[0]}
                    onChange={(e) =>
                      setPriceRange([
                        parseInt(e.target.value) || 0,
                        priceRange[1],
                      ])
                    }
                  />
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    placeholder="Max"
                    value={priceRange[1]}
                    onChange={(e) =>
                      setPriceRange([
                        priceRange[0],
                        parseInt(e.target.value) || maxPrice,
                      ])
                    }
                  />
                </div>
              </div>

              {/* Mobile Availability */}
              <div>
                <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-gray-500">
                  Availability
                </h4>
                <label className="flex items-center space-x-3 mb-3">
                  <input
                    type="checkbox"
                    className="h-5 w-5 rounded border-gray-300 text-belims-accent focus:ring-belims-accent"
                    checked={filterInStock}
                    onChange={(e) => setFilterInStock(e.target.checked)}
                  />
                  <span>In Stock Only</span>
                </label>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-100">
              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="w-full bg-belims-accent text-white py-3 rounded-lg font-bold hover:bg-orange-600 transition-colors"
              >
                Show Results
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
