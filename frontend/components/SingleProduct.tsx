import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronRight,
  Minus,
  Plus,
  X,
  ArrowLeft,
  ArrowRight,
  Target,
} from "lucide-react";
import { Product, ShippingAddress, Store } from "../types";
import { CURRENCY_SYMBOL, STORES } from "../constants";
import { formatCurrency } from "../utils/price";
import { StockBar } from "./StockBar";
import { DeliveryLocationModal } from "./DeliveryLocationModal";
import { VideoPlayer } from "./VideoPlayer";
import { generateProductDescription } from "../services/geminiService";
import { addToRecentlyViewed } from "../services/storageService";
import { cachedGetJson, getApiBaseUrl } from "../services/wooCommerceService";
import {
  getFallbackShipping,
  getShippingRates,
} from "../services/bobGoService";
import {
  buildAddressLabel,
  readStoredAddress,
  saveStoredAddress,
} from "../services/shippingAddress";
import { RecentlyViewed } from "./RecentlyViewed";
import { StoreLocator } from "./StoreLocator";
import { ProductCard, PRODUCT_CARD_PRESETS } from "./ProductCard";
import { ProductPriceDisplay } from "./ProductPriceDisplay";
import { FulfillmentBlock } from "./FulfillmentBlock";
import { DeliveryRateOption } from "./DeliveryRateOption";
import { ProductAccordions } from "./ProductAccordions";
import { TradePricingAvailable } from "./TradePricingAvailable";
import { SocialShareExpertBlock } from "./SocialShareExpertBlock";
import { BundledProducts } from "./BundledProducts";

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
}

type ShippingTier = "Express" | "Standard" | "Economy";

interface ShippingRate {
  service_name: string;
  total_price: number;
  expected_delivery_date?: string;
  tier?: ShippingTier;
}

const formatEtaDateLabel = (date: Date): string =>
  date.toLocaleDateString("en-ZA", { month: "short", day: "numeric" });

