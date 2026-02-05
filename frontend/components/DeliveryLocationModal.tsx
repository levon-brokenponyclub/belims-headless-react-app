import React, { useState, useRef, useEffect } from "react";
import { X, MapPin, Loader, Search, Map } from "lucide-react";
import { ShippingAddress, Store } from "../types";
import { STORES } from "../constants";
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
  currentAddress?: ShippingAddress;
  onAddressSelect: (address: ShippingAddress | null) => void;
  currentStore?: Store | null;
  onStoreSelect?: (store: Store | null) => void;
}

export const DeliveryLocationModal: React.FC<DeliveryLocationModalProps> = ({
  isOpen,
  onClose,
  currentAddress,
  onAddressSelect,
  currentStore,
  onStoreSelect,
}) => {
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [legacyLabel, setLegacyLabel] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Manual form fields state
  const [manualStreet, setManualStreet] = useState("");
  const [manualCity, setManualCity] = useState("");
  const [manualPostalCode, setManualPostalCode] = useState("");
  const [manualProvince, setManualProvince] = useState("");

  const [fulfillmentType, setFulfillmentType] = useState<"delivery" | "pickup">(
    "delivery",
  );
  const [storeSearch, setStoreSearch] = useState("");
  const [storeList, setStoreList] = useState(STORES);
  const [selectedPickupStoreId, setSelectedPickupStoreId] = useState<
    string | null
  >(null);

  useEffect(() => {
    if (isOpen) {
      const storedFulfillment = localStorage.getItem("fulfillmentType");
      const { legacyLabel: storedLegacy } = readStoredAddress();
      const currentLabel = currentAddress
        ? currentAddress.label || buildAddressLabel(currentAddress)
        : storedLegacy || "";

      if (storedFulfillment === "pickup" || storedFulfillment === "delivery") {
        setFulfillmentType(storedFulfillment);
      } else {
        setFulfillmentType("delivery");
      }

      setLegacyLabel(storedLegacy);
      setInput(currentLabel);
      setSuggestions([]);
      setErrorMessage(null);
      setStoreSearch("");
      setStoreList(STORES);
      setSelectedPickupStoreId(currentStore?.id || null);
    }
  }, [currentAddress, currentStore, isOpen]);

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

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);
    setErrorMessage(null);

    if (value.length < 2) {
      setSuggestions([]);
      return;
    }

    setLoading(true);

    try {
      const win = window as any;
      if (!win.google?.maps?.places) {
        setSuggestions([]);
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

      setSuggestions(predictions);
    } catch (error) {
      console.error("Autocomplete error:", error);
      setErrorMessage("Unable to load address suggestions.");
    } finally {
      setLoading(false);
    }
  };

  const buildAddressFromPlace = (place: any): ShippingAddress | null => {
    const components = place.address_components || [];
    const getComponent = (type: string) =>
      components.find((component: any) => component.types.includes(type))
        ?.long_name;

    const streetNumber = getComponent("street_number");
    const route = getComponent("route");
    const suburb =
      getComponent("sublocality") ||
      getComponent("sublocality_level_1") ||
      getComponent("neighborhood");
    const city =
      getComponent("locality") ||
      getComponent("administrative_area_level_2") ||
      getComponent("postal_town");
    const province = normalizeProvince(
      getComponent("administrative_area_level_1"),
    );
    const postalCode = getComponent("postal_code") || "";

    const street = [streetNumber, route, suburb].filter(Boolean).join(" ");

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
    try {
      const win = window as any;
      if (!win.google?.maps?.places) {
        setErrorMessage("Google Places is not available.");
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
      if (!address) {
        setErrorMessage(
          "Please select an address with a valid city and province.",
        );
        return;
      }

      setInput(address.label || buildAddressLabel(address));
      setSuggestions([]);
      localStorage.setItem("fulfillmentType", "delivery");
      onAddressSelect(address);
      onClose();
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

      navigator.geolocation.getCurrentPosition(
        async (position) => {
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

                if (!mapped || !mapped.city || !mapped.province) {
                  setErrorMessage(
                    "Unable to detect a full address. Please enter it manually.",
                  );
                  return;
                }

                const normalizedProvince = normalizeProvince(mapped.province);
                if (
                  !normalizedProvince ||
                  !PROVINCES.includes(
                    normalizedProvince as (typeof PROVINCES)[number],
                  )
                ) {
                  setErrorMessage(
                    "Please select a South African address with a valid province.",
                  );
                  return;
                }

                const address: ShippingAddress = {
                  ...mapped,
                  province: normalizedProvince,
                  country: "ZA",
                  label: mapped.label || buildAddressLabel(mapped),
                };

                setInput(address.label || buildAddressLabel(address));
                localStorage.setItem("fulfillmentType", "delivery");
                onAddressSelect(address);
                onClose();
              } else {
                throw new Error(`API returned ${response.status}`);
              }
            } catch (fetchError: any) {
              clearTimeout(timeoutId);
              console.error("Reverse geocoding error:", fetchError);
              setErrorMessage(
                "Unable to detect your address. Please enter it manually.",
              );
            }
          } catch (error) {
            console.error("Position callback error:", error);
            setErrorMessage("An error occurred. Please enter your address.");
            setLoading(false);
          }
        },
        (error) => {
          console.error("Geolocation error:", error);
          let errorMessage = "Unable to detect your location. ";
          if (error.code === error.PERMISSION_DENIED) {
            errorMessage +=
              "Please enable location permission in your browser settings.";
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            errorMessage += "Your location could not be determined.";
          } else if (error.code === error.TIMEOUT) {
            errorMessage += "Location request timed out.";
          }
          setErrorMessage(errorMessage + " Please enter your address.");
          setLoading(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000, // 10 second timeout for getting position
          maximumAge: 0,
        },
      );
    } catch (error) {
      console.error("Detect location error:", error);
      setErrorMessage("An error occurred. Please try again.");
      setLoading(false);
    }
  };

  const handleClearLocation = () => {
    setInput("");
    setSuggestions([]);
    setErrorMessage(null);
    onAddressSelect(null);
  };

  const handleSaveManualAddress = () => {
    setErrorMessage(null);

    // Validate required fields
    if (!manualStreet.trim()) {
      setErrorMessage("Please enter a street address.");
      return;
    }
    if (!manualCity.trim()) {
      setErrorMessage("Please enter a city.");
      return;
    }
    if (!manualProvince.trim()) {
      setErrorMessage("Please select a province.");
      return;
    }

    // Validate province - check if it's already in PROVINCES or needs normalization
    let validatedProvince = manualProvince;
    if (!PROVINCES.includes(manualProvince as (typeof PROVINCES)[number])) {
      // Try normalizing if not already canonical
      const normalizedProvince = normalizeProvince(manualProvince);
      if (
        !normalizedProvince ||
        !PROVINCES.includes(normalizedProvince as (typeof PROVINCES)[number])
      ) {
        setErrorMessage("Please select a valid South African province.");
        return;
      }
      validatedProvince = normalizedProvince;
    }

    // Create address object
    const address: ShippingAddress = {
      street: manualStreet.trim(),
      city: manualCity.trim(),
      province: validatedProvince,
      postalCode: manualPostalCode.trim(),
      country: "ZA",
    };

    // Save address and notify parent
    saveStoredAddress(address);
    localStorage.setItem("fulfillmentType", "delivery");
    onAddressSelect(address);

    // Clear form and close modal
    setManualStreet("");
    setManualCity("");
    setManualPostalCode("");
    setManualProvince("");
    onClose();
  };

  const handleFulfillmentChange = (type: "delivery" | "pickup") => {
    setErrorMessage(null);
    setFulfillmentType(type);
    localStorage.setItem("fulfillmentType", type);
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

    onStoreSelect?.(selectedStore);
    localStorage.setItem("fulfillmentType", "pickup");
    onClose();
  };

  const handleLocateStores = () => {
    setErrorMessage(null);
    const sorted = [...STORES].sort(
      (a, b) => (a.distance || 0) - (b.distance || 0),
    );
    setStoreList(sorted);
  };

  const filteredStores = storeList.filter((store) => {
    if (!storeSearch.trim()) return true;
    const query = storeSearch.toLowerCase();
    return (
      store.name.toLowerCase().includes(query) ||
      store.address.toLowerCase().includes(query)
    );
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white flex flex-col animate-in slide-in-from-right-4 duration-200">
        {/* Header */}
        <div className="p-5 border-b bg-white flex justify-between items-center">
          <div className="flex items-center gap-2">
            <MapPin className="text-belims-blue" size={18} />
            <h3 className="text-lg font-bold text-gray-900 font-heading">
              Delivery Location
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Fulfillment Toggle */}
          <div className="flex items-center justify-between">
            <div className="inline-flex rounded-full bg-gray-100 p-1">
              <button
                type="button"
                onClick={() => handleFulfillmentChange("delivery")}
                className={`px-4 py-1.5 text-xs font-bold rounded-full transition-colors ${
                  fulfillmentType === "delivery"
                    ? "bg-belims-blue text-white"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Delivery
              </button>
              <button
                type="button"
                onClick={() => handleFulfillmentChange("pickup")}
                className={`px-4 py-1.5 text-xs font-bold rounded-full transition-colors ${
                  fulfillmentType === "pickup"
                    ? "bg-belims-blue text-white"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Pickup
              </button>
            </div>
            {fulfillmentType === "pickup" && (
              <button
                type="button"
                className="flex items-center gap-2 text-xs font-semibold text-belims-blue hover:text-belims-navy"
              >
                <Map size={14} /> Map View
              </button>
            )}
          </div>

          {fulfillmentType === "delivery" ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-600">
                  Enter street address or suburb
                </label>
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <Search
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      ref={inputRef}
                      type="text"
                      placeholder="Search delivery address"
                      value={input}
                      onChange={handleInputChange}
                      className="w-full pl-9 pr-9 py-2.5 border border-gray-300 rounded-full text-sm focus:outline-none focus:border-belims-blue focus:ring-1 focus:ring-belims-blue"
                    />
                    {input && (
                      <button
                        type="button"
                        onClick={handleClearLocation}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDetectLocation}
                  className="flex items-center gap-2 text-xs font-semibold text-belims-blue hover:text-belims-navy"
                >
                  <MapPin size={14} /> Use my current location
                </button>
              </div>

              {loading && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Loader size={14} className="animate-spin" />
                  Finding address suggestions...
                </div>
              )}

              {suggestions.length > 0 && (
                <div className="rounded-lg border border-gray-200 divide-y overflow-hidden">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion.place_id}
                      type="button"
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50"
                    >
                      {suggestion.description}
                    </button>
                  ))}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Street Address
                </label>
                <input
                  type="text"
                  placeholder="123 Main Street"
                  value={manualStreet}
                  onChange={(e) => setManualStreet(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-belims-blue focus:ring-1 focus:ring-belims-blue"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    placeholder="Johannesburg"
                    value={manualCity}
                    onChange={(e) => setManualCity(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-belims-blue focus:ring-1 focus:ring-belims-blue"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    placeholder="2000"
                    value={manualPostalCode}
                    onChange={(e) => setManualPostalCode(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-belims-blue focus:ring-1 focus:ring-belims-blue"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Province
                </label>
                <select
                  value={manualProvince}
                  onChange={(e) => setManualProvince(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-belims-blue focus:ring-1 focus:ring-belims-blue bg-white"
                >
                  <option value="">Select province</option>
                  {PROVINCES.map((province) => (
                    <option key={province} value={province}>
                      {province}
                    </option>
                  ))}
                </select>
              </div>

              {errorMessage && (
                <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {errorMessage}
                </div>
              )}

              <button
                onClick={handleSaveManualAddress}
                className="w-full bg-belims-blue text-white px-4 py-2 rounded text-sm font-bold hover:bg-belims-light transition-colors"
              >
                Save Address
              </button>

              {/* Development Testing: Reset Address Button */}
              <button
                onClick={() => {
                  localStorage.removeItem("deliveryAddressV2");
                  localStorage.removeItem("deliveryAddress");
                  setManualStreet("");
                  setManualCity("");
                  setManualPostalCode("");
                  setManualProvince("");
                  setErrorMessage(null);
                  onAddressSelect(null);
                }}
                className="w-full bg-gray-400 text-white px-4 py-2 rounded text-xs font-semibold hover:bg-gray-500 transition-colors"
              >
                Reset Address (Dev Testing)
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-600">
                  Enter suburb, city or postcode
                </label>
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <Search
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="text"
                      placeholder="Search pickup stores"
                      value={storeSearch}
                      onChange={(e) => setStoreSearch(e.target.value)}
                      className="w-full pl-9 pr-9 py-2.5 border border-gray-300 rounded-full text-sm focus:outline-none focus:border-belims-blue focus:ring-1 focus:ring-belims-blue"
                    />
                    {storeSearch && (
                      <button
                        type="button"
                        onClick={() => setStoreSearch("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleLocateStores}
                  className="flex items-center gap-2 text-xs font-semibold text-belims-blue hover:text-belims-navy"
                >
                  <MapPin size={14} /> Use my current location
                </button>
              </div>

              <div className="rounded-lg border border-gray-200 divide-y">
                {filteredStores.map((store) => {
                  const isSelected = store.id === selectedPickupStoreId;
                  return (
                    <button
                      key={store.id}
                      type="button"
                      onClick={() => setSelectedPickupStoreId(store.id)}
                      className="w-full text-left p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            isSelected
                              ? "border-belims-blue"
                              : "border-gray-300"
                          }`}
                        >
                          {isSelected && (
                            <div className="w-2.5 h-2.5 rounded-full bg-belims-blue" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-gray-900 text-sm font-heading">
                            {store.name}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {store.address}
                          </div>
                          <div className="flex items-center gap-3 text-[11px] mt-2">
                            <span className="text-green-600 font-semibold">
                              Open
                            </span>
                            <span className="text-gray-400">· until 8pm</span>
                            {store.distance !== undefined && (
                              <span className="text-gray-500">
                                {store.distance} km away
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            className="mt-2 text-[11px] font-semibold text-belims-blue hover:underline"
                          >
                            Store details
                          </button>
                        </div>
                      </div>
                    </button>
                  );
                })}

                {filteredStores.length === 0 && (
                  <div className="p-4 text-xs text-gray-500 text-center">
                    No stores match your search.
                  </div>
                )}
              </div>

              <button
                onClick={handlePickupSave}
                className="w-full bg-belims-blue text-white px-4 py-2 rounded-full text-sm font-bold hover:bg-belims-light transition-colors"
              >
                Save Pickup Store
              </button>
            </div>
          )}

          {fulfillmentType === "delivery" && (
            <p className="text-xs text-gray-500 text-center">
              Your location is saved automatically when you select or enter your
              address.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
