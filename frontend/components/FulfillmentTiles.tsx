import React, { useState } from "react";
import { Check, MapPin } from "lucide-react";

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
  const tiles = [
    {
      key: "pickup" as const,
      label: "Pickup",
      data: pickup,
      icon: (
        <span
          className="inline-flex items-center justify-center text-gray-900 transition group-hover:text-belims-blue"
          aria-hidden="true"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
        </span>
      ),
    },
    {
      key: "delivery" as const,
      label: "Delivery",
      data: delivery,
      icon: (
        <span
          className="inline-flex items-center justify-center text-gray-900 transition group-hover:text-belims-blue"
          aria-hidden="true"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"></path>
            <path d="M15 18H9"></path>
            <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"></path>
            <circle cx="17" cy="18" r="2"></circle>
            <circle cx="7" cy="18" r="2"></circle>
          </svg>
        </span>
      ),
    },
  ].filter((tile) => tile.data);

  if (tiles.length === 0) return null;

  return (
    <div
      role="group"
      aria-label="Fulfillment options"
      className="flex flex-col sm:flex-row gap-3 w-full"
    >
      {tiles.map((tile) => {
        const isSelected = selectedType === tile.key;
        const data = tile.data!;
        const showDeliveryPrompt =
          tile.key === "delivery" && !deliveryLocationSet;

        return (
          <button
            key={tile.key}
            type="button"
            onClick={() => {
              if (!loading) {
                onSelect?.(tile.key);
              }
            }}
            disabled={loading}
            className={`group flex-1 relative rounded-lg border-2 p-4 text-left transition-all focus:outline-none bg-[#F9F9F9] ${
              isSelected
                ? "border-belims-blue shadow-md"
                : "border-[#E0E0E0] hover:border-belims-blue/50 focus:border-belims-blue"
            } ${loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          >
            <span
              className={`absolute left-0 top-0 h-1 bg-red-600 rounded-br transition-all duration-300 ${
                isSelected ? "w-[90%]" : "w-12 group-hover:w-[90%]"
              }`}
              aria-hidden="true"
            ></span>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                {/* Header with icon */}
                <div className="flex items-center gap-2 mb-2">
                  {tile.icon}
                  <h3 className="font-bold text-lg text-gray-900 font-heading">
                    {tile.label}
                  </h3>
                </div>

                {/* Address (delivery with location set) or ETA */}
                <div className="mb-1">
                  {tile.key === "delivery" &&
                  deliveryLocationSet &&
                  deliveryAddress ? (
                    <>
                      <div className="flex items-center gap-3 text-xs font-semibold text-gray-700 mb-1">
                        {/* <MapPin size={14} className="text-gray-400" /> */}
                        <span>Deliver to:</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {deliveryAddress.street}
                        {deliveryAddress.city && `, ${deliveryAddress.city}`}
                        {deliveryAddress.province &&
                          `, ${deliveryAddress.province}`}
                        {deliveryAddress.postalCode &&
                          `, ${deliveryAddress.postalCode}`}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-600">
                      {tile.key === "pickup" ? (
                        <>
                          Ready{" "}
                          <span className="font-bold text-green-600">
                            {data.eta}
                          </span>
                        </>
                      ) : showDeliveryPrompt ? (
                        <span className="font-bold text-gray-700">
                          No delivery location
                        </span>
                      ) : (
                        <>
                          As soon as{" "}
                          <span className="font-bold text-green-600">
                            {data.eta}
                          </span>
                        </>
                      )}
                    </p>
                  )}
                </div>

                {/* Availability or Change Location */}
                <div className="text-sm text-gray-600">
                  {showDeliveryPrompt ? (
                    <span>Set location to see delivery estimates.</span>
                  ) : tile.key === "pickup" ? (
                    <>
                      <span className="font-semibold">{data.available}</span>{" "}
                      {data.available === 1 ? "item" : "items"} available
                    </>
                  ) : null}
                </div>
              </div>

              {/* Checkmark if selected */}
              {isSelected && (
                <div className="flex-shrink-0 ml-2">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-belims-blue">
                    <Check size={16} className="text-white" />
                  </div>
                </div>
              )}
            </div>

            {/* Price / Action (only show when selected) */}
            {isSelected && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                {tile.key === "pickup" ? (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(event) => {
                      event.stopPropagation();
                      onSchedulePickup?.();
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        event.stopPropagation();
                        onSchedulePickup?.();
                      }
                    }}
                    className="inline-flex w-full items-center justify-center rounded border-2 border-belims-blue px-4 py-2 text-sm font-semibold text-belims-blue transition-colors hover:bg-belims-blue hover:text-white"
                  >
                    Schedule Pickup
                  </span>
                ) : tile.key === "delivery" &&
                  deliveryLocationSet &&
                  deliveryAddress ? (
                  <div className="text-sm text-gray-600">
                    <button
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        onSetDeliveryLocation?.();
                      }}
                      className="text-sm font-semibold text-belims-blue hover:text-belims-accent transition-colors"
                    >
                      Change Location
                    </button>
                  </div>
                ) : showDeliveryPrompt ? (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(event) => {
                      event.stopPropagation();
                      onSetDeliveryLocation?.();
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        event.stopPropagation();
                        onSetDeliveryLocation?.();
                      }
                    }}
                    className="inline-flex w-full items-center justify-center rounded-md border-2 border-belims-blue px-4 py-2 text-sm font-bold text-belims-blue transition-colors hover:bg-belims-blue hover:text-white"
                  >
                    Set delivery location
                  </span>
                ) : (
                  <>
                    <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">
                      Shipping
                    </p>
                    <p className="text-base font-bold text-green-600">
                      {data.isFree ? "FREE" : `R${data.price.toFixed(2)}`}
                    </p>
                  </>
                )}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
};
