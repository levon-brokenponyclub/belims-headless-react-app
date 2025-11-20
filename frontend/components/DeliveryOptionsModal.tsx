import React, { useState } from 'react';
import { X, MapPin, Truck, Zap, Leaf, Info, Send, Clock, CloudSun, CheckCircle } from 'lucide-react';
import { CURRENCY_SYMBOL } from '../constants';

interface DeliveryOptionsModalProps {
  onClose: () => void;
}

export const DeliveryOptionsModal: React.FC<DeliveryOptionsModalProps> = ({ onClose }) => {
  const [address, setAddress] = useState('');
  const [calculated, setCalculated] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string>('standard');

  const handleCalculate = () => {
    if (!address) return;
    // Simulate API call delay
    setTimeout(() => {
      setCalculated(true);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex justify-between items-start bg-white relative overflow-hidden">
          <div>
             <div className="flex items-center gap-2 mb-1">
                <div className="bg-belims-blue text-white p-1.5 rounded-lg">
                  <Truck size={18} />
                </div>
                <h2 className="text-xl font-bold text-gray-900 font-heading">Delivery Options</h2>
             </div>
             <p className="text-gray-500 text-xs">Get instant shipping estimates for your location</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-50 transition-colors">
            <X size={24} />
          </button>

          {/* Countdown Badge */}
          <div className="absolute top-4 right-12 bg-orange-50 text-orange-700 px-3 py-1 rounded-full text-[10px] font-bold border border-orange-100 flex items-center gap-1.5 shadow-sm">
            <Clock size={12} />
            Order in 14h 4m for tomorrow delivery
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto bg-gray-50/50">
          
          {/* Address Input */}
          <div className="flex gap-2 mb-6">
            <div className="relative flex-1">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Enter suburb or postal code" 
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-belims-blue focus:border-transparent outline-none shadow-sm text-sm font-medium"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCalculate()}
              />
            </div>
            <button 
              onClick={handleCalculate}
              disabled={!address}
              className="bg-belims-blue text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-belims-light disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all flex items-center gap-2 font-heading"
            >
              {calculated ? 'Update' : 'Calculate'}
            </button>
          </div>

          {calculated && (
            <div className="animate-fadeIn">
              
              {/* Contextual Weather Widget */}
              <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 mb-6 flex items-start gap-3">
                 <div className="bg-white p-2 rounded-full text-purple-600 shadow-sm">
                   <CloudSun size={20} />
                 </div>
                 <div>
                   <h4 className="text-purple-900 font-bold text-sm font-heading">Perfect weather for painting!</h4>
                   <p className="text-purple-700 text-xs leading-relaxed mt-1">
                     Weather forecast shows clear conditions this week. Standard delivery will arrive just in time for the weekend.
                   </p>
                 </div>
              </div>

              <h3 className="text-sm font-bold text-gray-800 mb-3 font-heading uppercase tracking-wide">Choose your delivery option:</h3>
              
              <div className="space-y-3">
                
                {/* Option 1: Free Standard */}
                <div 
                  onClick={() => setSelectedOption('standard')}
                  className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedOption === 'standard' ? 'border-belims-blue bg-white shadow-md' : 'border-gray-200 bg-white hover:border-blue-200'}`}
                >
                   <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-gray-900 font-heading">Free Standard Delivery</h4>
                        <span className="bg-green-100 text-green-700 text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                          <Leaf size={10} /> ECO
                        </span>
                      </div>
                      <span className="text-belims-blue font-bold text-lg font-heading">FREE</span>
                   </div>
                   <p className="text-xs text-gray-500 mb-2">via Bob Go Express • 3-5 business days</p>
                   <div className="flex items-center gap-4 text-xs text-gray-500 font-medium">
                      <span>Est. delivery: <span className="text-gray-900 font-bold">Monday, 25 Nov</span></span>
                      <span className="text-green-600 flex items-center gap-1"><Leaf size={10}/> 2.1kg CO₂ impact</span>
                   </div>
                   {selectedOption === 'standard' && (
                     <div className="absolute top-4 right-4 text-belims-blue">
                       <CheckCircle size={20} fill="currentColor" className="text-white" />
                     </div>
                   )}
                   {/* Promo Banner */}
                   <div className="mt-3 bg-gradient-to-r from-purple-50 to-pink-50 px-3 py-1.5 rounded text-[10px] font-bold text-purple-700 flex items-center gap-1.5">
                     <span>🎉</span> Free shipping activated! Standard delivery at no extra cost
                   </div>
                </div>

                {/* Option 2: Express */}
                <div 
                  onClick={() => setSelectedOption('express')}
                  className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedOption === 'express' ? 'border-belims-blue bg-white shadow-md' : 'border-gray-200 bg-white hover:border-blue-200'}`}
                >
                   <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-gray-900 font-heading">Express Delivery</h4>
                        <span className="bg-orange-100 text-orange-700 text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                          <Zap size={10} /> FAST
                        </span>
                      </div>
                      <span className="text-gray-900 font-bold text-lg font-heading">R120</span>
                   </div>
                   <p className="text-xs text-gray-500 mb-2">via Fastway • 1-2 business days</p>
                   <div className="flex items-center gap-4 text-xs text-gray-500 font-medium">
                      <span>Est. delivery: <span className="text-gray-900 font-bold">Tomorrow by 5 PM</span></span>
                      <span className="text-orange-600 flex items-center gap-1">Order before 2 PM today</span>
                   </div>
                   {selectedOption === 'express' && (
                     <div className="absolute top-4 right-4 text-belims-blue">
                       <CheckCircle size={20} fill="currentColor" className="text-white" />
                     </div>
                   )}
                   <div className="mt-2 text-[10px] text-orange-600 font-bold flex items-center gap-1">
                     <Zap size={10} /> Perfect if you need to start painting this weekend
                   </div>
                </div>

                {/* Option 3: Economy */}
                <div 
                  onClick={() => setSelectedOption('economy')}
                  className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedOption === 'economy' ? 'border-belims-blue bg-white shadow-md' : 'border-gray-200 bg-white hover:border-blue-200'}`}
                >
                   <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-gray-900 font-heading">Economy Shipping</h4>
                        <span className="bg-green-100 text-green-700 text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                          <Leaf size={10} /> ECO
                        </span>
                      </div>
                      <span className="text-gray-900 font-bold text-lg font-heading">R45</span>
                   </div>
                   <p className="text-xs text-gray-500 mb-2">via PostNet • 5-7 business days</p>
                   <div className="flex items-center gap-4 text-xs text-gray-500 font-medium">
                      <span>Est. delivery: <span className="text-gray-900 font-bold">Friday, 29 Nov</span></span>
                      <span className="text-green-600 flex items-center gap-1"><Leaf size={10}/> 1.2kg CO₂ impact</span>
                   </div>
                   {selectedOption === 'economy' && (
                     <div className="absolute top-4 right-4 text-belims-blue">
                       <CheckCircle size={20} fill="currentColor" className="text-white" />
                     </div>
                   )}
                </div>

              </div>

              <button 
                onClick={onClose}
                className="w-full mt-6 bg-belims-blue text-white py-3 rounded-xl font-bold font-heading hover:bg-belims-light transition-colors shadow-lg"
              >
                Confirm Delivery Method
              </button>

            </div>
          )}

        </div>
      </div>
    </div>
  );
};