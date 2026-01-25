import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Menu,
  Search,
  ShoppingCart,
  MapPin,
  User,
  ChevronDown,
  X,
  Heart,
  LayoutGrid,
  Sparkles,
  ArrowRight,
  Scale,
} from "lucide-react";
import { Store, CategoryNode, CartItem, Product } from "../types";
import { CURRENCY_SYMBOL } from "../constants";
import { initializeCategoryTree } from "../categoryTree";

interface SearchCategoryResult {
  id: string;
  label: string;
  fullPath: string;
}

const flattenCategoryTree = (
  nodes: CategoryNode[],
  parentPath = "",
): SearchCategoryResult[] => {
  return nodes.flatMap((node) => {
    const fullPath = parentPath ? `${parentPath} / ${node.label}` : node.label;
    const current: SearchCategoryResult = {
      id: node.id,
      label: node.label,
      fullPath,
    };

    if (!node.children || node.children.length === 0) {
      return [current];
    }

    return [current, ...flattenCategoryTree(node.children, fullPath)];
  });
};

interface HeaderProps {
  selectedStore: Store | null;
  cartItems: CartItem[];
  toggleCart: () => void;
  toggleStoreLocator: () => void;
  onOpenPaintAssistant: () => void;
  onOpenOnboarding: () => void;
  onCompare?: (product: Product) => void;
  products?: Product[];
}

