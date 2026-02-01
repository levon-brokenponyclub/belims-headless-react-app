import React from "react";
import { Zap } from "lucide-react";

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
      className={`w-full rounded-lg border-2 p-4 text-left transition-all focus:outline-none focus:ring-2 focus:ring-belims-blue/40 ${
        isSelected
          ? "border-belims-blue bg-blue-50/60 shadow-md"
          : "border-gray-200 bg-white hover:border-belims-blue hover:bg-blue-50/30"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Left Side: Icon, Title + Badge, ETA */}
        <div className="flex-1 flex gap-3">
          {/* Icon */}
          <div className="flex-shrink-0 mt-1">
            {option.isFaster ? (
              <Zap size={20} className="text-amber-500" />
            ) : (
              <div className="w-5 h-5 rounded border-2 border-gray-300 flex items-center justify-center">
                {isSelected && (
                  <div className="w-3 h-3 rounded-full bg-belims-blue" />
                )}
              </div>
            )}
          </div>

          {/* Title + Badge and ETA */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-bold text-sm text-gray-900 font-heading">
                {option.serviceName}
              </h4>
              {option.badge && (
                <span className="text-xs font-bold text-white bg-teal-600 px-2 py-0.5 rounded uppercase tracking-wide">
                  {option.badge}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-600">{option.eta}</p>
          </div>
        </div>

        {/* Right Side: Price + Selection Indicator */}
        <div className="flex-shrink-0 text-right">
          <p className="text-base font-bold text-gray-900">
            {option.isFree ? "FREE" : `$${option.price.toFixed(2)}`}
          </p>
          <div
            className="mt-2 w-5 h-5 rounded-full border-2 flex items-center justify-center ml-auto transition-colors"
            style={{
              borderColor: isSelected
                ? "rgb(37, 99, 235)"
                : "rgb(209, 213, 219)",
              backgroundColor: isSelected ? "rgb(37, 99, 235)" : "transparent",
            }}
          >
            {isSelected && (
              <svg
                className="w-3 h-3 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </div>
        </div>
      </div>
    </button>
  );
};
