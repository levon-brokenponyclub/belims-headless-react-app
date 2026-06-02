import React from "react";
import { ShippingAddress, Store } from "../types";
import { FulfillmentTiles } from "@/components/FulfillmentTiles";
import { FulfillmentTab } from "./FulfillmentTabs";

type ShippingTier = "Express" | "Standard" | "Economy";

interface ShippingRate {
  service_name: string;
  total_price: number;
  expected_delivery_date?: string;
  tier?: ShippingTier;
}

interface FulfillmentBlockProps {
  productStock: number;
  fulfillmentType: FulfillmentTab;
  onSelectFulfillment: (value: FulfillmentTab) => void;
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
  focusDeliveryPanelSignal?: number;
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
  focusDeliveryPanelSignal,
}) => {
  return (
    <div className="mt-6">
      <FulfillmentTiles
        selectedType={fulfillmentType}
        onSelect={onSelectFulfillment}
        onSetDeliveryLocation={onSetDeliveryLocation}
        onEditDeliveryLocation={onSetDeliveryLocation}
        pickupStore={pickupStore}
        pickupSchedule={pickupSchedule}
        deliveryLocationSet={hasDeliveryLocation}
        deliveryAddress={deliveryAddress}
        deliveryRates={deliveryRates}
        selectedDeliveryOptionId={selectedDeliveryOptionId}
        onSelectDeliveryOption={onSelectDeliveryOption}
        onViewPickupDetails={onViewPickupDetails}
        onSchedulePickup={onSchedulePickup}
        deliveryRatesError={deliveryRatesError}
        focusDeliveryPanelSignal={focusDeliveryPanelSignal}
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
        loading={loadingDeliveryRates}
      />
    </div>
  );
};
