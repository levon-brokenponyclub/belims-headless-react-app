import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search,
  ShoppingBasket,
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
import { logoutUser, UserData } from "../services/authService";
import { DeliveryLocationModal } from "./DeliveryLocationModal";
import { MegaMenu } from "./MegaMenu";
import { SearchResults } from "./SearchResults";
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
  const [isNavbarVisible, setIsNavbarVisible] = useState(true);
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
  const [categoryTree, setCategoryTree] = useState<CategoryNode[]>([]);
  const [activeMegaCategory, setActiveMegaCategory] =
    useState<CategoryNode | null>(null);
  const [mobileCategoryStack, setMobileCategoryStack] = useState<
    CategoryNode[]
  >([]);
  const megaMenuCloseTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsNavbarVisible(window.scrollY <= 2);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const computeFulfillmentType = (
    stored: string | null,
    address: ShippingAddress | null,
    legacy: string | null,
    store: Store | null,
    pickupSelected: boolean,
  ): "pickup" | "delivery" | null => {
    const hasStoredPreference = stored === "pickup" || stored === "delivery";
    const hasDelivery = Boolean(address || legacy);
    const hasPickup = Boolean(store && pickupSelected && stored === "pickup");

    if (!hasStoredPreference && !hasDelivery && !hasPickup) return null;

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
    const pickupSelected =
      localStorage.getItem("pickupStoreSelected") === "true";
    setFulfillmentType(
      computeFulfillmentType(
        storedFulfillment,
        address,
        legacyLabel,
        selectedStore,
        pickupSelected,
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
      const pickupSelected =
        localStorage.getItem("pickupStoreSelected") === "true";
      setFulfillmentType(
        computeFulfillmentType(
          storedFulfillment,
          null,
          null,
          selectedStore,
          pickupSelected,
        ),
      );
    }
  };

  useEffect(() => {
    if (!isDeliveryLocationModalOpen) {
      const storedFulfillment = localStorage.getItem("fulfillmentType");
      const pickupSelected =
        localStorage.getItem("pickupStoreSelected") === "true";
      setFulfillmentType(
        computeFulfillmentType(
          storedFulfillment,
          deliveryAddress,
          legacyDeliveryLabel,
          selectedStore,
          pickupSelected,
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
    const handleFulfillmentChange = () => {
      const storedFulfillment = localStorage.getItem("fulfillmentType");
      const pickupSelected =
        localStorage.getItem("pickupStoreSelected") === "true";
      setFulfillmentType(
        computeFulfillmentType(
          storedFulfillment,
          deliveryAddress,
          legacyDeliveryLabel,
          selectedStore,
          pickupSelected,
        ),
      );
    };

    window.addEventListener(
      "belims:open-mobile-menu",
      handleOpenMobileMenu as EventListener,
    );
    window.addEventListener(
      "belims:open-account-panel",
      handleOpenAccountPanel as EventListener,
    );
    window.addEventListener(
      "belims:fulfillment-changed",
      handleFulfillmentChange as EventListener,
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
      window.removeEventListener(
        "belims:fulfillment-changed",
        handleFulfillmentChange as EventListener,
      );
    };
  }, [deliveryAddress, legacyDeliveryLabel, selectedStore]);

  const pickupLabel = selectedStore?.name || "Select Store";
  const deliveryLabelText =
    deliveryAddress?.postalCode?.trim() || "Enter Address";

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
      const queryWords = lowerQuery.split(/\s+/).filter(Boolean);

      const matchedCats = flatCategoryList.filter(
        (cat) =>
          cat.label.toLowerCase().includes(lowerQuery) ||
          cat.fullPath.toLowerCase().includes(lowerQuery),
      );
      const matchedProds = products
        .map((p) => {
          const nameLower = p.name.toLowerCase();
          const categoryLower = p.category.toLowerCase();
          const skuLower = (p.sku || "").toLowerCase();
          const descriptionLower = (p.description || "").toLowerCase();

          const isExactSkuMatch = skuLower === lowerQuery;
          const isExactTitleMatch = nameLower === lowerQuery;
          const matchesTitlePhrase = nameLower.includes(lowerQuery);
          const matchesAllWordsInTitle =
            queryWords.length > 0 &&
            queryWords.every((word) => nameLower.includes(word));
          const matchesCategory = categoryLower.includes(lowerQuery);
          const matchesSku = skuLower.includes(lowerQuery);
          const matchesDescription = descriptionLower.includes(lowerQuery);

          const isMatch =
            matchesTitlePhrase ||
            matchesAllWordsInTitle ||
            matchesCategory ||
            matchesSku ||
            matchesDescription;

          if (!isMatch) {
            return null;
          }

          let score = 0;
          if (isExactSkuMatch) score += 120;
          if (isExactTitleMatch) score += 110;
          if (matchesTitlePhrase) score += 90;
          if (matchesAllWordsInTitle) score += 85;
          if (matchesSku) score += 80;
          if (matchesCategory) score += 40;
          if (matchesDescription) score += 20;

          return { product: p, score };
        })
        .filter((entry): entry is { product: Product; score: number } =>
          Boolean(entry),
        )
        .sort((a, b) => b.score - a.score)
        .map((entry) => entry.product);
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

  const openMegaMenu = () => {
    if (megaMenuCloseTimerRef.current !== null) {
      window.clearTimeout(megaMenuCloseTimerRef.current);
      megaMenuCloseTimerRef.current = null;
    }
    setIsMegaMenuOpen(true);
  };

  const closeMegaMenu = () => {
    if (megaMenuCloseTimerRef.current !== null) {
      window.clearTimeout(megaMenuCloseTimerRef.current);
    }

    megaMenuCloseTimerRef.current = window.setTimeout(() => {
      setIsMegaMenuOpen(false);
      megaMenuCloseTimerRef.current = null;
    }, 140);
  };

  useEffect(() => {
    return () => {
      if (megaMenuCloseTimerRef.current !== null) {
        window.clearTimeout(megaMenuCloseTimerRef.current);
      }
    };
  }, []);

  return (
    <header className="sticky top-0 z-[1200] font-sans overflow-visible shadow-[5px_0_30px_0_rgb(0_0_0_/_.08)]">
      <section className="w-full bg-surface border-b border-subtle">
        <div className="bg-brand text-white">
          <div className="container mx-auto px-0">
            <div className="flex flex-col gap-3 py-0 text-base md:flex-row md:items-center md:py-3 md:px-4">
              <div className="hidden md:flex items-center gap-4 text-base font-normal">
                <Link to="/faq" className="hover:text-white/80">
                  Help Center
                </Link>
                <button
                  type="button"
                  onClick={onOpenTrackOrder}
                  className="hover:text-white/80"
                >
                  Track Your Order
                </button>
                <Link to="/wishlist" className="hover:text-white/80">
                  Wishlist
                </Link>
              </div>
              <div className="hidden md:block md:ml-auto">
                <div className="flex items-center divide-x divide-white/40">
                  <button
                    type="button"
                    onClick={() => setIsDeliveryLocationModalOpen(true)}
                    className="flex items-center gap-3 px-3 text-left w-full whitespace-nowrap"
                  >
                    <MapPin size={15} className="flex-shrink-0" />
                    <span className="flex flex-col md:flex-row md:items-center md:gap-2 min-w-0">
                      <span className="text-sm text-white/80 md:text-[13px] whitespace-nowrap">
                        Pickup from:
                      </span>
                      <span className="text-sm font-semibold text-white truncate md:text-[13px] md:truncate">
                        {pickupLabel}
                      </span>
                    </span>
                    <ChevronRight size={14} className="flex-shrink-0 ml-auto" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsDeliveryLocationModalOpen(true)}
                    className="flex items-center gap-3 px-3 text-left pl-6"
                  >
                    <Truck size={15} className="flex-shrink-0" />
                    <span className="flex flex-col md:flex-row md:items-center md:gap-2 min-w-0">
                      <span className="text-sm text-white/80 md:text-[13px] whitespace-nowrap">
                        Deliver to:
                      </span>
                      <span className="text-sm font-semibold text-white leading-tight truncate md:text-[13px] md:leading-normal md:truncate">
                        {deliveryLabelText}
                      </span>
                    </span>
                    <ChevronRight size={14} className="flex-shrink-0 ml-auto" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="w-full bg-surface border-b border-subtle">
        <div className="container mx-auto px-4">
          <div className="relative flex items-center justify-between gap-3 py-4 md:py-5">
            <div className="relative flex items-center gap-2 flex-shrink-0 min-h-[44px]">
              <button
                type="button"
                className="md:hidden text-grey"
                onClick={toggleMobileMenu}
                aria-label="Open menu"
              >
                <div className="w-8 h-8 relative flex items-center justify-center">
                  <svg
                    width="100%"
                    height="100%"
                    viewBox="0 0 100 100"
                    className="overflow-visible"
                  >
                    <path
                      d="M 20,29.000046 H 80.000231 C 80.000231,29.000046 94.498839,28.817352 94.532987,66.711331 94.543142,77.980673 90.966081,81.670246 85.259173,81.668997 79.552261,81.667751 75.000211,74.999942 75.000211,74.999942 L 25.000021,25.000058"
                      style={{
                        fill: "none",
                        stroke: "currentColor",
                        strokeWidth: 8,
                        strokeLinecap: "round",
                        transition:
                          "stroke-dasharray 600ms cubic-bezier(0.4, 0, 0.2, 1), stroke-dashoffset 600ms cubic-bezier(0.4, 0, 0.2, 1)",
                        strokeDasharray: "60, 207",
                        strokeDashoffset: 0,
                      }}
                    />
                    <path
                      d="M 20,50 H 80"
                      style={{
                        fill: "none",
                        stroke: "currentColor",
                        strokeWidth: 8,
                        strokeLinecap: "round",
                        transition:
                          "stroke-dasharray 600ms cubic-bezier(0.4, 0, 0.2, 1), stroke-dashoffset 600ms cubic-bezier(0.4, 0, 0.2, 1)",
                        strokeDasharray: "60, 60",
                        strokeDashoffset: 0,
                      }}
                    />
                    <path
                      d="M 20,70.999954 H 80.000231 C 80.000231,70.999954 94.498839,71.182648 94.532987,33.288669 94.543142,22.019327 90.966081,18.329754 85.259173,18.331003 79.552261,18.332249 75.000211,25.000058 75.000211,25.000058 L 25.000021,74.999942"
                      style={{
                        fill: "none",
                        stroke: "currentColor",
                        strokeWidth: 8,
                        strokeLinecap: "round",
                        transition:
                          "stroke-dasharray 600ms cubic-bezier(0.4, 0, 0.2, 1), stroke-dashoffset 600ms cubic-bezier(0.4, 0, 0.2, 1)",
                        strokeDasharray: "60, 207",
                        strokeDashoffset: 0,
                      }}
                    />
                  </svg>
                </div>
              </button>
              <button
                type="button"
                onClick={toggleMobileMenu}
                aria-label="Open menu"
                className={`hidden lg:flex items-center justify-center rounded-pill text-grey transition-all font-bold duration-300 overflow-hidden ${
                  isNavbarVisible
                    ? "w-10 opacity-0 -translate-x-2 pointer-events-none"
                    : "w-10 h-10 opacity-100 translate-x-0"
                }`}
              >
                <div className="w-8 h-8 relative flex items-center justify-center">
                  <svg
                    width="100%"
                    height="100%"
                    viewBox="0 0 100 100"
                    className="overflow-visible"
                  >
                    <path
                      d="M 20,29.000046 H 80.000231 C 80.000231,29.000046 94.498839,28.817352 94.532987,66.711331 94.543142,77.980673 90.966081,81.670246 85.259173,81.668997 79.552261,81.667751 75.000211,74.999942 75.000211,74.999942 L 25.000021,25.000058"
                      style={{
                        fill: "none",
                        stroke: "currentColor",
                        strokeWidth: 8,
                        strokeLinecap: "round",
                        transition:
                          "stroke-dasharray 600ms cubic-bezier(0.4, 0, 0.2, 1), stroke-dashoffset 600ms cubic-bezier(0.4, 0, 0.2, 1)",
                        strokeDasharray: "60, 207",
                        strokeDashoffset: 0,
                      }}
                    />
                    <path
                      d="M 20,50 H 80"
                      style={{
                        fill: "none",
                        stroke: "currentColor",
                        strokeWidth: 8,
                        strokeLinecap: "round",
                        transition:
                          "stroke-dasharray 600ms cubic-bezier(0.4, 0, 0.2, 1), stroke-dashoffset 600ms cubic-bezier(0.4, 0, 0.2, 1)",
                        strokeDasharray: "60, 60",
                        strokeDashoffset: 0,
                      }}
                    />
                    <path
                      d="M 20,70.999954 H 80.000231 C 80.000231,70.999954 94.498839,71.182648 94.532987,33.288669 94.543142,22.019327 90.966081,18.329754 85.259173,18.331003 79.552261,18.332249 75.000211,25.000058 75.000211,25.000058 L 25.000021,74.999942"
                      style={{
                        fill: "none",
                        stroke: "currentColor",
                        strokeWidth: 8,
                        strokeLinecap: "round",
                        transition:
                          "stroke-dasharray 600ms cubic-bezier(0.4, 0, 0.2, 1), stroke-dashoffset 600ms cubic-bezier(0.4, 0, 0.2, 1)",
                        strokeDasharray: "60, 207",
                        strokeDashoffset: 0,
                      }}
                    />
                  </svg>
                </div>
              </button>

              <Link
                to="/"
                className={`absolute left-0 top-1/2 -translate-y-1/2 z-10 flex w-[140px] items-center gap-2 px-0 py-2 bg-white rounded-pill transition-transform duration-300 ${
                  isNavbarVisible ? "translate-x-0" : "translate-x-12"
                }`}
              >
                <img
                  src="/images/belims-logo-dark.png"
                  alt="Belims Hardware"
                  className="h-8 md:h-10 w-auto object-contain"
                />
              </Link>
            </div>

            <div className="hidden lg:block absolute left-1/2 -translate-x-1/2 w-full max-w-2xl z-20">
              <form
                onSubmit={handleSearchSubmit}
                className="relative flex items-center border border-grey-light bg-grey-light rounded-full overflow-hidden transition-[background-color,border-color] duration-200 ease-in-out focus-within:bg-white focus-within:border-grey"
              >
                <div className="relative h-full hidden xl:block">
                  <button
                    type="button"
                    onClick={() =>
                      setIsSearchCategoryDropdownOpen(
                        !isSearchCategoryDropdownOpen,
                      )
                    }
                    className="h-full py-3 pl-5 pr-4 text-grey text-base font-semibold border-r border-subtle flex items-center gap-2 bg-grey-light"
                    style={{ minWidth: "160px" }}
                  >
                    <span className="">{searchCategory}</span>
                    <ChevronDown
                      size={14}
                      className={`transition-transform duration-200 text-muted ${
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
                      <div className="absolute top-[calc(100%+8px)] left-0 w-64 bg-surface rounded-block border border-subtle py-3 z-50 shadow-pop">
                        <div className="px-4 pb-2 mb-2 border-b border-subtle">
                          <span className="text-[10px] font-black uppercase text-muted tracking-widest">
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
                              ? "bg-brand text-white"
                              : "hover:bg-soft text-ink"
                          }`}
                        >
                          All Departments
                          <ChevronRight
                            size={14}
                            className={
                              searchCategory === "All Departments"
                                ? "text-white/50"
                                : "text-subtle group-hover:text-brand"
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
                                ? "bg-brand text-white"
                                : "hover:bg-soft text-ink"
                            }`}
                          >
                            {cat.label}
                            <ChevronRight
                              size={14}
                              className={
                                searchCategory === cat.label
                                  ? "text-white/50"
                                  : "text-subtle group-hover:text-brand"
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
                  placeholder="What are you looking for?"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchCategoryDropdownOpen(false)}
                  className="input flex-1 bg-transparent border-0 text-grey placeholder:text-grey/85 focus:ring-0 focus:outline-none focus:text-grey rounded-none"
                  aria-label="Search products"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setSearchResults(null);
                    }}
                    className="px-3 text-grey text-sm font-bold hover:text-ink transition-colors"
                    aria-label="Clear search"
                  >
                    Clear
                  </button>
                )}
                <button
                  type="submit"
                  className="mr-1 icon-btn bg-grey-light text-grey border-0 hover:bg-ink"
                  aria-label="Search"
                >
                  <Search size={18} />
                </button>
              </form>

              <SearchResults
                searchResults={searchResults}
                searchQuery={searchQuery}
                onViewAllResults={() => handleSearchSubmit()}
                onCategorySelect={handleCategorySelect}
                onProductSelect={handleProductSelect}
                addToCart={() => {}}
                onBuyNow={() => {}}
                onCompare={onCompare}
                isAuthenticated={!!currentUser}
                isTradeApproved={false}
              />
            </div>

            <div className="hidden md:flex items-center gap-3 text-grey">
              <button
                type="button"
                className="group relative h-12 rounded-full border border-white bg-white px-4 pl-1 overflow-hidden transition-colors hover:border-grey hover:text-white"
                onClick={() => setIsAccountPanelOpen(true)}
              >
                <span className="absolute inset-0 origin-left scale-x-0 bg-grey transition-transform duration-300 ease-out group-hover:scale-x-100"></span>
                <div className="relative z-10 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-grey-light transition-colors group-hover:bg-white">
                    <User
                      size={20}
                      className="text-grey transition-colors group-hover:text-grey"
                    />
                  </span>
                  <span className="text-base font-bold text-grey transition-colors group-hover:text-white">
                    {currentUser
                      ? currentUser.first_name || currentUser.username
                      : "Sign In/Register"}
                  </span>
                </div>
              </button>

              <button
                type="button"
                className="h-[48px] w-[48px] rounded-full flex items-center justify-center p-0 right-2 bg-grey-light relative"
                onClick={toggleCart}
              >
                <ShoppingBasket size={20} strokeWidth={1.5} />
                {cartCount > 0 && (
                  <span className="text-[10px] font-bold text-white bg-red-muted rounded-full absolute w-5 h-5 top-0.5 -right-1 flex items-center justify-center leading-none">
                    {cartCount}
                  </span>
                )}
                {/* {cartCount > 0 && (
                  <span className="text-xs font-bold text-brand">
                    {CURRENCY_SYMBOL}
                    {cartItems
                      .reduce((acc, i) => acc + i.price * i.quantity, 0)
                      .toFixed(2)}
                  </span>
                )} */}
              </button>
            </div>

            <div className="flex md:hidden items-center gap-3 text-ink">
              <button
                type="button"
                className="h-10 w-10 rounded-full border border-subtle bg-white text-grey flex items-center justify-center"
                onClick={() => setIsAccountPanelOpen(true)}
                aria-label="Account"
              >
                <User size={18} />
              </button>
              <button
                type="button"
                className="h-10 w-10 rounded-full border border-subtle bg-white text-grey flex items-center justify-center relative"
                onClick={toggleCart}
                aria-label="Cart"
              >
                <ShoppingBasket size={18} />
                {cartCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 bg-red-muted text-white text-[10px] font-bold w-5 h-5 rounded-pill flex items-center justify-center leading-none">
                    {cartCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Delivery Bar - moved below logo bar */}
        <div className="md:hidden w-full bg-brand text-white border-t border-white/20">
          <div className="container mx-auto px-4">
            <button
              type="button"
              onClick={() => setIsDeliveryLocationModalOpen(true)}
              className="flex items-center justify-between w-full py-2.5"
            >
              <div className="flex items-center gap-3">
                <div className="bg-white/10 p-1.5 rounded-full">
                  <Truck size={16} />
                </div>
                <span className="font-bold text-sm">Delivery</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-white/90">
                <span className="truncate max-w-[200px] font-medium">
                  {deliveryLabelText}
                </span>
                <ChevronDown size={14} />
              </div>
            </button>
          </div>
        </div>

        <div
          className={`hidden md:block overflow-hidden transition-[max-height,opacity,transform] duration-200 ease-out ${
            isNavbarVisible
              ? "max-h-[400px] opacity-100 translate-y-0"
              : "max-h-0 opacity-0 -translate-y-2 pointer-events-none"
          }`}
        >
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between gap-4 p-0 pt-0 pb-2">
              <div className="hidden md:block lg:hidden flex-1">
                <form onSubmit={handleSearchSubmit} className="relative">
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full border border-subtle rounded-pill py-2.5 pl-4 pr-10 text-sm bg-surface text-ink placeholder-muted transition-[background-color,border-color,color] duration-200 ease-in-out focus:outline-none focus:ring-0 focus:bg-white focus:border-grey-900 focus:text-grey-900"
                    aria-label="Search products"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted">
                    <Search size={16} />
                  </span>
                </form>
              </div>

              <nav
                className={`hidden lg:flex items-center gap-3 flex-1 ${
                  isNavbarVisible ? "opacity-100" : "opacity-0"
                } transition-opacity duration-300`}
              >
                {/* Categories Button */}
                <div
                  className="relative"
                  onMouseEnter={openMegaMenu}
                  onMouseLeave={closeMegaMenu}
                >
                  <button
                    type="button"
                    className={`flex items-center gap-2 font-semibold px-3 py-2 rounded-md text-white transition-all hover:bg-red-muted ${
                      isMegaMenuOpen ? "bg-red-muted" : "bg-belims-blue"
                    }`}
                  >
                    <LayoutGrid size={16} />
                    All Categories
                    <ChevronDown
                      size={14}
                      className={`transition-transform ${
                        isMegaMenuOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                </div>

                <Link
                  to="/deals"
                  className="text-base mx-3 ml-4 font-semibold text-grey hover:text-brand transition-colors"
                >
                  Deals of the Week
                </Link>
                <Link
                  to="/new"
                  className="text-base mx-3 font-semibold text-grey hover:text-brand transition-colors"
                >
                  New Arrivals
                </Link>
                <Link
                  to="/brands"
                  className="text-base mx-3 font-semibold text-grey hover:text-brand transition-colors"
                >
                  Brands
                </Link>
                <Link
                  to="/about"
                  className="text-base mx-3 font-semibold text-grey hover:text-brand transition-colors"
                >
                  About
                </Link>
                <Link
                  to="/faq"
                  className="text-base mx-3 font-semibold text-grey hover:text-brand transition-colors"
                >
                  FAQs
                </Link>
              </nav>

              <div className="hidden lg:flex items-center gap-3">
                {/* <button
                  type="button"
                  onClick={() => {
                    setIsServicesPanelOpen(true);
                    setIsDeliveryLocationModalOpen(false);
                  }}
                  <div className="w-8 h-8 relative flex items-center justify-center">
                    <svg
                      width="100%"
                      height="100%"
                      viewBox="0 0 100 100"
                      className="overflow-visible"
                    >
                      <path
                        d="M 20,29.000046 H 80.000231 C 80.000231,29.000046 94.498839,28.817352 94.532987,66.711331 94.543142,77.980673 90.966081,81.670246 85.259173,81.668997 79.552261,81.667751 75.000211,74.999942 75.000211,74.999942 L 25.000021,25.000058"
                        style={{
                          fill: "none",
                          stroke: "white",
                          strokeWidth: 8,
                          strokeLinecap: "round",
                          transition:
                            "stroke-dasharray 600ms cubic-bezier(0.4, 0, 0.2, 1), stroke-dashoffset 600ms cubic-bezier(0.4, 0, 0.2, 1)",
                          strokeDasharray: "60, 207",
                          strokeDashoffset: 0,
                        }}
                      />
                      <path
                        d="M 20,50 H 80"
                        style={{
                          fill: "none",
                          stroke: "white",
                          strokeWidth: 8,
                          strokeLinecap: "round",
                          transition:
                            "stroke-dasharray 600ms cubic-bezier(0.4, 0, 0.2, 1), stroke-dashoffset 600ms cubic-bezier(0.4, 0, 0.2, 1)",
                          strokeDasharray: "60, 60",
                          strokeDashoffset: 0,
                        }}
                      />
                      <path
                        d="M 20,70.999954 H 80.000231 C 80.000231,70.999954 94.498839,71.182648 94.532987,33.288669 94.543142,22.019327 90.966081,18.329754 85.259173,18.331003 79.552261,18.332249 75.000211,25.000058 75.000211,25.000058 L 25.000021,74.999942"
                        style={{
                          fill: "none",
                          stroke: "white",
                          strokeWidth: 8,
                          strokeLinecap: "round",
                          transition:
                            "stroke-dasharray 600ms cubic-bezier(0.4, 0, 0.2, 1), stroke-dashoffset 600ms cubic-bezier(0.4, 0, 0.2, 1)",
                          strokeDasharray: "60, 207",
                          strokeDashoffset: 0,
                        }}
                      />
                    </svg>
                  </div>
                >
                  <LayoutGrid size={16} />
                  Services
                </button> */}
                {/* <button
                  type="button"
                  onClick={onOpenTrackOrder}
                  className="flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 text-sm font-semibold text-gray-700 hover:border-belims-blue hover:text-belims-blue"
                >
                  <Truck size={16} />
                  Track Your Order
                </button> */}

                {false && (
                  <button
                    type="button"
                    onClick={onOpenOnboarding}
                    className="flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 text-sm font-semibold text-gray-700 hover:border-belims-blue hover:text-belims-blue"
                  >
                    <ArrowRight size={16} />
                    Get Started
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mega Menu - Positioned outside main section to prevent clipping */}
      <MegaMenu
        isOpen={isMegaMenuOpen}
        categoryTree={categoryTree}
        activeMegaCategory={activeMegaCategory}
        setActiveMegaCategory={setActiveMegaCategory}
        handleShopAll={handleShopAll}
        handleCategorySelect={handleCategorySelect}
        products={products}
        onMouseEnter={openMegaMenu}
        onMouseLeave={closeMegaMenu}
      />

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex">
          <div className="w-[85%] max-w-sm bg-surface h-full flex flex-col">
            <div className="p-4 bg-brand text-white flex justify-between items-center">
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

            <div className="flex-1 overflow-y-auto bg-soft">
              <div className="bg-surface py-2">
                <div className="px-4 py-3 font-bold text-lg border-b border-subtle font-heading text-ink">
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
                            <div className="border-b border-subtle bg-surface">
                              <div className="flex items-center justify-between px-4 py-2">
                                <button
                                  className="text-sm font-bold text-muted"
                                  onClick={closeMobileCategoryPanel}
                                >
                                  Back
                                </button>
                                <span className="w-10" />
                              </div>
                              <div className="px-4 py-2 bg-soft text-sm font-bold text-ink font-heading">
                                {panelLabel}
                              </div>
                            </div>
                          )}

                          <div className="bg-surface">
                            {panelNode ? (
                              <button
                                className="w-full text-left px-4 py-3 border-b border-subtle text-sm font-bold text-brand"
                                onClick={() =>
                                  handleMobileCategorySelect(panelNode.label)
                                }
                              >
                                View all {panelNode.label}
                              </button>
                            ) : (
                              <button
                                className="w-full text-left px-4 py-3 border-b border-subtle text-sm font-bold text-brand"
                                onClick={handleShopAll}
                              >
                                Shop All
                              </button>
                            )}

                            {panelItems.map((item) => (
                              <button
                                key={item.id}
                                className="w-full px-4 py-3 flex justify-between items-center text-ink font-bold border-b border-subtle hover:bg-subtle transition-colors"
                                onClick={() => openMobileCategory(item)}
                              >
                                {item.label}
                                {item.children && item.children.length > 0 ? (
                                  <ChevronDown
                                    size={16}
                                    className="-rotate-90 text-muted transition-transform"
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

              <div className="bg-surface mt-2 py-2">
                <div className="px-4 py-3 font-bold text-lg border-b border-subtle font-heading text-ink">
                  Help & Settings
                </div>
                <div className="px-4 py-3 border-b border-subtle text-ink">
                  Track Order
                </div>
                <div className="px-4 py-3 border-b border-subtle text-ink">
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

          <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-surface  flex flex-col">
            {/* Header */}
            <div className="p-4 bg-brand text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <LayoutGrid size={20} />
                <span className="font-bold font-heading">Services</span>
              </div>
              <button
                onClick={() => setIsServicesPanelOpen(false)}
                className="text-white hover:text-white/70"
              >
                <X size={24} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto">
              <div className="bg-surface py-0">
                <div className="px-4 py-3 font-bold text-lg border-b border-subtle font-heading text-ink">
                  Services
                </div>
                <Link
                  to="/services/installation"
                  onClick={() => setIsServicesPanelOpen(false)}
                  className="w-full px-4 py-3 flex justify-between items-center text-ink font-bold border-b border-subtle hover:bg-soft transition-colors"
                >
                  Installation & Services
                </Link>
                <Link
                  to="/services/tool-rental"
                  onClick={() => setIsServicesPanelOpen(false)}
                  className="w-full px-4 py-3 flex justify-between items-center text-ink font-bold border-b border-subtle hover:bg-soft transition-colors"
                >
                  Tool Rental
                </Link>
                <Link
                  to="/services/truck-rental"
                  onClick={() => setIsServicesPanelOpen(false)}
                  className="w-full px-4 py-3 flex justify-between items-center text-ink font-bold border-b border-subtle hover:bg-soft transition-colors"
                >
                  Truck Rental
                </Link>
                <Link
                  to="/services/equipment-rental"
                  onClick={() => setIsServicesPanelOpen(false)}
                  className="w-full px-4 py-3 flex justify-between items-center text-ink font-bold border-b border-subtle hover:bg-soft transition-colors"
                >
                  Large Equipment Rental
                </Link>
                <Link
                  to="/credit-cards"
                  onClick={() => setIsServicesPanelOpen(false)}
                  className="w-full px-4 py-3 flex justify-between items-center text-ink font-bold border-b border-subtle hover:bg-soft transition-colors"
                >
                  Belims Credit Cards
                </Link>
                <Link
                  to="/protection-plans"
                  onClick={() => setIsServicesPanelOpen(false)}
                  className="w-full px-4 py-3 flex justify-between items-center text-ink font-bold border-b border-subtle hover:bg-soft transition-colors"
                >
                  Protection Plans
                </Link>
                <button
                  onClick={() => {
                    setIsServicesPanelOpen(false);
                    onOpenPaintAssistant();
                  }}
                  className="w-full px-4 py-3 flex justify-between items-center text-ink font-bold border-b border-subtle hover:bg-soft transition-colors text-left"
                >
                  Paint Assistant
                </button>
                <button
                  onClick={() => {
                    setIsServicesPanelOpen(false);
                    onOpenAiAssistant();
                  }}
                  className="w-full px-4 py-3 flex justify-between items-center text-ink font-bold border-b border-subtle hover:bg-soft transition-colors text-left"
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

          <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-surface  flex flex-col">
            {/* Header */}
            <div className="p-4 bg-brand text-white flex justify-between items-center">
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
                className="text-white hover:text-white/70"
              >
                <X size={24} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto bg-soft">
              {currentUser ? (
                <>
                  {/* Dashboard Button for Logged In Users */}
                  <div className="bg-surface py-0 mb-2">
                    <div className="px-4 py-3 font-bold text-lg border-b border-subtle font-heading text-ink">
                      Account
                    </div>
                    <button
                      onClick={() => {
                        navigate("/account");
                        setIsAccountPanelOpen(false);
                      }}
                      className="w-full px-4 py-3 flex justify-between items-center text-ink font-bold border-b border-subtle hover:bg-subtle transition-colors text-left"
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
                  <div className="bg-surface py-0">
                    <div className="px-4 py-3 font-bold text-lg border-b border-subtle font-heading text-ink">
                      Extra Links
                    </div>
                    <button
                      onClick={() => {
                        setIsAccountPanelOpen(false);
                        onOpenTrackOrder();
                      }}
                      className="w-full px-4 py-3 flex justify-between items-center text-ink font-bold border-b border-subtle hover:bg-soft transition-colors text-left"
                    >
                      Track Order
                    </button>
                    <Link
                      to="/account/cards"
                      onClick={() => setIsAccountPanelOpen(false)}
                      className="w-full px-4 py-3 flex justify-between items-center text-ink font-bold border-b border-subtle hover:bg-soft transition-colors"
                    >
                      Cards & Accounts
                    </Link>
                    <Link
                      to="/account/pay"
                      onClick={() => setIsAccountPanelOpen(false)}
                      className="w-full px-4 py-3 flex justify-between items-center text-ink font-bold border-b border-subtle hover:bg-soft transition-colors"
                    >
                      Pay Credit Card Bill
                    </Link>
                    <Link
                      to="/account/discounts"
                      onClick={() => setIsAccountPanelOpen(false)}
                      className="w-full px-4 py-3 flex justify-between items-center text-ink font-bold border-b border-subtle hover:bg-soft transition-colors"
                    >
                      Discount Benefits
                    </Link>
                  </div>
                </>
              )}

              {/* Contractor/Trade Block - Only show when not logged in OR when logged in but not a contractor */}
              {(!currentUser || !currentUser.roles?.includes("contractor")) && (
                <div className="p-5 bg-canvas border-b">
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <div className="font-bold text-ink mb-2">
                        Are you a Contractor?
                      </div>
                      <div className="text-sm text-muted mb-3 leading-relaxed">
                        See trade pricing across our range and unlock checkout
                        access with a trade account.
                      </div>
                      <div className="text-sm text-muted mb-3 leading-relaxed">
                        Bulk pricing, site delivery and exclusive trade-only
                        deals — built for professionals.
                      </div>
                      <Link
                        to="/register?type=trade"
                        onClick={() => setIsAccountPanelOpen(false)}
                        className="text-accent font-bold text-sm hover:underline inline-flex items-center gap-1"
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
              <div className="p-5 border-t bg-surface">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-accent text-white font-bold rounded-pill hover:bg-accent/90 transition-colors"
                >
                  <LogOut size={18} />
                  Log out
                </button>
              </div>
            ) : (
              <div className="p-5 border-t bg-surface">
                <div className="grid grid-cols-2 gap-3">
                  <Link
                    to="/login"
                    onClick={() => setIsAccountPanelOpen(false)}
                    className="w-full h-[46px] flex items-center justify-center gap-2 px-4 py-3 btn-primary rounded-pill"
                  >
                    Sign in
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setIsAccountPanelOpen(false)}
                    className="h-[46px] btn-outline flex items-center justify-center gap-2 rounded-pill"
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
