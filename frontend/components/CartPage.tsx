import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, Minus, Plus, Trash2 } from "lucide-react";
import { CartItem } from "../types";
import { formatCurrency } from "../utils/price";
import { FREE_SHIPPING_THRESHOLD } from "../constants";
import { validateCoupon } from "../services/wooCommerceService";
import { isInWishlist, toggleWishlist } from "../services/wishlistService";
import { buyButtonClass, outlineButtonClass, pageTitleClass, primaryButtonClass } from "./ui/classes";
import { CouponField, SummaryHeading, SummaryTotals, TrustTiles, summaryCardClass } from "./OrderSummaryParts";

interface CartPageProps {
  cartItems: CartItem[];
  updateQuantity: (id: string, delta: number) => void;
  removeItem: (id: string) => void;
  couponDetails?: { code: string; discount_type: string; amount: string } | null;
  onApplyCoupon?: (coupon: { code: string; discount_type: string; amount: string }) => void;
  isAuthenticated?: boolean;
  onRequestAuth?: () => void;
}

export function CartPage({
  cartItems,
  updateQuantity,
  removeItem,
  couponDetails,
  onApplyCoupon,
  isAuthenticated,
  onRequestAuth,
}: CartPageProps) {
  const navigate = useNavigate();

  const [wishlisted, setWishlisted] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    cartItems.forEach((item) => {
      map[item.id] = isInWishlist(Number(item.id));
    });
    return map;
  });

  const [couponInput, setCouponInput] = useState(couponDetails?.code ?? "");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponApplied, setCouponApplied] = useState<string | null>(
    couponDetails?.code ?? null,
  );

  // ─── Totals ───────────────────────────────────────────────────────────────
  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  const couponDiscount = (() => {
    if (!couponDetails) return 0;
    const amount = parseFloat(couponDetails.amount);
    if (isNaN(amount)) return 0;
    if (couponDetails.discount_type === "percent") return subtotal * (amount / 100);
    return Math.min(amount, subtotal);
  })();

  // Delivery is quoted at checkout; the cart only shows when it's free.
  const qualifiesForFreeShipping = subtotal - couponDiscount >= FREE_SHIPPING_THRESHOLD;
  const total = Math.max(0, subtotal - couponDiscount);
  const itemCount = cartItems.reduce((s, i) => s + i.quantity, 0);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleToggleWishlist = (item: CartItem) => {
    const updated = toggleWishlist(
      { id: Number(item.id), name: item.name, price: item.price, image: item.image },
      wishlisted[item.id],
    );
    setWishlisted((prev) => ({ ...prev, [item.id]: updated }));
  };

  const handleApplyCoupon = async () => {
    const code = couponInput.trim();
    if (!code) return;
    setCouponLoading(true);
    setCouponError(null);
    try {
      const coupon = await validateCoupon(code);
      onApplyCoupon?.({
        code: coupon.code,
        discount_type: coupon.discount_type,
        amount: coupon.amount,
      });
      setCouponApplied(coupon.code);
    } catch (err: unknown) {
      setCouponError(err instanceof Error ? err.message : "Invalid coupon code.");
    } finally {
      setCouponLoading(false);
    }
  };

  // ─── Empty state ──────────────────────────────────────────────────────────
  if (cartItems.length === 0) {
    return (
      <section className="py-20 bg-white min-h-[60vh] flex flex-col items-center justify-center">
        <p className="text-lg font-semibold text-text mb-2">Your cart is empty</p>
        <p className="text-sm text-text-secondary mb-6">
          Add some products and come back here.
        </p>
        <button
          type="button"
          onClick={() => navigate("/shop")}
          className={`${primaryButtonClass} px-8`}
        >
          Browse products
        </button>
      </section>
    );
  }

  return (
    <section className="py-10 bg-surface-muted min-h-[80vh]">
      <div className="container mx-auto px-4">
        <h1 className={`${pageTitleClass} mb-8`}>Cart</h1>

        <div className="flex flex-col xl:flex-row gap-6">
          {/* ─── Cart Table ───────────────────────────────────────────────── */}
          <div className="flex-1 min-w-0">
            <div className={summaryCardClass}>
              {/* Desktop table */}
              <table className="w-full hidden sm:table">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-sm font-semibold uppercase tracking-wide text-text-secondary px-5 py-4 w-20">
                      Product
                    </th>
                    <th className="text-left text-sm font-semibold uppercase tracking-wide text-text-secondary px-5 py-4">
                      Details
                    </th>
                    <th className="text-left text-sm font-semibold uppercase tracking-wide text-text-secondary px-5 py-4 w-36">
                      Quantity
                    </th>
                    <th className="text-left text-sm font-semibold uppercase tracking-wide text-text-secondary px-5 py-4 w-28">
                      Price
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {cartItems.map((item) => (
                    <tr key={item.id}>
                      <td className="px-5 py-4">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-16 h-16 rounded-lg object-cover bg-surface-muted"
                          loading="lazy"
                        />
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-text text-base leading-snug mb-0.5">
                          {item.name}
                        </p>
                        {item.brand && (
                          <p className="text-sm text-text-secondary">{item.brand}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2">
                          <button
                            type="button"
                            onClick={() => handleToggleWishlist(item)}
                            className={`inline-flex items-center gap-1 text-sm font-medium transition-colors ${
                              wishlisted[item.id]
                                ? "text-deal-sale"
                                : "text-text-secondary hover:text-deal-sale"
                            }`}
                          >
                            <Heart
                              size={14}
                              fill={wishlisted[item.id] ? "currentColor" : "none"}
                            />
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="inline-flex items-center gap-1 text-sm font-medium text-text-secondary hover:text-deal-sale transition-colors"
                          >
                            <Trash2 size={14} />
                            Remove
                          </button>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="inline-flex items-center rounded-md border-2 border-border overflow-hidden">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, -1)}
                            className="flex h-9 w-9 items-center justify-center text-text-secondary hover:bg-surface-muted transition-colors"
                            aria-label="Decrease quantity"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="flex h-9 w-10 items-center justify-center text-base font-semibold text-text border-x border-border">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, 1)}
                            className="flex h-9 w-9 items-center justify-center text-text-secondary hover:bg-surface-muted transition-colors"
                            aria-label="Increase quantity"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-semibold text-text text-base">
                          {formatCurrency(item.price * item.quantity)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile stacked cards */}
              <div className="sm:hidden divide-y divide-border">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex gap-3 p-4">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-16 h-16 flex-shrink-0 rounded-lg object-cover bg-surface-muted"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-base text-text leading-snug mb-0.5 truncate">
                        {item.name}
                      </p>
                      {item.brand && (
                        <p className="text-sm text-text-secondary mb-2">{item.brand}</p>
                      )}
                      <div className="flex items-center justify-between gap-2">
                        <div className="inline-flex items-center rounded-md border-2 border-border overflow-hidden">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, -1)}
                            className="flex h-8 w-8 items-center justify-center text-text-secondary hover:bg-surface-muted"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="flex h-8 w-8 items-center justify-center text-base font-semibold border-x border-border">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, 1)}
                            className="flex h-8 w-8 items-center justify-center text-text-secondary hover:bg-surface-muted"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                        <span className="font-semibold text-base text-text">
                          {formatCurrency(item.price * item.quantity)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <button
                          type="button"
                          onClick={() => handleToggleWishlist(item)}
                          className={`inline-flex items-center gap-1 text-sm font-medium transition-colors ${
                            wishlisted[item.id]
                              ? "text-deal-sale"
                              : "text-text-secondary hover:text-deal-sale"
                          }`}
                        >
                          <Heart
                            size={12}
                            fill={wishlisted[item.id] ? "currentColor" : "none"}
                          />
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="inline-flex items-center gap-1 text-sm font-medium text-text-secondary hover:text-deal-sale transition-colors"
                        >
                          <Trash2 size={12} />
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ─── Order summary (same card as checkout) ───────────────────── */}
          <aside className="w-full flex-shrink-0 xl:w-[380px]">
            <article className={summaryCardClass}>
              <SummaryHeading itemCount={itemCount} />
              <CouponField
                value={couponInput}
                onChange={(value) => {
                  setCouponInput(value.toUpperCase());
                  setCouponError(null);
                }}
                onApply={handleApplyCoupon}
                onRemove={() => {
                  setCouponApplied(null);
                  setCouponInput("");
                  onApplyCoupon?.({ code: "", discount_type: "", amount: "0" });
                }}
                appliedCode={couponApplied}
                error={couponError}
                loading={couponLoading}
              />
              <SummaryTotals
                total={total}
                rows={[
                  { label: "Subtotal", value: formatCurrency(subtotal) },
                  ...(couponDiscount > 0
                    ? [{ label: "Discount", value: `-${formatCurrency(couponDiscount)}`, tone: "success" as const }]
                    : []),
                  { label: "Shipping", value: qualifiesForFreeShipping ? "Free" : "Calculated at checkout" },
                ]}
              />
              <div className="space-y-3 border-t border-border px-5 py-4">
                <button
                  type="button"
                  onClick={() => {
                    if (isAuthenticated) {
                      navigate("/checkout");
                    } else {
                      onRequestAuth?.();
                    }
                  }}
                  className={`${buyButtonClass} w-full`}
                >
                  Checkout
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/shop")}
                  className={`${outlineButtonClass} w-full`}
                >
                  Continue shopping
                </button>
              </div>
              <TrustTiles />
            </article>
          </aside>
        </div>
      </div>
    </section>
  );
}
