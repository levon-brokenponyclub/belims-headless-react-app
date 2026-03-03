import React from "react";
import { Store } from "../types";
import { BottomDrawer } from "./BottomDrawer";
import { FulfillmentTab, FulfillmentTabs } from "./FulfillmentTabs";
import { formatCurrency } from "../utils/price";
import {
  formatDeliveryEtaText,
  getDeliveryOptionMarkers,
} from "../src/lib/fulfillmentSummary";

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

type ShippingTier = "Express" | "Standard" | "Economy";

interface ShippingRate {
  service_name: string;
  total_price: number;
  expected_delivery_date?: string;
  tier?: ShippingTier;
}

interface FulfillmentTilesProps {
  pickup?: FulfillmentData;
  delivery?: FulfillmentData;
  pickupStore?: Store | null;
  pickupSchedule?: { date: string; time: string } | null;
  selectedType: FulfillmentTab;
  onSelect: (type: FulfillmentTab) => void;
  onSetDeliveryLocation?: () => void;
  onEditDeliveryLocation?: () => void;
  onViewPickupDetails?: () => void;
  deliveryLocationSet?: boolean;
  deliveryAddress?: DeliveryAddress | null;
  deliveryRates: ShippingRate[];
  selectedDeliveryOptionId: string;
  onSelectDeliveryOption: (id: string) => void;
  loading?: boolean;
  deliveryRatesError?: string | null;
  focusDeliveryPanelSignal?: number;
}

interface DeliveryOptionsAccordionProps {
  isActive: boolean;
  hasAddress: boolean;
  deliveryRates: ShippingRate[];
  selectedDeliveryOptionId: string;
  onSelectDeliveryOption: (id: string) => void;
  loading: boolean;
  errorMessage?: string | null;
  onAddAddress?: () => void;
  onChangeAddress?: () => void;
}

type PickupStatus = {
  detail?: string;
  isOpen: boolean;
};

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

const formatOperatingHours = (
  hours?: NonNullable<Store["hours"]>[string],
): string => {
  if (!hours || hours.closed) {
    return "Closed";
  }
  if (hours.open && hours.close) {
    return `${hours.open} - ${hours.close}`;
  }
  return "Closed";
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

const getPickupStatus = (store?: Store | null): PickupStatus | null => {
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
        detail: `${nextLabel} ${formatTimeLabel(nextOpen.dayHours.open)}`,
        isOpen: false,
      };
    }
    return { isOpen: false };
  }

  const openMinutes = parseTimeToMinutes(dayHours.open);
  const closeMinutes = parseTimeToMinutes(dayHours.close);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  if (openMinutes === null || closeMinutes === null) {
    return { isOpen: false };
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
      detail: `opens ${formatTimeLabel(dayHours.breakEnd)}`,
      isOpen: false,
    };
  }

  if (nowMinutes < openMinutes) {
    return {
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
        detail: `${nextLabel} ${formatTimeLabel(nextOpen.dayHours.open)}`,
        isOpen: false,
      };
    }
    return { isOpen: false };
  }

  return { isOpen: true };
};

const getDeliveryAddressText = (address?: DeliveryAddress | null) => {
  if (!address) return "";
  const parts = [address.street, address.city, address.postalCode].filter(
    Boolean,
  );
  return parts.join(", ");
};

const getDeliverySummaryLine = ({
  hasAddress,
  selectedOption,
}: {
  hasAddress: boolean;
  selectedOption?: {
    service_name: string;
    total_price: number;
    expected_delivery_date?: string;
  };
}): string => {
  if (!hasAddress) {
    return "Add your address to see delivery rates and arrival dates.";
  }
  if (selectedOption) {
    return `Selected: ${selectedOption.service_name} — ${formatCurrency(selectedOption.total_price)} — ${formatDeliveryEtaText(selectedOption.expected_delivery_date)}`;
  }
  return "Choose a delivery option to see final ETA.";
};

