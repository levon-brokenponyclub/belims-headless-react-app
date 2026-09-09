import { CURRENCY_SYMBOL } from "../constants";
import type { Product } from "../types";

const numberFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const formatNumberWithSeparators = (value: number): string =>
  numberFormatter.format(Number.isFinite(value) ? value : 0);

export const formatCurrency = (value: number): string =>
  `${CURRENCY_SYMBOL}${formatNumberWithSeparators(value)}`;

/**
 * Returns true only when `value` is a finite, positive number (> 0).
 * Rejects: 0, negative, NaN, Infinity, undefined, null, empty string, "0", "0.00".
 */
export const isValidPrice = (value: number | string | undefined | null): boolean => {
  if (value === undefined || value === null || value === "") return false;
  const n = typeof value === "string" ? parseFloat(value) : value;
  return Number.isFinite(n) && n > 0;
};

/**
 * Returns the effective consumer-facing price for a product.
 * Prefers deals_resolved consumer price, falls back to product.price.
 */
export const getEffectivePrice = (product: Product): number => {
  return (product.deals_resolved?.consumer?.price ?? product.price) as number;
};

/**
 * Returns true when a product is safe to add to cart and show on promotional surfaces:
 *  - Has a valid (> 0) price
 *  - Is NOT on backorder (stock_status !== "onbackorder")
 *  - Has stock > 0 OR stock_status === "instock"
 *
 * "onbackorder" products are treated as unavailable in this storefront
 * because backorders are disabled by policy.
 */
export const isProductPurchasable = (product: Product): boolean => {
  // Block backorders
  if (product.stock_status === "onbackorder") return false;

  // Block zero / missing price
  const effectivePrice = getEffectivePrice(product);
  if (!isValidPrice(effectivePrice)) return false;

  // Must have physical stock available
  const hasStock =
    product.stock_status === "instock" ||
    (typeof product.stock === "number" && product.stock > 0) ||
    (typeof product.in_stock === "boolean" && product.in_stock);

  return hasStock;
};
