import React, { useState, useEffect, useMemo } from "react";
import { X, Trash2, Plus, Minus, ShoppingBag } from "lucide-react";
import { CartItem, Product } from "../types";
import { FREE_SHIPPING_THRESHOLD, CURRENCY_SYMBOL } from "../constants";
import { formatCurrency } from "../utils/price";

const DRAWER_ANIMATION_MS = 700;

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  updateQuantity: (id: string, delta: number) => void;
  removeItem: (id: string) => void;
  onCheckout?: () => void;
  recommendedProducts?: Product[];
  addToCart?: (product: Product, quantity: number) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  updateQuantity,
  removeItem,
  onCheckout,
  recommendedProducts = [],
  addToCart,
}) => {
  const [shouldRender, setShouldRender] = useState(false);
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [showPromoInput, setShowPromoInput] = useState(false);
  const [orderSummaryOpen, setOrderSummaryOpen] = useState(false);
  const [fsbAnimationKey, setFsbAnimationKey] = useState(0);
  const [fsbIconLeft, setFsbIconLeft] = useState("0%");

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setIsDrawerVisible(false);
      let frameOne = 0;
      let frameTwo = 0;
      frameOne = requestAnimationFrame(() => {
        frameTwo = requestAnimationFrame(() => {
          setIsDrawerVisible(true);
        });
      });
      return () => {
        cancelAnimationFrame(frameOne);
        cancelAnimationFrame(frameTwo);
      };
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

  const subtotal = items.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0,
  );
  const remainingForFreeShip = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const progressPercent = Math.min(
    100,
    (subtotal / FREE_SHIPPING_THRESHOLD) * 100,
  );
  const shippingCost = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : 50;
  const hasFreeShipping = remainingForFreeShip === 0;
  const freeShippingMessage = hasFreeShipping
    ? "You've unlocked FREE Delivery!"
    : `Add items worth ${formatCurrency(remainingForFreeShip)} for FREE Delivery!`;

  useEffect(() => {
    if (!isOpen) return;
    setFsbAnimationKey((prev) => prev + 1);
    setFsbIconLeft("0%");
    const frame = requestAnimationFrame(() => {
      setFsbIconLeft(`${progressPercent.toFixed(2)}%`);
    });
    return () => cancelAnimationFrame(frame);
  }, [isOpen, totalQuantity, subtotal]);

  useEffect(() => {
    if (!isOpen) {
      setShowRecommendations(false);
      return;
    }

    setShowRecommendations(true);
  }, [isOpen]);

  if (!shouldRender) return null;

  const recommendationsVisible = showRecommendations && isDrawerVisible;

  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden">
      <div
        className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-500 ease-in-out ${
          isDrawerVisible ? "opacity-100" : "opacity-0"
        }`}
        style={{
          transitionDuration: isDrawerVisible
            ? "500ms"
            : `${DRAWER_ANIMATION_MS}ms`,
        }}
        onClick={onClose}
      ></div>

      <div className="absolute right-0 top-0 bottom-0 flex items-stretch">
        {/* Slide-in Recommendations Panel */}
        <aside
          className={`relative h-full overflow-hidden bg-white shadow-2xl border-r border-gray-200 transition-all duration-500 ease-in-out sm:duration-700 will-change-transform ${
            recommendationsVisible
              ? "w-72 sm:w-80 opacity-100 translate-x-0"
              : "w-0 opacity-0 -translate-x-4 pointer-events-none"
          }`}
          aria-hidden={!recommendationsVisible}
        >
          <div
            className={`flex h-full flex-col transition-opacity duration-200 ${
              recommendationsVisible ? "opacity-100" : "opacity-0"
            }`}
          >
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="text-sm font-semibold text-gray-900">
                You may also like...
              </h3>
              <button
                onClick={() => setShowRecommendations(false)}
                className="rounded-full p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition"
                aria-label="Close recommendations"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {recommendedProducts.length > 0 ? (
                recommendedProducts.map((product) => {
                  const imageSrc =
                    product.image || product.images?.[0] || "/placeholder.png";
                  const showStrike =
                    (product.regular_price || 0) > (product.price || 0);

                  return (
                    <div
                      key={product.id}
                      className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm"
                    >
                      <div className="flex items-center justify-center rounded-xl bg-[#F6F6F6] p-4">
                        <img
                          src={imageSrc}
                          alt={product.name}
                          loading="lazy"
                          decoding="async"
                          className="h-28 w-28 object-contain mix-blend-multiply"
                        />
                      </div>
                      <div className="mt-3">
                        <div className="line-clamp-2 text-sm font-semibold text-gray-900">
                          {product.name}
                        </div>
                        <div className="mt-2 flex items-center gap-2 text-sm font-semibold">
                          <span className="text-red-600">
                            {formatCurrency(product.price || 0)}
                          </span>
                          {showStrike && (
                            <span className="text-gray-400 line-through text-xs">
                              {formatCurrency(product.regular_price || 0)}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (addToCart) {
                              addToCart(product, 1);
                            }
                          }}
                          className="mt-3 text-xs font-semibold text-gray-900 underline underline-offset-4"
                        >
                          Select options
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-gray-500">
                  No recommendations available
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Main Cart Panel */}
        <div
          className={`relative w-screen max-w-md bg-white shadow-2xl flex flex-col transform transition-transform duration-500 ease-in-out sm:duration-700 will-change-transform ${
            isDrawerVisible ? "translate-x-0" : "translate-x-full"
          }`}
        >
          {/* Header */}
          <div className="border-b p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag size={20} />
              <h2 className="text-lg font-bold">Shopping Cart</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowRecommendations((prev) => !prev)}
                className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                You may also like
              </button>
              <button
                onClick={onClose}
                className="p-1 hover:bg-gray-100 rounded transition"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <style>
            {`
          .tmcore-fsb {
            --fsb-percent: 0%;
            background: #fff;
            border-bottom: 1px solid #e5e7eb;
            color: rgb(17 24 39 / var(--tw-text-opacity, 1));
            padding: 14px 16px 16px;
            font-weight:400;
          }

          .tmcore-fsb-progress {
            margin-top: 10px;
          }

          .tmcore-fsb-progress-bar {
            position: relative;
            height: 6px;
            border-radius: 999px;
            background: #e5e7eb;
            overflow: visible;
          }

          .tmcore-fsb-progress-bar::before {
            content: "";
            position: absolute;
            inset: 0;
            width: var(--fsb-percent);
            background: #f97316;
            transform-origin: left;
            border-radius: 999px;
          }

          .tmcore-fsb--animate .tmcore-fsb-progress-bar::before {
            animation: fsb-fill 0.8s ease-out;
          }

          .tmcore-fsb--animate .tmcore-fsb-icon {
            animation: fsb-icon-slide 0.8s ease-out;
          }

          @keyframes fsb-fill {
            from {
              transform: scaleX(0);
            }
            to {
              transform: scaleX(1);
            }
          }

          @keyframes fsb-icon-slide {
            0% {
              left: 0%;
              transform: translate(-50%, -50%) scale(0.9);
            }
            100% {
              left: var(--fsb-icon-left, 0%);
              transform: translate(-50%, -50%) scale(1);
            }
          }


          .tmcore-fsb-icon {
            position: absolute;
            left: var(--fsb-icon-left, 0%);
            top: 50%;
            transform: translate(-50%, -50%);
            color: #fff;
            width: 26px;
            height: 26px;
            border-radius: 999px;
            background: #f97316;
            border: 1px solid #f97316;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            transition: left 0.8s ease-out;
            padding:6px;
          }

          .tmcore-fsb-message {
            font-weight: 400;
            font-size: 13px;
            text-align: center;
            margin-top:20px;
          }

          .tmcore-fsb-message .price {
            font-weight: 700;
          }
          `}
          </style>

          {items.length > 0 && !hasFreeShipping && (
            <div
              key={`fsb-${fsbAnimationKey}`}
              className="tmcore-fsb tmcore-fsb--preload tmcore-fsb--animate"
              data-message={freeShippingMessage}
              data-percent={`${progressPercent.toFixed(2)}%`}
              data-classes=""
              style={{
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                "--fsb-percent": `${progressPercent.toFixed(2)}%`,
              }}
            >
              <div className="tmcore-fsb-progress">
                <div className="tmcore-fsb-progress-bar">
                  <div
                    className="tmcore-fsb-icon"
                    aria-hidden="true"
                    style={{
                      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                      // @ts-ignore
                      "--fsb-icon-left": fsbIconLeft,
                    }}
                  >
                    <svg
                      version="1.1"
                      xmlns="http://www.w3.org/2000/svg"
                      focusable="false"
                      fill="currentColor"
                      width="24"
                      height="24"
                      viewBox="0 0 32 32"
                    >
                      <path d="M0 6v2h19v15h-6.156c-0.445-1.719-1.992-3-3.844-3s-3.398 1.281-3.844 3h-1.156v-5h-2v7h3.156c0.445 1.719 1.992 3 3.844 3s3.398-1.281 3.844-3h8.313c0.445 1.719 1.992 3 3.844 3s3.398-1.281 3.844-3h3.156v-8.156l-0.063-0.156-2-6-0.219-0.688h-8.719v-4zM1 10v2h9v-2zM21 12h7.281l1.719 5.125v5.875h-1.156c-0.445-1.719-1.992-3-3.844-3s-3.398 1.281-3.844 3h-0.156zM2 14v2h6v-2zM9 22c1.117 0 2 0.883 2 2s-0.883 2-2 2c-1.117 0-2-0.883-2-2s0.883-2 2-2zM25 22c1.117 0 2 0.883 2 2s-0.883 2-2 2c-1.117 0-2-0.883-2-2s0.883-2 2-2z"></path>
                    </svg>
                  </div>
                </div>
              </div>
              <div className="tmcore-fsb-message">
                {hasFreeShipping ? (
                  <strong>{freeShippingMessage}</strong>
                ) : (
                  <>
                    Add items worth{" "}
                    <span className="price">
                      <span className="woocommerce-Price-amount amount">
                        <bdi>
                          <span className="woocommerce-Price-currencySymbol">
                            {CURRENCY_SYMBOL}
                          </span>
                          {formatCurrency(remainingForFreeShip).replace(
                            CURRENCY_SYMBOL,
                            "",
                          )}
                        </bdi>
                      </span>
                    </span>{" "}
                    for <strong>FREE Delivery!</strong>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto pb-52">
            {items.length === 0 ? (
              <div className="h-full flex items-center justify-between p-8 text-center">
                <div>
                  <ShoppingBag
                    size={48}
                    className="mx-auto mb-4 text-gray-300"
                  />
                  <p className="text-gray-500 text-lg font-medium">
                    Your cart is empty
                  </p>
                  <p className="text-gray-400 text-sm mt-2">
                    Add some products to get started
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 space-y-5">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-stretch justify-between gap-4 pb-5 border-b border-dashed last:border-b-0"
                  >
                    <div className="flex items-start gap-4 min-w-0">
                      <div className="h-20 w-20 rounded border border-gray-100 bg-[#F9F9F9] overflow-hidden flex-shrink-0 p-2">
                        <img
                          src={item.image || "/placeholder.png"}
                          alt={item.name}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover mix-blend-multiply"
                        />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-gray-900 line-clamp-2">
                          {item.name}
                        </h3>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                          <span>{item.category || "Product"}</span>
                          <span className="h-1 w-1 rounded-full bg-gray-300" />
                          <span>{item.quantity}x</span>
                        </div>
                        <div className="mt-3 inline-flex items-center overflow-hidden rounded border border-gray-200 bg-white">
                          <button
                            onClick={() => updateQuantity(item.id, -1)}
                            className="h-7 w-7 flex items-center justify-center text-gray-600 hover:bg-gray-50"
                          >
                            <Minus size={16} />
                          </button>
                          <div className="h-7 w-8 flex items-center justify-center text-sm font-semibold text-gray-900 border-x border-gray-200">
                            {item.quantity}
                          </div>
                          <button
                            onClick={() => updateQuantity(item.id, 1)}
                            className="h-7 w-7 flex items-center justify-center text-gray-600 hover:bg-gray-50"
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-3 justify-between">
                      <p className="text-sm font-semibold text-gray-900">
                        {formatCurrency(item.price)}
                      </p>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="h-9 w-9 rounded border border-red-200 text-red-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50 flex items-center justify-center"
                        aria-label={`Remove ${item.name} from cart`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div className="absolute bottom-0 left-0 w-full bg-white border-t border-gray-200 z-20 pt-4">
              <button
                type="button"
                onClick={() => setOrderSummaryOpen((prev) => !prev)}
                className="relative -top-2 flex w-full flex-col items-center focus:outline-none"
              >
                <div className="relative -top-8 w-full">
                  <div
                    className={`absolute w-full top-2 mx-auto flex justify-center transition-all duration-300 ${
                      orderSummaryOpen ? "rotate-180" : "rotate-0"
                    }`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="32"
                      height="32"
                      fill="currentColor"
                      className="bg-gray-100 p-1 rounded-full"
                      viewBox="0 0 256 256"
                    >
                      <path d="M213.66,165.66a8,8,0,0,1-11.32,0L128,91.31,53.66,165.66a8,8,0,0,1-11.32-11.32l80-80a8,8,0,0,1,11.32,0l80,80A8,8,0,0,1,213.66,165.66Z"></path>
                    </svg>
                  </div>
                </div>
                <div className="flex w-full items-center justify-between px-5 pt-4">
                  <div className="flex items-center gap-2 font-bold md:text-lg">
                    <span className="font-bold text-gray-900 text-base">
                      Order Summary
                    </span>
                    {/* <span>•</span>
                  <span className="text-gray-900 text-sm">
                    {items.length} {items.length === 1 ? "item" : "items"}
                  </span> */}
                  </div>
                  {!orderSummaryOpen && (
                    <div className="flex flex-row gap-1 items-center text-base font-bold text-gray-900">
                      <span>Total:</span>
                      <span className="text-gray-900">
                        {formatCurrency(subtotal)}
                      </span>
                    </div>
                  )}
                  {/*
                <div className="flex flex-row gap-1 items-center">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setShowPromoInput((prev) => !prev);
                      setOrderSummaryOpen(true);
                    }}
                    className="text-belims-blue cursor-pointer text-sm font-semibold"
                  >
                    Add code
                  </button>
                </div>
                */}
                </div>
              </button>

              <div
                className={`flex flex-col w-full transition-all duration-300 overflow-hidden ${
                  orderSummaryOpen ? "max-h-[calc(100vh-156px)]" : "max-h-0"
                }`}
              >
                <div className="bg-white">
                  <div className="p-5 pt-0 space-y-3 border-b">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between text-gray-700">
                        <span>Subtotal</span>
                        <span className="font-semibold">
                          {formatCurrency(subtotal)}
                        </span>
                      </div>
                      <div className="flex justify-between text-gray-700">
                        <span>Shipping</span>
                        <span className="font-semibold">
                          {shippingCost > 0 ? (
                            <span>Rates at Checkout</span>
                          ) : (
                            <span className="text-green-600 font-bold">
                              Free
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/*
                <div className="p-5 border-b">
                  <button
                    className="w-full flex items-center gap-2 text-belims-blue font-semibold text-sm hover:text-belims-blue/80 transition"
                    type="button"
                  >
                    <Tag size={16} />
                    Got a Discount Code?
                  </button>
                </div>
                */}

                  <div className="p-5 space-y-3">
                    <div className="flex justify-between items-center text-lg font-bold">
                      <span>Total</span>
                      <span className="text-belims-blue">
                        {formatCurrency(subtotal)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5 pt-0">
                <button
                  onClick={onCheckout}
                  className="mt-0 w-full rounded bg-belims-blue font-heading text-sm font-semibold text-white transition-colors hover:bg-red-600 h-11"
                  type="button"
                >
                  Proceed to Checkout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
