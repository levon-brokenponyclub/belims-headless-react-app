import React, { useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import { User } from "lucide-react";
import { requestSignIn, UserData } from "../services/authService";
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
import { outlineButtonClass, pageTitleClass, primaryButtonClass } from "./ui/classes";

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
      <section className="flex min-h-[60vh] items-center justify-center bg-surface-muted px-4 py-12">
        <div className="w-full max-w-md rounded-lg border-2 border-border bg-white p-8 text-center">
          <span className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full bg-surface-muted text-belims-blue">
            <User size={26} aria-hidden />
          </span>
          <h1 className={pageTitleClass}>
            {tabParam === "wishlist" ? "Your wishlist" : "Your account"}
          </h1>
          <p className="mt-3 text-base text-text-secondary">
            {tabParam === "wishlist"
              ? "Sign in to save products and see your wishlist."
              : "Sign in to track orders, manage addresses and see your wishlist."}
          </p>
          <div className="mt-8 grid gap-3">
            <button type="button" onClick={() => requestSignIn()} className={`${primaryButtonClass} w-full`}>
              Sign in
            </button>
            <button
              type="button"
              onClick={() => requestSignIn({ mode: "register" })}
              className={`${outlineButtonClass} w-full`}
            >
              Create an account
            </button>
          </div>
        </div>
      </section>
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
