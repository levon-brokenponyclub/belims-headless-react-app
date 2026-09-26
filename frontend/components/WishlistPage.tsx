import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, Trash2, ShoppingCart, ArrowLeft } from "lucide-react";
import {
  WishlistItem,
  getWishlist,
  removeFromWishlist,
} from "../services/wishlistService";
import { Product } from "../types";
import { CURRENCY_SYMBOL } from "../constants";
import { buildProductUrl } from "../utils/product";

interface WishlistPageProps {
  addToCart?: (product: Product) => void;
}

export const WishlistPage: React.FC<WishlistPageProps> = ({ addToCart }) => {
  const navigate = useNavigate();
  const [items, setItems] = useState<WishlistItem[]>([]);

  const reload = () => setItems(getWishlist());

  useEffect(() => {
    reload();
    window.addEventListener("belims:wishlist-updated", reload);
    return () => window.removeEventListener("belims:wishlist-updated", reload);
  }, []);

  const handleRemove = (id: number) => {
    removeFromWishlist(id);
    reload();
  };

  const handleAddToCart = (item: WishlistItem) => {
    if (!addToCart) return;
    addToCart({
      id: item.id,
      name: item.name,
      sku: item.sku,
      price: item.price,
      regular_price: item.price,
      sale_price: null,
      image: item.image || "",
      slug: item.slug,
      category: item.category || "",
      brand: item.brand,
      stock_status: "instock",
      stock_quantity: null,
      short_description: "",
      description: "",
      features: [],
      breadcrumbs: [],
    } as unknown as Product);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto max-w-4xl px-4 py-10">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
          >
            <ArrowLeft size={16} /> Back
          </button>
          <div className="flex items-center gap-2">
            <Heart size={22} className="text-red-500 fill-red-500" />
            <h1 className="text-2xl font-bold text-gray-900">My Wishlist</h1>
            {items.length > 0 && (
              <span className="ml-1 rounded-full bg-belims-blue px-2 py-0.5 text-xs font-bold text-white">
                {items.length}
              </span>
            )}
          </div>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center py-24 text-center">
            <Heart size={56} className="mb-4 text-gray-200" />
            <p className="text-lg font-semibold text-gray-400">
              Your wishlist is empty
            </p>
            <p className="mt-1 text-sm text-gray-400">
              Save products you love by tapping the heart icon on any product.
            </p>
            <button
              type="button"
              onClick={() => navigate("/")}
              className="mt-6 rounded-full bg-belims-blue px-6 py-2.5 text-sm font-semibold text-white hover:bg-belims-accent transition-colors"
            >
              Start shopping
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => {
              const productUrl = buildProductUrl({ name: item.name, slug: item.slug, id: item.id, category: item.category });
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                >
                  {/* Image */}
                  <button
                    type="button"
                    onClick={() => navigate(productUrl)}
                    className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-gray-100 bg-gray-50 flex items-center justify-center"
                  >
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="h-full w-full object-contain p-1 mix-blend-multiply"
                      />
                    ) : (
                      <Heart size={24} className="text-gray-200" />
                    )}
                  </button>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    {item.brand && (
                      <p className="mb-0.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        {item.brand}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => navigate(productUrl)}
                      className="text-left text-sm font-semibold text-gray-900 hover:text-belims-blue line-clamp-2"
                    >
                      {item.name}
                    </button>
                    <p className="mt-1 text-xs text-gray-400">SKU: {item.sku}</p>
                    <p className="mt-1 font-bold text-gray-900">
                      {item.price > 0
                        ? `${CURRENCY_SYMBOL}${Number(item.price).toFixed(2)}`
                        : <span className="text-gray-400 text-xs font-normal">Price unavailable</span>
                      }
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    {addToCart && (
                      <button
                        type="button"
                        onClick={() => handleAddToCart(item)}
                        className="flex items-center gap-1.5 rounded-full bg-belims-blue px-3 py-1.5 text-xs font-semibold text-white hover:bg-belims-accent transition-colors"
                      >
                        <ShoppingCart size={13} />
                        Add to cart
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemove(item.id)}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={13} />
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
