import React, { useState, useEffect } from "react";
import { CartItem, Product } from "../types";
import { CURRENCY_SYMBOL } from "../constants";
import { getShippingRates } from "../services/bobGoService";
import { createWooOrder, initializePayment } from "../services/paymentService";
import { ArrowLeft, Check, Truck, CreditCard, Loader2 } from "lucide-react";

interface CheckoutProps {
  cartItems: CartItem[];
  onBack: () => void;
  onClearCart: () => void;
}

type CheckoutStep = "details" | "shipping" | "payment" | "success";

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

export const Checkout: React.FC<CheckoutProps> = ({
  cartItems,
  onBack,
  onClearCart,
}) => {
  const [step, setStep] = useState<CheckoutStep>("details");
  const [loading, setLoading] = useState(false);

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
  const [shippingRates, setShippingRates] = useState<any[]>([]);
  const [selectedShipping, setSelectedShipping] = useState<any>(null);

  // Totals
  const subtotal = cartItems.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0,
  );
  const shippingCost = selectedShipping ? selectedShipping.total_price : 0;
  const total = subtotal + shippingCost;

  // STEP 1: Details Submit -> Fetch Shipping
  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulate API call to BobGo
    try {
      const rates = await getShippingRates({
        destination_address: {
          street: customer.address,
          city: customer.city,
          province: customer.province,
          postal_code: customer.postalCode,
          country: "ZA",
        },
        parcels: cartItems.map((item) => ({
          weight: 1,
          dimensions: { length: 10, width: 10, height: 10 },
        })), // Mock weights
      });
      setShippingRates(rates);
      setStep("shipping");
    } catch (err) {
      alert("Failed to get shipping rates");
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: Shipping Selected -> Go to Payment
  const handleShippingSelect = (rate: any) => {
    setSelectedShipping(rate);
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
        shipping: selectedShipping,
        total,
      });

      if (!order) throw new Error("Order creation failed");

      // 2. Init Payment (Mock)
      // window.location.href = await initializePayment({ ... });

      // For soft launch mock:
      setTimeout(() => {
        setStep("success");
        onClearCart();
        setLoading(false);
      }, 1500);
    } catch (error) {
      alert("Order processing failed");
      setLoading(false);
    }
  };

  // RENDER HELPERS
  if (cartItems.length === 0 && step !== "success") {
    return (
      <div className="p-10 text-center">
        Your cart is empty.{" "}
        <button onClick={onBack} className="text-blue-600 underline">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8 pb-4 border-b">
        {step !== "success" && (
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <ArrowLeft />
          </button>
        )}
        <h1 className="text-2xl font-bold font-heading">
          {step === "details" && "Customer Details"}
          {step === "shipping" && "Shipping Method"}
          {step === "payment" && "Review & Payment"}
          {step === "success" && "Order Confirmed"}
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* LEFT COLUMN: Main Form */}
        <div className="md:col-span-2 space-y-6">
          {step === "details" && (
            <form onSubmit={handleDetailsSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input
                  required
                  placeholder="First Name"
                  className="border p-3 rounded w-full"
                  value={customer.firstName}
                  onChange={(e) =>
                    setCustomer({ ...customer, firstName: e.target.value })
                  }
                />
                <input
                  required
                  placeholder="Last Name"
                  className="border p-3 rounded w-full"
                  value={customer.lastName}
                  onChange={(e) =>
                    setCustomer({ ...customer, lastName: e.target.value })
                  }
                />
              </div>
              <input
                required
                type="email"
                placeholder="Email Address"
                className="border p-3 rounded w-full"
                value={customer.email}
                onChange={(e) =>
                  setCustomer({ ...customer, email: e.target.value })
                }
              />
              <input
                required
                placeholder="Phone Number"
                className="border p-3 rounded w-full"
                value={customer.phone}
                onChange={(e) =>
                  setCustomer({ ...customer, phone: e.target.value })
                }
              />

              <h3 className="font-bold pt-4">Shipping Address</h3>
              <input
                required
                placeholder="Street Address"
                className="border p-3 rounded w-full"
                value={customer.address}
                onChange={(e) =>
                  setCustomer({ ...customer, address: e.target.value })
                }
              />
              <div className="grid grid-cols-3 gap-4">
                <input
                  required
                  placeholder="City"
                  className="border p-3 rounded w-full"
                  value={customer.city}
                  onChange={(e) =>
                    setCustomer({ ...customer, city: e.target.value })
                  }
                />
                <select
                  required
                  className="border p-3 rounded w-full"
                  value={customer.province}
                  onChange={(e) =>
                    setCustomer({ ...customer, province: e.target.value })
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
                  className="border p-3 rounded w-full"
                  value={customer.postalCode}
                  onChange={(e) =>
                    setCustomer({ ...customer, postalCode: e.target.value })
                  }
                />
              </div>

              <button
                disabled={loading}
                type="submit"
                className="w-full bg-belims-blue text-white font-bold p-4 rounded hover:bg-blue-700 flex justify-center"
              >
                {loading ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  "Continue to Shipping"
                )}
              </button>
            </form>
          )}

          {step === "shipping" && (
            <div className="space-y-4">
              <p className="text-gray-600">
                Select a shipping method for delivery to{" "}
                <strong>
                  {customer.address}, {customer.city}
                </strong>
              </p>
              {shippingRates.map((rate, idx) => (
                <div
                  key={idx}
                  onClick={() => handleShippingSelect(rate)}
                  className="border p-4 rounded-lg cursor-pointer hover:border-belims-blue hover:bg-blue-50 flex justify-between items-center transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Truck className="text-gray-500" />
                    <div>
                      <div className="font-bold text-gray-900">
                        {rate.service_name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {rate.expected_delivery_date}
                      </div>
                    </div>
                  </div>
                  <div className="font-bold text-lg">
                    {CURRENCY_SYMBOL}
                    {rate.total_price.toFixed(2)}
                  </div>
                </div>
              ))}
              {shippingRates.length === 0 && (
                <p>No shipping rates available.</p>
              )}
            </div>
          )}

          {step === "payment" && (
            <div className="space-y-6">
              <div className="bg-gray-50 p-4 rounded border">
                <h3 className="font-bold mb-2">Order Summary</h3>
                <p className="text-sm">
                  Ship to: {customer.firstName} {customer.lastName},{" "}
                  {customer.address}
                </p>
                <p className="text-sm">
                  Method: {selectedShipping.service_name}
                </p>
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={loading}
                className="w-full bg-green-600 text-white text-xl font-bold p-5 rounded hover:bg-green-700 flex justify-center items-center gap-2"
              >
                {loading ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <>
                    <CreditCard /> Pay {CURRENCY_SYMBOL}
                    {total.toFixed(2)}
                  </>
                )}
              </button>
              <p className="text-center text-xs text-gray-400">
                Secure Payment via PayFast/Yoco
              </p>
            </div>
          )}

          {step === "success" && (
            <div className="text-center py-12">
              <div className="bg-green-100 text-green-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check size={40} />
              </div>
              <h2 className="text-3xl font-bold mb-4">
                Order Placed Successfully!
              </h2>
              <p className="text-gray-600 mb-8">
                Thank you for your purchase. A confirmation email has been sent
                to {customer.email}.
              </p>
              <button
                onClick={onBack}
                className="bg-belims-blue text-white px-8 py-3 rounded font-bold"
              >
                Return to Store
              </button>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Cart Summary */}
        <div className="hidden md:block bg-gray-50 p-6 rounded-xl h-fit sticky top-10">
          <h3 className="font-bold mb-4 text-gray-700">Your Cart</h3>
          <div className="space-y-3 mb-6 max-h-[300px] overflow-y-auto">
            {cartItems.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <div className="flex gap-2">
                  <div className="w-6 h-6 bg-white border rounded text-xs flex items-center justify-center font-bold text-gray-500">
                    {item.quantity}
                  </div>
                  <span className="truncate max-w-[150px]">{item.name}</span>
                </div>
                <div>
                  {CURRENCY_SYMBOL}
                  {(item.price * item.quantity).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
          <div className="border-t pt-4 space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>
                {CURRENCY_SYMBOL}
                {subtotal.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Shipping</span>
              <span>
                {selectedShipping
                  ? `${CURRENCY_SYMBOL}${shippingCost.toFixed(2)}`
                  : "--"}
              </span>
            </div>
            <div className="flex justify-between font-bold text-lg text-gray-900 border-t pt-2 mt-2">
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
  );
};
