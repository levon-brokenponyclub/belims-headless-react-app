import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Product } from "../types";
import { ProductCard } from "./ProductCard";
import { ArrowRight } from "lucide-react";
import { CATEGORY_SLIDER_DATA } from "../constants";
import { getApiBaseUrl } from "../services/wooCommerceService";

interface ShopByCategoryProps {
  products: Product[];
  addToCart: (product: Product) => void;
  onBuyNow: (product: Product) => void;
  onCompare: (product: Product) => void;
  isAuthenticated?: boolean;
  isTradeApproved?: boolean;
}

interface Category {
  id: number;
  name: string;
  slug: string;
  parent: string | null;
  count: number;
}

export const ShopByCategory: React.FC<ShopByCategoryProps> = ({
  products,
  addToCart,
  onBuyNow,
  onCompare,
  isAuthenticated = false,
  isTradeApproved = false,
}) => {
  const navigate = useNavigate();
  const [categoryPills, setCategoryPills] = useState<string[]>(["Top Deals"]);
  const [activeCategory, setActiveCategory] = useState("Top Deals");

  console.log("ShopByCategory rendered, products count:", products.length);

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
    <section className="w-full py-14">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl font-bold text-gray-900 font-heading letterspacing-tight mb-6">
          Shop by department
        </h2>

        {/* Category Pills */}
        <div className="mb-6 overflow-x-auto no-scrollbar pb-2">
          <div className="flex gap-3 min-w-max">
            {categoryPills.map((pill, index) => (
              <button
                key={index}
                onClick={() => {
                  setActiveCategory(pill);
                }}
                className={`px-4 h-9 rounded border font-semibold font-heading transition-colors whitespace-nowrap text-[13px] ${
                  activeCategory === pill
                    ? "bg-belims-blue text-white border-gray-200"
                    : "bg-white text-[#64748b] border-gray-200 hover:bg-belims-blue hover:text-white"
                }`}
              >
                {pill}
              </button>
            ))}
          </div>
        </div>

        {/* Category Preview Section */}
        <div className="flex flex-col lg:flex-row gap-6 h-auto lg:h-[420px] animate-fadeIn">
          {/* Left: Category Hero Video */}
          <div className="w-full lg:w-1/3 xl:w-1/5 rounded overflow-hidden relative group shadow-md h-[360px] lg:h-[420px]">
            <video
              autoPlay
              muted
              loop
              playsInline
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            >
              <source
                src="https://ecommerce-power-tools.myshopify.com/cdn/shop/videos/c/vp/368a24b1ebe4468c9182d31fd2b448bf/368a24b1ebe4468c9182d31fd2b448bf.HD-1080p-2.5Mbps-51036248.mp4?v=0"
                type="video/mp4"
              />
            </video>
            <div className="absolute inset-0 bg-black/60"></div>
            <div className="absolute inset-0 p-6 flex flex-col justify-center items-start text-center lg:text-left">
              <h3 className="text-1xl md:text-2xl font-bold text-white mb-4 font-heading leading-tight drop-shadow-lg">
                {/* {currentSliderContent.title} */}
                {activeCategory}
              </h3>
              <button
                onClick={() =>
                  navigate(`/shop/${encodeURIComponent(activeCategory)}`)
                }
                className="mt-2 text-white font-semibold pb-0.5 hover:text-belims-accent hover:border-belims-accent transition-colors font-heading"
              >
                Shop All {/* {activeCategory} */}
              </button>
            </div>
          </div>

          {/* Right: Product Slider */}
          <div className="flex-1 overflow-x-auto no-scrollbar flex gap-4 items-stretch">
            {categoryProducts.map((product) => (
              <div
                key={product.id}
                className="flex-shrink-0"
                onClick={() => navigate(`/product/${product.id}`)}
              >
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
          {/* {categoryProducts.length === 0 && (
              <p className="text-gray-500">No products found in this category.</p>
            )}
          </div> */}
        </div>
      </div>
    </section>
  );
};
