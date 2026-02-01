import React, { useState, useRef, useEffect } from "react";
import { X, MapPin, Loader } from "lucide-react";

interface DeliveryLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLocation: string;
  onLocationSelect: (location: string) => void;
}

export const DeliveryLocationModal: React.FC<DeliveryLocationModalProps> = ({
  isOpen,
  onClose,
  currentLocation,
  onLocationSelect,
}) => {
  const [input, setInput] = useState(currentLocation);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setInput(currentLocation);
      setSuggestions([]);
    }
  }, [currentLocation, isOpen]);

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

    if (value.length < 2) {
      setSuggestions([]);
      return;
    }

    setLoading(true);

    try {
      const win = window as any;
      if (win.google?.maps?.places) {
        const service = new win.google.maps.places.AutocompleteService();
        const request = {
          input: value,
          componentRestrictions: { country: "ca" }, // Restrict to Canada
          types: ["(cities)"],
        };

        const result = await service.getPlacePredictions(request);
        const placeSuggestions = result.predictions.map((p) => p.description);
        setSuggestions(placeSuggestions);
      } else {
        // Fallback: simple client-side suggestions
        setSuggestions([]);
      }
    } catch (error) {
      console.error("Autocomplete error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    setSuggestions([]);
    onLocationSelect(suggestion);
    onClose();
  };

  const handleDetectLocation = async () => {
    setLoading(true);
    try {
      if (!navigator.geolocation) {
        alert("Geolocation is not supported by your browser.");
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

                const formattedAddress = data.address
                  ? `${data.address.city || data.address.town || data.address.village || ""}, ${data.address.state || data.address.province || data.address.country || ""}`
                      .replace(/^,\s*/, "")
                      .replace(/,\s*,/g, ",")
                      .trim()
                  : `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

                setInput(formattedAddress);
                onLocationSelect(formattedAddress);
                onClose();
              } else {
                throw new Error(`API returned ${response.status}`);
              }
            } catch (fetchError: any) {
              clearTimeout(timeoutId);
              console.error("Reverse geocoding error:", fetchError);

              if (fetchError.name === "AbortError") {
                alert(
                  "Location lookup timed out. Using coordinates instead. Please enter your address manually for better results.",
                );
                const fallbackAddress = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
                setInput(fallbackAddress);
                onLocationSelect(fallbackAddress);
                onClose();
              } else {
                alert(
                  "Error finding address. Using coordinates instead. Please enter your address manually for better results.",
                );
                const fallbackAddress = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
                setInput(fallbackAddress);
                onLocationSelect(fallbackAddress);
                onClose();
              }
            }
          } catch (error) {
            console.error("Position callback error:", error);
            alert("An error occurred. Please enter your address manually.");
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
          alert(errorMessage + " Please enter your address manually.");
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
      alert("An error occurred. Please try again.");
      setLoading(false);
    }
  };

  const handleClearLocation = () => {
    localStorage.removeItem("deliveryAddress");
    setInput("");
    setSuggestions([]);
    onLocationSelect("");
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
          {/* Info Text */}
          <p className="text-sm text-gray-600">
            {import.meta.env.DEV && (
              <button
                onClick={handleClearLocation}
                className="w-full bg-white text-gray-500 border border-gray-200 px-4 py-2 rounded-lg text-xs font-semibold hover:bg-gray-50 transition-colors"
              >
                Clear saved address (dev only)
              </button>
            )}
            Get instant delivery rates by entering your address.
          </p>

          {/* Input with Autocomplete */}
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              placeholder="Enter your address"
              value={input}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-300 rounded text-sm focus:outline-none focus:border-belims-blue focus:ring-1 focus:ring-belims-blue"
            />
            {loading && (
              <Loader
                size={18}
                className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-belims-blue"
              />
            )}

            {/* Autocomplete Suggestions */}
            {suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded shadow-lg z-[1000] max-h-60 overflow-y-auto">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 flex items-center gap-2 transition-colors"
                  >
                    <MapPin size={16} className="text-gray-400" />
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Detect Location Button */}
          <button
            onClick={handleDetectLocation}
            disabled={loading}
            className="w-full bg-belims-blue text-white px-4 py-3 rounded text-sm font-bold hover:bg-red-600 transition-colors disabled:opacity-50"
          >
            {loading ? "Detecting..." : "Detect My Location"}
          </button>

          <p className="text-xs text-gray-500 text-center">
            Your location is saved automatically when you select or detect your
            address.
          </p>
        </div>
      </div>
    </div>
  );
};
