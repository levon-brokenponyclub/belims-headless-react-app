import type { Order } from "../../types";

export type StatusTone = "ok" | "info" | "warn" | "err" | "neutral";

export const STATUS_META: Record<Order["status"], { label: string; tone: StatusTone }> = {
  pending: { label: "Pending", tone: "warn" },
  processing: { label: "Processing", tone: "info" },
  "on-hold": { label: "On hold", tone: "warn" },
  "partially-shipped": { label: "Partially shipped", tone: "info" },
  shipped: { label: "Shipped", tone: "info" },
  completed: { label: "Completed", tone: "ok" },
  cancelled: { label: "Cancelled", tone: "err" },
  refunded: { label: "Refunded", tone: "neutral" },
  failed: { label: "Failed", tone: "err" },
};

/** Orders still in flight. (The old dashboard counted only processing + on-hold.) */
export const ACTIVE_STATUSES: Order["status"][] = [
  "pending",
  "processing",
  "on-hold",
  "partially-shipped",
  "shipped",
];

export const isActiveOrder = (order: Pick<Order, "status">) => ACTIVE_STATUSES.includes(order.status);

export const ORDER_STEPS = ["Placed", "Processing", "Shipped", "Delivered"] as const;

/** Delivery-order progress; null for statuses with no linear progress (cancelled, refunded, failed). */
export const stepIndex = (status: Order["status"]): number | null => {
  switch (status) {
    case "pending":
      return 0;
    case "processing":
    case "on-hold":
      return 1;
    case "partially-shipped":
    case "shipped":
      return 2;
    case "completed":
      return 3;
    default:
      return null;
  }
};

export const itemCount = (order: Pick<Order, "line_items">) =>
  order.line_items.reduce((sum, line) => sum + (Number(line.quantity) || 0), 0);

export const itemsSummary = (order: Pick<Order, "line_items">) => {
  const first = order.line_items[0]?.name ?? "Order";
  const more = order.line_items.length - 1;
  return more > 0 ? `${first} + ${more} more` : first;
};

export const sortOrdersNewestFirst = (orders: Order[]) =>
  [...orders].sort((a, b) => new Date(b.date_created).getTime() - new Date(a.date_created).getTime());
