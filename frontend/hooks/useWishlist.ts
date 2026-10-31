import { useEffect, useState } from "react";
import { getWishlist, WishlistItem } from "../services/wishlistService";

/** Wishlist items, kept in sync with `belims:wishlist-updated` (same tab) and storage (other tabs). */
export const useWishlist = (): WishlistItem[] => {
  const [items, setItems] = useState<WishlistItem[]>(() => getWishlist());
  useEffect(() => {
    const refresh = () => setItems(getWishlist());
    window.addEventListener("belims:wishlist-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("belims:wishlist-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return items;
};
