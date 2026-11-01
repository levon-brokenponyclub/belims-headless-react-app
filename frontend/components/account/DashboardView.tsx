import React from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Heart, MapPin, Package, Truck, Wrench } from "lucide-react";
import type { Order } from "../../types";
import { formatCurrency } from "../../utils/price";
import { formatDate } from "../../utils/date";
import { StatusBadge } from "./StatusBadge";
import { btnOutline, btnPrimary } from "./ui";
import { OrderStatusTracker } from "./OrderStatusTracker";
import { isActiveOrder, itemCount, itemsSummary } from "./orderStatus";

interface DashboardViewProps {
  orders: Order[];
  loading: boolean;
  wishlistCount: number;
  isTrade: boolean;
  /** Shipping/billing line shown on the Addresses quick action. */
  addressLine?: string;
}

const orderLink = (order: Order) => `/account/orders/${encodeURIComponent(order.order_number)}`;
const trackLink = (trackingNumber: string) => `/track-order?order-number=${encodeURIComponent(trackingNumber)}`;
const total = (order: Order) => formatCurrency(parseFloat(order.total) || 0);

const Skeleton: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`animate-pulse rounded-md bg-surface-muted motion-reduce:animate-none ${className}`} />
);

const LatestOrder: React.FC<{ order: Order }> = ({ order }) => {
  const shipment = order.tracking?.[0];
  const delivery = order.shipping_lines?.[0]?.method_title;
  const live = isActiveOrder(order);
  return (
    <section aria-labelledby="latest-order" className="overflow-hidden rounded-md border border-border bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.08em] text-primary">{live ? "Latest active order" : "Latest order"}</p>
          <h2 id="latest-order" className="mt-1 font-heading font-condensed text-h3 font-extrabold uppercase leading-none">
            Order #{order.order_number}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={order.status} />
          <span className="text-base text-text-secondary">{formatDate(order.date_created)}</span>
        </div>
      </div>
      <div className="p-5 md:p-6">
        <p className="text-lg font-semibold text-text">{itemsSummary(order)}</p>
        <p className="text-base text-text-secondary">
          {itemCount(order)} item{itemCount(order) === 1 ? "" : "s"} · {total(order)}
          {delivery ? ` · ${delivery}` : ""}
        </p>
        <div className="mt-6">
          <OrderStatusTracker status={order.status} />
        </div>
        {shipment && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-surface-muted p-4">
            <div className="flex items-center gap-3">
              <Truck size={22} aria-hidden="true" className="text-belims-blue" />
              <div>
                <p className="font-bold">
                  {shipment.courier || "Courier"} · {shipment.tracking_number}
                </p>
                {shipment.status && <p className="text-base text-text-secondary">{shipment.status}</p>}
              </div>
            </div>
            <Link to={trackLink(shipment.tracking_number)} className={btnPrimary}>
              Track shipment
            </Link>
          </div>
        )}
        <div className="mt-5">
          <Link to={orderLink(order)} className={btnOutline}>
            View order
          </Link>
        </div>
      </div>
    </section>
  );
};

