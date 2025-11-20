
import React from 'react';
import { Truck, CheckCircle } from 'lucide-react';
import { FREE_SHIPPING_THRESHOLD, CURRENCY_SYMBOL } from '../constants';
import { CartItem } from '../types';

interface FreeShippingWidgetProps {
  cartItems: CartItem[];
}

export const FreeShippingWidget: React.FC<FreeShippingWidgetProps> = ({ cartItems }) => {
  const subtotal = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  
  if (subtotal === 0) return null;

  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const progress = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);
  const isFree = remaining === 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-2xl z-40 p-4 md:px-8 transition-transform transform translate-y-0">
      <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        
        <div className="flex-1 w-full">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 font-bold text-gray-800 font-heading">
              {isFree ? (
                <><CheckCircle className="text-green-500" size={20} /> You've unlocked FREE Shipping!</>
              ) : (
                <><Truck className="text-belims-blue" size={20} /> Add {CURRENCY_SYMBOL}{remaining.toLocaleString()} for FREE Shipping</>
              )}
            </div>
            <span className="text-xs font-bold text-gray-500">{Math.round(progress)}%</span>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-700 ease-out ${isFree ? 'bg-green-500' : 'bg-belims-blue'}`} 
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="hidden sm:block">
          <button className="bg-belims-accent text-white px-6 py-2 rounded font-bold hover:bg-red-700 transition-colors text-sm font-heading whitespace-nowrap">
            View Cart
          </button>
        </div>

      </div>
    </div>
  );
};
