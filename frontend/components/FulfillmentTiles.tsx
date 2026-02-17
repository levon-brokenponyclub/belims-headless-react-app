import React, { useState } from "react";
import {
  Check,
  MapPin,
  Truck,
  CreditCard,
  Zap,
  ChevronRight,
} from "lucide-react";
import { Store } from "../types";
import { CURRENCY_SYMBOL } from "../constants";

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

export interface SelectedDeliveryDetails {
  name: string;
  eta: string;
  price: number;
  isFree?: boolean;
  badge?: string;
}

interface FulfillmentTilesProps {
  pickup?: FulfillmentData;
  delivery?: FulfillmentData;
  pickupStore?: Store | null;
  pickupSchedule?: { date: string; time: string } | null;
  selectedType?: "pickup" | "delivery" | null;
  onSelect?: (type: "pickup" | "delivery") => void;
  onClearSelection?: () => void;
  onSetDeliveryLocation?: () => void;
  onOpenDeliveryOptions?: () => void;
  selectedDeliveryDetails?: SelectedDeliveryDetails | null;
  deliveryLocationSet?: boolean;
  deliveryAddress?: DeliveryAddress | null;
  onSchedulePickup?: () => void;
  onViewPickupDetails?: () => void;
  onResetPickupStore?: () => void;
  onEnableDefaultStore?: () => void;
  loading?: boolean;
}