export const Header: React.FC<HeaderProps> = ({
  selectedStore,
  cartItems,
  toggleCart,
  toggleStoreLocator,
  onOpenPaintAssistant,
  onOpenOnboarding,
  onCompare,
  products = [],
}) => {
  const navigate = useNavigate();
  const [isMegaMenuOpen, setIsMegaMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{
    categories: SearchCategoryResult[];
    products: Product[];
  } | null>(null);
  const [categoryTree, setCategoryTree] = useState<CategoryNode[]>([]);
  const [activeMegaCategory, setActiveMegaCategory] =
    useState<CategoryNode | null>(null);
  const [expandedMobileCategory, setExpandedMobileCategory] = useState<
    string | null
  >(null);

  // Initialize category tree from API
  useEffect(() => {
    const loadCategories = async () => {
      const tree = await initializeCategoryTree();
      setCategoryTree(tree);
      if (tree.length > 0 && !activeMegaCategory) {
        setActiveMegaCategory(tree[0]);
      }
    };
    loadCategories();
  }, []);

  const flatCategoryList = useMemo(
    () => flattenCategoryTree(categoryTree),
    [categoryTree],
  );

  const toggleMobileMenu = () => {
    setMobileMenuOpen((prev) => {
      const next = !prev;
      if (!next) {
        setExpandedMobileCategory(null);
      }
      return next;
    });
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
    setExpandedMobileCategory(null);
  };

  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  // Predictive Search Logic
  useEffect(() => {
    if (searchQuery.length > 1) {
      const lowerQuery = searchQuery.toLowerCase();

      const matchedCats = flatCategoryList.filter(
        (cat) =>
          cat.label.toLowerCase().includes(lowerQuery) ||
          cat.fullPath.toLowerCase().includes(lowerQuery),
      );
      const matchedProds = products.filter(
        (p) =>
          p.name.toLowerCase().includes(lowerQuery) ||
          p.category.toLowerCase().includes(lowerQuery),
      );
      setSearchResults({ categories: matchedCats, products: matchedProds });
    } else {
      setSearchResults(null);
    }
  }, [searchQuery, flatCategoryList, products]);

  const handleProductSelect = (product: Product) => {
    navigate(`/product/${product.id}`);
    setSearchQuery(""); // Clear search
    setSearchResults(null);
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/shop?search=${encodeURIComponent(searchQuery)}`);
      setSearchResults(null);
      setSearchQuery("");
    }
  };

  const handleCategorySelect = (category: string) => {
    navigate(`/shop/${encodeURIComponent(category)}`);
    setIsMegaMenuOpen(false);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-[300] font-sans shadow-md">
      {/* Primary Blue Bar (Walmart Style) */}
      <div className="bg-belims-blue text-white py-3">
        <div className="container mx-auto px-4 flex items-center gap-4 md:gap-6">
          {/* Mobile Menu Trigger */}
          <button className="md:hidden text-white" onClick={toggleMobileMenu}>
            <Menu size={24} />
          </button>

          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-1 cursor-pointer flex-shrink-0 mr-2"
          >
            <img
              src="/images/belims-logo-white.png"
              alt="Belims Hardware"
              className="h-8 md:h-10 object-contain"
            />
          </Link>

          {/* Pickup/Delivery Button */}
          <div
            className="hidden lg:flex items-center gap-3 bg-white/10 hover:bg-white/20 rounded-full py-2 px-4 cursor-pointer transition-colors border border-transparent hover:border-white/20"
            onClick={toggleStoreLocator}
          >
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center flex-shrink-0 text-belims-blue">
              <MapPin size={18} />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-xs font-semibold text-white font-heading">
                Pickup or delivery
              </span>
              <span className="text-sm font-bold text-white truncate max-w-[140px] font-heading">
                {selectedStore
                  ? selectedStore.address.split(",")[0]
                  : "Select Store"}
              </span>
            </div>
            <ChevronDown size={14} className="text-white" />
          </div>

          {/* Search Bar (Pill Shape) with Predictive Dropdown */}
          <div className="flex-1 relative group">
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                placeholder="Search everything at Belims..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-full py-2.5 pl-5 pr-12 text-black text-sm focus:outline-none focus:ring-2 focus:ring-belims-accent shadow-sm font-medium"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-belims-blue p-2 rounded-full text-white hover:bg-belims-light transition-colors"
              >
                <Search size={18} />
              </button>
            </form>

            {/* Search Results Dropdown */}
            {searchResults &&
              (searchResults.categories.length > 0 ||
                searchResults.products.length > 0) && (
                <div className="absolute top-full left-0 right-0 bg-white rounded-lg shadow-xl mt-2 border border-gray-200 overflow-hidden z-50">
                  {searchResults.categories.length > 0 && (
                    <div className="p-2 bg-gray-50">
                      <h4 className="text-xs font-bold text-gray-500 uppercase px-2 mb-1 font-heading">
                        Categories
                      </h4>
                      {searchResults.categories.map((c) => (
                        <div
                          key={c.id}
                          className="px-2 py-1.5 hover:bg-white hover:text-belims-blue cursor-pointer rounded text-sm font-medium"
                          onClick={() => handleCategorySelect(c.label)}
                        >
                          <div className="flex items-center justify-between">
                            <span>{c.label}</span>
                            <ChevronDown
                              size={12}
                              className="-rotate-90 text-gray-300"
                            />
                          </div>
                          <div className="text-[11px] text-gray-500 font-normal truncate">
                            {c.fullPath}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {searchResults.products.length > 0 && (
                    <div className="p-2">
                      <h4 className="text-xs font-bold text-gray-500 uppercase px-2 mb-1 mt-1 font-heading">
                        Products
                      </h4>
                      {searchResults.products.map((p) => (
                        <div
                          key={p.id}
                          className="px-2 py-2 hover:bg-gray-50 cursor-pointer rounded flex gap-3 items-center group"
                          onClick={() => handleProductSelect(p)}
                        >
                          <img
                            src={p.image}
                            className="w-10 h-10 object-contain rounded bg-white border border-gray-100"
                            alt=""
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold text-gray-800 truncate font-heading group-hover:text-belims-blue">
                              {p.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {p.category}
                            </div>
                          </div>
                          <div className="text-sm font-bold text-belims-blue">
                            {CURRENCY_SYMBOL}
                            {p.price.toFixed(2)}
                          </div>

                          {/* Add Compare Button to Search Results */}
                          {onCompare && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onCompare(p);
                              }}
                              className="p-1.5 rounded-full hover:bg-belims-blue hover:text-white text-gray-400 transition-colors ml-2"
                              title="Compare"
                            >
                              <Scale size={16} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="p-3 bg-gray-50 border-t text-center">
                    <button
                      onClick={() => handleSearchSubmit()}
                      className="text-sm font-bold text-belims-blue hover:underline flex items-center justify-center gap-1 w-full"
                    >
                      View all results <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              )}
          </div>

          {/* Right Side Icons */}
          <div className="flex items-center gap-6 text-white">
            {/* Reorder / My Items */}
            <div className="hidden md:flex flex-col items-center cursor-pointer hover:text-gray-200 group">
              <Heart size={20} className="mb-0.5" />
              <div className="text-[11px] leading-tight font-medium">
                Reorder
              </div>
              <div className="text-sm font-bold leading-tight font-heading">
                My Items
              </div>
            </div>

            {/* Sign In / Account */}
            <div className="hidden md:flex flex-col items-center cursor-pointer hover:text-gray-200 group">
              <User size={20} className="mb-0.5" />
              <div className="text-[11px] leading-tight font-medium">
                Sign In
              </div>
              <div className="text-sm font-bold leading-tight font-heading">
                Account
              </div>
            </div>

            {/* Cart */}
            <div
              className="flex flex-col items-center cursor-pointer relative group"
              onClick={toggleCart}
            >
              <div className="relative">
                <ShoppingCart size={24} />
                <span className="absolute -top-2 -right-2 bg-belims-accent text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-belims-blue">
                  {cartCount}
                </span>
              </div>
              <div className="text-[10px] mt-0.5 font-bold hidden md:block font-heading">
                {CURRENCY_SYMBOL}
                {cartItems
                  .reduce((acc, i) => acc + i.price * i.quantity, 0)
                  .toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Light Blue Bar (Departments / Services) */}
      <div
        className="bg-blue-50 border-b border-gray-200 py-2 hidden md:block shadow-inner relative"
        onMouseLeave={() => setIsMegaMenuOpen(false)}
      >
        <div className="container mx-auto px-4 flex items-center gap-3">
          {/* Departments Button - MEGA MENU TRIGGER */}
          <div
            className={`flex items-center gap-2 border border-transparent px-4 py-1.5 rounded-full cursor-pointer font-bold text-sm transition-all shadow-sm hover:shadow font-heading ${isMegaMenuOpen ? "bg-belims-blue text-white" : "bg-white text-belims-blue hover:border-belims-blue"}`}
            onMouseEnter={() => setIsMegaMenuOpen(true)}
          >
            <LayoutGrid size={16} />
            Departments
            <ChevronDown
              size={14}
              className={`transition-transform ${isMegaMenuOpen ? "rotate-180" : ""}`}
            />
          </div>

          {/* Services Button */}
          <div className="flex items-center gap-2 bg-white border border-transparent hover:border-belims-blue text-belims-blue px-4 py-1.5 rounded-full cursor-pointer font-bold text-sm transition-all shadow-sm hover:shadow font-heading">
            <LayoutGrid size={16} />
            Services
            <ChevronDown size={14} />
          </div>

          {/* Spacer pushes CTAs to the right */}
          <div className="flex-1" />

          {/* PAINT ASSISTANT BUTTON */}
          <button
            onClick={onOpenPaintAssistant}
            className="flex items-center gap-2 bg-belims-accent/10 border border-belims-accent/20 text-belims-accent hover:bg-belims-accent hover:text-white px-4 py-1.5 rounded-full cursor-pointer font-bold text-sm transition-all shadow-sm hover:shadow font-heading"
          >
            <Sparkles size={16} />
            Paint Assistant
          </button>

          {/* ONBOARDING WIZARD BUTTON */}
          <button
            onClick={onOpenOnboarding}
            className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-600 hover:bg-blue-500 hover:text-white px-4 py-1.5 rounded-full cursor-pointer font-bold text-sm transition-all shadow-sm hover:shadow font-heading"
          >
            <ArrowRight size={16} />
            Get Started
          </button>
        </div>

        {/* Full Width Mega Menu Dropdown */}
        {isMegaMenuOpen && (
          <div
            className="absolute top-full left-0 w-full bg-white shadow-2xl border-t border-gray-200 z-[200] animate-fadeIn"
            onMouseEnter={() => setIsMegaMenuOpen(true)}
            onMouseLeave={() => setIsMegaMenuOpen(false)}
          >
            <div className="container mx-auto flex min-h-[450px]">
              {/* Left Sidebar: Top Level Categories */}
              <div className="w-1/4 bg-gray-50 py-6 border-r border-gray-100 overflow-y-auto max-h-[600px]">
                {categoryTree.map((cat) => {
                  const isActive = activeMegaCategory?.id === cat.id;
                  return (
                    <div
                      key={cat.id}
                      className={`px-6 py-3 cursor-pointer font-semibold flex justify-between items-center text-sm font-heading transition-colors ${isActive ? "bg-white text-belims-blue shadow-sm border-l-4 border-belims-blue" : "hover:bg-gray-100 text-gray-700 border-l-4 border-transparent"}`}
                      onMouseEnter={() => setActiveMegaCategory(cat)}
                    >
                      {cat.label}
                      {isActive && (
                        <ChevronDown
                          size={14}
                          className="-rotate-90 text-belims-blue"
                        />
                      )}
                    </div>
                  );
                })}
                <div className="my-4 border-t border-gray-200 mx-6"></div>
                <div className="px-6 py-2 hover:text-belims-blue cursor-pointer text-sm font-medium text-gray-600">
                  Contractor Deals
                </div>
                <div className="px-6 py-2 hover:text-belims-blue cursor-pointer text-sm font-medium text-gray-600">
                  New Power Tools
                </div>
              </div>

              {/* Right Content: Subcategories */}
              <div className="w-3/4 p-8 bg-white overflow-y-auto max-h-[600px]">
                {activeMegaCategory ? (
                  <div className="animate-fadeIn">
                    <div className="flex justify-between items-end mb-6 border-b border-gray-100 pb-4">
                      <div>
                        <h4 className="font-bold text-2xl text-belims-blue font-heading">
                          {activeMegaCategory.label}
                        </h4>
                        <p className="text-sm text-gray-500 mt-1">
                          Browse all products in {activeMegaCategory.label}
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          handleCategorySelect(activeMegaCategory.label)
                        }
                        className="text-sm font-bold text-belims-accent hover:underline flex items-center gap-1"
                      >
                        View All <ArrowRight size={14} />
                      </button>
                    </div>

                    {activeMegaCategory.children &&
                    activeMegaCategory.children.length > 0 ? (
                      <div className="grid grid-cols-3 gap-x-8 gap-y-8">
                        {activeMegaCategory.children.map((section) => (
                          <div key={section.id} className="break-inside-avoid">
                            <div className="font-bold text-gray-900 mb-3 text-base border-b border-gray-100 pb-1 flex items-center gap-2">
                              {section.label}
                            </div>
                            <div className="flex flex-col gap-2">
                              {section.children &&
                              section.children.length > 0 ? (
                                section.children.map((child) => (
                                  <button
                                    key={child.id}
                                    onClick={() =>
                                      handleCategorySelect(child.label)
                                    }
                                    className="text-sm text-gray-600 hover:text-belims-blue hover:translate-x-1 transition-transform inline-block text-left"
                                  >
                                    {child.label}
                                  </button>
                                ))
                              ) : (
                                <button
                                  onClick={() =>
                                    handleCategorySelect(section.label)
                                  }
                                  className="text-sm text-gray-600 hover:text-belims-blue hover:underline text-left"
                                >
                                  Shop {section.label}
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                        <p className="text-lg">
                          Browse all {activeMegaCategory.label} products.
                        </p>
                        <button
                          onClick={() =>
                            handleCategorySelect(activeMegaCategory.label)
                          }
                          className="mt-4 bg-belims-blue text-white px-6 py-2 rounded-full font-bold hover:bg-belims-accent transition-colors"
                        >
                          Shop Now
                        </button>
                      </div>
                    )}

                    {/* Featured / Promo Area in Menu */}
                    <div className="mt-10 grid grid-cols-2 gap-6">
                      <div className="bg-blue-50 p-5 rounded-xl flex gap-5 items-center border border-blue-100 hover:shadow-md transition-shadow cursor-pointer group">
                        <div className="bg-white p-3 rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                          <LayoutGrid className="text-belims-blue" size={24} />
                        </div>
                        <div>
                          <div className="font-bold text-belims-blue font-heading text-lg">
                            Pro Services
                          </div>
                          <div className="text-sm text-gray-600">
                            Bulk pricing for registered contractors.
                          </div>
                        </div>
                      </div>
                      <div className="bg-orange-50 p-5 rounded-xl flex gap-5 items-center border border-orange-100 hover:shadow-md transition-shadow cursor-pointer group">
                        <div className="bg-white p-3 rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                          <Sparkles className="text-orange-500" size={24} />
                        </div>
                        <div>
                          <div className="font-bold text-orange-600 font-heading text-lg">
                            Current Deals
                          </div>
                          <div className="text-sm text-gray-600">
                            Shop the latest specials and savings.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">
                    Hover a department to explore detailed categories.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 md:hidden flex">
          <div className="w-[85%] bg-white h-full shadow-xl flex flex-col">
            <div className="p-4 bg-belims-blue text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <User size={20} />
                <span className="font-bold font-heading">
                  Sign In / Account
                </span>
              </div>
              <button onClick={closeMobileMenu}>
                <X />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-gray-50">
              {/* Mobile Store Selector */}
              <div
                className="bg-white p-4 mb-2 border-b border-gray-100"
                onClick={() => {
                  toggleStoreLocator();
                  closeMobileMenu();
                }}
              >
                <div className="flex items-start gap-3">
                  <MapPin className="text-belims-blue mt-1" size={20} />
                  <div>
                    <div className="text-xs text-gray-500">Your Store</div>
                    <div className="font-bold text-belims-blue text-sm font-heading">
                      {selectedStore ? selectedStore.name : "Select Store"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile Paint Assistant */}
              <div
                className="bg-white p-4 mb-2 border-b border-gray-100"
                onClick={() => {
                  onOpenPaintAssistant();
                  closeMobileMenu();
                }}
              >
                <div className="flex items-center gap-2 text-belims-accent font-bold font-heading">
                  <Sparkles size={18} /> Paint Assistant
                </div>
              </div>

              <div className="bg-white py-2">
                <div className="px-4 py-3 font-bold text-lg border-b border-gray-100 font-heading">
                  Departments
                </div>
                {categoryTree.map((cat) => {
                  const isExpanded = expandedMobileCategory === cat.id;
                  return (
                    <div key={cat.id} className="border-b border-gray-100">
                      <button
                        className="w-full px-4 py-3 flex justify-between items-center text-gray-700 font-semibold"
                        onClick={() =>
                          setExpandedMobileCategory(isExpanded ? null : cat.id)
                        }
                      >
                        {cat.label}
                        <ChevronDown
                          size={16}
                          className={`${isExpanded ? "rotate-0" : "-rotate-90"} text-gray-400 transition-transform`}
                        />
                      </button>
                      {isExpanded &&
                        cat.children &&
                        cat.children.length > 0 && (
                          <div className="bg-gray-50">
                            {cat.children.map((sub) => (
                              <div
                                key={sub.id}
                                className="px-6 py-2 border-t border-gray-100"
                              >
                                <div className="text-sm font-semibold text-gray-800">
                                  {sub.label}
                                </div>
                                {sub.children && sub.children.length > 0 && (
                                  <div className="mt-1 flex flex-col gap-1 text-sm text-gray-600">
                                    {sub.children.map((child) => (
                                      <span
                                        key={child.id}
                                        className="pl-2 py-0.5"
                                      >
                                        {child.label}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                    </div>
                  );
                })}
              </div>

              <div className="bg-white mt-2 py-2">
                <div className="px-4 py-3 font-bold text-lg border-b border-gray-100 font-heading">
                  Help & Settings
                </div>
                <div className="px-4 py-3 border-b border-gray-100 text-gray-700">
                  Track Order
                </div>
                <div className="px-4 py-3 border-b border-gray-100 text-gray-700">
                  Help Center
                </div>
              </div>
            </div>
          </div>
          <div className="flex-1" onClick={closeMobileMenu}></div>
        </div>
      )}
    </header>
  );
};
