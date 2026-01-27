import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
  useParams,
  useSearchParams,
  useLocation,
} from "react-router-dom";

import { Header } from "./components/Header";
import { ProductCard } from "./components/ProductCard";
import { CartDrawer } from "./components/CartDrawer";
import { StoreLocator } from "./components/StoreLocator";
import { PaintAssistant } from "./components/PaintAssistant";
import { SingleProduct } from "./components/SingleProduct";
import { FreeShippingWidget } from "./components/FreeShippingWidget";
import { OnboardingWizard } from "./components/OnboardingWizard";
import { PriceMatchModal } from "./components/PriceMatchModal";
import { ComparisonModal } from "./components/ComparisonModal";
import { Checkout } from "./components/Checkout";
import { OrderConfirmation } from "./components/OrderConfirmation";
import { Archive } from "./components/Archive";
import { RecentlyViewed } from "./components/RecentlyViewed";
import { ShopByCategory } from "./components/ShopByCategory";
import { TrackOrderPage } from "./components/TrackOrderPage";
import HeroBanner from "./components/HeroBanner";

import { Product, CartItem, Store } from "./types";
import {
  fetchProducts,
  fetchFeaturedProducts,
  getApiBaseUrl,
} from "./services/wooCommerceService";

import {
  STORES,
  HERO_SLIDES,
  CATEGORY_PILLS,
  PROJECT_IDEAS,
  CATEGORY_SLIDER_DATA,
} from "./constants";

import {
  ArrowLeft,
  ArrowRight,
  Truck,
  ShieldCheck,
  CreditCard,
  ChevronRight,
  X,
} from "lucide-react";

// ========== ROUTE WRAPPER COMPONENTS ==========

const ProductPage = ({
  products,
  addToCart,
  onBuyNow,
  onCompare,
  setPriceMatchProduct,
}) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const product = products.find((p) => String(p.id) === id);

  if (!product && products.length > 0)
    return <div className="p-10 text-center">Product not found</div>;
  if (!product) return <div className="p-10 text-center">Loading...</div>;

  return (
    <SingleProduct
      product={product}
      addToCart={addToCart}
      onBuyNow={onBuyNow}
      onCompare={onCompare}
      onPriceMatch={setPriceMatchProduct}
      onBrandClick={(brand) =>
        navigate(`/shop?brand=${encodeURIComponent(brand)}`)
      }
    />
  );
};

const ArchivePage = ({ products, addToCart, onBuyNow, onCompare }) => {
  const { categorySlug } = useParams();
  const [searchParams] = useSearchParams();

  const categoryLabel = categorySlug
    ? decodeURIComponent(categorySlug).replace(/-/g, " ")
    : undefined;

  const brand = searchParams.get("brand") || undefined;
  const searchQuery = searchParams.get("search") || undefined;

  return (
    <Archive
      products={products}
      category={categoryLabel}
      brand={brand}
      searchQuery={searchQuery}
      addToCart={addToCart}
      onBuyNow={onBuyNow}
      onCompare={onCompare}
    />
  );
};

