import React, { useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import { User } from "lucide-react";
import { UserData } from "../services/authService";
import { saveStoredAddress } from "../services/shippingAddress";
import { useCustomerOrders } from "../hooks/useCustomerOrders";
import { useWishlist } from "../hooks/useWishlist";
import { ShippingAddress, Product } from "../types";
import { AccountShell } from "./account/AccountShell";
import type { AccountTab } from "./account/AccountNav";
import { DashboardView } from "./account/DashboardView";
import { OrdersView } from "./account/OrdersView";
import { OrderDetailView } from "./account/OrderDetailView";
import { AddressesView } from "./account/AddressesView";
import { DetailsView } from "./account/DetailsView";
import { WishlistView } from "./account/WishlistView";

interface AccountPageProps {
  user: UserData | null;
  onLogout: () => void;
  addToCart?: (product: any) => void;
  /** Live catalogue — used to resolve wishlist items and reorders to real stock and pricing. */
  products?: Product[];
}

const VALID_TABS: AccountTab[] = ["dashboard", "orders", "addresses", "details", "wishlist"];

const SUBTITLES: Partial<Record<AccountTab, string>> = {
  orders: "View and track your previous orders.",
  addresses: "Manage your billing and shipping addresses.",
  details: "Update your personal information and request a password reset.",
  wishlist: "Products you've saved for later.",
};

/** Route owner: loads account data once and hands it to the per-tab views in `./account/`. */
export const AccountPage: React.FC<AccountPageProps> = ({ user, onLogout, addToCart, products }) => {
  const { tab: tabParam, orderNumber } = useParams<{ tab?: string; orderNumber?: string }>();
  // /account/orders/:orderNumber has no :tab segment — it is the Orders tab.
  const activeTab: AccountTab = orderNumber
    ? "orders"
    : VALID_TABS.includes(tabParam as AccountTab)
      ? (tabParam as AccountTab)
      : "dashboard";
  const { orders, loading: loadingOrders } = useCustomerOrders(!!user);
  const wishlistItems = useWishlist();
  const [defaultAddressKey, setDefaultAddressKey] = useState<"billing" | "shipping">(() => {
    const stored = localStorage.getItem("belims_default_address_key");
    return stored === "billing" || stored === "shipping" ? stored : "billing";
  });

  // Saves the chosen account address as the site-wide delivery address (header pill, product page, checkout).
  const handleSetDefault = (type: "billing" | "shipping") => {
    const source = user?.[type];
    if (!source) return;
    const address: ShippingAddress = {
      street: source.address_1 || "",
      city: source.city || "",
      province: source.state || "",
      postalCode: source.postcode || "",
      country: "ZA",
      label: [source.address_1, source.city, source.state, source.postcode].filter(Boolean).join(", "),
    };
    saveStoredAddress(address);
    localStorage.setItem("belims_default_address_key", type);
    localStorage.setItem("fulfillmentType", "delivery");
    setDefaultAddressKey(type);
    window.dispatchEvent(new Event("belims:delivery-address-updated"));
    window.dispatchEvent(new Event("belims:fulfillment-changed"));
  };

  if (!user) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-4 text-center">
        <User size={48} className="text-gray-300 mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">My Account</h2>
        <p className="text-gray-600 mb-6">Please log in to view your account details.</p>
        <a href="/login" className="bg-belims-blue text-white px-8 py-3 rounded font-bold hover:bg-belims-light transition-all">
          Log In
        </a>
      </div>
    );
  }

  // Payment methods tab was removed (PayFast is redirect-only; there are no saved cards).
  if (tabParam === "payment") return <Navigate to="/account/dashboard" replace />;

  const isTrade = !!user.roles?.includes("contractor");
  const titles: Record<AccountTab, string> = {
    dashboard: `Hi, ${user.first_name || user.username || "there"}`,
    orders: orderNumber ? `Order #${orderNumber}` : "Orders",
    addresses: "Addresses",
    details: "Account details",
    wishlist: "Wishlist",
  };
  const defaultAddress = defaultAddressKey === "shipping" ? user.shipping : user.billing;
  const addressLine = [defaultAddress?.city, defaultAddress?.postcode].filter(Boolean).join(", ");

  return (
    <AccountShell
      tab={activeTab}
      title={titles[activeTab]}
      subtitle={activeTab === "orders" && orderNumber ? undefined : SUBTITLES[activeTab]}
      isTrade={isTrade}
      deliveringTo={addressLine || undefined}
      wishlistCount={wishlistItems.length}
      onLogout={onLogout}
    >
      {activeTab === "dashboard" && (
        <DashboardView
          orders={orders}
          loading={loadingOrders}
          wishlistCount={wishlistItems.length}
          isTrade={isTrade}
          addressLine={addressLine || undefined}
        />
      )}
      {activeTab === "orders" &&
        (orderNumber ? (
          <OrderDetailView
            order={orders.find((o) => o.order_number === orderNumber)}
            loading={loadingOrders}
            orderNumber={orderNumber}
            products={products}
            addToCart={addToCart}
          />
        ) : (
          <OrdersView orders={orders} loading={loadingOrders} products={products} addToCart={addToCart} />
        ))}
      {activeTab === "addresses" && <AddressesView user={user} defaultKey={defaultAddressKey} onSetDefault={handleSetDefault} />}
      {activeTab === "details" && <DetailsView user={user} />}
      {activeTab === "wishlist" && <WishlistView products={products} addToCart={addToCart} />}
    </AccountShell>
  );
};
