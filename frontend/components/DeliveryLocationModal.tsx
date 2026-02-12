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
} from "../services/shippingAddress";

interface DeliveryLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAddress?: ShippingAddress;
  onAddressSelect: (address: ShippingAddress | null) => void;
  currentStore?: Store | null;
  onStoreSelect?: (store: Store | null) => void;
}

const LOCATION_PERMISSION_CHOICE_KEY = "locationPermissionChoice";

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

  const [fulfillmentType, setFulfillmentType] = useState<"delivery" | "pickup">(
    "delivery",
  );
  const [storeSearch, setStoreSearch] = useState("");
  const [storeList, setStoreList] = useState(STORES);
  const [selectedPickupStoreId, setSelectedPickupStoreId] = useState<
    string | null
  >(null);
  const [showLocationConsentModal, setShowLocationConsentModal] =
    useState(false);
  const [detectedLocationAddress, setDetectedLocationAddress] =
    useState<ShippingAddress | null>(null);
  const [savedDeliveryAddress, setSavedDeliveryAddress] =
    useState<ShippingAddress | null>(null);
  const [isEditingDeliveryAddress, setIsEditingDeliveryAddress] =
    useState(true);

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

    return data.map((entry: any) => ({
      source: "nominatim",
      place_id: entry.place_id,
      lat: entry.lat,
      lon: entry.lon,
      description: entry.display_name,
    }));
  };

  const resolveAddressFromCoordinates = async (
    lat: number,
    lon: number,
  ): Promise<ShippingAddress | null> => {
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

  useEffect(() => {
    if (isOpen) {
      const storedFulfillment = localStorage.getItem("fulfillmentType");
      const { address: storedAddress, legacyLabel: storedLegacy } =
        readStoredAddress();
      const initialAddress = currentAddress || storedAddress;
      const currentLabel = initialAddress
        ? initialAddress.label || buildAddressLabel(initialAddress)
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
      setDetectedLocationAddress(null);
      setSavedDeliveryAddress(initialAddress || null);
      setIsEditingDeliveryAddress(!initialAddress);
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

  useEffect(() => {
    if (!isOpen) {
      setShowLocationConsentModal(false);
      setDetectedLocationAddress(null);
    }
  }, [isOpen]);

  const requestLocationWithConsent = () => {
    setShowLocationConsentModal(true);
  };

  const handleConsentAllow = async () => {
    localStorage.setItem(LOCATION_PERMISSION_CHOICE_KEY, "allowed");
    setShowLocationConsentModal(false);
    setErrorMessage(null);
    await handleDetectLocation();
  };

  const handleConsentDeny = () => {
    localStorage.setItem(LOCATION_PERMISSION_CHOICE_KEY, "denied");
    setShowLocationConsentModal(false);
  };

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

    const street =
      [streetNumber, route, suburb].filter(Boolean).join(" ") ||
      formattedParts[0] ||
      "";

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
        },
        (error) => {
          console.error("Geolocation error:", error);
          let errorMessage = "Unable to detect your location. ";
          if (error.code === error.PERMISSION_DENIED) {
            localStorage.setItem(LOCATION_PERMISSION_CHOICE_KEY, "denied");
            errorMessage +=
              "Please enable location permission in your browser settings.";
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            errorMessage += "Your location could not be determined.";
          } else if (error.code === error.TIMEOUT) {
            errorMessage += "Location request timed out.";
          }
          setErrorMessage(errorMessage + " Please search your address above.");
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
    setDetectedLocationAddress(null);
    setSavedDeliveryAddress(null);
    setIsEditingDeliveryAddress(true);
    onAddressSelect(null);
  };

  const handleAddressSaved = (address: ShippingAddress) => {
    localStorage.setItem("fulfillmentType", "delivery");
    onAddressSelect(address);
    setSavedDeliveryAddress(address);
    setDetectedLocationAddress(null);
    setInput(address.label || buildAddressLabel(address));
    setIsEditingDeliveryAddress(false);
  };

  const handleSaveDetectedAddress = () => {
    if (!detectedLocationAddress) return;
    handleAddressSaved(detectedLocationAddress);
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
        <div className="p-4 bg-belims-blue text-white flex justify-between items-center h-16">
          <div className="flex items-center gap-3">
            <MapPin size={20} />
            <span className="font-bold font-heading text-base">
              Delivery Location
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors p-1"
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 pb-24">
          {/* Fulfillment Toggle */}
          <div className="flex items-center justify-between border-b border-black/10 pb-4">
            <div className="inline-flex w-full rounded-full bg-gray-100 p-1">
              <button
                type="button"
                onClick={() => handleFulfillmentChange("delivery")}
                className={`w-full px-4 py-1.5 text-xs font-bold rounded-full transition-colors ${
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
                className={`w-full px-4 py-1.5 text-xs font-bold rounded-full transition-colors ${
                  fulfillmentType === "pickup"
                    ? "bg-belims-blue text-white"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Pickup
              </button>
            </div>
            {/* {fulfillmentType === "pickup" && (
              <button
                type="button"
                className="flex items-center gap-2 text-xs font-semibold text-belims-blue hover:text-belims-navy"
              >
                <Map size={14} /> Map View
              </button>
            )} */}
          </div>

          {fulfillmentType === "delivery" ? (
            <div className="space-y-4">
              <h5 className="text-center text-base font-semibold text-gray-900">
                Delivery Location
              </h5>
              {isEditingDeliveryAddress ? (
                <>
                  <div className="space-y-0">
                    <label className="block mb-2 text-sm text-gray-900 text-center">
                      Enables us to provide delivery rates and availability for
                      your location
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

                    <div className="my-5 flex items-center gap-3">
                      <div className="h-px flex-1 bg-gray-300" />
                      <span className="text-xs text-gray-500">or</span>
                      <div className="h-px flex-1 bg-gray-300" />
                    </div>

                    <button
                      type="button"
                      onClick={requestLocationWithConsent}
                      className="mt-1 flex w-full justify-center items-center gap-2 text-xs font-semibold text-belims-blue hover:text-belims-navy"
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
                      {suggestions.map((suggestion, index) => (
                        <button
                          key={`${suggestion.source || "google"}-${suggestion.place_id || index}`}
                          type="button"
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50"
                        >
                          {suggestion.description}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                savedDeliveryAddress && (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-4 space-y-3">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">
                        Delivery location
                      </h3>
                      <p className="text-xs text-gray-600 mt-1">
                        Delivery location selected for your device
                      </p>
                      <p className="text-sm text-gray-900 mt-2">
                        {formatDetectedLocationLine(savedDeliveryAddress)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsEditingDeliveryAddress(true)}
                      className="w-full rounded border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-50"
                    >
                      Edit Address
                    </button>

                    <p className="text-xs text-gray-500">
                      *Confirmation of your delivery address will ensure best
                      product availability and order delivery
                    </p>
                  </div>
                )
              )}

              {detectedLocationAddress && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-4 space-y-3">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">
                      Delivery location
                    </h3>
                    <p className="text-xs text-gray-600 mt-1">
                      Delivery location selected for your device
                    </p>
                    <p className="text-sm text-gray-900 mt-2">
                      {formatDetectedLocationLine(detectedLocationAddress)}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={handleSaveDetectedAddress}
                      className="rounded bg-belims-blue px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-belims-navy"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setDetectedLocationAddress(null)}
                      className="rounded border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-50"
                    >
                      Edit address
                    </button>
                  </div>

                  <p className="text-xs text-gray-500">
                    *Confirmation of your delivery address will ensure best
                    product availability and order delivery
                  </p>
                </div>
              )}

              {errorMessage && (
                <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {errorMessage}
                </div>
              )}
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
            </div>
          )}
        </div>

        {/* Footer with Buttons */}
        <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 space-y-3">
          {errorMessage && fulfillmentType === "pickup" && (
            <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {errorMessage}
            </div>
          )}

          {fulfillmentType === "delivery" ? (
            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={() => {
                  localStorage.removeItem("deliveryAddressV2");
                  localStorage.removeItem("deliveryAddress");
                  setErrorMessage(null);
                  setInput("");
                  setSuggestions([]);
                  setDetectedLocationAddress(null);
                  setSavedDeliveryAddress(null);
                  setIsEditingDeliveryAddress(true);
                  onAddressSelect(null);
                }}
                className="px-4 py-2.5 rounded border border-gray-300 bg-white text-gray-900 text-sm font-semibold hover:bg-gray-50 transition-colors"
              >
                Reset
              </button>
            </div>
          ) : (
            <button
              onClick={handlePickupSave}
              className="w-full px-4 py-2.5 rounded bg-belims-blue text-white text-sm font-semibold hover:bg-belims-navy transition-colors"
            >
              Save Pickup Store
            </button>
          )}
        </div>
      </div>

      {showLocationConsentModal && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 px-6">
          <div className="w-full max-w-sm rounded-lg border border-black/10 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 h-9 w-9 rounded-lg bg-blue-50 text-belims-blue flex items-center justify-center">
                <MapPin size={18} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">
                  Allow location access?
                </h3>
                <p className="mt-1 text-xs text-gray-600">
                  We use your location to auto-fill your delivery address and
                  show accurate delivery options.
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleConsentDeny}
                className="rounded border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-50"
              >
                Deny
              </button>
              <button
                type="button"
                onClick={handleConsentAllow}
                className="rounded bg-belims-blue px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-belims-navy"
              >
                Allow
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
