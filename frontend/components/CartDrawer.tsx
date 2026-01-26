import React, { useState } from "react";
import {
  X,
  Trash2,
  Plus,
  Minus,
  Truck,
  ShoppingBag,
  ArrowLeft,
  Tag,
  Zap,
} from "lucide-react";
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
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [showPromoInput, setShowPromoInput] = useState(false);

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      {/* Main Cart Panel */}
      <div
        className={`absolute right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ${showRecommendations ? "translate-x-full" : "translate-x-0"}`}
      >
        {/* Header with Free Shipping Bar */}
        <div className="bg-white border-b">
          {/* Free Shipping Progress */}
          <div className="bg-green-50 px-5 py-3 border-b">
            <div className="flex items-center gap-2 mb-2 text-sm font-medium text-gray-700">
              <Truck
                size={16}
                className={
                  remainingForFreeShip === 0
                    ? "text-green-600"
                    : "text-amber-500"
                }
              />
              {remainingForFreeShip > 0 ? (
                <span>
                  Add{" "}
                  <span className="text-belims-accent font-bold">
                    {CURRENCY_SYMBOL}
                    {remainingForFreeShip.toFixed(2)}
                  </span>{" "}
                  for{" "}
                  <span className="font-bold text-green-600">
                    Free Shipping
                  </span>
                </span>
              ) : (
                <span className="text-green-600 font-bold">
                  ✓ You've unlocked Free Shipping!
                </span>
              )}
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-700 ease-out"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>

          {/* Cart Header */}
          <div className="p-5 flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <ShoppingBag className="text-belims-blue" size={20} />
              Your Cart
              {items.length > 0 && (
                <span className="bg-belims-accent text-belims-blue font-bold px-2.5 py-0.5 rounded-full text-sm">
                  {items.length}
                </span>
              )}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <ShoppingBag size={64} className="mb-4 opacity-20" />
              <p className="text-gray-600">Your cart is empty.</p>
              <button
                onClick={onClose}
                className="mt-4 text-belims-blue font-bold hover:underline"
              >
                Start Shopping
              </button>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="flex gap-3 bg-gray-50 p-3 rounded-lg"
              >
                <div className="w-16 h-16 bg-white rounded flex-shrink-0 p-1.5 border border-gray-200">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-800 line-clamp-2 text-sm leading-snug">
                      {item.name}
                    </h4>
                    {item.isBundle && (
                      <span className="text-[10px] text-green-600 font-bold bg-green-100 px-1.5 py-0.5 rounded inline-block mt-1">
                        Bundle Item
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between items-end">
                    <div className="font-bold text-gray-900 text-sm">
                      {CURRENCY_SYMBOL}
                      {(item.price * item.quantity).toFixed(2)}
                    </div>
                    <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden bg-white">
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        className="px-1.5 py-1 hover:bg-gray-100 text-gray-600"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="px-2 text-xs font-medium min-w-[1.5rem] text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        className="px-1.5 py-1 hover:bg-gray-100 text-gray-600"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => removeItem(item.id)}
                  className="text-gray-300 hover:text-red-500 self-start pt-1"
                  title="Remove item"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t bg-white">
            {/* Order Summary */}
            <div className="p-5 space-y-3 border-b">
              <h3 className="font-bold text-gray-900 text-sm">Order Summary</h3>
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
                      <>
                        {CURRENCY_SYMBOL}
                        {shippingCost.toFixed(2)}
                      </>
                    ) : (
                      <span className="text-green-600 font-bold">Free</span>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Promo Code Section */}
            <div className="p-5 border-b">
              {!showPromoInput ? (
                <button
                  onClick={() => setShowPromoInput(true)}
                  className="w-full flex items-center gap-2 text-belims-blue font-semibold text-sm hover:text-belims-blue/80 transition"
                >
                  <Tag size={16} />
                  Got a Discount Code?
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter discount code"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      className="flex-1 border border-gray-300 px-3 py-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-belims-blue focus:border-transparent"
                    />
                    <button className="bg-belims-blue text-white px-4 py-2 rounded font-semibold text-sm hover:bg-blue-700 transition">
                      Apply
                    </button>
                  </div>
                  <button
                    onClick={() => setShowPromoInput(false)}
                    className="text-gray-500 text-xs hover:text-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {/* Total & Checkout */}
            <div className="p-5 space-y-3">
              <div className="flex justify-between items-center text-lg font-bold text-gray-900 border-t pt-3">
                <span>Total</span>
                <span>
                  {CURRENCY_SYMBOL}
                  {(subtotal + shippingCost).toFixed(2)}
                </span>
              </div>
              <button
                onClick={onCheckout}
                className="w-full bg-belims-accent text-white font-bold text-base h-12 rounded-lg shadow-md hover:bg-orange-600 transition-all active:scale-95 font-heading flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Zap size={20} aria-hidden="true" />
                Buy Now
              </button>
              <button
                onClick={() => setShowRecommendations(true)}
                className="w-full border-2 border-belims-blue text-belims-blue py-2.5 rounded-lg font-semibold text-sm bg-blue-50 hover:bg-belims-blue hover:text-white transition"
              >
                Discover More Products
              </button>
              <button
                onClick={onClose}
                className="w-full text-center text-gray-500 text-xs hover:text-gray-700 hover:underline py-2"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Recommendations Slide Panel */}
      <div
        className={`absolute right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ${showRecommendations ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Recommendations Header */}
        <div className="p-5 border-b flex items-center gap-3 bg-white">
          <button
            onClick={() => setShowRecommendations(false)}
            className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100"
            title="Back to cart"
          >
            <ArrowLeft size={20} />
          </button>
          <h3 className="text-lg font-bold text-gray-900">
            Even better with these!
          </h3>
        </div>

        {/* Recommendations Grid */}
        <div className="flex-1 overflow-y-auto p-5">
          {recommendedProducts.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-400">
              <p>No recommendations available.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {recommendedProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex flex-col bg-gray-50 rounded-lg overflow-hidden hover:shadow-md transition"
                >
                  {/* Product Image */}
                  <div className="w-full h-28 bg-white border border-gray-200 flex items-center justify-center p-2">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-contain"
                    />
                  </div>

                  {/* Product Details */}
                  <div className="p-3 flex flex-col flex-1">
                    <h4 className="font-semibold text-gray-800 text-xs line-clamp-2 mb-2">
                      {product.name}
                    </h4>
                    <div className="mt-auto">
                      <p className="font-bold text-gray-900 text-sm mb-2">
                        {CURRENCY_SYMBOL}
                        {product.price.toFixed(2)}
                      </p>
                      {product.onSale && (
                        <div className="inline-block bg-red-100 text-red-700 text-[10px] font-bold px-2 py-1 rounded mb-2">
                          On Sale
                        </div>
                      )}
                      <button
                        onClick={() => {
                          addToCart?.(product, 1);
                        }}
                        className="w-full bg-belims-blue text-white py-2 rounded font-semibold text-xs hover:bg-blue-700 transition"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
