import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { CartItem, Product, ShippingAddress, Store } from "../types";
import { CURRENCY_SYMBOL, FREE_SHIPPING_THRESHOLD, STORES } from "../constants";
import { buyButtonClass, inputClass, labelClass, pageTitleClass, primaryButtonClass } from "./ui/classes";
import { CouponField, SummaryHeading, SummaryTotals, TrustTiles, summaryCardClass } from "./OrderSummaryParts";
import { formatCurrency } from "../utils/price";
import {
  getShippingRates,
  getFallbackShipping,
} from "../services/bobGoService";
import { readStoredAddress, mapNominatimAddress, normalizeProvince } from "../services/shippingAddress";
import {
  createWooOrder,
  initializePayment,
  verifyPayment,
} from "../services/paymentService";
import { registerUser, getCurrentUser, loginUser, UserData, getAuthToken } from "../services/authService";
import { fetchEcommercePolicies, validateCoupon } from "../services/wooCommerceService";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
  CreditCard,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Phone,
  Store as StoreIcon,
  Truck,
  User,
  Zap,
} from "lucide-react";
import { Pill } from "./Pill";

interface CheckoutProps {
  cartItems: CartItem[];
  onBack: () => void;
  onClearCart: () => void;
  onSchedulePickup?: () => void;
  initialOrderNote?: string;
  initialCouponCode?: string;
  couponDetails?: { code: string; discount_type: string; amount: string } | null;
}

type CheckoutStep = "details" | "shipping" | "payment" | "success";
type DeliveryType = "delivery" | "pickup";
type ShippingTier = "Express" | "Standard" | "Economy";

interface CustomerDetails {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  addressType: "home" | "work";
  address: string;
  address2: string;
  suburb: string;
  city: string;
  province: string;
  postalCode: string;
}

interface ShippingRate {
  service_name: string;
  service_code?: string;
  total_price: number;
  expected_delivery_date?: string;
  tier?: ShippingTier;
}

interface PickupSchedule {
  date: string;
  time: string;
}

// Helper Functions
function classifyRate(
  rate: ShippingRate,
  allRates: ShippingRate[],
): ShippingTier {
  if (rate.tier) return rate.tier;

  const prices = allRates.map((r) => r.total_price).sort((a, b) => a - b);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  if (rate.total_price === minPrice && minPrice < maxPrice) {
    return "Economy";
  } else if (rate.total_price === maxPrice) {
    return "Express";
  }
  return "Standard";
}

function selectFastestRate(rates: ShippingRate[]): ShippingRate | null {
  if (!rates.length) return null;
  return rates.reduce((fastest, current) => {
    const fastestTier = fastest.tier || classifyRate(fastest, rates);
    const currentTier = current.tier || classifyRate(current, rates);

    const tierOrder: Record<ShippingTier, number> = {
      Express: 1,
      Standard: 2,
      Economy: 3,
    };

    return tierOrder[currentTier] < tierOrder[fastestTier] ? current : fastest;
  });
}

function formatEta(dateStr?: string): string {
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
}
const dayKeys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

const parseTimeToMinutes = (value?: string) => {
  if (!value) return null;
  const [hours, minutes] = value.split(":").map((part) => Number(part));
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
};

const formatTimeLabel = (value?: string) => {
  if (!value) return "";
  const [hoursValue, minutesValue] = value.split(":").map(Number);
  if (Number.isNaN(hoursValue) || Number.isNaN(minutesValue)) return value;
  const suffix = hoursValue >= 12 ? "pm" : "am";
  const normalizedHours = hoursValue % 12 || 12;
  if (minutesValue === 0) {
    return `${normalizedHours}${suffix}`;
  }
  return `${normalizedHours}:${String(minutesValue).padStart(2, "0")}${suffix}`;
};

const getNextOpenDay = (
  hours: NonNullable<Store["hours"]>,
  startIndex: number,
) => {
  for (let offset = 1; offset <= 7; offset += 1) {
    const index = (startIndex + offset) % 7;
    const dayKey = dayKeys[index];
    const dayHours = hours[dayKey];
    if (!dayHours || dayHours.closed) continue;
    if (!dayHours.open || !dayHours.close) continue;
    return { index, dayHours };
  }
  return null;
};

const getPickupStatus = (store?: Store | null) => {
  if (!store?.hours) return null;
  const now = new Date();
  const dayKey = dayKeys[now.getDay()];
  const dayHours = store.hours[dayKey];

  if (!dayHours || dayHours.closed) {
    const nextOpen = getNextOpenDay(store.hours, now.getDay());
    if (nextOpen) {
      const isTomorrow = nextOpen.index === (now.getDay() + 1) % 7;
      const nextLabel = isTomorrow
        ? "opens tomorrow"
        : `opens ${dayLabels[nextOpen.index]}`;
      return {
        label: "Closed",
        detail: `${nextLabel} ${formatTimeLabel(nextOpen.dayHours.open)}`,
        isOpen: false,
      };
    }
    return { label: "Closed", isOpen: false };
  }

  const openMinutes = parseTimeToMinutes(dayHours.open);
  const closeMinutes = parseTimeToMinutes(dayHours.close);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  if (openMinutes === null || closeMinutes === null) {
    return { label: "Closed", isOpen: false };
  }

  const breakStartMinutes = parseTimeToMinutes(dayHours.breakStart);
  const breakEndMinutes = parseTimeToMinutes(dayHours.breakEnd);

  if (
    breakStartMinutes !== null &&
    breakEndMinutes !== null &&
    nowMinutes >= breakStartMinutes &&
    nowMinutes < breakEndMinutes
  ) {
    return {
      label: "Closed",
      detail: `reopens ${formatTimeLabel(dayHours.breakEnd)}`,
      isOpen: false,
    };
  }

  if (nowMinutes < openMinutes) {
    return {
      label: "Closed",
      detail: `opens ${formatTimeLabel(dayHours.open)}`,
      isOpen: false,
    };
  }

  if (nowMinutes >= closeMinutes) {
    const nextOpen = getNextOpenDay(store.hours, now.getDay());
    if (nextOpen) {
      const isTomorrow = nextOpen.index === (now.getDay() + 1) % 7;
      const nextLabel = isTomorrow
        ? "opens tomorrow"
        : `opens ${dayLabels[nextOpen.index]}`;
      return {
        label: "Closed",
        detail: `${nextLabel} ${formatTimeLabel(nextOpen.dayHours.open)}`,
        isOpen: false,
      };
    }
    return { label: "Closed", isOpen: false };
  }

  if (nowMinutes >= closeMinutes - 60) {
    return {
      label: "Open",
      detail: `closing soon - closing at ${formatTimeLabel(dayHours.close)}`,
      isOpen: true,
    };
  }

  return {
    label: "Open",
    detail: `closing at ${formatTimeLabel(dayHours.close)}`,
    isOpen: true,
  };
};

const formatScheduledPickup = (dateValue: string, timeValue: string) => {
  const parsed = new Date(`${dateValue}T${timeValue}`);
  if (Number.isNaN(parsed.getTime())) {
    return `${dateValue} at ${timeValue}`;
  }
  const dayLabel = parsed.toLocaleDateString("en-ZA", { weekday: "long" });
  const dateLabel = parsed.toLocaleDateString("en-ZA", {
    day: "2-digit",
    month: "short",
  });
  return `${dayLabel} ${dateLabel} at ${timeValue}`;
};

const getStoredPickupDistance = (storeId?: string) => {
  if (!storeId || typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("selectedPickupStoreDistance");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { id?: string; distance?: number };
    if (parsed?.id === storeId && typeof parsed.distance === "number") {
      return parsed.distance;
    }
  } catch {
    return null;
  }
  return null;
};

