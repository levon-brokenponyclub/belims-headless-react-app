import React, { useState, useEffect, useMemo } from "react";
import { X, Trash2, Plus, Minus, ShoppingBag, Tag } from "lucide-react";
import { CartItem, Product } from "../types";
import { FREE_SHIPPING_THRESHOLD, CURRENCY_SYMBOL } from "../constants";

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
  const [activeTab, setActiveTab] = useState<"cart" | "recommendations">(
    "cart",
  );
  const [promoCode, setPromoCode] = useState("");
  const [showPromoInput, setShowPromoInput] = useState(false);
  const [orderSummaryOpen, setOrderSummaryOpen] = useState(false);
  const [fsbAnimationKey, setFsbAnimationKey] = useState(0);
  const [fsbIconLeft, setFsbIconLeft] = useState("0%");

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
    : `Add items worth ${CURRENCY_SYMBOL}${remainingForFreeShip.toFixed(2)} for FREE Delivery!`;

  useEffect(() => {
    if (!isOpen) return;
    setFsbAnimationKey((prev) => prev + 1);
    setFsbIconLeft("0%");
    const frame = requestAnimationFrame(() => {
      setFsbIconLeft(`${progressPercent.toFixed(2)}%`);
    });
    return () => cancelAnimationFrame(frame);
  }, [isOpen, totalQuantity, subtotal]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      {/* Main Cart Panel */}
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl flex flex-col transform transition-transform duration-300">
        {/* Header */}
        <div className="bg-belims-blue text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag size={20} />
            <h2 className="text-lg font-bold">Your Cart</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab("cart")}
            className={`flex-1 py-3 font-semibold text-sm transition ${
              activeTab === "cart"
                ? "text-belims-blue border-b-2 border-belims-blue"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Cart ({items.length})
          </button>
          <button
            onClick={() => setActiveTab("recommendations")}
            className={`flex-1 py-3 font-semibold text-sm transition ${
              activeTab === "recommendations"
                ? "text-belims-blue border-b-2 border-belims-blue"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            You Might Like
          </button>
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
            overflow: hidden;
          }

          .tmcore-fsb-progress-bar::before {
            content: "";
            position: absolute;
            inset: 0;
            width: var(--fsb-percent);
            background: #f97316;
            transform-origin: left;
          }

          .tmcore-fsb--animate .tmcore-fsb-progress-bar::before {
            animation: fsb-fill 0.8s ease-out;
          }

          .tmcore-fsb--animate .tmcore-fsb-icon {
            animation: fsb-pop 0.5s ease-out;
          }

          @keyframes fsb-fill {
            from {
              transform: scaleX(0);
            }
            to {
              transform: scaleX(1);
            }
          }

          @keyframes fsb-pop {
            0% {
              transform: translateY(-50%) scale(0.85);
            }
            100% {
              transform: translateY(-50%) scale(1);
            }
          }


          .tmcore-fsb-icon {
            position: absolute;
            left: var(--fsb-icon-left, 0%);
            top: 50%;
            transform: translate(-50%, -50%);
            color: #d36b00;
            width: 30px;
            height: 30px;
            border-radius: 999px;
            background: #fff7e6;
            border: 1px solid #f3e3c7;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            transition: left 0.6s ease-out;
          }

          .tmcore-fsb-message {
            font-weight: 400;
            font-size: 13px;
            text-align: center;
            margin-top:10px;
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
                        {remainingForFreeShip.toFixed(2)}
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
          {activeTab === "cart" ? (
            <>
              {/* Cart Items */}
              {items.length === 0 ? (
                <div className="h-full flex items-center justify-center p-8 text-center">
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
                <div className="p-4 space-y-4">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex gap-4 pb-4 border-b last:border-b-0"
                    >
                      <img
                        src={item.image || "/placeholder.png"}
                        alt={item.name}
                        loading="lazy"
                        decoding="async"
                        className="w-20 h-20 object-cover rounded"
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 text-sm">
                          {item.name}
                        </h3>
                        <p className="text-belims-blue font-bold text-sm mt-1">
                          {CURRENCY_SYMBOL}
                          {item.price.toFixed(2)}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => updateQuantity(item.id, -1)}
                            className="w-6 h-6 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-50"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="w-8 text-center font-semibold text-sm">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, 1)}
                            className="w-6 h-6 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-50"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              {/* Recommendations */}
              {recommendedProducts.length > 0 ? (
                <div className="p-4 grid grid-cols-2 gap-4">
                  {recommendedProducts.map((product) => (
                    <div
                      key={product.id}
                      className="border rounded-lg overflow-hidden hover:shadow-lg transition"
                    >
                      <img
                        src={product.images?.[0] || "/placeholder.png"}
                        alt={product.name}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-32 object-cover"
                      />
                      <div className="p-3">
                        <h4 className="font-semibold text-sm text-gray-900 line-clamp-2 mb-2">
                          {product.name}
                        </h4>
                        <p className="text-belims-blue font-bold text-sm mb-2">
                          {CURRENCY_SYMBOL}
                          {product.price.toFixed(2)}
                        </p>
                        <button
                          onClick={() => {
                            if (addToCart) {
                              addToCart(product, 1);
                              setActiveTab("cart");
                            }
                          }}
                          className="w-full bg-belims-blue text-white py-1.5 rounded text-xs font-semibold hover:bg-blue-700 transition"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center p-8 text-center">
                  <p className="text-gray-500">No recommendations available</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="absolute bottom-0 left-0 w-full bg-white border-t border-gray-200 z-20 pt-4">
            <button
              type="button"
              onClick={() => setOrderSummaryOpen((prev) => !prev)}
              className="relative -top-4 flex w-full flex-col items-center focus:outline-none"
            >
              <div className="relative -top-4 w-full">
                <div className="absolute mx-auto flex w-full justify-center">
                  <svg
                    width="67"
                    height="31"
                    viewBox="0 0 67 31"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <g clipPath="url(#clip0_cart_summary)">
                      <mask
                        id="path-1-outside-cart"
                        maskUnits="userSpaceOnUse"
                        x="3.5"
                        y="1"
                        width="62"
                        height="61"
                        fill="black"
                      >
                        <rect
                          fill="white"
                          x="3.5"
                          y="1"
                          width="62"
                          height="61"
                        />
                        <path d="M4.5 32C4.5 15.4315 17.9315 2 34.5 2C51.0685 2 64.5 15.4315 64.5 32C64.5 48.5685 51.0685 62 34.5 62C17.9315 62 4.5 48.5685 4.5 32Z"></path>
                      </mask>
                      <path
                        d="M4.5 32C4.5 15.4315 17.9315 2 34.5 2C51.0685 2 64.5 15.4315 64.5 32C64.5 48.5685 51.0685 62 34.5 62C17.9315 62 4.5 48.5685 4.5 32Z"
                        fill="#FCFCFC"
                      ></path>
                      <path
                        d="M3.5 31.5C3.5 14.6553 17.1553 1 34 1H35C51.8447 1 65.5 14.6553 65.5 31.5L63.5 32C63.5 15.9837 50.5163 3 34.5 3C18.4837 3 5.5 15.9837 5.5 32L3.5 31.5ZM64.5 62H4.5H64.5ZM34 62C17.1553 62 3.5 48.3447 3.5 31.5C3.5 14.6553 17.1553 1 34 1L34.5 3C18.4837 3 5.5 15.9837 5.5 32C5.5 48.5685 18.4837 62 34.5 62H34ZM35 1C51.8447 1 65.5 14.6553 65.5 31.5C65.5 48.3447 51.8447 62 35 62H34.5C50.5163 62 63.5 48.5685 63.5 32C63.5 15.9837 50.5163 3 34.5 3L35 1Z"
                        fill="#040404"
                        fillOpacity="0.1"
                        mask="url(#path-1-outside-cart)"
                      ></path>
                    </g>
                    <defs>
                      <clipPath id="clip0_cart_summary">
                        <rect
                          width="64"
                          height="17"
                          fill="white"
                          transform="matrix(1 0 0 -1 1.5 17)"
                        ></rect>
                      </clipPath>
                    </defs>
                  </svg>
                </div>
                <div
                  className={`absolute w-full top-2 mx-auto flex justify-center transition-all duration-300 ${
                    orderSummaryOpen ? "rotate-180" : "rotate-0"
                  }`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    fill="currentColor"
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
                      {CURRENCY_SYMBOL}
                      {subtotal.toFixed(2)}
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
                        {CURRENCY_SYMBOL}
                        {subtotal.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-gray-700">
                      <span>Shipping</span>
                      <span className="font-semibold">
                        {shippingCost > 0 ? (
                          <span>Rates at Checkout</span>
                        ) : (
                          <span className="text-green-600 font-bold">Free</span>
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
                      {CURRENCY_SYMBOL}
                      {subtotal.toFixed(2)}
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
  );
};
