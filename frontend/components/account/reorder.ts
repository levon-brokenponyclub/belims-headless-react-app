import type { OrderLineItem, Product } from "../../types";
import { isProductPurchasable } from "../../utils/price";

export interface ReorderResult {
  /** Units added across all lines. */
  addedUnits: number;
  skipped: { name: string; reason: string }[];
}

/**
 * Re-add order lines to the cart from the live catalogue: current price / deals / stock, never the
 * historical line price. Lines that are gone or out of stock are skipped and reported; lines that
 * have less stock than ordered are added partially.
 */
export const reorderLines = (
  lines: Pick<OrderLineItem, "product_id" | "name" | "quantity">[],
  products: Product[] | undefined,
  addToCart: (product: Product) => void,
): ReorderResult => {
  const result: ReorderResult = { addedUnits: 0, skipped: [] };
  if (!products || products.length === 0) {
    lines.forEach((line) => result.skipped.push({ name: line.name, reason: "catalogue not loaded yet" }));
    return result;
  }
  for (const line of lines) {
    const live = products.find((p) => String(p.id) === String(line.product_id));
    if (!live) {
      result.skipped.push({ name: line.name, reason: "no longer available" });
      continue;
    }
    if (!isProductPurchasable(live)) {
      result.skipped.push({ name: line.name, reason: "out of stock" });
      continue;
    }
    const wanted = Math.max(1, Number(line.quantity) || 1);
    const units = Number.isFinite(live.stock) && live.stock > 0 ? Math.min(wanted, live.stock) : wanted;
    for (let i = 0; i < units; i += 1) addToCart(live);
    result.addedUnits += units;
    if (units < wanted) result.skipped.push({ name: line.name, reason: `only ${units} of ${wanted} in stock` });
  }
  return result;
};

export const describeReorder = ({ addedUnits, skipped }: ReorderResult): string => {
  const added = addedUnits > 0 ? `Added ${addedUnits} item${addedUnits === 1 ? "" : "s"} to your cart.` : "Nothing was added to your cart.";
  if (skipped.length === 0) return added;
  return `${added} Skipped: ${skipped.map((s) => `${s.name} (${s.reason})`).join("; ")}.`;
};