export const Checkout: React.FC<CheckoutProps> = ({
  cartItems,
  onBack,
  onClearCart,
  onSchedulePickup,
  initialOrderNote = "",
  initialCouponCode = "",
  couponDetails = null,
}) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnOrderId = searchParams.get("order_id");
  const returnOrderKey = searchParams.get("order_key") || "";
  const returnSource = searchParams.get("return_source");
  const isReturnFlow = Boolean(returnOrderId);

  const [step, setStep] = useState<CheckoutStep>(
    returnOrderId ? "payment" : "details",
  );
  const [loading, setLoading] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState<string | null>(
    null,
  );
  const [deliveryType, setDeliveryType] = useState<DeliveryType>("delivery");
  const [promoCode, setPromoCode] = useState(initialCouponCode);
  const [validatedCoupon, setValidatedCoupon] = useState<{ code: string; discount_type: string; amount: string } | null>(couponDetails ?? null);
  const [couponError, setCouponError] = useState<string | null>(null);

  useEffect(() => {
    if (couponDetails) {
      setValidatedCoupon(couponDetails);
      setPromoCode(couponDetails.code);
    }
  }, [couponDetails]);
  const [orderNote, setOrderNote] = useState(initialOrderNote);
  const [pickupStore, setPickupStore] = useState<Store | null>(null);
  const [pickupSchedule, setPickupSchedule] = useState<PickupSchedule | null>(
    null,
  );

  // Account Creation State
  const [createAccount, setCreateAccount] = useState(false);
  const [accountUsername, setAccountUsername] = useState("");
  const [accountPassword, setAccountPassword] = useState("");

  // Checkout login state
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);
  const [isInitializingCheckout, setIsInitializingCheckout] = useState(
    () => (typeof window !== "undefined" ? getAuthToken() !== null : false),
  );
  const [loginPanelOpen, setLoginPanelOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Form State
  const [customer, setCustomer] = useState<CustomerDetails>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    addressType: "home",
    address: "",
    address2: "",
    suburb: "",
    city: "",
    province: "",
    postalCode: "",
  });

  // Shipping State
  const [shippingRates, setShippingRates] = useState<ShippingRate[]>([]);
  const [selectedShipping, setSelectedShipping] = useState<ShippingRate | null>(
    null,
  );
  const [savedLocationRates, setSavedLocationRates] = useState<ShippingRate[]>(
    [],
  );
  const [loadingSavedRates, setLoadingSavedRates] = useState(false);
  const [orderSummaryOpen, setOrderSummaryOpen] = useState(false);

  // Single-step checkout state
  const [editingAddress, setEditingAddress] = useState(true);
  const [addressAutoPopulated, setAddressAutoPopulated] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<Array<{ label: string; address: ShippingAddress }>>([]);

  // Current location detection for shipping address
  const [locatingAddress, setLocatingAddress] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Bob Go only quotes when the parcel contents are known
  const shippingItems = cartItems.map((item) => ({ id: item.id, quantity: item.quantity }));

  // Totals
  const subtotal = cartItems.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0,
  );
  const shippingCost = selectedShipping
    ? subtotal >= FREE_SHIPPING_THRESHOLD
      ? 0
      : selectedShipping.total_price
    : 0;

  const couponDiscount = useMemo(() => {
    if (!validatedCoupon) return 0;
    const amount = parseFloat(validatedCoupon.amount);
    if (isNaN(amount) || amount <= 0) return 0;
    if (validatedCoupon.discount_type === "percent") {
      return subtotal * (amount / 100);
    }
    return amount;
  }, [validatedCoupon, subtotal]);

  const total = Math.max(0, subtotal + shippingCost - couponDiscount);
  const pickupStatus = getPickupStatus(pickupStore);
  const scheduledLabel = pickupSchedule
    ? formatScheduledPickup(pickupSchedule.date, pickupSchedule.time)
    : null;
  const pickupTone = pickupStatus?.isOpen
    ? "text-success"
    : pickupStatus?.isOpen === false
      ? "text-error"
      : "text-text-secondary";
  const pickupDistance =
    pickupStore?.distance ?? getStoredPickupDistance(pickupStore?.id);

  // Auto-populate address from logged-in user profile or saved delivery location and fetch shipping rates
  useEffect(() => {
    const initializeFromSavedLocation = async () => {
      let addressToUse: ShippingAddress | null = null;

      // Priority 1: Autofill from logged-in user profile
      try {
        const user = await getCurrentUser();
        if (user) {
        setIsUserLoggedIn(true);
        const billing = (user.billing || {}) as UserData['billing'];
        const shipping = (user.shipping || {}) as UserData['shipping'];
          const source = billing.address_1 ? billing : shipping;

          // Always populate personal details when logged in
          setCustomer((prev) => ({
            ...prev,
            firstName: user.first_name || prev.firstName,
            lastName: user.last_name || prev.lastName,
            email: user.email || prev.email,
            phone: user.phone || prev.phone,
          }));

          if (source.address_1 || source.city || source.postcode) {
          addressToUse = {
            street: source.address_1 || "",
            suburb: source.suburb || "",
            city: source.city || "",
            province: source.state || "",
            postalCode: source.postcode || "",
            country: (source.country || "ZA") as ShippingAddress['country'],
          };

            setCustomer((prev) => ({
              ...prev,
              address: addressToUse!.street,
              suburb: addressToUse!.suburb || prev.suburb,
              city: addressToUse!.city,
              province: addressToUse!.province,
              postalCode: addressToUse!.postalCode,
            }));
            setAddressAutoPopulated(true);
            setEditingAddress(false);

            // Build saved address list for the selector
            const options: Array<{ label: string; address: ShippingAddress }> = [];
            const toAddr = (src: typeof billing, label: string): ShippingAddress | null => {
              if (!src?.address_1 && !src?.city) return null;
              return { street: src.address_1 || "", suburb: src.suburb || "", city: src.city || "", province: src.state || "", postalCode: src.postcode || "", country: "ZA" };
            };
            const ba = toAddr(billing, "Billing");
            const sa = toAddr(shipping, "Shipping");
            if (ba) options.push({ label: "Billing", address: ba });
            if (sa && (sa.street !== (ba?.street ?? "") || sa.city !== (ba?.city ?? ""))) options.push({ label: "Shipping", address: sa });
            setSavedAddresses(options);
            // Full profile available — skip details step
            setStep("shipping");
          }
        }
      } catch (error) {
        console.error("Failed to fetch user profile for checkout autofill:", error);
      }

      // Fetch shipping rates for the resolved address
      if (addressToUse && addressToUse.city && addressToUse.province) {
        setLoadingSavedRates(true);
        try {
          const rates = await getShippingRates({
            destination_address: {
              street: addressToUse.street || "",
              city: addressToUse.city,
              province: addressToUse.province,
              postal_code: addressToUse.postalCode || "",
              country: addressToUse.country || "South Africa",
            },
            items: shippingItems,
          });

          let finalRates = rates;
          if (!finalRates || finalRates.length === 0) {
            finalRates = getFallbackShipping();
          }

          const classifiedRates = finalRates.map((rate: any) => ({
            ...rate,
            tier: classifyRate(rate, finalRates),
          }));

          setSavedLocationRates(classifiedRates);
          const fastest = selectFastestRate(classifiedRates);
          if (fastest) {
            setSelectedShipping(fastest);
          }
        } catch (error) {
          console.error("Failed to fetch saved location rates:", error);
          const fallbackRates = getFallbackShipping().map((rate: any) => ({
            ...rate,
            tier: classifyRate(rate, getFallbackShipping()),
          }));
          setSavedLocationRates(fallbackRates);
          const fastest = selectFastestRate(fallbackRates);
          if (fastest) {
            setSelectedShipping(fastest);
          }
        } finally {
          setLoadingSavedRates(false);
        }
      }
    };

    initializeFromSavedLocation().finally(() =>
      setIsInitializingCheckout(false),
    );
  }, []);


  useEffect(() => {
    if (!pickupStore || pickupStore.hours) return;
    let isActive = true;

    const hydrateStoreHours = async () => {
      try {
        const data = await fetchEcommercePolicies();
        const rawStores = Array.isArray(data?.store_locations)
          ? data.store_locations
          : [];
        const normalized = rawStores
          .map((store: any, index: number) => {
            const name = String(store?.name || "").trim();
            const address = String(store?.address || "")
              .replace(/\s*\n\s*/g, ", ")
              .trim();
            if (!name && !address) return null;
            return {
              id: String(store?.id || name || index + 1),
              name: name || `Store ${index + 1}`,
              address: address || "",
              phone: store?.phone ? String(store.phone) : undefined,
              mapUrl: store?.map_url ? String(store.map_url) : undefined,
              latitude: Number.isNaN(Number(store?.latitude))
                ? undefined
                : Number(store?.latitude),
              longitude: Number.isNaN(Number(store?.longitude))
                ? undefined
                : Number(store?.longitude),
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
        const matched = normalized.find(
          (store) =>
            store.id === pickupStore.id || store.name === pickupStore.name,
        );
        if (matched?.hours && isActive) {
          const updatedStore = { ...pickupStore, hours: matched.hours };
          setPickupStore(updatedStore);
          localStorage.setItem(
            "selectedPickupStore",
            JSON.stringify(updatedStore),
          );
        }
      } catch (error) {
        console.error("Failed to sync pickup hours:", error);
      }
    };

    hydrateStoreHours();

    return () => {
      isActive = false;
    };
  }, [pickupStore]);

  useEffect(() => {
    if (deliveryType !== "pickup") {
      if (selectedShipping?.service_name === "Pickup") {
        setSelectedShipping(null);
      }
      return;
    }

    setSelectedShipping({
      service_name: "Pickup",
      total_price: 0,
      expected_delivery_date: "",
    });
  }, [deliveryType, selectedShipping?.service_name]);

  useEffect(() => {
    if (deliveryType !== "delivery") return;
    if (!customer.address || !customer.city || !customer.province) return;

    const existingRates =
      savedLocationRates.length > 0 ? savedLocationRates : shippingRates;
    if (existingRates.length > 0) {
      return;
    }

    let isActive = true;
    const fetchRates = async () => {
      setLoadingSavedRates(true);
      try {
        const rates = await getShippingRates({
          destination_address: {
            street: customer.address,
            city: customer.city,
            province: customer.province,
            postal_code: customer.postalCode,
            country: "ZA",
          },
          items: shippingItems,
        });

        let finalRates = rates;
        if (!finalRates || finalRates.length === 0) {
          finalRates = getFallbackShipping();
        }

        const classifiedRates = finalRates.map((rate: any) => ({
          ...rate,
          tier: classifyRate(rate, finalRates),
        }));

        if (!isActive) return;
        setSavedLocationRates(classifiedRates);
        const fastest = selectFastestRate(classifiedRates);
        if (fastest) setSelectedShipping(fastest);
      } catch (error) {
        if (!isActive) return;
        console.error("Failed to fetch delivery rates:", error);
        const fallbackRates = getFallbackShipping().map((rate: any) => ({
          ...rate,
          tier: classifyRate(rate, getFallbackShipping()),
        }));
        setSavedLocationRates(fallbackRates);
        const fastest = selectFastestRate(fallbackRates);
        if (fastest) setSelectedShipping(fastest);
      } finally {
        if (isActive) setLoadingSavedRates(false);
      }
    };

    fetchRates();

    return () => {
      isActive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    deliveryType,
    customer.address,
    customer.city,
    customer.province,
    customer.postalCode,
    savedLocationRates.length,
    shippingRates.length,
  ]);

  useEffect(() => {
    if (!returnOrderId) return;

    let cancelled = false;
    let timeoutId: number | undefined;
    let attempts = 0;
    const maxAttempts = 18; // ~45s — the order is only marked paid once PayFast's ITN arrives
    const delayMs = 2500;

    const verify = async () => {
      attempts += 1;
      try {
        const res = await verifyPayment(returnOrderId, returnOrderKey);

        if (cancelled) return;

        if (res.success) {
          const ts = Math.floor(Date.now() / 1000);
          onClearCart();
          navigate(
            `/order-confirmation?order_id=${encodeURIComponent(returnOrderId)}&order_key=${encodeURIComponent(returnOrderKey)}&payment_status=complete&timestamp=${ts}`,
            { replace: true },
          );
          return;
        }

        if (attempts >= maxAttempts) {
          setLoading(false);
          setVerificationMessage(
            "Payment is still pending. We'll update your order as soon as PayFast confirms it.",
          );
          return;
        }
      } catch (error) {
        if (cancelled) return;

        if (attempts >= maxAttempts) {
          setLoading(false);
          setVerificationMessage(
            "We couldn't confirm your payment yet. Please try again in a few minutes.",
          );
          return;
        }
      }

      timeoutId = window.setTimeout(verify, delayMs);
    };

    setStep("payment");
    setLoading(true);
    setVerificationMessage(null);
    verify();

    return () => {
      cancelled = true;
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [returnOrderId, returnOrderKey, navigate, onClearCart]);

  const handleBack = isReturnFlow ? () => navigate("/") : onBack;
  const paymentProviderLabel = returnSource
    ? returnSource.toUpperCase()
    : "PAYFAST";

  const handleCheckoutLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);
    try {
      const { user } = await loginUser({ email: loginEmail, password: loginPassword });
      setIsUserLoggedIn(true);
      setLoginPanelOpen(false);
      const billing = (user.billing || {}) as UserData["billing"];
      const shipping = (user.shipping || {}) as UserData["shipping"];
      const source = billing?.address_1 ? billing : shipping;
      setCustomer((prev) => ({
        ...prev,
        firstName: user.first_name || prev.firstName,
        lastName: user.last_name || prev.lastName,
        email: user.email || prev.email,
        phone: user.phone || prev.phone,
        ...(source?.address_1
          ? {
              address: source.address_1 || "",
              suburb: source.suburb || "",
              city: source.city || "",
              province: source.state || "",
              postalCode: source.postcode || "",
            }
          : {}),
      }));
      window.dispatchEvent(new Event("user-updated"));
    } catch (err: any) {
      setLoginError(err.message || "Sign in failed. Check your details and try again.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      return;
    }
    setLocatingAddress(true);
    setLocationError(null);

    const applyPosition = async (position: GeolocationPosition) => {
      try {
        const { latitude, longitude } = position.coords;
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
          { headers: { "User-Agent": "Belims-Store" } },
        );
        if (!response.ok) throw new Error("Geocoding failed");
        const data = await response.json();
        const mapped = mapNominatimAddress(data);
        if (!mapped || (!mapped.city && !mapped.province)) {
          setLocationError("Could not detect a full address. Please enter it manually.");
          return;
        }
        setCustomer((prev) => ({
          ...prev,
          address: mapped.street || prev.address,
          city: mapped.city || prev.city,
          province: normalizeProvince(mapped.province) || prev.province,
          postalCode: mapped.postalCode || prev.postalCode,
        }));
        setEditingAddress(true);
      } catch {
        setLocationError("Unable to detect address. Please enter it manually.");
      } finally {
        setLocatingAddress(false);
      }
    };

    // First attempt: low accuracy, accept cached position
    navigator.geolocation.getCurrentPosition(
      applyPosition,
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setLocatingAddress(false);
          setLocationError("Location permission denied. Please enter your address manually.");
          return;
        }
        // POSITION_UNAVAILABLE or TIMEOUT — retry with high accuracy
        navigator.geolocation.getCurrentPosition(
          applyPosition,
          () => {
            setLocatingAddress(false);
            setLocationError("Unable to detect location. Please enter your address manually.");
          },
          { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 },
        );
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  };

  const handleSaveAddress = async () => {
    if (!customer.address || !customer.city || !customer.province || !customer.postalCode) return;
    setAddressAutoPopulated(true);
    setEditingAddress(false);
    setLoadingSavedRates(true);
    try {
      const rates = await getShippingRates({
        destination_address: {
          street: customer.address,
          city: customer.city,
          province: customer.province,
          postal_code: customer.postalCode,
          country: "ZA",
        },
        items: shippingItems,
      });
      let finalRates = (rates && rates.length > 0) ? rates : getFallbackShipping();
      const classifiedRates = finalRates.map((rate: any) => ({
        ...rate,
        tier: classifyRate(rate, finalRates),
      }));
      setSavedLocationRates(classifiedRates);
      const fastest = selectFastestRate(classifiedRates);
      if (fastest) setSelectedShipping(fastest);
    } catch {
      const fb = getFallbackShipping().map((r: any) => ({ ...r, tier: classifyRate(r, getFallbackShipping()) }));
      setSavedLocationRates(fb);
      if (fb.length > 0) setSelectedShipping(fb[0]);
    } finally {
      setLoadingSavedRates(false);
    }
  };

  // STEP 1: Details Submit -> Shipping/Pickup details
  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep("shipping");
  };

  // STEP 2: Shipping Selected
  const handleShippingSelect = (rate: ShippingRate) => {
    setSelectedShipping(rate);
  };

  const handleShippingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShipping) return;
    setStep("payment");
  };

  // STEP 3: Place Order
  const handlePlaceOrder = async () => {
    setLoading(true);
    try {
      // 1. Create Order in Backend
      const order = await createWooOrder({
        customer,
        items: cartItems,
        shipping: selectedShipping
          ? {
              ...selectedShipping,
              method_id: "bobgo_shipping",
            }
          : undefined,
        total,
        frontend_origin: window.location.origin,
        order_note: orderNote.trim() || undefined,
        coupon_lines: validatedCoupon ? [{ code: validatedCoupon.code }] : promoCode.trim() ? [{ code: promoCode.trim() }] : undefined,
      });

      if (!order) throw new Error("Order creation failed");

      // 2. Store account creation data if user opted in
      if (createAccount && accountUsername && accountPassword) {
        const accountData = {
          username: accountUsername,
          password: accountPassword,
          email: customer.email,
          firstName: customer.firstName,
          lastName: customer.lastName,
          phone: customer.phone,
          orderId: order.id,
          shippingAddress: {
            street: customer.address,
            city: customer.city,
            province: customer.province,
            postalCode: customer.postalCode,
            country: "ZA" as const,
          },
        };
        localStorage.setItem(
          "pendingAccountCreation",
          JSON.stringify(accountData),
        );
      }

      // 3. Nothing left to pay (100% coupon): the CMS already completed the order.
      if (order.paid) {
        onClearCart();
        navigate(
          `/order-confirmation?order_id=${encodeURIComponent(order.id)}&order_key=${encodeURIComponent(order.order_key)}&payment_status=complete&timestamp=${Math.floor(Date.now() / 1000)}`,
          { replace: true },
        );
        return;
      }

      // 4. Initialize PayFast Payment - Redirect to PayFast
      const paymentUrl = await initializePayment({
        orderId: order.id,
        orderKey: order.order_key,
        currency: "ZAR",
        customerEmail: customer.email,
        customerName: `${customer.firstName} ${customer.lastName}`,
        customerPhone: customer.phone,
      });

      // Redirect to PayFast payment gateway
      if (paymentUrl) {
        window.location.href = paymentUrl;
      } else {
        throw new Error("Failed to initialize payment");
      }
    } catch (error) {
      console.error("Order processing error:", error);
      alert(error instanceof Error ? error.message : "Order processing failed");
      setLoading(false);
    }
  };

  // RENDER HELPERS
  if (cartItems.length === 0 && step !== "success" && !isReturnFlow) {
    return (
      <div className="p-10 text-center">
        Your cart is empty.{" "}
        <button onClick={handleBack} className="text-belims-blue underline">
          Go Back
        </button>
      </div>
    );
  }

  const activeRates =
    savedLocationRates.length > 0 ? savedLocationRates : shippingRates;
  const fastestRate = selectFastestRate(activeRates);
  const shippingTier =
    selectedShipping?.tier ||
    (selectedShipping && activeRates.length > 0
      ? classifyRate(selectedShipping, activeRates)
      : null);
  const currentStepIndex = step === "details" ? 1 : step === "shipping" ? 2 : 3;
  const currentStepLabel =
    step === "details"
      ? "Personal details"
      : step === "shipping"
        ? "Shipping address"
        : "Review & payment";
  const itemCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const inputWithIconClass = `${inputClass} pl-10`;
  const secondaryButtonClass =
    "inline-flex items-center justify-center gap-1 text-sm text-text-secondary transition-colors hover:text-text";
  const summaryTotal = total;

  const goToDetails = () => setStep("details");
  const goToShipping = () => {
    if (deliveryType === "pickup") {
      setStep("details");
      return;
    }
    setStep("shipping");
  };

  const goToEditAddress = () => {
    setEditingAddress(true);
    setStep("shipping");
  };

  const OrderSummary = ({ mobile = false }: { mobile?: boolean }) => (
    <article className={summaryCardClass}>
      {mobile ? (
        <button
          type="button"
          className="flex w-full items-center justify-between px-4 py-3 md:hidden"
          aria-expanded={orderSummaryOpen}
          aria-controls="order-summary-content"
          onClick={() => setOrderSummaryOpen((prev) => !prev)}
        >
          <div className="flex items-center gap-3">
            <div className="flex">
              {cartItems.slice(0, 3).map((item, index) => (
                <div
                  key={item.id}
                  className={`relative h-8 w-8 shrink-0 overflow-hidden rounded-md border-2 border-white bg-surface-muted ${
                    index > 0 ? "-ml-3" : ""
                  }`}
                  style={{ zIndex: index + 1 }}
                >
                  <img
                    src={item.image || "/placeholder.png"}
                    alt={item.name}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-contain"
                  />
                </div>
              ))}
            </div>
            <div className="flex flex-col items-start">
              <span className="text-base font-medium leading-5 tracking-normal text-text">
                Show order summary
              </span>
              <span className="text-xs font-normal leading-4 tracking-normal text-text-secondary">
                {itemCount} {itemCount === 1 ? "item" : "items"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold leading-6 tracking-normal text-text">
              {formatCurrency(summaryTotal)}
            </span>
            <ChevronDown
              className={`h-5 w-5 text-text-secondary transition-transform duration-200 ${
                orderSummaryOpen ? "rotate-180" : ""
              }`}
            />
          </div>
        </button>
      ) : (
        <SummaryHeading itemCount={itemCount} className="hidden md:flex" />
      )}

      <div
        id={mobile ? "order-summary-content" : undefined}
        className={`${mobile && !orderSummaryOpen ? "hidden" : "block"} md:block`}
      >
        <section className="border-t border-border">
          <ul className="max-h-[280px] space-y-1 overflow-y-auto px-5 py-4 [scrollbar-gutter:stable]">
            {cartItems.map((item) => (
              <li key={item.id} className="flex gap-4 py-2">
                <figure className="relative shrink-0">
                  <span className="absolute -right-2 -top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-text text-xs font-medium text-white">
                    {item.quantity}
                  </span>
                  <div className="h-14 w-14 overflow-hidden rounded-lg border border-border bg-surface-muted">
                    <img
                      src={item.image || "/placeholder.png"}
                      alt={item.name}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-contain object-center p-1"
                    />
                  </div>
                </figure>
                <div className="flex min-w-0 flex-1 flex-col justify-center">
                  <p className="truncate text-base font-semibold leading-5 tracking-normal text-text">
                    {item.name}
                  </p>
                  <p className="mt-0.5 truncate text-xs font-normal leading-4 tracking-normal text-text-secondary">
                    {item.sku || item.category || "Product"}
                  </p>
                </div>
                <data
                  value={item.price * item.quantity}
                  className="flex flex-col justify-center text-base font-medium leading-5 tracking-normal text-text tabular-nums"
                >
                  {formatCurrency(item.price * item.quantity)}
                </data>
              </li>
            ))}
          </ul>
        </section>

        <CouponField
          value={promoCode}
          onChange={setPromoCode}
          appliedCode={validatedCoupon?.code}
          error={couponError}
          onApply={async () => {
            setCouponError(null);
            try {
              setValidatedCoupon(await validateCoupon(promoCode.trim()));
            } catch (err: any) {
              setCouponError(err?.message ?? "Invalid coupon code.");
              setValidatedCoupon(null);
            }
          }}
        />

        {orderNote.trim() ? (
          <section className="border-t border-border px-5 py-4">
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-text-tertiary">
              Order note
            </p>
            <p className="text-sm text-text-secondary">{orderNote.trim()}</p>
          </section>
        ) : null}

        <SummaryTotals
          total={summaryTotal}
          rows={[
            { label: "Subtotal", value: formatCurrency(subtotal) },
            ...(couponDiscount > 0
              ? [{ label: "Discount", value: `-${formatCurrency(couponDiscount)}`, tone: "success" as const }]
              : []),
            {
              label: deliveryType === "pickup" ? "Pickup" : "Shipping",
              value:
                deliveryType === "pickup"
                  ? formatCurrency(0)
                  : selectedShipping
                    ? shippingCost === 0
                      ? "Free"
                      : formatCurrency(shippingCost)
                    : "Calculated at checkout",
            },
          ]}
        />

        <TrustTiles />
      </div>
    </article>
  );

  const ContextSummary = ({
    includeMethod = false,
  }: {
    includeMethod?: boolean;
  }) => (
    <section className="divide-y divide-border rounded-lg border border-border text-sm">
      <div className="flex items-start gap-4 p-4">
        <span className="w-16 shrink-0 pt-0.5 text-text-secondary">Contact</span>
        <span className="min-w-0 flex-1 break-words">
          {customer.email || "No email added"}
        </span>
        <button
          type="button"
          className="shrink-0 text-sm underline underline-offset-2 hover:no-underline"
          onClick={goToDetails}
        >
          Change
        </button>
      </div>
      <div className="flex items-start gap-4 p-4">
        <span className="w-16 shrink-0 pt-0.5 text-text-secondary">
          {deliveryType === "pickup" ? "Pickup" : "Ship to"}
        </span>
        <span className="min-w-0 flex-1 break-words">
          {deliveryType === "pickup"
            ? pickupStore?.name || "Pickup store"
            : `${customer.address}, ${customer.city}, ${customer.province} ${customer.postalCode}`}
        </span>
        <button
          type="button"
          className="shrink-0 text-sm underline underline-offset-2 hover:no-underline"
          onClick={deliveryType === "pickup" ? goToDetails : goToEditAddress}
        >
          Change
        </button>
      </div>
      {includeMethod ? (
        <div className="flex items-start gap-4 p-4">
          <span className="w-16 shrink-0 pt-0.5 text-text-secondary">Method</span>
          <span className="min-w-0 flex-1 break-words">
            {deliveryType === "pickup"
              ? "Pickup"
              : `${selectedShipping?.service_name || "Shipping"} · ${shippingCost === 0 ? "Free" : formatCurrency(shippingCost)}`}
          </span>
          {deliveryType === "delivery" ? (
            <button
              type="button"
              className="shrink-0 text-sm underline underline-offset-2 hover:no-underline"
              onClick={goToShipping}
            >
              Change
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );

  return (
    <div className="min-h-screen overscroll-none bg-surface-muted">
      <header className="bg-white md:border-b md:border-border">
        <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 md:pb-4 md:pt-4 lg:px-8">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center"
              aria-label="Return to store"
            >
              <img
                alt="Belims"
                width="112"
                height="32"
                className="h-8 w-auto"
                src="/images/belims-logo-dark.webp"
              />
            </button>

            {step !== "success" ? (
              <nav
                className="hidden items-center gap-2 md:flex"
                aria-label="Checkout steps"
              >
                {[
                  { index: 1, label: "Personal details" },
                  { index: 2, label: "Shipping address" },
                  { index: 3, label: "Review & payment" },
                ].map((checkoutStep, index, steps) => {
                  const isActive = checkoutStep.index === currentStepIndex;
                  const isComplete = checkoutStep.index < currentStepIndex;
                  return (
                    <div key={checkoutStep.index} className="flex items-center">
                      <button
                        type="button"
                        disabled={!isComplete}
                        onClick={() => {
                          if (checkoutStep.index === 1) goToDetails();
                          if (checkoutStep.index === 2) goToShipping();
                        }}
                        aria-current={isActive ? "step" : undefined}
                        className="flex items-center gap-2 disabled:cursor-default"
                      >
                        <span
                          className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                            isActive || isComplete
                              ? "bg-text text-white"
                              : "bg-border text-text-secondary"
                          }`}
                        >
                          {checkoutStep.index}
                        </span>
                        <span
                          className={`text-sm ${
                            isActive || isComplete
                              ? "text-text"
                              : "text-text-secondary"
                          }`}
                        >
                          {checkoutStep.label}
                        </span>
                      </button>
                      {index < steps.length - 1 ? (
                        <div className="mx-4 h-px w-8 bg-border" />
                      ) : null}
                    </div>
                  );
                })}
              </nav>
            ) : null}

            <div className="flex items-center gap-1.5 text-text-secondary">
              <Lock className="h-3.5 w-3.5" />
              <span className="text-xs">Secure checkout</span>
            </div>
          </div>

          {step !== "success" ? (
            <div className="mt-3 md:hidden">
              <div className="mb-2 flex items-center justify-between text-xs text-text-secondary">
                <span>Step {currentStepIndex} of 3</span>
                <span>{currentStepLabel}</span>
              </div>
              <div
                className="h-1 overflow-hidden rounded-full bg-border"
                role="progressbar"
                aria-valuenow={(currentStepIndex / 3) * 100}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full bg-text transition-all duration-300"
                  style={{ width: `${(currentStepIndex / 3) * 100}%` }}
                />
              </div>
            </div>
          ) : null}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 pb-24 sm:px-6 md:py-8 md:pb-8 lg:px-8">
        {step !== "success" && <h1 className="sr-only">Checkout</h1>}
        {step === "success" ? (
          <div className="mx-auto max-w-2xl rounded-lg border-2 border-border bg-white p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-stock-ok-bg text-success">
              <Check size={34} />
            </div>
            <h1 className={`mt-6 ${pageTitleClass}`}>
              Order placed
            </h1>
            <p className="mt-2 text-sm text-text-secondary">
              Thank you for your purchase. A confirmation email has been sent to{" "}
              <strong>{customer.email}</strong>.
            </p>
            <button
              onClick={onBack}
              className={`${primaryButtonClass} mt-6 px-8`}
            >
              Return to store
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-8 md:flex-row">
            <div className="min-w-0 flex-1">
              <div className="mb-4 md:hidden">
                {OrderSummary({ mobile: true })}
              </div>

              {step === "details" ? (
                <div className="rounded-lg border-2 border-border bg-white p-6 md:p-8 space-y-8">
                  {/* Sign In trigger — outside the checkout form */}
                  {!isUserLoggedIn && (
                    <section className="flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => setLoginPanelOpen((p) => !p)}
                        className="text-sm font-semibold text-belims-blue hover:underline"
                      >
                        {loginPanelOpen ? "Cancel" : "Sign In"}
                      </button>
                    </section>
                  )}

                  {/* Login card — standalone form, outside the checkout form */}
                  {!isUserLoggedIn && loginPanelOpen && (
                    <section className="rounded-lg border border-border bg-surface-muted p-5 space-y-4">
                      <div>
                        <h3 className="text-base font-semibold text-text">Sign in for faster checkout</h3>
                        <p className="text-sm text-text-secondary mt-0.5">Your saved details and addresses will be auto-filled.</p>
                      </div>
                      <form onSubmit={handleCheckoutLogin} className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className={labelClass} htmlFor="login-email">Email</label>
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
                              <input
                                id="login-email"
                                type="email"
                                required
                                autoComplete="email"
                                placeholder="name@example.com"
                                value={loginEmail}
                                onChange={(e) => setLoginEmail(e.target.value)}
                                className={inputWithIconClass}
                              />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <label className={labelClass} htmlFor="login-password">Password</label>
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
                              <input
                                id="login-password"
                                type={showLoginPassword ? "text" : "password"}
                                required
                                autoComplete="current-password"
                                placeholder="Your password"
                                value={loginPassword}
                                onChange={(e) => setLoginPassword(e.target.value)}
                                className={`${inputWithIconClass} pr-10`}
                              />
                              <button
                                type="button"
                                onClick={() => setShowLoginPassword((p) => !p)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary"
                              >
                                {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                              </button>
                            </div>
                          </div>
                        </div>
                        {loginError && (
                          <p className="text-sm text-error">{loginError}</p>
                        )}
                        <div className="flex items-center gap-4">
                          <button
                            type="submit"
                            disabled={loginLoading}
                            className={`${primaryButtonClass} px-6`}
                          >
                            {loginLoading && <Loader2 size={15} className="animate-spin" />}
                            {loginLoading ? "Signing in..." : "Sign in"}
                          </button>
                          <Link
                            to="/login?redirect=/checkout"
                            className="text-sm text-text-secondary hover:text-text hover:underline"
                          >
                            Forgot password?
                          </Link>
                        </div>
                      </form>
                      <p className="text-xs text-text-tertiary">
                        New customer?{" "}
                        <Link to="/register" className="underline hover:text-text-secondary">
                          Create an account
                        </Link>{" "}
                        or continue as a guest below.
                      </p>
                    </section>
                  )}

                  <form onSubmit={handleDetailsSubmit} className="space-y-8">
                    <section className="space-y-4">
                      <h2 className="text-xl font-semibold text-text">
                        Personal details
                      </h2>
                      {isInitializingCheckout ? (
                        <div className="space-y-4" aria-busy="true" aria-live="polite">
                          <div className="space-y-1.5">
                            <div className="h-4 w-24 rounded bg-border animate-pulse" />
                            <div className="h-11 w-full rounded-md bg-surface-muted animate-pulse" />
                          </div>
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="space-y-1.5">
                              <div className="h-4 w-20 rounded bg-border animate-pulse" />
                              <div className="h-11 w-full rounded-md bg-surface-muted animate-pulse" />
                            </div>
                            <div className="space-y-1.5">
                              <div className="h-4 w-20 rounded bg-border animate-pulse" />
                              <div className="h-11 w-full rounded-md bg-surface-muted animate-pulse" />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <div className="h-4 w-24 rounded bg-border animate-pulse" />
                            <div className="h-11 w-full rounded-md bg-surface-muted animate-pulse" />
                          </div>
                          <span className="sr-only">Loading your saved details…</span>
                        </div>
                      ) : (
                      <>
                      <div className="space-y-1.5">
                        <label className={labelClass} htmlFor="email">
                          Email address
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
                          <input
                            id="email"
                            required
                            type="email"
                            autoComplete="email"
                            placeholder="name@example.com"
                            className={inputWithIconClass}
                            value={customer.email}
                            onChange={(e) =>
                              setCustomer({
                                ...customer,
                                email: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <label className={labelClass} htmlFor="firstName">
                            First name
                          </label>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
                            <input
                              id="firstName"
                              required
                              autoComplete="given-name"
                              placeholder="First name"
                              className={inputWithIconClass}
                              value={customer.firstName}
                              onChange={(e) =>
                                setCustomer({
                                  ...customer,
                                  firstName: e.target.value,
                                })
                              }
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className={labelClass} htmlFor="lastName">
                            Last name
                          </label>
                          <input
                            id="lastName"
                            required
                            autoComplete="family-name"
                            placeholder="Last name"
                            className={inputClass}
                            value={customer.lastName}
                            onChange={(e) =>
                              setCustomer({
                                ...customer,
                                lastName: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className={labelClass} htmlFor="phone">
                          Phone number
                        </label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
                          <input
                            id="phone"
                            required
                            type="tel"
                            autoComplete="tel"
                            placeholder="Phone number"
                            className={inputWithIconClass}
                            value={customer.phone}
                            onChange={(e) =>
                              setCustomer({
                                ...customer,
                                phone: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                      </>
                      )}

                      {!isInitializingCheckout && !isUserLoggedIn && (
                        <div className="flex items-center gap-3">
                          <input
                            id="createAccount"
                            type="checkbox"
                            checked={createAccount}
                            onChange={(e) => setCreateAccount(e.target.checked)}
                            className="h-5 w-5 rounded border-border text-text focus:ring-belims-blue"
                          />
                          <label
                            className="cursor-pointer text-sm font-medium text-text-secondary"
                            htmlFor="createAccount"
                          >
                            Create an account for faster checkout next time
                          </label>
                        </div>
                      )}

                      {!isInitializingCheckout && !isUserLoggedIn && createAccount ? (
                        <div className="grid grid-cols-1 gap-4 rounded-lg border border-border bg-surface-muted p-4 sm:grid-cols-2">
                          <div className="space-y-1.5">
                            <label
                              className={labelClass}
                              htmlFor="accountUsername"
                            >
                              Account username
                            </label>
                            <input
                              id="accountUsername"
                              required={createAccount}
                              placeholder="Choose a username"
                              className={inputClass}
                              value={accountUsername}
                              onChange={(e) =>
                                setAccountUsername(e.target.value)
                              }
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label
                              className={labelClass}
                              htmlFor="accountPassword"
                            >
                              Account password
                            </label>
                            <input
                              id="accountPassword"
                              required={createAccount}
                              type="password"
                              autoComplete="new-password"
                              placeholder="Minimum 8 characters"
                              className={inputClass}
                              value={accountPassword}
                              onChange={(e) =>
                                setAccountPassword(e.target.value)
                              }
                            />
                          </div>
                        </div>
                      ) : null}
                    </section>

                    <button
                      disabled={loading}
                      type="submit"
                      className={`${buyButtonClass} hidden w-full md:flex`}
                    >
                      {loading ? (
                        <>
                          <Loader2 size={20} className="animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>Continue to shipping</>
                      )}
                    </button>

                    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-white p-4 md:hidden">
                      <button
                        disabled={loading}
                        type="submit"
                        className={`${buyButtonClass} w-full`}
                      >
                        <span className="flex items-center gap-2">
                          Continue to shipping
                          <ChevronRight className="h-5 w-5" />
                        </span>
                      </button>
                    </div>
                  </form>
                </div>
              ) : null}

              {step === "shipping" ? (
                <div className="rounded-lg border-2 border-border bg-white p-6 md:p-8">
                  <form onSubmit={handleShippingSubmit} className="space-y-8">

                    {/* Fulfilment type selector */}
                    <section className="space-y-4">
                      <h2 className="text-xl font-semibold text-text">
                        How would you like to receive your order?
                      </h2>
                      <div className="space-y-3">
                        {(["delivery", "pickup"] as DeliveryType[]).map((type) => {
                          const isSelected = deliveryType === type;
                          return (
                            <button
                              key={type}
                              type="button"
                              onClick={() => setDeliveryType(type)}
                              className={`flex w-full items-center gap-4 rounded-md border-2 p-4 text-left transition-colors ${
                                isSelected
                                  ? "border-belims-blue bg-surface-muted"
                                  : "border-border bg-white hover:border-border"
                              }`}
                            >
                              <div
                                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                                  isSelected
                                    ? "border-belims-blue"
                                    : "border-border"
                                }`}
                              >
                                {isSelected && (
                                  <div className="h-3 w-3 rounded-full bg-belims-blue" />
                                )}
                              </div>
                              <span className="flex-1 text-base font-semibold capitalize text-text">
                                {type === "pickup" ? "Pick up" : "Delivery"}
                              </span>
                              {type === "delivery" ? (
                                <Truck className="h-6 w-6 text-text-tertiary" />
                              ) : (
                                <StoreIcon className="h-6 w-6 text-text-tertiary" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </section>

                    {/* Delivery address form */}
                    {deliveryType === "delivery" && (
                      <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-text">
                          Delivery details
                        </h2>

                        {/* Saved address pill — returning user */}
                        {addressAutoPopulated && !editingAddress && (
                          <div className="rounded-lg border border-border bg-surface-muted p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="text-sm text-text-secondary">
                                {customer.addressLabel && (
                                  <p className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-0.5">
                                    {customer.addressLabel}
                                  </p>
                                )}
                                <p className="font-medium text-text">{customer.address}</p>
                                {customer.address2 && <p>{customer.address2}</p>}
                                <p>{customer.city}, {customer.province} {customer.postalCode}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => setEditingAddress(true)}
                                className="shrink-0 text-sm font-medium text-text underline underline-offset-2"
                              >
                                Edit
                              </button>
                            </div>
                            {savedAddresses.length > 1 && (
                              <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border">
                                {savedAddresses.map((saved, i) => {
                                  const isActive = customer.address === saved.address.street && customer.city === saved.address.city;
                                  return (
                                    <button
                                      key={i}
                                      type="button"
                                      onClick={() => setCustomer((prev) => ({
                                        ...prev,
                                        address: saved.address.street,
                                        suburb: saved.address.suburb || prev.suburb,
                                        city: saved.address.city,
                                        province: saved.address.province,
                                        postalCode: saved.address.postalCode,
                                      }))}
                                      className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors ${
                                        isActive
                                          ? "border-belims-blue bg-belims-blue text-white"
                                          : "border-border bg-white text-text-secondary hover:border-belims-blue hover:text-belims-blue"
                                      }`}
                                    >
                                      <MapPin size={10} />
                                      {saved.label}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Address form — new user or editing */}
                        {(!addressAutoPopulated || editingAddress) && (
                          <div className="space-y-4">
                            {/* Saved address chips (returning user editing) */}
                            {savedAddresses.length > 0 && editingAddress && (
                              <div className="space-y-2">
                                <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Saved addresses</p>
                                <div className="flex flex-wrap gap-2">
                                  {savedAddresses.map((saved, i) => {
                                    const isActive = customer.address === saved.address.street && customer.city === saved.address.city;
                                    return (
                                      <button
                                        key={i}
                                        type="button"
                                        onClick={() => {
                                          setCustomer((prev) => ({
                                            ...prev,
                                            address: saved.address.street,
                                            suburb: saved.address.suburb || prev.suburb,
                                            city: saved.address.city,
                                            province: saved.address.province,
                                            postalCode: saved.address.postalCode,
                                          }));
                                          setAddressAutoPopulated(true);
                                          setEditingAddress(false);
                                        }}
                                        className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                                          isActive
                                            ? "border-belims-blue bg-belims-blue text-white"
                                            : "border-border bg-surface-muted text-text-secondary hover:border-belims-blue hover:text-belims-blue"
                                        }`}
                                      >
                                        <MapPin size={11} />
                                        <span>{saved.label}</span>
                                        {saved.address.city && (
                                          <span className="font-normal opacity-70">· {saved.address.city}</span>
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                                <hr className="border-border" />
                              </div>
                            )}

                            {/* Street Address */}
                            <div className="space-y-1.5">
                              <label className={labelClass} htmlFor="streetAddress">
                                Street Address <span className="text-error">*</span>
                              </label>
                              {locationError && (
                                <p className="text-xs text-error">{locationError}</p>
                              )}
                              <input
                                id="streetAddress"
                                required
                                autoComplete="address-line1"
                                placeholder="Street address"
                                className={inputClass}
                                value={customer.address}
                                onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                              />
                            </div>

                            {/* Complex / Building */}
                            <div className="space-y-1.5">
                              <label className={labelClass} htmlFor="address2">
                                Complex, building, unit/floor number
                              </label>
                              <input
                                id="address2"
                                type="text"
                                placeholder="Unit 4, Sunrise Park"
                                autoComplete="address-line2"
                                className={inputClass}
                                value={customer.address2}
                                onChange={(e) => setCustomer({ ...customer, address2: e.target.value })}
                              />
                            </div>

                            {/* Postal Code / Suburb */}
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <label className={labelClass} htmlFor="postalCode">Postal Code <span className="text-error">*</span></label>
                                <input
                                  id="postalCode"
                                  required
                                  autoComplete="postal-code"
                                  placeholder="Postal code"
                                  className={inputClass}
                                  value={customer.postalCode}
                                  onChange={(e) => setCustomer({ ...customer, postalCode: e.target.value })}
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className={labelClass} htmlFor="suburb">Suburb <span className="text-error">*</span></label>
                                <input
                                  id="suburb"
                                  required
                                  placeholder="Suburb"
                                  className={inputClass}
                                  value={customer.suburb}
                                  onChange={(e) => setCustomer({ ...customer, suburb: e.target.value })}
                                />
                              </div>
                            </div>

                            {/* City / Province */}
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <label className={labelClass} htmlFor="city">City/Town <span className="text-error">*</span></label>
                                <input
                                  id="city"
                                  required
                                  autoComplete="address-level2"
                                  placeholder="City"
                                  className={inputClass}
                                  value={customer.city}
                                  onChange={(e) => setCustomer({ ...customer, city: e.target.value })}
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className={labelClass} htmlFor="province">Province <span className="text-error">*</span></label>
                                <select
                                  id="province"
                                  required
                                  className={inputClass}
                                  value={customer.province}
                                  onChange={(e) => setCustomer({ ...customer, province: e.target.value })}
                                >
                                  <option value="">Select province</option>
                                  <option value="Eastern Cape">Eastern Cape</option>
                                  <option value="Free State">Free State</option>
                                  <option value="Gauteng">Gauteng</option>
                                  <option value="KwaZulu-Natal">KwaZulu-Natal</option>
                                  <option value="Limpopo">Limpopo</option>
                                  <option value="Mpumalanga">Mpumalanga</option>
                                  <option value="Northern Cape">Northern Cape</option>
                                  <option value="North West">North West</option>
                                  <option value="Western Cape">Western Cape</option>
                                </select>
                              </div>
                            </div>

                            {/* Type of Address */}
                            <div className="space-y-2">
                              <p className={labelClass}>Type of Address</p>
                              <div className="flex gap-6">
                                {(["home", "work"] as const).map((type) => (
                                  <label key={type} className="flex cursor-pointer items-center gap-2">
                                    <div
                                      className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors ${
                                        customer.addressType === type ? "border-text" : "border-border"
                                      }`}
                                    >
                                      {customer.addressType === type && (
                                        <div className="h-2.5 w-2.5 rounded-full bg-text" />
                                      )}
                                    </div>
                                    <input
                                      type="radio"
                                      className="sr-only"
                                      name="addressType"
                                      value={type}
                                      checked={customer.addressType === type}
                                      onChange={() => setCustomer({ ...customer, addressType: type })}
                                    />
                                    <span className="text-sm text-text-secondary">
                                      {type === "home" ? "Home (All day delivery)" : "Work (Delivery between 10 AM – 5 PM)"}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            </div>

                            {/* Bottom actions */}
                            <div className="grid grid-cols-2 gap-3 pt-2">
                              <button
                                type="button"
                                onClick={handleUseCurrentLocation}
                                disabled={locatingAddress}
                                className="flex h-12 items-center justify-center gap-2 rounded-lg border border-border text-sm font-semibold text-text-secondary transition-colors hover:border-border-strong hover:bg-surface-muted disabled:opacity-50"
                              >
                                <MapPin size={16} />
                                {locatingAddress ? "Detecting..." : "Use my location"}
                              </button>
                              <button
                                type="button"
                                onClick={handleSaveAddress}
                                disabled={!customer.address || !customer.city || !customer.province || !customer.postalCode}
                                className={primaryButtonClass}
                              >
                                Save and deliver here
                              </button>
                            </div>
                          </div>
                        )}
                      </section>
                    )}

                    {/* Pick up info */}
                    {deliveryType === "pickup" && (
                      <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-text">
                          Pick Up Details
                        </h2>
                        <div className="rounded-lg border border-border bg-surface-muted p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-sm text-text">
                                Pickup at:{" "}
                                <span className="font-semibold">
                                  {pickupStore?.name || "Select a store"}
                                </span>
                              </p>
                              <p className="mt-1 text-sm text-text-secondary">
                                {scheduledLabel ? (
                                  <>Scheduled: {scheduledLabel}</>
                                ) : pickupStatus ? (
                                  <>
                                    <span className={`${pickupTone} font-semibold`}>{pickupStatus.label}</span>
                                    {pickupStatus.detail ? <span> - {pickupStatus.detail}</span> : null}
                                  </>
                                ) : (
                                  "Check hours"
                                )}
                              </p>
                              <p className="mt-1 text-sm text-text-secondary">
                                Distance:{" "}
                                {pickupDistance !== null && pickupDistance !== undefined
                                  ? `${pickupDistance} km away from you`
                                  : "Unavailable"}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => onSchedulePickup?.()}
                              className="shrink-0 text-sm font-medium text-text underline underline-offset-2"
                            >
                              {scheduledLabel ? "Change" : "Schedule"}
                            </button>
                          </div>
                        </div>
                      </section>
                    )}

                    {/* Shipping method — delivery only, after address saved */}
                    {deliveryType === "delivery" && addressAutoPopulated && !editingAddress && (
                      <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-text">
                          Shipping method
                        </h2>
                        {loadingSavedRates ? (
                          <div className="flex items-center justify-center rounded-lg border border-border py-10">
                            <Loader2 className="h-5 w-5 animate-spin text-text-secondary" />
                          </div>
                        ) : activeRates.length > 0 ? (
                          <div className="space-y-3">
                            {activeRates.map((rate, idx) => {
                              const tier = rate.tier || classifyRate(rate, activeRates);
                              const isSelected = selectedShipping?.service_name === rate.service_name;
                              const isFastest = fastestRate?.service_name === rate.service_name;
                              return (
                                <label
                                  key={`${rate.service_name}-${idx}`}
                                  className={`flex cursor-pointer items-center gap-4 rounded-lg border p-4 transition-colors focus-within:ring-2 focus-within:ring-belims-blue focus-within:ring-offset-2 ${
                                    isSelected ? "border-text bg-surface-muted" : "border-border hover:border-border-strong"
                                  }`}
                                >
                                  <input className="sr-only" type="radio" name="shipping" checked={isSelected} onChange={() => handleShippingSelect(rate)} />
                                  <div className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors ${isSelected ? "border-text" : "border-border"}`}>
                                    {isSelected && <div className="h-2.5 w-2.5 rounded-full bg-text" />}
                                  </div>
                                  <Truck className="h-5 w-5 text-text-secondary" />
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="font-medium">{rate.service_name}</span>
                                      {tier === "Express" || isFastest ? <Pill tone="warning" icon={<Zap size={12} />}>Faster</Pill> : null}
                                      {tier === "Economy" ? <Pill tone="success">Budget</Pill> : null}
                                    </div>
                                    <p className="mt-0.5 text-xs text-text-secondary">{formatEta(rate.expected_delivery_date)}</p>
                                  </div>
                                  {subtotal >= FREE_SHIPPING_THRESHOLD ? (
                                    <span className="text-right">
                                      <span className="block font-bold text-success">Free</span>
                                      <span className="block text-xs text-deal-strike line-through">{formatCurrency(rate.total_price)}</span>
                                    </span>
                                  ) : (
                                    <span className="font-medium">{formatCurrency(rate.total_price)}</span>
                                  )}
                                </label>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="rounded-lg border border-border py-8 text-center text-sm text-text-secondary">
                            No delivery options available yet. Enter your address above — if none appear, please contact us to complete your order.
                          </p>
                        )}
                      </section>
                    )}

                    {/* Navigation */}
                    <div className="flex items-center justify-between">
                      <button type="button" className={secondaryButtonClass} onClick={goToDetails}>
                        <ChevronLeft className="h-4 w-4" />
                        Return to information
                      </button>
                      <button
                        disabled={deliveryType === "delivery" ? !selectedShipping : false}
                        className={`${buyButtonClass} hidden px-8 md:flex`}
                        type="submit"
                      >
                        Continue to payment
                      </button>
                    </div>

                    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-white p-4 md:hidden">
                      <button
                        disabled={deliveryType === "delivery" ? !selectedShipping : false}
                        className={`${buyButtonClass} w-full`}
                        type="submit"
                      >
                        <span className="flex items-center gap-2">
                          Continue to payment
                          <ChevronRight className="h-5 w-5" />
                        </span>
                      </button>
                    </div>
                  </form>
                </div>
              ) : null}

              {step === "payment" ? (
                isReturnFlow ? (
                  <div className="rounded-lg border-2 border-border bg-white p-6 md:p-8">
                    <h2 className="text-xl font-semibold text-text">
                      Verifying Payment
                    </h2>
                    <div className="mt-4 rounded-lg border border-border bg-surface-muted p-4">
                      <p className="mb-2 text-sm text-text-secondary">
                        {loading
                          ? `We're confirming your payment with ${paymentProviderLabel}.`
                          : verificationMessage ||
                            "Payment is still pending. Please check back in a few minutes."}
                      </p>
                      <p className="text-xs text-text-secondary">
                        Order ID: {returnOrderId}
                      </p>
                    </div>
                    {loading ? (
                      <div className="mt-4 flex items-center gap-2 text-sm text-text-secondary">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Checking payment status...
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="rounded-lg border-2 border-border bg-white p-6 md:p-8">
                    <form
                      className="space-y-8"
                      onSubmit={(event) => {
                        event.preventDefault();
                        handlePlaceOrder();
                      }}
                    >
                      <ContextSummary includeMethod />

                      <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-text">
                          Review & payment
                        </h2>
                        {/* <p className="text-base font-medium text-text-secondary">
                          All transactions are secure and encrypted.
                        </p> */}
                        <div className="space-y-3">
                          <div className="overflow-hidden rounded-lg border border-text">
                            <label className="flex cursor-pointer items-center gap-4 p-4">
                              <input
                                className="sr-only"
                                type="radio"
                                value="card"
                                checked
                                readOnly
                                name="payment"
                              />
                              <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-text">
                                <div className="h-2.5 w-2.5 rounded-full bg-text" />
                              </div>
                              <CreditCard className="h-5 w-5 text-text-secondary" />
                              <span className="font-medium">Payfast</span>

                            </label>
                            {/* <div className="space-y-4 border-t border-border bg-surface-muted p-4">
                              <div className="relative">
                                <input
                                  className={`${inputClass} h-10 pr-12`}
                                  placeholder="Card number"
                                  maxLength={19}
                                />
                                <Lock className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <input
                                  className={`${inputClass} h-10`}
                                  placeholder="MM/YY"
                                  maxLength={5}
                                />
                                <input
                                  className={`${inputClass} h-10`}
                                  placeholder="CVC"
                                  maxLength={4}
                                />
                              </div>
                              <input
                                className={`${inputClass} h-10`}
                                placeholder="Name on card"
                              />
                            </div> */}
                          </div>

                          {/* <label className="flex cursor-pointer items-center gap-4 rounded-lg border border-border p-4 transition-colors hover:border-border-strong">
                            <input
                              className="sr-only"
                              type="radio"
                              value="paypal"
                              name="payment"
                            />
                            <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-border" />
                            <span>
                              <span className="font-bold text-belims-blue">
                                Pay
                              </span>
                              <span className="font-bold text-belims-blue">
                                Pal
                              </span>
                            </span>
                          </label> */}
                        </div>
                      </section>

                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          className={secondaryButtonClass}
                          onClick={
                            deliveryType === "pickup"
                              ? goToDetails
                              : goToShipping
                          }
                        >
                          <ChevronLeft className="h-4 w-4" />
                          {deliveryType === "pickup"
                            ? "Return to information"
                            : "Return to shipping"}
                        </button>
                        <button
                          className={`${buyButtonClass} hidden min-w-[200px] px-8 md:flex`}
                          type="submit"
                          disabled={loading || !selectedShipping}
                        >
                          {loading ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>Pay {formatCurrency(total)}</>
                          )}
                        </button>
                      </div>

                      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-white p-4 md:hidden">
                        <button
                          className={`${buyButtonClass} w-full`}
                          type="submit"
                          disabled={loading || !selectedShipping}
                        >
                          <span className="flex items-center gap-2">
                            Pay {formatCurrency(total)}
                            <ChevronRight className="h-5 w-5" />
                          </span>
                        </button>
                      </div>
                    </form>
                  </div>
                )
              ) : null}
            </div>

            <div className="hidden md:block md:shrink-0 md:basis-[30%]">
              <div className="md:sticky md:top-8">
                {OrderSummary({})}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
