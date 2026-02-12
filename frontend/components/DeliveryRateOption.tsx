import React from "react";
import { Zap } from "lucide-react";
import { CURRENCY_SYMBOL } from "../constants";

export interface DeliveryRateOptionData {
  id: string;
  serviceName: string;
  eta: string;
  price: number;
  isFree?: boolean;
  badge?: string;
  isFaster?: boolean;
}

interface DeliveryRateOptionProps {
  option: DeliveryRateOptionData;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

export const DeliveryRateOption: React.FC<DeliveryRateOptionProps> = ({
  option,
  isSelected,
  onSelect,
}) => {
  return (
    <button
      type="button"
      onClick={() => onSelect(option.id)}
      className={`flex items-center justify-between p-6 rounded-md border transition-all text-left w-full ${
        isSelected
          ? "border-green-500 bg-[#dcfce796]"
          : "border-gray-300 bg-white hover:border-gray-400"
      }`}
    >
      <div className="flex items-center gap-3 w-[75%]">
        {/* Selection Indicator (Left) */}
        <div
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
            isSelected ? "border-green-500" : "border-green-500"
          }`}
        >
          {isSelected && (
            <div className="w-2.5 h-2.5 rounded-full bg-green-600" />
          )}
        </div>

        {/* Info */}
        <div>
          <h4 className="font-semibold text-gray-900 text-[14px] leading-relaxed">
            {option.serviceName}
          </h4>
          <p className="text-sm text-gray-600">{option.eta}</p>
        </div>

        {/* Badge */}
        {option.badge && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
            <Zap size={10} fill="currentColor" />
            {option.badge}
          </span>
        )}
      </div>

      {/* Price (Right) */}
      <span className="text-[14px] font-bold text-gray-900 flex-shrink-0">
        {option.isFree
          ? "FREE"
          : `${CURRENCY_SYMBOL}${option.price.toFixed(2)}`}
      </span>
    </button>
  );
};
