import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Menu,
  Search,
  ShoppingCart,
  MapPin,
  User,
  ChevronDown,
  ChevronRight,
  X,
  Heart,
  LayoutGrid,
  Sparkles,
  ArrowRight,
  Scale,
  Truck,
  LogOut,
} from "lucide-react";
import {
  Store,
  CategoryNode,
  CartItem,
  Product,
  ShippingAddress,
} from "../types";
import { CURRENCY_SYMBOL } from "../constants";
import { initializeCategoryTree } from "../categoryTree";
import { useScrollHide } from "../hooks/useScrollHide";
import { logoutUser, UserData } from "../services/authService";
import { DeliveryLocationModal } from "./DeliveryLocationModal";
import {
  buildAddressLabel,
  readStoredAddress,
  saveStoredAddress,
} from "../services/shippingAddress";
import "../global.tailwind.css";

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
  setSelectedStore: (store: Store | null) => void;
  cartItems: CartItem[];
  toggleCart: () => void;
  toggleStoreLocator: () => void;
  onOpenPaintAssistant: () => void;
  onOpenTrackOrder: () => void;
  onOpenOnboarding: () => void;
  onOpenAiAssistant: () => void;
  onCompare?: (product: Product) => void;
  products?: Product[];
  currentUser: UserData | null;
  setCurrentUser: (user: UserData | null) => void;
}

