import React, { useState, useEffect, useCallback } from 'react';
import { 
  MapPin, 
  Truck, 
  Clock, 
  Zap, 
  Leaf, 
  AlertCircle, 
  CheckCircle,
  ChevronDown,
  Navigation,
  Star
} from 'lucide-react';
import { Product } from '../types';

interface ShippingOption {
  id: string;
  name: string;
  courier: string;
  price: number;
  deliveryDays: string;
  deliveryDate: string;
  cutoffTime?: string;
  isExpedited?: boolean;
  isEco?: boolean;
  carbonImpact?: number;
  aiRecommendation?: string;
}

interface ShippingCalculatorProps {
  product: Product;
  quantity: number;
}

export function ShippingCalculator({ product, quantity }: ShippingCalculatorProps) {
  const [address, setAddress] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [countdown, setCountdown] = useState({ hours: 0, minutes: 0 });
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [aiInsight, setAiInsight] = useState<string>('');

  // Countdown timer for same-day delivery cutoff
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const cutoff = new Date();
      cutoff.setHours(14, 0, 0, 0); // 2 PM cutoff
      
      if (now > cutoff) {
        // Tomorrow's cutoff
        cutoff.setDate(cutoff.getDate() + 1);
      }
      
      const diff = cutoff.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      setCountdown({ hours, minutes });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, []);

  // Get user's location
  const getUserLocation = useCallback(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          // Auto-populate with approximate area
          setAddress('Cape Town, Western Cape'); // Mock for demo
          calculateShipping('Cape Town, Western Cape');
        },
        (error) => {
          console.log('Location access denied');
        }
      );
    }
  }, []);

  // Mock shipping calculation (integrate with Bob Go API)
  const calculateShipping = async (location: string) => {
    if (!location) return;
    
    setIsLoading(true);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const weight = product.weight || 2.5; // kg
    const value = product.price * quantity;
    
    const mockOptions: ShippingOption[] = [
      {
        id: 'standard',
        name: 'Standard Delivery',
        courier: 'Bob Go Express',
        price: weight > 5 ? 89 : 65,
        deliveryDays: '3-5 business days',
        deliveryDate: 'Monday, 25 Nov',
        isEco: true,
        carbonImpact: 2.1,
        aiRecommendation: '✨ Most popular choice for paint orders'
      },
      {
        id: 'express',
        name: 'Express Delivery',
        courier: 'Fastway',
        price: weight > 5 ? 149 : 120,
        deliveryDays: '1-2 business days', 
        deliveryDate: 'Tomorrow by 5 PM',
        cutoffTime: '2 PM today',
        isExpedited: true,
        aiRecommendation: '⚡ Perfect if you need to start painting this weekend'
      },
      {
        id: 'economy',
        name: 'Economy Shipping',
        courier: 'PostNet',
        price: 45,
        deliveryDays: '5-7 business days',
        deliveryDate: 'Friday, 29 Nov',
        isEco: true,
        carbonImpact: 1.2,
        aiRecommendation: '🌱 Lowest environmental impact - great for non-urgent projects'
      }
    ];

    // Add free shipping if applicable
    if (value >= 1000) {
      mockOptions[0].price = 0;
      mockOptions[0].name = 'Free Standard Delivery';
      mockOptions[0].aiRecommendation = '🎉 Free shipping activated! Standard delivery at no extra cost';
    }

    setShippingOptions(mockOptions);
    setSelectedOption(mockOptions[0].id);
    
    // Generate AI insight
    generateAIInsight(location, value, weight);
    
    setIsLoading(false);
    setIsExpanded(true);
  };

  const generateAIInsight = async (location: string, value: number, weight: number) => {
    // Mock AI analysis
    const insights = [
      `Based on your location in ${location}, I recommend Express delivery - it typically arrives 1 day earlier than estimated due to efficient local routing.`,
      `Your order value of R${value.toLocaleString()} qualifies for free shipping! Plus, standard delivery to your area usually arrives by 11 AM.`,
      `Weather forecast shows clear conditions this week - perfect timing for your paint project! Standard delivery will be right on schedule.`,
      `Pro tip: Orders placed before 2 PM today get same-day dispatch. Express delivery would have your paint ready for weekend projects!`
    ];
    
    setAiInsight(insights[Math.floor(Math.random() * insights.length)]);
  };

  const formatCurrency = (amount: number) => amount === 0 ? 'FREE' : `R${amount}`;

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAddress(e.target.value);
  };

  const handleAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (address.trim()) {
      calculateShipping(address);
    }
  };

  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-white border-b border-blue-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-belims-blue rounded-lg">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Delivery Options</h3>
              <p className="text-sm text-gray-600">Get instant shipping estimates</p>
            </div>
          </div>
          
          {countdown.hours < 24 && (
            <div className="flex items-center gap-2 bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-xs font-bold">
              <Clock className="w-4 h-4" />
              Order in {countdown.hours}h {countdown.minutes}m for tomorrow delivery
            </div>
          )}
        </div>
      </div>

      {/* Address Input */}
      <div className="p-4 bg-white">
        <form onSubmit={handleAddressSubmit} className="space-y-3">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={address}
                onChange={handleAddressChange}
                placeholder="Enter delivery address"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-belims-blue focus:border-transparent"
              />
            </div>
            <button
              type="button"
              onClick={getUserLocation}
              className="px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-300 transition-colors"
              title="Use my location"
            >
              <Navigation className="w-5 h-5 text-gray-600" />
            </button>
          </div>
          
          <button
            type="submit"
            disabled={!address.trim() || isLoading}
            className="w-full bg-belims-blue text-white font-bold py-3 rounded-lg hover:bg-belims-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Calculating...' : 'Calculate Shipping'}
          </button>
        </form>
      </div>

      {/* AI Insight */}
      {aiInsight && (
        <div className="mx-4 mb-4 p-3 bg-gradient-to-r from-purple-100 to-blue-100 rounded-lg border border-purple-200">
          <div className="flex gap-2">
            <Star className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-purple-800 font-medium">{aiInsight}</p>
          </div>
        </div>
      )}

      {/* Shipping Options */}
      {isExpanded && shippingOptions.length > 0 && (
        <div className="p-4 space-y-3 bg-gray-50">
          <h4 className="font-bold text-gray-900 mb-4">Choose your delivery option:</h4>
          
          {shippingOptions.map((option) => (
            <div
              key={option.id}
              onClick={() => setSelectedOption(option.id)}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                selectedOption === option.id
                  ? 'border-belims-blue bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h5 className="font-bold text-gray-900">{option.name}</h5>
                    {option.isExpedited && (
                      <span className="bg-orange-100 text-orange-800 text-xs font-bold px-2 py-1 rounded">
                        <Zap className="w-3 h-3 inline mr-1" />
                        FAST
                      </span>
                    )}
                    {option.isEco && (
                      <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded">
                        <Leaf className="w-3 h-3 inline mr-1" />
                        ECO
                      </span>
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-1">
                    via {option.courier} • {option.deliveryDays}
                  </p>
                  
                  <p className="text-sm font-medium text-gray-900">
                    Estimated delivery: {option.deliveryDate}
                  </p>
                  
                  {option.cutoffTime && (
                    <p className="text-xs text-orange-600 font-medium mt-1">
                      <AlertCircle className="w-3 h-3 inline mr-1" />
                      Order before {option.cutoffTime}
                    </p>
                  )}
                  
                  {option.carbonImpact && (
                    <p className="text-xs text-green-600 font-medium mt-1">
                      <Leaf className="w-3 h-3 inline mr-1" />
                      {option.carbonImpact}kg CO₂ impact
                    </p>
                  )}
                  
                  {option.aiRecommendation && (
                    <p className="text-xs text-purple-700 font-medium mt-2 bg-purple-50 px-2 py-1 rounded">
                      {option.aiRecommendation}
                    </p>
                  )}
                </div>
                
                <div className="text-right ml-4">
                  <div className="text-lg font-bold text-belims-blue">
                    {formatCurrency(option.price)}
                  </div>
                  {selectedOption === option.id && (
                    <CheckCircle className="w-5 h-5 text-green-500 mt-1 ml-auto" />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}