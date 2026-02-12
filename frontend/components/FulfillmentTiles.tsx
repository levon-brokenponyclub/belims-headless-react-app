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
    <div className="grid grid-cols-2 gap-3 w-full">
      {/* Pickup Option */}
      {pickup && (
        <button
          type="button"
          onClick={() => !loading && onSelect?.("pickup")}
          disabled={loading}
          className={`flex items-start gap-3 p-4 rounded-md border-2 transition-all text-left ${
            selectedType === "pickup"
              ? "border-blue-600 bg-blue-50/50"
              : "border-gray-200 bg-white hover:border-blue-200"
          } ${loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        >
          <div
            className={`flex items-center justify-center w-10 h-10 rounded-full border transition-colors flex-shrink-0 ${
              selectedType === "pickup"
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-gray-50 text-gray-900 border-gray-100"
            }`}
          >
            <MapPin size={20} strokeWidth={1.5} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 text-sm font-heading mb-1">
              Pickup
            </h3>
            <p
              className={`text-[10px] leading-4 transition-colors ${
                selectedType === "pickup" ? "text-blue-700" : "text-gray-500"
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
                className="mt-2 text-[10px] font-bold text-blue-600 hover:text-blue-800 underline"
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
          className={`flex items-start gap-3 p-4 rounded-md border-2 transition-all text-left ${
            selectedType === "delivery"
              ? "border-blue-600 bg-blue-50/50"
              : "border-gray-200 bg-white hover:border-blue-200"
          } ${loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        >
          <div
            className={`flex items-center justify-center w-10 h-10 rounded-full border transition-colors flex-shrink-0 ${
              selectedType === "delivery"
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-gray-50 text-gray-900 border-gray-100"
            }`}
          >
            <Truck size={20} strokeWidth={1.5} />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-gray-900 text-sm font-heading">
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
                  className="text-[10px] font-bold text-blue-600 hover:text-blue-800 underline"
                >
                  Change
                </span>
              )}
            </div>

            {showDeliveryPrompt ? (
              <div className="flex flex-col gap-1">
                <p className="text-[10px] leading-4 text-gray-500">
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
                  className="text-[10px] font-bold text-blue-600 hover:text-blue-800 text-left"
                >
                  Set your location
                </span>
              </div>
            ) : (
              <div className="text-[10px] leading-4">
                <p
                  className={`line-clamp-2 ${
                    selectedType === "delivery"
                      ? "text-blue-700"
                      : "text-gray-500"
                  }`}
                >
                  {deliveryAddress?.street}, {deliveryAddress?.city}
                </p>
                <p className="font-bold text-green-600 mt-1">
                  As soon as {delivery.eta}
                </p>
              </div>
            )}
          </div>
        </button>
      )}
    </div>
  );
};

export const ShippingSelectionTiles: React.FC = () => {
  const [selected, setSelected] = useState<"free" | "express">("free");

  return (
    <div className="grid grid-cols-1 gap-3 mt-4">
      {/* Free Shipping */}
      <button
        type="button"
        onClick={() => setSelected("free")}
        className={`flex items-center justify-between p-4 rounded-md border-2 transition-all text-left ${
          selected === "free"
            ? "border-blue-600 bg-white"
            : "border-gray-100 bg-white hover:border-blue-200"
        }`}
      >
        <div className="flex items-center gap-3 w-[75%]">
          <div
            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
              selected === "free" ? "border-blue-600" : "border-gray-300"
            }`}
          >
            {selected === "free" && (
              <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
            )}
          </div>
          <div>
            <h4 className="font-bold text-gray-900 text-sm leading-tight">
              Free Shipping
            </h4>
            <p className="text-xs text-gray-500">3-5 Days</p>
          </div>
        </div>
      </button>

      {/* Express Shipping */}
      <button
        type="button"
        onClick={() => setSelected("express")}
        className={`flex items-center justify-between p-4 rounded-md border-2 transition-all text-left ${
          selected === "express"
            ? "border-blue-600 bg-white"
            : "border-gray-100 bg-white hover:border-blue-200"
        }`}
      >
        <div className="flex items-center gap-3 w-[75%]">
          <div
            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
              selected === "express" ? "border-blue-600" : "border-gray-300"
            }`}
          >
            {selected === "express" && (
              <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
            )}
          </div>
          <div>
            <h4 className="font-bold text-gray-900 text-sm leading-tight">
              Express Shipping
            </h4>
            <p className="text-xs text-gray-500">Delivery, Tomorrow</p>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-semibold bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
            <Zap size={10} fill="currentColor" />
            Faster
          </span>
          <span className="text-xs font-bold text-gray-600 flex-shrink-0 ml-auto">
            $4.99
          </span>
        </div>
      </button>
    </div>
  );
};
