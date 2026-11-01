import { pushToast } from "../utils/toast";
import { getAuthToken, requestSignIn } from "./authService";
import { requestNavigation } from "../utils/navigation";

const STORAGE_KEY = "belims_wishlist";

export interface WishlistItem {
  id: number;
  name: string;
  sku: string;
  price: number;
  image: string;
  slug: string;
  brand?: string;
  category?: string;
}

// The wishlist belongs to signed-in customers: signed out it reads as empty and can't be added to.
const isSignedIn = () => Boolean(getAuthToken());

export const getWishlist = (): WishlistItem[] => {
  if (!isSignedIn()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as WishlistItem[]) : [];
  } catch {
    return [];
  }
};

export const isInWishlist = (productId: number): boolean =>
  getWishlist().some((item) => item.id === productId);

export const addToWishlist = (item: WishlistItem, options: { silent?: boolean } = {}): void => {
  if (!isSignedIn()) {
    pushToast("Sign in to use your wishlist", "info", {
      detail: "Save products and find them in your account.",
      action: { label: "Sign in", onClick: () => requestSignIn() },
    });
    return;
  }
  const list = getWishlist();
  if (!list.some((i) => i.id === item.id)) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...list, item]));
    window.dispatchEvent(new Event("belims:wishlist-updated"));
    if (!options.silent) {
      pushToast("Added to wishlist", "success", {
        detail: item.name,
        action: { label: "View wishlist", onClick: () => requestNavigation("/account/wishlist") },
      });
    }
  }
};

export const removeFromWishlist = (productId: number): void => {
  const removed = getWishlist().find((i) => i.id === productId);
  const list = getWishlist().filter((i) => i.id !== productId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  window.dispatchEvent(new Event("belims:wishlist-updated"));
  if (removed) {
    pushToast("Removed from wishlist", "info", {
      detail: removed.name,
      action: { label: "Undo", onClick: () => addToWishlist(removed, { silent: true }) },
    });
  }
};

export const toggleWishlist = (item: WishlistItem): boolean => {
  if (isInWishlist(item.id)) {
    removeFromWishlist(item.id);
    return false;
  }
  addToWishlist(item);
  return isInWishlist(item.id);
};

export const getWishlistCount = (): number => getWishlist().length;
