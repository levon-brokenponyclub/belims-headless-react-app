import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Package, RefreshCw } from "lucide-react";
import type { Order, Product } from "../../types";
import { formatCurrency } from "../../utils/price";
import { formatDate } from "../../utils/date";
import { StatusBadge } from "./StatusBadge";
import { isActiveOrder, itemCount, itemsSummary } from "./orderStatus";
import { describeReorder, reorderLines } from "./reorder";

const FILTERS: { id: string; label: string; match: (o: Order) => boolean }[] = [
  { id: "all", label: "All", match: () => true },
  { id: "active", label: "Active", match: isActiveOrder },
  { id: "completed", label: "Completed", match: (o) => o.status === "completed" },
  { id: "cancelled", label: "Cancelled", match: (o) => ["cancelled", "refunded", "failed"].includes(o.status) },
];

interface OrdersViewProps {
  orders: Order[];
  loading: boolean;
  products?: Product[];
  addToCart?: (product: Product) => void;
}

const Skeleton: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`animate-pulse rounded-md bg-surface-muted motion-reduce:animate-none ${className}`} />
);

export const OrdersView: React.FC<OrdersViewProps> = ({ orders, loading, products, addToCart }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [message, setMessage] = useState("");
  const activeId = FILTERS.some((f) => f.id === searchParams.get("status")) ? (searchParams.get("status") as string) : "all";
  const filter = FILTERS.find((f) => f.id === activeId) ?? FILTERS[0];
  const rows = orders.filter(filter.match);

  const setFilter = (id: string) => {
    const next = new URLSearchParams(searchParams);
    if (id === "all") next.delete("status");
    else next.set("status", id);
    setSearchParams(next);
  };

  const reorder = (order: Order) => {
    if (!addToCart) return;
    setMessage(describeReorder(reorderLines(order.line_items, products, addToCart)));
  };

  if (loading) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Loading your orders">
        <Skeleton className="h-11 w-full max-w-md" />
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <section aria-labelledby="no-orders" className="rounded-md border border-border bg-white p-8 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-md bg-surface-muted text-belims-blue">
          <Package size={28} aria-hidden="true" />
        </span>
        <h2 id="no-orders" className="mt-3 font-heading font-condensed text-h3 font-extrabold uppercase">
          No orders yet
        </h2>
        <p className="mx-auto mt-1 max-w-md text-text-secondary">Orders you place show up here with tracking and one-tap reorder.</p>
        <Link
          to="/shop"
          className="mt-5 inline-flex min-h-[44px] items-center justify-center rounded-md bg-primary px-4 font-heading font-condensed text-button font-bold uppercase text-white transition-colors hover:bg-belims-blue"
        >
          Start shopping
        </Link>
      </section>
    );
  }

  const reorderBtn = (order: Order) =>
    addToCart ? (
      <button
        type="button"
        onClick={() => reorder(order)}
        aria-label={`Reorder order ${order.order_number}`}
        className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 px-1 font-bold text-belims-blue underline underline-offset-4 hover:text-primary"
      >
        <RefreshCw size={14} aria-hidden="true" /> Reorder
      </button>
    ) : null;

  return (
    <div className="space-y-4">
      <div role="group" aria-label="Filter orders" className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const on = f.id === activeId;
          return (
            <button
              key={f.id}
              type="button"
              aria-pressed={on}
              onClick={() => setFilter(f.id)}
              className={`inline-flex min-h-[44px] items-center gap-2 rounded-md border-2 px-4 font-bold transition-colors ${
                on ? "border-belims-blue bg-belims-blue text-white" : "border-border-strong bg-white text-belims-blue hover:border-belims-blue"
              }`}
            >
              {f.label}
              <span className="text-xs opacity-80">{orders.filter(f.match).length}</span>
            </button>
          );
        })}
      </div>

      <p role="status" aria-live="polite" className={message ? "rounded-md border-l-4 border-belims-blue bg-surface-muted p-3 text-text" : "sr-only"}>
        {message}
      </p>

      <section aria-labelledby="orders-list" className="rounded-md border border-border bg-white">
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <h2 id="orders-list" className="font-heading font-condensed text-h4 font-extrabold uppercase">
            {filter.label} orders
          </h2>
          <p className="text-base text-text-secondary" aria-live="polite">
            {rows.length} order{rows.length === 1 ? "" : "s"}
          </p>
        </div>

        {rows.length === 0 ? (
          <p className="p-6 text-text-secondary">No orders match this filter.</p>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-border bg-surface-muted text-xs uppercase tracking-wider text-text-tertiary">
                    <th scope="col" className="px-4 py-2.5 font-bold">Order</th>
                    <th scope="col" className="px-4 py-2.5 font-bold">Date</th>
                    <th scope="col" className="hidden px-4 py-2.5 font-bold xl:table-cell">Items</th>
                    <th scope="col" className="px-4 py-2.5 font-bold">Delivery</th>
                    <th scope="col" className="px-4 py-2.5 font-bold">Status</th>
                    <th scope="col" className="px-4 py-2.5 text-right font-bold">Total</th>
                    <th scope="col" className="px-4 py-2.5"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((order) => (
                    <tr key={order.id} className="border-b border-border last:border-b-0 hover:bg-surface-muted">
                      <td className="px-4 font-bold">
                        <Link
                          to={`/account/orders/${encodeURIComponent(order.order_number)}`}
                          className="inline-flex min-h-[44px] items-center underline underline-offset-4 hover:text-primary"
                        >
                          #{order.order_number}
                        </Link>
                      </td>
                      <td className="px-4 py-2">{formatDate(order.date_created)}</td>
                      <td className="hidden max-w-[240px] truncate px-4 py-2 text-text-secondary xl:table-cell">{itemsSummary(order)}</td>
                      <td className="px-4 py-2 text-text-secondary">{order.shipping_lines?.[0]?.method_title || "—"}</td>
                      <td className="px-4 py-2"><StatusBadge status={order.status} /></td>
                      <td className="px-4 py-2 text-right font-bold">{formatCurrency(parseFloat(order.total) || 0)}</td>
                      <td className="px-4 py-2 text-right">{reorderBtn(order)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="divide-y divide-border lg:hidden">
              {rows.map((order) => (
                <li key={order.id} className="px-4 py-3">
                  <Link to={`/account/orders/${encodeURIComponent(order.order_number)}`} className="block hover:underline">
                    <span className="flex items-start justify-between gap-3">
                      <span>
                        <span className="block font-bold">
                          #{order.order_number} <span className="font-normal text-text-secondary">· {formatDate(order.date_created)}</span>
                        </span>
                        <span className="block text-base text-text-secondary">
                          {itemsSummary(order)} · {itemCount(order)} item{itemCount(order) === 1 ? "" : "s"}
                        </span>
                      </span>
                      <span className="font-bold">{formatCurrency(parseFloat(order.total) || 0)}</span>
                    </span>
                  </Link>
                  <div className="mt-1 flex items-center justify-between">
                    <StatusBadge status={order.status} />
                    {reorderBtn(order)}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
};
