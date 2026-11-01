import { getApiBaseUrl } from "./wooCommerceService";
import { getCartId } from "../utils/cartId";

// 30-minute stock holds for the cart (plugin 2.11.0, POST /belims/v1/cart/hold).

const HOLD_EXPIRY_KEY = "belims_cart_hold_expires_at";

export interface CartHoldItem {
  product_id: number;
  requested: number;
  held: number;
  /** Stock left after this cart's hold; null when the product doesn't track stock. */
  available: number | null;
}

export interface CartHoldResult {
  expiresAt: number | null;
  items: CartHoldItem[];
}

export const readHoldExpiry = (): number | null => {
  try {
    const value = Number(localStorage.getItem(HOLD_EXPIRY_KEY));
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
};

const storeHoldExpiry = (expiresAt: number | null) => {
  try {
    if (expiresAt) localStorage.setItem(HOLD_EXPIRY_KEY, String(expiresAt));
    else localStorage.removeItem(HOLD_EXPIRY_KEY);
  } catch {}
};

/** Replace this cart's holds with its current contents; restarts the 30 minutes. */
export const syncCartHolds = async (
  items: { product_id: number; quantity: number }[],
): Promise<CartHoldResult> => {
  const response = await fetch(`${getApiBaseUrl()}/cart/hold`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cart_id: getCartId(), items }),
  });
  if (!response.ok) throw new Error(`Cart hold failed: ${response.status}`);
  const data = await response.json();
  const expiresAt = data?.expires_at ? Date.parse(data.expires_at) : null;
  storeHoldExpiry(expiresAt);
  return { expiresAt, items: Array.isArray(data?.items) ? data.items : [] };
};
