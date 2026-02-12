import React, { useState } from "react";
import { Check, MapPin, Truck, CreditCard, Zap } from "lucide-react";

export interface DeliveryAddress {
  street?: string;
  city?: string;
  province?: string;
  postalCode?: string;
}

export interface FulfillmentData {
  type: "pickup" | "delivery";
  available: number;
  eta: string;
  price: number;
  isFree?: boolean;
}

interface FulfillmentTilesProps {
  pickup?: FulfillmentData;
  delivery?: FulfillmentData;
  selectedType?: "pickup" | "delivery" | null;
  onSelect?: (type: "pickup" | "delivery") => void;
  onSetDeliveryLocation?: () => void;
  deliveryLocationSet?: boolean;
  deliveryAddress?: DeliveryAddress | null;
  onSchedulePickup?: () => void;
  loading?: boolean;
}

export const FulfillmentTiles: React.FC<FulfillmentTilesProps> = ({
  pickup,
  delivery,
  selectedType = null,
  onSelect,
  onSetDeliveryLocation,
  deliveryLocationSet = false,
  deliveryAddress,
  onSchedulePickup,
  loading = false,
}) => {
  const showDeliveryPrompt = !deliveryLocationSet;

  return (
    <div className="grid grid-cols-2 gap-4 w-full">
      {/* Pickup Option */}
      {pickup && (
        <button
          type="button"
          onClick={() => !loading && onSelect?.("pickup")}
          disabled={loading}
          className={`flex items-start gap-3 p-4 rounded-md border transition-all text-left ${
            selectedType === "pickup"
              ? "border-belims-accent bg-white"
              : "border-gray-400 bg-white hover:border-belims-accent/50"
          } ${loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        >
          <div
            className={`flex items-center justify-center w-10 h-10 rounded-full border transition-colors flex-shrink-0 ${
              selectedType === "pickup"
                ? "bg-belims-accent text-white border-belims-accent"
                : "bg-gray-50 text-gray-900 border-gray-100"
            }`}
          >
            <MapPin size={20} strokeWidth={1.5} />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 text-[15px] mb-1">
              Pickup
            </h3>
            <p
              className={`text-[12px] leading-5 mb-2 transition-colors ${
                selectedType === "pickup" ? "text-gray-600" : "text-gray-600"
              }`}
            >
              Ready <span className="font-bold">{pickup.eta}</span>
              <br />
              <span className="font-semibold">{pickup.available}</span>{" "}
              {pickup.available === 1 ? "item" : "items"} available
            </p>
            {selectedType === "pickup" && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  onSchedulePickup?.();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    onSchedulePickup?.();
                  }
                }}
                className="mt-2 text-[12px] font-bold text-belims-accent hover:text-belims-accent"
              >
                Schedule Pickup
              </span>
            )}
          </div>
        </button>
      )}

      {/* Delivery Option */}
      {delivery && (
        <button
          type="button"
          onClick={() => !loading && onSelect?.("delivery")}
          disabled={loading}
          className={`flex items-start gap-3 p-4 rounded-md border transition-all text-left ${
            selectedType === "delivery"
              ? "border-belims-accent bg-white"
              : "border-gray-400 bg-white hover:border-belims-accent/50"
          } ${loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        >
          <div
            className={`flex items-center justify-center w-10 h-10 rounded-full border transition-colors flex-shrink-0 ${
              selectedType === "delivery"
                ? "bg-belims-accent text-white border-belims-accent"
                : "bg-gray-50 text-gray-900 border-gray-100"
            }`}
          >
            <Truck size={20} strokeWidth={1.5} />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-gray-900 text-[15px] mb-1">
                Delivery
              </h3>
              {!showDeliveryPrompt && selectedType === "delivery" && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSetDeliveryLocation?.();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      e.stopPropagation();
                      onSetDeliveryLocation?.();
                    }
                  }}
                  className="text-[12px] font-bold text-belims-accent hover:text-belims-accent"
                >
                  Change
                </span>
              )}
            </div>

            {showDeliveryPrompt ? (
              <div className="flex flex-col gap-1">
                <p className="text-[12px] leading-5 mb-2 text-gray-600">
                  No delivery location set
                </p>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSetDeliveryLocation?.();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      e.stopPropagation();
                      onSetDeliveryLocation?.();
                    }
                  }}
                  className="text-[12px] font-bold text-belims-accent hover:text-belims-accent text-left"
                >
                  Set your location
                </span>
              </div>
            ) : (
              <div className="text-[12px] leading-5 mb-2">
                <p
                  className={`line-clamp-2 text-balance ${
                    selectedType === "delivery"
                      ? "text-gray-600"
                      : "text-gray-600"
                  }`}
                >
                  {deliveryAddress?.street}, {deliveryAddress?.city}
                </p>
                {loading ? (
                  <p className="text-[12px] text-gray-400 mt-1">
                    Checking dates...
                  </p>
                ) : (
                  delivery.eta && (
                    <p className="font-bold text-belims-blue mt-2 text-[12px]">
                      As soon as {delivery.eta}
                    </p>
                  )
                )}
              </div>
            )}
          </div>
        </button>
      )}
    </div>
  );
};

