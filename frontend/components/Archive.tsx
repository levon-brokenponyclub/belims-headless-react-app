import React, { useState, useEffect, useMemo } from 'react';
import { Product, CategoryNode } from '../types';
import { ProductCard } from './ProductCard';
import { Filter, ChevronDown, Search, X } from 'lucide-react';
import { CATEGORY_TREE } from '../categoryTree';

interface ArchiveProps {
    products: Product[];
    category?: string; // The selected category slug or name
    searchQuery?: string;
    addToCart: (product: Product) => void;
    onBuyNow: (product: Product) => void;
    onProductClick: (product: Product) => void;
    onCompare: (product: Product) => void;
}

export const Archive: React.FC<ArchiveProps> = ({
    products,
    category,
    searchQuery,
    addToCart,
    onBuyNow,
    onProductClick,
    onCompare
}) => {
    const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'name'>('featured');
    const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
    const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>([]);

    // Helper to get all subcategories recursively
    const getCategoryMatches = (rootLabel: string, nodes: CategoryNode[]): string[] => {
        let matches: string[] = [];

        for (const node of nodes) {
            if (node.label.toLowerCase() === rootLabel.toLowerCase()) {
                // Found the root, collect all its children recursively
                matches.push(node.label);
                const collectChildren = (n: CategoryNode) => {
                    if (n.children) {
                        n.children.forEach(child => {
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
            // Get all valid subcategories for the selected category
            const validCategories = getCategoryMatches(category, CATEGORY_TREE);

            // If we found the category in the tree, filter by the list of it and its children
            if (validCategories.length > 0) {
                filtered = filtered.filter(p =>
                    validCategories.some(cat => p.category.toLowerCase() === cat.toLowerCase()) ||
                    // Fallback for loose matching if exact tree match fails (e.g. data inconsistencies)
                    p.category.toLowerCase().includes(category.toLowerCase())
                );
            } else {
                // Fallback: simple string inclusion if category not found in tree
                filtered = filtered.filter(p =>
                    p.category.toLowerCase().includes(category.toLowerCase())
                );
            }
        }

        // 2. Filter by Search Query
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(p =>
                p.name.toLowerCase().includes(query) ||
                p.description.toLowerCase().includes(query) ||
                p.sku.toLowerCase().includes(query)
            );
        }

        // 3. Filter by Price
        filtered = filtered.filter(p => p.price >= priceRange[0] && p.price <= priceRange[1]);

        // 4. Sort
        switch (sortBy) {
            case 'price-asc':
                filtered.sort((a, b) => a.price - b.price);
                break;
            case 'price-desc':
                filtered.sort((a, b) => b.price - a.price);
                break;
            case 'name':
                filtered.sort((a, b) => a.name.localeCompare(b.name));
                break;
            default:
                // Featured - keep original order or random
                break;
        }

        return filtered;
    }, [products, category, searchQuery, priceRange, sortBy]);

    // Get min/max price for slider
    const maxPrice = useMemo(() => {
        return Math.max(...products.map(p => p.price), 1000);
    }, [products]);

    return (
        <div className="container mx-auto px-4 py-8">

            {/* Header */}
            <div className="mb-8">
                <div className="text-sm text-gray-500 mb-2">
                    Home / {category ? category : 'Shop'}
                </div>
                <h1 className="text-3xl font-bold text-gray-900 font-heading capitalize">
                    {category ? category : (searchQuery ? `Search: "${searchQuery}"` : 'All Products')}
                </h1>
                <p className="text-gray-600 mt-2">
                    Showing {filteredProducts.length} results
                </p>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">

                {/* Sidebar Filters (Desktop) */}
                <aside className="hidden lg:block w-64 flex-shrink-0">
                    <div className="bg-white border border-gray-200 rounded-lg p-6 sticky top-24">
                        <div className="flex items-center gap-2 font-bold text-lg mb-6 font-heading border-b border-gray-100 pb-2">
                            <Filter size={20} /> Filters
                        </div>

                        {/* Price Filter */}
                        <div className="mb-8">
                            <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-gray-500">Price Range</h3>
                            <div className="px-2">
                                <input
                                    type="range"
                                    min="0"
                                    max={maxPrice}
                                    value={priceRange[1]}
                                    onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-belims-blue"
                                />
                                <div className="flex justify-between text-sm mt-2 font-medium text-gray-700">
                                    <span>R{priceRange[0]}</span>
                                    <span>R{priceRange[1]}</span>
                                </div>
                            </div>
                        </div>

                        {/* Categories Filter (if we are in a top level category) */}
                        {/* Placeholder for subcategory filtering */}
                        <div className="mb-6">
                            <h3 className="font-semibold mb-3 text-sm uppercase tracking-wider text-gray-500">Categories</h3>
                            <div className="space-y-2 max-h-60 overflow-y-auto text-sm">
                                {/* We could render subcategories here based on the tree */}
                                <div className="flex items-center gap-2">
                                    <input type="checkbox" className="rounded text-belims-blue focus:ring-belims-blue" />
                                    <span>In Stock Only</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input type="checkbox" className="rounded text-belims-blue focus:ring-belims-blue" />
                                    <span>On Sale</span>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => {
                                setPriceRange([0, maxPrice]);
                                setSortBy('featured');
                            }}
                            className="w-full py-2 text-sm text-belims-blue font-bold hover:underline"
                        >
                            Clear All Filters
                        </button>
                    </div>
                </aside>

                {/* Main Content */}
                <div className="flex-1">

                    {/* Toolbar */}
                    <div className="flex justify-between items-center mb-6 bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <button
                            className="lg:hidden flex items-center gap-2 font-bold text-gray-700"
                            onClick={() => setMobileFiltersOpen(true)}
                        >
                            <Filter size={18} /> Filters
                        </button>

                        <div className="flex items-center gap-2 ml-auto">
                            <span className="text-sm text-gray-500 hidden sm:inline">Sort by:</span>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as any)}
                                className="bg-white border border-gray-300 text-gray-700 text-sm rounded-md focus:ring-belims-blue focus:border-belims-blue block p-2"
                            >
                                <option value="featured">Featured</option>
                                <option value="price-asc">Price: Low to High</option>
                                <option value="price-desc">Price: High to Low</option>
                                <option value="name">Name: A-Z</option>
                            </select>
                        </div>
                    </div>

                    {/* Product Grid */}
                    {filteredProducts.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filteredProducts.map(product => (
                                <ProductCard
                                    key={product.id}
                                    product={product}
                                    addToCart={addToCart}
                                    onBuyNow={onBuyNow}
                                    onClick={onProductClick}
                                    onCompare={onCompare}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                            <Search size={48} className="mx-auto text-gray-300 mb-4" />
                            <h3 className="text-xl font-bold text-gray-900 mb-2">No products found</h3>
                            <p className="text-gray-500">Try adjusting your filters or search query.</p>
                            <button
                                onClick={() => {
                                    setPriceRange([0, maxPrice]);
                                    setSortBy('featured');
                                }}
                                className="mt-4 text-belims-blue font-bold hover:underline"
                            >
                                Clear Filters
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Mobile Filters Modal */}
            {mobileFiltersOpen && (
                <div className="fixed inset-0 z-50 bg-black/50 flex justify-end">
                    <div className="w-80 bg-white h-full shadow-xl p-6 overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-xl font-heading">Filters</h3>
                            <button onClick={() => setMobileFiltersOpen(false)}>
                                <X size={24} />
                            </button>
                        </div>

                        {/* Mobile Filter Content - Duplicate of Sidebar */}
                        <div className="mb-8">
                            <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-gray-500">Price Range</h3>
                            <input
                                type="range"
                                min="0"
                                max={maxPrice}
                                value={priceRange[1]}
                                onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-belims-blue"
                            />
                            <div className="flex justify-between text-sm mt-2 font-medium text-gray-700">
                                <span>R{priceRange[0]}</span>
                                <span>R{priceRange[1]}</span>
                            </div>
                        </div>

                        <button
                            onClick={() => setMobileFiltersOpen(false)}
                            className="w-full bg-belims-blue text-white py-3 rounded-lg font-bold mt-8"
                        >
                            Show Results
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