export const FulfillmentTiles: React.FC<FulfillmentTilesProps> = ({
  pickup,
  delivery,
  pickupStore,
  pickupSchedule,
  onSetDeliveryLocation,
  onOpenDeliveryOptions,
  selectedDeliveryDetails,
  deliveryLocationSet = false,
  deliveryAddress,
  onSchedulePickup,
  onViewPickupDetails,
  onResetPickupStore,
  onEnableDefaultStore,
  loading = false,
}) => {
  const isDev = import.meta.env.DEV;
  const showDeliveryPrompt = !deliveryLocationSet;
  const rawEta = selectedDeliveryDetails?.eta || delivery?.eta || "";
  const normalizedEta = rawEta.replace(/^Estimated Arrival:\s*/i, "").trim();
  const isInStock = (pickup?.available ?? 0) > 0;
  const availabilityLabel = isInStock ? "Available" : "Unavailable";
  const dayKeys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

  const parseTimeToMinutes = (value?: string) => {
    if (!value) return null;
    const [hours, minutes] = value.split(":").map((part) => Number(part));
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    return hours * 60 + minutes;
  };

  const formatTimeLabel = (value?: string) => {
    if (!value) return "";
    const [hoursValue, minutesValue] = value.split(":").map(Number);
    if (Number.isNaN(hoursValue) || Number.isNaN(minutesValue)) return value;
    const suffix = hoursValue >= 12 ? "pm" : "am";
    const normalizedHours = hoursValue % 12 || 12;
    if (minutesValue === 0) {
      return `${normalizedHours}${suffix}`;
    }
    return `${normalizedHours}:${String(minutesValue).padStart(2, "0")}${suffix}`;
  };

  const getNextOpenDay = (
    hours: NonNullable<Store["hours"]>,
    startIndex: number,
  ) => {
    for (let offset = 1; offset <= 7; offset += 1) {
      const index = (startIndex + offset) % 7;
      const dayKey = dayKeys[index];
      const dayHours = hours[dayKey];
      if (!dayHours || dayHours.closed) continue;
      if (!dayHours.open || !dayHours.close) continue;
      return { index, dayHours };
    }
    return null;
  };

  const getPickupStatus = (store?: Store | null) => {
    if (!store?.hours) return null;
    const now = new Date();
    const dayKey = dayKeys[now.getDay()];
    const dayHours = store.hours[dayKey];

    if (!dayHours || dayHours.closed) {
      const nextOpen = getNextOpenDay(store.hours, now.getDay());
      if (nextOpen) {
        const isTomorrow = nextOpen.index === (now.getDay() + 1) % 7;
        const nextLabel = isTomorrow
          ? "opens tomorrow"
          : `opens ${dayLabels[nextOpen.index]}`;
        return {
          label: "Closed",
          detail: `${nextLabel} ${formatTimeLabel(nextOpen.dayHours.open)}`,
          isOpen: false,
        };
      }
      return { label: "Closed", isOpen: false };
    }

    const openMinutes = parseTimeToMinutes(dayHours.open);
    const closeMinutes = parseTimeToMinutes(dayHours.close);
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    if (openMinutes === null || closeMinutes === null) {
      return { label: "Closed", isOpen: false };
    }

    const breakStartMinutes = parseTimeToMinutes(dayHours.breakStart);
    const breakEndMinutes = parseTimeToMinutes(dayHours.breakEnd);

    if (
      breakStartMinutes !== null &&
      breakEndMinutes !== null &&
      nowMinutes >= breakStartMinutes &&
      nowMinutes < breakEndMinutes
    ) {
      return {
        label: "Closed",
        detail: `reopens ${formatTimeLabel(dayHours.breakEnd)}`,
        isOpen: false,
      };
    }

    if (nowMinutes < openMinutes) {
      return {
        label: "Closed",
        detail: `opens ${formatTimeLabel(dayHours.open)}`,
        isOpen: false,
      };
    }

    if (nowMinutes >= closeMinutes) {
      const nextOpen = getNextOpenDay(store.hours, now.getDay());
      if (nextOpen) {
        const isTomorrow = nextOpen.index === (now.getDay() + 1) % 7;
        const nextLabel = isTomorrow
          ? "opens tomorrow"
          : `opens ${dayLabels[nextOpen.index]}`;
        return {
          label: "Closed",
          detail: `${nextLabel} ${formatTimeLabel(nextOpen.dayHours.open)}`,
          isOpen: false,
        };
      }
      return { label: "Closed", isOpen: false };
    }

    if (nowMinutes >= closeMinutes - 60) {
      return {
        label: "Open",
        detail: `closing soon - closing at ${formatTimeLabel(dayHours.close)}`,
        isOpen: true,
      };
    }

    return {
      label: "Open",
      detail: `closing at ${formatTimeLabel(dayHours.close)}`,
      isOpen: true,
    };
  };

  const pickupStatus = getPickupStatus(pickupStore);
  const formatScheduledPickup = (dateValue: string, timeValue: string) => {
    const parsed = new Date(`${dateValue}T${timeValue}`);
    if (Number.isNaN(parsed.getTime())) {
      return `${dateValue} at ${timeValue}`;
    }
    const dayLabel = parsed.toLocaleDateString("en-ZA", { weekday: "long" });
    const dateLabel = parsed.toLocaleDateString("en-ZA", {
      day: "2-digit",
      month: "short",
    });
    return `${dayLabel} ${dateLabel} at ${timeValue}`;
  };
  const scheduledLabel = pickupSchedule
    ? formatScheduledPickup(pickupSchedule.date, pickupSchedule.time)
    : null;
  const pickupTone = pickupStatus?.isOpen
    ? "text-green-600"
    : pickupStatus?.isOpen === false
      ? "text-red-muted"
      : "text-grey-medium";
  const [isPickupRefreshing, setIsPickupRefreshing] = useState(false);
  const formatDeliveryPrice = (details?: SelectedDeliveryDetails | null) => {
    if (!details) return "";
    if (details.isFree || details.price === 0) return "FREE";
    return `${CURRENCY_SYMBOL}${details.price.toFixed(2)}`;
  };
  const handleDeliveryClick = () => {
    if (loading) return;
    if (showDeliveryPrompt) {
      onSetDeliveryLocation?.();
      return;
    }
    onOpenDeliveryOptions?.();
  };

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const handlePickupUpdate = () => {
      setIsPickupRefreshing(true);
    };
    window.addEventListener("belims:pickup-store-updated", handlePickupUpdate);
    return () => {
      window.removeEventListener(
        "belims:pickup-store-updated",
        handlePickupUpdate,
      );
    };
  }, []);

  React.useEffect(() => {
    if (!isPickupRefreshing) return;
    if (pickupStore?.name) {
      setIsPickupRefreshing(false);
    }
  }, [isPickupRefreshing, pickupStore?.name]);

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 gap-4">
        {/* Pickup Option */}
        {pickup && (
          <button
            type="button"
            onClick={() => {
              if (loading) return;
              onViewPickupDetails?.();
            }}
            disabled={loading}
            className={`group flex items-start gap-3 p-3 md:p-6 rounded-xl border border-subtle transition-all text-left bg-white ${
              loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
            }`}
          >
            <div className="flex items-center justify-center transition-colors flex-shrink-0 text-grey">
              <MapPin size={28} strokeWidth={1.5} />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2">
                {/* <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#ddf0df]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#337239]"></span>
                </span> */}
                <h3 className="font-semibold text-grey text-base">Pickup</h3>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onViewPickupDetails?.();
                  }}
                  className="relative h-8 w-8 overflow-hidden rounded-full border border-subtle bg-white text-grey transition-colors duration-300 ease-out group-hover:border-grey group-hover:bg-grey group-hover:text-white"
                  aria-label="View store information"
                >
                  <span className="absolute inset-0 origin-left scale-x-0 bg-grey transition-transform duration-300 ease-out group-hover:scale-x-100" />
                  <span className="relative z-10 flex items-center justify-center">
                    <ChevronRight size={16} strokeWidth={1.5} />
                  </span>
                </button>
              </div>
              <p className="text-[13px] mb-0 transition-colors text-grey-medium">
                Pickup from:{" "}
                {isPickupRefreshing && !pickupStore?.name ? (
                  <span className="inline-flex items-center" aria-hidden>
                    <span className="mr-2 h-3 w-20 rounded-full bg-grey-light animate-pulse" />
                    <span className="h-3 w-10 rounded-full bg-grey-light animate-pulse" />
                  </span>
                ) : pickupStore?.name ? (
                  <span className="shipping-text inline-flex items-center gap-2">
                    <span className="pick-up-store-name">
                      {pickupStore.name}
                    </span>
                    {/* <span className="separator text-gray-400">|</span> */}
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        isInStock ? "bg-[#039B6D]" : "bg-red-muted"
                      }`}
                      aria-hidden
                    />
                    <span
                      className={`pick-up-store-availability-indicator text-[13px] ${
                        isInStock
                          ? "available text-[#039B6D]"
                          : "unavailable text-red-muted"
                      }`}
                    >
                      {availabilityLabel}
                    </span>
                  </span>
                ) : (
                  <span>Select Store</span>
                )}
                <br />
                {pickupStore ? (
                  scheduledLabel ? (
                    <>Scheduled: {scheduledLabel}</>
                  ) : (
                    <>
                      {pickupStatus?.isOpen === false ? "" : ""}{" "}
                      {pickupStatus ? (
                        <>
                          <span className={`${pickupTone} font-semibold`}>
                            {pickupStatus.label}
                          </span>
                          {pickupStatus.detail && (
                            <span className="text-gray-400">
                              {" "}
                              - {pickupStatus.detail}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-grey-medium">Check hours</span>
                      )}
                    </>
                  )
                ) : null}
              </p>
              {/* {pickupStore && (
                <div className="mt-2 flex items-center gap-3">
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(event) => {
                      event.stopPropagation();
                      onViewPickupDetails?.();
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        event.stopPropagation();
                        onViewPickupDetails?.();
                      }
                    }}
                    className="text-[12px] font-bold text-red-muted hover:text-red-muted"
                  >
                    View store details
                  </span>
                  {isDev && onResetPickupStore && (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onResetPickupStore();
                      }}
                      className="text-[11px] font-semibold text-grey-medium hover:text-gray-700"
                    >
                      Reset store
                    </button>
                  )}
                  {isDev && onEnableDefaultStore && (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onEnableDefaultStore();
                      }}
                      className="text-[11px] font-semibold text-grey-medium hover:text-gray-700"
                    >
                      Use default store
                    </button>
                  )}
                </div>
              )} */}
            </div>
          </button>
        )}

        {/* Delivery Option */}
        {delivery && (
          <button
            type="button"
            onClick={handleDeliveryClick}
            disabled={loading}
            className={`group flex items-start gap-3 p-3 md:p-6 rounded-xl border border-subtle transition-all text-left bg-white ${
              loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
            }`}
          >
            <div className="flex items-center justify-center transition-colors flex-shrink-0 text-grey">
              <Truck size={28} strokeWidth={1.5} />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2 justify-center">
                  <h3 className="font-semibold text-grey text-base">
                    Delivery
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onOpenDeliveryOptions?.();
                    }}
                    className="relative h-8 w-8 overflow-hidden rounded-full border border-subtle bg-white text-grey transition-colors duration-300 ease-out group-hover:border-grey group-hover:bg-grey group-hover:text-white"
                    aria-label="View store information"
                  >
                    <span className="absolute inset-0 origin-left scale-x-0 bg-grey transition-transform duration-300 ease-out group-hover:scale-x-100" />
                    <span className="relative z-10 flex items-center justify-center">
                      <ChevronRight size={16} strokeWidth={1.5} />
                    </span>
                  </button>
                </div>
              </div>

              {showDeliveryPrompt ? (
                <div className="flex flex-col gap-1">
                  <p className="text-[13px] mb-0 transition-colors text-grey-medium">
                    Enter your address to see available delivery rates and dates
                  </p>
                  {/* <span
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
                    className="text-[12px] font-bold text-red-muted hover:text-red-muted text-left"
                  >
                    Set your location
                  </span> */}
                </div>
              ) : (
                <div className="text-[13px] mb-1">
                  <p className="text-grey-medium">
                    <span className="">Deliver to:</span>{" "}
                    {deliveryAddress?.street}, {deliveryAddress?.city}
                  </p>
                  {loading ? (
                    <p className="text-[13px] text-grey-medium mt-1">
                      Checking dates...
                    </p>
                  ) : (
                    normalizedEta && (
                      <div className="mt-0">
                        <p className="text-grey-medium text-[13px]">
                          <span className="">Estimated Arrival:</span>{" "}
                          {normalizedEta}
                        </p>
                        {selectedDeliveryDetails && (
                          <div className="mt-1 flex items-center justify-between text-gray-900 text-[12px]">
                            <span>
                              <span className="font-semibold">
                                Option Selected:
                              </span>{" "}
                              {selectedDeliveryDetails.name}
                            </span>
                            <span className="font-semibold">
                              {formatDeliveryPrice(selectedDeliveryDetails)}
                            </span>
                          </div>
                        )}
                        {!loading && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              onOpenDeliveryOptions?.();
                            }}
                            className="mt-1 text-[13px] font-semibold text-grey-medium hover:underline"
                          >
                            {selectedDeliveryDetails
                              ? "Change delivery option"
                              : "View delivery options"}
                          </button>
                        )}
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          </button>
        )}
      </div>
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
            ? "border-blue-900 bg-white"
            : "border-gray-100 bg-white hover:border-blue-200"
        }`}
      >
        <div className="flex items-center gap-3 w-[75%]">
          <div
            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
              selected === "standard" ? "border-blue-900" : "border-gray-300"
            }`}
          >
            {selected === "standard" && (
              <div className="w-2.5 h-2.5 rounded-full bg-blue-900" />
            )}
          </div>
          <div>
            <h4 className="font-bold text-gray-900 text-sm leading-tight">
              Standard Delivery
            </h4>
            <p className="text-xs text-grey-medium">
              Estimated Arrival: 17 Feb - 19 Feb
            </p>
          </div>
        </div>
        <span className="text-xs font-bold text-gray-900 flex-shrink-0 ml-auto">
          R75.00
        </span>
      </button>

      {/* Next Day Delivery */}
      <button
        type="button"
        onClick={() => setSelected("next-day")}
        className={`flex items-center justify-between p-6 rounded-md border-2 transition-all text-left ${
          selected === "next-day"
            ? "border-blue-900 bg-white"
            : "border-gray-100 bg-white hover:border-blue-200"
        }`}
      >
        <div className="flex items-center gap-3 w-[75%]">
          <div
            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
              selected === "next-day" ? "border-blue-900" : "border-gray-300"
            }`}
          >
            {selected === "next-day" && (
              <div className="w-2.5 h-2.5 rounded-full bg-blue-900" />
            )}
          </div>
          <div>
            <h4 className="font-bold text-gray-900 text-sm leading-tight">
              Next Day Delivery
            </h4>
            <p className="text-xs text-grey-medium">
              Estimated Arrival: 16 Feb
            </p>
          </div>
        </div>
        <span className="text-xs font-bold text-gray-900 flex-shrink-0 ml-auto">
          R125.00
        </span>
      </button>

      {/* Same Day Delivery */}
      <button
        type="button"
        onClick={() => setSelected("same-day")}
        className={`flex items-center justify-between p-6 rounded-md border-2 transition-all text-left ${
          selected === "same-day"
            ? "border-blue-900 bg-white"
            : "border-gray-100 bg-white hover:border-blue-200"
        }`}
      >
        <div className="flex items-center gap-3 w-[75%]">
          <div
            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
              selected === "same-day" ? "border-blue-900" : "border-gray-300"
            }`}
          >
            {selected === "same-day" && (
              <div className="w-2.5 h-2.5 rounded-full bg-blue-900" />
            )}
          </div>
          <div>
            <h4 className="font-bold text-gray-900 text-sm leading-tight">
              Same Day Delivery
            </h4>
            <p className="text-xs text-grey-medium">
              Estimated Arrival: 13 Feb
            </p>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-semibold bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
            <Zap size={10} fill="currentColor" />
            Faster
          </span>
        </div>
        <span className="text-xs font-bold text-gray-900 flex-shrink-0 ml-auto">
          R150.00
        </span>
      </button>
    </div>
  );
};
