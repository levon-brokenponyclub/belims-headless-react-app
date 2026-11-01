import React, { useState, useEffect, useRef, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ChevronRight,
  Minus,
  Plus,
  X,
  ArrowLeft,
  ArrowRight,
  Clock,
  Heart,
} from "lucide-react";
import {
  toggleWishlist,
  isInWishlist,
} from "../services/wishlistService";
import { Product, ShippingAddress, Store } from "../types";
import { CURRENCY_SYMBOL, STORES } from "../constants";
import { formatCurrency, isProductPurchasable } from "../utils/price";
import { buildProductUrl, formatSpecValue, parseProductDescription } from "../utils/product";
import { DeliveryLocationModal } from "./DeliveryLocationModal";
import { VideoPlayer } from "./VideoPlayer";
import { generateProductDescription } from "../services/geminiService";
import { addToRecentlyViewed } from "../services/storageService";
import { fetchEcommercePolicies } from "../services/wooCommerceService";
import {
  getFallbackShipping,
  getShippingRates,
} from "../services/bobGoService";
import {
  buildAddressLabel,
  readStoredAddress,
  resolveAddressFromPostalCode,
  saveStoredAddress,
} from "../services/shippingAddress";
import { UserData } from "../services/authService";
import {
  hydrateFromSiteStorage,
  setDeliveryAddress as setSharedDeliveryAddress,
  setPdpContext,
  setPickupStore as setSharedPickupStore,
  setSelectedDeliveryOption as setSharedDeliveryOption,
} from "../src/lib/fulfillmentContext";
import { RecentlyViewed } from "./RecentlyViewed";
import { StoreLocator } from "./StoreLocator";
import { ProductCard, PRODUCT_CARD_PRESETS } from "./ProductCard";
import { ProductPriceDisplay } from "./ProductPriceDisplay";
import { FulfilmentChooser } from "./FulfilmentChooser";
import { FulfillmentTab } from "./FulfillmentTabs";
import { ProductAccordions } from "./ProductAccordions";
import { TradePricingAvailable } from "./TradePricingAvailable";
import { Spinner } from "./Spinner";
import { SectionHeading, ViewAllLink } from "./SectionHeading";
interface SingleProductProps {
  product: Product;
  allProducts?: Product[];
  addToCart: (product: Product) => void;
  onBuyNow: (product: Product) => void;
  onCompare: (product: Product) => void;
  onPriceMatch: (product: Product) => void;
  onBrandClick?: (brand: string) => void;
  isAuthenticated?: boolean;
  isTradeApproved?: boolean;
  currentUser?: UserData | null;
}

type ShippingTier = "Express" | "Standard" | "Economy";

interface ShippingRate {
  service_name: string;
  total_price: number;
  expected_delivery_date?: string;
  tier?: ShippingTier;
}

const classifyRate = (
  rate: ShippingRate,
  allRates: ShippingRate[],
): ShippingTier => {
  if (rate.tier) return rate.tier;

  const prices = allRates.map((r) => r.total_price).sort((a, b) => a - b);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  if (rate.total_price === minPrice && minPrice < maxPrice) return "Economy";
  if (rate.total_price === maxPrice) return "Express";
  return "Standard";
};

