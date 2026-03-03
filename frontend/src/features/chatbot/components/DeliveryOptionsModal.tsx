import React from "react";
import { X } from "lucide-react";
import { DeliveryOption } from "../types";
import {
  DeliveryRateOption,
  DeliveryRateOptionData,
} from "../../../../components/DeliveryRateOption";

interface DeliveryOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  options: DeliveryOption[];
  selectedOptionId?: string;
  onSelect: (optionId: string) => void;
}

const toRateOption = (option: DeliveryOption): DeliveryRateOptionData => ({
  id: option.id,
  serviceName: option.label,
  eta: option.etaText,
  price: option.price ?? 0,
  isFree: option.isFree,
  badge: option.badge,
  isFaster: option.badge?.toLowerCase().includes("fast") ?? false,
});

export const DeliveryOptionsModal: React.FC<DeliveryOptionsModalProps> = ({
  isOpen,
  onClose,
  options,
  selectedOptionId,
  onSelect,
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[1400] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-label="Close delivery options"
      />

      <div className="relative w-full max-w-2xl rounded-2xl bg-white border border-gray-200 shadow-xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-900">
            Delivery options
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-full border border-gray-200 inline-flex items-center justify-center hover:bg-gray-100"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-2">
          {options.map((option) => {
            const mapped = toRateOption(option);
            return (
              <DeliveryRateOption
                key={option.id}
                option={mapped}
                isSelected={selectedOptionId === option.id}
                onSelect={onSelect}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};