export const ShippingSelectionTiles: React.FC = () => {
  const [selected, setSelected] = useState<
    "standard" | "next-day" | "same-day"
  >("standard");

  return (
    <div className="grid grid-cols-1 gap-3 mt-4">
      {/* Standard Delivery */}
      <button
        type="button"
        onClick={() => setSelected("standard")}
        className={`flex items-center justify-between p-6 rounded-md border-2 transition-all text-left ${
          selected === "standard"
            ? "border-blue-600 bg-white"
            : "border-gray-100 bg-white hover:border-blue-200"
        }`}
      >
        <div className="flex items-center gap-3 w-[75%]">
          <div
            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
              selected === "standard" ? "border-blue-600" : "border-gray-300"
            }`}
          >
            {selected === "standard" && (
              <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
            )}
          </div>
          <div>
            <h4 className="font-bold text-gray-900 text-sm leading-tight">
              Standard Delivery
            </h4>
            <p className="text-xs text-gray-500">
              Estimated Arrival: 17 Feb - 19 Feb
            </p>
          </div>
        </div>
        <span className="text-xs font-bold text-gray-600 flex-shrink-0 ml-auto">
          R75.00
        </span>
      </button>

      {/* Next Day Delivery */}
      <button
        type="button"
        onClick={() => setSelected("next-day")}
        className={`flex items-center justify-between p-6 rounded-md border-2 transition-all text-left ${
          selected === "next-day"
            ? "border-blue-600 bg-white"
            : "border-gray-100 bg-white hover:border-blue-200"
        }`}
      >
        <div className="flex items-center gap-3 w-[75%]">
          <div
            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
              selected === "next-day" ? "border-blue-600" : "border-gray-300"
            }`}
          >
            {selected === "next-day" && (
              <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
            )}
          </div>
          <div>
            <h4 className="font-bold text-gray-900 text-sm leading-tight">
              Next Day Delivery
            </h4>
            <p className="text-xs text-gray-500">Estimated Arrival: 16 Feb</p>
          </div>
        </div>
        <span className="text-xs font-bold text-gray-600 flex-shrink-0 ml-auto">
          R125.00
        </span>
      </button>

      {/* Same Day Delivery */}
      <button
        type="button"
        onClick={() => setSelected("same-day")}
        className={`flex items-center justify-between p-6 rounded-md border-2 transition-all text-left ${
          selected === "same-day"
            ? "border-blue-600 bg-white"
            : "border-gray-100 bg-white hover:border-blue-200"
        }`}
      >
        <div className="flex items-center gap-3 w-[75%]">
          <div
            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
              selected === "same-day" ? "border-blue-600" : "border-gray-300"
            }`}
          >
            {selected === "same-day" && (
              <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
            )}
          </div>
          <div>
            <h4 className="font-bold text-gray-900 text-sm leading-tight">
              Same Day Delivery
            </h4>
            <p className="text-xs text-gray-500">Estimated Arrival: 13 Feb</p>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-semibold bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
            <Zap size={10} fill="currentColor" />
            Faster
          </span>
        </div>
        <span className="text-xs font-bold text-gray-600 flex-shrink-0 ml-auto">
          R150.00
        </span>
      </button>
    </div>
  );
};
