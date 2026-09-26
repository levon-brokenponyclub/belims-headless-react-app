import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  FileText,
  Loader,
  MapPin,
  Minus,
  Plus,
  RotateCcw,
  ShoppingBag,
  Tag,
  Trash2,
  Truck,
  X,
} from "lucide-react";
import { CartItem } from "../types";
import { FREE_SHIPPING_THRESHOLD } from "../constants";
import { formatCurrency } from "../utils/price";
import { getShippingRates } from "../services/bobGoService";
import { validateCoupon } from "../services/wooCommerceService";

const DRAWER_ANIMATION_MS = 300;

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  updateQuantity: (id: string, delta: number) => void;
  removeItem: (id: string) => void;
  onCheckout?: () => void;
  onApplyCoupon?: (coupon: { code: string; discount_type: string; amount: string }) => void;
  couponDetails?: { code: string; discount_type: string; amount: string } | null;
  onSaveOrderNote?: (note: string) => void;
  onEstimateShipping?: (postalCode: string) => void;
}

type AddonPanel = "note" | "shipping" | "coupon" | null;

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  updateQuantity,
  removeItem,
  onCheckout,
  onApplyCoupon,
  couponDetails,
  onSaveOrderNote,
  onEstimateShipping,
}) => {
  const [shouldRender, setShouldRender] = useState(false);
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);

  const [activePanel, setActivePanel] = useState<AddonPanel>(null);
  const [noteInput, setNoteInput] = useState("");
  const [postalInput, setPostalInput] = useState("");
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [detectingLocation, setDetectingLocation] = useState(false);

  type ShippingRate = { service_name: string; total_price: number; expected_delivery_date?: string };
  const [estimateRates, setEstimateRates] = useState<ShippingRate[]>([]);
  const [estimateLoading, setEstimateLoading] = useState(false);
  const [estimateError, setEstimateError] = useState<string | null>(null);

  const openPanel = (panel: Exclude<AddonPanel, null>) => {
    setActivePanel((prev) => (prev === panel ? null : panel));
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) return;
    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
          );
          const data = await res.json();
          const postal =
            data?.address?.postcode ?? data?.address?.postal_code ?? "";
          if (postal) setPostalInput(postal);
        } catch {
          // silent fallback
        } finally {
          setDetectingLocation(false);
        }
      },
      () => setDetectingLocation(false),
    );
  };

  const handleCalculateShipping = async () => {
    const code = postalInput.trim();
    if (!code) return;
    setEstimateLoading(true);
    setEstimateError(null);
    setEstimateRates([]);
    try {
      const rates = await getShippingRates({
        destination_address: { postal_code: code, city: "", country: "ZA" },
        items: items.map((item) => ({ id: item.id, quantity: item.quantity })),
      });
      setEstimateRates(rates);
      onEstimateShipping?.(code);
    } catch (err: any) {
      setEstimateError(err?.message ?? "Could not retrieve shipping rates.");
    } finally {
      setEstimateLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setIsDrawerVisible(false);

      const frame = requestAnimationFrame(() => {
        requestAnimationFrame(() => setIsDrawerVisible(true));
      });

      return () => cancelAnimationFrame(frame);
    }

    setIsDrawerVisible(false);
    const timeout = window.setTimeout(() => {
      setShouldRender(false);
    }, DRAWER_ANIMATION_MS);

    return () => window.clearTimeout(timeout);
  }, [isOpen]);

  const totalQuantity = useMemo(
    () => items.reduce((acc, item) => acc + item.quantity, 0),
    [items],
  );

  const subtotal = useMemo(
    () => items.reduce((acc, item) => acc + item.price * item.quantity, 0),
    [items],
  );

  const couponDiscount = useMemo(() => {
    if (!couponDetails) return 0;
    const amount = parseFloat(couponDetails.amount);
    if (isNaN(amount) || amount <= 0) return 0;
    if (couponDetails.discount_type === "percent") {
      return subtotal * (amount / 100);
    }
    return amount;
  }, [couponDetails, subtotal]);

  const remainingForFreeShip = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const progressPercent = Math.min(
    100,
    (subtotal / FREE_SHIPPING_THRESHOLD) * 100,
  );
  const hasFreeShipping = remainingForFreeShip === 0;

  if (!shouldRender) return null;

  const itemCountLabel = `${totalQuantity} ${
    totalQuantity === 1 ? "item" : "items"
  }`;

  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden">
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${
          isDrawerVisible ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-drawer-title"
        aria-describedby="cart-drawer-description"
        className={`absolute inset-y-0 right-0 flex h-full w-full flex-col border-l border-border bg-white p-0 text-text shadow-xl transition-transform duration-300 sm:max-w-md overflow-hidden ${
          isDrawerVisible ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between gap-4 border-b border-border px-6 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <ShoppingBag className="h-5 w-5 shrink-0" />
            <h2
              id="cart-drawer-title"
              className="text-h6 font-semibold text-text"
            >
              Your Bag
            </h2>
            <span className="text-sm text-text-tertiary">({itemCountLabel})</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-transparent p-2 text-text-tertiary opacity-80 transition-colors hover:bg-surface-muted hover:text-text hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-strong focus-visible:ring-offset-2"
            aria-label="Close cart"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {items.length > 0 && !hasFreeShipping ? (
          <div className="border-b border-border bg-white px-6 py-4">
            <div className="mb-2 flex items-center gap-2 text-[14px] text-text">
              <Truck className="h-4 w-4 shrink-0" />
              <span>
                Add{" "}
                <strong className="font-semibold">
                  {formatCurrency(remainingForFreeShip)}
                </strong>{" "}
                more for free shipping
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-soft">
              <div
                className="h-full rounded-full bg-secondary transition-all duration-500 ease-out"
                style={{ width: `${progressPercent.toFixed(2)}%` }}
              />
            </div>
          </div>
        ) : null}

        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-6 py-16 text-center">
              <ShoppingBag className="mb-4 h-10 w-10 text-text-disabled" />
              <p className="text-base font-semibold text-text">
                Your bag is empty
              </p>
              <p className="mt-1 text-sm text-text-tertiary">
                Add products to continue.
              </p>
            </div>
          ) : (
            <ul role="list" className="divide-y divide-border">
              {items.map((item) => {
                const compareAt =
                  item.regular_price && item.regular_price > item.price
                    ? item.regular_price * item.quantity
                    : null;

                return (
                  <li key={item.id} className="px-6 py-4">
                    <div className="flex gap-4">
                      <div className="group relative h-24 w-20 shrink-0 overflow-hidden rounded-lg bg-white">
                        <img
                          src={item.image || "/placeholder.png"}
                          alt={item.name}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-contain p-2 transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="line-clamp-1 text-base font-semibold text-text">
                              {item.name}
                            </h3>
                            {item.sku || item.category ? (
                              <p className="mt-1 line-clamp-1 text-[12px] font-normal leading-4 tracking-normal text-text-secondary">
                                {item.sku || item.category}
                              </p>
                            ) : null}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="-mr-2 -mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md p-0 text-text-tertiary transition-colors hover:bg-surface-muted hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-strong"
                            aria-label={`Remove ${item.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center rounded-lg border border-border bg-white">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.id, -1)}
                              disabled={item.quantity <= 1}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-l-lg text-text-secondary transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-8 text-center text-sm font-medium text-text">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.id, 1)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-r-lg text-text-secondary transition-colors hover:bg-surface-muted"
                              aria-label="Increase quantity"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>

                          <div className="text-right">
                            <span className="text-[14px] font-medium leading-5 tracking-normal text-text">
                              {formatCurrency(item.price * item.quantity)}
                            </span>
                            {compareAt ? (
                              <span className="block text-xs text-text-tertiary line-through">
                                {formatCurrency(compareAt)}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {items.length > 0 ? (
          <div className="flex items-center gap-2 border-t border-border px-6 py-3">
            {(
              [
                { id: "note" as const, label: "Order note", icon: <FileText className="h-3 w-3" /> },
                { id: "shipping" as const, label: "Estimate Shipping", icon: <Truck className="h-3 w-3" /> },
                { id: "coupon" as const, label: "Coupon", icon: appliedCoupon ? <Check className="h-3 w-3" /> : <Tag className="h-3 w-3" /> },
              ]
            ).map(({ id, label, icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => openPanel(id)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  activePanel === id
                    ? "border-border-strong bg-secondary text-white"
                    : appliedCoupon && id === "coupon"
                      ? "border-green-600 bg-green-50 text-green-700"
                      : "border-border bg-white text-text-secondary hover:border-border-soft"
                }`}
              >
                {icon}
                {label}
              </button>
            ))}
          </div>
        ) : null}

        {items.length > 0 ? (
          <div className="border-t border-border bg-white">
            <div className="space-y-2 px-6 py-4">
              <div className="flex items-center justify-between text-[14px] font-normal leading-5 tracking-normal text-text">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {couponDiscount > 0 ? (
                <div className="flex items-center justify-between text-[14px] font-normal leading-5 tracking-normal text-green-700">
                  <span>Discount</span>
                  <span>-{formatCurrency(couponDiscount)}</span>
                </div>
              ) : null}
              <div className="flex items-center justify-between text-[14px] font-normal leading-5 tracking-normal text-text">
                <span>Shipping</span>
                <span>
                  {hasFreeShipping
                    ? formatCurrency(0)
                    : "Calculated at checkout"}
                </span>
              </div>
              <div
                id="cart-drawer-description"
                className="flex items-center justify-between border-t border-border pt-2 text-[16px] font-semibold leading-6 tracking-normal text-text"
              >
                <span>Total</span>
                <span>{formatCurrency(Math.max(0, subtotal - couponDiscount))}</span>
              </div>
            </div>

            <div className="px-6 pb-6">
              <button
                type="button"
                onClick={onCheckout}
                className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-belims-blue text-base font-medium text-white transition-colors hover:bg-deal-sale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-strong focus-visible:ring-offset-2"
              >
                <span>Checkout</span>
                <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1" />
              </button>
            </div>

            <div className="flex items-center justify-center gap-6 border-t border-border px-6 pb-4 pt-4 text-[12px] font-normal leading-4 tracking-normal text-text">
              <span className="flex items-center gap-1.5">
                <Truck className="h-4 w-4" />
                Free delivery over {formatCurrency(FREE_SHIPPING_THRESHOLD)}
              </span>
              <span className="flex items-center gap-1.5">
                <RotateCcw className="h-4 w-4" />
                30-day returns
              </span>
            </div>
          </div>
        ) : null}

        {/* Addon panels — slide up from bottom of drawer */}
        {(["note", "shipping", "coupon"] as const).map((panel) => {
          const isPanelOpen = activePanel === panel;
          return (
            <div
              key={panel}
              aria-hidden={!isPanelOpen}
              className={`absolute inset-x-0 bottom-0 z-10 flex flex-col bg-white border-t border-border transition-transform duration-300 ${
                isPanelOpen ? "translate-y-0" : "translate-y-full"
              }`}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <p className="text-sm font-semibold text-text">
                  {panel === "note"
                    ? "Order note"
                    : panel === "shipping"
                      ? "Estimate Shipping"
                      : "Coupon"}
                </p>
                <button
                  type="button"
                  onClick={() => setActivePanel(null)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-tertiary hover:bg-surface-muted hover:text-text"
                  aria-label="Close panel"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="px-6 py-5 space-y-4">
                {panel === "note" && (
                  <>
                    <textarea
                      rows={4}
                      placeholder="Order special instructions"
                      value={noteInput}
                      onChange={(e) => setNoteInput(e.target.value)}
                      className="w-full resize-none rounded-md border border-border px-3 py-2 text-sm text-text placeholder:text-text-tertiary focus:border-border-soft focus:outline-none focus:ring-1 focus:ring-border-soft"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        onSaveOrderNote?.(noteInput);
                        setActivePanel(null);
                      }}
                      className="inline-flex h-10 w-full items-center justify-center rounded-md bg-secondary text-sm font-medium text-white hover:bg-secondary"
                    >
                      Apply
                    </button>
                  </>
                )}

                {panel === "shipping" && (
                  <>
                    <button
                      type="button"
                      onClick={handleDetectLocation}
                      disabled={detectingLocation}
                      className="flex w-full items-center justify-center gap-2 rounded-md border border-border py-3 text-sm font-semibold text-text hover:bg-surface-muted transition-colors disabled:opacity-60"
                    >
                      {detectingLocation ? (
                        <Loader className="h-4 w-4 animate-spin" />
                      ) : (
                        <MapPin className="h-4 w-4" />
                      )}
                      Use your location.
                    </button>
                    <input
                      type="text"
                      placeholder="Postal code"
                      value={postalInput}
                      onChange={(e) => {
                        setPostalInput(e.target.value);
                        setEstimateRates([]);
                        setEstimateError(null);
                      }}
                      className="w-full rounded-md border border-border px-3 py-2 text-sm text-text placeholder:text-text-tertiary focus:border-border-soft focus:outline-none focus:ring-1 focus:ring-border-soft"
                    />
                    <button
                      type="button"
                      onClick={handleCalculateShipping}
                      disabled={estimateLoading || !postalInput.trim()}
                      className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-secondary text-sm font-medium text-white hover:bg-secondary disabled:opacity-60"
                    >
                      {estimateLoading ? <Loader className="h-4 w-4 animate-spin" /> : null}
                      Calculate
                    </button>

                    {estimateError ? (
                      <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                        {estimateError}
                      </div>
                    ) : estimateRates.length > 0 ? (
                      <div className="rounded-lg bg-green-50 px-4 py-3 space-y-2">
                        <p className="text-sm font-bold text-green-800">
                          {estimateRates.length === 1
                            ? "Shipping rate for your address:"
                            : "There are multiple shipping rates for your address:"}
                        </p>
                        <ul className="list-disc space-y-1 pl-4" role="list">
                          {estimateRates.map((rate, i) => (
                            <li key={i} className="text-sm text-green-700">
                              {rate.service_name}:{" "}
                              {rate.total_price === 0 ? "FREE" : formatCurrency(rate.total_price)}
                              {rate.expected_delivery_date ? (
                                <span className="text-green-600 ml-1">
                                  — {rate.expected_delivery_date}
                                </span>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </>
                )}

                {panel === "coupon" && (
                  <>
                    {appliedCoupon ? (
                      <div className="flex items-center justify-between rounded-lg bg-green-50 px-4 py-3">
                        <p className="text-sm font-medium text-green-800">
                          <Check className="inline h-4 w-4 mr-1" />
                          {appliedCoupon} applied
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setAppliedCoupon("");
                            setCouponInput("");
                          }}
                          className="text-xs text-text-tertiary underline hover:text-text"
                        >
                          Remove
                        </button>
                      </div>
                    ) : null}
                    <input
                      type="text"
                      placeholder="Enter discount code here"
                      value={couponInput}
                      onChange={(e) => {
                        setCouponInput(e.target.value);
                        setCouponError(null);
                      }}
                      className="w-full rounded-md border border-border px-3 py-2 text-sm text-text placeholder:text-text-tertiary focus:border-border-soft focus:outline-none focus:ring-1 focus:ring-border-soft"
                    />
                    {couponError ? (
                      <p className="text-sm text-red-600">{couponError}</p>
                    ) : null}
                    <button
                      type="button"
                      onClick={async () => {
                        const code = couponInput.trim();
                        if (!code) return;
                        setCouponLoading(true);
                        setCouponError(null);
                        try {
                          const result = await validateCoupon(code);
                          onApplyCoupon?.(result);
                          setAppliedCoupon(code);
                          setActivePanel(null);
                        } catch (err: any) {
                          setCouponError(err?.message ?? "Invalid coupon code.");
                        } finally {
                          setCouponLoading(false);
                        }
                      }}
                      className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-secondary text-sm font-medium text-white hover:bg-secondary disabled:opacity-60"
                      disabled={!couponInput.trim() || couponLoading}
                    >
                      {couponLoading ? (
                        <Loader className="h-4 w-4 animate-spin" />
                      ) : (
                        "Apply"
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
