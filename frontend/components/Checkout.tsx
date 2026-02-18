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
  ArrowLeft,
  Check,
  Truck,
  CreditCard,
  Loader2,
  Zap,
  Rocket,
} from "lucide-react";

interface CheckoutProps {
  cartItems: CartItem[];
  onBack: () => void;
  onClearCart: () => void;
  onSchedulePickup?: () => void;
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
  const [promoCode, setPromoCode] = useState("");
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
    if (loadingSavedRates) return;

    const existingRates =
      savedLocationRates.length > 0 ? savedLocationRates : shippingRates;
    if (existingRates.length > 0) {
      if (!selectedShipping) {
        const fastest = selectFastestRate(existingRates);
        if (fastest) setSelectedShipping(fastest);
      }
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
  }, [
    deliveryType,
    customer.address,
    customer.city,
    customer.province,
    customer.postalCode,
    loadingSavedRates,
    savedLocationRates.length,
    shippingRates.length,
    selectedShipping,
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

  // STEP 1: Details Submit -> Fetch Shipping
  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (deliveryType === "pickup") {
      // Pickup mode: no shipping rates needed
      setSelectedShipping({
        service_name: "Pickup",
        total_price: 0,
        expected_delivery_date: "",
      });
      setStep("payment");
      setLoading(false);
      return;
    }

    // Delivery mode: fetch rates
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

      // Fallback to getFallbackShipping if BobGo returns empty or fails
      if (!finalRates || finalRates.length === 0) {
        finalRates = getFallbackShipping();
      }

      // Classify rates and add tier info
      const classifiedRates = finalRates.map((rate: any) => ({
        ...rate,
        tier: classifyRate(rate, finalRates),
      }));

      setShippingRates(classifiedRates);

      // Auto-select fastest rate
      const fastest = selectFastestRate(classifiedRates);
      if (fastest) {
        setSelectedShipping(fastest);
      }

      // Go directly to payment (single step checkout)
      setStep("payment");
    } catch (err) {
      alert("Failed to get shipping rates");
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: Shipping Selected
  const handleShippingSelect = (rate: ShippingRate) => {
    setSelectedShipping(rate);
  };

  // STEP 3: Place Order
  const handlePlaceOrder = async () => {
    setLoading(true);
    try {
      // 1. Create Order in Backend
      const order = await createWooOrder({
        customer,
        items: cartItems,
        shipping: selectedShipping,
        total,
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

  const fastestRate = selectFastestRate(shippingRates);
  const shippingTier =
    selectedShipping?.tier ||
    (selectedShipping ? classifyRate(selectedShipping, shippingRates) : null);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="container px-4 mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          {step !== "success" && (
            <button
              onClick={handleBack}
              className="p-2 hover:bg-gray-200 rounded-lg transition"
            >
              <ArrowLeft size={24} />
            </button>
          )}
          <h1 className="text-2xl font-semibold text-gray-900">
            {step === "success" ? "Order Confirmed" : "Checkout"}
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* LEFT COLUMN: Checkout Form */}
          <div className="lg:col-span-2 space-y-6">
            {step === "details" && (
              <>
                {/* Delivery/Pickup Toggle Card */}
                <div className="bg-white p-6 rounded-lg border border-black/10">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-gray-900">
                      Personal Details
                    </h2>
                    <div className="flex gap-2 bg-gray-100 p-1 rounded-full">
                      <button
                        onClick={() => setDeliveryType("delivery")}
                        className={`px-4 py-1.5 rounded-full font-semibold transition ${
                          deliveryType === "delivery"
                            ? "bg-belims-blue text-white"
                            : "bg-transparent text-gray-700 hover:text-gray-900"
                        }`}
                      >
                        Delivery
                      </button>
                      <button
                        onClick={() => setDeliveryType("pickup")}
                        className={`px-4 py-1.5 rounded-full font-semibold transition ${
                          deliveryType === "pickup"
                            ? "bg-belims-blue text-white"
                            : "bg-transparent text-gray-700 hover:text-gray-900"
                        }`}
                      >
                        Pickup
                      </button>
                    </div>
                  </div>

                  <form onSubmit={handleDetailsSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <input
                        required
                        placeholder="First Name"
                        className="border border-gray-200 p-3 rounded w-full focus:outline-none focus:ring-2 focus:ring-belims-blue focus:border-transparent"
                        value={customer.firstName}
                        onChange={(e) =>
                          setCustomer({
                            ...customer,
                            firstName: e.target.value,
                          })
                        }
                      />
                      <input
                        required
                        placeholder="Last Name"
                        className="border border-gray-200 p-3 rounded w-full focus:outline-none focus:ring-2 focus:ring-belims-blue focus:border-transparent"
                        value={customer.lastName}
                        onChange={(e) =>
                          setCustomer({
                            ...customer,
                            lastName: e.target.value,
                          })
                        }
                      />
                    </div>
                    <input
                      required
                      type="email"
                      placeholder="Email Address"
                      className="border border-gray-200 p-3 rounded w-full focus:outline-none focus:ring-2 focus:ring-belims-blue focus:border-transparent"
                      value={customer.email}
                      onChange={(e) =>
                        setCustomer({ ...customer, email: e.target.value })
                      }
                    />
                    <input
                      required
                      placeholder="Phone Number"
                      className="border border-gray-200 p-3 rounded w-full focus:outline-none focus:ring-2 focus:ring-belims-blue focus:border-transparent"
                      value={customer.phone}
                      onChange={(e) =>
                        setCustomer({ ...customer, phone: e.target.value })
                      }
                    />

                    {deliveryType === "pickup" && (
                      <div className="pt-4">
                        <h3 className="text-lg font-semibold text-gray-900">
                          Pickup Details
                        </h3>
                        <div className="mt-3 bg-gray-50 p-4 rounded border border-gray-200 space-y-1">
                          <p className="text-sm text-gray-900">
                            Pickup at:{" "}
                            <span className="font-bold">
                              {pickupStore?.name || "Select a store"}
                            </span>
                          </p>
                          <p className="text-sm text-gray-600">
                            {scheduledLabel ? (
                              <>Scheduled: {scheduledLabel}</>
                            ) : pickupStatus ? (
                              <>
                                <span className={`${pickupTone} font-semibold`}>
                                  {pickupStatus.label}
                                </span>
                                {pickupStatus.detail && (
                                  <span className="text-gray-400">
                                    {" "}
                                    - {pickupStatus.detail}
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="text-gray-500">Check hours</span>
                            )}
                          </p>
                          <p className="text-sm text-gray-600">
                            <span className="font-semibold">Distance:</span>{" "}
                            {pickupDistance !== null &&
                            pickupDistance !== undefined
                              ? `${pickupDistance} km away from you`
                              : "Unavailable"}
                          </p>
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={() => onSchedulePickup?.()}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                onSchedulePickup?.();
                              }
                            }}
                            className="mt-2 text-[12px] font-bold text-red-600 hover:text-red-600"
                          >
                            {scheduledLabel
                              ? "Change scheduled pickup"
                              : "Schedule Pickup"}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Conditional shipping address field */}
                    {deliveryType === "delivery" && (
                      <>
                        <div className="flex items-center justify-between pt-4">
                          <h3 className="text-lg font-semibold text-gray-900">
                            Shipping Address
                          </h3>

                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={createAccount}
                              onChange={(e) =>
                                setCreateAccount(e.target.checked)
                              }
                              className="w-4 h-4 text-belims-blue border-gray-300 rounded focus:ring-belims-blue"
                            />
                            <span className="text-sm font-semibold text-gray-700">
                              Create an Account?
                            </span>
                          </label>
                        </div>

                        {/* Condensed Address Display */}
                        {addressAutoPopulated && !editingAddress && (
                          <div className="bg-gray-50 p-4 rounded border border-gray-200 flex justify-between items-center">
                            <div className="text-sm text-gray-600">
                              <p>{customer.address}</p>
                              <p>
                                {customer.city}, {customer.province}{" "}
                                {customer.postalCode}
                              </p>
                            </div>
                            {addressAutoPopulated && !editingAddress && (
                              <button
                                type="button"
                                onClick={() => setEditingAddress(true)}
                                className="text-sm font-semibold text-belims-blue hover:text-belims-navy transition mt-0"
                              >
                                Edit
                              </button>
                            )}
                          </div>
                        )}

                        {/* Account Creation Panel */}
                        {createAccount && (
                          <div className="bg-blue-50 border border-belims-blue rounded-lg p-4 space-y-3">
                            <p className="text-sm text-gray-700">
                              Create an account by entering the information
                              below. If you are a returning customer please
                              login at the top of the page.
                            </p>
                            <div className="space-y-3">
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                  Account username{" "}
                                  <span className="text-red-500">*</span>
                                </label>
                                <input
                                  required={createAccount}
                                  type="text"
                                  placeholder="Choose a username"
                                  className="border border-gray-300 p-3 rounded w-full focus:outline-none focus:ring-2 focus:ring-belims-blue focus:border-transparent"
                                  value={accountUsername}
                                  onChange={(e) =>
                                    setAccountUsername(e.target.value)
                                  }
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                  Create account password{" "}
                                  <span className="text-red-500">*</span>
                                </label>
                                <input
                                  required={createAccount}
                                  type="password"
                                  placeholder="Minimum 8 characters"
                                  className="border border-gray-300 p-3 rounded w-full focus:outline-none focus:ring-2 focus:ring-belims-blue focus:border-transparent"
                                  value={accountPassword}
                                  onChange={(e) =>
                                    setAccountPassword(e.target.value)
                                  }
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        <input
                          required
                          placeholder="Street Address"
                          className="border border-gray-200 p-3 rounded w-full focus:outline-none focus:ring-2 focus:ring-belims-blue focus:border-transparent"
                          value={customer.address}
                          onChange={(e) =>
                            setCustomer({
                              ...customer,
                              address: e.target.value,
                            })
                          }
                          style={{ display: editingAddress ? "block" : "none" }}
                        />
                        <div
                          className="grid grid-cols-3 gap-4"
                          style={{ display: editingAddress ? "grid" : "none" }}
                        >
                          <input
                            required
                            placeholder="City"
                            className="border border-gray-200 p-3 rounded w-full focus:outline-none focus:ring-2 focus:ring-belims-blue focus:border-transparent"
                            value={customer.city}
                            onChange={(e) =>
                              setCustomer({ ...customer, city: e.target.value })
                            }
                          />
                          <select
                            required
                            className="border border-gray-200 p-3 rounded w-full focus:outline-none focus:ring-2 focus:ring-belims-blue focus:border-transparent"
                            value={customer.province}
                            onChange={(e) =>
                              setCustomer({
                                ...customer,
                                province: e.target.value,
                              })
                            }
                          >
                            <option value="">Select Province</option>
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
                          <input
                            required
                            placeholder="Postal Code"
                            className="border border-gray-200 p-3 rounded w-full focus:outline-none focus:ring-2 focus:ring-belims-blue focus:border-transparent"
                            value={customer.postalCode}
                            onChange={(e) =>
                              setCustomer({
                                ...customer,
                                postalCode: e.target.value,
                              })
                            }
                          />
                        </div>
                      </>
                    )}

                    {/* Shipping Options Section - Only for Delivery */}
                    {deliveryType === "delivery" && (
                      <div className="border-t border-gray-200 pt-6 mt-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                          Choose Delivery Option
                        </h3>
                        {!customer.address ||
                        !customer.city ||
                        !customer.province ? (
                          <p className="text-gray-500 text-center py-8">
                            Enter your delivery address to view options.
                          </p>
                        ) : (
                          <>
                            {/* <p className="text-sm text-gray-600 mb-4">
                            Delivering to{" "}
                            <strong>
                              {customer.city}, {customer.province}
                            </strong>
                          </p> */}

                            {loadingSavedRates ? (
                              <div className="flex items-center justify-center py-8">
                                <Loader2
                                  className="animate-spin text-belims-blue"
                                  size={24}
                                />
                              </div>
                            ) : savedLocationRates.length > 0 ||
                              shippingRates.length > 0 ? (
                              <>
                                {/* Selected Shipping Pill */}
                                {/* {selectedShipping && (
                                <div className="flex items-center gap-2 bg-blue-50 border border-belims-blue px-4 py-2 rounded-full w-fit mb-4">
                                  <Check
                                    size={18}
                                    className="text-belims-blue"
                                  />
                                  <span className="text-sm font-semibold text-belims-blue">
                                    {selectedShipping.service_name} ·{" "}
                                    {formatEta(
                                      selectedShipping.expected_delivery_date,
                                    )}
                                  </span>
                                </div>
                              )} */}

                                {/* Shipping Cards */}
                                <div className="space-y-4">
                                  {(savedLocationRates.length > 0
                                    ? savedLocationRates
                                    : shippingRates
                                  ).map((rate, idx) => {
                                    const tier =
                                      rate.tier ||
                                      classifyRate(
                                        rate,
                                        savedLocationRates.length > 0
                                          ? savedLocationRates
                                          : shippingRates,
                                      );
                                    const isSelected =
                                      selectedShipping?.service_name ===
                                      rate.service_name;
                                    const isFastest =
                                      fastestRate?.service_name ===
                                      rate.service_name;

                                    return (
                                      <div
                                        key={idx}
                                        onClick={() =>
                                          handleShippingSelect(rate)
                                        }
                                        className={`border p-4 py-6 rounded w-full cursor-pointer transition-all flex justify-between items-center ${
                                          isSelected
                                            ? "border-belims-blue bg-blue-50"
                                            : isFastest
                                              ? "border-orange-300 bg-orange-50"
                                              : "border-gray-200 hover:border-belims-blue hover:bg-gray-50"
                                        }`}
                                      >
                                        <div className="flex items-center gap-3 flex-1">
                                          {/* Radio Button */}
                                          <div className="flex-shrink-0">
                                            <div
                                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                                isSelected
                                                  ? "border-belims-blue bg-belims-blue"
                                                  : "border-gray-300 bg-white"
                                              }`}
                                            >
                                              {isSelected && (
                                                <div className="w-2 h-2 rounded-full bg-white" />
                                              )}
                                            </div>
                                          </div>
                                          {/* <Truck
                                          size={24}
                                          className={
                                            isSelected
                                              ? "text-belims-blue"
                                              : "text-gray-400"
                                          }
                                        /> */}
                                          <div>
                                            <div className="font-bold text-gray-900 flex items-center gap-2">
                                              {rate.service_name}
                                              {tier === "Express" && (
                                                <span className="inline-flex items-center gap-1 text-xs font-semibold bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                                                  <Zap size={12} /> Faster
                                                </span>
                                              )}
                                              {tier === "Economy" && (
                                                <span className="text-xs font-semibold bg-green-100 text-green-700 px-2 py-1 rounded-full">
                                                  Budget
                                                </span>
                                              )}
                                            </div>
                                            <div className="text-xs text-gray-500 mt-1">
                                              {formatEta(
                                                rate.expected_delivery_date,
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                        <div className="text-right">
                                          <div className="font-bold text-lg text-gray-900">
                                            {formatCurrency(rate.total_price)}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </>
                            ) : (
                              <p className="text-gray-500 text-center py-8">
                                No shipping options available.
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    <button
                      disabled={
                        loading ||
                        (deliveryType === "delivery" && !selectedShipping)
                      }
                      type="submit"
                      className="w-full bg-red-600 text-white h-12 font-semibold text-base font-heading p-4 rounded hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition flex justify-center items-center gap-2 !mt-8"
                    >
                      {loading ? (
                        <>
                          <Loader2 size={20} className="animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>Pay Now</>
                      )}
                    </button>
                  </form>
                </div>
              </>
            )}

            {step === "payment" &&
              (isReturnFlow ? (
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 space-y-6">
                  <h2 className="text-xl font-bold text-gray-900">
                    Verifying Payment
                  </h2>
                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                    <p className="text-sm text-gray-700 mb-2">
                      {loading
                        ? `We're confirming your payment with ${paymentProviderLabel}.`
                        : verificationMessage ||
                          "Payment is still pending. Please check back in a few minutes."}
                    </p>
                    <p className="text-xs text-gray-500">
                      Order ID: {returnOrderId}
                    </p>
                  </div>
                  {loading && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Loader2 className="animate-spin" size={18} />
                      Checking payment status...
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 space-y-6">
                  <h2 className="text-xl font-bold text-gray-900">
                    Review & Payment
                  </h2>

                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h3 className="font-bold text-gray-900 mb-3">
                      Order Summary
                    </h3>
                    <div className="space-y-2 text-sm text-gray-600">
                      <p>
                        <strong>Ship to:</strong> {customer.firstName}{" "}
                        {customer.lastName}
                      </p>
                      {deliveryType === "delivery" && (
                        <>
                          <p>
                            <strong>Address:</strong> {customer.address}
                          </p>
                          <p>
                            <strong>Method:</strong>{" "}
                            {selectedShipping?.service_name} (
                            {formatEta(
                              selectedShipping?.expected_delivery_date,
                            )}
                            )
                          </p>
                        </>
                      )}
                      {deliveryType === "pickup" && (
                        <p>
                          <strong>Method:</strong> Pickup (No delivery fee)
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={handlePlaceOrder}
                    disabled={loading || !selectedShipping}
                    className="w-full bg-green-600 text-white text-lg font-bold p-4 rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition flex justify-center items-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="animate-spin" size={20} />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard size={20} /> Pay {formatCurrency(total)}
                      </>
                    )}
                  </button>
                  <p className="text-center text-xs text-gray-500">
                    Secure Payment via PayFast/Yoco
                  </p>
                </div>
              ))}

            {step === "success" && (
              <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-100 text-center space-y-6">
                <div className="bg-green-100 text-green-600 w-24 h-24 rounded-full flex items-center justify-center mx-auto">
                  <Check size={48} />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">
                    Order Placed Successfully!
                  </h2>
                  <p className="text-gray-600">
                    Thank you for your purchase. A confirmation email has been
                    sent to <strong>{customer.email}</strong>.
                  </p>
                </div>
                <button
                  onClick={onBack}
                  className="bg-belims-blue text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700 transition inline-block"
                >
                  Return to Store
                </button>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Cart Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-[126px] space-y-5">
              <div className="bg-white rounded-lg border border-black/10 p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900">
                  Order Summary
                </h3>

                <ul className="mt-5 divide-y divide-gray-100 max-h-[320px] overflow-y-auto">
                  {cartItems.map((item) => (
                    <li key={item.id} className="flex items-center gap-4 py-4">
                      <img
                        src={item.image}
                        alt={item.name}
                        loading="lazy"
                        decoding="async"
                        className="h-14 w-14 rounded-lg object-cover bg-gray-100"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-gray-900 line-clamp-1">
                          {item.name}
                        </h4>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                          {item.category || "Uncategorized"} · {item.quantity}x
                        </p>
                        <p className="text-sm font-semibold text-gray-900 mt-1">
                          {formatCurrency(item.price * item.quantity)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>

                {/* <div className="mt-5 space-y-2">
                  <label className="text-xs text-gray-500">Promo Code</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter code"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      className="flex-1 rounded border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-belims-blue focus:border-transparent"
                    />
                    <button className="rounded border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50">
                      Apply
                    </button>
                  </div>
                </div> */}
              </div>

              <div className="bg-white rounded-lg border border-black/10 p-6 shadow-sm">
                <ul className="space-y-3 text-sm text-gray-600">
                  <li className="flex items-center justify-between">
                    <span>Subtotal</span>
                    <span className="font-semibold text-gray-900">
                      {formatCurrency(subtotal)}
                    </span>
                  </li>
                  <li className="flex items-center justify-between">
                    <div className="flex flex-col">
                      {deliveryType === "delivery" ? (
                        <>
                          <span>Shipping</span>
                          {selectedShipping && (
                            <span className="text-xs text-gray-500">
                              {selectedShipping.service_name}
                            </span>
                          )}
                        </>
                      ) : (
                        <>
                          <span>Pickup</span>
                          {pickupStore?.name && (
                            <span className="text-xs text-gray-500">
                              {pickupStore.name}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                    <span className="font-semibold text-gray-900">
                      {deliveryType === "delivery"
                        ? formatCurrency(shippingCost)
                        : formatCurrency(0)}
                    </span>
                  </li>
                </ul>
                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-900">
                    Total
                  </span>
                  <span className="text-base font-semibold text-gray-900">
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
