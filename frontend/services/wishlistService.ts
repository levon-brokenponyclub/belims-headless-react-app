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

export const getWishlist = (): WishlistItem[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as WishlistItem[]) : [];
  } catch {
    return [];
  }
};

export const isInWishlist = (productId: number): boolean =>
  getWishlist().some((item) => item.id === productId);

export const addToWishlist = (item: WishlistItem): void => {
  const list = getWishlist();
  if (!list.some((i) => i.id === item.id)) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...list, item]));
    window.dispatchEvent(new Event("belims:wishlist-updated"));
  }
};

export const removeFromWishlist = (productId: number): void => {
  const list = getWishlist().filter((i) => i.id !== productId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  window.dispatchEvent(new Event("belims:wishlist-updated"));
};

export const toggleWishlist = (item: WishlistItem): boolean => {
  if (isInWishlist(item.id)) {
    removeFromWishlist(item.id);
    return false;
  }
  addToWishlist(item);
  return true;
};

export const getWishlistCount = (): number => getWishlist().length;
