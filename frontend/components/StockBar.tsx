import React from 'react';

interface StockBarProps {
  current: number;
  max: number;
}

export const StockBar: React.FC<StockBarProps> = ({ current, max }) => {
  const percentage = Math.min((current / max) * 100, 100);
  
  let colorClass = 'bg-green-500';
  let text = 'In Stock';
  
  if (percentage < 15) {
    colorClass = 'bg-red-500';
    text = 'Low Stock - Order Soon';
  } else if (percentage < 40) {
    colorClass = 'bg-yellow-500';
    text = 'Selling Fast';
  }

  return (
    <div className="w-full mt-2">
      <div className="flex justify-between items-center mb-1">
        <span className={`text-xs font-bold ${percentage < 15 ? 'text-red-600' : 'text-belims-blue'}`}>
          {text}
        </span>
        <span className="text-xs text-gray-500">{current} available</span>
      </div>
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className={`h-full ${colorClass} transition-all duration-500 ease-out`} 
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};