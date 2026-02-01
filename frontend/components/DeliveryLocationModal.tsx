import React, { useState, useRef, useEffect } from "react";
import { X, MapPin, Loader } from "lucide-react";
import { ShippingAddress } from "../types";
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
}

export const DeliveryLocationModal: React.FC<DeliveryLocationModalProps> = ({
  isOpen,
  onClose,
  currentAddress,
  onAddressSelect,
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

  useEffect(() => {
    if (isOpen) {
      const { legacyLabel: storedLegacy } = readStoredAddress();
      const currentLabel = currentAddress
        ? currentAddress.label || buildAddressLabel(currentAddress)
        : storedLegacy || "";

      setLegacyLabel(storedLegacy);
      setInput(currentLabel);
      setSuggestions([]);
      setErrorMessage(null);
    }
  }, [currentAddress, isOpen]);

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
      onAddressSelect(address);
      onClose();
    } catch (error) {
      console.error("Place details error:", error);
      setErrorMessage("Unable to read address details. Try another address.");
    } finally {
      setLoading(false);
    }
  };

  /* COMMENTED OUT - Detect location functionality
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
  */

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
    onAddressSelect(address);

    // Clear form and close modal
    setManualStreet("");
    setManualCity("");
    setManualPostalCode("");
    setManualProvince("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-lg rounded shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="sticky top-0 p-4 border-b bg-white flex justify-between items-center z-10">
          <h3 className="text-lg font-bold text-gray-900 font-heading">
            Delivery Location
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100"
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Manual Address Form */}
          <div className="space-y-3 pt-4">
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
          </div>

          <p className="text-xs text-gray-500 text-center">
            Your location is saved automatically when you select or enter your
            address.
          </p>
        </div>
      </div>
    </div>
  );
};
