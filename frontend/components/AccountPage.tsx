import React, { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  User,
  Package,
  MapPin,
  CreditCard,
  LogOut,
  Settings,
  ChevronRight,
  Clock,
  Truck,
  PlusCircle,
  Heart,
  Trash2,
  ShoppingCart,
} from "lucide-react";
import {
  getWishlist,
  removeFromWishlist,
  WishlistItem,
} from "../services/wishlistService";
import { buildProductUrl } from "../utils/product";
import {
  UserData,
  updateUserProfile,
  saveBillingAddress,
  saveShippingAddress,
  clearBillingAddress,
  clearShippingAddress,
} from "../services/authService";
import { fetchCustomerOrders } from "../services/wooCommerceService";
import { ShippingAddress, Order } from "../types";
import { CURRENCY_SYMBOL } from "../constants";
import { formatNumberWithSeparators } from "../utils/price";
import { saveStoredAddress } from "../services/shippingAddress";

interface AccountPageProps {
  user: UserData | null;
  onLogout: () => void;
  addToCart?: (product: any) => void;
}

type Tab = "dashboard" | "orders" | "addresses" | "payment" | "details" | "wishlist";

const VALID_TABS: Tab[] = ["dashboard", "orders", "addresses", "payment", "details", "wishlist"];

export const AccountPage: React.FC<AccountPageProps> = ({ user, onLogout, addToCart }) => {
  const navigate = useNavigate();
  const { tab: tabParam } = useParams<{ tab?: string }>();
  const activeTab: Tab = VALID_TABS.includes(tabParam as Tab) ? (tabParam as Tab) : "dashboard";
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);
  const [detailsMessage, setDetailsMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [addressSaveMessage, setAddressSaveMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<"billing" | "shipping" | null>(null);
  const [removingAddress, setRemovingAddress] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [defaultAddressKey, setDefaultAddressKey] = useState<"billing" | "shipping">(() => {
    const stored = localStorage.getItem("belims_default_address_key");
    return stored === "billing" || stored === "shipping" ? stored : "billing";
  });
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>(() => getWishlist());

  useEffect(() => {
    const refresh = () => setWishlistItems(getWishlist());
    window.addEventListener("belims:wishlist-updated", refresh);
    return () => window.removeEventListener("belims:wishlist-updated", refresh);
  }, []);

  // Form state for account details
  const [formData, setFormData] = useState({
    first_name: user?.first_name || "",
    last_name: user?.last_name || "",
    display_name: user?.display_name || "",
    phone: user?.phone || "",
  });

  // Fetch orders on component mount
  useEffect(() => {
    const loadOrders = async () => {
      if (!user) return;
      setLoadingOrders(true);
      try {
        const fetchedOrders = await fetchCustomerOrders();
        setOrders(Array.isArray(fetchedOrders) ? fetchedOrders : []);
      } catch (error) {
        console.error("Failed to load orders:", error);
        setOrders([]);
      } finally {
        setLoadingOrders(false);
      }
    };

    loadOrders();
  }, [user]);

  // Update form data when user changes
  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        display_name: user.display_name || "",
        phone: user.phone || "",
      });
    }
  }, [user]);

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingDetails(true);
    setDetailsMessage(null);

    try {
      const result = await updateUserProfile(formData);
      setDetailsMessage({
        type: "success",
        text: result.message || "Account details updated successfully!",
      });

      // Update local form state immediately from the server response
      if (result.user) {
        setFormData({
          first_name: result.user.first_name || "",
          last_name: result.user.last_name || "",
          display_name: result.user.display_name || "",
          phone: result.user.phone || "",
        });
      }

      // Notify parent to refresh currentUser state
      window.dispatchEvent(new Event("user-updated"));
    } catch (error: any) {
      setDetailsMessage({
        type: "error",
        text: error.message || "Failed to update account details.",
      });
    } finally {
      setSavingDetails(false);
    }
  };

  const handleSetDefault = (type: "billing" | "shipping") => {
    if (!user) return;
    const billing = user.billing;
    const shipping = user.shipping;

    let address: ShippingAddress | null = null;
    if (type === "billing" && billing) {
      address = {
        street: billing.address_1 || "",
        city: billing.city || "",
        province: billing.state || "",
        postalCode: billing.postcode || "",
        country: "ZA",
        label: [billing.address_1, billing.city, billing.state, billing.postcode].filter(Boolean).join(", "),
      };
    } else if (type === "shipping" && shipping) {
      address = {
        street: shipping.address_1 || "",
        city: shipping.city || "",
        province: shipping.state || "",
        postalCode: shipping.postcode || "",
        country: "ZA",
        label: [shipping.address_1, shipping.city, shipping.state, shipping.postcode].filter(Boolean).join(", "),
      };
    }

    if (!address) return;

    saveStoredAddress(address);
    localStorage.setItem("belims_default_address_key", type);
    localStorage.setItem("fulfillmentType", "delivery");
    setDefaultAddressKey(type);
    window.dispatchEvent(new Event("belims:delivery-address-updated"));
    window.dispatchEvent(new Event("belims:fulfillment-changed"));
    setAddressSaveMessage({ type: "success", text: "Default delivery address updated." });
  };

  const handleAddNewAddress = (type: "billing" | "shipping", mode: "add" | "edit" = "add") => {
    setAddressSaveMessage(null);
    navigate(
      `/delivery-details/add-address?context=account&type=${type}&mode=${mode}`,
    );
  };

  const handleRemoveAddress = async (type: "billing" | "shipping") => {
    setRemovingAddress(true);
    setAddressSaveMessage(null);
    try {
      if (type === "billing") {
        await clearBillingAddress();
      } else {
        await clearShippingAddress();
      }
      window.dispatchEvent(new Event("user-updated"));
      setAddressSaveMessage({ type: "success", text: "Address removed." });
    } catch (error: any) {
      setAddressSaveMessage({ type: "error", text: error.message || "Failed to remove address." });
    } finally {
      setRemovingAddress(false);
      setConfirmRemove(null);
    }
  };

  if (!user) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-4 text-center">
        <User size={48} className="text-gray-300 mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">My Account</h2>
        <p className="text-gray-600 mb-6">
          Please log in to view your account details.
        </p>
        <a
          href="/login"
          className="bg-belims-blue text-white px-8 py-3 rounded font-bold hover:bg-belims-light transition-all"
        >
          Log In
        </a>
      </div>
    );
  }

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: <Settings size={20} /> },
    { id: "orders", label: "Orders", icon: <Package size={20} /> },
    { id: "addresses", label: "Addresses", icon: <MapPin size={20} /> },
    { id: "payment", label: "Payment Methods", icon: <CreditCard size={20} /> },
    { id: "details", label: "Account Details", icon: <User size={20} /> },
    {
      id: "wishlist",
      label: "Wishlist",
      icon: <Heart size={20} />,
      badge: wishlistItems.length > 0 ? wishlistItems.length : undefined,
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-50 text-green-700 border-green-100";
      case "processing":
      case "on-hold":
        return "bg-blue-50 text-blue-700 border-blue-100";
      case "pending":
        return "bg-yellow-50 text-yellow-700 border-yellow-100";
      case "cancelled":
      case "failed":
        return "bg-red-50 text-red-700 border-red-100";
      default:
        return "bg-gray-50 text-gray-600 border-gray-200";
    }
  };

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1).replace("-", " ");
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const activeOrderCount = orders.filter(
    (o) => o.status === "processing" || o.status === "on-hold",
  ).length;

  const renderWishlist = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 sm:px-0 px-4">
        <Heart size={20} className="text-red-500 fill-red-500" />
        <h3 className="font-semibold text-gray-900 text-lg">My Wishlist</h3>
        {wishlistItems.length > 0 && (
          <span className="ml-1 rounded-full bg-belims-blue px-2 py-0.5 text-xs font-bold text-white">
            {wishlistItems.length}
          </span>
        )}
      </div>

      {wishlistItems.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <Heart size={48} className="mb-3 text-gray-200" />
          <p className="font-semibold text-gray-400">Your wishlist is empty</p>
          <p className="mt-1 text-sm text-gray-400">
            Tap the ♡ on any product to save it here.
          </p>
          <button
            onClick={() => navigate("/")}
            className="mt-5 rounded-full bg-belims-blue px-6 py-2 text-sm font-semibold text-white hover:bg-belims-accent transition-colors"
          >
            Browse products
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {wishlistItems.map((item) => {
            const productUrl = buildProductUrl({ name: item.name, slug: item.slug, id: item.id, category: item.category });
            return (
              <div
                key={item.id}
                className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => navigate(productUrl)}
                  className="h-16 w-16 shrink-0 rounded-lg border border-gray-100 bg-gray-50 flex items-center justify-center overflow-hidden"
                >
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="h-full w-full object-contain p-1 mix-blend-multiply" />
                  ) : (
                    <Heart size={20} className="text-gray-200" />
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  {item.brand && (
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">{item.brand}</p>
                  )}
                  <button
                    type="button"
                    onClick={() => navigate(productUrl)}
                    className="text-left text-sm font-semibold text-gray-900 hover:text-belims-blue line-clamp-2"
                  >
                    {item.name}
                  </button>
                  <p className="mt-0.5 font-bold text-gray-900 text-sm">
                    {item.price > 0 ? `${CURRENCY_SYMBOL}${Number(item.price).toFixed(2)}` : ""}
                  </p>
                </div>
                <div className="shrink-0 flex flex-col items-end gap-2">
                  {addToCart && (
                    <button
                      type="button"
                      onClick={() => addToCart({
                        id: item.id,
                        name: item.name,
                        sku: item.sku,
                        price: item.price,
                        regular_price: item.price,
                        sale_price: null,
                        image: item.image || "",
                        slug: item.slug,
                        category: item.category || "",
                        brand: item.brand,
                        stock_status: "instock",
                        stock_quantity: null,
                        short_description: "",
                        description: "",
                        features: [],
                        breadcrumbs: [],
                      })}
                      className="flex items-center gap-1.5 rounded-full bg-belims-blue px-3 py-1.5 text-xs font-semibold text-white hover:bg-belims-accent transition-colors"
                    >
                      <ShoppingCart size={12} />
                      Add to cart
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => { removeFromWishlist(item.id); setWishlistItems(getWishlist()); }}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors"
                    aria-label="Remove from wishlist"
                  >
                    <Trash2 size={13} />
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-2 bg-blue-50 text-belims-blue rounded-lg">
              <Package size={24} />
            </div>
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Total Orders</h3>
          </div>
          <p className="text-3xl font-bold text-belims-blue">
            {loadingOrders ? "-" : orders.length}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-2 bg-green-50 text-green-600 rounded-lg">
              <Clock size={24} />
            </div>
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Active Orders</h3>
          </div>
          <p className="text-3xl font-bold text-green-600">
            {loadingOrders ? "-" : activeOrderCount}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-2 bg-orange-50 text-belims-accent rounded-lg">
              <CreditCard size={24} />
            </div>
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Account Balance</h3>
          </div>
          <p className="text-3xl font-bold text-belims-accent">
            {CURRENCY_SYMBOL}
            {formatNumberWithSeparators(0)}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-base font-semibold text-gray-900">Recent Orders</h3>
          <button
            onClick={() => navigate("/account/orders")}
            className="text-belims-blue text-sm font-semibold hover:underline flex items-center gap-1"
          >
            View All <ChevronRight size={16} />
          </button>
        </div>
        <div className="divide-y divide-gray-100">
          {loadingOrders ? (
            <div className="p-6 text-center text-gray-500">
              Loading orders...
            </div>
          ) : orders.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No orders yet</div>
          ) : (
            orders.slice(0, 3).map((order) => (
              <div
                key={order.id}
                className="p-6 hover:bg-gray-50 transition-colors cursor-pointer group"
              >
                <div className="flex flex-wrap justify-between items-center gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center text-gray-400 group-hover:bg-white group-hover:shadow-sm transition-all">
                      <Package size={24} />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">
                        Order #{order.order_number}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatDate(order.date_created)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="hidden md:block">
                      <p className="text-sm font-medium text-gray-900">
                        {order.currency || "ZAR"}{" "}
                        {formatNumberWithSeparators(parseFloat(order.total))}
                      </p>
                      <p className="text-xs text-gray-500">
                        {order.line_items.length} item
                        {order.line_items.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div
                      className={`px-3 py-1 text-xs font-bold rounded-full border uppercase tracking-wide ${getStatusColor(
                        order.status,
                      )}`}
                    >
                      {getStatusLabel(order.status)}
                    </div>
                    <Link
                      to={`/track-order?order-number=${order.order_number}`}
                      className="text-belims-blue text-xs font-bold hover:underline uppercase tracking-wide whitespace-nowrap"
                    >
                      Track
                    </Link>
                    <ChevronRight
                      size={20}
                      className="text-gray-300 group-hover:text-belims-blue transition-colors"
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  const renderOrderDetail = (order: Order) => {
    const shippingCost = parseFloat(order.shipping_lines?.[0]?.total || "0");
    const subtotal = order.line_items.reduce((acc, item) => acc + parseFloat(item.total), 0);
    const addr = order.shipping_address;
    const addrLine = [addr?.street, addr?.city, addr?.province, addr?.postalCode].filter(Boolean).join(", ");
    return (
      <div className="space-y-5">
        {/* Back + header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedOrder(null)}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            <ChevronRight size={16} className="rotate-180" /> Orders
          </button>
          <span className="text-gray-300">/</span>
          <span className="text-sm font-semibold text-gray-700">#{order.order_number}</span>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Order header */}
          <div className="p-5 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-bold text-gray-900 text-lg">Order #{order.order_number}</p>
              <p className="text-sm text-gray-500 mt-0.5">Placed on {formatDate(order.date_created)}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider border ${getStatusColor(order.status)}`}>
                {getStatusLabel(order.status)}
              </span>
              <Link
                to={`/track-order?order-number=${order.order_number}`}
                className="text-belims-blue text-xs font-bold hover:underline uppercase tracking-wide"
              >
                Track
              </Link>
            </div>
          </div>

          {/* Line items */}
          <div className="divide-y divide-gray-100">
            {order.line_items.map((item) => (
              <div key={item.id} className="flex items-center gap-4 p-4">
                <div className="h-14 w-14 shrink-0 rounded-lg border border-gray-100 bg-gray-50 flex items-center justify-center overflow-hidden">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="h-full w-full object-contain p-1 mix-blend-multiply" />
                  ) : (
                    <Package size={20} className="text-gray-300" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-900 line-clamp-2">{item.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Qty: {item.quantity}</p>
                </div>
                <p className="font-bold text-sm text-gray-900 shrink-0">
                  {order.currency || "ZAR"} {formatNumberWithSeparators(parseFloat(item.total))}
                </p>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t border-gray-100 p-5 space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span>
              <span>{order.currency || "ZAR"} {formatNumberWithSeparators(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Shipping</span>
              <span>{shippingCost === 0 ? "Free" : `${order.currency || "ZAR"} ${formatNumberWithSeparators(shippingCost)}`}</span>
            </div>
            <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-100">
              <span>Total</span>
              <span>{order.currency || "ZAR"} {formatNumberWithSeparators(parseFloat(order.total))}</span>
            </div>
          </div>
        </div>

        {/* Delivery + Payment */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Delivery address</p>
            {addrLine ? (
              <p className="text-sm text-gray-700 leading-relaxed">{addrLine}</p>
            ) : (
              <p className="text-sm text-gray-400">Not available</p>
            )}
            {order.shipping_lines?.length > 0 && (
              <p className="text-xs text-gray-500 mt-2 font-medium">
                via {order.shipping_lines[0].method_title}
              </p>
            )}
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Payment</p>
            <p className="text-sm text-gray-700 capitalize">
              {order.payment_method?.replace(/_/g, " ") || "Not specified"}
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderOrders = () => {
    if (selectedOrder) return renderOrderDetail(selectedOrder);
    return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900 text-lg">Order History</h3>
      </div>
      <div className="divide-y divide-gray-100">
        {loadingOrders ? (
          <div className="p-6 text-center text-gray-500">Loading orders...</div>
        ) : orders.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No orders found. Start shopping to place your first order.
          </div>
        ) : (
          orders.map((order) => (
            <button
              key={order.id}
              type="button"
              onClick={() => setSelectedOrder(order)}
              className="w-full p-6 hover:bg-gray-50 transition-colors cursor-pointer group text-left"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 group-hover:bg-white group-hover:shadow-sm transition-all">
                    <Package size={28} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-gray-900">#{order.order_number}</p>
                      {order.shipping_lines?.length > 0 && (
                        <span className="text-[10px] bg-blue-50 text-belims-blue px-2 py-0.5 rounded font-bold uppercase border border-blue-100">
                          {order.shipping_lines[0].method_title || "Standard"}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-0.5">
                      Placed on {formatDate(order.date_created)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-8 pt-4 sm:pt-0 border-t sm:border-0 border-gray-100">
                  <div className="text-left sm:text-right">
                    <p className="text-sm font-bold text-gray-900">
                      {order.currency || "ZAR"} {formatNumberWithSeparators(parseFloat(order.total))}
                    </p>
                    <p className="text-xs text-gray-500">
                      {order.line_items.length} item{order.line_items.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border ${getStatusColor(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </div>
                    <ChevronRight size={20} className="text-gray-300 group-hover:text-belims-blue transition-colors" />
                  </div>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
    );
  };

  const renderAddresses = () => {
    const billingAddress = user.billing;
    const shippingAddress = user.shipping;

    const hasBilling =
      billingAddress?.address_1 ||
      billingAddress?.city ||
      billingAddress?.postcode;

    const hasShipping =
      shippingAddress?.address_1 ||
      shippingAddress?.city ||
      shippingAddress?.postcode;

    const addNewType: "billing" | "shipping" | null = !hasBilling
      ? "billing"
      : !hasShipping
      ? "shipping"
      : null;

    return (
      <div className="space-y-6">
        {addressSaveMessage && (
          <div
            className={`mb-6 p-4 rounded-lg border ${
              addressSaveMessage.type === "success"
                ? "bg-green-50 border-green-200 text-green-800"
                : "bg-red-50 border-red-200 text-red-800"
            }`}
          >
            {addressSaveMessage.text}
          </div>
        )}

        <div className="flex justify-between items-center sm:px-0 px-4">
          <h3 className="font-semibold text-gray-900 text-lg">My Addresses</h3>
          {addNewType && (
            <button
              onClick={() => handleAddNewAddress(addNewType)}
              className="bg-belims-blue text-white text-sm px-4 py-2 rounded font-bold hover:bg-belims-light transition-all flex items-center gap-2"
            >
              <PlusCircle size={18} /> Add New
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {hasBilling && billingAddress && (
            <div className={`bg-white p-6 rounded-lg shadow-sm relative overflow-hidden transition-colors ${
              defaultAddressKey === "billing" ? "border-2 border-belims-blue" : "border border-gray-200 hover:border-gray-300"
            }`}>
              {defaultAddressKey === "billing" && (
                <span className="bg-belims-blue text-white text-[10px] px-2 py-1 font-bold uppercase tracking-tighter absolute top-0 right-0 rounded-bl-lg">
                  Default
                </span>
              )}
              <div className="flex items-center gap-2 mb-4">
                <MapPin size={20} className="text-belims-blue" />
                <h4 className="text-base font-bold text-gray-900">Billing Address</h4>
              </div>
              <div className="text-sm text-gray-600 space-y-1 mb-6">
                <p className="font-bold text-gray-800">
                  {user.first_name} {user.last_name}
                </p>
                <p>{billingAddress.address_1 || ""}</p>
                <p>
                  {[billingAddress.city, billingAddress.state]
                    .filter(Boolean)
                    .join(", ")}
                </p>
                <p>{billingAddress.postcode || ""}</p>
                <p>{billingAddress.country || ""}</p>
              </div>
              <div className="border-t border-gray-100 pt-4">
                {confirmRemove === "billing" ? (
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-600">Remove this address?</span>
                    <button
                      onClick={() => handleRemoveAddress("billing")}
                      disabled={removingAddress}
                      className="text-xs font-bold text-red-600 hover:underline disabled:opacity-50"
                    >
                      {removingAddress ? "Removing..." : "Yes, remove"}
                    </button>
                    <button
                      onClick={() => setConfirmRemove(null)}
                      className="text-xs font-bold text-gray-500 hover:underline"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => handleAddNewAddress("billing", "edit")}
                      className="text-belims-blue text-xs font-bold hover:underline uppercase tracking-wide"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setConfirmRemove("billing")}
                      className="text-red-500 text-xs font-bold hover:underline uppercase tracking-wide"
                    >
                      Remove
                    </button>
                    {defaultAddressKey !== "billing" && (
                      <button
                        onClick={() => handleSetDefault("billing")}
                        className="text-gray-500 text-xs font-bold hover:text-belims-blue hover:underline uppercase tracking-wide ml-auto"
                      >
                        Set as Default
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {hasShipping && shippingAddress && (
            <div className={`bg-white p-6 rounded-lg shadow-sm relative overflow-hidden transition-colors ${
              defaultAddressKey === "shipping" ? "border-2 border-belims-blue" : "border border-gray-200 hover:border-gray-300"
            }`}>
              {defaultAddressKey === "shipping" && (
                <span className="bg-belims-blue text-white text-[10px] px-2 py-1 font-bold uppercase tracking-tighter absolute top-0 right-0 rounded-bl-lg">
                  Default
                </span>
              )}
              <div className="flex items-center gap-2 mb-4">
                <Truck size={20} className="text-belims-blue" />
                <h4 className="text-base font-bold text-gray-900">Shipping Address</h4>
              </div>
              <div className="text-sm text-gray-600 space-y-1 mb-6">
                <p className="font-bold text-gray-800">
                  {user.first_name} {user.last_name}
                </p>
                <p>{shippingAddress.address_1 || ""}</p>
                <p>
                  {[shippingAddress.city, shippingAddress.state]
                    .filter(Boolean)
                    .join(", ")}
                </p>
                <p>{shippingAddress.postcode || ""}</p>
                <p>{shippingAddress.country || ""}</p>
              </div>
              <div className="border-t border-gray-100 pt-4">
                {confirmRemove === "shipping" ? (
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-600">Remove this address?</span>
                    <button
                      onClick={() => handleRemoveAddress("shipping")}
                      disabled={removingAddress}
                      className="text-xs font-bold text-red-600 hover:underline disabled:opacity-50"
                    >
                      {removingAddress ? "Removing..." : "Yes, remove"}
                    </button>
                    <button
                      onClick={() => setConfirmRemove(null)}
                      className="text-xs font-bold text-gray-500 hover:underline"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => handleAddNewAddress("shipping", "edit")}
                      className="text-belims-blue text-xs font-bold hover:underline uppercase tracking-wide"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setConfirmRemove("shipping")}
                      className="text-red-500 text-xs font-bold hover:underline uppercase tracking-wide"
                    >
                      Remove
                    </button>
                    {defaultAddressKey !== "shipping" && (
                      <button
                        onClick={() => handleSetDefault("shipping")}
                        className="text-gray-500 text-xs font-bold hover:text-belims-blue hover:underline uppercase tracking-wide ml-auto"
                      >
                        Set as Default
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {!hasBilling && !hasShipping && (
            <div className="col-span-full py-12 text-center text-gray-500">
              <MapPin size={48} className="text-gray-300 mx-auto mb-4" />
              <p>No addresses saved yet. Click "Add New" to add one.</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderDetails = () => (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900 text-lg">Account Details</h3>
      </div>
      <div className="p-8">
        {detailsMessage && (
          <div
            className={`mb-6 p-4 rounded-lg border ${
              detailsMessage.type === "success"
                ? "bg-green-50 border-green-200 text-green-800"
                : "bg-red-50 border-red-200 text-red-800"
            }`}
          >
            {detailsMessage.text}
          </div>
        )}
        <form onSubmit={handleSaveDetails} className="space-y-6 max-w-2xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                First Name
              </label>
              <input
                type="text"
                value={formData.first_name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, first_name: e.target.value }))
                }
                className="w-full border border-gray-300 rounded px-4 py-2.5 focus:border-belims-blue outline-none text-sm transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Last Name
              </label>
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, last_name: e.target.value }))
                }
                className="w-full border border-gray-300 rounded px-4 py-2.5 focus:border-belims-blue outline-none text-sm transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              Display Name
            </label>
            <input
              type="text"
              value={formData.display_name}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  display_name: e.target.value,
                }))
              }
              className="w-full border border-gray-300 rounded px-4 py-2.5 focus:border-belims-blue outline-none text-sm transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={user?.email || ""}
              className="w-full border border-gray-300 rounded px-4 py-2.5 focus:border-belims-blue outline-none text-sm transition-colors bg-gray-50 cursor-not-allowed"
              readOnly
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              value={formData.phone}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, phone: e.target.value }))
                }
              className="w-full border border-gray-300 rounded px-4 py-2.5 focus:border-belims-blue outline-none text-sm transition-colors"
            />
          </div>

          <div className="pt-6 border-t border-gray-100">
            <h4 className="font-semibold text-gray-900 mb-2">Password Change</h4>
            <p className="text-sm text-gray-500 mb-6">
              Leave these fields blank if you don't want to change your
              password.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Current Password
                </label>
                <input
                  type="password"
                  placeholder="Enter current password"
                  className="w-full border border-gray-300 rounded px-4 py-2.5 focus:border-belims-blue outline-none text-sm transition-colors"
                  disabled
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    placeholder="Min. 8 characters"
                    className="w-full border border-gray-300 rounded px-4 py-2.5 focus:border-belims-blue outline-none text-sm transition-colors"
                    disabled
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    placeholder="Repeat password"
                    className="w-full border border-gray-300 rounded px-4 py-2.5 focus:border-belims-blue outline-none text-sm transition-colors"
                    disabled
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 italic">
                Password change functionality coming soon.
              </p>
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={savingDetails}
              className="bg-belims-blue text-white px-8 py-3 rounded font-bold hover:bg-belims-light transition-all shadow-md hover:shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingDetails ? "SAVING..." : "SAVE CHANGES"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <div className="bg-[#f9f9f9] min-h-screen py-12 md:py-20">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex flex-col lg:flex-row gap-10">
          {/* Sidebar */}
          <aside className="lg:w-1/4">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden sticky top-32">
              <div className="p-8 border-b border-gray-100 text-center lg:text-left">
                <div className="w-20 h-20 bg-belims-blue text-white rounded-full flex items-center justify-center mx-auto lg:mx-0 text-xl font-bold mb-4 shadow-inner">
                  {user.first_name?.[0] || user.username[0].toUpperCase()}
                  {user.last_name?.[0]}
                </div>
                <h2 className="text-lg font-bold text-gray-900">
                  {user.first_name} {user.last_name}
                </h2>
                <p className="text-sm text-gray-500 font-medium">
                  {user.email}
                </p>
                <div className="mt-3 inline-block px-2 py-0.5 bg-blue-50 text-belims-blue text-[10px] font-bold rounded uppercase tracking-wider border border-blue-100">
                  {user.roles.includes("contractor")
                    ? "Trade Account"
                    : "Standard Account"}
                </div>
              </div>

              <nav className="p-3">
                <ul className="space-y-1">
                  {menuItems.map((item) => (
                    <li key={item.id}>
                      <button
                        onClick={() => { if (item.id !== "orders") setSelectedOrder(null); navigate(`/account/${item.id}`); }}
                        className={`w-full flex items-center gap-3 px-5 py-3.5 rounded-lg font-bold text-sm transition-all ${
                          activeTab === item.id
                            ? "bg-belims-blue text-white shadow-md active:scale-95"
                            : "text-gray-600 hover:bg-gray-50 hover:text-belims-blue"
                        }`}
                      >
                        <span
                          className={
                            activeTab === item.id
                              ? "text-white"
                              : "text-gray-400"
                          }
                        >
                          {item.icon}
                        </span>
                        {item.label}
                        {(item as any).badge !== undefined && (
                          <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === item.id ? "bg-white text-belims-blue" : "bg-belims-blue text-white"}`}>
                            {(item as any).badge}
                          </span>
                        )}
                        {activeTab === item.id && !(item as any).badge && (
                          <ChevronRight size={16} className="ml-auto" />
                        )}
                      </button>
                    </li>
                  ))}
                  <li className="pt-3 mt-3 border-t border-gray-100">
                    <button
                      onClick={onLogout}
                      className="w-full flex items-center gap-3 px-5 py-3.5 rounded-lg font-bold text-sm text-red-600 hover:bg-red-50 transition-all active:scale-95"
                    >
                      <LogOut size={20} className="text-red-400" />
                      Logout
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <div className="lg:w-3/4">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 font-heading">
                {menuItems.find((i) => i.id === activeTab)?.label}
              </h1>
              <p className="text-gray-500 mt-1">
                {activeTab === "dashboard" &&
                  `Welcome back, ${user.first_name}! Manage your account settings and orders.`}
                {activeTab === "orders" &&
                  "View and track your previous orders."}
                {activeTab === "addresses" &&
                  "Manage your billing and shipping addresses."}
                {activeTab === "payment" &&
                  "Manage your saved payment methods for faster checkout."}
                {activeTab === "details" &&
                  "Update your personal information and password."}
              </p>
            </div>

            {activeTab === "dashboard" && renderDashboard()}
            {activeTab === "orders" && renderOrders()}
            {activeTab === "addresses" && renderAddresses()}
            {activeTab === "details" && renderDetails()}
            {activeTab === "wishlist" && renderWishlist()}
            {activeTab === "payment" && (
              <div className="bg-white p-12 text-center rounded-lg border border-gray-200 shadow-sm border-dashed">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                  <CreditCard size={32} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No Saved Cards
                </h3>
                <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                  You haven't saved any payment methods yet. Save a card during
                  your next checkout for faster payments.
                </p>
                <button className="text-belims-blue font-bold hover:underline">
                  Add New Card
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};
