import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CartItem, Product, ShippingAddress, Store } from "../types";
import { CURRENCY_SYMBOL, STORES } from "../constants";
import { formatCurrency } from "../utils/price";
import {
  getShippingRates,
  getFallbackShipping,
} from "../services/bobGoService";
import { readStoredAddress } from "../services/shippingAddress";
import {
  createWooOrder,
  initializePayment,
  verifyPayment,
} from "../services/paymentService";
import { registerUser } from "../services/authService";
import { getApiBaseUrl } from "../services/wooCommerceService";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
  CreditCard,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Phone,
  RotateCcw,
  ShieldCheck,
  Tag,
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
}

type CheckoutStep = "details" | "shipping" | "payment" | "success";
type DeliveryType = "delivery" | "pickup";
type ShippingTier = "Express" | "Standard" | "Economy";

interface CustomerDetails {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
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
}) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnOrderId = searchParams.get("order_id");
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
  const [orderNote, setOrderNote] = useState(initialOrderNote);
  const [pickupStore, setPickupStore] = useState<Store | null>(null);
  const [pickupSchedule, setPickupSchedule] = useState<PickupSchedule | null>(
    null,
  );

  // Account Creation State
  const [createAccount, setCreateAccount] = useState(false);
  const [accountUsername, setAccountUsername] = useState("");
  const [accountPassword, setAccountPassword] = useState("");

  // Form State
  const [customer, setCustomer] = useState<CustomerDetails>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
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

  // Totals
  const subtotal = cartItems.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0,
  );
  const shippingCost = selectedShipping ? selectedShipping.total_price : 0;
  const total = subtotal + shippingCost;
  const pickupStatus = getPickupStatus(pickupStore);
  const scheduledLabel = pickupSchedule
    ? formatScheduledPickup(pickupSchedule.date, pickupSchedule.time)
    : null;
  const pickupTone = pickupStatus?.isOpen
    ? "text-green-600"
    : pickupStatus?.isOpen === false
      ? "text-red-600"
      : "text-gray-500";
  const pickupDistance =
    pickupStore?.distance ?? getStoredPickupDistance(pickupStore?.id);

  // Auto-populate address from saved delivery location and fetch shipping rates
  useEffect(() => {
    const initializeFromSavedLocation = async () => {
      const { address } = readStoredAddress();

      if (
        address &&
        address.city &&
        address.province &&
        !addressAutoPopulated
      ) {
        // Auto-populate customer address
        setCustomer((prev) => ({
          ...prev,
          address: address.street || "",
          city: address.city || "",
          province: address.province || "",
          postalCode: address.postalCode || "",
        }));
        setAddressAutoPopulated(true);
        setEditingAddress(false);

        // Fetch shipping rates for this location
        setLoadingSavedRates(true);
        try {
          const rates = await getShippingRates({
            destination_address: {
              street: address.street || "",
              city: address.city,
              province: address.province,
              postal_code: address.postalCode || "",
              country: address.country || "South Africa",
            },
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
          // Auto-select the fastest rate
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

    initializeFromSavedLocation();
  }, []);

  useEffect(() => {
    const storedFulfillment = localStorage.getItem("fulfillmentType");
    const pickupSelected =
      localStorage.getItem("pickupStoreSelected") === "true";
    if (storedFulfillment === "pickup" && pickupSelected) {
      setDeliveryType("pickup");
    }

    const rawStore = localStorage.getItem("selectedPickupStore");
    if (rawStore) {
      try {
        const parsed = JSON.parse(rawStore) as Store;
        if (parsed?.id && parsed?.name) {
          setPickupStore(parsed);
        }
      } catch {
        setPickupStore(null);
      }
    }

    if (!rawStore && pickupSelected) {
      const defaultStore = STORES.find((store) => store.id === "umzinto");
      if (defaultStore) setPickupStore(defaultStore);
    }

    const rawSchedule = localStorage.getItem("pickupSchedule");
    if (rawSchedule) {
      try {
        const parsed = JSON.parse(rawSchedule) as PickupSchedule;
        if (parsed?.date && parsed?.time) {
          setPickupSchedule(parsed);
        }
      } catch {
        setPickupSchedule(null);
      }
    }
  }, []);

  useEffect(() => {
    if (!pickupStore || pickupStore.hours) return;
    let isActive = true;
    const apiBase = getApiBaseUrl();

    const hydrateStoreHours = async () => {
      try {
        const response = await fetch(`${apiBase}/ecommerce-policies`);
        const data = await response.json();
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
    const maxAttempts = 8;
    const delayMs = 2500;

    const verify = async () => {
      attempts += 1;
      try {
        const res = await verifyPayment(returnOrderId);

        if (cancelled) return;

        if (res.success) {
          // Check if there's a pending account creation
          const pendingAccountData = localStorage.getItem(
            "pendingAccountCreation",
          );
          if (pendingAccountData) {
            try {
              const accountData = JSON.parse(pendingAccountData);
              // Only create account if it matches this order
              if (accountData.orderId === returnOrderId) {
                await registerUser({
                  email: accountData.email,
                  password: accountData.password,
                  first_name: accountData.firstName,
                  last_name: accountData.lastName,
                  phone: accountData.phone,
                });
                // Clear the pending account data
                localStorage.removeItem("pendingAccountCreation");
              }
            } catch (accountError) {
              // Don't block order confirmation if account creation fails
              console.error("Account creation error:", accountError);
            }
          }

          const ts = Math.floor(Date.now() / 1000);
          onClearCart();
          navigate(
            `/order-confirmation?order_id=${encodeURIComponent(returnOrderId)}&payment_status=complete&timestamp=${ts}`,
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
  }, [returnOrderId, navigate, onClearCart]);

  const handleBack = isReturnFlow ? () => navigate("/") : onBack;
  const paymentProviderLabel = returnSource
    ? returnSource.toUpperCase()
    : "PAYFAST";

  const handleCreateAccount = async () => {
    // Check if we have enough customer data to create an account
    if (!customer.email || !customer.firstName || !customer.lastName) {
      alert("Please fill in your details before creating an account.");
      return;
    }

    // Generate a temporary password or ask user for one
    const password = prompt(
      "Create a password for your account (minimum 8 characters):",
    );

    if (!password || password.length < 8) {
      alert("Password must be at least 8 characters long.");
      return;
    }

    setLoading(true);
    try {
      const result = await registerUser({
        email: customer.email,
        password: password,
        first_name: customer.firstName,
        last_name: customer.lastName,
        phone: customer.phone,
      });

      if (result.success) {
        alert(
          `Account created successfully! You can now login with ${customer.email}`,
        );
        // Optionally save the data to their profile
      }
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Failed to create account. The email may already be registered.",
      );
    } finally {
      setLoading(false);
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
        order_note: orderNote.trim() || undefined,
        coupon_lines: promoCode.trim() ? [{ code: promoCode.trim() }] : undefined,
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
        };
        localStorage.setItem(
          "pendingAccountCreation",
          JSON.stringify(accountData),
        );
      }

      // 3. Initialize PayFast Payment - Redirect to PayFast
      const paymentUrl = await initializePayment({
        orderId: order.id,
        amount: total,
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
        <button onClick={handleBack} className="text-blue-600 underline">
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
      ? "Personal Details"
      : step === "shipping"
        ? "Shipping Address"
        : "Review & Payment";
  const itemCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const inputClass =
    "flex h-12 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-950 outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10 disabled:cursor-not-allowed disabled:opacity-50";
  const inputWithIconClass = `${inputClass} pl-10`;
  const labelClass = "text-[14px] font-medium text-neutral-950";
  const primaryButtonClass =
    "group inline-flex items-center justify-center gap-2 rounded-md bg-belims-blue px-4 text-base font-medium text-white transition-colors hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";
  const secondaryButtonClass =
    "inline-flex items-center justify-center gap-1 text-sm text-neutral-500 transition-colors hover:text-neutral-950";
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
    <article className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
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
                  className={`relative h-8 w-8 shrink-0 overflow-hidden rounded-md border-2 border-white bg-neutral-100 ${
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
              <span className="text-[14px] font-medium leading-5 tracking-normal text-[#060606]">
                Show order summary
              </span>
              <span className="text-[12px] font-normal leading-4 tracking-normal text-[#555555]">
                {itemCount} {itemCount === 1 ? "item" : "items"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[16px] font-semibold leading-6 tracking-normal text-[#060606]">
              {formatCurrency(summaryTotal)}
            </span>
            <ChevronDown
              className={`h-5 w-5 text-neutral-500 transition-transform duration-200 ${
                orderSummaryOpen ? "rotate-180" : ""
              }`}
            />
          </div>
        </button>
      ) : (
        <header className="hidden items-center gap-2 bg-neutral-50 px-5 py-4 md:flex">
          <h2 className="text-[18px] font-semibold leading-7 tracking-normal text-[#060606]">
            Order Summary
          </h2>
          <span className="text-[14px] font-normal leading-5 tracking-normal text-[#555555]">
            ({itemCount} {itemCount === 1 ? "item" : "items"})
          </span>
        </header>
      )}

      <div
        id={mobile ? "order-summary-content" : undefined}
        className={`${mobile && !orderSummaryOpen ? "hidden" : "block"} md:block`}
      >
        <section className="border-t border-neutral-200">
          <ul className="max-h-[280px] space-y-1 overflow-y-auto px-5 py-4 [scrollbar-gutter:stable]">
            {cartItems.map((item) => (
              <li key={item.id} className="flex gap-4 py-2">
                <figure className="relative shrink-0">
                  <span className="absolute -right-2 -top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-neutral-950 text-[10px] font-medium text-white shadow-sm">
                    {item.quantity}
                  </span>
                  <div className="h-14 w-14 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100">
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
                  <p className="truncate text-[14px] font-semibold leading-5 tracking-normal text-[#060606]">
                    {item.name}
                  </p>
                  <p className="mt-0.5 truncate text-[12px] font-normal leading-4 tracking-normal text-[#555555]">
                    {item.sku || item.category || "Product"}
                  </p>
                </div>
                <data
                  value={item.price * item.quantity}
                  className="flex flex-col justify-center text-[14px] font-medium leading-5 tracking-normal text-[#060606] tabular-nums"
                >
                  {formatCurrency(item.price * item.quantity)}
                </data>
              </li>
            ))}
          </ul>
        </section>

        <section className="border-t border-neutral-200 px-5 py-4">
          <form
            className="flex gap-2"
            onSubmit={(event) => event.preventDefault()}
          >
            <div className="relative flex-1">
              <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
              <input
                className="h-10 w-full rounded-md border border-neutral-200 bg-white pl-10 pr-3 text-sm outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
                placeholder="Discount code"
                value={promoCode}
                onChange={(event) => setPromoCode(event.target.value)}
              />
            </div>
            <button
              className="h-10 rounded-md border border-neutral-200 bg-white px-4 text-sm font-medium text-neutral-950 transition-colors hover:bg-neutral-50 disabled:pointer-events-none disabled:opacity-50"
              type="submit"
              disabled={!promoCode.trim()}
            >
              Apply
            </button>
          </form>
        </section>

        {orderNote.trim() ? (
          <section className="border-t border-neutral-200 px-5 py-4">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
              Order note
            </p>
            <p className="text-sm text-neutral-600">{orderNote.trim()}</p>
          </section>
        ) : null}

        <section className="border-t border-neutral-200 px-5 py-4">
          <dl className="space-y-2 text-[14px] font-normal leading-5 tracking-normal text-[#060606] tabular-nums">
            <div className="flex justify-between">
              <dt>Subtotal</dt>
              <dd>{formatCurrency(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>{deliveryType === "pickup" ? "Pickup" : "Shipping"}</dt>
              <dd>
                {deliveryType === "pickup"
                  ? formatCurrency(0)
                  : selectedShipping
                    ? formatCurrency(shippingCost)
                    : "Calculated at checkout"}
              </dd>
            </div>
          </dl>
          <div className="mt-4 flex items-baseline justify-between border-t border-neutral-200 pt-4 text-[#060606]">
            <span className="text-[16px] font-semibold leading-6 tracking-normal">
              Total
            </span>
            <data
              value={summaryTotal}
              className="text-[16px] font-semibold leading-6 tracking-normal tabular-nums"
            >
              {formatCurrency(summaryTotal)}
            </data>
          </div>
        </section>

        <footer className="grid grid-cols-3 gap-2 border-t border-neutral-200 bg-neutral-50 px-5 py-4">
          <div className="flex flex-col items-center rounded-lg bg-neutral-100 p-2.5 text-center">
            <ShieldCheck className="mb-1 h-4 w-4 text-neutral-500" />
            <span className="text-[12px] font-normal leading-4 tracking-normal text-[#060606]">
              Secure
              <br />
              checkout
            </span>
          </div>
          <div className="flex flex-col items-center rounded-lg bg-neutral-100 p-2.5 text-center">
            <RotateCcw className="mb-1 h-4 w-4 text-neutral-500" />
            <span className="text-[12px] font-normal leading-4 tracking-normal text-[#060606]">
              30-day
              <br />
              returns
            </span>
          </div>
          <div className="flex flex-col items-center rounded-lg bg-neutral-100 p-2.5 text-center">
            <Truck className="mb-1 h-4 w-4 text-neutral-500" />
            <span className="text-[12px] font-normal leading-4 tracking-normal text-[#060606]">
              Free
              <br />
              shipping
            </span>
          </div>
        </footer>
      </div>
    </article>
  );

  const ContextSummary = ({
    includeMethod = false,
  }: {
    includeMethod?: boolean;
  }) => (
    <section className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 text-sm">
      <div className="flex items-start gap-4 p-4">
        <span className="w-16 shrink-0 pt-0.5 text-neutral-500">Contact</span>
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
        <span className="w-16 shrink-0 pt-0.5 text-neutral-500">
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
          <span className="w-16 shrink-0 pt-0.5 text-neutral-500">Method</span>
          <span className="min-w-0 flex-1 break-words">
            {deliveryType === "pickup"
              ? "Pickup"
              : `${selectedShipping?.service_name || "Shipping"} · ${formatCurrency(shippingCost)}`}
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
    <div className="min-h-screen overscroll-none bg-neutral-100">
      <header className="bg-white md:border-b md:border-neutral-200">
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
                src="/images/belims-logo-dark.png"
              />
            </button>

            {step !== "success" ? (
              <nav
                className="hidden items-center gap-2 md:flex"
                aria-label="Checkout steps"
              >
                {[
                  { index: 1, label: "Personal Details" },
                  { index: 2, label: "Shipping Address" },
                  { index: 3, label: "Review & Payment" },
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
                              ? "bg-neutral-950 text-white"
                              : "bg-neutral-200 text-neutral-500"
                          }`}
                        >
                          {checkoutStep.index}
                        </span>
                        <span
                          className={`text-sm ${
                            isActive || isComplete
                              ? "text-neutral-950"
                              : "text-neutral-500"
                          }`}
                        >
                          {checkoutStep.label}
                        </span>
                      </button>
                      {index < steps.length - 1 ? (
                        <div className="mx-4 h-px w-8 bg-neutral-200" />
                      ) : null}
                    </div>
                  );
                })}
              </nav>
            ) : null}

            <div className="flex items-center gap-1.5 text-neutral-500">
              <Lock className="h-3.5 w-3.5" />
              <span className="text-xs">Secure checkout</span>
            </div>
          </div>

          {step !== "success" ? (
            <div className="mt-3 md:hidden">
              <div className="mb-2 flex items-center justify-between text-xs text-neutral-500">
                <span>Step {currentStepIndex} of 3</span>
                <span>{currentStepLabel}</span>
              </div>
              <div
                className="h-1 overflow-hidden rounded-full bg-neutral-200"
                role="progressbar"
                aria-valuenow={(currentStepIndex / 3) * 100}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full bg-neutral-950 transition-all duration-300"
                  style={{ width: `${(currentStepIndex / 3) * 100}%` }}
                />
              </div>
            </div>
          ) : null}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 pb-24 sm:px-6 md:py-8 md:pb-8 lg:px-8">
        {step === "success" ? (
          <div className="mx-auto max-w-2xl rounded-lg border border-neutral-200 bg-white p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-700">
              <Check size={34} />
            </div>
            <h1 className="mt-6 text-2xl font-semibold text-neutral-950">
              Order Placed Successfully
            </h1>
            <p className="mt-2 text-sm text-neutral-500">
              Thank you for your purchase. A confirmation email has been sent to{" "}
              <strong>{customer.email}</strong>.
            </p>
            <button
              onClick={onBack}
              className={`${primaryButtonClass} mt-6 h-12 px-8`}
            >
              Return to Store
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-8 md:flex-row">
            <div className="min-w-0 flex-1">
              <div className="mb-4 md:hidden">
                <OrderSummary mobile />
              </div>

              {step === "details" ? (
                <div className="rounded-lg border border-neutral-200 bg-white p-6 md:p-8">
                  <form onSubmit={handleDetailsSubmit} className="space-y-8">
                    <section className="space-y-4">
                      <div className="flex w-full rounded-full bg-neutral-100 p-1 sm:w-fit">
                        {(["delivery", "pickup"] as DeliveryType[]).map(
                          (type) => (
                            <button
                              key={type}
                              type="button"
                              onClick={() => setDeliveryType(type)}
                              className={`h-9 flex-1 rounded-full px-4 text-sm font-semibold capitalize transition-colors sm:flex-none ${
                                deliveryType === type
                                  ? "bg-neutral-950 text-white"
                                  : "text-neutral-600 hover:text-neutral-950"
                              }`}
                            >
                              {type}
                            </button>
                          ),
                        )}
                      </div>
                    </section>

                    <section className="space-y-4">
                      <h2 className="text-xl font-semibold text-neutral-950">
                        Personal Details
                      </h2>
                      <div className="space-y-1.5">
                        <label className={labelClass} htmlFor="email">
                          Email address
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
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
                            <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
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
                          <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
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

                      <div className="flex items-center gap-3">
                        <input
                          id="createAccount"
                          type="checkbox"
                          checked={createAccount}
                          onChange={(e) => setCreateAccount(e.target.checked)}
                          className="h-5 w-5 rounded border-neutral-300 text-neutral-950 focus:ring-neutral-950"
                        />
                        <label
                          className="cursor-pointer text-sm font-medium text-neutral-500"
                          htmlFor="createAccount"
                        >
                          Create an account for faster checkout next time
                        </label>
                      </div>

                      {createAccount ? (
                        <div className="grid grid-cols-1 gap-4 rounded-lg border border-neutral-200 bg-neutral-50 p-4 sm:grid-cols-2">
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
                      className={`${primaryButtonClass} hidden h-12 w-full md:flex`}
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

                    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-neutral-200 bg-white p-4 md:hidden">
                      <button
                        disabled={loading}
                        type="submit"
                        className={`${primaryButtonClass} h-12 w-full`}
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
                <div className="rounded-lg border border-neutral-200 bg-white p-6 md:p-8">
                  <form onSubmit={handleShippingSubmit} className="space-y-8">
                    <section className="space-y-4">
                      <h2 className="text-xl font-semibold text-neutral-950">
                        Shipping Address
                      </h2>

                      {deliveryType === "pickup" ? (
                        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-sm text-neutral-950">
                                Pickup at:{" "}
                                <span className="font-semibold">
                                  {pickupStore?.name || "Select a store"}
                                </span>
                              </p>
                              <p className="mt-1 text-sm text-neutral-500">
                                {scheduledLabel ? (
                                  <>Scheduled: {scheduledLabel}</>
                                ) : pickupStatus ? (
                                  <>
                                    <span
                                      className={`${pickupTone} font-semibold`}
                                    >
                                      {pickupStatus.label}
                                    </span>
                                    {pickupStatus.detail ? (
                                      <span> - {pickupStatus.detail}</span>
                                    ) : null}
                                  </>
                                ) : (
                                  "Check hours"
                                )}
                              </p>
                              <p className="mt-1 text-sm text-neutral-500">
                                Distance:{" "}
                                {pickupDistance !== null &&
                                pickupDistance !== undefined
                                  ? `${pickupDistance} km away from you`
                                  : "Unavailable"}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => onSchedulePickup?.()}
                              className="shrink-0 text-sm font-medium text-neutral-950 underline underline-offset-2"
                            >
                              {scheduledLabel ? "Change" : "Schedule"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {addressAutoPopulated && !editingAddress ? (
                            <div className="flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                              <div className="text-sm text-neutral-500">
                                <p className="font-medium text-neutral-950">
                                  {customer.address}
                                </p>
                                <p>
                                  {customer.city}, {customer.province}{" "}
                                  {customer.postalCode}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => setEditingAddress(true)}
                                className="text-sm font-medium text-neutral-950 underline underline-offset-2"
                              >
                                Edit
                              </button>
                            </div>
                          ) : null}

                          <div
                            className="space-y-4"
                            style={{
                              display: editingAddress ? "block" : "none",
                            }}
                          >
                            <div className="space-y-1.5">
                              <label
                                className={labelClass}
                                htmlFor="streetAddress"
                              >
                                Street address
                              </label>
                              <div className="relative">
                                <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                                <input
                                  id="streetAddress"
                                  required
                                  autoComplete="address-line1"
                                  placeholder="Street address"
                                  className={inputWithIconClass}
                                  value={customer.address}
                                  onChange={(e) =>
                                    setCustomer({
                                      ...customer,
                                      address: e.target.value,
                                    })
                                  }
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                              <div className="space-y-1.5">
                                <label className={labelClass} htmlFor="city">
                                  City
                                </label>
                                <input
                                  id="city"
                                  required
                                  autoComplete="address-level2"
                                  placeholder="City"
                                  className={inputClass}
                                  value={customer.city}
                                  onChange={(e) =>
                                    setCustomer({
                                      ...customer,
                                      city: e.target.value,
                                    })
                                  }
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label
                                  className={labelClass}
                                  htmlFor="province"
                                >
                                  Province
                                </label>
                                <select
                                  id="province"
                                  required
                                  className={inputClass}
                                  value={customer.province}
                                  onChange={(e) =>
                                    setCustomer({
                                      ...customer,
                                      province: e.target.value,
                                    })
                                  }
                                >
                                  <option value="">Select province</option>
                                  <option value="Eastern Cape">
                                    Eastern Cape
                                  </option>
                                  <option value="Free State">Free State</option>
                                  <option value="Gauteng">Gauteng</option>
                                  <option value="KwaZulu-Natal">
                                    KwaZulu-Natal
                                  </option>
                                  <option value="Limpopo">Limpopo</option>
                                  <option value="Mpumalanga">Mpumalanga</option>
                                  <option value="Northern Cape">
                                    Northern Cape
                                  </option>
                                  <option value="North West">North West</option>
                                  <option value="Western Cape">
                                    Western Cape
                                  </option>
                                </select>
                              </div>
                              <div className="space-y-1.5">
                                <label
                                  className={labelClass}
                                  htmlFor="postalCode"
                                >
                                  Postal code
                                </label>
                                <input
                                  id="postalCode"
                                  required
                                  autoComplete="postal-code"
                                  placeholder="Postal code"
                                  className={inputClass}
                                  value={customer.postalCode}
                                  onChange={(e) =>
                                    setCustomer({
                                      ...customer,
                                      postalCode: e.target.value,
                                    })
                                  }
                                />
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </section>

                    {deliveryType === "delivery" ? (
                      <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-neutral-950">
                          Shipping method
                        </h2>
                        {loadingSavedRates ? (
                          <div className="flex items-center justify-center rounded-lg border border-neutral-200 py-10">
                            <Loader2 className="h-5 w-5 animate-spin text-neutral-500" />
                          </div>
                        ) : activeRates.length > 0 ? (
                          <div className="space-y-3">
                            {activeRates.map((rate, idx) => {
                              const tier =
                                rate.tier || classifyRate(rate, activeRates);
                              const isSelected =
                                selectedShipping?.service_name ===
                                rate.service_name;
                              const isFastest =
                                fastestRate?.service_name === rate.service_name;

                              return (
                                <label
                                  key={`${rate.service_name}-${idx}`}
                                  className={`flex cursor-pointer items-center gap-4 rounded-lg border p-4 transition-colors focus-within:ring-2 focus-within:ring-neutral-950 focus-within:ring-offset-2 ${
                                    isSelected
                                      ? "border-neutral-950 bg-neutral-50"
                                      : "border-neutral-200 hover:border-neutral-400"
                                  }`}
                                >
                                  <input
                                    className="sr-only"
                                    type="radio"
                                    name="shipping"
                                    checked={isSelected}
                                    onChange={() => handleShippingSelect(rate)}
                                  />
                                  <div
                                    className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors ${
                                      isSelected
                                        ? "border-neutral-950"
                                        : "border-neutral-300"
                                    }`}
                                  >
                                    {isSelected ? (
                                      <div className="h-2.5 w-2.5 rounded-full bg-neutral-950" />
                                    ) : null}
                                  </div>
                                  <Truck className="h-5 w-5 text-neutral-500" />
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="font-medium">
                                        {rate.service_name}
                                      </span>
                                      {tier === "Express" || isFastest ? (
                                        <Pill
                                          tone="warning"
                                          icon={<Zap size={12} />}
                                        >
                                          Faster
                                        </Pill>
                                      ) : null}
                                      {tier === "Economy" ? (
                                        <Pill tone="success">Budget</Pill>
                                      ) : null}
                                    </div>
                                    <p className="mt-0.5 text-xs text-neutral-500">
                                      {formatEta(rate.expected_delivery_date)}
                                    </p>
                                  </div>
                                  <span className="font-medium">
                                    {formatCurrency(rate.total_price)}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="rounded-lg border border-neutral-200 py-8 text-center text-sm text-neutral-500">
                            No shipping options available.
                          </p>
                        )}
                      </section>
                    ) : null}

                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        className={secondaryButtonClass}
                        onClick={goToDetails}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Return to information
                      </button>
                      <button
                        disabled={!selectedShipping}
                        className={`${primaryButtonClass} hidden h-12 px-8 md:flex`}
                        type="submit"
                      >
                        Continue to payment
                      </button>
                    </div>

                    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-neutral-200 bg-white p-4 md:hidden">
                      <button
                        disabled={!selectedShipping}
                        className={`${primaryButtonClass} h-12 w-full`}
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
                  <div className="rounded-lg border border-neutral-200 bg-white p-6 md:p-8">
                    <h2 className="text-xl font-semibold text-neutral-950">
                      Verifying Payment
                    </h2>
                    <div className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                      <p className="mb-2 text-sm text-neutral-700">
                        {loading
                          ? `We're confirming your payment with ${paymentProviderLabel}.`
                          : verificationMessage ||
                            "Payment is still pending. Please check back in a few minutes."}
                      </p>
                      <p className="text-xs text-neutral-500">
                        Order ID: {returnOrderId}
                      </p>
                    </div>
                    {loading ? (
                      <div className="mt-4 flex items-center gap-2 text-sm text-neutral-500">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Checking payment status...
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="rounded-lg border border-neutral-200 bg-white p-6 md:p-8">
                    <form
                      className="space-y-8"
                      onSubmit={(event) => {
                        event.preventDefault();
                        handlePlaceOrder();
                      }}
                    >
                      <ContextSummary includeMethod />

                      <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-neutral-950">
                          Review & Payment
                        </h2>
                        {/* <p className="text-[14px] font-medium text-neutral-600">
                          All transactions are secure and encrypted.
                        </p> */}
                        <div className="space-y-3">
                          <div className="overflow-hidden rounded-lg border border-neutral-950">
                            <label className="flex cursor-pointer items-center gap-4 p-4">
                              <input
                                className="sr-only"
                                type="radio"
                                value="card"
                                checked
                                readOnly
                                name="payment"
                              />
                              <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-neutral-950">
                                <div className="h-2.5 w-2.5 rounded-full bg-neutral-950" />
                              </div>
                              <CreditCard className="h-5 w-5 text-neutral-500" />
                              <span className="font-medium">Credit card</span>
                              <div className="ml-auto hidden gap-1 sm:flex">
                                <div className="h-6 w-10 rounded bg-blue-700" />
                                <div className="h-6 w-10 rounded bg-red-500" />
                                <div className="h-6 w-10 rounded bg-sky-500" />
                              </div>
                            </label>
                            <div className="space-y-4 border-t border-neutral-200 bg-neutral-50 p-4">
                              <div className="relative">
                                <input
                                  className={`${inputClass} h-10 pr-12`}
                                  placeholder="Card number"
                                  maxLength={19}
                                />
                                <Lock className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
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
                            </div>
                          </div>

                          <label className="flex cursor-pointer items-center gap-4 rounded-lg border border-neutral-200 p-4 transition-colors hover:border-neutral-400">
                            <input
                              className="sr-only"
                              type="radio"
                              value="paypal"
                              name="payment"
                            />
                            <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-neutral-300" />
                            <span>
                              <span className="font-bold text-blue-600">
                                Pay
                              </span>
                              <span className="font-bold text-blue-900">
                                Pal
                              </span>
                            </span>
                          </label>
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
                          className={`${primaryButtonClass} hidden h-12 min-w-[200px] px-8 md:flex`}
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

                      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-neutral-200 bg-white p-4 md:hidden">
                        <button
                          className={`${primaryButtonClass} h-12 w-full`}
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
                <OrderSummary />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
