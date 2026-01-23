import React from "react";
import { X, Trash2, Plus, Minus, Truck, ShoppingBag } from "lucide-react";
import { CartItem } from "../types";
import { FREE_SHIPPING_THRESHOLD, CURRENCY_SYMBOL } from "../constants";

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  updateQuantity: (id: string, delta: number) => void;
  removeItem: (id: string) => void;
  onCheckout?: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  updateQuantity,
  removeItem,
  onCheckout,
}) => {
  const subtotal = items.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0,
  );
  const remainingForFreeShip = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const progressPercent = Math.min(
    100,
    (subtotal / FREE_SHIPPING_THRESHOLD) * 100,
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl flex flex-col transform transition-transform duration-300">
        {/* Header */}
        <div className="p-5 border-b flex justify-between items-center bg-white z-10">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <ShoppingBag className="text-belims-blue" /> Your Cart (
            {items.length})
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
          >
            <X size={24} />
          </button>
        </div>

        {/* Free Shipping Progress */}
        <div className="bg-gray-50 px-5 py-4 border-b">
          <div className="flex items-center gap-2 mb-2 text-sm font-medium text-gray-700">
            <Truck
              size={16}
              className={
                remainingForFreeShip === 0 ? "text-green-500" : "text-gray-500"
              }
            />
            {remainingForFreeShip > 0 ? (
              <span>
                Add{" "}
                <span className="text-belims-blue font-bold">
                  {CURRENCY_SYMBOL}
                  {remainingForFreeShip.toFixed(2)}
                </span>{" "}
                for{" "}
                <span className="font-bold text-green-600">Free Shipping</span>
              </span>
            ) : (
              <span className="text-green-600 font-bold">
                You've unlocked Free Shipping!
              </span>
            )}
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-700 ease-out"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <ShoppingBag size={64} className="mb-4 opacity-20" />
              <p>Your cart is empty.</p>
              <button
                onClick={onClose}
                className="mt-4 text-belims-blue font-bold hover:underline"
              >
                Start Shopping
              </button>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="flex gap-4">
                <div className="w-20 h-20 bg-gray-100 rounded flex-shrink-0 p-2 border">
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
                      <span className="text-[10px] text-green-600 font-bold bg-green-50 px-1 rounded">
                        Bundle Item
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between items-end">
                    <div className="font-bold text-gray-900">
                      {CURRENCY_SYMBOL}
                      {(item.price * item.quantity).toFixed(2)}
                    </div>
                    <div className="flex items-center border rounded-lg overflow-hidden">
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        className="px-2 py-1 hover:bg-gray-100 text-gray-600"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="px-2 text-sm font-medium min-w-[1.5rem] text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        className="px-2 py-1 hover:bg-gray-100 text-gray-600"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => removeItem(item.id)}
                  className="text-gray-300 hover:text-red-500 self-start"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="p-5 border-t bg-white">
            <div className="flex justify-between items-center mb-4 text-lg font-bold text-gray-900">
              <span>Subtotal</span>
              <span>
                {CURRENCY_SYMBOL}
                {subtotal.toFixed(2)}
              </span>
            </div>
            <button
              onClick={onCheckout}
              className="w-full bg-belims-accent text-belims-blue py-3.5 rounded font-bold text-lg shadow-md hover:brightness-105 transition-all mb-3"
            >
              Checkout
            </button>
            <button
              onClick={onClose}
              className="w-full text-center text-gray-500 text-sm hover:underline"
            >
              Continue Shopping
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
