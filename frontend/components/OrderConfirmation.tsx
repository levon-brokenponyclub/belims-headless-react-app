import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle, XCircle, AlertCircle, Loader } from "lucide-react";
import { getApiBaseUrl } from "../services/wooCommerceService";

interface OrderDetails {
  id: number;
  order_number?: string;
  order_key?: string;
  status: string;
  total: string;
  currency?: string;
  payment_method?: string;
  date_created?: string;
  billing?: {
    first_name?: string;
    last_name?: string;
    email?: string;
  };
  line_items?: Array<{
    id: number;
    name: string;
    quantity: number;
    total: string;
  }>;
}

export const OrderConfirmation: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pollCount, setPollCount] = useState(0);

  const orderId = searchParams.get("order_id");
  const paymentStatus = searchParams.get("payment_status");
  const timestamp = searchParams.get("timestamp");
  const returnSource = searchParams.get("return_source");

  const fetchOrder = async (id: string) => {
    const apiUrl = getApiBaseUrl();
    const response = await fetch(`${apiUrl}/orders/${id}`, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch order: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  };

  // Initial fetch
  useEffect(() => {
    if (!orderId) {
      setError("No order ID provided");
      setLoading(false);
      return;
    }

    setLoading(true);
    fetchOrder(orderId)
      .then((data) => {
        setOrder(data);
        setError(null);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching order:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load order details",
        );
        setLoading(false);
      });
  }, [orderId]);

  // Poll for payment status updates if payment is pending
  useEffect(() => {
    if (
      !orderId ||
      !order ||
      order.status === "processing" ||
      order.status === "completed"
    ) {
      return; // Don't poll if already paid
    }

    // Poll every 3 seconds, max 20 times (60 seconds total)
    if (pollCount >= 20) {
        return; // Stop polling after 60 seconds
    }

    const timer = setTimeout(async () => {
      try {
        const data = await fetchOrder(orderId);
        setOrder(data);
        // If status changed to processing/completed, stop polling
        if (data.status !== "processing" && data.status !== "completed") {
          setPollCount(pollCount + 1);
        }
      } catch (err) {
        // Continue polling even on error
        console.error("Error polling order status:", err);
        setPollCount(pollCount + 1);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [orderId, order, pollCount]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader className="animate-spin text-belims-blue mb-4" size={48} />
        <p className="text-gray-600">Loading order details...</p>
      </div>
    );
  }

  if (error || !order) {
    // Fallback: show a basic confirmation using URL params even if
    // the detailed order API call fails.
    return (
      <div className="py-12 flex flex-col items-center">
        <div className="mb-8 p-6 rounded-lg border-2 bg-yellow-50 border-yellow-200 max-w-xl w-full">
          <div className="flex items-start gap-4">
            <AlertCircle className="text-yellow-600 flex-shrink-0" size={32} />
            <div>
              <h1 className="text-2xl font-bold mb-2 text-yellow-900">
                Order Received
              </h1>
              <p className="text-yellow-700 mb-2">
                Thank you for your order. We couldn't load full order details
                right now, but your order has been recorded.
              </p>
              {orderId && (
                <p className="text-sm text-yellow-800">
                  <span className="font-semibold">Reference:</span> #{orderId}
                </p>
              )}
              {paymentStatus && (
                <p className="text-sm text-yellow-800">
                  <span className="font-semibold">Payment status:</span>{" "}
                  {paymentStatus}
                </p>
              )}
              {timestamp && (
                <p className="text-xs text-yellow-800 mt-1">
                  <span className="font-semibold">Time:</span>{" "}
                  {new Date(parseInt(timestamp) * 1000).toLocaleString()}
                </p>
              )}
              {error && (
                <p className="text-xs text-yellow-800 mt-3">
                  <span className="font-semibold">Note:</span> {error}
                </p>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={() => navigate("/")}
          className="bg-belims-blue text-white px-6 py-2 rounded hover:bg-belims-blue/90 transition-colors"
        >
          Return Home
        </button>
      </div>
    );
  }

  const isSuccess =
    paymentStatus === "complete" ||
    order.status === "processing" ||
    order.status === "completed";
  const orderNumber = order.order_number || order.id;
  const orderDate = order.date_created
    ? new Date(order.date_created)
    : timestamp
      ? new Date(parseInt(timestamp) * 1000)
      : null;
  const lineItems = order.line_items || [];
  const hasBilling =
    Boolean(order.billing?.first_name) ||
    Boolean(order.billing?.last_name) ||
    Boolean(order.billing?.email);
  const paymentMethodLabel =
    order.payment_method ||
    (returnSource ? returnSource.toUpperCase() : "Online Payment");

  return (
    <div className="py-12">
      {/* Success/Failure Banner */}
      <div
        className={`mb-8 p-6 rounded-lg border-2 ${
          isSuccess
            ? "bg-green-50 border-green-200"
            : "bg-yellow-50 border-yellow-200"
        }`}
      >
        <div className="flex items-start gap-4">
          {isSuccess ? (
            <CheckCircle className="text-green-600 flex-shrink-0" size={32} />
          ) : (
            <AlertCircle className="text-yellow-600 flex-shrink-0" size={32} />
          )}
          <div>
            <h1
              className={`text-2xl font-bold mb-2 ${
                isSuccess ? "text-green-900" : "text-yellow-900"
              }`}
            >
              {isSuccess ? "Payment Received!" : "Order Pending"}
            </h1>
            <p
              className={`text-lg ${
                isSuccess ? "text-green-700" : "text-yellow-700"
              }`}
            >
              {isSuccess
                ? `Thank you for your order! Your payment has been confirmed.`
                : `Your order has been created and is awaiting payment confirmation.`}
            </p>
          </div>
        </div>
      </div>

      {/* Order Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Summary */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Order Summary
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Order Number:</span>
                <span className="font-bold text-gray-900">
                  #{orderNumber}
                </span>
              </div>
              {orderDate && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Order Date:</span>
                  <span className="text-gray-900">
                    {orderDate.toLocaleDateString()}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span
                  className={`font-bold px-3 py-1 rounded-full text-xs uppercase ${
                    isSuccess
                      ? "bg-green-100 text-green-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {order.status === "processing"
                    ? "Processing"
                    : order.status === "completed"
                      ? "Completed"
                      : "Pending"}
                </span>
              </div>
              <div className="flex justify-between pt-3 border-t border-gray-200">
                <span className="text-gray-600">Payment Method:</span>
                <span className="text-gray-900">{paymentMethodLabel}</span>
              </div>
              {timestamp && (
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Processed at:</span>
                  <span>
                    {new Date(parseInt(timestamp) * 1000).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Items */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Items Ordered
            </h2>
            {lineItems.length > 0 ? (
              <div className="space-y-3">
                {lineItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between py-3 border-b border-gray-100 last:border-b-0"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-sm text-gray-500">
                        Quantity: {item.quantity}
                      </p>
                    </div>
                    <p className="font-bold text-gray-900">{item.total}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                Item details will appear once your order is fully confirmed.
              </p>
            )}
          </div>

          {/* Billing Info */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Billing Details
            </h2>
            {hasBilling ? (
              <div className="space-y-2 text-sm">
                <p className="text-gray-900">
                  <span className="font-medium">
                    {order.billing?.first_name} {order.billing?.last_name}
                  </span>
                </p>
                {order.billing?.email && (
                  <p className="text-gray-600">{order.billing.email}</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                Billing details will appear once your order is confirmed.
              </p>
            )}
          </div>
        </div>

        {/* Order Total Card */}
        <div className="lg:col-span-1">
          <div className="bg-belims-blue text-white rounded-lg p-6 sticky top-6">
            <h3 className="font-bold mb-4 text-lg">Order Total</h3>
            <div className="space-y-3">
              <div className="text-2xl font-bold">{order.total}</div>
              {order.currency && (
                <div className="text-sm text-blue-100 opacity-75">
                  Currency: {order.currency.toUpperCase()}
                </div>
              )}
            </div>

            <div className="mt-6 pt-6 border-t border-blue-300">
              <p className="text-sm text-blue-100 mb-4">
                {isSuccess
                  ? "Your payment has been successfully processed. You will receive an email confirmation shortly."
                  : "Your order is pending payment. You will receive an update when payment is confirmed."}
              </p>
              <button
                onClick={() => navigate("/")}
                className="w-full bg-white text-belims-blue font-bold py-2 px-4 rounded hover:bg-blue-50 transition-colors"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Help Section */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="font-bold text-gray-900 mb-3">Questions?</h3>
        <p className="text-gray-600 mb-4">
          If you have any questions about your order, please don't hesitate to
          contact our customer support team.
        </p>
        <div className="flex gap-4">
          <a
            href="mailto:support@belims.com"
            className="text-belims-blue font-bold hover:underline"
          >
            Email Support
          </a>
          <span className="text-gray-300">|</span>
          <a
            href="tel:+1-800-123-4567"
            className="text-belims-blue font-bold hover:underline"
          >
            Call Us
          </a>
        </div>
      </div>
    </div>
  );
};
