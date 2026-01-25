import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Product } from "../types";
import { ProductCard } from "./ProductCard";
import { ArrowRight } from "lucide-react";
import { CATEGORY_SLIDER_DATA } from "../constants";

interface ShopByCategoryProps {
  products: Product[];
  addToCart: (product: Product) => void;
  onBuyNow: (product: Product) => void;
  onCompare: (product: Product) => void;
}

interface Category {
  id: number;
  name: string;
  slug: string;
  parent: string | null;
  count: number;
}

// Detect environment and set appropriate API base URL
function getApiBaseUrl(): string {
  // In development (localhost:3000)
  if (
    typeof window !== "undefined" &&
    window.location.hostname === "localhost"
  ) {
    return "http://belims-headless.local/wp-json/belims/v1";
  }

  // In production (Netlify) - use relative proxy path
  return "/api/belims/v1";
}

export const ShopByCategory: React.FC<ShopByCategoryProps> = ({
  products,
  addToCart,
  onBuyNow,
  onCompare,
}) => {
  const navigate = useNavigate();
  const [categoryPills, setCategoryPills] = useState<string[]>(["Top Deals"]);
  const [activeCategory, setActiveCategory] = useState("Top Deals");

  console.log("ShopByCategory rendered, products count:", products.length);
  console.log("VITE_API_URL:", import.meta.env.VITE_API_URL);

  // Fetch child categories from WooCommerce
  useEffect(() => {
    const loadCategories = async () => {
      // Wait for products to load first
      if (products.length === 0) {
        console.log("Waiting for products to load before fetching categories");
        return;
      }

      try {
        const baseUrl = getApiBaseUrl();
        const url = `${baseUrl}/categories`;
        console.log("Fetching categories from:", url);

        const response = await fetch(url);
        if (response.ok) {
          const categories: Category[] = await response.json();
          console.log("Fetched categories:", categories);

          // Get unique categories that actually exist in products
          const productCategoryNames = [
            ...new Set(products.map((p) => p.category)),
          ];
          console.log("Categories from products:", productCategoryNames.sort());

          // Filter WooCommerce categories to only those that match product categories
          const matchingCategories = categories
            .filter((cat) =>
              productCategoryNames.some(
                (pc) => pc.toLowerCase() === cat.name.toLowerCase(),
              ),
            )
            .map((cat) => cat.name)
            .sort();

          console.log("Matching categories:", matchingCategories);

          if (matchingCategories.length > 0) {
            setCategoryPills(["Top Deals", ...matchingCategories]);
          } else {
            console.warn("No matching categories found");
          }
        } else {
          console.error("Failed to fetch categories:", response.status);
        }
      } catch (error) {
        console.error("Failed to load categories:", error);
      }
    };
    loadCategories();
  }, [products]);

  // Get slider content based on active category
  const currentSliderContent =
    CATEGORY_SLIDER_DATA[activeCategory] || CATEGORY_SLIDER_DATA["default"];

  // Filter products by active category and limit to 10
  const categoryProducts = products
    .filter((product) => {
      if (activeCategory === "Top Deals") {
        // Show products with sale price or featured products
        return product.sale_price || product.isFeatured;
      }

      // Check if product category matches the active category exactly
      const productCategory = (product.category || "").trim();
      const searchCategory = activeCategory.trim();

      // Try exact match first (case-insensitive)
      if (productCategory.toLowerCase() === searchCategory.toLowerCase()) {
        return true;
      }

      // Also check if product category contains the search term
      if (
        productCategory.toLowerCase().includes(searchCategory.toLowerCase())
      ) {
        return true;
      }

      return false;
    })
    .slice(0, 10);

  // Debug: log when filtering and when no products found
  console.log(
    `Filtering for category: "${activeCategory}", found: ${categoryProducts.length} products`,
  );
  if (categoryProducts.length === 0 && activeCategory !== "Top Deals") {
    console.log("No products found for category:", activeCategory);
    // Get unique categories from ALL products
    const uniqueCategories = [
      ...new Set(products.map((p) => p.category)),
    ].sort();
    console.log("All unique categories in products:", uniqueCategories);
    console.log(
      "Sample product categories (first 10):",
      products.slice(0, 10).map((p) => p.category),
    );
  }

  return (
    <div className="mb-16">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 font-heading">
        Shop by Category
      </h2>

      {/* Category Pills */}
      <div className="mb-6 overflow-x-auto no-scrollbar pb-2">
        <div className="flex gap-3 min-w-max">
          {categoryPills.map((pill, index) => (
            <button
              key={index}
              onMouseEnter={() => setActiveCategory(pill)}
              onClick={() => navigate(`/shop/${encodeURIComponent(pill)}`)}
              className={`px-5 py-2.5 rounded-full border font-bold font-heading transition-all whitespace-nowrap text-[0.8rem] ${
                activeCategory === pill
                  ? "bg-belims-blue text-white border-belims-blue shadow-md"
                  : "bg-white text-gray-700 border-gray-300 hover:border-belims-blue hover:text-belims-blue"
              }`}
            >
              {pill}
            </button>
          ))}
        </div>
      </div>

      {/* Category Preview Section */}
      <div className="flex flex-col lg:flex-row gap-6 h-auto lg:h-[420px] animate-fadeIn">
        {/* Left: Category Hero Image */}
        <div className="w-full lg:w-1/3 xl:w-1/4 rounded-lg overflow-hidden relative group shadow-md h-[360px] lg:h-[420px]">
          <img
            src={currentSliderContent.image}
            alt={currentSliderContent.title}
            key={currentSliderContent.image}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 animate-fadeIn"
          />
          <div className="absolute inset-0 bg-black/30"></div>
          <div className="absolute inset-0 p-8 flex flex-col justify-center items-start text-center lg:text-left">
            <h3 className="text-3xl md:text-4xl font-extrabold text-white mb-4 font-heading leading-tight drop-shadow-lg">
              {currentSliderContent.title}
            </h3>
            <button
              onClick={() =>
                navigate(`/shop/${encodeURIComponent(activeCategory)}`)
              }
              className="mt-2 border-b-2 border-white text-white font-bold text-lg pb-0.5 hover:text-belims-accent hover:border-belims-accent transition-colors font-heading"
            >
              Shop All {activeCategory}
            </button>
          </div>
        </div>

        {/* Right: Product Slider */}
        <div className="flex-1 overflow-x-auto no-scrollbar flex gap-4 items-stretch">
          {categoryProducts.map((product) => (
            <div
              key={product.id}
              className="min-w-[280px] max-w-[280px] h-full cursor-pointer"
              onClick={() => navigate(`/product/${product.id}`)}
            >
              <ProductCard
                product={product}
                addToCart={addToCart}
                onBuyNow={onBuyNow}
                onCompare={onCompare}
              />
            </div>
          ))}

          {/* View All Card */}
          {categoryProducts.length > 0 && (
            <div className="min-w-[280px] max-w-[280px] h-full">
              <div
                onClick={() =>
                  navigate(`/shop/${encodeURIComponent(activeCategory)}`)
                }
                className="h-full bg-gradient-to-br from-belims-blue to-belims-blue/80 rounded-lg shadow-md cursor-pointer hover:shadow-xl transition-all flex flex-col items-center justify-center p-8 text-white group"
              >
                <ArrowRight className="w-16 h-16 mb-4 group-hover:translate-x-2 transition-transform" />
                <h3 className="text-2xl font-bold font-heading text-center mb-2">
                  View All
                </h3>
                <p className="text-sm text-white/90 text-center">
                  Browse all {activeCategory} products
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
