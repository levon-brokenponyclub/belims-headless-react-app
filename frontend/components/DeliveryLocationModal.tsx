import React, { useState, useRef, useEffect } from "react";
import { X, MapPin, Loader, Search } from "lucide-react";
import { ShippingAddress, Store } from "../types";
import { STORES } from "../constants";
import { getApiBaseUrl } from "../services/wooCommerceService";
import { BottomDrawer } from "./BottomDrawer";
import {
  buildAddressLabel,
  mapNominatimAddress,
  normalizeProvince,
  PROVINCES,
  readStoredAddress,
  saveStoredAddress,
} from "../services/shippingAddress";

interface DeliveryLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialFulfillmentType?: "delivery" | "pickup";
  currentAddress?: ShippingAddress;
  onAddressSelect: (address: ShippingAddress | null) => void;
  currentStore?: Store | null;
  onStoreSelect?: (store: Store | null) => void;
}

type StoreHours = {
  open?: string;
  close?: string;
  breakStart?: string;
  breakEnd?: string;
  closed?: boolean;
  note?: string;
};

type StoreStatus = {
  label: string;
  detail?: string;
  isOpen?: boolean;
};

type StoreWithStatus = Store & {
  hours?: Record<string, StoreHours>;
};

const dayKeys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

interface DeliveryPanelProps {
  inputRef: React.RefObject<HTMLInputElement>;
  input: string;
  loading: boolean;
  suggestions: Array<any>;
  errorMessage: string | null;
  savedDeliveryAddress: ShippingAddress | null;
  detectedLocationAddress: ShippingAddress | null;
  isEditingDeliveryAddress: boolean;
  onEditAddress: () => void;
  onInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onClearLocation: () => void;
  onDetectLocation: () => void;
  onSuggestionClick: (suggestion: any) => void;
  onSaveDetectedAddress: () => void;
  primaryButtonClass: string;
  primaryButtonLabelClass: string;
  primaryButtonOverlayClass: string;
  secondaryButtonClass: string;
  secondaryButtonLabelClass: string;
  secondaryButtonOverlayClass: string;
}

interface PickupPanelProps {
  stores: StoreWithStatus[];
  selectedPickupStoreId: string | null;
  expandedStoreId: string | null;
  onSelectStore: (storeId: string) => void;
  onToggleExpanded: (storeId: string) => void;
  onEnableDefaultStore: () => void;
  getStoreStatus: (store: StoreWithStatus) => StoreStatus;
}

const DeliveryPanel: React.FC<DeliveryPanelProps> = ({
  inputRef,
  input,
  loading,
  suggestions,
  errorMessage,
  savedDeliveryAddress,
  detectedLocationAddress,
  isEditingDeliveryAddress,
  onEditAddress,
  onInputChange,
  onClearLocation,
  onDetectLocation,
  onSuggestionClick,
  onSaveDetectedAddress,
  primaryButtonClass,
  primaryButtonLabelClass,
  primaryButtonOverlayClass,
  secondaryButtonClass,
  secondaryButtonLabelClass,
  secondaryButtonOverlayClass,
}) => (
  <section className="space-y-5">
    <div>
      <h2 className="text-lg font-bold text-gray-900 mb-2">Enter your Postal Code</h2>
      <p className="text-gray-500 mb-6 max-w-sm">
        Enter your postal code here to see stock available online for delivery to your location.
      </p>
    </div>

    <button
      type="button"
      onClick={onDetectLocation}
      className="flex w-full items-center justify-center gap-2 rounded-full border border-gray-300 py-3 text-base font-semibold text-ink hover:bg-soft transition-colors"
    >
      <MapPin size={16} /> Use your location.
    </button>

    <hr className="border-subtle" />

    {isEditingDeliveryAddress ? (
      <div className="space-y-4">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            ref={inputRef}
            type="text"
            placeholder="Enter Postal Code"
            value={input}
            onChange={onInputChange}
            className="w-full border border-subtle py-3 pl-10 pr-10 text-base text-ink placeholder:text-muted focus:border-belims-blue focus:outline-none focus:ring-1 focus:ring-belims-blue"
          />
          {input && (
            <button
              type="button"
              onClick={onClearLocation}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted">
            <Loader size={14} className="animate-spin" />
            Finding address suggestions...
          </div>
        )}

        {suggestions.length > 0 && (
          <div className="divide-y border border-subtle overflow-hidden">
            {suggestions.map((suggestion, index) => (
              <button
                key={`${suggestion.source || "google"}-${suggestion.place_id || index}`}
                type="button"
                onClick={() => onSuggestionClick(suggestion)}
                className="w-full px-4 py-3 text-left text-sm hover:bg-soft transition-colors"
              >
                {suggestion.mainText ? (
                  <div className="flex flex-col">
                    <span className="text-sm text-ink">{suggestion.mainText}</span>
                    {suggestion.secondaryText && (
                      <span className="text-xs text-muted">{suggestion.secondaryText}</span>
                    )}
                  </div>
                ) : (
                  suggestion.description
                )}
              </button>
            ))}
          </div>
        )}

        {detectedLocationAddress && (
          <div className="space-y-3 border border-subtle px-4 py-4">
            <p className="text-sm font-semibold text-ink">
              {detectedLocationAddress.label ||
                [detectedLocationAddress.street, detectedLocationAddress.city, detectedLocationAddress.province]
                  .filter(Boolean)
                  .join(", ")}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={onSaveDetectedAddress}
                className={primaryButtonClass}
              >
                <span className={primaryButtonOverlayClass} />
                <span className={primaryButtonLabelClass}>Save</span>
              </button>
              <button
                type="button"
                onClick={() => onEditAddress()}
                className={secondaryButtonClass}
              >
                <span className={secondaryButtonOverlayClass} />
                <span className={secondaryButtonLabelClass}>Edit address</span>
              </button>
            </div>
          </div>
        )}

        {savedDeliveryAddress && !detectedLocationAddress && (
          <div className="flex items-center justify-between gap-3 border border-subtle px-4 py-4">
            <p className="text-sm text-ink">
              {savedDeliveryAddress.label ||
                [savedDeliveryAddress.street, savedDeliveryAddress.city, savedDeliveryAddress.province]
                  .filter(Boolean)
                  .join(", ")}
            </p>
            <button
              type="button"
              onClick={onEditAddress}
              className={primaryButtonClass}
            >
              <span className={primaryButtonOverlayClass} />
              <span className={primaryButtonLabelClass}>Edit Address</span>
            </button>
          </div>
        )}

        {errorMessage && (
          <div className="border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {errorMessage}
          </div>
        )}
      </div>
    ) : (
      <div className="flex items-center justify-between gap-3 border border-subtle px-4 py-4">
        <p className="text-sm text-ink">
          {savedDeliveryAddress?.label ||
            [savedDeliveryAddress?.street, savedDeliveryAddress?.city, savedDeliveryAddress?.province]
              .filter(Boolean)
              .join(", ") ||
            "Saved for this device"}
        </p>
        <button
          type="button"
          onClick={onEditAddress}
          className="text-sm font-semibold text-grey underline"
        >
          Edit
        </button>
      </div>
    )}
  </section>
);