const HomePage = ({
  products,
  featuredProducts,
  addToCart,
  handleBuyNow,
  handleProductClick,
  addToCompare,
  categoryPills,
}) => {
  const navigate = useNavigate();

  return (
    <>
      <HeroBanner />

      <ShopByCategory
        products={products}
        addToCart={addToCart}
        onBuyNow={handleBuyNow}
        onCompare={addToCompare}
      />

      {/* Deals of the Day */}
      <section
        className="mb-16 bg-gradient-to-r from-blue-50 to-blue-100 py-8"
        aria-label="Deals of the day"
      >
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-end mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 font-heading">
                Deals of the day
              </h2>
              <p className="text-gray-500 text-sm mt-1">
                Fresh discounts daily — limited stock
              </p>
            </div>
            <a
              href="/deals"
              className="text-sm font-semibold text-belims-blue hover:text-belims-accent hidden md:block"
            >
              View all →
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="relative">
                <div className="h-48 bg-gray-200"></div>
                <span className="absolute top-2 left-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">
                  -25%
                </span>
              </div>
              <div className="p-4">
                <div className="text-sm text-gray-500 mb-1">Paint</div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Dulux Weatherguard 20L - White
                </h3>
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-lg font-bold text-red-600">R449</span>
                  <span className="text-sm line-through text-gray-400">
                    R599
                  </span>
                </div>
                <button className="w-full px-4 py-2 bg-belims-blue text-white font-semibold rounded hover:bg-belims-accent transition-colors text-sm">
                  Add to Cart
                </button>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="relative">
                <div className="h-48 bg-gray-200"></div>
                <span className="absolute top-2 left-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">
                  -30%
                </span>
              </div>
              <div className="p-4">
                <div className="text-sm text-gray-500 mb-1">Tools</div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Bosch Professional Drill Set
                </h3>
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-lg font-bold text-red-600">R1,399</span>
                  <span className="text-sm line-through text-gray-400">
                    R1,999
                  </span>
                </div>
                <button className="w-full px-4 py-2 bg-belims-blue text-white font-semibold rounded hover:bg-belims-accent transition-colors text-sm">
                  Add to Cart
                </button>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="relative">
                <div className="h-48 bg-gray-200"></div>
                <span className="absolute top-2 left-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">
                  -20%
                </span>
              </div>
              <div className="p-4">
                <div className="text-sm text-gray-500 mb-1">Plumbing</div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Chrome Basin Mixer Tap
                </h3>
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-lg font-bold text-red-600">R239</span>
                  <span className="text-sm line-through text-gray-400">
                    R299
                  </span>
                </div>
                <button className="w-full px-4 py-2 bg-belims-blue text-white font-semibold rounded hover:bg-belims-accent transition-colors text-sm">
                  Add to Cart
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Weekly Deals & Bulk Savings */}
      <section className="mb-16" aria-label="Weekly deals and bulk savings">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-end mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 font-heading">
                Weekly deals & bulk savings
              </h2>
              <p className="text-gray-500 text-sm mt-1">
                Save more when you buy in bulk
              </p>
            </div>
            <a
              href="/deals/weekly"
              className="text-sm font-semibold text-belims-blue hover:text-belims-accent hidden md:block"
            >
              All weekly deals →
            </a>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <a
              href="/deals/paint-week"
              className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg p-6 hover:from-blue-600 hover:to-blue-700 transition-all"
            >
              <div className="text-sm font-semibold mb-1">This Week</div>
              <div className="text-xl font-bold">Paint Week</div>
              <div className="text-sm opacity-90 mt-2">Up to 30% off</div>
            </a>

            <a
              href="/deals/power-tools"
              className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-lg p-6 hover:from-orange-600 hover:to-orange-700 transition-all"
            >
              <div className="text-sm font-semibold mb-1">Limited Time</div>
              <div className="text-xl font-bold">Power Tools</div>
              <div className="text-sm opacity-90 mt-2">Save R200+</div>
            </a>

            <a
              href="/deals/bulk-cement"
              className="bg-gradient-to-br from-gray-700 to-gray-800 text-white rounded-lg p-6 hover:from-gray-800 hover:to-gray-900 transition-all"
            >
              <div className="text-sm font-semibold mb-1">Bulk Buy</div>
              <div className="text-xl font-bold">Cement</div>
              <div className="text-sm opacity-90 mt-2">10+ bags save 15%</div>
            </a>

            <a
              href="/deals/trade-bundles"
              className="bg-gradient-to-br from-green-600 to-green-700 text-white rounded-lg p-6 hover:from-green-700 hover:to-green-800 transition-all"
            >
              <div className="text-sm font-semibold mb-1">Trade Only</div>
              <div className="text-xl font-bold">Bundles</div>
              <div className="text-sm opacity-90 mt-2">Special pricing</div>
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {products.slice(0, 4).map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                addToCart={addToCart}
                onBuyNow={handleBuyNow}
                onCompare={addToCompare}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Trade Essentials */}
      <section className="mb-16" aria-label="Trade essentials">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-end mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 font-heading">
                Trade essentials
              </h2>
              <p className="text-gray-500 text-sm mt-1">
                Quick access for everyday jobs
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <a
              href="/shop/ladders-trestles"
              className="block p-6 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
            >
              <div className="font-semibold text-gray-900 mb-2">
                Ladders & Trestles
              </div>
              <div className="text-sm text-belims-blue hover:text-belims-accent">
                Shop now →
              </div>
            </a>
            <a
              href="/shop/power-tools"
              className="block p-6 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
            >
              <div className="font-semibold text-gray-900 mb-2">
                Power Tools
              </div>
              <div className="text-sm text-belims-blue hover:text-belims-accent">
                Shop now →
              </div>
            </a>
            <a
              href="/shop/fasteners"
              className="block p-6 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
            >
              <div className="font-semibold text-gray-900 mb-2">Fasteners</div>
              <div className="text-sm text-belims-blue hover:text-belims-accent">
                Shop now →
              </div>
            </a>
            <a
              href="/shop/sealants-adhesives"
              className="block p-6 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
            >
              <div className="font-semibold text-gray-900 mb-2">Sealants</div>
              <div className="text-sm text-belims-blue hover:text-belims-accent">
                Shop now →
              </div>
            </a>
            <a
              href="/shop/safety-wear"
              className="block p-6 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
            >
              <div className="font-semibold text-gray-900 mb-2">
                Safety Wear
              </div>
              <div className="text-sm text-belims-blue hover:text-belims-accent">
                Shop now →
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* Brand Strip */}
      <section className="mb-16 py-8 bg-gray-50" aria-label="Trusted brands">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-3 md:grid-cols-6 gap-8 items-center opacity-60">
            <div className="text-center text-2xl font-bold text-gray-400">
              BOSCH
            </div>
            <div className="text-center text-2xl font-bold text-gray-400">
              MAKITA
            </div>
            <div className="text-center text-2xl font-bold text-gray-400">
              DEWALT
            </div>
            <div className="text-center text-2xl font-bold text-gray-400">
              STANLEY
            </div>
            <div className="text-center text-2xl font-bold text-gray-400">
              INGCO
            </div>
            <div className="text-center text-2xl font-bold text-gray-400">
              RYOBI
            </div>
          </div>
        </div>
      </section>

      {/* Featured Category Spotlights */}
      <section className="mb-16" aria-label="Featured categories">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-end mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 font-heading">
                Featured categories
              </h2>
              <p className="text-gray-500 text-sm mt-1">
                Top departments and their most-used subcategories
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Paint & Coatings
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                Interior, exterior and prep — everything for a clean finish.
              </p>
              <ul className="space-y-2 mb-4">
                <li>
                  <a
                    href="/shop/paint/interior"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Interior Paint
                  </a>
                </li>
                <li>
                  <a
                    href="/shop/paint/exterior"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Exterior Paint
                  </a>
                </li>
                <li>
                  <a
                    href="/shop/paint/primers-sealers"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Primers & Sealers
                  </a>
                </li>
              </ul>
              <a
                href="/shop/paint"
                className="text-sm font-semibold text-belims-blue hover:text-belims-accent"
              >
                Shop Paint →
              </a>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Plumbing & Sanitaryware
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                Pipes, fittings and fixtures for bathrooms and kitchens.
              </p>
              <ul className="space-y-2 mb-4">
                <li>
                  <a
                    href="/shop/plumbing/pipes-fittings"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Pipes & Fittings
                  </a>
                </li>
                <li>
                  <a
                    href="/shop/plumbing/bathroom-accessories"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Bathroom Accessories
                  </a>
                </li>
                <li>
                  <a
                    href="/shop/plumbing/kitchen-fixtures"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Kitchen Fixtures
                  </a>
                </li>
              </ul>
              <a
                href="/shop/plumbing-bathroom-kitchen"
                className="text-sm font-semibold text-belims-blue hover:text-belims-accent"
              >
                Shop Plumbing →
              </a>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Doors & Windows
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                Frames, hardware and security fittings for every opening.
              </p>
              <ul className="space-y-2 mb-4">
                <li>
                  <a
                    href="/shop/doors-windows/frames"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Frames
                  </a>
                </li>
                <li>
                  <a
                    href="/shop/doors-windows/hardware"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Hardware
                  </a>
                </li>
                <li>
                  <a
                    href="/shop/doors-windows/security"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Security Fittings
                  </a>
                </li>
              </ul>
              <a
                href="/shop/doors-windows"
                className="text-sm font-semibold text-belims-blue hover:text-belims-accent"
              >
                Shop Doors & Windows →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Project Inspiration */}
      <section className="mb-16" aria-label="Project inspiration">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-end mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 font-heading">
                Get the job done
              </h2>
              <p className="text-gray-500 text-sm mt-1">
                Curated essentials for common home and trade projects
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="h-40 bg-gray-200"></div>
              <div className="p-4">
                <h3 className="font-bold text-gray-900 mb-2">
                  Bathroom Renovation Essentials
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  Fixtures, fittings and finishes for bathroom upgrades.
                </p>
                <a
                  href="/projects/bathroom-renovation"
                  className="text-sm font-semibold text-belims-blue hover:text-belims-accent"
                >
                  View checklist →
                </a>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="h-40 bg-gray-200"></div>
              <div className="p-4">
                <h3 className="font-bold text-gray-900 mb-2">
                  Interior Painting Checklist
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  Paint, prep tools and accessories for a clean interior finish.
                </p>
                <a
                  href="/projects/interior-painting"
                  className="text-sm font-semibold text-belims-blue hover:text-belims-accent"
                >
                  View checklist →
                </a>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="h-40 bg-gray-200"></div>
              <div className="p-4">
                <h3 className="font-bold text-gray-900 mb-2">
                  Outdoor Patio Setup
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  Sealants, coatings and materials for outdoor living spaces.
                </p>
                <a
                  href="/projects/outdoor-patio"
                  className="text-sm font-semibold text-belims-blue hover:text-belims-accent"
                >
                  View checklist →
                </a>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="h-40 bg-gray-200"></div>
              <div className="p-4">
                <h3 className="font-bold text-gray-900 mb-2">
                  Basic Home Security Upgrade
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  Locks, fittings and accessories for added security.
                </p>
                <a
                  href="/projects/home-security"
                  className="text-sm font-semibold text-belims-blue hover:text-belims-accent"
                >
                  View checklist →
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Lifestyle Section */}
      <section
        className="mb-16 bg-gray-50 py-12"
        aria-label="Built for real projects"
      >
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Built for real projects — at home and on site
              </h2>
              <p className="text-gray-600 mb-6">
                From quick DIY fixes to full-scale renovations, Belims supplies
                trusted tools, materials and finishes used by professionals and
                homeowners across South Africa.
              </p>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span>Trade-grade products</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span>Reliable stock & delivery</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span>Clear pricing, no guesswork</span>
                </li>
              </ul>
              <a
                href="/shop"
                className="inline-block px-6 py-3 bg-belims-blue text-white font-semibold rounded hover:bg-belims-accent transition-colors"
              >
                Start your project →
              </a>
            </div>
            <div className="h-64 lg:h-96 bg-gray-300 rounded-lg"></div>
          </div>
        </div>
      </section>

      {/* Seasonal Block */}
      <section className="mb-16" aria-label="Seasonal essentials">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Load Shedding Essentials
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                Lighting, power backup & safety solutions.
              </p>
              <a
                href="/shop/load-shedding"
                className="text-sm font-semibold text-belims-blue hover:text-belims-accent"
              >
                Shop essentials →
              </a>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Rainy Season Prep
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                Sealants, waterproofing & drainage.
              </p>
              <a
                href="/shop/waterproofing"
                className="text-sm font-semibold text-belims-blue hover:text-belims-accent"
              >
                Prepare now →
              </a>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Outdoor Maintenance
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                Garden tools, coatings & repairs.
              </p>
              <a
                href="/shop/outdoor"
                className="text-sm font-semibold text-belims-blue hover:text-belims-accent"
              >
                Shop outdoor →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* SEO Categories */}
      <section className="mb-16" aria-label="Popular categories">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-gray-900 font-heading mb-6">
            Popular Categories
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <a
              href="/shop/boards-sheeting"
              className="text-sm text-blue-600 hover:underline"
            >
              Boards & Sheeting
            </a>
            <a
              href="/shop/ceiling-accessories"
              className="text-sm text-blue-600 hover:underline"
            >
              Ceiling Accessories
            </a>
            <a
              href="/shop/tiles-adhesives"
              className="text-sm text-blue-600 hover:underline"
            >
              Tiles & Adhesives
            </a>
            <a
              href="/shop/window-film"
              className="text-sm text-blue-600 hover:underline"
            >
              Window Film
            </a>
            <a
              href="/shop/fasteners"
              className="text-sm text-blue-600 hover:underline"
            >
              Fasteners
            </a>
            <a
              href="/shop/power-tool-accessories"
              className="text-sm text-blue-600 hover:underline"
            >
              Power Tool Accessories
            </a>
            <a
              href="/shop/sealants"
              className="text-sm text-blue-600 hover:underline"
            >
              Sealants
            </a>
            <a
              href="/shop/safety-wear"
              className="text-sm text-blue-600 hover:underline"
            >
              Safety Wear
            </a>
            <a
              href="/shop/electrical-components"
              className="text-sm text-blue-600 hover:underline"
            >
              Electrical Components
            </a>
            <a
              href="/shop/plumbing-fittings"
              className="text-sm text-blue-600 hover:underline"
            >
              Plumbing Fittings
            </a>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      {/* <section className="mb-16">
        <div className="flex justify-between items-end mb-6 border-b border-gray-200 pb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 font-heading">
              Top Rated Hardware
            </h2>
            <p className="text-gray-500 text-sm mt-1 font-medium">
              Essential tools and materials for the job.
            </p>
          </div>
          <button
            onClick={() => navigate("/shop")}
            className="text-belims-blue font-bold text-sm hover:text-belims-accent hover:underline flex items-center gap-1 mb-2 font-heading"
          >
            View All <ChevronRight size={16} />
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {(featuredProducts.length > 0
            ? featuredProducts
            : products.slice(0, 4)
          ).map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              addToCart={addToCart}
              onBuyNow={handleBuyNow}
              onCompare={addToCompare}
            />
          ))}
        </div>
      </section> */}

      {/* <RecentlyViewed
        addToCart={addToCart}
        onBuyNow={handleBuyNow}
        onProductClick={handleProductClick}
        onCompare={addToCompare}
      /> */}
    </>
  );
};