export const SingleProduct: React.FC<SingleProductProps> = ({
  product,
  allProducts = [],
  addToCart,
  onBuyNow,
  onCompare,
  onPriceMatch,
  onBrandClick,
  isAuthenticated = false,
  isTradeApproved = false,
  currentUser,
}) => {
  const navigate = useNavigate();
  const getDefaultStore = (stores: Store[]) =>
    stores.find((store) => store.name?.toLowerCase().includes("umzinto")) ||
    stores[0] ||
    null;
  const shouldSkipDefaultStore = () =>
    import.meta.env.DEV &&
    typeof window !== "undefined" &&
    localStorage.getItem("devSkipDefaultStore") === "true";

  // Gallery / image
  const [mainImage, setMainImage] = useState(product.image);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(() => isInWishlist(product.id));

  // Qty
  const [qty, setQty] = useState(1);

  // Policies
  const [expandedPolicy, setExpandedPolicy] = useState<string | null>("return");
  const [ecommercePolicies, setEcommercePolicies] = useState<any>(null);

  // Store Locator
  const [isLocatorOpen, setIsLocatorOpen] = useState(false);
  const [isSchedulePickupOpen, setIsSchedulePickupOpen] = useState(false);
  const [schedulePickupDate, setSchedulePickupDate] = useState("");
  const [schedulePickupTime, setSchedulePickupTime] = useState("");
  const [storeLocations, setStoreLocations] = useState<Store[]>(STORES);
  const [selectedStore, setSelectedStore] = useState<Store | null>(
    shouldSkipDefaultStore() ? null : getDefaultStore(STORES),
  );
  const [pickupSchedule, setPickupSchedule] = useState<{
    date: string;
    time: string;
  } | null>(null);

  // Delivery Modal + address
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [deliveryModalMode, setDeliveryModalMode] =
    useState<FulfillmentTab>("delivery");
  const [deliveryAddress, setDeliveryAddress] =
    useState<ShippingAddress | null>(null);
  const [legacyDeliveryLabel, setLegacyDeliveryLabel] = useState<string | null>(
    null,
  );
  const [isResolvingStoredAddress, setIsResolvingStoredAddress] =
    useState(false);

  // Delivery rates
  const [deliveryRates, setDeliveryRates] = useState<ShippingRate[]>([]);
  const [loadingDeliveryRates, setLoadingDeliveryRates] = useState(false);
  const [deliveryRatesError, setDeliveryRatesError] = useState<string | null>(
    null,
  );
  const [selectedDeliveryOptionId, setSelectedDeliveryOptionId] = useState(
    () => sessionStorage.getItem("selectedDeliveryOptionId") || "",
  );

  // Trade
  const [useTradePrice, setUseTradePrice] = useState(false);
  const [showTradeDeal, setShowTradeDeal] = useState(false);

  // Fulfillment selection
  const [fulfillmentType, setFulfillmentType] =
    useState<FulfillmentTab>("pickup");
  const [focusDeliveryPanelSignal, setFocusDeliveryPanelSignal] =
    useState<number>(0);
  const latestDeliveryRequestRef = useRef(0);
  const hasPickupLocationRef = useRef(false);

  // Sticky bottom CTA (Athens-like): show when BuyBox actions are out of view
  const [showBottomCta, setShowBottomCta] = useState(false);
  const buyBoxRef = useRef<HTMLDivElement>(null);

  const pricingInfo = useMemo(() => {
    const tradeDealsInfo = product.deals_resolved?.trade;
    const tradePrice = tradeDealsInfo?.price;
    const retailPrice = product.regular_price || product.price;
    const savings =
      tradePrice && tradePrice > 0 ? Math.max(0, retailPrice - tradePrice) : 0;
    const hasTradePrice = !!tradePrice && tradePrice > 0;

    return {
      retailPrice,
      tradePrice: tradePrice || 0,
      savings,
      hasTradePrice,
      tradeDealsInfo,
    };
  }, [product]);

  const isTradeSpecial =
    pricingInfo.tradeDealsInfo?.bestDeal?.type === "trade_special";
  const effectiveUseTradePrice =
    isTradeApproved && isTradeSpecial ? true : useTradePrice;
  const tradeDeal = product.deals_resolved?.trade;
  const tradeBest = tradeDeal?.bestDeal;
  const consumerDeal = product.deals_resolved?.consumer;
  const consumerBest = consumerDeal?.bestDeal;
  const activeDeal = isTradeSpecial ? tradeBest : consumerBest;
  const labelMode = (activeDeal as any)?.label_mode || "auto";
  const showBadge = (activeDeal as any)?.show_badge !== false;
  const retailPrice = (product.regular_price || product.price || 0) as number;
  const consumerPrice = ((consumerDeal?.price ??
    product.price ??
    product.sale_price ??
    retailPrice) ||
    retailPrice) as number;
  const consumerCompareAtRaw =
    (consumerDeal?.compareAtPrice as number | undefined | null) ??
    ((product.regular_price && product.regular_price > consumerPrice
      ? product.regular_price
      : null) as number | null);
  const consumerCompareAt =
    consumerCompareAtRaw && consumerCompareAtRaw > consumerPrice
      ? consumerCompareAtRaw
      : null;
  const percentOff =
    !isTradeSpecial && consumerCompareAt && consumerCompareAt > 0
      ? Math.round(
          ((consumerCompareAt - consumerPrice) / consumerCompareAt) * 100,
        )
      : 0;
  const tradeSavings =
    isTradeSpecial && pricingInfo.tradePrice > 0
      ? Math.max(0, retailPrice - pricingInfo.tradePrice)
      : 0;

  const getDealBadgeLabel = (): string | undefined => {
    if (!activeDeal || !showBadge) return undefined;

    if (labelMode === "manual") {
      return (
        (activeDeal as any)?.label_text ||
        (isTradeSpecial ? tradeDeal?.label : consumerDeal?.label) ||
        undefined
      );
    }

    if (labelMode === "template") {
      const tpl = (activeDeal as any)?.label_template as string | undefined;
      if (!tpl) return undefined;

      const dealName = (activeDeal as any)?.deal_name || "";
      const amount = isTradeSpecial
        ? formatCurrency(tradeSavings)
        : formatCurrency(
            Math.max(
              0,
              consumerCompareAt ? consumerCompareAt - consumerPrice : 0,
            ),
          );
      const pct = isTradeSpecial
        ? retailPrice > 0
          ? Math.round(
              ((retailPrice - pricingInfo.tradePrice) / retailPrice) * 100,
            )
          : 0
        : percentOff;

      return tpl
        .replace("{deal_name}", dealName)
        .replace("{amount}", amount)
        .replace("{percent_off}", String(pct));
    }

    // auto
    const type = (activeDeal as any)?.type;
    if (isTradeSpecial) return "TRADE SPECIAL";
    if (type === "clearance") return "CLEARANCE";
    if (percentOff > 0) return `${percentOff}% OFF`;
    if (consumerDeal?.label) return consumerDeal.label;
    return undefined;
  };

  const dealBadgeLabel = getDealBadgeLabel();
  const badgeStyle = ((activeDeal as any)?.badge_style ||
    consumerDeal?.badgeStyle ||
    "sale") as "sale" | "clearance" | "info" | "trade" | string;
  const badgeToneClass = (() => {
    if (isTradeSpecial) return "bg-belims-accent text-white";
    if (badgeStyle === "clearance") return "bg-[#DF1119] text-white";
    if (badgeStyle === "info") return "bg-[#ECF0F1] text-[#04223E]";
    if (badgeStyle === "trade") return "bg-[#ECF0F1] text-[#04223E]";
    return "bg-[#DF1119] text-white";
  })();

  const refreshStoredAddress = () => {
    const { address, legacyLabel } = readStoredAddress();
    if (address) {
      setDeliveryAddress(address);
      setLegacyDeliveryLabel(legacyLabel);
      return;
    }

    if (currentUser?.shipping) {
      const profileAddress: ShippingAddress = {
        street: currentUser.shipping.address_1 || "",
        city: currentUser.shipping.city || "",
        province: currentUser.shipping.state || "",
        postalCode: currentUser.shipping.postcode || "",
        country: (currentUser.shipping.country || "ZA") as ShippingAddress["country"],
      };
      setDeliveryAddress(profileAddress);
      setLegacyDeliveryLabel(
        [currentUser.shipping.address_1, currentUser.shipping.city, currentUser.shipping.state, currentUser.shipping.postcode]
          .filter(Boolean)
          .join(", ") || null,
      );
      return;
    }

    setDeliveryAddress(null);
    setLegacyDeliveryLabel(null);
  };

  useEffect(() => {
    addToRecentlyViewed(product);
    setMainImage(product.image);
    setQty(1);
    setUseTradePrice(false);
    setShowTradeDeal(false);
    setShowBottomCta(false);

    fetchEcommercePolicies()
      .then((data) => {
        setEcommercePolicies(data);
        const rawStores = Array.isArray(data?.store_locations)
          ? data.store_locations
          : [];
        const mappedStores = rawStores
          .map((store: any, index: number) => {
            const name = String(store?.name || "").trim();
            const address = String(store?.address || "")
              .replace(/\s*\n\s*/g, ", ")
              .trim();
            if (!name && !address) return null;
            const latitudeValue = Number(store?.latitude);
            const longitudeValue = Number(store?.longitude);
            return {
              id: String(store?.id || name || index + 1),
              name: name || `Store ${index + 1}`,
              address: address || "",
              phone: store?.phone ? String(store.phone) : undefined,
              mapUrl: store?.map_url ? String(store.map_url) : undefined,
              latitude: Number.isNaN(latitudeValue) ? undefined : latitudeValue,
              longitude: Number.isNaN(longitudeValue)
                ? undefined
                : longitudeValue,
              hours: {
                mon: {
                  open: store?.mon_open,
                  close: store?.mon_close,
                  breakStart: store?.mon_break_start,
                  breakEnd: store?.mon_break_end,
                  closed: Boolean(store?.mon_closed),
                  note: store?.mon_note,
                },
                tue: {
                  open: store?.tue_open,
                  close: store?.tue_close,
                  breakStart: store?.tue_break_start,
                  breakEnd: store?.tue_break_end,
                  closed: Boolean(store?.tue_closed),
                  note: store?.tue_note,
                },
                wed: {
                  open: store?.wed_open,
                  close: store?.wed_close,
                  breakStart: store?.wed_break_start,
                  breakEnd: store?.wed_break_end,
                  closed: Boolean(store?.wed_closed),
                  note: store?.wed_note,
                },
                thu: {
                  open: store?.thu_open,
                  close: store?.thu_close,
                  breakStart: store?.thu_break_start,
                  breakEnd: store?.thu_break_end,
                  closed: Boolean(store?.thu_closed),
                  note: store?.thu_note,
                },
                fri: {
                  open: store?.fri_open,
                  close: store?.fri_close,
                  breakStart: store?.fri_break_start,
                  breakEnd: store?.fri_break_end,
                  closed: Boolean(store?.fri_closed),
                  note: store?.fri_note,
                },
                sat: {
                  open: store?.sat_open,
                  close: store?.sat_close,
                  breakStart: store?.sat_break_start,
                  breakEnd: store?.sat_break_end,
                  closed: Boolean(store?.sat_closed),
                  note: store?.sat_note,
                },
                sun: {
                  open: store?.sun_open,
                  close: store?.sun_close,
                  breakStart: store?.sun_break_start,
                  breakEnd: store?.sun_break_end,
                  closed: Boolean(store?.sun_closed),
                  note: store?.sun_note,
                },
              },
            } as Store;
          })
          .filter(Boolean) as Store[];

        if (mappedStores.length > 0) {
          const defaultStore = getDefaultStore(mappedStores);
          setStoreLocations(mappedStores);
          setSelectedStore((prev) => {
            if (prev && mappedStores.some((store) => store.id === prev.id)) {
              return prev;
            }
            if (shouldSkipDefaultStore()) return null;
            return defaultStore;
          });
        }
      })
      .catch((err) => console.error("Failed to fetch policies:", err));
  }, [product]);

  useEffect(() => {
    refreshStoredAddress();
    hydrateFromSiteStorage();
  }, [currentUser]);

  useEffect(() => {
    if (deliveryAddress?.city && deliveryAddress?.province) {
      setIsResolvingStoredAddress(false);
      return;
    }

    const postalCode =
      deliveryAddress?.postalCode || legacyDeliveryLabel?.trim() || "";
    if (!postalCode) {
      setIsResolvingStoredAddress(false);
      return;
    }

    let cancelled = false;
    setIsResolvingStoredAddress(true);

    const resolveStoredPostalCode = async () => {
      const resolvedAddress = await resolveAddressFromPostalCode(postalCode);
      if (cancelled || !resolvedAddress) {
        if (!cancelled) setIsResolvingStoredAddress(false);
        return;
      }

      setDeliveryAddress(resolvedAddress);
      setLegacyDeliveryLabel(resolvedAddress.label || postalCode);
      saveStoredAddress(resolvedAddress);
      setSharedDeliveryAddress({
        street: resolvedAddress.street,
        city: resolvedAddress.city,
        province: resolvedAddress.province,
        postalCode: resolvedAddress.postalCode,
      });
      setIsResolvingStoredAddress(false);
    };

    void resolveStoredPostalCode();

    return () => {
      cancelled = true;
    };
  }, [
    deliveryAddress?.city,
    deliveryAddress?.postalCode,
    deliveryAddress?.province,
    legacyDeliveryLabel,
  ]);

  useEffect(() => {
    setPdpContext({
      productId: product.id,
      title: product.name,
      price: product.price,
      imageUrl: product.image,
      category: product.category,
    });
  }, [
    product.category,
    product.id,
    product.image,
    product.name,
    product.price,
  ]);

  useEffect(() => {
    setSharedDeliveryAddress(
      deliveryAddress
        ? {
            street: deliveryAddress.street,
            city: deliveryAddress.city,
            province: deliveryAddress.province,
            postalCode: deliveryAddress.postalCode,
          }
        : null,
    );
  }, [
    deliveryAddress?.city,
    deliveryAddress?.postalCode,
    deliveryAddress?.province,
    deliveryAddress?.street,
  ]);

  useEffect(() => {
    setSharedPickupStore(
      selectedStore?.id ?? null,
      selectedStore?.name ?? null,
      selectedStore?.hours,
    );
  }, [selectedStore?.hours, selectedStore?.id, selectedStore?.name]);

  useEffect(() => {
    setSharedDeliveryOption(selectedDeliveryOptionId || null);
  }, [selectedDeliveryOptionId]);

  const syncStoredPickupStore = React.useCallback(() => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem("selectedPickupStore");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Store | null;
      if (!parsed?.id) return;
      const matched = storeLocations.find((store) => store.id === parsed.id);
      const nextStore = matched ?? parsed;
      if (!nextStore?.id || selectedStore?.id === nextStore.id) return;
      setSelectedStore(nextStore);
    } catch {
      return;
    }
  }, [selectedStore?.id, storeLocations]);

  useEffect(() => {
    syncStoredPickupStore();
  }, [syncStoredPickupStore]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handlePickupUpdate = () => {
      syncStoredPickupStore();
    };
    window.addEventListener("belims:pickup-store-updated", handlePickupUpdate);
    return () => {
      window.removeEventListener(
        "belims:pickup-store-updated",
        handlePickupUpdate,
      );
    };
  }, [syncStoredPickupStore]);

  useEffect(() => {
    if (!isDeliveryModalOpen) {
      refreshStoredAddress();
      hydrateFromSiteStorage();
    }
  }, [isDeliveryModalOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleDeliveryAddressUpdated = () => {
      refreshStoredAddress();
      hydrateFromSiteStorage();
    };

    const handleStorage = (event: StorageEvent) => {
      if (
        event.key === "deliveryAddressV2" ||
        event.key === "deliveryAddress" ||
        event.key === "fulfillmentType"
      ) {
        handleDeliveryAddressUpdated();
      }
    };

    window.addEventListener(
      "belims:delivery-address-updated",
      handleDeliveryAddressUpdated as EventListener,
    );
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener(
        "belims:delivery-address-updated",
        handleDeliveryAddressUpdated as EventListener,
      );
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  useEffect(() => {
    const { address } = readStoredAddress();
    const defaultTab: FulfillmentTab = address ? "delivery" : "pickup";
    setFulfillmentType(defaultTab);
    localStorage.setItem("belims_fulfillment_tab", defaultTab);
    localStorage.setItem("fulfillmentType", defaultTab);
    if (defaultTab === "pickup") {
      localStorage.setItem("pickupStoreSelected", "true");
    }
  }, []);

  useEffect(() => {
    if (selectedDeliveryOptionId) {
      sessionStorage.setItem(
        "selectedDeliveryOptionId",
        selectedDeliveryOptionId,
      );
    } else {
      sessionStorage.removeItem("selectedDeliveryOptionId");
    }
  }, [selectedDeliveryOptionId]);

  useEffect(() => {
    setSelectedDeliveryOptionId("");
  }, [
    deliveryAddress?.street,
    deliveryAddress?.city,
    deliveryAddress?.province,
    deliveryAddress?.postalCode,
    deliveryAddress?.country,
  ]);

  const deliveryLabel = deliveryAddress
    ? deliveryAddress.label || buildAddressLabel(deliveryAddress)
    : legacyDeliveryLabel || "";

  const hasStructuredAddress = Boolean(
    deliveryAddress?.postalCode ||
    (deliveryAddress?.city && deliveryAddress?.province),
  );

  useEffect(() => {
    const fetchDeliveryRates = async () => {
      if (!hasStructuredAddress || !deliveryAddress) {
        setDeliveryRates([]);
        return;
      }

      const requestId = ++latestDeliveryRequestRef.current;

      setLoadingDeliveryRates(true);
      setDeliveryRatesError(null);

      try {
        const items = [
          {
            id: product.id,
            sku: product.sku,
            quantity: qty,
            grams: product.weight
              ? Math.round(product.weight * 1000)
              : undefined,
          },
        ];

        const rates = await getShippingRates({
          destination_address: {
            street: deliveryAddress.street,
            city: deliveryAddress.city,
            province: deliveryAddress.province,
            postal_code: deliveryAddress.postalCode,
            country: deliveryAddress.country,
          },
          items,
        });

        const finalRates = rates?.length ? rates : getFallbackShipping();
        const classifiedRates = finalRates.map((rate: any) => ({
          ...rate,
          tier: classifyRate(rate, finalRates),
        }));

        if (requestId !== latestDeliveryRequestRef.current) {
          return;
        }
        setDeliveryRates(classifiedRates);
      } catch (error) {
        if (requestId !== latestDeliveryRequestRef.current) {
          return;
        }
        console.error("Failed to fetch delivery rates:", error);
        const fallbackRates = getFallbackShipping().map((rate: any) => ({
          ...rate,
          tier: classifyRate(rate, getFallbackShipping()),
        }));
        setDeliveryRates(fallbackRates);
        setDeliveryRatesError(
          "Live delivery rates are unavailable right now.",
        );
      } finally {
        if (requestId !== latestDeliveryRequestRef.current) {
          return;
        }
        setLoadingDeliveryRates(false);
      }
    };

    fetchDeliveryRates();

    return () => {
      latestDeliveryRequestRef.current += 1;
    };
  }, [
    deliveryAddress?.street,
    deliveryAddress?.city,
    deliveryAddress?.province,
    deliveryAddress?.postalCode,
    deliveryAddress?.country,
    qty,
    product.id,
    product.sku,
    product.weight,
    hasStructuredAddress,
  ]);

  // Athens-like sticky bottom bar behavior:
  // Show bottom CTA only after the buy box scrolls above the viewport.
  useEffect(() => {
    const el = buyBoxRef.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      ([entry]) => {
        const isAboveViewport = entry.boundingClientRect.bottom <= 0;
        setShowBottomCta(isAboveViewport);
      },
      {
        threshold: 0,
      },
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, [product.id]);

  const gallery = useMemo(() => {
    const items =
      product.images && product.images.length > 0
        ? product.images
        : [product.image];

    // Add video as first item if it exists. The CMS falls back to a dev placeholder clip — skip that.
    if (product.video_url && !product.video_url.includes("/images/development/")) {
      return [`video:${product.video_url}`, ...items];
    }
    return items;
  }, [product.images, product.image, product.video_url]);

  const categoryCrumbs = (product.breadcrumbs || []).filter(
    (crumb) => crumb.label && crumb.label.toLowerCase() !== "shop",
  );
  const breadcrumbTrail: { label: string; to?: string }[] = [
    { label: "Home", to: "/" },
    { label: "Shop", to: "/shop" },
    ...categoryCrumbs.map((crumb) => ({
      label: crumb.label,
      to: `/shop/${encodeURIComponent(crumb.slug || crumb.label)}`,
    })),
    { label: product.name },
  ];

  const leafCategory = breadcrumbTrail.length > 3 ? breadcrumbTrail[breadcrumbTrail.length - 2] : null;

  const stockLine =
    product.stock <= 0
      ? { text: "Out of stock", tone: "text-stock-out" }
      : product.stock <= 3
        ? { text: `In stock — only ${product.stock} left`, tone: "text-stock-low" }
        : product.stock <= 10
          ? { text: "In stock — low stock", tone: "text-stock-low" }
          : { text: "In stock", tone: "text-stock-ok" };

  // Specs / features live as lists inside the description HTML; structured `specifications` add weight + dimensions.
  const parsedDescription = useMemo(
    () => parseProductDescription(product.description || ""),
    [product.description],
  );
  const specRows: [string, string][] = [
    ...parsedDescription.specs,
    ...(product.specifications || [])
      .map(({ label, value }) => [label, formatSpecValue(value)] as [string, string])
      .filter(([label, value]) => value && !parsedDescription.specs.some(([l]) => l.toLowerCase() === label.toLowerCase())),
  ];
  const preferredKeySpecs = ["motor type", "drill voltage", "voltage", "max torque", "no-load speed", "impact rate", "weight"];
  const keySpecs = [...specRows]
    .sort(([left], [right]) => {
      const leftIndex = preferredKeySpecs.indexOf(left.toLowerCase());
      const rightIndex = preferredKeySpecs.indexOf(right.toLowerCase());
      return (leftIndex < 0 ? Number.MAX_SAFE_INTEGER : leftIndex) - (rightIndex < 0 ? Number.MAX_SAFE_INTEGER : rightIndex);
    })
    .slice(0, 4);
  const featureList = product.features?.length ? product.features : parsedDescription.features;
  const shortDescription = useMemo(() => {
    const text = (new DOMParser().parseFromString(product.short_description || "", "text/html").body.textContent || "").trim();
    return text.toLowerCase() === product.name.trim().toLowerCase() ? "" : text;
  }, [product.short_description, product.name]);

  useEffect(() => {
    const previous = document.title;
    document.title = `${product.name} | Belims`;
    return () => {
      document.title = previous;
    };
  }, [product.name]);

  // Product + BreadcrumbList JSON-LD. Store-level Google reviews are deliberately not included.
  useEffect(() => {
    const origin = window.location.origin;
    const url = `${origin}${buildProductUrl(product)}`;
    const images = gallery.filter((item) => !item.startsWith("video:"));
    const data = [
      {
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.name,
        sku: product.sku || undefined,
        image: images.length ? images : undefined,
        brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
        category: categoryCrumbs.map((crumb) => crumb.label).join(" > ") || undefined,
        offers: {
          "@type": "Offer",
          url,
          priceCurrency: "ZAR",
          price: Number(consumerPrice || 0).toFixed(2),
          availability: isProductPurchasable(product)
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
        },
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: breadcrumbTrail.slice(1).map((crumb, idx) => ({
          "@type": "ListItem",
          position: idx + 1,
          name: crumb.label,
          ...(crumb.to ? { item: `${origin}${crumb.to}` } : {}),
        })),
      },
    ];
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.dataset.pdpJsonld = "true";
    script.textContent = JSON.stringify(data);
    document.head.appendChild(script);
    return () => script.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id, product.name, consumerPrice, gallery]);

  const [cartStatus, setCartStatus] = useState("");

  // Cross-sells, then same-category products — "Complete the job" fallback when there are no bundle candidates.
  const fallbackMatches = useMemo(() => {
    const mainCategory =
      product.breadcrumbs?.find((b) => b.label !== "Shop")?.label || product.category;
    const crossSellIds = product.cross_sell_ids || [];
    const crossSells = crossSellIds.length
      ? allProducts.filter((p) => crossSellIds.includes(p.id)).slice(0, 10)
      : [];
    const sameCategory = allProducts
      .filter(
        (p) =>
          p.id !== product.id &&
          !crossSells.some((rp) => rp.id === p.id) &&
          (p.breadcrumbs || []).some((b) => b.label === mainCategory),
      )
      .slice(0, Math.max(0, 10 - crossSells.length));
    return [...crossSells, ...sameCategory];
  }, [allProducts, product.id, product.breadcrumbs, product.category, product.cross_sell_ids]);

  type PdpTab = "overview" | "specs" | "works" | "delivery";
  const pdpTabs: { id: PdpTab; label: string }[] = [
    { id: "overview", label: "Overview" },
    ...(specRows.length > 0 ? [{ id: "specs" as const, label: "Specifications" }] : []),
    ...(product.bundleCandidates?.length || fallbackMatches.length
      ? [{ id: "works" as const, label: "Works with" }]
      : []),
    { id: "delivery", label: "Delivery & warranty" },
  ];
  const [activeTab, setActiveTab] = useState<PdpTab>("overview");
  useEffect(() => setActiveTab("overview"), [product.id]);

  // Arrow keys / Home / End move between tabs (roving tabindex).
  const onTabKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const index = pdpTabs.findIndex((tab) => tab.id === activeTab);
    const nextIndex =
      e.key === "ArrowRight" ? (index + 1) % pdpTabs.length
      : e.key === "ArrowLeft" ? (index - 1 + pdpTabs.length) % pdpTabs.length
      : e.key === "Home" ? 0
      : e.key === "End" ? pdpTabs.length - 1
      : -1;
    if (nextIndex < 0) return;
    e.preventDefault();
    const next = pdpTabs[nextIndex].id;
    setActiveTab(next);
    e.currentTarget.querySelector<HTMLButtonElement>(`#pdp-tab-${next}`)?.focus();
  };

  // Rows for "Complete the job": bundle candidates carry their own price/stock; fallbacks are full catalogue products.
  const jobItems = useMemo(() => {
    const bundle = product.bundleCandidates || [];
    if (bundle.length > 0) {
      return bundle.slice(0, 4).map((item) => {
        const url = buildProductUrl({ id: item.id, name: item.name } as Product);
        const inStock = typeof item.stock !== "number" || item.stock > 0;
        return {
          id: item.id,
          name: item.name,
          image: item.image,
          price: item.price,
          compareAt: typeof item.regular_price === "number" && item.regular_price > item.price ? item.regular_price : null,
          url,
          inStock,
          onAdd: () => {
            if (!inStock) {
              navigate(url);
              return;
            }
            addToCart({
              id: item.id,
              name: item.name,
              price: item.price,
              regular_price: item.regular_price,
              image: item.image,
              category: item.category,
              stock: typeof item.stock === "number" ? item.stock : 99,
              maxStock: typeof item.stock === "number" ? item.stock : 99,
              in_stock: inStock,
              quantity: 1,
            } as unknown as Product);
          },
        };
      });
    }
    return fallbackMatches.slice(0, 4).map((p) => {
      const url = buildProductUrl(p);
      const inStock = isProductPurchasable(p);
      const price = p.deals_resolved?.consumer?.price ?? p.price;
      const compareAt = p.deals_resolved?.consumer?.compareAtPrice;
      return {
        id: p.id,
        name: p.name,
        image: p.image,
        price,
        compareAt: compareAt && compareAt > price ? compareAt : null,
        url,
        inStock,
        onAdd: () => (inStock ? addToCart(p) : navigate(url)),
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.bundleCandidates, fallbackMatches]);

  const relatedProducts = useMemo(
    () => allProducts.filter((p) => p.id !== product.id && p.category === product.category).slice(0, 5),
    [allProducts, product.id, product.category],
  );

  const [isAddToCartLoading, setIsAddToCartLoading] = useState(false);
  const BUTTON_SPINNER_MIN_MS = 450;

  const handleAddToCart = () => {
    for (let i = 0; i < qty; i++) {
      const productToAdd = { ...product };

      // ✅ Trade special cart metadata (restored / enforced)
      if (
        effectiveUseTradePrice &&
        isTradeSpecial &&
        pricingInfo.tradeDealsInfo?.bestDeal
      ) {
        productToAdd.cartMetadata = {
          priceMode: "trade",
          dealId: pricingInfo.tradeDealsInfo.bestDeal.deal_id,
        };
      } else {
        productToAdd.cartMetadata = undefined;
      }

      addToCart(productToAdd);
    }
    setCartStatus(`Added ${qty} × ${product.name} to cart`);
  };

  // Keeps the "Adding…" state visible for at least BUTTON_SPINNER_MIN_MS.
  const handleAddToCartClick = () => {
    if (!isProductPurchasable(product) || isAddToCartLoading) return;
    setIsAddToCartLoading(true);
    const startedAt = Date.now();
    try {
      handleAddToCart();
    } finally {
      const remaining = Math.max(0, BUTTON_SPINNER_MIN_MS - (Date.now() - startedAt));
      window.setTimeout(() => setIsAddToCartLoading(false), remaining);
    }
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    const currentIndex = gallery.indexOf(mainImage);
    const nextIndex = (currentIndex + 1) % gallery.length;
    setMainImage(gallery[nextIndex]);
  };

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    const currentIndex = gallery.indexOf(mainImage);
    const prevIndex = (currentIndex - 1 + gallery.length) % gallery.length;
    setMainImage(gallery[prevIndex]);
  };

  const hasDeliveryLocation = Boolean(
    deliveryAddress?.postalCode ||
    legacyDeliveryLabel ||
    (deliveryAddress?.city && deliveryAddress?.province),
  );
  const handleSelectFulfillment = (value: FulfillmentTab) => {
    setFulfillmentType(value);
    localStorage.setItem("belims_fulfillment_tab", value);
    localStorage.setItem("fulfillmentType", value);

    if (value === "pickup") {
      localStorage.setItem("pickupStoreSelected", "true");
      hydratePickupDistances();
    }

    window.dispatchEvent(new Event("belims:fulfillment-changed"));
  };

  const handleOpenDeliveryLocation = () => {
    setDeliveryModalMode("delivery");
    localStorage.setItem("fulfillmentType", "delivery");
    setIsDeliveryModalOpen(true);
  };
  const handleOpenPickupDetails = () => {
    setDeliveryModalMode("pickup");
    localStorage.setItem("belims_fulfillment_tab", "pickup");
    localStorage.setItem("fulfillmentType", "pickup");
    setIsDeliveryModalOpen(true);
  };
  const hydratePickupDistances = () => {
    if (hasPickupLocationRef.current) return;
    hasPickupLocationRef.current = true;
    if (!navigator.geolocation) return;

    const hasCoords = storeLocations.some(
      (store) =>
        typeof store.latitude === "number" &&
        typeof store.longitude === "number",
    );
    if (!hasCoords) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const toRadians = (value: number) => (value * Math.PI) / 180;
        const getDistanceKm = (
          lat1: number,
          lon1: number,
          lat2: number,
          lon2: number,
        ) => {
          const earthRadiusKm = 6371;
          const deltaLat = toRadians(lat2 - lat1);
          const deltaLon = toRadians(lon2 - lon1);
          const a =
            Math.sin(deltaLat / 2) ** 2 +
            Math.cos(toRadians(lat1)) *
              Math.cos(toRadians(lat2)) *
              Math.sin(deltaLon / 2) ** 2;
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          return Math.round(earthRadiusKm * c * 10) / 10;
        };

        const updatedStores = storeLocations.map((store) => {
          if (
            typeof store.latitude !== "number" ||
            typeof store.longitude !== "number"
          ) {
            return store;
          }
          const distance = getDistanceKm(
            latitude,
            longitude,
            store.latitude,
            store.longitude,
          );
          return { ...store, distance };
        });

        setStoreLocations(updatedStores);

        if (selectedStore) {
          const matched = updatedStores.find(
            (store) => store.id === selectedStore.id,
          );
          if (matched) {
            setSelectedStore(matched);
            if (typeof matched.distance === "number") {
              localStorage.setItem(
                "selectedPickupStoreDistance",
                JSON.stringify({
                  id: matched.id,
                  distance: matched.distance,
                }),
              );
              localStorage.setItem(
                "selectedPickupStore",
                JSON.stringify(matched),
              );
            }
          }
        }
      },
      () => {
        hasPickupLocationRef.current = false;
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 0,
      },
    );
  };
  useEffect(() => {
    if (fulfillmentType !== "pickup") return;
    hydratePickupDistances();
  }, [fulfillmentType, storeLocations]);

  return (
    <div className="relative bg-white">
      <p className="sr-only" role="status" aria-live="polite">
        {cartStatus}
      </p>
      {/* Full Screen Gallery Modal */}
      {isGalleryOpen && (
        <div className="fixed inset-0 z-[80] bg-black/95 flex flex-col items-center justify-center p-4 animate-fadeIn">
          <button
            onClick={() => setIsGalleryOpen(false)}
            className="absolute top-6 right-6 text-white hover:text-text-disabled z-50"
          >
            <X size={32} />
          </button>

          <div className="relative w-full max-w-5xl h-[70vh] flex items-center justify-center">
            {gallery.length > 1 && (
              <button
                onClick={handlePrevImage}
                className="absolute left-4 p-2 bg-white/10 hover:bg-white/20 rounded text-white transition-colors z-50"
              >
                <ArrowLeft size={32} />
              </button>
            )}

            {mainImage.startsWith("video:") ? (
              <VideoPlayer
                url={mainImage.replace("video:", "")}
                title={product.name}
              />
            ) : (
              <img
                src={mainImage}
                alt={product.name}
                loading="lazy"
                decoding="async"
                className="max-w-full max-h-full object-contain"
              />
            )}

            {gallery.length > 1 && (
              <button
                onClick={handleNextImage}
                className="absolute right-4 p-2 bg-white/10 hover:bg-white/20 rounded text-white transition-colors z-50"
              >
                <ArrowRight size={32} />
              </button>
            )}
          </div>

          <div className="mt-8 flex gap-4 overflow-x-auto max-w-full p-2 no-scrollbar">
            {gallery.map((item, idx) => (
              <button
                key={idx}
                onClick={() => setMainImage(item)}
                className={`w-20 h-20 rounded border-2 overflow-hidden transition-all flex-shrink-0 ${
                  mainImage === item
                    ? "border-belims-blue opacity-100"
                    : "border-transparent opacity-50 hover:opacity-80"
                }`}
              >
                {item.startsWith("video:") ? (
                  <div className="w-full h-full bg-black flex items-center justify-center text-white text-caption font-bold">
                    ▶ VIDEO
                  </div>
                ) : (
                  <img
                    src={item}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                )}
              </button>
            ))}
          </div>

          <div className="text-white mt-4 font-bold font-heading text-lg">
            {gallery.indexOf(mainImage) + 1} / {gallery.length}
          </div>
        </div>
      )}

      {/* Store Locator Modal */}
      {isLocatorOpen && (
        <StoreLocator
          currentStore={selectedStore || storeLocations[0]}
          stores={storeLocations}
          pickupSchedule={pickupSchedule}
          onSelectStore={(store) => {
            setSelectedStore(store);
            localStorage.setItem("selectedPickupStore", JSON.stringify(store));
            localStorage.setItem("pickupStoreSelected", "true");
            setFulfillmentType("pickup");
            localStorage.setItem("belims_fulfillment_tab", "pickup");
            localStorage.setItem("fulfillmentType", "pickup");
            if (typeof window !== "undefined") {
              window.dispatchEvent(
                new CustomEvent("belims:pickup-store-updated", {
                  detail: store,
                }),
              );
            }
            setIsLocatorOpen(false);
          }}
          onSaveSchedule={(date, time) => {
            setPickupSchedule({ date, time });
            localStorage.setItem(
              "pickupSchedule",
              JSON.stringify({ date, time }),
            );
          }}
          onClose={() => setIsLocatorOpen(false)}
          checkingProduct={product}
        />
      )}

      {/* Schedule Pickup Dialog */}
      {isSchedulePickupOpen &&
        (() => {
          const dayKeys = [
            "sun",
            "mon",
            "tue",
            "wed",
            "thu",
            "fri",
            "sat",
          ] as const;
          const parseTimeToMinutes = (value?: string | null) => {
            if (!value) return null;
            const [h, m] = value.split(":").map(Number);
            if (Number.isNaN(h) || Number.isNaN(m)) return null;
            return h * 60 + m;
          };
          const getAvailableTimes = (dateStr: string) => {
            if (!dateStr || !selectedStore) return [];
            const day = new Date(dateStr).getDay();
            const hours = selectedStore.hours?.[dayKeys[day]];
            if (!hours || hours.closed || !hours.open || !hours.close)
              return [];
            const openMins = parseTimeToMinutes(hours.open);
            const closeMins = parseTimeToMinutes(hours.close);
            const breakStart = parseTimeToMinutes(hours.breakStart);
            const breakEnd = parseTimeToMinutes(hours.breakEnd);
            if (openMins === null || closeMins === null) return [];
            return Array.from({ length: 48 }, (_, i) => {
              const mins = i * 30;
              const hh = String(Math.floor(mins / 60)).padStart(2, "0");
              const mm = String(mins % 60).padStart(2, "0");
              return `${hh}:${mm}`;
            }).filter((opt) => {
              const m = parseTimeToMinutes(opt);
              if (m === null || m < openMins || m > closeMins) return false;
              if (
                breakStart !== null &&
                breakEnd !== null &&
                m >= breakStart &&
                m < breakEnd
              )
                return false;
              return true;
            });
          };
          const available = getAvailableTimes(schedulePickupDate);
          const isTimeDisabled = available.length === 0;
          const handleSave = () => {
            if (!schedulePickupDate || !schedulePickupTime) {
              alert("Please select a pickup date and time.");
              return;
            }
            setPickupSchedule({
              date: schedulePickupDate,
              time: schedulePickupTime,
            });
            localStorage.setItem(
              "pickupSchedule",
              JSON.stringify({
                date: schedulePickupDate,
                time: schedulePickupTime,
              }),
            );
            setIsSchedulePickupOpen(false);
          };
          return (
            <div
              className="fixed inset-0 z-[900] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
              onClick={(e) => {
                if (e.target === e.currentTarget)
                  setIsSchedulePickupOpen(false);
              }}
            >
              <div className="relative bg-white w-full max-w-md rounded-lg shadow-lg overflow-hidden flex flex-col">
                <div className="p-5 bg-belims-blue flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-blue-50 text-belims-blue flex items-center justify-center flex-shrink-0">
                      <Clock size={18} className="text-belims-blue" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-white">
                        Schedule pickup
                      </h2>
                      <p className="text-caption text-white/90">
                        Choose your preferred pickup date and time.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsSchedulePickupOpen(false)}
                    className="text-white bg-[#3b308e] hover:bg-[#251e62] w-10 h-10 rounded-full transition-colors flex items-center justify-center flex-shrink-0"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="p-5 space-y-4">
                  <div>
                    <p className="text-caption font-semibold text-text">
                      Schedule pickup
                    </p>
                    <p className="mt-0.5 text-caption text-text-tertiary">
                      Choose your preferred pickup date and time.
                    </p>
                  </div>
                  <label className="block text-caption font-semibold text-text-secondary">
                    Date
                    <input
                      type="date"
                      value={schedulePickupDate}
                      min={new Date().toISOString().split("T")[0]}
                      onChange={(e) => {
                        setSchedulePickupDate(e.target.value);
                        setSchedulePickupTime("");
                      }}
                      className="mt-1 w-full rounded border border-border px-3 py-2 text-base focus:ring-2 focus:ring-belims-blue outline-none"
                    />
                  </label>
                  <label className="block text-caption font-semibold text-text-secondary">
                    Time
                    <input
                      type="time"
                      value={schedulePickupTime}
                      step={1800}
                      disabled={isTimeDisabled}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (
                          !val ||
                          !schedulePickupDate ||
                          !available.includes(val)
                        ) {
                          setSchedulePickupTime("");
                          return;
                        }
                        setSchedulePickupTime(val);
                      }}
                      className="mt-1 w-full rounded border border-border px-3 py-2 text-base focus:ring-2 focus:ring-belims-blue outline-none disabled:bg-surface-muted disabled:text-text-tertiary"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={handleSave}
                    className="w-full rounded-md bg-belims-blue px-4 py-2.5 text-base font-semibold text-white transition-colors hover:bg-belims-navy"
                  >
                    Save pickup time
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

      {/* Delivery Location Modal */}
      <DeliveryLocationModal
        isOpen={isDeliveryModalOpen}
        onClose={() => setIsDeliveryModalOpen(false)}
        initialFulfillmentType={deliveryModalMode}
        currentAddress={deliveryAddress || undefined}
        currentStore={selectedStore || undefined}
        currentUser={currentUser || undefined}
        onStoreSelect={(store) => {
          setSelectedStore(store || null);
          if (store) {
            setFulfillmentType("pickup");
            localStorage.setItem("belims_fulfillment_tab", "pickup");
            localStorage.setItem("fulfillmentType", "pickup");
            localStorage.setItem("pickupStoreSelected", "true");
            if (typeof window !== "undefined") {
              window.dispatchEvent(
                new CustomEvent("belims:pickup-store-updated", {
                  detail: store,
                }),
              );
            }
          }
        }}
        onAddressSelect={(address) => {
          setDeliveryAddress(address);
          if (address) {
            saveStoredAddress(address);
            setFulfillmentType("delivery");
            localStorage.setItem("belims_fulfillment_tab", "delivery");
            localStorage.setItem("fulfillmentType", "delivery");
            setFocusDeliveryPanelSignal((prev) => prev + 1);
          } else {
            setDeliveryAddress(null);
            setFulfillmentType("pickup");
            localStorage.setItem("belims_fulfillment_tab", "pickup");
            localStorage.setItem("fulfillmentType", "pickup");
            localStorage.removeItem("deliveryAddressV2");
            localStorage.removeItem("deliveryAddress");
          }
        }}
      />

      <nav className="container mx-auto px-4 py-4" aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1.5 text-caption text-text-secondary">
          {breadcrumbTrail.map((crumb, idx) => (
            <li key={`${crumb.label}-${idx}`} className="flex items-center gap-1.5">
              {crumb.to ? (
                <Link to={crumb.to} className="underline-offset-4 hover:text-belims-blue hover:underline">
                  {crumb.label}
                </Link>
              ) : (
                <span aria-current="page" className="font-semibold text-text">
                  {crumb.label}
                </span>
              )}
              {crumb.to && <ChevronRight size={12} aria-hidden="true" />}
            </li>
          ))}
        </ol>
      </nav>

      {/* Layout B: wide gallery + sticky purchase panel; content flows in the left column */}
      <div className="bg-white">
        <div className="container mx-auto px-4 pb-12">
          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12 lg:gap-10">
            {/* LEFT COLUMN — gallery */}
            <section className="order-1 lg:col-span-7" aria-label="Product images">
              <div className="flex flex-col-reverse gap-3 md:flex-row">
                {gallery.length > 1 && (
                  <div className="no-scrollbar flex gap-2 overflow-x-auto md:max-h-[480px] md:w-20 md:flex-col md:overflow-y-auto">
                    {gallery.map((item, idx) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setMainImage(item)}
                        aria-label={`Show ${item.startsWith("video:") ? "video" : `image ${idx + 1}`}`}
                        aria-pressed={mainImage === item}
                        className={`h-20 w-20 flex-shrink-0 overflow-hidden rounded-md border-2 bg-white p-1 transition-colors ${
                          mainImage === item ? "border-belims-blue" : "border-border hover:border-border-strong"
                        }`}
                      >
                        {item.startsWith("video:") ? (
                          <span className="flex h-full w-full items-center justify-center bg-belims-blue text-caption font-bold text-white">
                            ▶ Video
                          </span>
                        ) : (
                          <img src={item} alt="" loading="lazy" decoding="async" className="h-full w-full object-contain" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
                <div className="relative flex aspect-square max-h-[560px] flex-1 items-center justify-center rounded-md border border-border bg-white p-6">
                  {mainImage.startsWith("video:") ? (
                    <VideoPlayer url={mainImage.replace("video:", "")} title={product.name} />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsGalleryOpen(true)}
                      className="flex h-full w-full cursor-zoom-in items-center justify-center"
                      aria-label="Open full-screen gallery"
                    >
                      <img
                        src={mainImage}
                        alt={product.name}
                        loading="eager"
                        decoding="async"
                        className="max-h-full max-w-full object-contain"
                      />
                    </button>
                  )}
                </div>
              </div>
            </section>

            {/* RIGHT COLUMN — sticky purchase panel */}
            {/* Capped to the viewport so a tall panel (trade block, both fulfilment cards) stays reachable while sticky */}
            <div className="order-2 lg:sticky lg:top-32 lg:col-span-5 lg:row-span-2 lg:h-fit lg:max-h-[calc(100vh-9rem)] lg:self-start lg:overflow-y-auto lg:overscroll-contain lg:pr-1">
              <div>
                {/* ProductSummary */}
                <div className="bg-white">
                  <div className="pb-0">
                    {/* Brand + Badge + Wishlist — inline chip row */}
                    <div className={`flex flex-wrap items-center gap-2 ${dealBadgeLabel ? "mb-4" : "mb-3"}`}>
                      {product.brand &&
                        (onBrandClick ? (
                          <button
                            type="button"
                            onClick={() => onBrandClick(product.brand!)}
                            className="inline-block rounded border border-border bg-transparent px-2.5 py-1 text-caption font-semibold uppercase tracking-widest text-text-tertiary hover:border-primary hover:text-primary transition-colors"
                          >
                            {product.brand}
                          </button>
                        ) : (
                          <span className="inline-block rounded border border-border bg-transparent px-2.5 py-1 text-caption font-semibold uppercase tracking-widest text-text-tertiary">
                            {product.brand}
                          </span>
                        ))}
                      {dealBadgeLabel && (
                        <span
                          className={[
                            "inline-flex items-center rounded px-2.5 py-1 text-caption font-bold uppercase",
                            badgeToneClass,
                          ].join(" ")}
                        >
                          {dealBadgeLabel}
                        </span>
                      )}
                    </div>
                    <div className="mb-2 flex items-start justify-between gap-4">
                      <h1 className="font-heading font-condensed text-h2 font-bold uppercase leading-none text-text">
                        {product.name}
                      </h1>
                      <button
                        type="button"
                        aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
                        aria-pressed={isWishlisted}
                        onClick={() => {
                          const nowIn = toggleWishlist({
                            id: product.id,
                            name: product.name,
                            sku: product.sku || "",
                            price: consumerPrice || product.price || 0,
                            image: product.image || "",
                            slug: product.slug || "",
                            brand: product.brand,
                            category: product.category,
                          });
                          setIsWishlisted(nowIn);
                        }}
                        className={`grid h-11 w-11 flex-shrink-0 place-items-center rounded-md border-2 transition-colors ${
                          isWishlisted
                            ? "border-primary bg-white"
                            : "border-border-strong bg-white hover:border-primary"
                        }`}
                      >
                        <Heart
                          size={18}
                          className={isWishlisted ? "text-primary" : "text-text-secondary"}
                          fill={isWishlisted ? "currentColor" : "none"}
                          strokeWidth={isWishlisted ? 2 : 1.5}
                        />
                      </button>
                    </div>
                    <p className="mb-3 flex flex-wrap gap-x-4 text-caption text-text-tertiary">
                      <span>
                        SKU <b className="text-text">{product.sku || "N/A"}</b>
                      </span>
                      {leafCategory?.to && (
                        <span>
                          Category{" "}
                          <Link to={leafCategory.to} className="font-semibold text-text underline underline-offset-4 hover:text-belims-blue">
                            {leafCategory.label}
                          </Link>
                        </span>
                      )}
                    </p>
                  </div>

                  {/* BuyBoxCard */}
                  <div ref={buyBoxRef} className="mt-5 border-t border-border pt-5">
                    {/* Price + stock */}
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <ProductPriceDisplay
                          product={product}
                          deal={
                            isTradeSpecial && !isTradeApproved && !showTradeDeal
                              ? undefined
                              : product.deals_resolved?.consumer
                          }
                          overridePrice={
                            (isTradeApproved || showTradeDeal) && isTradeSpecial
                              ? pricingInfo.tradePrice
                              : undefined
                          }
                          isTradeToggleActive={isTradeApproved || showTradeDeal}
                          showDualTradePricing={false}
                          showCountdown={false}
                        />
                        <div className={`mt-4 ${stockLine.tone}`}>
                          <p className="flex items-center gap-1.5 text-base font-semibold">
                            <span className="h-2 w-2 rounded-full bg-current" aria-hidden="true" />
                            {stockLine.text}
                          </p>
                          <div className="mt-2 h-1 w-full overflow-hidden bg-border" aria-hidden="true">
                            <div
                              className="h-full bg-current"
                              style={{ width: `${Math.min(100, (product.stock / Math.max(product.maxStock || 1, 1)) * 100)}%` }}
                            />
                          </div>
                        </div>
                        {keySpecs.length > 0 && (
                          <dl className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border">
                            {keySpecs.map(([label, value]) => (
                              <div key={label} className="min-w-0 bg-surface-muted px-4 py-4 sm:px-5">
                                <dt className="text-caption font-bold uppercase tracking-wide text-text-tertiary">{label}</dt>
                                <dd className="mt-1.5 break-words text-base font-semibold leading-snug text-text sm:text-lg">{value}</dd>
                              </div>
                            ))}
                          </dl>
                        )}
                      </div>

                      {product.isBundle &&
                        !(
                          isTradeSpecial &&
                          !isTradeApproved &&
                          !showTradeDeal
                        ) && (
                          <span className="bg-green-100 text-green-700 text-caption font-bold px-2 py-1 rounded ml-4 flex-shrink-0">
                            Bundle Savings
                          </span>
                        )}
                    </div>

                    {/* Qty + CTAs */}
                    <div className="mt-5 mb-4">
                      <div className="flex gap-3">
                        <div className="flex h-12 items-center rounded-md border border-border-strong bg-white" role="group" aria-labelledby="pdp-qty-label">
                          <span id="pdp-qty-label" className="sr-only">Quantity</span>
                          <button
                            type="button"
                            onClick={() => setQty(Math.max(1, qty - 1))}
                            disabled={qty <= 1}
                            aria-label="Decrease quantity"
                            className="h-full px-3 text-text-secondary hover:text-belims-blue disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Minus size={15} />
                          </button>
                          <output className="w-8 text-center text-base font-bold" aria-live="polite">
                            {qty}
                          </output>
                          <button
                            type="button"
                            onClick={() =>
                              setQty(Math.min(product.stock ?? 1, qty + 1))
                            }
                            disabled={qty >= (product.stock ?? 1)}
                            aria-label="Increase quantity"
                            className="h-full px-3 text-text-secondary hover:text-belims-blue disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Plus size={15} />
                          </button>
                        </div>

                        <div className="flex flex-1">
                          <button
                            type="button"
                            onClick={handleAddToCartClick}
                            disabled={
                              !isProductPurchasable(product) ||
                              isAddToCartLoading
                            }
                            className="h-12 w-full rounded-md bg-primary text-white transition-colors hover:bg-belims-blue disabled:opacity-50"
                          >
                            <span className="flex items-center justify-center gap-2 font-heading font-condensed text-button font-bold uppercase [&>[data-icon=inline-start]]:-ml-0.5">
                              {isAddToCartLoading ? (
                                <>
                                  <Spinner data-icon="inline-start" />
                                  Adding...
                                </>
                              ) : isProductPurchasable(product) ? (
                                "Add to cart"
                              ) : (
                                "Out of Stock"
                              )}
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Trade Price Block (unchanged behavior) */}
                    {pricingInfo.hasTradePrice && isTradeSpecial && (
                      <div className="mt-6 bg-blue-50 border border-blue-200 rounded p-5">
                        {isTradeApproved ? (
                          <>
                            <div className="flex items-center justify-between gap-3 mb-3">
                              <h3 className="text-base font-bold text-text-secondary">
                                Trade price
                              </h3>
                              <span className="bg-green-100 border uppercase border-green-500 px-5 py-1 text-caption font-extrabold text-green-700 rounded-full tabular-nums">
                                Applied
                              </span>
                            </div>

                            <div className="grid grid-cols-3 gap-3 text-center rounded-lg border border-border bg-white p-4 shadow-sm">
                              <div className="flex flex-col items-center justify-center">
                                <div className="text-caption font-semibold text-text-tertiary uppercase tracking-wide">
                                  Retail
                                </div>
                                <div className="mt-1 text-base font-bold text-text tabular-nums">
                                  {formatCurrency(pricingInfo.retailPrice)}
                                </div>
                              </div>
                              <div className="relative flex flex-col items-center justify-center rounded bg-belims-blue p-3">
                                <div className="text-caption font-bold text-white uppercase tracking-wide">
                                  Trade
                                </div>
                                <div className="mt-1 text-base font-extrabold text-white tabular-nums">
                                  {formatCurrency(pricingInfo.tradePrice)}
                                </div>
                              </div>
                              <div className="flex flex-col items-center justify-center">
                                <div className="text-caption font-semibold text-text-tertiary uppercase tracking-wide">
                                  Discount
                                </div>
                                <div className="mt-1 inline-flex items-center gap-1 rounded bg-green-100 border border-green-500 px-5 py-1 text-base font-extrabold text-green-700 tabular-nums">
                                  {formatCurrency(pricingInfo.savings)}
                                </div>
                              </div>
                            </div>

                            <div className="mt-4 text-caption text-text-secondary text-center">
                              <span className="font-medium">
                                Trade pricing applied.
                              </span>
                            </div>
                          </>
                        ) : (
                          <>
                            {!showTradeDeal ? (
                              <TradePricingAvailable
                                onShowTradeDeal={() => setShowTradeDeal(true)}
                              />
                            ) : (
                              <>
                                <div className="flex items-center justify-between gap-3 mb-3">
                                  <div className="expandedTitle">
                                    <div className="text-base font-bold text-text mb-1">
                                      Trade deal details
                                    </div>
                                    <div className="text-caption text-text-secondary mb-3">
                                      Available to contractors with a Belims
                                      trade account.
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => setShowTradeDeal(false)}
                                    className="text-caption font-bold uppercase tracking-wide text-text-secondary bg-white px-2 py-1 rounded-md border border-border hover:border-border-soft transition-colors"
                                  >
                                    VIEW RETAIL PRICE
                                  </button>
                                </div>

                                <div className="grid grid-cols-3 gap-3 text-center rounded-lg border border-border bg-white p-4 shadow-sm">
                                  <div className="flex flex-col items-center justify-center">
                                    <div className="text-caption font-semibold text-text-tertiary uppercase tracking-wide">
                                      Retail
                                    </div>
                                    <div className="mt-1 text-base font-bold text-text tabular-nums">
                                      {formatCurrency(pricingInfo.retailPrice)}
                                    </div>
                                  </div>
                                  <div className="relative flex flex-col items-center justify-center rounded-lg bg-orange-100 p-2">
                                    <div className="text-caption font-bold text-orange-700 uppercase tracking-wide">
                                      Trade
                                    </div>
                                    <div className="mt-1 text-base font-extrabold text-orange-700 tabular-nums">
                                      {formatCurrency(pricingInfo.tradePrice)}
                                    </div>

                                    <div className="mt-2 inline-flex items-center rounded-full bg-belims-accent px-4 py-0.5 text-caption font-semibold text-white">
                                      Trade discount
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-center justify-center">
                                    <div className="text-caption font-semibold text-text-tertiary uppercase tracking-wide">
                                      Save
                                    </div>
                                    <div className="mt-1 inline-flex items-center gap-1 rounded bg-green-100 border border-green-500 px-5 py-1 text-base font-extrabold text-green-700 tabular-nums">
                                      {formatCurrency(pricingInfo.savings)}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex flex-col sm:flex-row sm:justify-center sm:items-center gap-4 mt-2">
                                  <a
                                    href="/trade-accounts"
                                    className="mt-3 text-center text-caption text-text-tertiary underline hover:text-text-secondary"
                                  >
                                    Learn about the Belims trade accounts
                                  </a>
                                  <a
                                    href="/trade-accounts"
                                    className="inline mt-3 text-center text-caption text-text-tertiary underline hover:text-text-secondary"
                                  >
                                    Register for a Belims trade account
                                  </a>
                                </div>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <FulfilmentChooser
                  fulfillmentType={fulfillmentType}
                  onSelectFulfillment={handleSelectFulfillment}
                  onSetDeliveryLocation={handleOpenDeliveryLocation}
                  hasDeliveryLocation={hasDeliveryLocation}
                  deliveryAddress={deliveryAddress}
                  pickupStore={selectedStore}
                  pickupSchedule={pickupSchedule}
                  deliveryRates={deliveryRates}
                  loadingDeliveryRates={loadingDeliveryRates || isResolvingStoredAddress}
                  deliveryRatesError={deliveryRatesError}
                  selectedDeliveryOptionId={selectedDeliveryOptionId}
                  onSelectDeliveryOption={(id) => {
                    setSelectedDeliveryOptionId(id);
                    sessionStorage.setItem("selectedDeliveryOptionId", id);
                  }}
                  onViewPickupDetails={handleOpenPickupDetails}
                  onSchedulePickup={() => setIsSchedulePickupOpen(true)}
                  focusDeliveryPanelSignal={focusDeliveryPanelSignal}
                />

              </div>
            </div>

            {/* DETAILS — tabs under the gallery (below the purchase panel on mobile) */}
            <div className="order-3 lg:col-span-7 lg:mt-8">
              <div
                role="tablist"
                aria-label="Product information"
                className="flex gap-5 overflow-x-auto border-b-2 border-border"
                onKeyDown={onTabKeyDown}
              >
                {pdpTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    id={`pdp-tab-${tab.id}`}
                    aria-selected={activeTab === tab.id}
                    aria-controls={`pdp-panel-${tab.id}`}
                    tabIndex={activeTab === tab.id ? 0 : -1}
                    onClick={() => setActiveTab(tab.id)}
                    className={`-mb-0.5 min-h-12 shrink-0 whitespace-nowrap border-b-[3px] px-1 py-3 text-left font-heading font-condensed text-base font-bold uppercase leading-tight transition-colors ${
                      activeTab === tab.id
                        ? "border-text font-extrabold text-text"
                        : "border-transparent text-text-tertiary hover:text-text"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div
                role="tabpanel"
                id="pdp-panel-overview"
                aria-labelledby="pdp-tab-overview"
                hidden={activeTab !== "overview"}
                tabIndex={0}
                className="py-7 focus:outline-none"
              >
              {/* Overview */}
              <section aria-labelledby="pdp-overview">
                <h2 id="pdp-overview" className="sr-only">
                  Overview
                </h2>
                {shortDescription && <p className="mb-4 text-base font-semibold text-text">{shortDescription}</p>}
                {featureList.length > 0 && (
                  <ul className="mb-5 space-y-1.5 text-base text-text">
                    {featureList.map((feature, idx) => (
                      <li key={idx} className="flex gap-2">
                        <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 bg-primary" aria-hidden="true" />
                        <span>{feature.charAt(0).toUpperCase() + feature.slice(1)}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {parsedDescription.restHtml && (
                  <div className="prose prose-sm max-w-none text-text-secondary text-base [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-text [&_h3]:mt-4 [&_h3]:mb-2 [&_h4]:text-base [&_h4]:font-semibold [&_h4]:text-text [&_h4]:mt-3 [&_h4]:mb-2 [&_strong]:font-bold [&_strong]:text-text [&_b]:font-bold [&_b]:text-text [&_em]:italic [&_i]:italic [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ul]:mb-3 [&_ul]:mt-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1 [&_ol]:mb-3 [&_ol]:mt-2 [&_li]:text-text [&_li]:leading-relaxed [&_p]:mb-2 [&_p]:leading-relaxed [&_br]:content-[''] [&_table]:w-full [&_table]:border-collapse [&_table]:mb-3 [&_th]:border [&_th]:border-border-strong [&_th]:bg-surface-dark [&_th]:p-2 [&_th]:text-left [&_th]:font-semibold [&_td]:border [&_td]:border-border-strong [&_td]:p-2">
                    <div dangerouslySetInnerHTML={{ __html: parsedDescription.restHtml }} />
                  </div>
                )}
                {!shortDescription && !featureList.length && !parsedDescription.restHtml && (
                  <p className="text-base text-text-tertiary">No description yet for this product.</p>
                )}
              </section>

              </div>
              {specRows.length > 0 && (
              <div
                role="tabpanel"
                id="pdp-panel-specs"
                aria-labelledby="pdp-tab-specs"
                hidden={activeTab !== "specs"}
                tabIndex={0}
                className="py-7 focus:outline-none"
              >
                <section aria-labelledby="pdp-specs">
                  <h2 id="pdp-specs" className="sr-only">
                    Specifications
                  </h2>
                  <table className="w-full border-collapse text-base">
                    <tbody>
                      {specRows.map(([label, value]) => (
                        <tr key={label} className="border-b border-border even:bg-surface-muted">
                          <th scope="row" className="w-1/2 px-3 py-2.5 text-left font-semibold text-text-secondary">
                            {label}
                          </th>
                          <td className="px-3 py-2.5 text-text">{value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              </div>
              )}
              {jobItems.length > 0 && (
                <div
                  role="tabpanel"
                  id="pdp-panel-works"
                  aria-labelledby="pdp-tab-works"
                  hidden={activeTab !== "works"}
                  tabIndex={0}
                  className="py-7 focus:outline-none"
                >
                  <section aria-labelledby="pdp-works-heading">
                    <h2 id="pdp-works-heading" className="mb-4 font-heading text-h5 font-bold text-text">Perfect match with</h2>
                    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {jobItems.map((item) => (
                        <li key={item.id} className="grid grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-border bg-white p-3 transition-colors hover:border-belims-blue">
                          <Link to={item.url} tabIndex={-1} aria-hidden="true" className="grid h-16 w-16 place-items-center rounded bg-surface-muted">
                            {item.image && <img src={item.image} alt="" loading="lazy" decoding="async" className="max-h-full max-w-full object-contain" />}
                          </Link>
                          <div className="min-w-0">
                            <Link to={item.url} className="line-clamp-2 text-base font-semibold leading-snug text-text hover:text-belims-blue">{item.name}</Link>
                            <div className="mt-1 flex items-baseline gap-2">
                              <b className={`text-base ${item.compareAt ? "text-primary" : "text-text"}`}>{formatCurrency(item.price)}</b>
                              {item.compareAt && <span className="text-caption text-text-tertiary line-through">{formatCurrency(item.compareAt)}</span>}
                            </div>
                          </div>
                          <button type="button" onClick={item.onAdd} aria-label={`${item.inStock ? "Add" : "View"} ${item.name}${item.inStock ? " to cart" : ""}`} className="min-h-10 rounded-md border border-border-strong bg-white px-3 font-heading font-condensed text-button font-bold uppercase text-text transition-colors hover:bg-surface-dark hover:text-white">
                            {item.inStock ? "Add" : "View"}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                </div>
              )}
              <div
                role="tabpanel"
                id="pdp-panel-delivery"
                aria-labelledby="pdp-tab-delivery"
                hidden={activeTab !== "delivery"}
                tabIndex={0}
                className="py-7 focus:outline-none"
              >
              {/* Delivery & returns — the only place Returns / Warranty appear on the page */}
              <section aria-labelledby="pdp-delivery">
                <h2 id="pdp-delivery" className="sr-only">
                  Delivery &amp; returns
                </h2>
                <ProductAccordions
                  ecommercePolicies={ecommercePolicies}
                  expandedPolicy={expandedPolicy}
                  setExpandedPolicy={setExpandedPolicy}
                />
              </section>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Sticky Bottom CTA (Athens-like: only appears when BuyBox actions are out of view) */}
      <div
        data-sticky-cart-bar
        className={`fixed left-0 right-0 bottom-0 z-[260] bg-white border-t border-border px-4 py-3 transition-transform duration-300 md:hidden ${
          showBottomCta ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="container mx-auto flex items-center justify-between gap-4 px-0">
          {/* Product info */}
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <img
              src={product.image}
              alt={product.name}
              className="h-14 w-14 flex-shrink-0 rounded bg-surface-muted object-contain"
              loading="lazy"
              decoding="async"
            />
            <div className="flex-1 min-w-0">
              <div className="truncate font-heading text-base font-bold text-text">
                {product.name}
              </div>
              <div className="text-base font-bold text-text">
                {formatCurrency(
                  product.deals_resolved?.consumer?.price ?? product.price,
                )}
              </div>
            </div>
          </div>

          {/* CTAs */}
          <div className="flex w-[150px] flex-shrink-0 flex-col gap-2 md:w-auto md:flex-row md:items-center">
            <button
              onClick={handleAddToCartClick}
              disabled={
                !isProductPurchasable(product) || isAddToCartLoading
              }
              className="h-11 w-full rounded-md bg-primary text-white transition-colors hover:bg-belims-blue disabled:opacity-50 md:w-[160px]"
            >
              <span className="flex items-center justify-center gap-2 font-heading font-condensed text-button font-bold uppercase [&>[data-icon=inline-start]]:-ml-0.5">
                {isAddToCartLoading ? (
                  <>
                    <Spinner data-icon="inline-start" />
                    Adding...
                  </>
                ) : isProductPurchasable(product) ? (
                  "Add to cart"
                ) : (
                  "Out of Stock"
                )}
              </span>
            </button>

          </div>
        </div>
      </div>

      {product.bundleCandidates && product.bundleCandidates.length > 0 && (
        <>
          {/* <section className="border-y border-border bg-white">
            <style>
              {`@keyframes bundle-marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }`}
            </style>
            <div className="overflow-hidden">
              <div
                className="flex items-center whitespace-nowrap py-3 text-caption font-semibold text-text"
                style={{
                  animation: "bundle-marquee 28s linear infinite",
                  width: "max-content",
                }}
              >
                {[
                  "Unlimited delivery for only R1000",
                  "Free returns within 30 days",
                  "Summer sale discount off 20%.",
                  "Sign up for 10% off your first order.",
                  "Unlimited delivery for only R1000",
                  "Free returns within 30 days",
                  "Summer sale discount off 20%.",
                  "Sign up for 10% off your first order.",
                ].map((message, index) => (
                  <div
                    key={`${message}-${index}`}
                    className="flex items-center"
                  >
                    <span className="px-4">{message}</span>
                    <span className="text-text-disabled">|</span>
                  </div>
                ))}
              </div>
            </div>
          </section> */}
        </>
      )}

      {/* Related: more from the product's own category */}
      {relatedProducts.length > 0 && (
        <section className="border-t border-border bg-white py-12" aria-labelledby="pdp-related">
          <div className="container mx-auto px-4">
            <SectionHeading id="pdp-related" eyebrow="Keep shopping" title={`More in ${leafCategory?.label || product.category}`}>
              {leafCategory?.to && <ViewAllLink to={leafCategory.to}>View all</ViewAllLink>}
            </SectionHeading>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-5 lg:gap-5">
              {relatedProducts.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  addToCart={addToCart}
                  customizations={PRODUCT_CARD_PRESETS.railCard}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Recently Viewed Section */}
      <RecentlyViewed
        addToCart={addToCart}
        onBuyNow={onBuyNow}
        onProductClick={(p) => navigate(buildProductUrl(p))}
        onCompare={onCompare}
        currentProductId={product.id}
        isAuthenticated={isAuthenticated}
        isTradeApproved={isTradeApproved}
      />
    </div>
  );
};
