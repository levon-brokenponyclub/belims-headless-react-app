import React, { useState, useEffect } from 'react';
import { X, Check, ShoppingCart, Package } from 'lucide-react';
import { Product, BundleCandidate } from '../types';
import { CURRENCY_SYMBOL } from '../constants';

interface BundlePanelProps {
  isOpen: boolean;
  onClose: () => void;
  mainProduct: Product;
  candidates: BundleCandidate[];
  addToCart: (product: Product) => void; // Simple add for now
}

export const BundlePanel: React.FC<BundlePanelProps> = ({ isOpen, onClose, mainProduct, candidates, addToCart }) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Reset when closed or product changes
  useEffect(() => {
    if (!isOpen) setSelectedIds([]);
  }, [isOpen, mainProduct]);

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // Discount Logic: 1 item = 3%, 2 = 5%, 3+ = 10%
  const count = selectedIds.length;
  let discountRate = 0;
  if (count === 1) discountRate = 0.03;
  else if (count === 2) discountRate = 0.05;
  else if (count >= 3) discountRate = 0.10;

  const mainPrice = mainProduct.price;
  const addonsPrice = candidates
    .filter(c => selectedIds.includes(c.id))
    .reduce((acc, c) => acc + c.price, 0);
  
  const subtotal = mainPrice + addonsPrice;
  const discountAmount = subtotal * discountRate;
  const total = subtotal - discountAmount;

  const handleBuyBundle = () => {
    // In a real app, this would add a "Grouped Product" or multiple items with metadata to cart
    alert(`Added bundle with ${count} items to cart! Savings: ${CURRENCY_SYMBOL}${discountAmount.toFixed(2)}`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] overflow-hidden">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl flex flex-col transform transition-transform duration-300 animate-slideInRight">
        
        {/* Header */}
        <div className="p-5 border-b flex justify-between items-center bg-belims-blue text-white">
          <div>
             <h2 className="text-xl font-bold font-heading flex items-center gap-2">
               <Package size={20} /> Create a Bundle
             </h2>
             <p className="text-blue-200 text-xs">Add items to unlock savings!</p>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-1 rounded transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Main Product Summary */}
        <div className="bg-blue-50 p-4 border-b border-blue-100 flex gap-3 items-center">
           <img src={mainProduct.image} className="w-12 h-12 object-contain bg-white border rounded p-1" alt="" />
           <div>
             <div className="text-xs text-gray-500 font-bold uppercase">Main Item</div>
             <div className="font-bold text-gray-900 text-sm line-clamp-1">{mainProduct.name}</div>
           </div>
        </div>

        {/* Candidates List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-gray-50">
           <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wide mb-2">Select Add-ons</h3>
           {candidates.map(item => {
             const isSelected = selectedIds.includes(item.id);
             return (
               <div 
                 key={item.id}
                 onClick={() => toggleSelection(item.id)}
                 className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${isSelected ? 'border-belims-blue bg-white shadow-md' : 'border-gray-200 bg-white hover:border-blue-200'}`}
               >
                  <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-belims-blue border-belims-blue text-white' : 'border-gray-300 bg-gray-50'}`}>
                    {isSelected && <Check size={14} strokeWidth={3} />}
                  </div>
                  <img src={item.image} className="w-12 h-12 object-contain p-1" alt="" />
                  <div className="flex-1">
                    <div className="text-sm font-bold text-gray-900 line-clamp-2">{item.name}</div>
                    <div className="text-xs text-gray-500 font-bold">{CURRENCY_SYMBOL}{item.price}</div>
                  </div>
               </div>
             );
           })}
        </div>

        {/* Footer / Totals */}
        <div className="p-5 bg-white border-t shadow-[0_-5px_15px_rgba(0,0,0,0.05)] z-10">
           
           {/* Savings Progress */}
           <div className="mb-4">
              <div className="flex justify-between text-xs font-bold text-gray-500 mb-1">
                 <span className={count >= 1 ? 'text-belims-blue' : ''}>3% OFF (1 item)</span>
                 <span className={count >= 2 ? 'text-belims-blue' : ''}>5% OFF (2 items)</span>
                 <span className={count >= 3 ? 'text-belims-blue' : ''}>10% OFF (3+)</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex">
                 <div className={`h-full bg-belims-blue transition-all duration-300 ${count >= 1 ? 'w-1/3' : 'w-0 opacity-0'}`}></div>
                 <div className={`h-full bg-belims-blue transition-all duration-300 ${count >= 2 ? 'w-1/3' : 'w-0 opacity-0'}`}></div>
                 <div className={`h-full bg-belims-blue transition-all duration-300 ${count >= 3 ? 'w-1/3' : 'w-0 opacity-0'}`}></div>
              </div>
           </div>

           <div className="flex justify-between items-end mb-4">
              <div>
                <div className="text-gray-500 text-sm">Bundle Total:</div>
                {discountAmount > 0 && (
                  <div className="text-xs text-green-600 font-bold">
                    Savings: -{CURRENCY_SYMBOL}{discountAmount.toFixed(2)} ({Math.round(discountRate*100)}%)
                  </div>
                )}
              </div>
              <div className="text-right">
                 {discountAmount > 0 && <div className="text-sm text-gray-400 line-through">{CURRENCY_SYMBOL}{subtotal.toLocaleString()}</div>}
                 <div className="text-2xl font-bold text-gray-900 font-heading">{CURRENCY_SYMBOL}{total.toLocaleString()}</div>
              </div>
           </div>

           <button 
             onClick={handleBuyBundle}
             className="w-full bg-belims-accent text-white py-3.5 rounded-lg font-bold text-lg hover:bg-orange-600 transition-colors shadow-md font-heading"
           >
             {count === 0 ? 'Select Items to Bundle' : 'Add Bundle to Cart'}
           </button>
        </div>

      </div>
    </div>
  );
};