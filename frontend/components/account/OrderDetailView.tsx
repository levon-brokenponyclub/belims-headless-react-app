import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, MapPin, RefreshCw, Truck } from "lucide-react";
import type { Order, OrderLineItem, Product } from "../../types";
import { formatCurrency } from "../../utils/price";
import { formatDate } from "../../utils/date";
import { StatusBadge } from "./StatusBadge";
import { btnOutline, btnBuy, btnPrimary } from "./ui";
import { OrderStatusTracker } from "./OrderStatusTracker";
import { describeReorder, reorderLines } from "./reorder";

interface OrderDetailViewProps {
  /** undefined once the list has loaded = not found. */
  order: Order | undefined;
  loading: boolean;
  orderNumber: string;
  products?: Product[];
  addToCart?: (product: Product) => void;
}

const money = (value: string | number) => formatCurrency(typeof value === "number" ? value : parseFloat(value) || 0);
const addressText = (a?: Order["shipping_address"]) =>
  a ? [a.street, a.suburb, a.city, a.province, a.postalCode].filter(Boolean).join(", ") : "";

const BackLink: React.FC = () => (
  <Link to="/account/orders" className="inline-flex min-h-[44px] items-center gap-1 font-bold text-belims-blue underline underline-offset-4 hover:text-primary">
    <ChevronLeft size={16} aria-hidden="true" /> All orders
  </Link>
);

export const OrderDetailView: React.FC<OrderDetailViewProps> = ({ order, loading, orderNumber, products, addToCart }) => {
  const [message, setMessage] = useState("");

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Loading your order">
        <div className="h-11 w-32 animate-pulse rounded-md bg-surface-muted motion-reduce:animate-none" />
        <div className="h-48 w-full animate-pulse rounded-md bg-surface-muted motion-reduce:animate-none" />
        <div className="h-64 w-full animate-pulse rounded-md bg-surface-muted motion-reduce:animate-none" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="space-y-4">
        <BackLink />
        <section aria-labelledby="not-found" className="rounded-md border border-border bg-white p-8">
          <h2 id="not-found" className="font-heading font-condensed text-h3 font-extrabold uppercase">
            Order not found
          </h2>
          <p className="mt-1 text-text-secondary">We couldn't find order #{orderNumber} on your account.</p>
        </section>
      </div>
    );
  }

  const subtotal = order.line_items.reduce((sum, l) => sum + (parseFloat(l.total) || 0), 0);
  const shipping = (order.shipping_lines ?? []).reduce((sum, l) => sum + (parseFloat(l.total) || 0), 0);
  const total = parseFloat(order.total) || 0;
  const discount = Math.max(0, subtotal + shipping - total);
  const delivery = addressText(order.shipping_address);
  const billing = addressText(order.billing_address);

  const reorder = (lines: Pick<OrderLineItem, "product_id" | "name" | "quantity">[]) => {
    if (addToCart) setMessage(describeReorder(reorderLines(lines, products, addToCart)));
  };

  return (
    <div className="space-y-6">
      <BackLink />

      <section aria-labelledby="order-summary" className="overflow-hidden rounded-md border border-border bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.08em] text-primary">Order</p>
            <h2 id="order-summary" className="mt-1 font-heading font-condensed text-h3 font-extrabold uppercase leading-none">
              #{order.order_number}
            </h2>
            <p className="mt-1 text-base text-text-secondary">
              Placed {formatDate(order.date_created)}
              {order.payment_method ? ` · ${order.payment_method}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={order.status} />
            {addToCart && (
              <button type="button" className={btnBuy} onClick={() => reorder(order.line_items)}>
                <RefreshCw size={18} aria-hidden="true" /> Reorder all
              </button>
            )}
          </div>
        </div>
        <div className="p-5 md:p-6">
          <OrderStatusTracker status={order.status} />
          {order.tracking?.map((shipment) => (
            <div
              key={shipment.tracking_number}
              className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-surface-muted p-4"
            >
              <div className="flex items-center gap-3">
                <Truck size={22} aria-hidden="true" className="text-belims-blue" />
                <div>
                  <p className="font-bold">
                    {shipment.courier || "Courier"} · {shipment.tracking_number}
                  </p>
                  <p className="text-base text-text-secondary">
                    {shipment.status}
                    {shipment.estimated_delivery ? ` · ETA ${formatDate(shipment.estimated_delivery)}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link to={`/track-order?order-number=${encodeURIComponent(shipment.tracking_number)}`} className={btnPrimary}>
                  Track shipment
                </Link>
                {shipment.tracking_url && (
                  <a href={shipment.tracking_url} target="_blank" rel="noopener noreferrer" className={btnOutline}>
                    Courier site<span className="sr-only"> (opens in a new tab)</span>
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <p role="status" aria-live="polite" className={message ? "rounded-md border-l-4 border-belims-blue bg-surface-muted p-3 text-text" : "sr-only"}>
        {message}
      </p>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section aria-labelledby="order-items" className="rounded-md border border-border bg-white">
          <div className="border-b border-border px-5 py-4">
            <h2 id="order-items" className="font-heading font-condensed text-h4 font-extrabold uppercase">
              Items
            </h2>
          </div>
          <ul className="divide-y divide-border">
            {order.line_items.map((line) => (
              <li key={line.id} className="flex items-center gap-3 p-4">
                <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-md bg-surface-muted">
                  {line.image ? <img src={line.image} alt="" loading="lazy" className="h-full w-full object-contain p-1" /> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{line.name}</span>
                  <span className="text-base text-text-secondary">
                    {line.quantity} × {money(line.price)}
                  </span>
                </span>
                <span className="font-bold">{money(line.total)}</span>
                {addToCart && (
                  <button type="button" className={btnOutline} onClick={() => reorder([line])} aria-label={`Add ${line.name} to cart`}>
                    Add
                  </button>
                )}
              </li>
            ))}
          </ul>
          <dl className="space-y-1 border-t border-border bg-surface-muted p-4">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{money(subtotal)}</dd></div>
            {discount > 0.004 && (
              <div className="flex justify-between"><dt>Discount</dt><dd>−{money(discount)}</dd></div>
            )}
            <div className="flex justify-between"><dt>Delivery</dt><dd>{shipping === 0 ? "Free" : money(shipping)}</dd></div>
            <div className="flex justify-between text-xl font-bold"><dt>Total</dt><dd>{money(total)}</dd></div>
          </dl>
        </section>

        <aside className="space-y-6">
          <section aria-labelledby="order-address" className="rounded-md border border-border bg-white p-5">
            <h2 id="order-address" className="font-heading font-condensed text-h5 font-extrabold uppercase">
              {delivery ? "Delivery address" : "Billing address"}
            </h2>
            <p className="mt-2 flex gap-3 text-text-secondary">
              <MapPin size={20} aria-hidden="true" className="shrink-0" />
              <span>{delivery || billing || "No address on this order."}</span>
            </p>
          </section>
          <section aria-labelledby="order-payment" className="rounded-md border border-border bg-white p-5">
            <h2 id="order-payment" className="font-heading font-condensed text-h5 font-extrabold uppercase">
              Payment
            </h2>
            <p className="mt-2 text-text-secondary">
              {order.payment_method || "—"} · {money(total)}
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
};
