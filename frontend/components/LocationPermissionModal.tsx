import React, { useState } from "react";
import { X, MapPin, AlertCircle } from "lucide-react";
import { ShippingAddress } from "../types";
import {
  mapNominatimAddress,
  normalizeProvince,
  PROVINCES,
  buildAddressLabel,
  saveStoredAddress,
} from "../services/shippingAddress";

interface LocationPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddressDetected?: (address: ShippingAddress) => void;
}

export const LocationPermissionModal: React.FC<
  LocationPermissionModalProps
> = ({ isOpen, onClose, onAddressDetected }) => {
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAllowLocation = async () => {
    setIsDetecting(true);
    setError(null);

    try {
      if (!navigator.geolocation) {
        setError("Geolocation is not supported by your browser.");
        setIsDetecting(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;

            // Create a timeout for the fetch request
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            try {
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

                // Only proceed if we have a complete address
                if (mapped && mapped.city && mapped.province) {
                  const normalizedProvince = normalizeProvince(mapped.province);
                  if (
                    normalizedProvince &&
                    PROVINCES.includes(
                      normalizedProvince as (typeof PROVINCES)[number],
                    )
                  ) {
                    const address: ShippingAddress = {
                      ...mapped,
                      province: normalizedProvince,
                      country: "ZA",
                      label: mapped.label || buildAddressLabel(mapped),
                    };

                    // Save the detected address
                    saveStoredAddress(address);
                    localStorage.setItem("fulfillmentType", "delivery");
                    localStorage.setItem("locationPermissionGranted", "true");

                    onAddressDetected?.(address);
                    onClose();
                    return;
                  }
                }

                // Partial address - just mark permission as granted and close
                localStorage.setItem("locationPermissionGranted", "true");
                onClose();
              } else {
                throw new Error(`API returned ${response.status}`);
              }
            } catch (fetchError) {
              console.error("Reverse geocoding error:", fetchError);
              // Still mark permission as granted, even if geocoding failed
              localStorage.setItem("locationPermissionGranted", "true");
              onClose();
            }
          } catch (posError) {
            console.error("Position callback error:", posError);
            setIsDetecting(false);
          }
        },
        (error) => {
          console.error("Geolocation error:", error);
          let errorMsg = "Unable to access your location. ";
          if (error.code === error.PERMISSION_DENIED) {
            errorMsg +=
              "Location permission was denied. You can enable it in browser settings.";
            localStorage.setItem("locationPermissionDenied", "true");
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            errorMsg += "Your location could not be determined.";
          } else if (error.code === error.TIMEOUT) {
            errorMsg += "Location request timed out.";
          }
          setError(errorMsg);
          setIsDetecting(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        },
      );
    } catch (err) {
      console.error("Location permission error:", err);
      setError("An error occurred. Please try again.");
      setIsDetecting(false);
    }
  };

  const handleDeny = () => {
    localStorage.setItem("locationPermissionDenied", "true");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={handleDeny}
      />

      <div className="relative bg-white rounded-lg shadow-xl max-w-sm w-full animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-belims-blue text-white px-6 py-5 flex items-center justify-between rounded-t-lg">
          <div className="flex items-center gap-3">
            <MapPin size={20} />
            <h2 className="font-bold font-heading text-base">
              Enable Location?
            </h2>
          </div>
          <button
            onClick={handleDeny}
            className="text-white hover:text-gray-200 transition-colors p-1"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6 space-y-4">
          <p className="text-sm text-gray-700">
            Allow us to detect your location to show nearby pickup stores and
            delivery options tailored to you.
          </p>

          {error && (
            <div className="rounded border border-red-200 bg-red-50 px-4 py-3 flex gap-3">
              <AlertCircle
                size={16}
                className="text-red-600 flex-shrink-0 mt-0.5"
              />
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          <div className="bg-blue-50 rounded border border-blue-100 px-4 py-3 flex gap-3">
            <div className="text-blue-600 text-xs">
              <strong>Your privacy matters.</strong> We only use your location
              to improve your shopping experience. It's never sold or shared.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg flex gap-3">
          <button
            onClick={handleDeny}
            disabled={isDetecting}
            className="flex-1 px-4 py-2.5 rounded border border-gray-300 bg-white text-gray-900 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Not Now
          </button>
          <button
            onClick={handleAllowLocation}
            disabled={isDetecting}
            className="flex-1 px-4 py-2.5 rounded bg-belims-blue text-white text-sm font-semibold hover:bg-belims-navy disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isDetecting ? "Detecting..." : "Allow"}
          </button>
        </div>
      </div>
    </div>
  );
};
