import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { Store as StoreIcon, Truck, X } from "lucide-react";
import { ShippingAddress, Store } from "../types";
import { FulfillmentTab } from "./FulfillmentTabs";
import { formatCurrency } from "../utils/price";
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

interface ShippingRate {
  service_name: string;
  total_price: number;
  expected_delivery_date?: string;
}

interface FulfilmentChooserProps {
  fulfillmentType: FulfillmentTab;
  onSelectFulfillment: (value: FulfillmentTab) => void;
  /** Opens the delivery address panel (DeliveryLocationModal). */
  onSetDeliveryLocation: () => void;
  hasDeliveryLocation: boolean;
  deliveryAddress: ShippingAddress | null;
  pickupStore: Store | null;
  pickupSchedule: { date: string; time: string } | null;
  deliveryRates: ShippingRate[];
  loadingDeliveryRates: boolean;
  deliveryRatesError: string | null;
  /** Rate ids follow the existing `rate-<index>` convention read by cart / checkout. */
  selectedDeliveryOptionId: string;
  onSelectDeliveryOption: (id: string) => void;
  onViewPickupDetails: () => void;
  onSchedulePickup: () => void;
  /** Bumped after an address is saved — opens the rates drawer once rates arrive. */
  focusDeliveryPanelSignal: number;
}

export // One outlined action button for both methods (Delivery: Change · Pickup: Schedule pickup) so it sits in the same place.
const ACTION_BUTTON =
  "min-h-11 whitespace-nowrap rounded-md border-2 border-[#171b2b] bg-white px-4 font-heading font-condensed text-button font-bold uppercase text-text transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-belims-blue focus-visible:ring-offset-2";

