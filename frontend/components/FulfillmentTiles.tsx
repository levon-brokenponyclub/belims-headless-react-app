import React from "react";
import { Store } from "../types";
import { BottomDrawer } from "./BottomDrawer";
import { FulfillmentTab } from "./FulfillmentTabs";
import { formatCurrency } from "../utils/price";
import { CheckCircle2, Minus, Plus, Zap } from "lucide-react";
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

const capitalizeFirst = (value?: string) => {
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1);
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
    hasAddress && !hasSelectedOption && options.length !== 1;

  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);

  React.useEffect(() => {
    setIsExpanded(defaultExpanded);
  }, [defaultExpanded]);

  const microSummary = getDeliverySummaryLine({
    hasAddress,
    selectedOption,
  });

  return (
    <div className="rounded-lg bg-grey-light px-4 py-3">
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="w-full text-left"
        aria-expanded={isExpanded}
        aria-controls="delivery-options-accordion"
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-grey">Delivery options</p>
          <span className="text-base leading-none text-grey-medium">
            {isExpanded ? <Minus size={18} /> : <Plus size={18} />}
          </span>
        </div>
        <p className="mt-1 text-xs text-grey-medium">{microSummary}</p>
      </button>

      {isExpanded && (
        <div id="delivery-options-accordion" className="mt-3 space-y-3">
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
                    className={`w-full cursor-pointer rounded-lg border p-4 py-6 transition-all ${
                      isSelected
                        ? "border-belims-blue bg-blue-50"
                        : "border-gray-200 bg-white hover:border-belims-blue hover:bg-gray-50"
                    }`}
                  >
                    <input
                      id={option.id}
                      type="radio"
                      name="delivery-option"
                      checked={isSelected}
                      onChange={() => onSelectDeliveryOption(option.id)}
                      className="sr-only"
                    />

                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="flex-shrink-0">
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              isSelected
                                ? "border-belims-blue bg-belims-blue"
                                : "border-gray-300 bg-white"
                            }`}
                          >
                            {isSelected ? (
                              <div className="w-2 h-2 rounded-full bg-white" />
                            ) : null}
                          </div>
                        </div>

                        <div>
                          <div className="font-bold text-gray-900 flex items-center gap-2">
                            {option.service_name}
                            {badgeText === "Best value" ? (
                              <span className="text-xs font-semibold bg-green-100 text-green-700 px-2 py-1 rounded-full">
                                Budget
                              </span>
                            ) : null}
                            {badgeText === "Fastest" ? (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                                <Zap size={12} />
                                Faster
                              </span>
                            ) : null}
                          </div>

                          <div className="text-xs text-gray-500 mt-1">
                            {formatDeliveryEtaText(
                              option.expected_delivery_date,
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-bold text-lg text-gray-900">
                          {option.total_price === 0
                            ? "FREE"
                            : formatCurrency(option.total_price)}
                        </div>
                      </div>
                    </div>
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
  const pickupStatusPrimary = pickupStatus?.isOpen ? "Open" : "Closed";
  const pickupStatusDetail = pickupStatus?.isOpen
    ? ""
    : pickupStatus?.detail
      ? capitalizeFirst(pickupStatus.detail)
      : "";

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
    <div className="w-full space-y-4">
      <p className="text-sm font-semibold text-grey">Fulfillment</p>

      <div className="rounded-lg bg-grey-light px-4 py-4">
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
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-red-100 text-red-600">
                <Minus size={14} />
              </span>
              <div className="grid gap-1">
                <p className="text-[20px] font-medium leading-tight text-grey">
                  {pickupStore.name}
                </p>
                <p className="text-sm leading-tight text-grey-medium">
                  Pickup unavailable, please check another store
                </p>
                <p className="text-sm leading-tight">
                  <span className="font-semibold text-red-600">
                    {pickupStatusPrimary}
                  </span>
                  {pickupStatusDetail ? (
                    <span className="text-grey-medium">
                      {" "}
                      · {pickupStatusDetail}
                    </span>
                  ) : null}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onViewPickupDetails?.()}
              className="text-sm text-grey underline text-right"
            >
              Check availability at other stores
            </button>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-7 w-7 shrink-0 text-green-700" />
              <div className="grid gap-1">
                <p className="text-[20px] font-medium leading-tight text-grey">
                  {pickupStore.name}
                </p>
                <p className="text-sm leading-tight text-grey-medium">
                  Usually ready in 24 hours
                </p>
                <p className="text-sm leading-tight">
                  <span
                    className={
                      pickupStatusPrimary === "Open"
                        ? "font-semibold text-green-700"
                        : "font-semibold text-red-600"
                    }
                  >
                    {pickupStatusPrimary}
                  </span>
                  {pickupStatusDetail ? (
                    <span className="text-grey-medium">
                      {" "}
                      · {pickupStatusDetail}
                    </span>
                  ) : null}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleViewStoreDetails}
              className="text-sm text-grey underline text-right"
            >
              Check availability at other stores
            </button>
          </div>
        )}
      </div>

      <BottomDrawer
        isOpen={isStoreDetailsOpen}
        onClose={() => setIsStoreDetailsOpen(false)}
        ariaLabel="Store details"
        heightClassName="h-[78vh] lg:h-[72vh]"
      >
        <div className="flex h-full flex-col bg-white">
          <div className="flex items-center justify-between border-b border-subtle px-5 py-4">
            <p className="text-lg font-semibold text-grey">Store details</p>
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
                  {pickupStore.distance.toFixed(1)} km
                </p>
              )}
              {pickupStore?.address && (
                <p className="text-sm text-grey-medium">
                  {pickupStore.address}
                </p>
              )}
              <p className="text-sm text-grey-medium">
                {isPickupAvailable
                  ? "Pickup available, usually ready in 24 hours"
                  : "Pickup unavailable, please check another store"}
              </p>
              <p className="text-sm leading-tight">
                <span
                  className={
                    pickupStatusPrimary === "Open"
                      ? "font-semibold text-green-700"
                      : "font-semibold text-red-600"
                  }
                >
                  {pickupStatusPrimary}
                </span>
              </p>
              {pickupStatusDetail ? (
                <p className="text-sm leading-tight text-grey-medium">
                  · {pickupStatusDetail}
                </p>
              ) : null}
              {pickupStore?.phone && (
                <p className="text-sm text-grey-medium">{pickupStore.phone}</p>
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

      <div
        id={deliveryPanelId}
        ref={deliveryPanelRef}
        tabIndex={-1}
        className="space-y-3 focus:outline-none"
      >
        {!deliveryLocationSet ? (
          <div className="rounded-lg bg-grey-light px-4 py-4">
            <div className="space-y-2">
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
          </div>
        ) : (
          <>
            <div className="rounded-lg bg-grey-light px-4 py-4">
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

            <DeliveryOptionsAccordion
              isActive={true}
              hasAddress={deliveryLocationSet}
              deliveryRates={deliveryRates}
              selectedDeliveryOptionId={selectedDeliveryOptionId}
              onSelectDeliveryOption={onSelectDeliveryOption}
              loading={loading}
              errorMessage={deliveryRatesError}
              onAddAddress={onSetDeliveryLocation}
              onChangeAddress={onEditDeliveryLocation || onSetDeliveryLocation}
            />
          </>
        )}
      </div>
    </div>
  );
};
