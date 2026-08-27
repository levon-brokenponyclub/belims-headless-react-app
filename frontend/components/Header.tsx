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
  Building2,
  Grid3x3,
  AlertCircle,
  Clock,
} from "lucide-react";
import {
  Store,
  CategoryNode,
  CartItem,
  Product,
  ShippingAddress,
} from "../types";
import { CURRENCY_SYMBOL } from "../constants";
import { formatCurrency } from "../utils/price";
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
  /** Optional live delivery-promise data driving the secondary-nav ETA pills. */
  deliveryPromise?: {
    fastestEta?: string;
    serviceLabel?: string;
  };
}

const getTimeGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

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
  deliveryPromise,
}) => {
  const navigate = useNavigate();
  const timeGreeting = getTimeGreeting();
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
  const [deliveryLocationModalType, setDeliveryLocationModalType] = useState<
    "pickup" | "delivery"
  >("delivery");

  const openDeliveryLocationPanel = (type: "pickup" | "delivery") => {
    setDeliveryLocationModalType(type);
    setIsDeliveryLocationModalOpen(true);
  };
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
  const lastScrollYRef = useRef(0);
  const topBarRef = useRef<HTMLDivElement | null>(null);

  const syncDeliveryFromStorage = React.useCallback(() => {
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

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollTrigger = topBarRef.current?.offsetHeight || 46;

      if (currentScrollY <= scrollTrigger) {
        setIsNavbarVisible(true);
      } else if (currentScrollY > lastScrollYRef.current + 8) {
        setIsNavbarVisible(false);
      } else if (currentScrollY < lastScrollYRef.current - 12) {
        setIsNavbarVisible(true);
      }

      lastScrollYRef.current = currentScrollY;
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
    syncDeliveryFromStorage();
  }, [syncDeliveryFromStorage]);

  const handleAddressSelect = (address: ShippingAddress | null) => {
    setDeliveryAddress(address);
    setLegacyDeliveryLabel(
      address ? address.label || buildAddressLabel(address) : null,
    );
    saveStoredAddress(address);
    if (address) {
      setFulfillmentType("delivery");
      localStorage.setItem("fulfillmentType", "delivery");
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

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("belims:delivery-address-updated"));
      window.dispatchEvent(new Event("belims:fulfillment-changed"));
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
    const handleDeliveryAddressUpdated = () => {
      syncDeliveryFromStorage();
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
    window.addEventListener(
      "belims:delivery-address-updated",
      handleDeliveryAddressUpdated as EventListener,
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
      window.removeEventListener(
        "belims:delivery-address-updated",
        handleDeliveryAddressUpdated as EventListener,
      );
    };
  }, [
    deliveryAddress,
    legacyDeliveryLabel,
    selectedStore,
    syncDeliveryFromStorage,
  ]);

  const pickupLabel = selectedStore?.name || "Select Store";
  const deliveryLabelText =
    deliveryAddress?.postalCode?.trim() || "Enter Address";
  const hasDeliveryAddress = Boolean(deliveryAddress || legacyDeliveryLabel);
  const cartSubtotal = cartItems.reduce(
    (sum, item) => sum + (Number(item.price) || 0) * item.quantity,
    0,
  );

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
    <>
      {/* ─── Row 1: Topbar utility strip (Nexvo structure) ─── */}
      <div
        ref={topBarRef}
        className="topbar topbar--show-separator-line hidden md:block"
      >
        <div className="topbar__inner">
          <div className="topbar__column topbar__left">
            <ul className="topbar__menu">
              <li className="topbar__menu-item">
                <Link to="/help-center" className="block">
                  Help Center
                </Link>
              </li>
              <li className="topbar__menu-item">
                <button type="button" onClick={onOpenTrackOrder}>
                  Track Your Order
                </button>
              </li>
              <li className="topbar__menu-item">
                <Link to="/wishlist" className="block">
                  Wishlist
                </Link>
              </li>
            </ul>
          </div>

          <div className="topbar__column topbar__center" />

          <div className="topbar__column topbar__right">
            <div className="topbar__delivery">
              <button
                type="button"
                onClick={() => openDeliveryLocationPanel("pickup")}
                className="topbar__delivery-item"
              >
                <MapPin
                  size={15}
                  className="flex-shrink-0"
                  strokeWidth={1.75}
                />
                <span className="topbar__delivery-text">
                  <span>Pickup from:</span>
                  <span className="truncate">{pickupLabel}</span>
                </span>
                <ChevronRight size={14} className="flex-shrink-0" />
              </button>
              <button
                type="button"
                onClick={() => openDeliveryLocationPanel("delivery")}
                className="topbar__delivery-item"
              >
                <Truck size={15} className="flex-shrink-0" strokeWidth={1.75} />
                <span className="topbar__delivery-text">
                  <span>Deliver to:</span>
                  <span className="truncate">{deliveryLabelText}</span>
                </span>
                <ChevronRight size={14} className="flex-shrink-0" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <header className="font-sans overflow-x-clip overflow-y-visible text-white sticky top-0 z-[1200]">
        <section className="w-full overflow-x-clip overflow-y-visible bg-surface-dark text-white shadow-[5px_0_30px_0_rgb(0_0_0_/_.08)]">
          {/* ─── Row 2: Sixty60-style logo row ─── */}
          <div className="relative hidden md:flex w-full items-center gap-4 bg-surface-dark text-white px-6 lg:px-8 py-4">
            <Link
              to="/"
              aria-label="Belims home"
              className="flex-shrink-0 flex items-center"
            >
              <img
                src="/images/belims-logo-white.png"
                alt="Belims Hardware"
                className="h-10 lg:h-12 w-auto object-contain"
              />
            </Link>

            {/* Address pill */}
            <button
              type="button"
              onClick={() => openDeliveryLocationPanel("delivery")}
              className="hidden md:flex items-center gap-3 rounded-xl bg-white/10 hover:bg-white/[0.14] transition-colors px-4 py-2.5 min-w-[220px] max-w-[260px] text-left focus:outline-none focus:ring-2 focus:ring-primary/60"
            >
              <MapPin
                size={18}
                strokeWidth={1.75}
                className="flex-shrink-0 text-primary"
              />
              <span className="flex flex-col leading-tight min-w-0">
                <span className="text-eyebrow text-white/60">
                  Delivering to
                </span>
                <span className="text-sm font-bold text-white truncate">
                  {hasDeliveryAddress
                    ? deliveryLabelText
                    : "Enter your address"}
                </span>
              </span>
            </button>

            {/* Search bar (fills remaining width) */}
            <div className="flex-1 min-w-0 mx-2">
              <form
                onSubmit={handleSearchSubmit}
                className="relative flex h-12 items-center bg-surface rounded-pill overflow-hidden"
              >
                <div className="pl-5 pr-2 flex-shrink-0 text-text-tertiary">
                  <Search size={18} strokeWidth={2} />
                </div>
                <input
                  type="text"
                  placeholder="Search products and brands"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchCategoryDropdownOpen(false)}
                  className="input h-full min-h-0 flex-1 bg-transparent border-0 text-text placeholder:text-text-tertiary focus:ring-0 focus:outline-none focus:text-text rounded-none px-1"
                  aria-label="Search products"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setSearchResults(null);
                    }}
                    className="px-3 text-text-tertiary text-sm font-bold hover:text-text transition-colors"
                    aria-label="Clear search"
                  >
                    <X size={16} />
                  </button>
                )}
                {/* Category selector — collapsed to right-side chip on xl+ */}
                <div className="relative h-full hidden xl:block">
                  <button
                    type="button"
                    onClick={() =>
                      setIsSearchCategoryDropdownOpen(
                        !isSearchCategoryDropdownOpen,
                      )
                    }
                    className="h-full py-0 pl-4 pr-5 text-text text-sm font-semibold border-l border-border flex items-center gap-2 bg-surface hover:bg-surface-muted transition-colors"
                    style={{ minWidth: "170px" }}
                  >
                    <span className="truncate">{searchCategory}</span>
                    <ChevronDown
                      size={14}
                      className={`transition-transform duration-200 text-text-tertiary ${
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
                      <div className="absolute top-[calc(100%+8px)] right-0 w-64 bg-surface rounded-block border border-border py-3 z-50 shadow-pop">
                        <div className="px-4 pb-2 mb-2 border-b border-border">
                          <span className="text-eyebrow text-text-tertiary">
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
                              ? "bg-primary text-white"
                              : "hover:bg-surface-muted text-text"
                          }`}
                        >
                          All Departments
                          <ChevronRight
                            size={14}
                            className={
                              searchCategory === "All Departments"
                                ? "text-white/50"
                                : "text-text-tertiary group-hover:text-primary"
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
                                ? "bg-primary text-white"
                                : "hover:bg-surface-muted text-text"
                            }`}
                          >
                            {cat.label}
                            <ChevronRight
                              size={14}
                              className={
                                searchCategory === cat.label
                                  ? "text-white/50"
                                  : "text-text-tertiary group-hover:text-primary"
                              }
                            />
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
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

            {/* Account chip */}
            <button
              type="button"
              onClick={() => setIsAccountPanelOpen(true)}
              aria-label={
                currentUser
                  ? `Account: ${currentUser.first_name || currentUser.username}`
                  : "Sign in or create account"
              }
              className="hidden md:flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-white/[0.08] transition-colors focus:outline-none focus:ring-2 focus:ring-primary/60"
            >
              <User size={26} strokeWidth={1.75} className="text-white" />
              <span className="flex flex-col leading-tight text-left">
                <span className="text-eyebrow text-white/60">
                  {timeGreeting}
                </span>
                <span className="text-sm font-bold text-white">
                  {currentUser
                    ? currentUser.first_name || currentUser.username
                    : "Sign In · Sign Up"}
                </span>
              </span>
            </button>

            {/* Basket with running total */}
            <button
              type="button"
              onClick={toggleCart}
              aria-label={`Cart, ${cartCount} items, ${formatCurrency(cartSubtotal)}`}
              className="relative flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/[0.08] transition-colors focus:outline-none focus:ring-2 focus:ring-primary/60"
            >
              <span className="relative">
                <ShoppingBasket
                  size={26}
                  strokeWidth={1.75}
                  className="text-white"
                />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-2 min-w-[18px] h-[18px] px-1 rounded-pill bg-cart-bubble text-white text-[10px] font-bold flex items-center justify-center leading-none">
                    {cartCount}
                  </span>
                )}
              </span>
              <span className="text-sm font-bold text-white tabular-nums">
                {formatCurrency(cartSubtotal)}
              </span>
            </button>
          </div>

          {/* ─── Mobile logo row (unchanged) ─── */}
          <div
            className="flex items-center justify-between gap-3 px-4 py-4 md:hidden"
            style={{ boxShadow: "inset 0 -1px 0 0 #333" }}
          >
            <div className="relative flex items-center gap-2 flex-shrink-0 min-h-[44px]">
              <button
                type="button"
                className="md:hidden text-white"
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

              <Link to="/" className="flex items-center">
                <img
                  src="/images/belims-logo-white.png"
                  alt="Belims Hardware"
                  className="h-8 w-auto object-contain"
                />
              </Link>
            </div>

            <div className="flex items-center gap-4">
              <button
                type="button"
                aria-label="Location"
                className="text-white flex items-center justify-center transition-opacity duration-200 hover:opacity-70"
              >
                <MapPin size={20} strokeWidth={1.75} />
              </button>
              <button
                type="button"
                aria-label="Account"
                onClick={() => setIsAccountPanelOpen(true)}
                className="text-white flex items-center justify-center transition-opacity duration-200 hover:opacity-70"
              >
                <User size={20} strokeWidth={1.75} />
              </button>
              <button
                type="button"
                aria-label="Cart"
                onClick={toggleCart}
                className="relative text-white flex items-center justify-center transition-opacity duration-200 hover:opacity-70"
              >
                <ShoppingBasket size={20} strokeWidth={1.75} />
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 rounded-pill bg-cart-bubble text-white text-[10px] font-bold flex items-center justify-center leading-none">
                    {cartCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Mobile Delivery Bar - moved below logo bar */}
          <div className="md:hidden w-full bg-primary text-white border-t border-white/20">
            <div className="container mx-auto px-4">
              <button
                type="button"
                onClick={() => openDeliveryLocationPanel("delivery")}
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

          {/* ─── Coral alert banner ── conditional: no delivery address set ─── */}
          {!hasDeliveryAddress && (
            <div className="hidden md:flex items-center justify-center gap-2 bg-[color:var(--color-primary-soft)] text-white text-sm font-medium py-2 px-6">
              <AlertCircle size={16} strokeWidth={2.25} />
              <span>
                <strong className="font-bold">Enter your address</strong> for
                your relevant offers &amp; availability
              </span>
            </div>
          )}

          {/* ─── Row 3: White secondary nav (Sixty60 pattern) ─── */}
          <div
            className={`hidden md:block bg-surface text-text border-b border-border overflow-hidden transition-[max-height,opacity,transform] duration-200 ease-out ${
              isNavbarVisible
                ? "max-h-[400px] opacity-100 translate-y-0"
                : "max-h-0 opacity-0 -translate-y-2 pointer-events-none"
            }`}
          >
            <div className="flex items-center justify-between gap-6 px-6 lg:px-8 py-3">
              {/* Left cluster */}
              <div className="flex items-center gap-5 min-w-0">
                <div
                  className="relative"
                  onMouseEnter={openMegaMenu}
                  onMouseLeave={closeMegaMenu}
                >
                  <button
                    type="button"
                    aria-haspopup="true"
                    aria-expanded={isMegaMenuOpen}
                    className="flex items-center gap-2 text-text font-heading font-bold text-sm hover:text-primary transition-colors"
                  >
                    <LayoutGrid size={18} strokeWidth={2} />
                    Shop by Department
                    <ChevronDown
                      size={14}
                      className={`transition-transform ${
                        isMegaMenuOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                </div>

                <span className="h-6 w-px bg-border" aria-hidden="true" />

                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-sm font-bold text-text-secondary whitespace-nowrap">
                    Shop By Delivery
                  </span>
                  {deliveryPromise?.fastestEta && (
                    <span className="inline-flex items-center gap-1.5 rounded-pill border border-primary/30 text-primary text-xs font-bold px-3 py-1 whitespace-nowrap">
                      <Truck size={13} strokeWidth={2.25} />
                      {deliveryPromise.fastestEta}
                    </span>
                  )}
                  {deliveryPromise?.serviceLabel && (
                    <span className="inline-flex items-center gap-1.5 rounded-pill border border-success/40 text-success text-xs font-bold px-3 py-1 whitespace-nowrap">
                      <Clock size={13} strokeWidth={2.25} />
                      {deliveryPromise.serviceLabel}
                    </span>
                  )}
                </div>
              </div>

              {/* Right cluster */}
              <nav
                className="flex items-center gap-6"
                aria-label="Secondary navigation"
              >
                <Link
                  to="/wishlist"
                  className="flex items-center gap-2 text-text font-heading font-bold text-sm hover:text-primary transition-colors"
                >
                  <Heart size={18} strokeWidth={2} />
                  My Shop
                </Link>
                <button
                  type="button"
                  onClick={toggleStoreLocator}
                  className="flex items-center gap-2 text-text font-heading font-bold text-sm hover:text-primary transition-colors"
                >
                  <Building2 size={18} strokeWidth={2} />
                  Browse Stores &amp; Leaflets
                </button>
                <button
                  type="button"
                  onClick={() => setIsServicesPanelOpen(true)}
                  className="flex items-center gap-2 text-text font-heading font-bold text-sm hover:text-primary transition-colors"
                >
                  <Grid3x3 size={18} strokeWidth={2} />
                  Other Services
                </button>
              </nav>
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
                      {[null, ...mobileCategoryStack].map(
                        (panelNode, index) => {
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
                                      handleMobileCategorySelect(
                                        panelNode.label,
                                      )
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
                                    {item.children &&
                                    item.children.length > 0 ? (
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
                        },
                      )}
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
                {(!currentUser ||
                  !currentUser.roles?.includes("contractor")) && (
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
          initialFulfillmentType={deliveryLocationModalType}
          currentAddress={deliveryAddress || undefined}
          onAddressSelect={handleAddressSelect}
          currentStore={selectedStore}
          onStoreSelect={setSelectedStore}
        />
      </header>
    </>
  );
};