export const DashboardView: React.FC<DashboardViewProps> = ({ orders, loading, wishlistCount, isTrade, addressLine }) => {
  if (loading) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Loading your account">
        <div className="space-y-4 rounded-md border border-border p-6">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-7 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }

  const latest = orders.find(isActiveOrder) ?? orders[0];
  const activeCount = orders.filter(isActiveOrder).length;
  const stats = [
    { label: "Total orders", value: orders.length },
    { label: "Active orders", value: activeCount },
    { label: "Wishlist items", value: wishlistCount },
  ];
  const quick = [
    { to: "/track-order", Icon: Truck, title: "Track an order", sub: "Enter a tracking number" },
    { to: "/account/orders", Icon: Package, title: "All orders", sub: orders.length ? `${orders.length} on your account` : "No orders yet" },
    { to: "/account/addresses", Icon: MapPin, title: "Delivery address", sub: addressLine || "Add an address" },
    { to: "/account/wishlist", Icon: Heart, title: "Wishlist", sub: wishlistCount ? `${wishlistCount} saved` : "Nothing saved yet" },
  ];

  return (
    <div className="space-y-6">
      {isTrade && (
        <aside className="flex flex-wrap items-center justify-between gap-3 rounded-md border-l-4 border-belims-blue bg-surface-muted p-4">
          <p className="flex items-center gap-2">
            <Wrench size={18} aria-hidden="true" className="text-belims-blue" />
            <span>
              <strong>Trade account.</strong> Trade pricing applies automatically on trade-special products.
            </span>
          </p>
          <Link to="/shop?offer=trade_special" className="inline-flex min-h-[44px] items-center gap-1 font-bold text-belims-blue underline underline-offset-4 hover:text-primary">
            View trade deals <ChevronRight size={16} aria-hidden="true" />
          </Link>
        </aside>
      )}

      {latest ? (
        <LatestOrder order={latest} />
      ) : (
        <section aria-labelledby="no-orders" className="rounded-md border border-border bg-white p-6 md:p-8">
          <p className="text-xs font-bold uppercase tracking-[.08em] text-primary">Latest order</p>
          <h2 id="no-orders" className="mt-1 font-heading font-condensed text-h3 font-extrabold uppercase leading-none">
            No orders yet
          </h2>
          <p className="mt-2 max-w-xl text-text-secondary">
            When you place your first order it shows up here with tracking, and you can reorder in one tap.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link to="/shop" className={btnPrimary}>
              Start shopping
            </Link>
            <Link to="/account/wishlist" className={btnOutline}>
              View wishlist
            </Link>
          </div>
        </section>
      )}

      <dl className="grid grid-cols-3 divide-x divide-border rounded-md border border-border bg-white" aria-label="Account summary">
        {stats.map(({ label, value }) => (
          <div key={label} className="px-4 py-4 md:px-6">
            <dt className="text-xs font-bold uppercase tracking-wider text-text-tertiary">{label}</dt>
            <dd className="font-heading font-condensed text-display-sm font-extrabold uppercase leading-tight text-belims-blue">{value}</dd>
          </div>
        ))}
      </dl>

      {orders.length > 0 && (
        <section aria-labelledby="recent-orders" className="rounded-md border border-border bg-white">
          <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
            <h2 id="recent-orders" className="font-heading font-condensed text-h4 font-extrabold uppercase">
              Recent orders
            </h2>
            <Link to="/account/orders" className="inline-flex min-h-[44px] items-center gap-1 font-bold text-belims-blue underline underline-offset-4 hover:text-primary">
              View all <ChevronRight size={16} aria-hidden="true" />
            </Link>
          </div>
          <ul className="divide-y divide-border">
            {orders.slice(0, 5).map((order) => (
              <li key={order.id} className="relative flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-1.5 hover:bg-surface-muted">
                <div className="min-w-0">
                  <p className="font-bold">
                    <Link to={orderLink(order)} className="inline-flex min-h-[44px] items-center hover:underline after:absolute after:inset-0 after:content-['']">
                      #{order.order_number}
                    </Link>{" "}
                    <span className="font-normal text-text-secondary">· {formatDate(order.date_created)}</span>
                  </p>
                  <p className="truncate text-base text-text-secondary">{itemsSummary(order)}</p>
                </div>
                <div className="flex items-center gap-4">
                  <StatusBadge status={order.status} />
                  <span className="font-bold">{total(order)}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="quick-actions">
        <h2 id="quick-actions" className="mb-3 font-heading font-condensed text-h4 font-extrabold uppercase">
          Quick actions
        </h2>
        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {quick.map(({ to, Icon, title, sub }) => (
            <li key={title}>
              <Link
                to={to}
                className="flex min-h-[88px] flex-col justify-center gap-1 rounded-md border border-border bg-white p-4 transition-colors hover:border-belims-blue"
              >
                <span className="flex items-center gap-2 font-bold text-belims-blue">
                  <Icon size={20} aria-hidden={true} />
                  {title}
                </span>
                <span className="truncate text-base text-text-secondary">{sub}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};