const PickupPanel: React.FC<PickupPanelProps> = ({
  stores,
  selectedPickupStoreId,
  expandedStoreId,
  onSelectStore,
  onToggleExpanded,
  onEnableDefaultStore,
  getStoreStatus,
}) => (
  <section className="space-y-5">
    <div>
      <h2 className="text-lg font-bold text-gray-900 mb-2">Select a Store</h2>
      <p className="text-gray-500 mb-6 max-w-sm">
        By selecting a store below, you make it easier for us to accurately display stock of your desired items.
      </p>
    </div>

    <button
      type="button"
      onClick={onEnableDefaultStore}
      className="flex w-full items-center justify-center gap-2 rounded-full border border-gray-300 py-3 text-base font-semibold text-ink hover:bg-soft transition-colors"
    >
      <MapPin size={16} /> Use your location.
    </button>

    <hr className="border-subtle" />

    <div className="space-y-3">
      {stores.map((store) => {
        const isSelected = store.id === selectedPickupStoreId;
        const status = getStoreStatus(store);
        const statusTone = status.isOpen
          ? "text-green-600"
          : status.isOpen === false
            ? "text-red-600"
            : "text-muted";
        const isExpanded = expandedStoreId === store.id;

        return (
          <div
            key={store.id}
            className={`rounded-xl px-4 py-4 transition-all ${
              isSelected
                ? "border-2 border-belims-blue bg-belims-blue/[0.04] shadow-sm"
                : "border border-gray-200 bg-white"
            }`}
          >
            <button
              type="button"
              onClick={() => onSelectStore(store.id)}
              className="w-full text-left"
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                  isSelected ? "border-belims-blue bg-belims-blue" : "border-gray-300 bg-white"
                }`}>
                  {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <span className={`font-bold font-heading ${isSelected ? "text-belims-blue" : "text-gray-900"}`}>
                      {store.name}
                    </span>
                    {store.distance !== undefined && (
                      <span className="text-xs font-semibold text-gray-400 flex-shrink-0 mt-0.5">
                        {store.distance} km
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 mt-0.5">{store.address}</div>
                  <div className="mt-1 flex items-center gap-1 text-sm">
                    <span className={`${statusTone} font-semibold`}>{status.label}</span>
                    {status.detail && (
                      <span className="text-gray-400">· {status.detail}</span>
                    )}
                  </div>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onToggleExpanded(store.id); }}
              className="mt-3 ml-8 text-sm font-semibold text-belims-blue hover:underline"
            >
              {isExpanded ? "Hide Hours" : "View Hours"}
            </button>

            {isExpanded && (
              <div className="mt-2 ml-8 space-y-0.5 text-sm text-gray-500 border-t border-gray-100 pt-2">
                {dayKeys.map((dayKey, index) => {
                  const hours = store.hours?.[dayKey];
                  const hoursValue =
                    !hours || hours.closed
                      ? "Closed"
                      : hours.open && hours.close
                        ? `${hours.open} – ${hours.close}`
                        : "Hours unavailable";
                  return (
                    <div key={dayKey} className="flex justify-between gap-3">
                      <span>{dayLabels[index]}</span>
                      <span>{hoursValue}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>

  </section>
);

export const DeliveryLocationModal: React.FC<DeliveryLocationModalProps> = ({
  isOpen,
  onClose,
  initialFulfillmentType,
  currentAddress,
  onAddressSelect,
  currentStore,
  onStoreSelect,
}) => {
  const emitDeliveryAddressUpdated = () => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new Event("belims:delivery-address-updated"));
    window.dispatchEvent(new Event("belims:fulfillment-changed"));
  };
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [legacyLabel, setLegacyLabel] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasAutoLocatedRef = useRef(false);

  const [fulfillmentType, setFulfillmentType] = useState<"delivery" | "pickup">(
    "delivery",
  );
  const [storeSearch, setStoreSearch] = useState("");
  const [storeList, setStoreList] = useState<StoreWithStatus[]>(STORES);
  const [remoteStores, setRemoteStores] = useState<StoreWithStatus[] | null>(
    null,
  );
  const [selectedPickupStoreId, setSelectedPickupStoreId] = useState<
    string | null
  >(null);
  const [expandedStoreId, setExpandedStoreId] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [detectedLocationAddress, setDetectedLocationAddress] =
    useState<ShippingAddress | null>(null);
  const [savedDeliveryAddress, setSavedDeliveryAddress] =
    useState<ShippingAddress | null>(null);
  const [isEditingDeliveryAddress, setIsEditingDeliveryAddress] =
    useState(true);

  const isUmzintoStore = (store: StoreWithStatus) =>
    store.id?.toLowerCase() === "umzinto" ||
    store.name?.toLowerCase().includes("umzinto");

  const getPickupStores = (stores: StoreWithStatus[]) => {
    const umzintoStores = stores.filter(isUmzintoStore);
    return umzintoStores.length > 0 ? umzintoStores : STORES;
  };

  const getDefaultStore = (stores: StoreWithStatus[]) =>
    stores.find((store) => store.name?.toLowerCase().includes("umzinto")) ||
    stores[0] ||
    null;

  const findProvinceInText = (value?: string | null) => {
    if (!value) return "";
    const direct = normalizeProvince(value);
    if (direct) return direct;

    const lower = value.toLowerCase();
    const matched = PROVINCES.find((candidate) =>
      lower.includes(candidate.toLowerCase()),
    );
    return matched || "";
  };

  const fetchNominatimSuggestions = async (query: string) => {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&countrycodes=za&addressdetails=1&limit=6&q=${encodeURIComponent(query)}`,
      {
        headers: {
          "User-Agent": "Belims-Store",
        },
      },
    );

    if (!response.ok) return [];

    const data = await response.json();
    if (!Array.isArray(data)) return [];

    return data.map((entry: any) => {
      const displayName = String(entry.display_name || "");
      const parts = displayName
        .split(",")
        .map((part: string) => part.trim())
        .filter(Boolean);

      return {
        source: "nominatim",
        place_id: entry.place_id,
        lat: entry.lat,
        lon: entry.lon,
        description: displayName,
        mainText: parts[0] || displayName,
        secondaryText: parts.slice(1).join(", "),
      };
    });
  };

  const mapGoogleGeocodeResult = (result: any): ShippingAddress | null => {
    const components = result.address_components || [];
    const findComponent = (type: string) =>
      components.find((component: any) => component.types.includes(type));

    const streetNumber = findComponent("street_number")?.long_name || "";
    const route = findComponent("route")?.long_name || "";
    const city =
      findComponent("locality")?.long_name ||
      findComponent("sublocality")?.long_name ||
      findComponent("administrative_area_level_2")?.long_name ||
      "";
    const province =
      findComponent("administrative_area_level_1")?.long_name || "";
    const postalCode = findComponent("postal_code")?.long_name || "";

    const street = [streetNumber, route].filter(Boolean).join(" ").trim();
    const normalizedProvince = normalizeProvince(province);

    if (!city || !normalizedProvince) return null;

    const address: ShippingAddress = {
      street,
      city,
      province: normalizedProvince,
      postalCode,
      country: "ZA",
    };

    return {
      ...address,
      label: buildAddressLabel(address),
    };
  };

  const resolveAddressFromCoordinates = async (
    lat: number,
    lon: number,
  ): Promise<ShippingAddress | null> => {
    const win = window as any;
    if (win.google?.maps?.Geocoder) {
      const geocoder = new win.google.maps.Geocoder();
      const result = await new Promise<ShippingAddress | null>((resolve) => {
        geocoder.geocode(
          { location: { lat, lng: lon } },
          (results: any[] | null, status: string) => {
            if (status === "OK" && results && results.length > 0) {
              resolve(mapGoogleGeocodeResult(results[0]));
              return;
            }
            resolve(null);
          },
        );
      });
      if (result) return result;
    }

    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
      {
        headers: {
          "User-Agent": "Belims-Store",
        },
      },
    );

    if (!response.ok) return null;
    const data = await response.json();
    const mapped = mapNominatimAddress(data);
    if (!mapped || !mapped.city || !mapped.province) return null;

    return {
      ...mapped,
      province: normalizeProvince(mapped.province),
      country: "ZA",
      label: mapped.label || buildAddressLabel(mapped),
    };
  };

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
    hours: Record<string, StoreHours>,
    startIndex: number,
  ) => {
    for (let offset = 1; offset <= 7; offset += 1) {
      const index = (startIndex + offset) % 7;
      const dayKey = dayKeys[index];
      const dayHours = hours[dayKey];
      if (!dayHours || dayHours.closed) continue;
      if (!dayHours.open || !dayHours.close) continue;
      return { index, dayKey, dayHours };
    }
    return null;
  };

  const getStoreStatus = (store: StoreWithStatus): StoreStatus => {
    if (!store.hours) {
      return { label: "Hours unavailable" };
    }

    const now = new Date();
    const dayKey = dayKeys[now.getDay()];
    const dayHours = store.hours[dayKey];

    if (!dayHours || dayHours.closed) {
      const nextOpen = getNextOpenDay(store.hours, now.getDay());
      if (nextOpen) {
        const isTomorrow = nextOpen.index === (now.getDay() + 1) % 7;
        const nextLabel = isTomorrow
          ? "Opens tomorrow"
          : `Opens ${dayLabels[nextOpen.index]}`;
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
        detail: `Opens ${formatTimeLabel(dayHours.open)}`,
        isOpen: false,
      };
    }

    if (nowMinutes >= closeMinutes) {
      const nextOpen = getNextOpenDay(store.hours, now.getDay());
      if (nextOpen) {
        const isTomorrow = nextOpen.index === (now.getDay() + 1) % 7;
        const nextLabel = isTomorrow
          ? "Opens tomorrow"
          : `Opens ${dayLabels[nextOpen.index]}`;
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
        detail: `closing soon · until ${formatTimeLabel(dayHours.close)}`,
        isOpen: true,
      };
    }

    return {
      label: "Open",
      detail: `until ${formatTimeLabel(dayHours.close)}`,
      isOpen: true,
    };
  };

  useEffect(() => {
    if (isOpen) {
      const nextStores =
        remoteStores && remoteStores.length > 0 ? remoteStores : STORES;
      const pickupStores = getPickupStores(nextStores);
      const storedFulfillment = localStorage.getItem("fulfillmentType");
      const storedPickupRaw = localStorage.getItem("selectedPickupStore");
      const storedDistanceRaw = localStorage.getItem(
        "selectedPickupStoreDistance",
      );
      let storedPickupId: string | null = null;
      let storedPickupDistance: { id?: string; distance?: number } | null =
        null;

      if (storedPickupRaw) {
        try {
          const parsed = JSON.parse(storedPickupRaw) as { id?: string };
          storedPickupId = parsed?.id || null;
        } catch {
          storedPickupId = null;
        }
      }

      if (storedDistanceRaw) {
        try {
          storedPickupDistance = JSON.parse(storedDistanceRaw) as {
            id?: string;
            distance?: number;
          };
        } catch {
          storedPickupDistance = null;
        }
      }

      const enrichedStores = pickupStores.map((store) => {
        if (
          storedPickupDistance?.id === store.id &&
          typeof storedPickupDistance.distance === "number"
        ) {
          return { ...store, distance: storedPickupDistance.distance };
        }
        return store;
      });
      const { address: storedAddress, legacyLabel: storedLegacy } =
        readStoredAddress();
      const initialAddress = currentAddress || storedAddress;
      const currentLabel = initialAddress
        ? initialAddress.label ||
          buildAddressLabel(initialAddress) ||
          initialAddress.postalCode
        : storedLegacy || "";

      if (initialFulfillmentType) {
        setFulfillmentType(initialFulfillmentType);
      } else if (
        storedFulfillment === "pickup" ||
        storedFulfillment === "delivery"
      ) {
        setFulfillmentType(storedFulfillment);
      } else {
        setFulfillmentType("delivery");
      }

      setLegacyLabel(storedLegacy);
      setInput(currentLabel);
      setSuggestions([]);
      setErrorMessage(null);
      setDetectedLocationAddress(null);
      setSavedDeliveryAddress(initialAddress || null);
      setIsEditingDeliveryAddress(!initialAddress);
      setStoreSearch("");
      setStoreList(enrichedStores);
      if (storedFulfillment === "pickup") {
        const fallbackId = enrichedStores[0]?.id || null;
        const nextPickupStoreId = currentStore?.id || storedPickupId || fallbackId;
        setSelectedPickupStoreId(nextPickupStoreId);
        setExpandedStoreId(null);
      } else {
        const nextPickupStoreId = currentStore?.id || storedPickupId || null;
        setSelectedPickupStoreId(nextPickupStoreId);
        setExpandedStoreId(null);
      }
    }
  }, [
    currentAddress,
    currentStore,
    initialFulfillmentType,
    isOpen,
    remoteStores,
  ]);

  useEffect(() => {
    const apiBase = getApiBaseUrl();
    fetch(`${apiBase}/ecommerce-policies`)
      .then((res) => res.json())
      .then((data) => {
        const rawStores = Array.isArray(data?.store_locations)
          ? data.store_locations
          : [];
        const normalized = rawStores
          .map((store: any, index: number) => {
            const name = String(store?.name || "").trim();
            const address = String(store?.address || "")
              .replace(/\s*\n\s*/g, ", ")
              .trim();
            if (!name && !address) return null;
            const latitudeValue = Number(store?.latitude);
            const longitudeValue = Number(store?.longitude);
            const hours: Record<string, StoreHours> = {
              mon: {
                open: store?.mon_open,
                close: store?.mon_close,
                breakStart: store?.mon_break_start,
                breakEnd: store?.mon_break_end,
                closed: Boolean(store?.mon_closed),
                note: store?.mon_note,
              },
              tue: {
                open: store?.tue_open,
                close: store?.tue_close,
                breakStart: store?.tue_break_start,
                breakEnd: store?.tue_break_end,
                closed: Boolean(store?.tue_closed),
                note: store?.tue_note,
              },
              wed: {
                open: store?.wed_open,
                close: store?.wed_close,
                breakStart: store?.wed_break_start,
                breakEnd: store?.wed_break_end,
                closed: Boolean(store?.wed_closed),
                note: store?.wed_note,
              },
              thu: {
                open: store?.thu_open,
                close: store?.thu_close,
                breakStart: store?.thu_break_start,
                breakEnd: store?.thu_break_end,
                closed: Boolean(store?.thu_closed),
                note: store?.thu_note,
              },
              fri: {
                open: store?.fri_open,
                close: store?.fri_close,
                breakStart: store?.fri_break_start,
                breakEnd: store?.fri_break_end,
                closed: Boolean(store?.fri_closed),
                note: store?.fri_note,
              },
              sat: {
                open: store?.sat_open,
                close: store?.sat_close,
                breakStart: store?.sat_break_start,
                breakEnd: store?.sat_break_end,
                closed: Boolean(store?.sat_closed),
                note: store?.sat_note,
              },
              sun: {
                open: store?.sun_open,
                close: store?.sun_close,
                breakStart: store?.sun_break_start,
                breakEnd: store?.sun_break_end,
                closed: Boolean(store?.sun_closed),
                note: store?.sun_note,
              },
            };
            return {
              id: String(store?.id || name || index + 1),
              name: name || `Store ${index + 1}`,
              address: address || "",
              phone: store?.phone ? String(store.phone) : undefined,
              latitude: Number.isNaN(latitudeValue) ? undefined : latitudeValue,
              longitude: Number.isNaN(longitudeValue)
                ? undefined
                : longitudeValue,
              hours,
            } as StoreWithStatus;
          })
          .filter(Boolean) as StoreWithStatus[];

        if (normalized.length > 0) {
          setRemoteStores(normalized);
          setStoreList(getPickupStores(normalized));
        }
      })
      .catch((err) => console.error("Failed to load stores:", err));
  }, []);

  // Google Places Autocomplete Script Loading
  useEffect(() => {
    const win = window as any;
    if (!win.google?.maps?.places) {
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      if (apiKey) {
        const script = document.createElement("script");
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setDetectedLocationAddress(null);
      hasAutoLocatedRef.current = false;
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || fulfillmentType !== "pickup") return;
    if (hasAutoLocatedRef.current) return;
    hasAutoLocatedRef.current = true;
    handleLocateStores();
  }, [fulfillmentType, isOpen]);

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);
    setErrorMessage(null);
    setDetectedLocationAddress(null);

    if (value.length < 2) {
      setSuggestions([]);
      return;
    }

    setLoading(true);

    try {
      const win = window as any;
      if (!win.google?.maps?.places) {
        const fallbackSuggestions = await fetchNominatimSuggestions(value);
        setSuggestions(fallbackSuggestions);
        return;
      }

      const service = new win.google.maps.places.AutocompleteService();
      const request: any = {
        input: value,
        componentRestrictions: { country: "za" },
        types: ["address"],
      };

      const predictions = await new Promise<any[]>((resolve) => {
        service.getPlacePredictions(request, (results: any, status: any) => {
          if (
            status === win.google!.maps.places.PlacesServiceStatus.OK &&
            results
          ) {
            resolve(results);
          } else {
            resolve([]);
          }
        });
      });

      if (predictions.length > 0) {
        setSuggestions(
          predictions.map((prediction) => ({
            source: "google",
            place_id: prediction.place_id,
            description: prediction.description,
            mainText: prediction.structured_formatting?.main_text,
            secondaryText: prediction.structured_formatting?.secondary_text,
          })),
        );
        return;
      }

      const fallbackSuggestions = await fetchNominatimSuggestions(value);
      setSuggestions(fallbackSuggestions);
    } catch (error) {
      console.error("Autocomplete error:", error);
      try {
        const fallbackSuggestions = await fetchNominatimSuggestions(value);
        setSuggestions(fallbackSuggestions);
      } catch {
        setErrorMessage("Unable to load address suggestions.");
      }
    } finally {
      setLoading(false);
    }
  };

  const buildAddressFromPlace = (place: any): ShippingAddress | null => {
    const components = place.address_components || [];
    const getComponent = (type: string) =>
      components.find((component: any) => component.types.includes(type))
        ?.long_name;

    const formattedAddress =
      typeof place.formatted_address === "string"
        ? place.formatted_address
        : "";
    const formattedParts = formattedAddress
      .split(",")
      .map((part: string) => part.trim())
      .filter(Boolean);

    const findProvinceInText = (parts: string[]) => {
      for (const part of parts) {
        const normalized = normalizeProvince(part);
        if (normalized) return normalized;
      }
      return "";
    };

    const streetNumber = getComponent("street_number");
    const route = getComponent("route");
    const suburb =
      getComponent("sublocality") ||
      getComponent("sublocality_level_1") ||
      getComponent("neighborhood");
    let city =
      getComponent("locality") ||
      getComponent("administrative_area_level_2") ||
      getComponent("postal_town") ||
      getComponent("administrative_area_level_3") ||
      getComponent("sublocality") ||
      getComponent("sublocality_level_1");

    let province = normalizeProvince(
      getComponent("administrative_area_level_1"),
    );

    if (!province) {
      province = findProvinceInText(formattedParts);
    }

    if (!city && formattedParts.length > 0) {
      const provinceIndex = formattedParts.findIndex(
        (part: string) => normalizeProvince(part).length > 0,
      );
      if (provinceIndex > 0) {
        city = formattedParts[provinceIndex - 1];
      }
    }

    const postalCode = getComponent("postal_code") || "";

    const street = streetNumber
      ? [streetNumber, route, suburb].filter(Boolean).join(" ")
      : formattedParts[0] || [route, suburb].filter(Boolean).join(" ");

    if (!city || !province) {
      return null;
    }

    const address: ShippingAddress = {
      street,
      city,
      province,
      postalCode,
      country: "ZA",
    };

    return {
      ...address,
      label: buildAddressLabel(address) || place.formatted_address || "",
    };
  };

  const handleSuggestionClick = async (suggestion: any) => {
    setLoading(true);
    setErrorMessage(null);
    setInput(suggestion.description || "");
    setSuggestions([]);

    try {
      if (
        suggestion.source === "nominatim" &&
        suggestion.lat &&
        suggestion.lon
      ) {
        const address = await resolveAddressFromCoordinates(
          Number(suggestion.lat),
          Number(suggestion.lon),
        );

        if (!address) {
          setErrorMessage(
            "Please select an address with a valid city and province.",
          );
          return;
        }

        handleAddressSaved(address);
        return;
      }

      const win = window as any;
      if (!win.google?.maps?.places) {
        setErrorMessage("Address service is unavailable. Please try again.");
        return;
      }

      const details = await new Promise<any>((resolve, reject) => {
        const service = new win.google!.maps.places.PlacesService(
          document.createElement("div"),
        );
        service.getDetails(
          {
            placeId: suggestion.place_id,
            fields: ["address_components", "formatted_address", "geometry"],
          },
          (place: any, status: any) => {
            if (
              status === win.google!.maps.places.PlacesServiceStatus.OK &&
              place
            ) {
              resolve(place);
            } else {
              reject(status);
            }
          },
        );
      });

      const address = buildAddressFromPlace(details);

      let resolvedAddress = address;
      if (!resolvedAddress && details?.geometry?.location) {
        const latValue =
          typeof details.geometry.location.lat === "function"
            ? details.geometry.location.lat()
            : details.geometry.location.lat;
        const lonValue =
          typeof details.geometry.location.lng === "function"
            ? details.geometry.location.lng()
            : details.geometry.location.lng;

        if (typeof latValue === "number" && typeof lonValue === "number") {
          resolvedAddress = await resolveAddressFromCoordinates(
            latValue,
            lonValue,
          );
        }
      }

      if (!resolvedAddress) {
        setErrorMessage(
          "Please select an address with a valid city and province.",
        );
        return;
      }

      handleAddressSaved(resolvedAddress);
    } catch (error) {
      console.error("Place details error:", error);
      setErrorMessage("Unable to read address details. Try another address.");
    } finally {
      setLoading(false);
    }
  };

  const handleDetectLocation = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      if (!navigator.geolocation) {
        setErrorMessage("Geolocation is not supported by your browser.");
        setLoading(false);
        return;
      }
      const requestPosition = (
        options: PositionOptions,
        watchTimeoutMs?: number,
      ) =>
        new Promise<GeolocationPosition>((resolve, reject) => {
          let watchId: number | null = null;
          let timer: number | null = null;

          const cleanup = () => {
            if (watchId !== null) navigator.geolocation.clearWatch(watchId);
            if (timer !== null) window.clearTimeout(timer);
          };

          const onSuccess = (position: GeolocationPosition) => {
            cleanup();
            resolve(position);
          };

          const onError = (error: GeolocationPositionError) => {
            cleanup();
            reject(error);
          };

          if (watchTimeoutMs && watchTimeoutMs > 0) {
            watchId = navigator.geolocation.watchPosition(
              onSuccess,
              onError,
              options,
            );
            timer = window.setTimeout(() => {
              cleanup();
              reject({
                code: 3,
                message: "Timed out",
              } as GeolocationPositionError);
            }, watchTimeoutMs);
            return;
          }

          navigator.geolocation.getCurrentPosition(onSuccess, onError, options);
        });

      const resolvePosition = async (position: GeolocationPosition) => {
        try {
          const { latitude, longitude } = position.coords;

          // Create a timeout for the fetch request
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

          try {
            // Use reverse geocoding to get address
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
              {
                headers: {
                  "User-Agent": "Belims-Store",
                },
                signal: controller.signal,
              },
            );

            clearTimeout(timeoutId);

            if (response.ok) {
              const data = await response.json();
              const mapped = mapNominatimAddress(data);

              const provinceFallback =
                findProvinceInText(mapped?.province) ||
                findProvinceInText(data?.address?.state) ||
                findProvinceInText(data?.address?.province) ||
                findProvinceInText(data?.address?.region) ||
                findProvinceInText(data?.address?.county) ||
                findProvinceInText(data?.address?.state_district) ||
                findProvinceInText(data?.display_name);

              const cityFallback =
                mapped?.city ||
                data?.address?.city ||
                data?.address?.town ||
                data?.address?.village ||
                data?.address?.municipality ||
                data?.address?.suburb ||
                "";

              if (!mapped || !cityFallback || !provinceFallback) {
                // Partial address detected - populate search input for quick refinement
                if (mapped) {
                  const fallbackLabel =
                    mapped.label ||
                    [mapped.street, mapped.city].filter(Boolean).join(", ") ||
                    "";
                  if (fallbackLabel) {
                    setInput(fallbackLabel);
                  }
                }
                setErrorMessage(
                  "Unable to detect a full address. Please search and select your address above.",
                );
                setLoading(false);
                return;
              }

              const normalizedProvince = normalizeProvince(provinceFallback);
              if (
                !normalizedProvince ||
                !PROVINCES.includes(
                  normalizedProvince as (typeof PROVINCES)[number],
                )
              ) {
                const fallbackLabel =
                  mapped.label ||
                  [mapped.street, mapped.city].filter(Boolean).join(", ") ||
                  "";
                if (fallbackLabel) {
                  setInput(fallbackLabel);
                }
                setErrorMessage(
                  "Detected address needs a valid province. Please search and select your address above.",
                );
                setLoading(false);
                return;
              }

              const address: ShippingAddress = {
                ...mapped,
                city: cityFallback,
                province: normalizedProvince,
                country: "ZA",
                label: mapped.label || buildAddressLabel(mapped),
              };

              setInput(address.label || buildAddressLabel(address));
              setSuggestions([]);
              localStorage.setItem("fulfillmentType", "delivery");
              setLoading(false);
              setDetectedLocationAddress(address);
            } else {
              throw new Error(`API returned ${response.status}`);
            }
          } catch (fetchError: any) {
            clearTimeout(timeoutId);
            console.error("Reverse geocoding error:", fetchError);
            setErrorMessage(
              "Unable to detect your address. Please search and select it above.",
            );
            setLoading(false);
          }
        } catch (error) {
          console.error("Position callback error:", error);
          setErrorMessage(
            "An error occurred. Please search your address above.",
          );
          setLoading(false);
        }
      };

      try {
        const position = await requestPosition({
          enableHighAccuracy: false,
          timeout: 12000,
          maximumAge: 300000,
        });
        await resolvePosition(position);
      } catch (error: any) {
        const canRetry =
          error?.code === error?.POSITION_UNAVAILABLE ||
          error?.code === error?.TIMEOUT;

        if (canRetry) {
          try {
            const position = await requestPosition({
              enableHighAccuracy: true,
              timeout: 20000,
              maximumAge: 0,
            });
            await resolvePosition(position);
            return;
          } catch (retryError: any) {
            error = retryError;
          }

          try {
            const position = await requestPosition(
              {
                enableHighAccuracy: false,
                maximumAge: 300000,
              },
              12000,
            );
            await resolvePosition(position);
            return;
          } catch (watchError: any) {
            error = watchError;
          }
        }

        console.error("Geolocation error:", error);
        const ipFallback = async () => {
          try {
            const response = await fetch("https://ipapi.co/json/");
            if (!response.ok) return null;
            const data = await response.json();
            const lat = Number(data?.latitude);
            const lon = Number(data?.longitude);
            const city = String(data?.city || "").trim();
            const region = String(
              data?.region || data?.region_code || "",
            ).trim();

            if (Number.isFinite(lat) && Number.isFinite(lon)) {
              try {
                const resolved = await resolveAddressFromCoordinates(lat, lon);
                if (resolved?.city && resolved?.province) {
                  return resolved;
                }
              } catch (resolveError) {
                console.error("IP reverse geocode error:", resolveError);
              }
            }

            if (city || region) {
              const label = [city, region].filter(Boolean).join(", ");
              return {
                street: "",
                city: city || "",
                province: normalizeProvince(region) || region,
                postalCode: "",
                country: "ZA",
                label,
              } as ShippingAddress;
            }
          } catch (fallbackError) {
            console.error("IP fallback error:", fallbackError);
          }
          return null;
        };

        const fallbackAddress = await ipFallback();
        if (fallbackAddress) {
          setInput(fallbackAddress.label || "");
          setDetectedLocationAddress(fallbackAddress);
          setLoading(false);
          setErrorMessage(
            "We could not access a precise location. Please confirm or refine your address above.",
          );
          return;
        }

        let errorMessage = "Unable to detect your location. ";
        if (error?.code === error?.PERMISSION_DENIED) {
          errorMessage +=
            "Please enable location permission in your browser settings.";
        } else if (error?.code === error?.POSITION_UNAVAILABLE) {
          errorMessage += "Your location could not be determined.";
        } else if (error?.code === error?.TIMEOUT) {
          errorMessage += "Location request timed out.";
        }
        setErrorMessage(errorMessage + " Please search your address above.");
        setLoading(false);
      }
    } catch (error) {
      console.error("Detect location error:", error);
      setErrorMessage("An error occurred. Please try again.");
      setLoading(false);
    }
  };

  const handleClearLocation = () => {
    console.log("[delivery-location-modal] clear location requested", {
      previousInput: input,
      savedDeliveryAddress,
      detectedLocationAddress,
    });
    setInput("");
    setSuggestions([]);
    setErrorMessage(null);
    setDetectedLocationAddress(null);
    setSavedDeliveryAddress(null);
    setIsEditingDeliveryAddress(true);
    saveStoredAddress(null);
    onAddressSelect(null);
    emitDeliveryAddressUpdated();
  };

  const handleAddressSaved = (address: ShippingAddress) => {
    console.log("[delivery-location-modal] full address save requested", {
      address,
    });
    localStorage.setItem("fulfillmentType", "delivery");
    saveStoredAddress(address);
    onAddressSelect(address);
    setSavedDeliveryAddress(address);
    setDetectedLocationAddress(null);
    setInput(address.label || buildAddressLabel(address));
    setIsEditingDeliveryAddress(false);
    emitDeliveryAddressUpdated();
  };

  const handleSaveDetectedAddress = () => {
    if (!detectedLocationAddress) return;
    handleAddressSaved(detectedLocationAddress);
    onClose();
  };

  const formatDetectedLocationLine = (address: ShippingAddress) => {
    const parts = [
      address.street || address.city,
      address.city,
      address.postalCode,
      "South Africa",
    ].filter(Boolean);
    return parts.join(", ");
  };

  const handlePickupSave = () => {
    setErrorMessage(null);
    const selectedStore = storeList.find(
      (store) => store.id === selectedPickupStoreId,
    );

    if (!selectedStore) {
      setErrorMessage("Please select a pickup store.");
      return;
    }

    if (typeof selectedStore.distance === "number") {
      localStorage.setItem(
        "selectedPickupStoreDistance",
        JSON.stringify({
          id: selectedStore.id,
          distance: selectedStore.distance,
        }),
      );
    } else {
      localStorage.removeItem("selectedPickupStoreDistance");
    }
    localStorage.setItem("selectedPickupStore", JSON.stringify(selectedStore));
    localStorage.setItem("pickupStoreSelected", "true");
    onStoreSelect?.(selectedStore);
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("belims:pickup-store-updated", {
          detail: selectedStore,
        }),
      );
    }
    localStorage.setItem("fulfillmentType", "pickup");
    onClose();
  };

  const handleResetPickupStore = () => {
    localStorage.removeItem("selectedPickupStore");
    localStorage.removeItem("selectedPickupStoreDistance");
    localStorage.removeItem("pickupStoreSelected");
    localStorage.setItem("devSkipDefaultStore", "true");
    setSelectedPickupStoreId(null);
    setExpandedStoreId(null);
    onStoreSelect?.(null);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("belims:reset-pickup-store"));
    }
  };

  const handleEnableDefaultStore = () => {
    localStorage.removeItem("devSkipDefaultStore");
    const defaultStore = getDefaultStore(storeList) || getDefaultStore(STORES);
    if (!defaultStore) return;
    setSelectedPickupStoreId(defaultStore.id);
    localStorage.setItem("selectedPickupStore", JSON.stringify(defaultStore));
    localStorage.setItem("pickupStoreSelected", "true");
    localStorage.setItem("fulfillmentType", "pickup");
    onStoreSelect?.(defaultStore);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("belims:enable-default-store"));
      window.dispatchEvent(
        new CustomEvent("belims:pickup-store-updated", {
          detail: defaultStore,
        }),
      );
    }
  };

  const handleLocateStores = () => {
    setErrorMessage(null);
    if (!navigator.geolocation) {
      setErrorMessage("Geolocation is not supported by your browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        setUserLocation({ latitude, longitude });
        const withDistances = storeList.map((store) => {
          if (
            typeof store.latitude !== "number" ||
            typeof store.longitude !== "number"
          ) {
            return store;
          }

          const distance = getDistanceKm(
            latitude,
            longitude,
            store.latitude,
            store.longitude,
          );
          return { ...store, distance };
        });
        const sorted = [...withDistances].sort(
          (a, b) => (a.distance || 0) - (b.distance || 0),
        );
        setStoreList(sorted);

        const fallbackId =
          selectedPickupStoreId ||
          (() => {
            try {
              const raw = localStorage.getItem("selectedPickupStore");
              if (!raw) return null;
              const parsed = JSON.parse(raw) as { id?: string };
              return parsed?.id || null;
            } catch {
              return null;
            }
          })();
        const matchedStore = fallbackId
          ? sorted.find((store) => store.id === fallbackId)
          : null;

        if (matchedStore && typeof matchedStore.distance === "number") {
          localStorage.setItem(
            "selectedPickupStoreDistance",
            JSON.stringify({
              id: matchedStore.id,
              distance: matchedStore.distance,
            }),
          );
          localStorage.setItem(
            "selectedPickupStore",
            JSON.stringify(matchedStore),
          );
        }
      },
      () => {
        setErrorMessage("Unable to detect your location.");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  };

  const getDistanceKm = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ) => {
    const toRadians = (value: number) => (value * Math.PI) / 180;
    const earthRadiusKm = 6371;
    const deltaLat = toRadians(lat2 - lat1);
    const deltaLon = toRadians(lon2 - lon1);
    const a =
      Math.sin(deltaLat / 2) ** 2 +
      Math.cos(toRadians(lat1)) *
        Math.cos(toRadians(lat2)) *
        Math.sin(deltaLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(earthRadiusKm * c * 10) / 10;
  };

  const applyDistances = (
    stores: StoreWithStatus[],
    location: { latitude: number; longitude: number },
  ) => {
    let changed = false;
    const updated = stores.map((store) => {
      if (
        typeof store.latitude !== "number" ||
        typeof store.longitude !== "number"
      ) {
        return store;
      }

      const distance = getDistanceKm(
        location.latitude,
        location.longitude,
        store.latitude,
        store.longitude,
      );

      if (store.distance !== distance) {
        changed = true;
        return { ...store, distance };
      }

      return store;
    });

    return changed ? updated : stores;
  };

  const formatHoursLine = (dayLabel: string, hours?: StoreHours) => {
    if (!hours || hours.closed) {
      return `${dayLabel}: Closed`;
    }
    if (!hours.open || !hours.close) {
      return `${dayLabel}: Hours unavailable`;
    }
    return `${dayLabel}: ${hours.open} - ${hours.close}`;
  };

  const filteredStores = storeList.filter((store) => {
    if (!storeSearch.trim()) return true;
    const query = storeSearch.toLowerCase();
    return (
      (store.name || "").toLowerCase().includes(query) ||
      (store.address || "").toLowerCase().includes(query)
    );
  });

  useEffect(() => {
    if (!userLocation) return;
    setStoreList((prev) => applyDistances(prev, userLocation));
  }, [userLocation]);

  const primaryButtonClass =
    "group relative flex h-11 w-full items-center justify-center overflow-hidden rounded-full border border-grey bg-grey px-4 py-2 transition-colors hover:border-belims-blue";
  const primaryButtonLabelClass =
    "relative z-10 font-heading font-bold text-white transition-colors group-hover:text-white";
  const primaryButtonOverlayClass =
    "absolute inset-0 origin-left scale-x-0 bg-belims-blue transition-transform duration-300 ease-out group-hover:scale-x-100";

  const secondaryButtonClass =
    "group relative flex h-11 w-full items-center justify-center overflow-hidden rounded-full border border-red bg-grey-light px-4 py-2 transition-colors hover:border-red-muted";
  const secondaryButtonLabelClass =
    "relative z-10 font-heading font-bold text-grey transition-colors group-hover:text-white";
  const secondaryButtonOverlayClass =
    "absolute inset-0 origin-left scale-x-0 bg-red-muted transition-transform duration-300 ease-out group-hover:scale-x-100";

  const buildPostalCodeOnlyAddress = (): ShippingAddress | null => {
    const postalCode = input.trim();
    if (!/^\d{4}$/.test(postalCode)) {
      return null;
    }

    return {
      street: "",
      city: "",
      province: "",
      postalCode,
      country: "ZA",
      label: postalCode,
    };
  };

  const savePostalCodeOnlyAddress = () => {
    const postalCodeAddress = buildPostalCodeOnlyAddress();
    if (!postalCodeAddress) {
      console.log("[delivery-location-modal] postal code save skipped", {
        input,
        reason: "Input is not a valid 4-digit postal code",
      });
      emitDeliveryAddressUpdated();
      return;
    }

    console.log("[delivery-location-modal] postal code save requested", {
      input,
      postalCodeAddress,
    });
    localStorage.setItem("fulfillmentType", "delivery");
    localStorage.setItem("belims_fulfillment_tab", "delivery");
    saveStoredAddress(postalCodeAddress);
    onAddressSelect(postalCodeAddress);
    setSavedDeliveryAddress(postalCodeAddress);
    setLegacyLabel(postalCodeAddress.label || postalCodeAddress.postalCode);
    setIsEditingDeliveryAddress(false);
    emitDeliveryAddressUpdated();
  };

  const handleClose = () => {
    if (
      fulfillmentType === "delivery" &&
      !savedDeliveryAddress &&
      !detectedLocationAddress
    ) {
      savePostalCodeOnlyAddress();
    } else {
      emitDeliveryAddressUpdated();
    }
    onClose();
  };

  const handleUpdatePostalCode = () => {
    if (detectedLocationAddress) {
      handleSaveDetectedAddress();
      return;
    }
    savePostalCodeOnlyAddress();
    onClose();
  };

  const handleConfirmPickupSelection = () => {
    handlePickupSave();
  };

  const handleSelectPickupStore = (storeId: string) => {
    setSelectedPickupStoreId(storeId);
  };

  return (
    <BottomDrawer
      isOpen={isOpen}
      onClose={handleClose}
      ariaLabel="Delivery location"
      placement="right"
      widthClassName="w-full max-w-md"
      heightClassName="h-full"
      showHandle={false}
      panelClassName="!rounded-none !border-0"
    >
      <div className="h-full bg-surface flex flex-col">
        {/* Header */}
        <div className="p-4 bg-brand text-white flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-2">
            <MapPin size={20} aria-hidden="true" />
            <span className="font-bold font-heading">
              {fulfillmentType === "pickup" ? "Store Pickup" : "Delivery Location"}
            </span>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-white hover:text-white/70"
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto bg-soft">
          <div className="px-5 py-5">
            {fulfillmentType === "delivery" ? (
              <DeliveryPanel
                inputRef={inputRef}
                input={input}
                loading={loading}
                suggestions={suggestions}
                errorMessage={errorMessage}
                savedDeliveryAddress={savedDeliveryAddress}
                detectedLocationAddress={detectedLocationAddress}
                isEditingDeliveryAddress={isEditingDeliveryAddress}
                onEditAddress={() => setIsEditingDeliveryAddress(true)}
                onInputChange={handleInputChange}
                onClearLocation={handleClearLocation}
                onDetectLocation={handleDetectLocation}
                onSuggestionClick={handleSuggestionClick}
                onSaveDetectedAddress={handleSaveDetectedAddress}
                primaryButtonClass={primaryButtonClass}
                primaryButtonLabelClass={primaryButtonLabelClass}
                primaryButtonOverlayClass={primaryButtonOverlayClass}
                secondaryButtonClass={secondaryButtonClass}
                secondaryButtonLabelClass={secondaryButtonLabelClass}
                secondaryButtonOverlayClass={secondaryButtonOverlayClass}
              />
            ) : (
              <PickupPanel
                stores={filteredStores}
                selectedPickupStoreId={selectedPickupStoreId}
                expandedStoreId={expandedStoreId}
                onSelectStore={handleSelectPickupStore}
                onToggleExpanded={(storeId) =>
                  setExpandedStoreId((prev) => (prev === storeId ? null : storeId))
                }
                onEnableDefaultStore={handleEnableDefaultStore}
                getStoreStatus={getStoreStatus}
              />
            )}
          </div>
        </div>

        {/* Sticky footer */}
        <div className="p-5 border-t bg-surface flex-shrink-0">
          {fulfillmentType === "delivery" ? (
            <button
              type="button"
              onClick={handleUpdatePostalCode}
              className={primaryButtonClass}
            >
              <span className={primaryButtonOverlayClass} />
              <span className={primaryButtonLabelClass}>Update Postal Code</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleConfirmPickupSelection}
              className="group relative flex h-11 w-full items-center justify-center overflow-hidden rounded-full bg-belims-blue px-4 py-2 transition-colors hover:bg-belims-navy"
            >
              <span className="relative z-10 font-heading font-bold text-white">
                Confirm Selection
              </span>
            </button>
          )}
        </div>
      </div>
    </BottomDrawer>
  );
};
