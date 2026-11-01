import { useEffect, useMemo, useReducer } from "react";

// Stock left after cart holds, from the latest POST /cart/hold response. Product data is fetched
// in several places (home rails, archive, product page, quick view); this keeps their stock
// labels in step with what the shopper just added or removed.

const STOCK_EVENT = "belims:stock-updated";
const overrides = new Map<string, number>();

export const setLiveStock = (entries: { product_id: number; available: number | null }[]) => {
  let changed = false;
  for (const { product_id, available } of entries) {
    if (available === null) continue;
    overrides.set(String(product_id), available);
    changed = true;
  }
  if (changed && typeof window !== "undefined") window.dispatchEvent(new Event(STOCK_EVENT));
};

/** The product with its stock replaced by the latest held-stock figure, when there is one. */
export const useLiveStock = <T extends { id: string | number; stock: number }>(product: T): T => {
  const [version, refresh] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    window.addEventListener(STOCK_EVENT, refresh);
    return () => window.removeEventListener(STOCK_EVENT, refresh);
  }, []);
  const live = product ? overrides.get(String(product.id)) : undefined;
  return useMemo(
    () => (product && live !== undefined && live !== product.stock ? { ...product, stock: live } : product),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [product, live, version],
  );
};

/**
 * Most of this item the cart may hold: current quantity + what's still free after holds, or the
 * stock count the item was added with. Products that don't track stock report 0 and stay unlimited.
 */
export const cartQuantityLimit = (item: {
  id: string | number;
  stock: number;
  stock_status?: string;
  quantity: number;
}): number => {
  const live = overrides.get(String(item.id));
  if (live !== undefined) return item.quantity + live;
  if (typeof item.stock === "number" && item.stock > 0) return item.stock;
  return item.stock_status === "outofstock" ? 0 : Infinity;
};

/** Re-render when held stock changes (for components that call cartQuantityLimit). */
export const useLiveStockVersion = () => {
  const [version, refresh] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    window.addEventListener(STOCK_EVENT, refresh);
    return () => window.removeEventListener(STOCK_EVENT, refresh);
  }, []);
  return version;
};