export const Header: React.FC<HeaderProps> = ({
  selectedStore,
  setSelectedStore,
  cartItems,
  toggleCart,
  toggleStoreLocator,
  onOpenPaintAssistant,
  onOpenTrackOrder,
  onOpenOnboarding,
  onOpenAiAssistant,
  onCompare,
  products = [],
  currentUser,
  setCurrentUser,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isNavbarVisible = useScrollHide({ threshold: 100 }); // Hide navbar after scrolling 100px down
  const [isMegaMenuOpen, setIsMegaMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isServicesPanelOpen, setIsServicesPanelOpen] = useState(false);
  const [isSearchCategoryDropdownOpen, setIsSearchCategoryDropdownOpen] =
    useState(false);
  const [searchCategory, setSearchCategory] = useState("All Departments");
  const [isAccountPanelOpen, setIsAccountPanelOpen] = useState(false);
  const [isDeliveryLocationModalOpen, setIsDeliveryLocationModalOpen] =
    useState(false);
  const [fulfillmentType, setFulfillmentType] = useState<
    "pickup" | "delivery" | null
  >(null);
  const [deliveryAddress, setDeliveryAddress] =
    useState<ShippingAddress | null>(null);
  const [legacyDeliveryLabel, setLegacyDeliveryLabel] = useState<string | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{
    categories: SearchCategoryResult[];
    products: Product[];
  } | null>(null);
  const [activeSearchTab, setActiveSearchTab] = useState<
    "products" | "categories"
  >("products");
  const [categoryTree, setCategoryTree] = useState<CategoryNode[]>([]);
  const [activeMegaCategory, setActiveMegaCategory] =
    useState<CategoryNode | null>(null);
  const [mobileCategoryStack, setMobileCategoryStack] = useState<
    CategoryNode[]
  >([]);

  const computeFulfillmentType = (
    stored: string | null,
    address: ShippingAddress | null,
    legacy: string | null,
    store: Store | null,
  ): "pickup" | "delivery" | null => {
    const hasDelivery = Boolean(address || legacy);
    const hasPickup = Boolean(store);

    if (stored === "delivery" && hasDelivery) return "delivery";
    if (stored === "pickup" && hasPickup) return "pickup";

    if (hasPickup && !hasDelivery) return "pickup";
    if (hasDelivery && !hasPickup) return "delivery";
    if (hasPickup && hasDelivery) {
      return stored === "pickup" ? "pickup" : "delivery";
    }

    return null;
  };

  // Load saved delivery address from localStorage on mount
  useEffect(() => {
    const { address, legacyLabel } = readStoredAddress();
    setDeliveryAddress(address);
    setLegacyDeliveryLabel(legacyLabel);
    const storedFulfillment = localStorage.getItem("fulfillmentType");
    setFulfillmentType(
      computeFulfillmentType(
        storedFulfillment,
        address,
        legacyLabel,
        selectedStore,
      ),
    );
  }, [selectedStore]);

  const handleAddressSelect = (address: ShippingAddress | null) => {
    setDeliveryAddress(address);
    setLegacyDeliveryLabel(
      address ? address.label || buildAddressLabel(address) : null,
    );
    saveStoredAddress(address);
    if (address) {
      setFulfillmentType("delivery");
    } else {
      const storedFulfillment = localStorage.getItem("fulfillmentType");
      setFulfillmentType(
        computeFulfillmentType(storedFulfillment, null, null, selectedStore),
      );
    }
  };

  useEffect(() => {
    if (!isDeliveryLocationModalOpen) {
      const storedFulfillment = localStorage.getItem("fulfillmentType");
      setFulfillmentType(
        computeFulfillmentType(
          storedFulfillment,
          deliveryAddress,
          legacyDeliveryLabel,
          selectedStore,
        ),
      );
    }
  }, [
    isDeliveryLocationModalOpen,
    deliveryAddress,
    legacyDeliveryLabel,
    selectedStore,
  ]);

  useEffect(() => {
    const handleOpenMobileMenu = () => setMobileMenuOpen(true);
    const handleOpenAccountPanel = () => setIsAccountPanelOpen(true);

    window.addEventListener(
      "belims:open-mobile-menu",
      handleOpenMobileMenu as EventListener,
    );
    window.addEventListener(
      "belims:open-account-panel",
      handleOpenAccountPanel as EventListener,
    );

    return () => {
      window.removeEventListener(
        "belims:open-mobile-menu",
        handleOpenMobileMenu as EventListener,
      );
      window.removeEventListener(
        "belims:open-account-panel",
        handleOpenAccountPanel as EventListener,
      );
    };
  }, []);

  const deliveryLabel = deliveryAddress
    ? deliveryAddress.label || buildAddressLabel(deliveryAddress)
    : legacyDeliveryLabel || "";

  const deliveryAddressDisplay = deliveryAddress?.street
    ? [deliveryAddress.street, deliveryAddress.city, deliveryAddress.province]
        .filter(Boolean)
        .join(", ")
    : deliveryLabel;

  const truncateText = (value: string, maxLength: number) => {
    if (value.length <= maxLength) return value;
    return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
  };

  const deliveryButtonTitle = fulfillmentType
    ? fulfillmentType === "pickup"
      ? "Pickup"
      : "Delivery"
    : "Pickup or Delivery?";

  const deliveryButtonSubtitle = fulfillmentType
    ? fulfillmentType === "pickup"
      ? selectedStore?.name || "Select a store"
      : deliveryAddressDisplay
        ? truncateText(deliveryAddressDisplay, 32)
        : "Select delivery address"
    : "Select your preference";

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

  const handleLogout = async () => {
    await logoutUser();
    setCurrentUser(null);
    setIsAccountPanelOpen(false);
    navigate("/");
  };

  const flatCategoryList = useMemo(
    () => flattenCategoryTree(categoryTree),
    [categoryTree],
  );

  const toggleMobileMenu = () => {
    setMobileMenuOpen((prev) => {
      const next = !prev;
      if (!next) {
        setMobileCategoryStack([]);
      }
      return next;
    });
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
    setMobileCategoryStack([]);
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
      if (matchedProds.length === 0 && matchedCats.length > 0) {
        setActiveSearchTab("categories");
      } else if (matchedProds.length > 0 && matchedCats.length === 0) {
        setActiveSearchTab("products");
      }
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

  const openMobileCategory = (category: CategoryNode) => {
    if (!category.children || category.children.length === 0) {
      handleCategorySelect(category.label);
      setMobileCategoryStack([]);
      return;
    }
    setMobileCategoryStack((prev) => [...prev, category]);
  };

  const closeMobileCategoryPanel = () => {
    setMobileCategoryStack((prev) => prev.slice(0, -1));
  };

  const handleMobileCategorySelect = (label: string) => {
    handleCategorySelect(label);
    setMobileCategoryStack([]);
  };

  const handleShopAll = () => {
    navigate("/shop");
    setIsMegaMenuOpen(false);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-[300] font-sans">
      {/* Primary Blue Bar (Walmart Style) */}
      <div className="bg-belims-blue text-white py-5 relative z-20">
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

          {/* Search Bar (Pill Shape) with Predictive Dropdown */}
          <div className="hidden md:block flex-1 relative group max-w-2xl mx-auto">
            <form
              onSubmit={handleSearchSubmit}
              className="relative flex items-center bg-white rounded-full overflow-hidden transition-all"
            >
              {/* Category Dropdown Button */}
              <div className="relative h-full hidden lg:block">
                <button
                  type="button"
                  onClick={() =>
                    setIsSearchCategoryDropdownOpen(
                      !isSearchCategoryDropdownOpen,
                    )
                  }
                  className="h-full py-3.5 pl-6 pr-4 text-gray-700 text-[13px] font-bold border-r border-gray-200 flex items-center gap-2 hover:bg-gray-50 bg-gray-50 transition-colors uppercase tracking-tight"
                  style={{ minWidth: "165px" }}
                >
                  <span className="truncate max-w-[110px]">
                    {searchCategory}
                  </span>
                  <ChevronDown
                    size={14}
                    className={`transition-transform duration-200 text-gray-400 ${
                      isSearchCategoryDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {isSearchCategoryDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsSearchCategoryDropdownOpen(false)}
                    />
                    <div className="absolute top-[calc(100%+8px)] left-0 w-64 bg-white rounded-xl  border border-gray-200 py-3 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="px-4 pb-2 mb-2 border-b border-gray-100">
                        <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
                          Shop by Category
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSearchCategory("All Departments");
                          setIsSearchCategoryDropdownOpen(false);
                        }}
                        className={`w-full text-left px-5 py-2.5 text-sm transition-colors flex items-center justify-between group ${
                          searchCategory === "All Departments"
                            ? "bg-belims-blue text-white"
                            : "hover:bg-gray-50 text-gray-700"
                        }`}
                      >
                        All Departments
                        <ChevronRight
                          size={14}
                          className={
                            searchCategory === "All Departments"
                              ? "text-white/50"
                              : "text-gray-300 group-hover:text-belims-blue"
                          }
                        />
                      </button>
                      {categoryTree.map((cat: CategoryNode) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            setSearchCategory(cat.label);
                            setIsSearchCategoryDropdownOpen(false);
                          }}
                          className={`w-full text-left px-5 py-2.5 text-sm transition-colors flex items-center justify-between group ${
                            searchCategory === cat.label
                              ? "bg-belims-blue text-white"
                              : "hover:bg-gray-50 text-gray-700"
                          }`}
                        >
                          {cat.label}
                          <ChevronRight
                            size={14}
                            className={
                              searchCategory === cat.label
                                ? "text-white/50"
                                : "text-gray-300 group-hover:text-belims-blue"
                            }
                          />
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <input
                type="text"
                placeholder="Search everything at Belims..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchCategoryDropdownOpen(false)}
                className="flex-1 py-3 px-6 text-black text-base focus:outline-none font-medium placeholder:text-gray-400"
              />
              <button
                type="submit"
                className="mr-2 bg-belims-blue p-2.5 rounded-full text-white hover:bg-belims-navy transition-all hover:scale-105 active:scale-95 "
              >
                <Search size={18} />
              </button>
            </form>

            {/* Search Results Dropdown */}
            {searchResults &&
              (searchResults.categories.length > 0 ||
                searchResults.products.length > 0) && (
                <div className="absolute top-full left-0 right-0 bg-white rounded-xl mt-2 border border-gray-200 overflow-hidden z-50 shadow-xl">
                  <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveSearchTab("products")}
                        className={`px-3 py-1.5 text-xs font-bold uppercase tracking-[1px] rounded-full border transition-colors ${
                          activeSearchTab === "products"
                            ? "bg-belims-blue text-white border-belims-blue"
                            : "bg-white text-gray-500 border-gray-200 hover:text-belims-blue"
                        }`}
                      >
                        Products
                        <span className="ml-2 text-[10px] font-bold">
                          {searchResults.products.length}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveSearchTab("categories")}
                        className={`px-3 py-1.5 text-xs font-bold uppercase tracking-[1px] rounded-full border transition-colors ${
                          activeSearchTab === "categories"
                            ? "bg-belims-blue text-white border-belims-blue"
                            : "bg-white text-gray-500 border-gray-200 hover:text-belims-blue"
                        }`}
                      >
                        Categories
                        <span className="ml-2 text-[10px] font-bold">
                          {searchResults.categories.length}
                        </span>
                      </button>
                    </div>
                    <div className="text-[11px] font-semibold text-gray-400">
                      {searchResults.products.length +
                        searchResults.categories.length}{" "}
                      results
                    </div>
                  </div>

                  <div className="max-h-[360px] overflow-y-auto">
                    {activeSearchTab === "categories" && (
                      <div className="p-3 bg-gray-50">
                        {searchResults.categories.length > 0 ? (
                          searchResults.categories.map((c) => (
                            <div
                              key={c.id}
                              className="px-3 py-2.5 hover:bg-white hover:text-belims-blue cursor-pointer rounded-lg text-sm font-semibold transition-colors"
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
                          ))
                        ) : (
                          <div className="px-3 py-6 text-sm text-gray-400 text-center">
                            No categories found
                          </div>
                        )}
                      </div>
                    )}

                    {activeSearchTab === "products" && (
                      <div className="p-3">
                        {searchResults.products.length > 0 ? (
                          searchResults.products.map((p) => (
                            <div
                              key={p.id}
                              className="px-3 py-3 hover:bg-gray-50 cursor-pointer rounded-lg flex gap-3 items-center group"
                              onClick={() => handleProductSelect(p)}
                            >
                              <img
                                src={p.image}
                                className="w-11 h-11 object-contain rounded bg-white border border-gray-100"
                                alt=""
                                loading="lazy"
                                decoding="async"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-bold text-gray-900 truncate font-heading group-hover:text-belims-blue">
                                  {p.name}
                                </div>
                                <div className="text-xs text-gray-500 truncate">
                                  {p.category}
                                </div>
                              </div>
                              <div className="text-sm font-bold text-belims-blue">
                                {CURRENCY_SYMBOL}
                                {p.price.toFixed(2)}
                              </div>

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
                          ))
                        ) : (
                          <div className="px-3 py-6 text-sm text-gray-400 text-center">
                            No products found
                          </div>
                        )}
                      </div>
                    )}
                  </div>

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

          {/* Delivery Location Button (Desktop) */}
          <button
            onClick={() => setIsDeliveryLocationModalOpen(true)}
            className="hidden md:flex items-center gap-2 bg-[#3b308e] border border-belims-blue/0 text-white hover:bg-[#251e62] px-5 py-3 rounded-full cursor-pointer font-bold text-sm transition-all font-heading w-[240px]"
          >
            <MapPin size={16} />
            <span className="min-w-0 flex-1 text-left">
              <span className="block text-[11px] font-semibold leading-tight text-white/80 text-left">
                {deliveryButtonTitle}
              </span>
              <span className="block text-sm font-bold leading-tight truncate text-left">
                {deliveryButtonSubtitle}
              </span>
            </span>
            <ChevronDown size={14} className="flex-shrink-0" />
          </button>

          {/* Right Side Icons */}
          <div className="ml-auto md:ml-0 flex items-center gap-4 md:gap-6 text-white">
            <button
              onClick={() => setIsAccountPanelOpen(true)}
              className="md:hidden flex items-center gap-2 text-white"
            >
              <User size={20} />
            </button>
            {/* Sign In / Account */}
            {currentUser ? (
              <button
                onClick={() => setIsAccountPanelOpen(true)}
                className="hidden md:flex flex-col cursor-pointer hover:text-gray-200 group header-signin"
              >
                <div className="text-[11px] leading-tight font-medium">
                  Welcome
                </div>
                <div className="text-sm font-bold leading-tight font-heading">
                  {currentUser.first_name || currentUser.username}
                </div>
              </button>
            ) : (
              <button
                onClick={() => setIsAccountPanelOpen(true)}
                className="hidden md:flex items-center justify-center w-10 h-10 rounded-full hover:bg-white/10"
                aria-label="Sign in"
                title="Sign in"
              >
                <User size={20} />
              </button>
            )}

            {/* Cart */}
            <div
              className="flex flex-col items-center cursor-pointer relative group"
              onClick={toggleCart}
            >
              <div className="relative">
                <ShoppingCart size={24} />
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-belims-accent text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-belims-blue">
                    {cartCount}
                  </span>
                )}
              </div>
              {cartCount > 0 && (
                <div className="text-[10px] mt-0.5 font-bold hidden md:block font-heading">
                  {CURRENCY_SYMBOL}
                  {cartItems
                    .reduce((acc, i) => acc + i.price * i.quantity, 0)
                    .toFixed(2)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Secondary Menu */}
      <div className="md:hidden bg-[#251e62] text-white px-4 py-3">
        <div className="space-y-3">
          <button
            onClick={() => setIsDeliveryLocationModalOpen(true)}
            className="w-full flex items-center gap-2 text-white cursor-pointer font-bold text-sm transition-all font-heading"
          >
            <MapPin size={16} />
            <span className="min-w-0 flex-1 text-left">
              <span className="block text-[11px] font-semibold leading-tight text-white/80 text-left">
                {deliveryButtonTitle}
              </span>
              <span className="block text-sm font-bold leading-tight truncate text-left">
                {deliveryButtonSubtitle}
              </span>
            </span>
            <ChevronDown size={14} className="flex-shrink-0" />
          </button>
        </div>
      </div>

      {/* Secondary Light Blue Bar (Departments / Services) */}
      <div
        className={`bg-[#251e62] border-belims-navy py-0 hidden md:block  relative transition-transform duration-300 ease-out z-10 ${isNavbarVisible ? "translate-y-0" : "-translate-y-full"}`}
        onMouseLeave={() => setIsMegaMenuOpen(false)}
      >
        <div className="container mx-auto px-4 flex items-center gap-6">
          {/* Departments Button - MEGA MENU TRIGGER */}
          <div
            className={`flex items-center gap-2 px-5 py-3.5 cursor-pointer font-bold uppercase text-[14px] transition-all tracking-tight bg-red-600 ${isMegaMenuOpen ? "bg-red-600 text-white " : " text-white"}`}
            onMouseEnter={() => setIsMegaMenuOpen(true)}
          >
            <LayoutGrid size={16} />
            Departments
            <ChevronDown
              size={14}
              className={`transition-transform ${isMegaMenuOpen ? "rotate-180" : ""}`}
            />
          </div>

          {/* Extra Links */}
          <div className="hidden lg:flex items-center gap-8 ml-2">
            <Link
              to="/brands"
              className="text-white hover:text-belims-blue-light text-[14px] font-semibold font-heading transition-colors tracking-tight"
            >
              Brands
            </Link>
            <Link
              to="/deals"
              className="text-white hover:text-belims-blue-light text-[14px] font-semibold font-heading transition-colors tracking-tight"
            >
              Deals
            </Link>
            <Link
              to="/faq"
              className="text-white hover:text-belims-blue-light text-[14px] font-semibold font-heading transition-colors tracking-tight"
            >
              FAQs
            </Link>
            <Link
              to="/about"
              className="text-white hover:text-belims-blue-light text-[14px] font-semibold font-heading transition-colors tracking-tight"
            >
              About
            </Link>
            <Link
              to="/about"
              className="text-white hover:text-belims-blue-light text-[14px] font-semibold font-heading transition-colors tracking-tight"
            >
              Trade Account
            </Link>
          </div>

          {/* Spacer pushes delivery location to the right */}
          <div className="flex-1" />

          {/* Services Button */}
          <button
            onClick={() => {
              setIsServicesPanelOpen(true);
              setIsDeliveryLocationModalOpen(false);
            }}
            className="flex items-center gap-2 bg-white/0 border-gray-200 text-white hover:bg-belims-blue hover:text-white px-4 font-base uppercase py-3 rounded cursor-pointer tracking-tight text-[13px] font-bold transition-all whitespace-nowrap"
          >
            <LayoutGrid size={16} />
            Services
            {/* <ChevronDown size={14} /> */}
          </button>

          {/* Track Your Order Button */}
          <button
            onClick={onOpenTrackOrder}
            className="flex items-center gap-2 bg-white/0 border-gray-200 text-white hover:bg-belims-blue hover:text-white px-4 font-base uppercase py-3 rounded cursor-pointer tracking-tight text-[13px] font-bold transition-all whitespace-nowrap"
          >
            <Truck size={16} />
            Track Your Order
          </button>

          {/* PAINT ASSISTANT BUTTON (temporarily disabled) */}
          {false && (
            <button
              onClick={onOpenPaintAssistant}
              className="flex items-center gap-2 bg-belims-accent/10 border border-belims-accent/20 text-belims-accent hover:bg-belims-accent hover:text-white px-4 py-1.5 rounded-full cursor-pointer font-bold text-sm transition-all   font-heading"
            >
              <Sparkles size={16} />
              Paint Assistant
            </button>
          )}

          {/* ONBOARDING WIZARD BUTTON (temporarily disabled) */}
          {false && (
            <button
              onClick={onOpenOnboarding}
              className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-600 hover:bg-blue-500 hover:text-white px-4 py-1.5 rounded-full cursor-pointer font-bold text-sm transition-all   font-heading"
            >
              <ArrowRight size={16} />
              Get Started
            </button>
          )}
        </div>

        {/* Full Width Mega Menu Dropdown */}
        {isMegaMenuOpen && (
          <div
            className="absolute top-full left-0 w-full bg-white  border-t border-gray-200 z-[200] animate-fadeIn"
            onMouseEnter={() => setIsMegaMenuOpen(true)}
            onMouseLeave={() => setIsMegaMenuOpen(false)}
          >
            <div className="container mx-auto flex min-h-[450px]">
              {/* Left Panel: Top Level Categories */}
              <div className="w-1/4 bg-gray-50 border-r border-gray-100 flex flex-col max-h-[600px]">
                <div className="flex-1 overflow-y-auto py-6">
                  <div
                    className="px-6 py-3 cursor-pointer font-semibold flex justify-between items-center text-sm font-heading transition-colors text-gray-700 hover:bg-gray-100 border-l-4 border-transparent"
                    onClick={handleShopAll}
                  >
                    Shop All
                  </div>
                  {categoryTree.map((cat: CategoryNode) => {
                    const isActive = activeMegaCategory?.id === cat.id;
                    return (
                      <div
                        key={cat.id}
                        className={`px-6 py-3 cursor-pointer font-semibold flex justify-between items-center text-sm font-heading transition-colors ${isActive ? "bg-white text-belims-blue border-l-4 border-belims-blue" : "hover:bg-gray-100 text-gray-700 border-l-4 border-transparent"}`}
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
                {activeMegaCategory && (
                  <div className="border-t border-gray-200 px-6 py-3">
                    <button
                      onClick={() =>
                        handleCategorySelect(activeMegaCategory.label)
                      }
                      className="text-sm font-bold text-belims-accent hover:underline flex items-center gap-1"
                    >
                      View all {activeMegaCategory.label}
                      <ArrowRight size={14} />
                    </button>
                  </div>
                )}
              </div>

              {/* Middle Panel: Subcategories */}
              <div className="w-2/4 p-8 bg-white overflow-y-auto max-h-[600px]">
                {activeMegaCategory ? (
                  <div className="animate-fadeIn">
                    <div className="mb-6 border-b border-gray-100 pb-4">
                      <h4 className="font-bold text-2xl text-belims-blue font-heading">
                        {activeMegaCategory.label}
                      </h4>
                      <p className="text-sm text-gray-500 mt-1">
                        Browse all products in {activeMegaCategory.label}
                      </p>
                    </div>

                    {activeMegaCategory.children &&
                    activeMegaCategory.children.length > 0 ? (
                      <div className="grid grid-cols-2 gap-x-8 gap-y-8">
                        {activeMegaCategory.children.map((section) => (
                          <div key={section.id} className="break-inside-avoid">
                            <div className="mb-3 border-b border-gray-100 pb-1 flex items-center justify-between gap-2">
                              <div className="font-bold text-gray-900 text-base">
                                {section.label}
                              </div>
                              <button
                                onClick={() =>
                                  handleCategorySelect(section.label)
                                }
                                className="text-xs font-semibold text-belims-accent hover:underline"
                              >
                                View all
                              </button>
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
                      <div className="flex flex-col items-start justify-center h-64 text-gray-500">
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
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">
                    Hover a department to explore detailed categories.
                  </p>
                )}
              </div>

              {/* Right Panel: Featured / Promo */}
              <div className="w-1/4 p-6 bg-gray-50 border-l border-gray-100">
                <div className="grid grid-cols-1 gap-6">
                  <div className="bg-blue-50 p-5 rounded-xl flex gap-5 items-center border border-blue-100 cursor-pointer group">
                    <div className="bg-white p-3 rounded-lg group-hover:scale-110 transition-transform">
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
                  <div className="bg-orange-50 p-5 rounded-xl flex gap-5 items-center border border-orange-100 cursor-pointer group">
                    <div className="bg-white p-3 rounded-lg group-hover:scale-110 transition-transform">
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
            </div>
          </div>
        )}
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 md:hidden flex">
          <div className="w-[85%] bg-white h-full  flex flex-col">
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
              <div className="bg-white py-2">
                <div className="px-4 py-3 font-bold text-lg border-b border-gray-100 font-heading">
                  Departments
                </div>
                <div className="relative overflow-x-hidden">
                  <div
                    className="flex transition-transform duration-300"
                    style={{
                      transform: `translateX(-${mobileCategoryStack.length * 100}%)`,
                    }}
                  >
                    {[null, ...mobileCategoryStack].map((panelNode, index) => {
                      const panelLabel = panelNode
                        ? panelNode.label
                        : "Departments";
                      const panelItems = panelNode
                        ? panelNode.children || []
                        : categoryTree;

                      return (
                        <div
                          key={panelNode ? panelNode.id : "root"}
                          className="min-w-full"
                        >
                          {index > 0 && (
                            <div className="border-b border-gray-100 bg-white">
                              <div className="flex items-center justify-between px-4 py-2">
                                <button
                                  className="text-sm font-semibold text-gray-600"
                                  onClick={closeMobileCategoryPanel}
                                >
                                  Back
                                </button>
                                <span className="w-10" />
                              </div>
                              <div className="px-4 py-2 bg-gray-100 text-sm font-bold text-gray-900 font-heading">
                                {panelLabel}
                              </div>
                            </div>
                          )}

                          <div className="bg-white">
                            {panelNode ? (
                              <button
                                className="w-full text-left px-4 py-3 border-b border-gray-100 text-sm font-semibold text-belims-blue"
                                onClick={() =>
                                  handleMobileCategorySelect(panelNode.label)
                                }
                              >
                                View all {panelNode.label}
                              </button>
                            ) : (
                              <button
                                className="w-full text-left px-4 py-3 border-b border-gray-100 text-sm font-semibold text-belims-blue"
                                onClick={handleShopAll}
                              >
                                Shop All
                              </button>
                            )}

                            {panelItems.map((item) => (
                              <button
                                key={item.id}
                                className="w-full px-4 py-3 flex justify-between items-center text-gray-700 font-semibold border-b border-gray-100"
                                onClick={() => openMobileCategory(item)}
                              >
                                {item.label}
                                {item.children && item.children.length > 0 ? (
                                  <ChevronDown
                                    size={16}
                                    className="-rotate-90 text-gray-400 transition-transform"
                                  />
                                ) : null}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
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

      {/* Services Side Panel */}
      {isServicesPanelOpen && (
        <div className="fixed inset-0 z-[9999] overflow-hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => setIsServicesPanelOpen(false)}
          ></div>

          <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white  flex flex-col">
            {/* Header */}
            <div className="p-4 bg-belims-blue text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <LayoutGrid size={20} />
                <span className="font-bold font-heading">Services</span>
              </div>
              <button
                onClick={() => setIsServicesPanelOpen(false)}
                className="text-white hover:text-gray-200"
              >
                <X size={24} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto">
              <div className="bg-white py-0">
                <div className="px-4 py-3 font-bold text-lg border-b border-gray-100 font-heading">
                  Services
                </div>
                <Link
                  to="/services/installation"
                  onClick={() => setIsServicesPanelOpen(false)}
                  className="w-full px-4 py-3 flex justify-between items-center text-gray-700 font-semibold border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  Installation & Services
                </Link>
                <Link
                  to="/services/tool-rental"
                  onClick={() => setIsServicesPanelOpen(false)}
                  className="w-full px-4 py-3 flex justify-between items-center text-gray-700 font-semibold border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  Tool Rental
                </Link>
                <Link
                  to="/services/truck-rental"
                  onClick={() => setIsServicesPanelOpen(false)}
                  className="w-full px-4 py-3 flex justify-between items-center text-gray-700 font-semibold border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  Truck Rental
                </Link>
                <Link
                  to="/services/equipment-rental"
                  onClick={() => setIsServicesPanelOpen(false)}
                  className="w-full px-4 py-3 flex justify-between items-center text-gray-700 font-semibold border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  Large Equipment Rental
                </Link>
                <Link
                  to="/credit-cards"
                  onClick={() => setIsServicesPanelOpen(false)}
                  className="w-full px-4 py-3 flex justify-between items-center text-gray-700 font-semibold border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  Belims Credit Cards
                </Link>
                <Link
                  to="/protection-plans"
                  onClick={() => setIsServicesPanelOpen(false)}
                  className="w-full px-4 py-3 flex justify-between items-center text-gray-700 font-semibold border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  Protection Plans
                </Link>
                <button
                  onClick={() => {
                    setIsServicesPanelOpen(false);
                    onOpenPaintAssistant();
                  }}
                  className="w-full px-4 py-3 flex justify-between items-center text-gray-700 font-semibold border-b border-gray-100 hover:bg-gray-50 transition-colors text-left"
                >
                  Paint Assistant
                </button>
                <button
                  onClick={() => {
                    setIsServicesPanelOpen(false);
                    onOpenAiAssistant();
                  }}
                  className="w-full px-4 py-3 flex justify-between items-center text-gray-700 font-semibold border-b border-gray-100 hover:bg-gray-50 transition-colors text-left"
                >
                  AI Helper
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Account Side Panel */}
      {isAccountPanelOpen && (
        <div className="fixed inset-0 z-[9999] overflow-hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => setIsAccountPanelOpen(false)}
          ></div>

          <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white  flex flex-col">
            {/* Header */}
            <div className="p-4 bg-belims-blue text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <User size={20} />
                <span className="font-bold font-heading">
                  {currentUser
                    ? `Welcome, ${currentUser.first_name || currentUser.username}!`
                    : "Sign in or Create an Account"}
                </span>
              </div>
              <button
                onClick={() => setIsAccountPanelOpen(false)}
                className="text-white hover:text-gray-200"
              >
                <X size={24} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto bg-gray-50">
              {currentUser ? (
                <>
                  {/* Dashboard Button for Logged In Users */}
                  <div className="bg-white py-0 mb-2">
                    <div className="px-4 py-3 font-bold text-lg border-b border-gray-100 font-heading">
                      Account
                    </div>
                    <button
                      onClick={() => {
                        navigate("/account");
                        setIsAccountPanelOpen(false);
                      }}
                      className="w-full px-4 py-3 flex justify-between items-center text-gray-700 font-semibold border-b border-gray-100 hover:bg-gray-50 transition-colors text-left"
                    >
                      Dashboard
                    </button>
                  </div>

                  {/* <div className="p-5">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <p className="text-sm text-green-800">
                        You are logged in as{" "}
                        <strong>{currentUser.email}</strong>
                      </p>
                      {currentUser.roles?.includes("contractor") && (
                        <p className="text-xs text-green-700 mt-1">
                          Account type: Contractor
                        </p>
                      )}
                    </div>
                  </div> */}
                </>
              ) : null}

              {/* Account Links - Only show when logged in */}
              {currentUser && (
                <>
                  <div className="bg-white py-0">
                    <div className="px-4 py-3 font-bold text-lg border-b border-gray-100 font-heading">
                      Extra Links
                    </div>
                    <button
                      onClick={() => {
                        setIsAccountPanelOpen(false);
                        onOpenTrackOrder();
                      }}
                      className="w-full px-4 py-3 flex justify-between items-center text-gray-700 font-semibold border-b border-gray-100 hover:bg-gray-50 transition-colors text-left"
                    >
                      Track Order
                    </button>
                    <Link
                      to="/account/cards"
                      onClick={() => setIsAccountPanelOpen(false)}
                      className="w-full px-4 py-3 flex justify-between items-center text-gray-700 font-semibold border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      Cards & Accounts
                    </Link>
                    <Link
                      to="/account/pay"
                      onClick={() => setIsAccountPanelOpen(false)}
                      className="w-full px-4 py-3 flex justify-between items-center text-gray-700 font-semibold border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      Pay Credit Card Bill
                    </Link>
                    <Link
                      to="/account/discounts"
                      onClick={() => setIsAccountPanelOpen(false)}
                      className="w-full px-4 py-3 flex justify-between items-center text-gray-700 font-semibold border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      Discount Benefits
                    </Link>
                  </div>
                </>
              )}

              {/* Contractor/Trade Block - Only show when not logged in OR when logged in but not a contractor */}
              {(!currentUser || !currentUser.roles?.includes("contractor")) && (
                <div className="p-5 bg-blue-50 border-b">
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <div className="font-bold text-gray-900 mb-2">
                        Are you a Contractor?
                      </div>
                      <div className="text-sm text-gray-700 mb-3 leading-relaxed">
                        See trade pricing across our range and unlock checkout
                        access with a trade account.
                      </div>
                      <div className="text-sm text-gray-700 mb-3 leading-relaxed">
                        Bulk pricing, site delivery and exclusive trade-only
                        deals — built for professionals.
                      </div>
                      <Link
                        to="/register?type=trade"
                        onClick={() => setIsAccountPanelOpen(false)}
                        className="text-belims-accent font-semibold text-sm hover:underline inline-flex items-center gap-1"
                      >
                        Register for Trade Deals
                        <ArrowRight size={14} />
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {/* Logout button at bottom - Only show when logged in */}
            </div>

            {/* Bottom action area */}
            {currentUser ? (
              <div className="p-5 border-t bg-white">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white font-semibold rounded hover:bg-red-700 transition-colors"
                >
                  <LogOut size={18} />
                  Log out
                </button>
              </div>
            ) : (
              <div className="p-5 border-t bg-white">
                <div className="grid grid-cols-2 gap-3">
                  <Link
                    to="/login"
                    onClick={() => setIsAccountPanelOpen(false)}
                    className="w-full h-[46px] flex items-center justify-center gap-2 px-4 py-3 bg-belims-blue text-white font-semibold rounded hover:bg-red-700 transition-colors"
                  >
                    Sign in
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setIsAccountPanelOpen(false)}
                    className="h-[46px] bg-white flex items-center justify-center gap-2 border border-belims-blue text-belims-blue py-3 px-4 rounded font-semibold text-center hover:bg-belims-blue hover:text-white transition-colors"
                  >
                    Create an Account
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delivery Location Modal */}
      <DeliveryLocationModal
        isOpen={isDeliveryLocationModalOpen}
        onClose={() => setIsDeliveryLocationModalOpen(false)}
        currentAddress={deliveryAddress || undefined}
        onAddressSelect={handleAddressSelect}
        currentStore={selectedStore}
        onStoreSelect={setSelectedStore}
      />
    </header>
  );
};
