import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CartItem, Product, ShippingAddress } from "../types";
import { CURRENCY_SYMBOL } from "../constants";
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
  if (!dateStr) return "Estimated delivery";
  try {
    const date = new Date(dateStr);
    return `Arrives ${date.toLocaleDateString("en-ZA", { month: "short", day: "numeric" })}`;
  } catch {
    return "Estimated delivery";
  }
}

export const Checkout: React.FC<CheckoutProps> = ({
  cartItems,
  onBack,
  onClearCart,
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
          <h1 className="text-3xl font-bold text-gray-900">
            {step === "success" ? "Order Confirmed" : "Checkout"}
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* LEFT COLUMN: Checkout Form */}
          <div className="lg:col-span-2 space-y-6">
            {step === "details" && (
              <>
                {/* Delivery/Pickup Toggle Card */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900">
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
                        className="border border-gray-200 p-3 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-belims-blue focus:border-transparent"
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
                        className="border border-gray-200 p-3 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-belims-blue focus:border-transparent"
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
                      className="border border-gray-200 p-3 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-belims-blue focus:border-transparent"
                      value={customer.email}
                      onChange={(e) =>
                        setCustomer({ ...customer, email: e.target.value })
                      }
                    />
                    <input
                      required
                      placeholder="Phone Number"
                      className="border border-gray-200 p-3 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-belims-blue focus:border-transparent"
                      value={customer.phone}
                      onChange={(e) =>
                        setCustomer({ ...customer, phone: e.target.value })
                      }
                    />

                    {/* Conditional shipping address field */}
                    {deliveryType === "delivery" && (
                      <>
                        <div className="flex items-center justify-between pt-4">
                          <h3 className="font-bold text-gray-900">
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
                          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex justify-between items-center">
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
                                  className="border border-gray-300 p-3 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-belims-blue focus:border-transparent"
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
                                  className="border border-gray-300 p-3 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-belims-blue focus:border-transparent"
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
                          className="border border-gray-200 p-3 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-belims-blue focus:border-transparent"
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
                            className="border border-gray-200 p-3 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-belims-blue focus:border-transparent"
                            value={customer.city}
                            onChange={(e) =>
                              setCustomer({ ...customer, city: e.target.value })
                            }
                          />
                          <select
                            required
                            className="border border-gray-200 p-3 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-belims-blue focus:border-transparent"
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
                            className="border border-gray-200 p-3 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-belims-blue focus:border-transparent"
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
                    {deliveryType === "delivery" &&
                      customer.address &&
                      customer.city &&
                      customer.province && (
                        <div className="border-t border-gray-200 pt-6 mt-6">
                          <h3 className="text-lg font-bold text-gray-900 mb-4">
                            Choose Delivery Option
                          </h3>
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
                              <div className="space-y-0 flex gap-6">
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
                                      onClick={() => handleShippingSelect(rate)}
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
                                          {/* <div className="text-xs text-gray-500 mt-1">
                                            {formatEta(
                                              rate.expected_delivery_date,
                                            )}
                                          </div> */}
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <div className="font-bold text-lg text-gray-900">
                                          {CURRENCY_SYMBOL}
                                          {rate.total_price.toFixed(2)}
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
                        </div>
                      )}

                    <button
                      disabled={
                        loading ||
                        (deliveryType === "delivery" && !selectedShipping)
                      }
                      type="submit"
                      className="w-full bg-red-600 text-white font-semibold text-base font-heading p-4 rounded hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition flex justify-center items-center gap-2 mt-6"
                    >
                      {loading ? (
                        <>
                          <Loader2 size={20} className="animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          Proceed to Payment <CreditCard size={20} />
                        </>
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
                        <CreditCard size={20} /> Pay {CURRENCY_SYMBOL}
                        {total.toFixed(2)}
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
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 sticky top-6 space-y-6">
              <h3 className="text-xl font-bold text-gray-900">Order Summary</h3>

              {/* Cart Items */}
              <div className="space-y-3 max-h-[250px] overflow-y-auto border-b border-gray-200 pb-4">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <div className="flex gap-2 flex-1">
                      <div className="w-6 h-6 bg-gray-100 border border-gray-300 rounded text-xs flex items-center justify-center font-bold text-gray-700">
                        {item.quantity}
                      </div>
                      <span className="truncate max-w-[150px] text-gray-700">
                        {item.name}
                      </span>
                    </div>
                    <div className="font-semibold text-gray-900">
                      {CURRENCY_SYMBOL}
                      {(item.price * item.quantity).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Promo Code */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700">
                  Promo Code
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter code"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    className="flex-1 border border-gray-200 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-belims-blue focus:border-transparent"
                  />
                  <button className="bg-gray-200 text-gray-700 font-semibold px-4 py-2 rounded-lg hover:bg-gray-300 transition text-sm">
                    Apply
                  </button>
                </div>
              </div>

              {/* Totals */}
              <div className="space-y-3 border-t border-gray-200 pt-4">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span>
                    {CURRENCY_SYMBOL}
                    {subtotal.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <div className="flex flex-col">
                    <span>
                      {deliveryType === "delivery" ? "Delivery" : "Pickup"}
                    </span>
                    {selectedShipping && (
                      <span className="text-xs text-gray-500 font-medium">
                        {selectedShipping.service_name}
                      </span>
                    )}
                  </div>
                  <span className="font-semibold">
                    {shippingCost > 0 || deliveryType === "delivery"
                      ? `${CURRENCY_SYMBOL}${shippingCost.toFixed(2)}`
                      : `${CURRENCY_SYMBOL}0.00`}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-lg text-gray-900 border-t border-gray-200 pt-3 mt-3">
                  <span>Total</span>
                  <span>
                    {CURRENCY_SYMBOL}
                    {total.toFixed(2)}
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
