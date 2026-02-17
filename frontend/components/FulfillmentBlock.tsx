import React from "react";
import { RefreshCw } from "lucide-react";
import { ShippingAddress, Store } from "../types";
import { FulfillmentTiles } from "./FulfillmentTiles";
import { DeliveryRateOption } from "./DeliveryRateOption";

type ShippingTier = "Express" | "Standard" | "Economy";

interface ShippingRate {
  service_name: string;
  total_price: number;
  expected_delivery_date?: string;
  tier?: ShippingTier;
}

interface FulfillmentBlockProps {
  productStock: number;
  fulfillmentType: "pickup" | "delivery" | null;
  onSelectFulfillment: (value: "pickup" | "delivery" | null) => void;
  onSetDeliveryLocation: () => void;
  hasDeliveryLocation: boolean;
  deliveryAddress: ShippingAddress | null;
  pickupStore?: Store | null;
  pickupSchedule?: { date: string; time: string } | null;
  earliestDeliveryEta: string;
  deliveryRates: ShippingRate[];
  loadingDeliveryRates: boolean;
  deliveryRatesError: string | null;
  onSchedulePickup: () => void;
  onViewPickupDetails?: () => void;
  onResetPickupStore?: () => void;
  onEnableDefaultStore?: () => void;
  selectedDeliveryOptionId: string;
  onSelectDeliveryOption: (id: string) => void;
  onOpenDeliveryOptions?: () => void;
  onClearSelection?: () => void;
  classifyRate: (rate: ShippingRate, allRates: ShippingRate[]) => ShippingTier;
  formatEta: (dateStr?: string | null) => string;
}

export const FulfillmentBlock: React.FC<FulfillmentBlockProps> = ({
  productStock,
  fulfillmentType,
  onSelectFulfillment,
  onSetDeliveryLocation,
  hasDeliveryLocation,
  deliveryAddress,
  pickupStore,
  pickupSchedule,
  earliestDeliveryEta,
  deliveryRates,
  loadingDeliveryRates,
  deliveryRatesError,
  onSchedulePickup,
  onViewPickupDetails,
  onResetPickupStore,
  onEnableDefaultStore,
  selectedDeliveryOptionId,
  onSelectDeliveryOption,
  onOpenDeliveryOptions,
  onClearSelection,
  classifyRate,
  formatEta,
}) => {
  const selectedRateIndex = deliveryRates.findIndex(
    (_, idx) => selectedDeliveryOptionId === `rate-${idx}`,
  );
  const selectedRate =
    selectedRateIndex >= 0 ? deliveryRates[selectedRateIndex] : null;

  return (
    <div className="mt-6">
      <FulfillmentTiles
        selectedType={fulfillmentType}
        onSelect={onSelectFulfillment}
        onClearSelection={onClearSelection}
        onSetDeliveryLocation={onSetDeliveryLocation}
        onOpenDeliveryOptions={onOpenDeliveryOptions}
        pickupStore={pickupStore}
        pickupSchedule={pickupSchedule}
        selectedDeliveryDetails={
          selectedRate
            ? {
                name: selectedRate.service_name,
                eta: formatEta(selectedRate.expected_delivery_date),
                price: selectedRate.total_price,
                isFree: selectedRate.total_price === 0,
                badge:
                  classifyRate(selectedRate, deliveryRates) === "Express"
                    ? "Faster"
                    : undefined,
              }
            : null
        }
        deliveryLocationSet={hasDeliveryLocation}
        deliveryAddress={deliveryAddress}
        pickup={{
          type: "pickup",
          available: productStock,
          eta: "Today",
          price: 0,
          isFree: true,
        }}
        delivery={{
          type: "delivery",
          available: productStock,
          eta: earliestDeliveryEta,
          price: deliveryRates.length > 0 ? deliveryRates[0].total_price : 0,
          isFree:
            deliveryRates.length > 0
              ? deliveryRates[0].total_price === 0
              : false,
        }}
        onSchedulePickup={onSchedulePickup}
        onViewPickupDetails={onViewPickupDetails}
        onResetPickupStore={onResetPickupStore}
        onEnableDefaultStore={onEnableDefaultStore}
        loading={loadingDeliveryRates}
      />

      {loadingDeliveryRates && fulfillmentType === "delivery" && (
        <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
          <RefreshCw size={14} className="animate-spin" />
          <span>Finding delivery options...</span>
        </div>
      )}
    </div>
  );
};
