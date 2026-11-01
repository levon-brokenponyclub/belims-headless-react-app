const CART_ID_KEY = "belims_cart_id";

/** Random per-browser cart ID (guests and signed-in customers) — keys the cart's stock holds. */
export const getCartId = (): string => {
  try {
    let id = localStorage.getItem(CART_ID_KEY);
    if (!id) {
      id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(CART_ID_KEY, id);
    }
    return id;
  } catch {
    return "";
  }
};