export const FulfilmentChooser: React.FC<FulfilmentChooserProps> = ({
  fulfillmentType,
  onSelectFulfillment,
  onSetDeliveryLocation,
  hasDeliveryLocation,
  deliveryAddress,
  pickupStore,
  pickupSchedule,
  deliveryRates,
  loadingDeliveryRates,
  deliveryRatesError,
  selectedDeliveryOptionId,
  onSelectDeliveryOption,
  onViewPickupDetails,
  onSchedulePickup,
  focusDeliveryPanelSignal,
}) => {
  const options = useMemo(
    () => deliveryRates.map((rate, index) => ({ id: `rate-${index}`, ...rate })),
    [deliveryRates],
  );
  const { cheapestOptionId, fastestOptionId } = getDeliveryOptionMarkers(options);
  const selectedOption = options.find((o) => o.id === selectedDeliveryOptionId);
  const cheapest = options.find((o) => o.id === cheapestOptionId);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [pendingId, setPendingId] = useState(selectedDeliveryOptionId);
  const changeButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const awaitingRatesRef = useRef(false);

  const openDrawer = () => {
    setPendingId(selectedDeliveryOptionId || cheapestOptionId || "");
    setIsDrawerOpen(true);
  };
  const closeDrawer = () => {
    setIsDrawerOpen(false);
    changeButtonRef.current?.focus();
  };

  // A freshly saved address → show its rates as soon as they load.
  useEffect(() => {
    if (focusDeliveryPanelSignal > 0) awaitingRatesRef.current = true;
  }, [focusDeliveryPanelSignal]);
  useEffect(() => {
    if (awaitingRatesRef.current && !loadingDeliveryRates && options.length > 0) {
      awaitingRatesRef.current = false;
      openDrawer();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingDeliveryRates, options.length]);

  useEffect(() => {
    if (!isDrawerOpen) return;
    drawerRef.current?.querySelector<HTMLInputElement>("input:checked, input")?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeDrawer();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDrawerOpen]);

  const isDelivery = fulfillmentType === "delivery";
  // Same label the header pill shows; fall back to suburb/city + postcode.
  const place =
    deliveryAddress?.label ||
    [deliveryAddress?.suburb || deliveryAddress?.city, deliveryAddress?.postalCode].filter(Boolean).join(", ");
  const pickupStatus = getPickupStatus(pickupStore);
  const distance = getStoredPickupDistance(pickupStore?.id);

  const chooseDelivery = () => {
    onSelectFulfillment("delivery");
    if (!hasDeliveryLocation) onSetDeliveryLocation();
  };
  const choosePickup = () => {
    onSelectFulfillment("pickup");
    if (!pickupStore) onViewPickupDetails();
  };
  const onMethodKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
    if (!keys.includes(e.key)) return;
    e.preventDefault();
    const next: FulfillmentTab = e.key === "Home"
      ? "delivery"
      : e.key === "End"
        ? "pickup"
        : isDelivery
          ? "pickup"
          : "delivery";
    (next === "delivery" ? chooseDelivery : choosePickup)();
    e.currentTarget.querySelector<HTMLButtonElement>(`[data-method="${next}"]`)?.focus();
  };

  return (
    <div>
    <section className="mt-6 rounded-xl border border-border bg-white p-4 sm:p-5" aria-labelledby="fulfil-label">
      <h2 id="fulfil-label" className="mb-3 text-caption font-extrabold uppercase tracking-[.06em] text-text">
        How do you want it?
      </h2>
      <div
        role="tablist"
        aria-label="Fulfilment method"
        className="mb-4 grid grid-cols-2 gap-1 rounded-lg bg-surface-muted p-1.5"
        onKeyDown={onMethodKeyDown}
      >
        <button
          type="button"
          role="tab"
          id="fulfilment-tab-delivery"
          data-method="delivery"
          aria-selected={isDelivery}
          aria-controls="fulfilment-method-panel"
          tabIndex={isDelivery ? 0 : -1}
          onClick={chooseDelivery}
          className={`flex min-h-12 items-center justify-center gap-2 rounded-md px-3 py-2 text-base font-bold transition-[background-color,color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-belims-blue focus-visible:ring-offset-2 ${
            isDelivery ? "bg-white text-text shadow-sm" : "text-text-secondary hover:text-text"
          }`}
        >
          <Truck size={22} strokeWidth={2} aria-hidden="true" />
          Delivery
        </button>
        <button
          type="button"
          role="tab"
          id="fulfilment-tab-pickup"
          data-method="pickup"
          aria-selected={!isDelivery}
          aria-controls="fulfilment-method-panel"
          tabIndex={!isDelivery ? 0 : -1}
          onClick={choosePickup}
          className={`flex min-h-12 items-center justify-center gap-2 rounded-md px-3 py-2 text-base font-bold transition-[background-color,color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-belims-blue focus-visible:ring-offset-2 ${
            !isDelivery ? "bg-white text-text shadow-sm" : "text-text-secondary hover:text-text"
          }`}
        >
          <StoreIcon size={22} strokeWidth={2} aria-hidden="true" />
          Pickup
        </button>
      </div>

      <div
        id="fulfilment-method-panel"
        role="tabpanel"
        aria-labelledby={`fulfilment-tab-${isDelivery ? "delivery" : "pickup"}`}
        className="grid grid-cols-[56px_minmax(0,1fr)] items-center gap-4 rounded-lg border-[2px] border-[#171b2b] p-4 sm:grid-cols-[72px_minmax(0,1fr)_auto] sm:gap-5 sm:p-5"
      >
        <span aria-hidden="true" className="grid h-14 w-14 place-items-center rounded-md bg-surface-muted text-belims-blue sm:h-[72px] sm:w-[72px]">
          {isDelivery ? <Truck size={30} strokeWidth={2} /> : <StoreIcon size={30} strokeWidth={2} />}
        </span>

        {isDelivery ? (
          <div className="min-w-0">
            <h3
              id="fulfilment-method-delivery"
              className="truncate text-base font-bold leading-snug text-text sm:text-lg"
              title={hasDeliveryLocation && place ? `Delivery to ${place}` : undefined}
            >
              {hasDeliveryLocation && place ? `Delivery to ${place}` : "Delivery"}
            </h3>
            {!hasDeliveryLocation ? (
              <p className="mt-1 text-base leading-relaxed text-text-secondary">Add your address to see delivery rates and arrival dates.</p>
            ) : loadingDeliveryRates ? (
              <p className="mt-1 text-base text-text-secondary">Getting delivery rates…</p>
            ) : selectedOption ? (
              <>
                <p className="mt-1 text-base leading-relaxed text-text-secondary">
                  {selectedOption.service_name} · <b className="text-text">{formatCurrency(selectedOption.total_price)}</b>
                </p>
                <p className="mt-1 text-caption text-text-tertiary">
                  {formatDeliveryEtaText(selectedOption.expected_delivery_date)}
                </p>
              </>
            ) : cheapest ? (
              <p className="mt-1 text-base leading-relaxed text-text-secondary">
                {options.length} option{options.length > 1 ? "s" : ""} from <b className="text-text">{formatCurrency(cheapest.total_price)}</b> · choose one
              </p>
            ) : (
              <p className="mt-1 text-base text-text-secondary">No delivery options for this address.</p>
            )}
            {deliveryRatesError && hasDeliveryLocation && !loadingDeliveryRates && (
              <p className="mt-1 text-caption text-warning">{deliveryRatesError}</p>
            )}
          </div>
        ) : (
          <div className="min-w-0">
            <h3 id="fulfilment-method-pickup" className="flex flex-wrap items-center gap-2 text-base font-bold leading-snug text-text sm:text-lg">
              {pickupStore ? `Collect from ${pickupStore.name}` : "Collect in store"}
              <span className="rounded-md bg-stock-ok-bg px-2 py-0.5 text-caption font-bold uppercase tracking-wide text-stock-ok">Free</span>
            </h3>
            {pickupStore ? (
              <>
                {pickupStatus && <p className="mt-1 text-base leading-relaxed text-text-secondary">
                  <span className={pickupStatus.isOpen ? "font-semibold text-stock-ok" : "font-semibold text-stock-out"}>{pickupStatus.label}</span>
                  {pickupStatus.detail && ` · ${pickupStatus.detail}`}
                </p>}
                {pickupStore.address && <p className="mt-1 text-caption leading-relaxed text-text-tertiary">{pickupStore.address}</p>}
                {distance !== null && <p className="mt-1 text-caption text-text-tertiary">{formatPickupDistance(distance)}</p>}
                {pickupSchedule && <p className="mt-1 text-caption font-semibold text-text">Pickup {formatScheduledPickup(pickupSchedule.date, pickupSchedule.time)}</p>}
              </>
            ) : (
              <p className="mt-1 text-base leading-relaxed text-text-secondary">Choose a store to collect from.</p>
            )}
          </div>
        )}

        <div className="col-span-2 flex flex-wrap gap-3 sm:col-span-1 sm:justify-end">
          {isDelivery ? (
            <button
              ref={changeButtonRef}
              type="button"
              onClick={() => {
                onSelectFulfillment("delivery");
                if (hasDeliveryLocation && options.length > 0) openDrawer();
                else onSetDeliveryLocation();
              }}
              className={ACTION_BUTTON}
              aria-label={hasDeliveryLocation ? "Change delivery option" : "Add delivery address"}
            >
              {hasDeliveryLocation ? "Change" : "Add address"}
            </button>
          ) : (
            pickupStore ? (
              <button type="button" onClick={onSchedulePickup} className={ACTION_BUTTON}>
                {pickupSchedule ? "Change time" : "Schedule pickup"}
              </button>
            ) : (
              <button type="button" onClick={onViewPickupDetails} className={ACTION_BUTTON}>
                Choose store
              </button>
            )
          )}
        </div>
      </div>
    </section>
      {isDrawerOpen &&
        ReactDOM.createPortal(
          <div className="fixed inset-0 z-[1300] flex justify-end bg-black/50" onClick={closeDrawer}>
            <div
              ref={drawerRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="rates-title"
              className="flex h-full w-full max-w-md flex-col bg-white"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between bg-belims-blue px-5 py-4 text-white">
                <div>
                  <h2 id="rates-title" className="font-heading font-condensed text-h5 font-bold uppercase">
                    Delivery options
                  </h2>
                  {place && <p className="text-caption text-white/80">{place}</p>}
                </div>
                <button
                  type="button"
                  onClick={closeDrawer}
                  className="grid h-9 w-9 place-items-center rounded-md hover:bg-white/10"
                  aria-label="Close delivery options"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto p-5" role="radiogroup" aria-labelledby="rates-title">
                {options.map((option) => {
                  const tag =
                    option.id === cheapestOptionId ? "Budget" : option.id === fastestOptionId ? "Faster" : "";
                  const checked = pendingId === option.id;
                  return (
                    <label
                      key={option.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-md border-2 p-4 ${
                        checked ? "border-belims-blue" : "border-border hover:border-border-strong"
                      }`}
                    >
                      <input
                        type="radio"
                        name="pdp-delivery-rate"
                        value={option.id}
                        checked={checked}
                        onChange={() => setPendingId(option.id)}
                        className="mt-1 h-4 w-4 accent-primary"
                      />
                      <span className="min-w-0 flex-1 text-base">
                        <strong className="flex flex-wrap items-center gap-2 text-text">
                          {option.service_name}
                          {tag && (
                            <span className="rounded-badge bg-surface-muted px-1.5 py-0.5 text-caption font-bold uppercase text-text-secondary">
                              {tag}
                            </span>
                          )}
                        </strong>
                        <span className="block text-caption text-text-tertiary">
                          {formatDeliveryEtaText(option.expected_delivery_date)}
                        </span>
                      </span>
                      <b className="text-base text-text">{formatCurrency(option.total_price)}</b>
                    </label>
                  );
                })}
                {deliveryRatesError && <p className="text-caption text-warning">{deliveryRatesError}</p>}
              </div>
              <div className="flex items-center justify-between gap-4 border-t border-border p-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsDrawerOpen(false);
                    onSetDeliveryLocation();
                  }}
                  className="text-caption font-semibold text-belims-blue underline underline-offset-4"
                >
                  Change address
                </button>
                <button
                  type="button"
                  disabled={!pendingId}
                  onClick={() => {
                    onSelectDeliveryOption(pendingId);
                    onSelectFulfillment("delivery");
                    closeDrawer();
                  }}
                  className="h-12 rounded-md bg-primary px-8 font-heading font-condensed text-button font-bold uppercase text-white transition-colors hover:bg-belims-blue disabled:opacity-50"
                >
                  Done
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};