// ========== MAIN APP COMPONENT ==========

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLocatorOpen, setIsLocatorOpen] = useState(false);
  const [isPaintOpen, setIsPaintOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(() => {
    // Temporarily disabled - onboarding won't show on site load
    return false;
    // const hasSeen = localStorage.getItem("hasSeenOnboarding");
    // return !hasSeen;
  });
  const [selectedStore, setSelectedStore] = useState<Store | null>(STORES[0]);
  const [userType, setUserType] = useState<"personal" | "business">("personal");
  const [comparisonList, setComparisonList] = useState<Product[]>([]);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [priceMatchProduct, setPriceMatchProduct] = useState<Product | null>(
    null,
  );
  const [categoryPills, setCategoryPills] = useState<string[]>(CATEGORY_PILLS);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const apiBase = getApiBaseUrl();
        const response = await fetch(`${apiBase}/categories`);
        if (response.ok) {
          const categories = await response.json();
          const childCategories = categories
            .filter((cat: any) => cat.parent !== null)
            .map((cat: any) => cat.name)
            .sort();
          if (childCategories.length > 0) {
            setCategoryPills(["Top Deals", ...childCategories]);
          }
        }
      } catch (error) {
        console.error("Failed to load categories:", error);
      }
    };
    loadCategories();
  }, []);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const apiProducts = await fetchProducts();
        if (apiProducts?.length) setProducts(apiProducts);

        const apiFeatured = await fetchFeaturedProducts();
        if (apiFeatured?.length) setFeaturedProducts(apiFeatured);
      } catch (error) {
        console.error("Failed to load products:", error);
      }
    };
    loadProducts();
  }, []);

  const addToCart = (product: Product) => {
    setCartItems((prev) => {
      const exists = prev.find((item) => item.id === product.id);
      if (exists) {
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const handleBuyNow = (product: Product) => {
    addToCart(product);
    setTimeout(() => setIsCartOpen(true), 100);
  };

  const updateQuantity = (id: string, delta: number) => {
    setCartItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, quantity: Math.max(1, item.quantity + delta) }
          : item,
      ),
    );
  };

  const removeItem = (id: string) =>
    setCartItems((prev) => prev.filter((item) => item.id !== id));

  const clearCart = useCallback(() => {
    setCartItems([]);
    setIsCartOpen(false);
  }, []);

  const addToCompare = (product: Product) => {
    setComparisonList((prev) => {
      if (prev.find((p) => p.id === product.id)) return prev;
      if (prev.length >= 4) {
        alert("You can compare up to 4 products.");
        return prev;
      }
      return [...prev, product];
    });
    setIsCompareOpen(true);
  };

  const removeFromCompare = (id: string) => {
    setComparisonList((prev) => prev.filter((p) => p.id !== id));
    if (comparisonList.length <= 1) setIsCompareOpen(false);
  };

  return (
    <Router>
      <MainApp
        products={products}
        featuredProducts={featuredProducts}
        cartItems={cartItems}
        isCartOpen={isCartOpen}
        setIsCartOpen={setIsCartOpen}
        isLocatorOpen={isLocatorOpen}
        setIsLocatorOpen={setIsLocatorOpen}
        isPaintOpen={isPaintOpen}
        setIsPaintOpen={setIsPaintOpen}
        isOnboardingOpen={isOnboardingOpen}
        setIsOnboardingOpen={setIsOnboardingOpen}
        selectedStore={selectedStore}
        setSelectedStore={setSelectedStore}
        userType={userType}
        setUserType={setUserType}
        addToCart={addToCart}
        handleBuyNow={handleBuyNow}
        updateQuantity={updateQuantity}
        removeItem={removeItem}
        clearCart={clearCart}
        comparisonList={comparisonList}
        addToCompare={addToCompare}
        removeFromCompare={removeFromCompare}
        isCompareOpen={isCompareOpen}
        setIsCompareOpen={setIsCompareOpen}
        priceMatchProduct={priceMatchProduct}
        setPriceMatchProduct={setPriceMatchProduct}
        categoryPills={categoryPills}
      />
    </Router>
  );
}

