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

  const [deliveryExpanded, setDeliveryExpanded] = React.useState(false);

  const deliveryOptions = React.useMemo(
    () => deliveryRates.map((rate, index) => ({ id: `rate-${index}`, ...rate })),
    [deliveryRates],
  );
  const selectedDeliveryOption = deliveryOptions.find(
    (o) => o.id === selectedDeliveryOptionId,
  );
  const deliverySummaryLine = getDeliverySummaryLine({
    hasAddress: deliveryLocationSet,
    selectedOption: selectedDeliveryOption,
  });
  const { fastestOptionId, cheapestOptionId } = getDeliveryOptionMarkers(
    deliveryOptions.map((o) => ({
      id: o.id,
      total_price: o.total_price,
      expected_delivery_date: o.expected_delivery_date,
    })),
  );
  const earliestDeliveryOption =
    deliveryOptions.find((o) => o.id === fastestOptionId) ?? deliveryOptions[0] ?? null;
  const earliestDeliverySummary = earliestDeliveryOption
    ? `Earliest: ${earliestDeliveryOption.service_name} — ${
        earliestDeliveryOption.total_price === 0
          ? "FREE"
          : formatCurrency(earliestDeliveryOption.total_price)
      } — ${formatDeliveryEtaText(earliestDeliveryOption.expected_delivery_date)}`
    : null;

  React.useEffect(() => {
    if (selectedType === "delivery") {
      deliveryPanelRef.current?.focus();
    }
  }, [selectedType, focusDeliveryPanelSignal]);

  return (
    <div className="w-full space-y-4">
      <style>{`
        .pickup-card {
          cursor: pointer;
          transition: box-shadow 0.2s;
        }
        .pickup-card:hover {
          box-shadow: 0 4px 16px rgba(0,0,0,0.08);
        }
        .pickup-arrow {
          position: relative;
          overflow: hidden;
          transition: border-color 0.25s ease, color 0.25s ease;
        }
        .pickup-arrow::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 9999px;
          background: #111;
          transform: scaleX(0);
          transform-origin: left center;
          transition: transform 0.28s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }
        .pickup-card:hover .pickup-arrow {
          border-color: #111;
          color: #fff;
        }
        .pickup-card:hover .pickup-arrow::before {
          transform: scaleX(1);
        }
        .pickup-arrow svg {
          position: relative;
          z-index: 1;
          transition: transform 0.22s cubic-bezier(0.25, 0.46, 0.45, 0.94), color 0.22s ease;
        }
        .pickup-card:hover .pickup-arrow svg {
          transform: translateX(2px);
          color: #fff;
          stroke: #fff;
        }
      `}</style>

      <p className="text-base font-bold text-grey font-heading">Fulfillment</p>

      {/* ── Pickup card ── */}
      <div
        className="pickup-card"
        style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: "6px", padding: "14px 16px", display: "flex", alignItems: "center", gap: "12px" }}
        onClick={() => pickupStore ? onSchedulePickup?.() : onViewPickupDetails?.()}
      >
        {/* Storefront icon */}
        <div style={{ flexShrink: 0, color: "#374151" }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3.75 10.9055V16.875H16.25V10.9055" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M4.21875 3.125H15.7812C15.917 3.12503 16.0491 3.16926 16.1575 3.25101C16.2659 3.33277 16.3447 3.44759 16.382 3.57812L17.5 7.5H2.5L3.62031 3.57812C3.65754 3.44798 3.73601 3.33343 3.84393 3.25172C3.95185 3.17 4.08338 3.12553 4.21875 3.125Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M7.5 7.5V8.75C7.5 9.41304 7.23661 10.0489 6.76777 10.5178C6.29893 10.9866 5.66304 11.25 5 11.25C4.33696 11.25 3.70107 10.9866 3.23223 10.5178C2.76339 10.0489 2.5 9.41304 2.5 8.75V7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12.5 7.5V8.75C12.5 9.41304 12.2366 10.0489 11.7678 10.5178C11.2989 10.9866 10.663 11.25 10 11.25C9.33696 11.25 8.70107 10.9866 8.23223 10.5178C7.76339 10.0489 7.5 9.41304 7.5 8.75V7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M17.5 7.5V8.75C17.5 9.41304 17.2366 10.0489 16.7678 10.5178C16.2989 10.9866 15.663 11.25 15 11.25C14.337 11.25 13.7011 10.9866 13.2322 10.5178C12.7634 10.0489 12.5 9.41304 12.5 8.75V7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        {/* Info */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "3px" }}>
          {!pickupStore ? (
            <p style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#111" }}>
              Select a pickup store
            </p>
          ) : (
            <>
              <p style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#111" }}>
                Pickup at: <span>{pickupStore.name}</span>
              </p>
              <p style={{ margin: 0, fontSize: "14px", color: "#6b7280" }}>
                {scheduledLabel ? (
                  <>Scheduled: {scheduledLabel}</>
                ) : pickupStatus ? (
                  <>
                    <span style={{ fontWeight: 600, color: pickupStatusPrimary === "Open" ? "#16a34a" : "#dc2626" }}>
                      {pickupStatusPrimary}
                    </span>
                    {pickupStatusDetail ? ` - ${pickupStatusDetail}` : null}
                  </>
                ) : (
                  "Check store hours"
                )}
              </p>
              {pickupDistanceLabel && (
                <p style={{ margin: 0, fontSize: "14px", color: "#6b7280" }}>
                  Distance: {pickupDistanceLabel}
                </p>
              )}
              {!isPickupAvailable && (
                <p style={{ margin: 0, fontSize: "14px", color: "#dc2626" }}>
                  Pickup unavailable — check another store
                </p>
              )}
            </>
          )}
        </div>

        {/* Arrow — swipe animation matches CategoryGrid */}
        <span
          className="pickup-arrow"
          aria-hidden="true"
          style={{ flexShrink: 0, width: "32px", height: "32px", borderRadius: "9999px", border: "1px solid #d1d5db", background: "transparent", color: "#374151", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
            <path d="M7.5 3.75L13.75 10L7.5 16.25" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      </div>

      <div
        id={deliveryPanelId}
        ref={deliveryPanelRef}
        tabIndex={-1}
        className="space-y-3 focus:outline-none"
      >
        {!deliveryLocationSet ? (
          /* No address — same card style as pickup */
          <div
            className="pickup-card"
            style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: "6px", padding: "14px 16px", display: "flex", alignItems: "center", gap: "12px" }}
            onClick={() => onSetDeliveryLocation?.()}
          >
            {/* Truck icon */}
            <div style={{ flexShrink: 0, color: "#374151" }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1.25 4.375H12.5V13.75H1.25V4.375Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12.5 7.5H15.625L18.75 10.625V13.75H12.5V7.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="4.375" cy="14.375" r="1.25" stroke="currentColor" strokeWidth="1.5"/>
                <circle cx="15.625" cy="14.375" r="1.25" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "3px" }}>
              <p style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#111" }}>Add delivery address</p>
              <p style={{ margin: 0, fontSize: "14px", color: "#6b7280" }}>See rates and arrival dates</p>
            </div>
            <span
              className="pickup-arrow"
              aria-hidden="true"
              style={{ flexShrink: 0, width: "32px", height: "32px", borderRadius: "9999px", border: "1px solid #d1d5db", background: "transparent", color: "#374151", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
                <path d="M7.5 3.75L13.75 10L7.5 16.25" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
          </div>
        ) : (
          /* ── Unified delivery card ── */
          <div style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: "6px", overflow: "hidden" }}>
            {/* Header row — click to toggle */}
            <button
              type="button"
              className="pickup-card w-full text-left"
              aria-expanded={deliveryExpanded}
              style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: "12px", background: "transparent", border: "none", width: "100%", cursor: "pointer" }}
              onClick={() => setDeliveryExpanded((prev) => !prev)}
            >
              <div style={{ flexShrink: 0, color: "#374151" }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1.25 4.375H12.5V13.75H1.25V4.375Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12.5 7.5H15.625L18.75 10.625V13.75H12.5V7.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="4.375" cy="14.375" r="1.25" stroke="currentColor" strokeWidth="1.5"/>
                  <circle cx="15.625" cy="14.375" r="1.25" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "3px", textAlign: "left" }}>
                <p style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#111" }}>Delivering to:</p>
                <p style={{ margin: 0, fontSize: "14px", color: "#6b7280" }}>{getDeliveryAddressText(deliveryAddress)}</p>
                {selectedDeliveryOption ? (
                  <p style={{ margin: 0, fontSize: "14px", color: "#374151" }}>{deliverySummaryLine}</p>
                ) : earliestDeliverySummary ? (
                  <p style={{ margin: 0, fontSize: "14px", color: "#6b7280" }}>{earliestDeliverySummary}</p>
                ) : null}
              </div>
              {/* Expand/collapse chevron */}
              <span
                aria-hidden="true"
                style={{
                  flexShrink: 0, width: "32px", height: "32px", borderRadius: "9999px",
                  border: "1px solid #d1d5db", background: "transparent", color: "#374151",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "transform 0.22s ease, border-color 0.22s ease",
                  transform: deliveryExpanded ? "rotate(90deg)" : "rotate(0deg)",
                }}
              >
                <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
                  <path d="M7.5 3.75L13.75 10L7.5 16.25" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
            </button>

            {/* Expanded delivery options */}
            {deliveryExpanded && (
              <div style={{ borderTop: "1px solid #e5e5e5", padding: "16px" }} className="space-y-3">
                {loading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={`del-skel-${i}`} className="h-16 animate-pulse rounded-lg border border-subtle bg-white" />
                    ))}
                  </div>
                ) : deliveryRatesError ? (
                  <div className="space-y-2">
                    <p className="text-sm text-red-muted">{deliveryRatesError}</p>
                    <button type="button" onClick={() => (onEditDeliveryLocation ?? onSetDeliveryLocation)?.()}
                      className="text-sm font-semibold text-grey underline">Change address</button>
                  </div>
                ) : deliveryOptions.length === 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm text-grey-medium">Delivery isn't available for this address. Try another address or use Pickup.</p>
                    <button type="button" onClick={() => (onEditDeliveryLocation ?? onSetDeliveryLocation)?.()}
                      className="text-sm font-semibold text-grey underline">Change address</button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {deliveryOptions.map((option) => {
                      const isSelected = selectedDeliveryOptionId === option.id;
                      const badgeText = option.id === fastestOptionId ? "Fastest"
                        : option.id === cheapestOptionId ? "Best value" : null;
                      return (
                        <label
                          key={option.id}
                          htmlFor={option.id}
                          className={`block w-full cursor-pointer rounded-lg border px-4 py-4 transition-all ${
                            isSelected ? "border-brand bg-brand/10" : "border-subtle bg-white hover:border-grey hover:bg-soft"
                          }`}
                        >
                          <input id={option.id} type="radio" name="delivery-option"
                            checked={isSelected} onChange={() => onSelectDeliveryOption(option.id)}
                            className="sr-only" />
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${isSelected ? "border-brand bg-brand" : "border-subtle bg-white"}`}>
                                {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 text-base font-bold text-grey font-heading">
                                  <span className="truncate">{option.service_name}</span>
                                  {badgeText === "Best value" && <Pill tone="success">Budget</Pill>}
                                  {badgeText === "Fastest" && <Pill tone="warning" icon={<Zap size={12} />}>Faster</Pill>}
                                </div>
                                <div className="mt-1 text-sm text-grey-medium">{formatDeliveryEtaText(option.expected_delivery_date)}</div>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className="text-lg font-bold text-grey">
                                {option.total_price === 0 ? "FREE" : formatCurrency(option.total_price)}
                              </div>
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
                <button type="button" onClick={() => onEditDeliveryLocation?.()}
                  className="text-sm font-semibold text-grey underline mt-1">Change address</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
