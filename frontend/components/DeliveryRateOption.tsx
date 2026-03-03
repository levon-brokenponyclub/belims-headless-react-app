import React from "react";
import { formatCurrency } from "../utils/price";

export interface DeliveryRateOptionData {
  id: string;
  serviceName: string;
  eta: string;
  price: number;
  isFree?: boolean;
  badgeText?: "Fastest" | "Best value";
  etaEmphasis?: boolean;
}

interface DeliveryRateOptionProps {
  option: DeliveryRateOptionData;
  isSelected: boolean;
  onSelect: (id: string) => void;
  className?: string;
}

export const DeliveryRateOption: React.FC<DeliveryRateOptionProps> = ({
  option,
  isSelected,
  onSelect,
  className = "",
}) => {
  return (
    <button
      type="button"
      onClick={() => onSelect(option.id)}
      className={`relative z-[1] flex items-center justify-between py-3 pl-3 pr-2 border-l-2 transition-all text-left w-full ${
        isSelected
          ? "border-grey bg-grey-light/40"
          : "border-transparent bg-white hover:bg-grey-light/20"
      } ${className}`}
    >
      <div className="flex items-start gap-3 w-[75%]">
        <div
          className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
            isSelected ? "border-grey" : "border-grey-medium"
          }`}
        >
          {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-grey" />}
        </div>

        <div className="min-w-0">
          <h4 className="font-semibold text-gray-900 text-[14px] leading-relaxed">
            {option.serviceName}
          </h4>
          <p
            className={`text-sm ${option.etaEmphasis ? "text-grey font-medium" : "text-grey-medium"}`}
          >
            {option.eta}
          </p>
        </div>

        {option.badgeText && (
          <span className="text-xs font-semibold text-grey-medium">
            {option.badgeText}
          </span>
        )}
      </div>

      <span className="text-[14px] font-bold text-gray-900 flex-shrink-0">
        {option.isFree ? "FREE" : formatCurrency(option.price)}
      </span>
    </button>
  );
};
