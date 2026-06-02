import React from "react";
import { Store } from "../types";
import { FulfillmentTab } from "./FulfillmentTabs";
import { Pill } from "./Pill";
import { formatCurrency } from "../utils/price";
import { Minus, Plus, Zap } from "lucide-react";
import {
  formatDeliveryEtaText,
  getDeliveryOptionMarkers,
} from "../src/lib/fulfillmentSummary";
import {
  formatPickupDistance,
  formatScheduledPickup,
  getPickupStatus,
  getStoredPickupDistance,
} from "../src/lib/pickupSummary";

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
  onSchedulePickup?: () => void;
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

const dayKeys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

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
    <div className="rounded-lg bg-grey-light px-4 py-4">
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="w-full text-left"
        aria-expanded={isExpanded}
        aria-controls="delivery-options-accordion"
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-base font-bold text-grey font-heading">
            Delivery options
          </p>
          <span className="leading-none text-grey-medium">
            {isExpanded ? <Minus size={18} /> : <Plus size={18} />}
          </span>
        </div>
        <p className="mt-1 text-sm text-grey-medium">{microSummary}</p>
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
                  className="h-16 animate-pulse rounded-lg border border-subtle bg-white"
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
                    className={`block w-full cursor-pointer rounded-lg border px-4 py-4 transition-all ${
                      isSelected
                        ? "border-brand bg-brand/10"
                        : "border-subtle bg-white hover:border-grey hover:bg-soft"
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
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="flex-shrink-0">
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                              isSelected
                                ? "border-brand bg-brand"
                                : "border-subtle bg-white"
                            }`}
                          >
                            {isSelected ? (
                              <div className="w-2 h-2 rounded-full bg-white" />
                            ) : null}
                          </div>
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-base font-bold text-grey font-heading">
                            <span className="truncate">{option.service_name}</span>
                            {badgeText === "Best value" ? (
                              <Pill tone="success">Budget</Pill>
                            ) : null}
                            {badgeText === "Fastest" ? (
                              <Pill tone="warning" icon={<Zap size={12} />}>
                                Faster
                              </Pill>
                            ) : null}
                          </div>

                          <div className="mt-1 text-sm text-grey-medium">
                            {formatDeliveryEtaText(
                              option.expected_delivery_date,
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <div className="text-lg font-bold text-grey">
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
  pickupSchedule,
  selectedType,
  onSelect,
  onSetDeliveryLocation,
  onEditDeliveryLocation,
  onViewPickupDetails,
  onSchedulePickup,
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

  const pickupPanelId = "fulfillment-pickup-panel";
  const deliveryPanelId = "fulfillment-delivery-panel";

  const isPickupAvailable = (pickup?.available ?? 0) > 0;
  const pickupStatus = getPickupStatus(pickupStore);
  const pickupStatusPrimary = pickupStatus?.isOpen ? "Open" : "Closed";
  const pickupStatusDetail = pickupStatus?.detail;
  const pickupDistance =
    pickupStore?.distance ?? getStoredPickupDistance(pickupStore?.id);
  const pickupDistanceLabel = formatPickupDistance(pickupDistance);
  const scheduledLabel = pickupSchedule
    ? formatScheduledPickup(pickupSchedule.date, pickupSchedule.time)
    : null;

  React.useEffect(() => {
    if (selectedType === "delivery") {
      deliveryPanelRef.current?.focus();
    }
  }, [selectedType, focusDeliveryPanelSignal]);

  return (
    <div className="w-full space-y-4">
      <p className="text-base font-bold text-grey font-heading">Fulfillment</p>

      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
        {!pickupStore ? (
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-neutral-500">No store selected.</p>
            <button
              type="button"
              onClick={() => onViewPickupDetails?.()}
              className="shrink-0 text-sm font-medium text-neutral-950 underline underline-offset-2"
            >
              Select store
            </button>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-neutral-950">
                Pickup at:{" "}
                <span className="font-semibold">{pickupStore.name}</span>
              </p>
              <p className="mt-1 text-sm text-neutral-500">
                {scheduledLabel ? (
                  <>Scheduled: {scheduledLabel}</>
                ) : pickupStatus ? (
                  <>
                    <span
                      className={`font-semibold ${
                        pickupStatusPrimary === "Open"
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {pickupStatusPrimary}
                    </span>
                    {pickupStatusDetail ? (
                      <span> - {pickupStatusDetail}</span>
                    ) : null}
                  </>
                ) : (
                  "Check hours"
                )}
              </p>
              <p className="mt-1 text-sm text-neutral-500">
                Distance: {pickupDistanceLabel}
              </p>
              {!isPickupAvailable ? (
                <p className="mt-1 text-sm text-neutral-500">
                  Pickup unavailable, please check another store
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => onSchedulePickup?.()}
              className="shrink-0 text-sm font-medium text-neutral-950 underline underline-offset-2"
            >
              {scheduledLabel ? "Change" : "Schedule"}
            </button>
          </div>
        )}
      </div>

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