const DeliveryOptionsAccordion: React.FC<DeliveryOptionsAccordionProps> = ({
  isActive,
  hasAddress,
  deliveryRates,
  selectedDeliveryOptionId,
  onSelectDeliveryOption,
  loading,
  errorMessage,
  onAddAddress,
  onChangeAddress,
}) => {
  const options = React.useMemo(
    () =>
      deliveryRates.map((rate, index) => ({
        id: `rate-${index}`,
        ...rate,
      })),
    [deliveryRates],
  );

  const selectedOption = options.find(
    (option) => option.id === selectedDeliveryOptionId,
  );
  const hasSelectedOption = Boolean(selectedOption);

  const { fastestOptionId, cheapestOptionId } = getDeliveryOptionMarkers(
    options.map((option) => ({
      id: option.id,
      total_price: option.total_price,
      expected_delivery_date: option.expected_delivery_date,
    })),
  );

  const defaultExpanded =
    isActive && hasAddress && !hasSelectedOption && options.length !== 1;

  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);

  React.useEffect(() => {
    setIsExpanded(defaultExpanded);
  }, [defaultExpanded]);

  const microSummary = getDeliverySummaryLine({
    hasAddress,
    selectedOption,
  });

  return (
    <div className="rounded-2xl border border-subtle bg-grey-light/50">
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="w-full px-4 py-3 text-left"
        aria-expanded={isExpanded}
        aria-controls="delivery-options-accordion"
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-grey">Delivery options</p>
          <span className="text-base leading-none text-grey-medium">
            {isExpanded ? "×" : "+"}
          </span>
        </div>
        <p className="mt-1 text-xs text-grey-medium">{microSummary}</p>
      </button>

      {isExpanded && (
        <div
          id="delivery-options-accordion"
          className="space-y-2 border-t border-subtle px-4 py-3"
        >
          {!hasAddress ? (
            <div className="space-y-3">
              <p className="text-sm text-grey-medium">
                Add your address to see delivery rates and arrival dates.
              </p>
              <button
                type="button"
                onClick={() => onAddAddress?.()}
                className="text-sm font-semibold text-grey underline"
              >
                Add address
              </button>
            </div>
          ) : loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={`delivery-option-skeleton-${index}`}
                  className="h-16 animate-pulse rounded-xl border border-subtle bg-white"
                />
              ))}
            </div>
          ) : errorMessage ? (
            <div className="space-y-2">
              <p className="text-sm text-red-muted">{errorMessage}</p>
              <button
                type="button"
                onClick={() => onChangeAddress?.()}
                className="text-sm font-semibold text-grey underline"
              >
                Change address
              </button>
            </div>
          ) : options.length === 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-grey-medium">
                Delivery isn’t available for this address. Try another address
                or use Pickup.
              </p>
              <button
                type="button"
                onClick={() => onChangeAddress?.()}
                className="text-sm font-semibold text-grey underline"
              >
                Change address
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {options.map((option) => {
                const isSelected = selectedDeliveryOptionId === option.id;
                const badgeText =
                  option.id === fastestOptionId
                    ? "Fastest"
                    : option.id === cheapestOptionId
                      ? "Best value"
                      : null;

                return (
                  <label
                    key={option.id}
                    htmlFor={option.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 transition-colors ${
                      isSelected
                        ? "border-grey bg-white"
                        : "border-subtle bg-white hover:border-grey-medium"
                    }`}
                  >
                    <input
                      id={option.id}
                      type="radio"
                      name="delivery-option"
                      checked={isSelected}
                      onChange={() => onSelectDeliveryOption(option.id)}
                      className="mt-1 h-4 w-4 text-grey"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-grey">
                          {option.service_name}
                        </p>
                        {badgeText && (
                          <span className="rounded-full border border-subtle bg-grey-light px-2 py-0.5 text-[11px] font-medium text-grey-medium">
                            {badgeText}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-grey-medium">
                        {formatDeliveryEtaText(option.expected_delivery_date)}
                      </p>
                    </div>
                    <p className="whitespace-nowrap text-sm font-medium text-grey">
                      {option.total_price === 0
                        ? "FREE"
                        : formatCurrency(option.total_price)}
                    </p>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const FulfillmentTiles: React.FC<FulfillmentTilesProps> = ({
  pickup,
  pickupStore,
  selectedType,
  onSelect,
  onSetDeliveryLocation,
  onEditDeliveryLocation,
  onViewPickupDetails,
  deliveryLocationSet = false,
  deliveryAddress,
  deliveryRates,
  selectedDeliveryOptionId,
  onSelectDeliveryOption,
  loading = false,
  deliveryRatesError,
  focusDeliveryPanelSignal,
}) => {
  const deliveryPanelRef = React.useRef<HTMLDivElement | null>(null);
  const [isStoreDetailsOpen, setIsStoreDetailsOpen] = React.useState(false);

  const pickupPanelId = "fulfillment-pickup-panel";
  const deliveryPanelId = "fulfillment-delivery-panel";

  const isPickupAvailable = (pickup?.available ?? 0) > 0;
  const pickupStatus = getPickupStatus(pickupStore);
  const storeStatusText = pickupStatus?.isOpen
    ? "Available"
    : pickupStatus?.detail
      ? `Closed — ${pickupStatus.detail}`
      : "Closed";

  React.useEffect(() => {
    if (selectedType === "delivery") {
      deliveryPanelRef.current?.focus();
    }
  }, [selectedType, focusDeliveryPanelSignal]);

  const handleViewStoreDetails = () => {
    if (pickupStore) {
      setIsStoreDetailsOpen(true);
      return;
    }
    onViewPickupDetails?.();
  };

  const hoursRows = dayKeys.map((dayKey, index) => ({
    label: dayLabels[index],
    value: formatOperatingHours(pickupStore?.hours?.[dayKey]),
  }));

  return (
    <div className="w-full space-y-3">
      <p className="text-sm font-semibold text-grey">Fulfillment</p>

      <FulfillmentTabs
        value={selectedType}
        onChange={onSelect}
        pickupPanelId={pickupPanelId}
        deliveryPanelId={deliveryPanelId}
      />

      <div className="pt-1">
        {selectedType === "pickup" && (
          <div
            id={pickupPanelId}
            role="tabpanel"
            aria-labelledby={`${pickupPanelId}-tab`}
            className="space-y-2 rounded-2xl border border-subtle bg-grey-light/50 px-4 py-3"
          >
            {!pickupStore ? (
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-grey-medium">No store selected.</p>
                <button
                  type="button"
                  onClick={() => onViewPickupDetails?.()}
                  className="text-sm font-semibold text-grey underline"
                >
                  Select store
                </button>
              </div>
            ) : !isPickupAvailable ? (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50/60 px-3 py-2">
                <p className="text-sm text-red-muted">
                  Pickup currently unavailable at {pickupStore.name}
                </p>
                <button
                  type="button"
                  onClick={() => onViewPickupDetails?.()}
                  className="shrink-0 text-sm font-semibold text-grey underline"
                >
                  Check availability at other stores
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm text-grey">
                    <span className="font-semibold">Pickup from:</span>{" "}
                    {pickupStore.name}
                  </p>
                  {typeof pickupStore.distance === "number" && (
                    <span className="whitespace-nowrap text-xs text-grey-medium">
                      {pickupStore.distance.toFixed(1)} km
                    </span>
                  )}
                </div>

                <p className="text-sm text-grey">
                  <span className="font-semibold">Status:</span>{" "}
                  {storeStatusText}
                </p>
                <p className="text-sm text-grey-medium">
                  Pickup available, usually ready in 24 hours
                </p>
              </>
            )}

            <button
              type="button"
              onClick={handleViewStoreDetails}
              className="text-sm font-semibold text-grey underline hover:text-grey-medium"
            >
              View store details
            </button>

            <BottomDrawer
              isOpen={isStoreDetailsOpen}
              onClose={() => setIsStoreDetailsOpen(false)}
              ariaLabel="Store details"
              heightClassName="h-[78vh] lg:h-[72vh]"
            >
              <div className="flex h-full flex-col bg-white">
                <div className="flex items-center justify-between border-b border-subtle px-5 py-4">
                  <p className="text-lg font-semibold text-grey">
                    Store details
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsStoreDetailsOpen(false)}
                    className="text-sm font-semibold text-grey-medium hover:text-grey"
                  >
                    Close
                  </button>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
                  <div className="space-y-2 rounded-2xl border border-subtle bg-grey-light/50 p-4">
                    <p className="text-base font-semibold text-grey">
                      {pickupStore?.name || "Selected store"}
                    </p>
                    {typeof pickupStore?.distance === "number" && (
                      <p className="text-sm text-grey-medium">
                        {pickupStore.distance.toFixed(1)} km away
                      </p>
                    )}
                    <p className="text-sm text-grey-medium">
                      {isPickupAvailable
                        ? "Pickup available, usually ready in 24 hours"
                        : "Pickup currently unavailable at this store."}
                    </p>
                    {pickupStore?.address && (
                      <p className="text-sm text-grey-medium">
                        {pickupStore.address}
                      </p>
                    )}
                    {pickupStore?.phone && (
                      <p className="text-sm text-grey-medium">
                        {pickupStore.phone}
                      </p>
                    )}
                    {pickupStatus && (
                      <p className="text-sm text-grey">
                        <span className="font-semibold">Status:</span>{" "}
                        {pickupStatus.isOpen
                          ? "Available"
                          : pickupStatus.detail
                            ? `Closed — ${pickupStatus.detail}`
                            : "Closed"}
                      </p>
                    )}
                  </div>

                  <div className="rounded-2xl border border-subtle bg-grey-light/50 p-4">
                    <p className="mb-2 text-sm font-semibold text-grey">
                      Operating hours
                    </p>
                    <ul className="space-y-1 text-sm text-grey-medium">
                      {hoursRows.map((row) => (
                        <li
                          key={row.label}
                          className="flex items-center justify-between gap-3"
                        >
                          <span>{row.label}:</span>
                          <span>{row.value}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsStoreDetailsOpen(false);
                      onViewPickupDetails?.();
                    }}
                    className="text-sm font-semibold text-grey underline"
                  >
                    Check availability at other stores
                  </button>
                </div>
              </div>
            </BottomDrawer>
          </div>
        )}

        {selectedType === "delivery" && (
          <div
            id={deliveryPanelId}
            ref={deliveryPanelRef}
            role="tabpanel"
            aria-labelledby={`${deliveryPanelId}-tab`}
            tabIndex={-1}
            className="space-y-3 focus:outline-none"
          >
            {!deliveryLocationSet ? (
              <div className="space-y-2 rounded-2xl border border-subtle bg-grey-light/50 px-4 py-3">
                <p className="text-sm text-grey-medium">
                  Add your address to see delivery options, rates and arrival
                  dates.
                </p>
                <button
                  type="button"
                  onClick={() => onSetDeliveryLocation?.()}
                  className="text-sm font-semibold text-grey underline"
                >
                  Add address
                </button>
              </div>
            ) : (
              <div className="rounded-2xl border border-subtle bg-grey-light/50 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="min-w-0 text-sm text-grey">
                    <span className="font-semibold">Deliver to:</span>{" "}
                    <span className="text-grey-medium">
                      {getDeliveryAddressText(deliveryAddress)}
                    </span>
                  </p>
                  <button
                    type="button"
                    onClick={() => onEditDeliveryLocation?.()}
                    className="shrink-0 text-sm font-semibold text-grey underline"
                  >
                    Edit
                  </button>
                </div>
              </div>
            )}

            <DeliveryOptionsAccordion
              isActive={selectedType === "delivery"}
              hasAddress={deliveryLocationSet}
              deliveryRates={deliveryRates}
              selectedDeliveryOptionId={selectedDeliveryOptionId}
              onSelectDeliveryOption={onSelectDeliveryOption}
              loading={loading}
              errorMessage={deliveryRatesError}
              onAddAddress={onSetDeliveryLocation}
              onChangeAddress={onEditDeliveryLocation || onSetDeliveryLocation}
            />
          </div>
        )}
      </div>
    </div>
  );
};
