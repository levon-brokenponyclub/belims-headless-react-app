import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, Minus, Plus, Trash2 } from "lucide-react";
import { CartItem } from "../types";
import { formatCurrency } from "../utils/price";
import { FREE_SHIPPING_THRESHOLD } from "../constants";
import { validateCoupon } from "../services/wooCommerceService";
import { isInWishlist, toggleWishlist } from "../services/wishlistService";

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

  const shipping = subtotal - couponDiscount >= FREE_SHIPPING_THRESHOLD ? 0 : 150;
  const total = Math.max(0, subtotal - couponDiscount) + shipping;
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
          className="rounded-pill bg-belims-blue px-8 py-3 text-sm font-bold text-white hover:bg-belims-blue/90 transition-colors"
        >
          Browse products
        </button>
      </section>
    );
  }

  return (
    <section className="py-10 bg-[#F8F9FA] min-h-[80vh]">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl sm:text-3xl font-bold text-text mb-8 font-heading">
          My Shopping Cart
        </h2>

        <div className="flex flex-col xl:flex-row gap-6">
          {/* ─── Cart Table ───────────────────────────────────────────────── */}
          <div className="flex-1 min-w-0">
            <div className="rounded-xl bg-white overflow-hidden border border-border">
              {/* Desktop table */}
              <table className="w-full hidden sm:table">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs font-semibold uppercase tracking-wide text-text-secondary px-5 py-4 w-20">
                      Product
                    </th>
                    <th className="text-left text-xs font-semibold uppercase tracking-wide text-text-secondary px-5 py-4">
                      Details
                    </th>
                    <th className="text-left text-xs font-semibold uppercase tracking-wide text-text-secondary px-5 py-4 w-36">
                      Quantity
                    </th>
                    <th className="text-left text-xs font-semibold uppercase tracking-wide text-text-secondary px-5 py-4 w-28">
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
                        <p className="font-semibold text-text text-sm leading-snug mb-0.5">
                          {item.name}
                        </p>
                        {item.brand && (
                          <p className="text-xs text-text-secondary">{item.brand}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2">
                          <button
                            type="button"
                            onClick={() => handleToggleWishlist(item)}
                            className={`inline-flex items-center gap-1 text-xs font-medium transition-colors ${
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
                            className="inline-flex items-center gap-1 text-xs font-medium text-text-secondary hover:text-deal-sale transition-colors"
                          >
                            <Trash2 size={14} />
                            Remove
                          </button>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="inline-flex items-center rounded-lg border border-border overflow-hidden">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, -1)}
                            className="flex h-9 w-9 items-center justify-center text-text-secondary hover:bg-surface-muted transition-colors"
                            aria-label="Decrease quantity"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="flex h-9 w-10 items-center justify-center text-sm font-semibold text-text border-x border-border">
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
                        <span className="font-semibold text-text text-sm">
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
                      <p className="font-semibold text-sm text-text leading-snug mb-0.5 truncate">
                        {item.name}
                      </p>
                      {item.brand && (
                        <p className="text-xs text-text-secondary mb-2">{item.brand}</p>
                      )}
                      <div className="flex items-center justify-between gap-2">
                        <div className="inline-flex items-center rounded-lg border border-border overflow-hidden">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, -1)}
                            className="flex h-8 w-8 items-center justify-center text-text-secondary hover:bg-surface-muted"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="flex h-8 w-8 items-center justify-center text-xs font-semibold border-x border-border">
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
                        <span className="font-semibold text-sm text-text">
                          {formatCurrency(item.price * item.quantity)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <button
                          type="button"
                          onClick={() => handleToggleWishlist(item)}
                          className={`inline-flex items-center gap-1 text-xs font-medium transition-colors ${
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
                          className="inline-flex items-center gap-1 text-xs font-medium text-text-secondary hover:text-deal-sale transition-colors"
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

          {/* ─── Sidebar ──────────────────────────────────────────────────── */}
          <div className="w-full xl:w-[340px] flex-shrink-0 space-y-4">
            {/* Apply Coupon */}
            <div className="rounded-xl bg-white border border-border p-5">
              <h3 className="font-bold text-text text-sm mb-4 pb-3 border-b border-border">
                Apply Coupon
              </h3>
              <p className="text-xs text-text-secondary mb-3">Have a promo code?</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponInput}
                  onChange={(e) => {
                    setCouponInput(e.target.value.toUpperCase());
                    setCouponError(null);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()}
                  placeholder="Enter code here"
                  disabled={!!couponApplied}
                  className="flex-1 rounded-xl border border-border bg-white px-3 py-2 text-sm text-text placeholder:text-text-tertiary focus:border-primary focus:outline-none transition-colors disabled:bg-surface-muted disabled:text-text-tertiary"
                />
                {couponApplied ? (
                  <button
                    type="button"
                    onClick={() => {
                      setCouponApplied(null);
                      setCouponInput("");
                      onApplyCoupon?.({ code: "", discount_type: "", amount: "0" });
                    }}
                    className="px-4 py-2 rounded-xl border border-border text-sm font-bold text-text-secondary hover:bg-surface-muted transition-colors"
                  >
                    Remove
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={!couponInput.trim() || couponLoading}
                    className="px-4 py-2 rounded-xl bg-belims-blue text-sm font-bold text-white hover:bg-belims-blue/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                  >
                    {couponLoading ? "…" : "Apply"}
                  </button>
                )}
              </div>
              {couponApplied && (
                <p className="mt-2 text-xs font-medium text-green-600">
                  Coupon <strong>{couponApplied}</strong> applied.
                </p>
              )}
              {couponError && (
                <p className="mt-2 text-xs font-medium text-deal-sale">{couponError}</p>
              )}
            </div>

            {/* Order Summary */}
            <div className="rounded-xl bg-white border border-border p-5">
              <h3 className="font-bold text-text text-sm mb-4 pb-3 border-b border-border">
                Order Summary
              </h3>
              <ul className="space-y-3 text-sm mb-4">
                <li className="flex justify-between">
                  <span className="text-text-secondary">
                    Subtotal ({itemCount} {itemCount === 1 ? "item" : "items"})
                  </span>
                  <span className="font-semibold text-text">{formatCurrency(subtotal)}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-text-secondary">Shipping</span>
                  <span className="font-semibold text-text">
                    {shipping === 0 ? "Free" : formatCurrency(shipping)}
                  </span>
                </li>
                {couponDiscount > 0 && (
                  <li className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span className="font-semibold">-{formatCurrency(couponDiscount)}</span>
                  </li>
                )}
              </ul>
              <div className="flex justify-between items-center border-t border-border pt-3 mb-5">
                <span className="font-bold text-text">Total</span>
                <span className="font-bold text-text text-base">{formatCurrency(total)}</span>
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => {
                    if (isAuthenticated) {
                      navigate("/checkout");
                    } else {
                      onRequestAuth?.();
                    }
                  }}
                  className="w-full rounded-pill bg-belims-blue py-3 text-sm font-bold text-white hover:bg-belims-blue/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/60"
                >
                  Proceed to Checkout
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/shop")}
                  className="w-full rounded-pill border border-border bg-white py-3 text-sm font-bold text-text-secondary hover:bg-surface-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  Continue Shopping
                </button>
              </div>

              {/* Payment badges */}
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                {/* Mastercard */}
                <svg xmlns="http://www.w3.org/2000/svg" width="33" height="20" viewBox="0 0 33 20" fill="none" aria-label="Mastercard"><path d="M16.5 16.85C14.9081 18.2384 12.8717 19.0018 10.7651 19C5.8823 19 1.92419 14.9705 1.92419 10C1.92419 5.0295 5.8823 1 10.7651 1C12.9538 1 14.9562 1.8095 16.5 3.15C18.0919 1.76164 20.1284 0.998188 22.2349 1C27.1177 1 31.0758 5.0295 31.0758 10C31.0758 14.9705 27.1177 19 22.2349 19C20.1284 19.0018 18.0919 18.2384 16.5 16.85Z" fill="#ED0006"/><path d="M16.5001 16.85C17.4775 16.0006 18.261 14.9488 18.7972 13.7666C19.3333 12.5843 19.6094 11.2995 19.6066 10C19.6094 8.70048 19.3333 7.41567 18.7972 6.23343C18.261 5.05119 17.4775 3.99941 16.5001 3.15C18.092 1.76164 20.1285 0.998188 22.2351 1C27.1178 1 31.0759 5.0295 31.0759 10C31.0759 14.9705 27.1178 19 22.2351 19C20.1285 19.0018 18.092 18.2384 16.5001 16.85Z" fill="#F9A000"/><path d="M16.5002 16.8494C17.4775 16 18.261 14.9482 18.7972 13.766C19.3333 12.5837 19.6094 11.2989 19.6066 9.99941C19.6094 8.69989 19.3333 7.41508 18.7972 6.23284C18.261 5.0506 17.4775 3.99882 16.5002 3.14941C15.5229 3.99887 14.7394 5.05067 14.2034 6.23291C13.6673 7.41514 13.3913 8.69993 13.3942 9.99941C13.3913 11.2989 13.6673 12.5837 14.2034 13.7659C14.7394 14.9482 15.5229 16 16.5002 16.8494Z" fill="#FF5E00"/></svg>
                {/* Visa */}
                <svg xmlns="http://www.w3.org/2000/svg" width="34" height="20" viewBox="0 0 34 20" fill="none" aria-label="Visa"><g clipPath="url(#visa-clip)"><path d="M8.37382 15.2505H5.49963L3.34412 6.97633C3.24183 6.59553 3.02453 6.25899 2.70494 6.10059C1.90782 5.70166 1.02908 5.38486 0.0703125 5.22486V4.90593H4.70092C5.3401 4.90593 5.81922 5.38486 5.89872 5.94059L7.01702 11.9097L9.89015 4.90593H12.6848L8.37382 15.2505ZM14.2828 15.2505H11.5681L13.8031 4.90539H16.5178L14.2828 15.2505ZM20.0301 7.77153C20.1096 7.21419 20.5893 6.89579 21.1484 6.89579C22.0272 6.81579 22.9843 6.97579 23.783 7.37313L24.2622 5.14539C23.4734 4.83414 22.6343 4.67196 21.7871 4.66699C19.153 4.66699 17.2354 6.10006 17.2354 8.08886C17.2354 9.60139 18.5933 10.3961 19.5521 10.8745C20.5893 11.3518 20.9884 11.6702 20.9089 12.1475C20.9089 12.8633 20.1096 13.1822 19.3125 13.1822C18.3537 13.1822 17.3955 12.9433 16.5178 12.5449L16.0387 14.7737C16.9975 15.1705 18.0341 15.3305 18.9929 15.3305C21.9471 15.4094 23.783 13.9774 23.783 11.8291C23.783 9.12299 20.0301 8.96459 20.0301 7.77153ZM33.2838 15.2505L31.1283 4.90539H28.8122C28.3331 4.90539 27.854 5.22433 27.6939 5.70113L23.703 15.2505H26.4972L27.0547 13.739H30.4886L30.8082 15.2505H33.2838ZM29.2124 7.69153L30.01 11.5902H27.7745L29.2124 7.69153Z" fill="#172B85"/></g><defs><clipPath id="visa-clip"><rect width="34" height="20" fill="white"/></clipPath></defs></svg>
                {/* PayPal */}
                <svg xmlns="http://www.w3.org/2000/svg" width="44" height="20" viewBox="0 0 44 20" fill="none" aria-label="PayPal"><g clipPath="url(#pp-clip)"><path d="M7.79347 5.37018C7.25507 5.00065 6.55251 4.81543 5.68578 4.81543H2.33027C2.06456 4.81543 1.91777 4.9481 1.88988 5.21313L0.52674 13.7558C0.512573 13.8398 0.533599 13.9165 0.589624 13.9862C0.645329 14.0562 0.715393 14.091 0.799304 14.091H2.39315C2.6727 14.091 2.82635 13.9586 2.85456 13.6931L3.232 11.3901C3.24578 11.2785 3.29494 11.1877 3.37885 11.1178C3.4627 11.0481 3.56757 11.0024 3.69341 10.9815C3.81924 10.9608 3.93789 10.9503 4.04994 10.9503C4.16168 10.9503 4.29443 10.9574 4.44847 10.9713C4.60212 10.9852 4.70007 10.992 4.74206 10.992C5.94437 10.992 6.88809 10.6538 7.57328 9.97658C8.25815 9.29965 8.60097 8.36097 8.60097 7.16033C8.60097 6.33677 8.33161 5.74004 7.79347 5.36992V5.37018ZM6.06334 7.9353C5.99321 8.42394 5.81168 8.74484 5.51809 8.89844C5.22443 9.05223 4.80501 9.12865 4.25982 9.12865L3.5677 9.14964L3.9243 6.90919C3.95212 6.75578 4.04296 6.67898 4.19687 6.67898H4.59546C5.15443 6.67898 5.56014 6.75943 5.8118 6.91969C6.06334 7.08033 6.14725 7.41901 6.06334 7.9353Z" fill="#003087"/><path d="M31.6178 5.37018C31.0794 5.00065 30.377 4.81543 29.5101 4.81543H26.1755C25.8958 4.81543 25.7419 4.9481 25.7142 5.21313L24.351 13.7558C24.3368 13.8398 24.3578 13.9165 24.4138 13.9863C24.4693 14.0562 24.5396 14.091 24.6235 14.091H26.3431C26.5109 14.091 26.6227 14.0003 26.6787 13.8188L27.0563 11.3901C27.0701 11.2785 27.1191 11.1877 27.2031 11.1178C27.287 11.0481 27.3917 11.0024 27.5177 10.9815C27.6435 10.9608 27.7621 10.9503 27.8742 10.9503C27.986 10.9503 28.1187 10.9574 28.2726 10.9713C28.4263 10.9852 28.5246 10.992 28.5662 10.992C29.7687 10.992 30.7122 10.6538 31.3974 9.97658C32.0826 9.29965 32.4251 8.36097 32.4251 7.16033C32.4252 6.33684 32.1559 5.7401 31.6178 5.36999V5.37018Z" fill="#009CDE"/></g><defs><clipPath id="pp-clip"><rect width="44" height="20" fill="white"/></clipPath></defs></svg>
              </div>
              <div className="flex items-center justify-center gap-1.5 mt-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 29 28" fill="none" aria-hidden="true"><path d="M6.07178 8.18676C6.07177 7.50195 6.4712 6.88006 7.09397 6.59526L13.7719 3.54133C14.2341 3.32997 14.7654 3.32997 15.2276 3.54133L21.9056 6.59527C22.5283 6.88007 22.9277 7.50193 22.9278 8.18672L22.9278 14.5626C22.9279 16.2022 22.4254 17.8057 21.3948 19.0808C19.5488 21.3648 16.4535 24.7918 14.4999 24.7918C12.5463 24.7918 9.45087 21.3647 7.6049 19.0807C6.57437 17.8057 6.07189 16.2022 6.07187 14.5628L6.07178 8.18676Z" fill="#16A34A"/><path d="M17.9728 10.785L13.2923 15.4655L11.0271 13.2003M14.4999 24.7918C16.4535 24.7918 19.5488 21.3648 21.3948 19.0808C22.4254 17.8057 22.9279 16.2022 22.9278 14.5626L22.9278 8.18672C22.9277 7.50193 22.5283 6.88007 21.9056 6.59527L15.2276 3.54133C14.7654 3.32997 14.2341 3.32997 13.7719 3.54133L7.09397 6.59526C6.4712 6.88006 6.07177 7.50195 6.07178 8.18676L6.07187 14.5628C6.07189 16.2022 6.57437 17.8057 7.6049 19.0807C9.45087 21.3647 12.5463 24.7918 14.4999 24.7918Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <p className="text-xs text-text-secondary">Secure checkout payment processing</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
