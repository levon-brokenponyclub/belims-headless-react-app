import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import {
  AlertCircle,
  CalendarDays,
  Check,
  ChevronDown,
  Package,
  Truck,
} from "lucide-react";
import { getApiBaseUrl } from "../services/wooCommerceService";
import { OrderDetailsView } from "./OrderDetailsView";
import { formatNumberWithSeparators } from "../utils/price";
import {
  registerUser,
  saveBillingAddress,
  saveShippingAddress,
} from "../services/authService";

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
    address_1?: string;
    address_2?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
    phone?: string;
  };
  shipping?: {
    first_name?: string;
    last_name?: string;
    address_1?: string;
    address_2?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
  shipping_total?: string;
  total_tax?: string;
  line_items?: Array<{
    id: number;
    product_id?: number;
    name: string;
    quantity: number;
    total: string;
    category?: string;
    categories?: Array<{
      id?: number;
      name?: string;
      slug?: string;
    }>;
    meta_data?: Array<{
      key?: string;
      value?: unknown;
      display_key?: string;
      display_value?: unknown;
    }>;
  }>;
}

const ESTIMATED_DELIVERY_DAYS = 5;
const PRIMARY_TINT = "bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)]";

export const OrderConfirmation: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pollCount, setPollCount] = useState(0);
  const [accountCreationMessage, setAccountCreationMessage] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const orderId = searchParams.get("order_id");
  const orderKey = searchParams.get("order_key") || "";
  const paymentStatus = searchParams.get("payment_status");
  const timestamp = searchParams.get("timestamp");
  const returnSource = searchParams.get("return_source");

  const fetchOrder = async (id: string) => {
    const apiUrl = getApiBaseUrl();
    const response = await fetch(`${apiUrl}/orders/${id}?key=${encodeURIComponent(orderKey)}`, {
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

  // Create user account after successful payment if they opted in during checkout
  useEffect(() => {
    if (!orderId || !order) return;

    const isPaid =
      order.status === "processing" ||
      order.status === "completed" ||
      paymentStatus === "complete";

    if (!isPaid) return;

    const pendingAccountData = localStorage.getItem("pendingAccountCreation");
    if (!pendingAccountData) return;

    let cancelled = false;

    const createAccount = async () => {
      try {
        const accountData = JSON.parse(pendingAccountData);
        // Only create account if it matches this order
        if (accountData.orderId !== orderId) return;

        const result = await registerUser({
          email: accountData.email,
          password: accountData.password,
          first_name: accountData.firstName,
          last_name: accountData.lastName,
          phone: accountData.phone,
        });

        if (!cancelled && result.success) {
          if (accountData.shippingAddress?.street) {
            const address = {
              ...accountData.shippingAddress,
              country: "ZA" as const,
            };
            await Promise.allSettled([
              saveBillingAddress(address),
              saveShippingAddress(address),
            ]);
          }
          localStorage.removeItem("pendingAccountCreation");
          setAccountCreationMessage(
            `Account created successfully! You can now log in with ${accountData.email}`,
          );
        }
      } catch (accountError) {
        console.error("Post-payment account creation error:", accountError);
        if (!cancelled) {
          setAccountCreationMessage(
            "Order confirmed, but we couldn't create your account automatically. Please contact support.",
          );
        }
      }
    };

    createAccount();

    return () => {
      cancelled = true;
    };
  }, [orderId, order, paymentStatus]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <motion.div
          role="status"
          aria-label="Loading order details"
          className="mb-4 h-[50px] w-[50px] rounded-full border-4 border-border border-t-primary will-change-transform"
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        />
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

  const orderNumberStr = String(order.order_number || order.id);
  const formattedDate = orderDate
    ? orderDate.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "Pending";

  const billingAddr = [
    `${order.billing?.first_name || ""} ${order.billing?.last_name || ""}`.trim(),
    order.billing?.address_1 || "",
    `${order.billing?.city || ""}${order.billing?.city && order.billing?.postcode ? ", " : ""}${order.billing?.postcode || ""}`,
  ].filter((line) => line.length > 0);

  // If we have fewer than 3 lines, pad it
  while (billingAddr.length < 3) billingAddr.push("");

  const resolveCategory = (item: {
    category?: string;
    categories?: Array<{ name?: string }>;
    meta_data?: Array<{
      key?: string;
      value?: unknown;
      display_value?: unknown;
    }>;
  }) => {
    if (item.category && item.category.trim()) return item.category;

    const categoryNames = (item.categories || [])
      .map((cat) => cat.name?.trim())
      .filter((name): name is string => Boolean(name));
    if (categoryNames.length > 0) return categoryNames.join(", ");

    const categoryMeta = (item.meta_data || []).find((meta) => {
      const key = (meta.key || "").toLowerCase();
      return key.includes("category") || key.includes("product_cat");
    });

    const metaValue = categoryMeta?.display_value ?? categoryMeta?.value;

    if (typeof metaValue === "string" && metaValue.trim()) return metaValue;
    if (Array.isArray(metaValue)) {
      const values = metaValue
        .map((entry) => {
          if (typeof entry === "string") return entry.trim();
          if (
            entry &&
            typeof entry === "object" &&
            "name" in entry &&
            typeof (entry as { name?: unknown }).name === "string"
          ) {
            return ((entry as { name: string }).name || "").trim();
          }
          return "";
        })
        .filter(Boolean);
      if (values.length > 0) return values.join(", ");
    }

    return "Uncategorized";
  };

  const itemsMapped = lineItems.map((item) => ({
    id: item.id,
    name: item.name,
    price: `${order.currency === "ZAR" ? "R" : order.currency || "$"} ${formatNumberWithSeparators(parseFloat(item.total || "0"))}`,
    quantity: item.quantity,
    description: "Standard hardware item",
    category: resolveCategory(item),
    image: "https://via.placeholder.com/150", // Placeholder
    status:
      order.status === "processing"
        ? "Processing"
        : order.status === "completed"
          ? "Delivered"
          : "Order placed",
    statusDate: formattedDate,
    address: billingAddr,
    email: order.billing?.email || "",
    phone: order.billing?.phone || "",
  }));

  const shortDate = (date: Date) => date.toLocaleDateString("en-US");
  const estimatedDelivery = orderDate
    ? new Date(orderDate.getTime() + ESTIMATED_DELIVERY_DAYS * 86_400_000)
    : null;

  const statusSteps = [
    { icon: Package, title: "Processing", body: "Your order is being prepared" },
    { icon: Truck, title: "Shipping", body: "You'll receive tracking info soon" },
    {
      icon: CalendarDays,
      title: "Estimated Delivery",
      body: estimatedDelivery ? shortDate(estimatedDelivery) : "To be confirmed",
    },
  ];

  const currencyPrefix = order.currency === "ZAR" ? "R" : order.currency || "$";
  const subtotalValue =
    parseFloat(order.total) -
    parseFloat(order.shipping_total || "0") -
    parseFloat(order.total_tax || "0");

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 lg:py-16">
      {accountCreationMessage && (
        <div className="mb-8 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">
          {accountCreationMessage}
        </div>
      )}

      <header className="flex flex-col items-center text-center">
        <div className={`flex h-20 w-20 items-center justify-center rounded-full ${PRIMARY_TINT} text-primary`}>
          <Check size={36} strokeWidth={2.5} />
        </div>
        <h1 className="mt-6 font-heading text-3xl font-bold text-text md:text-4xl">
          Order Confirmed!
        </h1>
        <p className="mt-3 text-base text-text-secondary md:text-lg">
          Thank you for your purchase. Your order has been received and is
          being processed.
        </p>
      </header>

      <section className="mt-10 rounded-xl border border-border bg-surface p-6 md:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-heading text-lg font-bold text-text md:text-xl">
              Order #{orderNumberStr}
            </h2>
            <p className="mt-1 text-text-secondary">
              Placed on {orderDate ? shortDate(orderDate) : "Pending"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowDetails((open) => !open)}
            aria-expanded={showDetails}
            aria-controls="order-confirmation-details"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 font-heading font-semibold text-primary-on transition-opacity hover:opacity-90"
          >
            {showDetails ? "Hide Order Details" : "View Order Details"}
            <ChevronDown
              size={18}
              className={`transition-transform duration-200 ${showDetails ? "rotate-180" : ""}`}
            />
          </button>
        </div>

        <div className="mt-6 grid gap-8 border-t border-border pt-8 sm:grid-cols-3">
          {statusSteps.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex flex-col items-center text-center">
              <div className={`flex h-12 w-12 items-center justify-center rounded-full ${PRIMARY_TINT} text-primary`}>
                <Icon size={22} />
              </div>
              <h3 className="mt-4 font-heading text-lg font-semibold text-text">
                {title}
              </h3>
              <p className="mt-2 text-sm text-text-secondary">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {showDetails && (
        <div id="order-confirmation-details" className="mt-6">
          <OrderDetailsView
            summaryOnly
            orderNumber={orderNumberStr}
            date={formattedDate}
            total={`${currencyPrefix} ${formatNumberWithSeparators(parseFloat(order.total))}`}
            subtotal={`${currencyPrefix} ${formatNumberWithSeparators(subtotalValue)}`}
            shipping={`${currencyPrefix} ${formatNumberWithSeparators(parseFloat(order.shipping_total || "0"))}`}
            tax={`${currencyPrefix} ${formatNumberWithSeparators(parseFloat(order.total_tax || "0"))}`}
            items={itemsMapped}
            billingAddress={billingAddr}
            payment={{
              type: paymentMethodLabel,
              last4: "xxxx",
              expires: "xx / xx",
            }}
          />
        </div>
      )}

      <section className="mt-12 text-center">
        <h2 className="font-heading text-2xl font-bold text-text md:text-3xl">
          What's Next?
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-base text-text-secondary md:text-lg">
          You will receive an email confirmation with your order details and
          tracking information once your order ships.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
          <button
            type="button"
            onClick={() => navigate("/shop")}
            className="rounded-lg bg-primary px-8 py-3 font-heading font-semibold text-primary-on transition-opacity hover:opacity-90"
          >
            Continue Shopping
          </button>
          <button
            type="button"
            onClick={() => navigate("/track-order")}
            className="rounded-lg border border-border bg-surface px-8 py-3 font-heading font-semibold text-text transition-colors hover:bg-surface-muted"
          >
            Need Help?
          </button>
        </div>
      </section>
    </div>
  );
};