function MainApp(props) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [location.pathname]);

  const handleProductClick = (product: Product) => {
    navigate(`/product/${product.id}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-white font-sans">
      <Header
        selectedStore={props.selectedStore}
        cartItems={props.cartItems}
        toggleCart={() => props.setIsCartOpen(true)}
        toggleStoreLocator={() => props.setIsLocatorOpen(true)}
        onOpenPaintAssistant={() => props.setIsPaintOpen(true)}
        onOpenTrackOrder={() => navigate("/track-order")}
        onOpenOnboarding={() => props.setIsOnboardingOpen(true)}
        onCompare={props.addToCompare}
        products={props.products}
      />

      <main className="flex-1 w-full px-0 relative">
        <Routes>
          <Route
            path="/"
            element={
              <HomePage {...props} handleProductClick={handleProductClick} />
            }
          />
          <Route
            path="/product/:id"
            element={
              <ProductPage
                products={props.products}
                addToCart={props.addToCart}
                onBuyNow={props.handleBuyNow}
                onCompare={props.addToCompare}
                setPriceMatchProduct={props.setPriceMatchProduct}
              />
            }
          />
          <Route
            path="/shop"
            element={
              <ArchivePage
                products={props.products}
                addToCart={props.addToCart}
                onBuyNow={props.handleBuyNow}
                onCompare={props.addToCompare}
              />
            }
          />
          <Route
            path="/shop/:categorySlug"
            element={
              <ArchivePage
                products={props.products}
                addToCart={props.addToCart}
                onBuyNow={props.handleBuyNow}
                onCompare={props.addToCompare}
              />
            }
          />
          <Route
            path="/checkout"
            element={
              <Checkout
                cartItems={props.cartItems}
                onBack={() => navigate(-1)}
                onClearCart={props.clearCart}
              />
            }
          />
          <Route path="/track-order" element={<TrackOrderPage />} />
          <Route path="/order-confirmation" element={<OrderConfirmation />} />
        </Routes>
      </main>

      <footer className="bg-[#1a1f2e] text-gray-400 py-12 text-sm pb-24">
        <div className="container mx-auto px-4 text-center">
          &copy; 2024 Belims Hardware.
        </div>
      </footer>

      <FreeShippingWidget cartItems={props.cartItems} />

      <CartDrawer
        isOpen={props.isCartOpen}
        onClose={() => props.setIsCartOpen(false)}
        items={props.cartItems}
        updateQuantity={props.updateQuantity}
        removeItem={props.removeItem}
        onCheckout={() => {
          props.setIsCartOpen(false);
          navigate("/checkout");
        }}
        recommendedProducts={
          props.featuredProducts.length > 0
            ? props.featuredProducts.slice(0, 8)
            : props.products.filter((p) => p.onSale).slice(0, 8)
        }
        addToCart={props.addToCart}
      />

      {props.isLocatorOpen && (
        <StoreLocator
          currentStore={props.selectedStore}
          onSelectStore={props.setSelectedStore}
          onClose={() => props.setIsLocatorOpen(false)}
        />
      )}

      {props.isCompareOpen && (
        <ComparisonModal
          products={props.comparisonList}
          onClose={() => props.setIsCompareOpen(false)}
          onRemove={props.removeFromCompare}
          addToCart={props.addToCart}
        />
      )}

      {props.priceMatchProduct && (
        <PriceMatchModal
          product={props.priceMatchProduct}
          onClose={() => props.setPriceMatchProduct(null)}
        />
      )}

      {props.isOnboardingOpen && (
        <OnboardingWizard
          onClose={() => {
            props.setIsOnboardingOpen(false);
            localStorage.setItem("hasSeenOnboarding", "true");
          }}
          onNavigateToProduct={handleProductClick}
          addToCart={props.addToCart}
          onBuyNow={props.handleBuyNow}
          onCompare={props.addToCompare}
        />
      )}

      {props.isPaintOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => props.setIsPaintOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10"
            >
              <X size={24} />
            </button>
            <div className="p-8">
              <h2 className="text-2xl font-bold mb-2 text-belims-blue font-heading">
                Belims AI Paint Assistant
              </h2>
              <PaintAssistant />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
