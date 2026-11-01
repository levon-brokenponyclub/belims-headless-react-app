import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import type { Product } from "../../types";
import { removeFromWishlist } from "../../services/wishlistService";
import { useWishlist } from "../../hooks/useWishlist";
import { buildProductUrl } from "../../utils/product";
import { formatCurrency, isProductPurchasable } from "../../utils/price";
import { btnBuy, btnPrimary, cardClass } from "./ui";
import { ConfirmDialog } from "../ui/ConfirmDialog";

interface WishlistViewProps {
  products?: Product[];
  addToCart?: (product: Product) => void;
}

export const WishlistView: React.FC<WishlistViewProps> = ({ products, addToCart }) => {
  const items = useWishlist();
  const [pendingRemoval, setPendingRemoval] = useState<{ id: number; name: string } | null>(null);

  if (items.length === 0) {
    return (
      <section aria-labelledby="wishlist-empty" className={`${cardClass} p-8 text-center`}>
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-md bg-surface-muted text-belims-blue">
          <Heart size={28} aria-hidden="true" />
        </span>
        <h2 id="wishlist-empty" className="mt-3 font-heading font-condensed text-h3 font-extrabold uppercase">
          Nothing saved yet
        </h2>
        <p className="mx-auto mt-1 max-w-md text-text-secondary">Tap the heart on any product to save it here for later.</p>
        <Link to="/shop" className={`${btnPrimary} mt-5`}>
          Browse products
        </Link>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="sr-only">Saved products ({items.length})</h2>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((item) => {
          // Resolve against the live catalogue: real stock, real (deal) price and image.
          const live = products?.find((p) => String(p.id) === String(item.id));
          const canAdd = !!addToCart && !!live && isProductPurchasable(live);
          const price = live ? (live.deals_resolved?.consumer?.price ?? live.price) : item.price;
          const catalogueLoading = !live && !!products && products.length === 0;
          const image = live?.image || item.image;
          const url = buildProductUrl({ name: item.name, slug: item.slug, id: item.id });
          const stock = live ? (canAdd ? (live.stock <= 3 ? `Only ${live.stock} left` : "In stock") : "Out of stock") : catalogueLoading ? "Checking stock…" : "No longer available";
          const stockTone = !live ? "text-text-tertiary" : !canAdd ? "text-error" : live.stock <= 3 ? "text-stock-low" : "text-success";
          return (
            <li key={item.id} className={`${cardClass} flex flex-col p-4`}>
              <Link to={url} className="relative block h-40 overflow-hidden rounded-md bg-surface-muted" tabIndex={-1} aria-hidden="true">
                {image ? (
                  <img src={image} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-contain p-2" />
                ) : (
                  <Heart size={32} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-text-tertiary" aria-hidden="true" />
                )}
              </Link>
              <p className="mt-3 min-h-[18px] text-xs font-bold uppercase tracking-wider text-text-tertiary">{item.brand}</p>
              <h3 className="-mt-2 min-h-[2.75rem] text-base font-bold leading-snug">
                <Link to={url} className="inline-flex min-h-[44px] items-center hover:text-belims-blue hover:underline">
                  {item.name}
                </Link>
              </h3>
              <p className="mt-1 min-h-[28px] text-xl font-bold">{price > 0 ? formatCurrency(price) : ""}</p>
              <p className={`text-base font-semibold ${stockTone}`}>{stock}</p>
              <div className="mt-auto flex gap-3 pt-4">
                {addToCart && (
                  <button type="button" onClick={() => live && addToCart(live)} disabled={!canAdd} className={`${btnBuy} min-w-0 flex-1 px-3`}>
                    Add to cart
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setPendingRemoval({ id: item.id, name: item.name })}
                  aria-label={`Remove ${item.name} from wishlist`}
                  className="inline-flex min-h-[44px] shrink-0 items-center px-2 font-heading font-condensed text-button font-bold uppercase tracking-wide text-belims-blue transition-colors hover:text-primary"
                >
                  Remove
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <ConfirmDialog
        open={pendingRemoval !== null}
        title="Remove from wishlist?"
        message={pendingRemoval ? `${pendingRemoval.name} will be removed from your wishlist.` : undefined}
        confirmLabel="Remove"
        onCancel={() => setPendingRemoval(null)}
        onConfirm={() => {
          if (pendingRemoval) removeFromWishlist(pendingRemoval.id);
          setPendingRemoval(null);
        }}
      />
    </div>
  );
};