const parseEarliestDateFromEta = (eta?: string | null): Date | null => {
  if (!eta) return null;
  const value = eta.trim();
  if (!value) return null;

  const [startRaw] = value.split(" - ");
  const parsed = new Date(startRaw.trim());
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

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

const formatEta = (dateStr?: string | null): string => {
  if (!dateStr) return "Estimated Arrival";
  const value = dateStr.trim();
  if (!value) return "Estimated Arrival";

  const formatDate = (input: string) => {
    const parsed = new Date(input);
    if (Number.isNaN(parsed.getTime())) return "";
    return parsed.toLocaleDateString("en-ZA", {
      month: "short",
      day: "numeric",
    });
  };

  if (value.includes(" - ")) {
    const [startRaw, endRaw] = value.split(" - ").map((part) => part.trim());
    const start = formatDate(startRaw);
    const end = formatDate(endRaw);

    if (start && end) {
      return start === end
        ? `Estimated Arrival: ${start}`
        : `Estimated Arrival: ${start} - ${end}`;
    }
  }

  const single = formatDate(value);
  if (single) return `Estimated Arrival: ${single}`;
  return value;
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
}) => {
  const navigate = useNavigate();
  const getDefaultStore = (stores: Store[]) =>
    stores.find((store) => store.name.toLowerCase().includes("umzinto")) ||
    stores[0] ||
    null;
  const shouldSkipDefaultStore = () =>
    import.meta.env.DEV &&
    typeof window !== "undefined" &&
    localStorage.getItem("devSkipDefaultStore") === "true";

  // Gallery / image
  const [mainImage, setMainImage] = useState(product.image);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);

  // Qty
  const [qty, setQty] = useState(1);

  // Policies
  const [expandedPolicy, setExpandedPolicy] = useState<string | null>(null);
  const [ecommercePolicies, setEcommercePolicies] = useState<any>(null);
  const [expertContact, setExpertContact] = useState<any>(null);

  // Store Locator
  const [isLocatorOpen, setIsLocatorOpen] = useState(false);
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
  const [deliveryAddress, setDeliveryAddress] =
    useState<ShippingAddress | null>(null);
  const [legacyDeliveryLabel, setLegacyDeliveryLabel] = useState<string | null>(
    null,
  );

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
  const [fulfillmentType, setFulfillmentType] = useState<
    "pickup" | "delivery" | null
  >(null);
  const [isDeliveryOptionsOpen, setIsDeliveryOptionsOpen] = useState(false);
  const hasOpenedDeliveryOptionsRef = useRef(false);
  const hasPickupLocationRef = useRef(false);

  // Sticky bottom CTA (Athens-like): show when BuyBox actions are out of view
  const [showBottomCta, setShowBottomCta] = useState(false);
  const buyBoxRef = useRef<HTMLDivElement>(null);

  // Frequently Bought With Slider
  const frequentlyBoughtRailRef = useRef<HTMLDivElement | null>(null);
  const [frequentlyBoughtRailWidth, setFrequentlyBoughtRailWidth] = useState(0);
  const [frequentlyBoughtStepWidth, setFrequentlyBoughtStepWidth] = useState(0);
  const [frequentlyBoughtIndex, setFrequentlyBoughtIndex] = useState(0);

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

  const earliestDeliveryEta = useMemo(() => {
    if (!deliveryRates.length) return "";

    const parsedDates = deliveryRates
      .map((rate) => parseEarliestDateFromEta(rate.expected_delivery_date))
      .filter((date): date is Date => Boolean(date));

    if (parsedDates.length > 0) {
      const earliestDate = new Date(
        Math.min(...parsedDates.map((date) => date.getTime())),
      );
      return formatEtaDateLabel(earliestDate);
    }

    const fallbackEta = formatEta(deliveryRates[0]?.expected_delivery_date);
    return fallbackEta.replace(/^Estimated Arrival:\s*/i, "") || "";
  }, [deliveryRates]);

  const refreshStoredAddress = () => {
    const { address, legacyLabel } = readStoredAddress();
    setDeliveryAddress(address);
    setLegacyDeliveryLabel(legacyLabel);
  };

  useEffect(() => {
    addToRecentlyViewed(product);
    setMainImage(product.image);
    setQty(1);
    setUseTradePrice(false);
    setShowTradeDeal(false);
    setShowBottomCta(false);

    const apiBase = getApiBaseUrl();
    fetch(`${apiBase}/ecommerce-policies`)
      .then((res) => res.json())
      .then((data) => {
        setEcommercePolicies(data);
        if (data?.expert_contact) {
          setExpertContact(data.expert_contact);
        }
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

    cachedGetJson<any>(`${apiBase}/site-settings`)
      .then((data) => {
        if (data?.ecommerce?.expert_contact) {
          setExpertContact(data.ecommerce.expert_contact);
        }
      })
      .catch((err) => console.error("Failed to fetch site settings:", err));
  }, [product]);

  useEffect(() => {
    refreshStoredAddress();
  }, []);

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
      window.dispatchEvent(
        new CustomEvent("belims:pickup-store-updated", {
          detail: nextStore,
        }),
      );
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
    if (!isDeliveryModalOpen) refreshStoredAddress();
  }, [isDeliveryModalOpen]);

  useEffect(() => {
    if (fulfillmentType !== "delivery") return;
    if (hasOpenedDeliveryOptionsRef.current) return;
    hasOpenedDeliveryOptionsRef.current = true;
    setIsDeliveryOptionsOpen(true);
  }, [fulfillmentType]);

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
    deliveryAddress?.city && deliveryAddress?.province,
  );

  useEffect(() => {
    const fetchDeliveryRates = async () => {
      if (!hasStructuredAddress || !deliveryAddress) {
        setDeliveryRates([]);
        return;
      }

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

        setDeliveryRates(classifiedRates);
      } catch (error) {
        console.error("Failed to fetch delivery rates:", error);
        const fallbackRates = getFallbackShipping().map((rate: any) => ({
          ...rate,
          tier: classifyRate(rate, getFallbackShipping()),
        }));
        setDeliveryRates(fallbackRates);
        setDeliveryRatesError(
          "Unable to fetch live rates. Showing estimated delivery options.",
        );
      } finally {
        setLoadingDeliveryRates(false);
      }
    };

    fetchDeliveryRates();
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

    // Add video as first item if it exists
    if (product.video_url) {
      return [`video:${product.video_url}`, ...items];
    }
    return items;
  }, [product.images, product.image, product.video_url]);

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
  };

  const handleBuyNowAction = () => {
    handleAddToCart();
    onBuyNow(product);
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

  const hasDeliveryLocation = !!deliveryAddress;
  const handleOpenDeliveryLocation = () => setIsDeliveryModalOpen(true);
  const handleOpenPickupDetails = () => {
    localStorage.setItem("fulfillmentType", "pickup");
    setIsDeliveryModalOpen(true);
  };
  const handleResetPickupStore = () => {
    localStorage.removeItem("selectedPickupStore");
    localStorage.removeItem("selectedPickupStoreDistance");
    localStorage.removeItem("pickupStoreSelected");
    localStorage.setItem("devSkipDefaultStore", "true");
    setSelectedStore(null);
    setPickupSchedule(null);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("belims:reset-pickup-store"));
    }
  };
  const handleEnableDefaultStore = () => {
    localStorage.removeItem("devSkipDefaultStore");
    const defaultStore = getDefaultStore(storeLocations);
    setSelectedStore(defaultStore);
    setPickupSchedule(null);
    if (defaultStore) {
      localStorage.setItem("selectedPickupStore", JSON.stringify(defaultStore));
      localStorage.setItem("pickupStoreSelected", "true");
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("belims:enable-default-store"));
    }
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

  // Frequently Bought With Slider Logic
  useEffect(() => {
    if (!frequentlyBoughtRailRef.current) return;

    const measure = () => {
      const rail = frequentlyBoughtRailRef.current;
      if (!rail) return;

      setFrequentlyBoughtRailWidth(rail.clientWidth);

      const children = Array.from(
        rail.querySelectorAll<HTMLElement>("[data-fbw-slider-item]"),
      );
      if (children.length === 0) return;

      if (children.length >= 2) {
        const step = children[1].offsetLeft - children[0].offsetLeft;
        setFrequentlyBoughtStepWidth(step > 0 ? step : children[0].offsetWidth);
      } else {
        setFrequentlyBoughtStepWidth(children[0].offsetWidth);
      }
    };

    measure();

    const ro = new ResizeObserver(() => measure());
    ro.observe(frequentlyBoughtRailRef.current);

    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  const scrollToFrequentlyBoughtIndex = (nextIndex: number) => {
    if (!frequentlyBoughtRailRef.current || !frequentlyBoughtStepWidth) return;
    frequentlyBoughtRailRef.current.scrollTo({
      left: nextIndex * frequentlyBoughtStepWidth,
      behavior: "smooth",
    });
  };

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  return (
    <div className="relative bg-white">
      {/* Full Screen Gallery Modal */}
      {isGalleryOpen && (
        <div className="fixed inset-0 z-[80] bg-black/95 flex flex-col items-center justify-center p-4 animate-fadeIn">
          <button
            onClick={() => setIsGalleryOpen(false)}
            className="absolute top-6 right-6 text-white hover:text-gray-300 z-50"
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
                  <div className="w-full h-full bg-black flex items-center justify-center text-white text-xs font-bold">
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

      {/* Delivery Location Modal */}
      <DeliveryLocationModal
        isOpen={isDeliveryModalOpen}
        onClose={() => setIsDeliveryModalOpen(false)}
        currentAddress={deliveryAddress || undefined}
        currentStore={selectedStore || undefined}
        onStoreSelect={(store) => {
          setSelectedStore(store || null);
          if (store) {
            setFulfillmentType("pickup");
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
          } else {
            setDeliveryAddress(null);
            localStorage.removeItem("deliveryAddressV2");
            localStorage.removeItem("deliveryAddress");
          }
        }}
      />

      {/* Sticky header (simple Athens-style: no hide/show secondary nav logic) */}
      <div className="sticky top-0 z-40 bg-white">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <div className="text-base text-gray flex items-center gap-2 whitespace-nowrap">
              <span
                className="cursor-pointer hover:text-belims-blue transition-colors"
                onClick={() => navigate(-1)}
              >
                Home
              </span>
              {product.breadcrumbs && product.breadcrumbs.length > 0 && (
                <>
                  {product.breadcrumbs.map((breadcrumb, idx) => (
                    <React.Fragment key={idx}>
                      <ChevronRight
                        size={14}
                        className="text-gray flex-shrink-0"
                      />
                      <span className="text-gray-600">{breadcrumb.label}</span>
                    </React.Fragment>
                  ))}
                  <ChevronRight
                    size={14}
                    className="text-gray-400 flex-shrink-0"
                  />
                </>
              )}
              <span className="text-gray flex-shrink-0">{product.name}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Page layout */}
      <div className="bg-white">
        <div className="container mx-auto px-4 py-12 pt-0">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            {/* LEFT COLUMN */}
            <div className="order-1 lg:order-1 lg:col-span-7">
              {/* Featured Image / Gallery */}
              <div className="bg-[#F9F9F9] rounded-xl overflow-hidden border border-gray-100">
                <div className="w-full h-[340px] md:h-[520px] flex items-center justify-center p-6 cursor-zoom-in">
                  {mainImage.startsWith("video:") ? (
                    <VideoPlayer
                      url={mainImage.replace("video:", "")}
                      title={product.name}
                    />
                  ) : (
                    <img
                      src={mainImage}
                      alt={product.name}
                      loading="eager"
                      decoding="async"
                      className="max-w-full max-h-full object-contain mix-blend-multiply"
                      onClick={() => setIsGalleryOpen(true)}
                    />
                  )}
                </div>

                {/* {gallery.length > 1 && (
                  <div className="flex gap-3 overflow-x-auto p-4 border-t border-gray-200 bg-white no-scrollbar">
                    {gallery.map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => setMainImage(item)}
                        className={`w-20 h-20 rounded border-2 overflow-hidden flex-shrink-0 transition-all ${
                          mainImage === item
                            ? "border-belims-blue"
                            : "border-transparent opacity-70 hover:opacity-100"
                        }`}
                        aria-label={`Go to ${item.startsWith("video:") ? "video" : "image"} ${idx + 1}`}
                      >
                        {item.startsWith("video:") ? (
                          <div className="w-full h-full bg-black flex items-center justify-center text-white text-xs font-bold">
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
                )} */}
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="order-2 lg:order-2 lg:col-span-5 lg:row-span-2 lg:self-start lg:sticky lg:top-24 lg:h-fit">
              <div>
                {/* ProductSummary */}
                <div className="bg-white">
                  <div className="pb-0">
                    {dealBadgeLabel && (
                      <span
                        className={[
                          "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold uppercase mb-4",
                          badgeToneClass,
                        ].join(" ")}
                      >
                        {dealBadgeLabel}
                      </span>
                    )}

                    <h1 className="text-3xl font-bold text-grey font-heading mb-1">
                      {product.name}
                    </h1>
                    <div className="text-base text-grey-medium mb-3">
                      {/* {product.category || "N/A"} |  */}SKU:{" "}
                      {product.sku || "N/A"}
                    </div>

                    {product.features && product.features.length > 0 && (
                      <div className="mt-4">
                        <h3 className="font-semibold text-base text-gray-900 font-heading mb-2">
                          Key Features
                        </h3>
                        <ul className="space-y-1">
                          {product.features.map((feature, idx) => (
                            <li
                              key={idx}
                              className="text-[12px] text-gray-600 flex items-center gap-2"
                            >
                              <Target
                                size={8}
                                className="text-green-600 flex-shrink-0 mt-0.5"
                              />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* BuyBoxCard */}
                  <div
                    ref={buyBoxRef}
                    className="mt-6 rounded-lg border-gray-200 bg-white p-0 shadow-sm"
                  >
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
                        <StockBar
                          current={product.stock}
                          max={product.maxStock}
                        />
                      </div>

                      {product.isBundle &&
                        !(
                          isTradeSpecial &&
                          !isTradeApproved &&
                          !showTradeDeal
                        ) && (
                          <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded ml-4 flex-shrink-0">
                            Bundle Savings
                          </span>
                        )}
                    </div>

                    {/* Qty + CTAs */}
                    <div className="space-y-3 mt-4 mb-4">
                      <div className="flex gap-4">
                        <div className="flex items-center border border-gray-300 rounded-sm bg-white h-11">
                          <button
                            onClick={() => setQty(Math.max(1, qty - 1))}
                            className="px-3 hover:bg-gray-100 text-gray-600 h-full rounded-sm"
                          >
                            <Minus size={15} />
                          </button>
                          <div className="w-7 text-center font-semibold text-sm">
                            {qty}
                          </div>
                          <button
                            onClick={() =>
                              setQty(Math.min(product.stock, qty + 1))
                            }
                            className="px-3 hover:bg-gray-100 text-gray-600 h-full rounded"
                          >
                            <Plus size={15} />
                          </button>
                        </div>

                        <div className="flex flex-1">
                          <button
                            onClick={handleAddToCart}
                            disabled={product.stock === 0}
                            className="group relative h-11 w-full overflow-hidden rounded-pill bg-grey-light text-grey transition-colors disabled:opacity-50"
                          >
                            <span className="absolute inset-0 origin-left scale-x-0 bg-grey transition-transform duration-300 ease-out group-hover:scale-x-100" />
                            <span className="relative z-10 font-heading font-bold transition-colors group-hover:text-white">
                              {product.stock > 0
                                ? "Add to cart"
                                : "Out of Stock"}
                            </span>
                          </button>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleBuyNowAction}
                        disabled={product.stock === 0}
                        className="group relative h-11 w-full overflow-hidden rounded-pill bg-grey text-white transition-colors disabled:opacity-50"
                      >
                        <span className="absolute inset-0 origin-left scale-x-0 bg-red-muted transition-transform duration-300 ease-out group-hover:scale-x-100" />
                        <span className="relative z-10 font-heading font-bold transition-colors">
                          Buy Now
                        </span>
                      </button>
                    </div>

                    {/* Trade Price Block (unchanged behavior) */}
                    {pricingInfo.hasTradePrice && isTradeSpecial && (
                      <div className="mt-6 bg-blue-50 border border-blue-200 rounded p-5">
                        {isTradeApproved ? (
                          <>
                            <div className="flex items-center justify-between gap-3 mb-3">
                              <h3 className="text-sm font-bold text-gray-700">
                                Trade price
                              </h3>
                              <span className="bg-green-100 border uppercase border-green-500 px-5 py-1 text-xs font-extrabold text-green-700 rounded-full tabular-nums">
                                Applied
                              </span>
                            </div>

                            <div className="grid grid-cols-3 gap-3 text-center rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                              <div className="flex flex-col items-center justify-center">
                                <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                                  Retail
                                </div>
                                <div className="mt-1 text-base font-bold text-gray-900 tabular-nums">
                                  {formatCurrency(pricingInfo.retailPrice)}
                                </div>
                              </div>
                              <div className="relative flex flex-col items-center justify-center rounded bg-belims-blue p-3">
                                <div className="text-[10px] font-bold text-white uppercase tracking-wide">
                                  Trade
                                </div>
                                <div className="mt-1 text-base font-extrabold text-white tabular-nums">
                                  {formatCurrency(pricingInfo.tradePrice)}
                                </div>
                              </div>
                              <div className="flex flex-col items-center justify-center">
                                <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                                  Discount
                                </div>
                                <div className="mt-1 inline-flex items-center gap-1 rounded bg-green-100 border border-green-500 px-5 py-1 text-sm font-extrabold text-green-700 tabular-nums">
                                  {formatCurrency(pricingInfo.savings)}
                                </div>
                              </div>
                            </div>

                            <div className="mt-4 text-xs text-gray-600 text-center">
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
                                    <div className="text-sm font-bold text-gray-900 mb-1">
                                      Trade deal details
                                    </div>
                                    <div className="text-xs text-gray-600 mb-3">
                                      Available to contractors with a Belims
                                      trade account.
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => setShowTradeDeal(false)}
                                    className="text-[11px] font-bold uppercase tracking-wide text-gray-600 bg-white px-2 py-1 rounded border border-gray-300 hover:border-gray-400 transition-colors"
                                  >
                                    VIEW RETAIL PRICE
                                  </button>
                                </div>

                                <div className="grid grid-cols-3 gap-3 text-center rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                                  <div className="flex flex-col items-center justify-center">
                                    <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                                      Retail
                                    </div>
                                    <div className="mt-1 text-base font-bold text-gray-900 tabular-nums">
                                      {formatCurrency(pricingInfo.retailPrice)}
                                    </div>
                                  </div>
                                  <div className="relative flex flex-col items-center justify-center rounded-lg bg-orange-100 p-2">
                                    <div className="text-[10px] font-bold text-orange-700 uppercase tracking-wide">
                                      Trade
                                    </div>
                                    <div className="mt-1 text-base font-extrabold text-orange-700 tabular-nums">
                                      {formatCurrency(pricingInfo.tradePrice)}
                                    </div>

                                    <div className="mt-2 inline-flex items-center rounded-full bg-belims-accent px-4 py-0.5 text-[10px] font-semibold text-white">
                                      Trade discount
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-center justify-center">
                                    <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                                      Save
                                    </div>
                                    <div className="mt-1 inline-flex items-center gap-1 rounded bg-green-100 border border-green-500 px-5 py-1 text-sm font-extrabold text-green-700 tabular-nums">
                                      {formatCurrency(pricingInfo.savings)}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex flex-col sm:flex-row sm:justify-center sm:items-center gap-4 mt-2">
                                  <a
                                    href="/trade-accounts"
                                    className="mt-3 text-center text-xs text-gray-500 underline hover:text-gray-700"
                                  >
                                    Learn about the Belims trade accounts
                                  </a>
                                  <a
                                    href="/trade-accounts"
                                    className="inline mt-3 text-center text-xs text-gray-500 underline hover:text-gray-700"
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

                <FulfillmentBlock
                  productStock={product.stock}
                  fulfillmentType={fulfillmentType}
                  onSelectFulfillment={(value) => {
                    setFulfillmentType(value);
                    if (value) {
                      localStorage.setItem("fulfillmentType", value);
                      if (value === "pickup") {
                        localStorage.setItem("pickupStoreSelected", "true");
                        hydratePickupDistances();
                      }
                    } else {
                      localStorage.removeItem("fulfillmentType");
                      localStorage.removeItem("pickupStoreSelected");
                    }
                    window.dispatchEvent(
                      new Event("belims:fulfillment-changed"),
                    );
                  }}
                  onClearSelection={() => setFulfillmentType(null)}
                  onSetDeliveryLocation={handleOpenDeliveryLocation}
                  hasDeliveryLocation={hasDeliveryLocation}
                  deliveryAddress={deliveryAddress}
                  pickupStore={selectedStore}
                  pickupSchedule={pickupSchedule}
                  earliestDeliveryEta={earliestDeliveryEta}
                  deliveryRates={deliveryRates}
                  loadingDeliveryRates={loadingDeliveryRates}
                  deliveryRatesError={deliveryRatesError}
                  onSchedulePickup={() => setIsLocatorOpen(true)}
                  onViewPickupDetails={handleOpenPickupDetails}
                  onResetPickupStore={handleResetPickupStore}
                  onEnableDefaultStore={handleEnableDefaultStore}
                  selectedDeliveryOptionId={selectedDeliveryOptionId}
                  onSelectDeliveryOption={(id) => {
                    setSelectedDeliveryOptionId(id);
                    sessionStorage.setItem("selectedDeliveryOptionId", id);
                  }}
                  onOpenDeliveryOptions={() => setIsDeliveryOptionsOpen(true)}
                  classifyRate={classifyRate}
                  formatEta={formatEta}
                />

                {/* Perfect Match With - Slider in Right Column */}
                {(() => {
                  const mainCategory =
                    product.breadcrumbs?.find((b) => b.label !== "Shop")
                      ?.label || product.category;

                  let recommendedProducts: Product[] = [];

                  if (
                    product.cross_sell_ids &&
                    product.cross_sell_ids.length > 0
                  ) {
                    const crossSellIds = product.cross_sell_ids;
                    recommendedProducts = allProducts
                      .filter((p) => crossSellIds.includes(p.id))
                      .slice(0, 10);
                  }

                  if (recommendedProducts.length < 10) {
                    const mainCategoryProducts = allProducts
                      .filter((p) => {
                        if (p.id === product.id) return false;
                        if (recommendedProducts.some((rp) => rp.id === p.id))
                          return false;
                        return (p.breadcrumbs || []).some(
                          (b) => b.label === mainCategory,
                        );
                      })
                      .slice(0, 10 - recommendedProducts.length);

                    recommendedProducts = [
                      ...recommendedProducts,
                      ...mainCategoryProducts,
                    ];
                  }

                  if (recommendedProducts.length === 0) return null;

                  const slidesPerView = Math.max(
                    1,
                    Math.floor(
                      frequentlyBoughtRailWidth / frequentlyBoughtStepWidth,
                    ),
                  );
                  const maxIndex = Math.max(
                    0,
                    recommendedProducts.length - slidesPerView,
                  );
                  const indicatorPct =
                    maxIndex === 0
                      ? 100
                      : Math.min(100, (frequentlyBoughtIndex / maxIndex) * 100);

                  const handleFrequentlyBoughtPrev = () => {
                    const nextIndex =
                      frequentlyBoughtIndex <= 0
                        ? maxIndex
                        : frequentlyBoughtIndex - 1;
                    setFrequentlyBoughtIndex(nextIndex);
                    scrollToFrequentlyBoughtIndex(nextIndex);
                  };

                  const handleFrequentlyBoughtNext = () => {
                    const nextIndex =
                      frequentlyBoughtIndex >= maxIndex
                        ? 0
                        : frequentlyBoughtIndex + 1;
                    setFrequentlyBoughtIndex(nextIndex);
                    scrollToFrequentlyBoughtIndex(nextIndex);
                  };

                  return (
                    <div className="mt-8 pt-6 border-t border-gray-200">
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold text-grey font-heading">
                          Perfect Match With
                        </h3>
                      </div>

                      {/* Slider Container - 100% width */}
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <div
                          ref={frequentlyBoughtRailRef}
                          className="flex gap-3 overflow-x-auto no-scrollbar items-stretch snap-x snap-mandatory scroll-pl-0"
                          aria-roledescription="carousel"
                          onScroll={() => {
                            if (
                              !frequentlyBoughtRailRef.current ||
                              !frequentlyBoughtStepWidth
                            )
                              return;
                            const nextIndex = Math.round(
                              frequentlyBoughtRailRef.current.scrollLeft /
                                frequentlyBoughtStepWidth,
                            );
                            setFrequentlyBoughtIndex(
                              Math.min(maxIndex, Math.max(0, nextIndex)),
                            );
                          }}
                        >
                          {recommendedProducts.map((p) => (
                            <div
                              key={p.id}
                              className="flex-shrink-0 snap-start basis-[calc((100%-1.5rem)/3)] min-w-0"
                              data-fbw-slider-item
                            >
                              <ProductCard
                                product={p}
                                addToCart={addToCart}
                                className="h-full"
                                customizations={
                                  PRODUCT_CARD_PRESETS.perfectMatchCard
                                }
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* DETAILS COLUMN (below buy box on mobile, below image on desktop) */}
            <div className="order-3 lg:order-3 lg:col-span-7">
              {/* Product Description */}
              <div className="mt-10 lg:mt-0">
                <h3 className="text-xl font-bold text-grey mb-3 border-b border-grey pb-3">
                  Product Description
                </h3>
                <div className="prose prose-sm max-w-none text-grey-medium text-base [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-grey [&_h3]:mt-4 [&_h3]:mb-2 [&_h4]:text-sm [&_h4]:font-semibold [&_h4]:text-grey [&_h4]:mt-3 [&_h4]:mb-2 [&_strong]:font-bold [&_strong]:text-grey [&_b]:font-bold [&_b]:text-grey [&_em]:italic [&_i]:italic [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ul]:mb-3 [&_ul]:mt-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1 [&_ol]:mb-3 [&_ol]:mt-2 [&_li]:text-grey [&_li]:leading-relaxed [&_p]:mb-2 [&_p]:leading-relaxed [&_br]:content-[''] [&_table]:w-full [&_table]:border-collapse [&_table]:mb-3 [&_th]:border [&_th]:border-grey [&_th]:bg-grey [&_th]:p-2 [&_th]:text-left [&_th]:font-semibold [&_td]:border [&_td]:border-grey [&_td]:p-2">
                  {product.description ? (
                    <div
                      dangerouslySetInnerHTML={{ __html: product.description }}
                    />
                  ) : (
                    <p className="text-grey-medium italic">
                      No description available.
                    </p>
                  )}
                </div>
              </div>

              {/* ProductAccordions */}
              <div className="mt-10">
                <ProductAccordions
                  ecommercePolicies={ecommercePolicies}
                  expandedPolicy={expandedPolicy}
                  setExpandedPolicy={setExpandedPolicy}
                />
                <SocialShareExpertBlock
                  productName={product.name}
                  productUrl={shareUrl}
                  expertName={expertContact?.expert_name}
                  expertTitle={expertContact?.expert_title}
                  expertImageUrl={
                    expertContact?.expert_avatar?.url ||
                    expertContact?.expert_avatar_url
                  }
                  videoChatUrl={expertContact?.expert_video_chat_url}
                  chatUrl={expertContact?.expert_chat_url}
                  email={expertContact?.expert_email}
                  phone={expertContact?.expert_phone}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Sticky Bottom CTA (Athens-like: only appears when BuyBox actions are out of view) */}
      <div
        data-sticky-cart-bar
        className={`fixed left-0 right-0 bottom-0 z-[260] bg-white border-t border-gray-200 px-4 py-3 transition-transform duration-300 ${
          showBottomCta ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="container mx-auto flex items-center justify-between gap-4 px-0">
          {/* Product info */}
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <img
              src={product.image}
              alt={product.name}
              className="h-14 w-14 flex-shrink-0 rounded bg-gray-50 object-contain"
              loading="lazy"
              decoding="async"
            />
            <div className="flex-1 min-w-0">
              <div className="truncate font-heading text-base font-bold text-grey">
                {product.name}
              </div>
              <div className="text-base font-bold text-grey">
                {formatCurrency(
                  product.deals_resolved?.consumer?.price ?? product.price,
                )}
              </div>
            </div>
          </div>

          {/* CTAs */}
          <div className="flex w-[150px] flex-shrink-0 flex-col gap-2 md:w-auto md:flex-row md:items-center">
            <button
              onClick={handleAddToCart}
              disabled={product.stock === 0}
              className="group relative h-11 w-full overflow-hidden rounded-pill bg-grey-light text-grey transition-colors disabled:opacity-50 md:w-[140px]"
            >
              <span className="absolute inset-0 origin-left scale-x-0 bg-grey transition-transform duration-300 ease-out group-hover:scale-x-100" />
              <span className="relative z-10 font-heading font-bold transition-colors group-hover:text-white">
                {product.stock > 0 ? "Add to cart" : "Out of Stock"}
              </span>
            </button>

            <button
              type="button"
              onClick={handleBuyNowAction}
              disabled={product.stock === 0}
              className="group relative hidden h-11 w-full overflow-hidden rounded-pill bg-grey text-white transition-colors disabled:opacity-50 md:block md:w-[140px]"
            >
              <span className="absolute inset-0 origin-left scale-x-0 bg-red-muted transition-transform duration-300 ease-out group-hover:scale-x-100" />
              <span className="relative z-10 font-heading font-bold transition-colors">
                Buy Now
              </span>
            </button>
          </div>
        </div>
      </div>

      {isDeliveryOptionsOpen && (
        <div className="fixed inset-0 z-[400] overflow-hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setIsDeliveryOptionsOpen(false)}
          ></div>
          <div
            className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-belims-blue text-white p-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Available options</h2>
              <button
                onClick={() => setIsDeliveryOptionsOpen(false)}
                className="p-1 hover:bg-white/10 rounded transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {loadingDeliveryRates ? (
                <div className="flex items-center justify-center gap-2 py-6 text-gray-500">
                  <span className="text-xs">Finding delivery options...</span>
                </div>
              ) : deliveryRatesError ? (
                <div className="rounded border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  <p>{deliveryRatesError}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {deliveryRates.map((rate, idx) => {
                    const tier = classifyRate(rate, deliveryRates);
                    const isSelected =
                      selectedDeliveryOptionId === `rate-${idx}`;
                    const isFaster = tier === "Express";

                    return (
                      <DeliveryRateOption
                        key={`rate-${idx}`}
                        option={{
                          id: `rate-${idx}`,
                          serviceName: rate.service_name,
                          eta: formatEta(rate.expected_delivery_date),
                          price: rate.total_price,
                          isFree: rate.total_price === 0,
                          badge: isFaster ? "Faster" : undefined,
                          isFaster,
                        }}
                        isSelected={isSelected}
                        className="z-[401]"
                        onSelect={(id) => {
                          setSelectedDeliveryOptionId(id);
                          sessionStorage.setItem(
                            "selectedDeliveryOptionId",
                            id,
                          );
                          setIsDeliveryOptionsOpen(false);
                        }}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {product.bundleCandidates && product.bundleCandidates.length > 0 && (
        <>
          <section className="border-y border-gray-200 bg-white">
            <style>
              {`@keyframes bundle-marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }`}
            </style>
            <div className="overflow-hidden">
              <div
                className="flex items-center whitespace-nowrap py-3 text-[13px] font-semibold text-gray-900"
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
                    <span className="text-gray-300">|</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="py-6 bg-[#F5F691] mb-0">
            <div className="container mx-auto px-4">
              <BundledProducts
                product={product}
                allProducts={allProducts}
                addToCart={addToCart}
              />
            </div>
          </section>
        </>
      )}

      {/* How About These Section */}
      {allProducts.length > 0 && (
        <section className="py-12 bg-white border-t border-gray-200 mb-0">
          <div className="container mx-auto px-4">
            <h3 className="text-2xl font-bold text-gray-900 font-heading mb-8">
              How about these
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {allProducts
                .filter(
                  (p) => p.id !== product.id && p.category === product.category,
                )
                .slice(0, 4)
                .map((p) => (
                  <div key={p.id}>
                    <ProductCard
                      product={p}
                      addToCart={addToCart}
                      customizations={PRODUCT_CARD_PRESETS.compactCard}
                    />
                  </div>
                ))}
            </div>
          </div>
        </section>
      )}

      {/* Recently Viewed Section */}
      <RecentlyViewed
        addToCart={addToCart}
        onBuyNow={onBuyNow}
        onProductClick={(p) => navigate(`/product/${p.id}`)}
        onCompare={onCompare}
        currentProductId={product.id}
        isAuthenticated={isAuthenticated}
        isTradeApproved={isTradeApproved}
      />
    </div>
  );
};
