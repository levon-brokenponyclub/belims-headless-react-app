import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, LocateFixed, MapPin, Search } from "lucide-react";
import { ShippingAddress } from "../types";
import {
  buildAddressLabel,
  mapNominatimAddress,
  saveStoredAddress,
} from "../services/shippingAddress";
import { getCurrentUser } from "../services/authService";

type NominatimSuggestion = {
  place_id: string;
  display_name: string;
  lat: string;
  lon: string;
  address: any;
  mainText?: string;
  secondaryText?: string;
};

const ZA_DEFAULT_CENTER = { lat: -26.2041, lon: 28.0473 };

const fetchNominatimSuggestions = async (
  query: string,
  signal?: AbortSignal,
): Promise<NominatimSuggestion[]> => {
  if (query.trim().length < 3) return [];
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&countrycodes=za&addressdetails=1&limit=6&q=${encodeURIComponent(query)}`,
    { signal },
  );
  if (!response.ok) return [];
  const data = await response.json();
  if (!Array.isArray(data)) return [];
  return data.map((item: any) => {
    const parts = String(item.display_name || "").split(",");
    return {
      place_id: String(item.place_id ?? item.osm_id ?? item.display_name),
      display_name: item.display_name,
      lat: item.lat,
      lon: item.lon,
      address: item.address,
      mainText: parts[0]?.trim(),
      secondaryText: parts.slice(1).join(",").trim(),
    };
  });
};

const reverseGeocode = async (lat: number, lon: number): Promise<any | null> => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
    );
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
};

const buildMapEmbedUrl = (lat: number, lon: number): string => {
  const delta = 0.005;
  const bbox = `${lon - delta}%2C${lat - delta}%2C${lon + delta}%2C${lat + delta}`;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lon}`;
};

export const DeliveryDetailsAddAddress: React.FC = () => {
  const navigate = useNavigate();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<NominatimSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [complexUnit, setComplexUnit] = useState("");
  const [addressLabel, setAddressLabel] = useState("");
  const [selectedAddress, setSelectedAddress] = useState<ShippingAddress | null>(
    null,
  );
  const [mapCenter, setMapCenter] = useState<{ lat: number; lon: number }>(
    ZA_DEFAULT_CENTER,
  );
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const searchAbortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<number | null>(null);
  const suggestionsBoxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let mounted = true;
    getCurrentUser()
      .then((user) => {
        if (mounted) setIsLoggedIn(Boolean(user));
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsBoxRef.current &&
        !suggestionsBoxRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const runSearch = useCallback((value: string) => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (searchAbortRef.current) searchAbortRef.current.abort();
    if (value.trim().length < 3) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    debounceRef.current = window.setTimeout(async () => {
      const controller = new AbortController();
      searchAbortRef.current = controller;
      try {
        const results = await fetchNominatimSuggestions(value, controller.signal);
        setSuggestions(results);
      } catch {
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  }, []);

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setShowSuggestions(true);
    setError(null);
    runSearch(value);
  };

  const applyAddress = (address: ShippingAddress, lat: number, lon: number) => {
    setSelectedAddress(address);
    setMapCenter({ lat, lon });
    setQuery(address.label || buildAddressLabel(address));
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleSelectSuggestion = (suggestion: NominatimSuggestion) => {
    const mapped = mapNominatimAddress(suggestion);
    if (!mapped) {
      setError("Could not read that address. Try another.");
      return;
    }
    applyAddress(mapped, Number(suggestion.lat), Number(suggestion.lon));
  };

  const handleUseCurrentLocation = async () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("Location services are unavailable in this browser.");
      return;
    }
    setIsLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const data = await reverseGeocode(latitude, longitude);
        if (data) {
          const mapped = mapNominatimAddress(data);
          if (mapped) {
            applyAddress(mapped, latitude, longitude);
            setIsLocating(false);
            return;
          }
        }
        setError("We couldn't detect an address at your location.");
        setMapCenter({ lat: latitude, lon: longitude });
        setIsLocating(false);
      },
      (err) => {
        setError(
          err.code === err.PERMISSION_DENIED
            ? "Location permission was denied."
            : "Could not fetch your location. Try again.",
        );
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  };

  const canSave = useMemo(
    () => Boolean(selectedAddress?.street && selectedAddress?.city),
    [selectedAddress],
  );

  const handleSave = () => {
    if (!selectedAddress) {
      setError("Please choose an address first.");
      return;
    }
    setIsSaving(true);
    const enriched: ShippingAddress = {
      ...selectedAddress,
      street: complexUnit
        ? `${complexUnit}, ${selectedAddress.street}`
        : selectedAddress.street,
      label:
        addressLabel.trim() ||
        selectedAddress.label ||
        buildAddressLabel(selectedAddress),
    };
    saveStoredAddress(enriched);
    try {
      localStorage.setItem("belims_delivery_popover_dismissed", "1");
      localStorage.setItem("fulfillmentType", "delivery");
    } catch {}
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("belims:delivery-address-updated"));
      window.dispatchEvent(new Event("belims:fulfillment-changed"));
    }
    navigate("/");
  };

  const handleCancel = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-6 md:py-10">
        <nav className="mb-6 text-sm">
          <button
            type="button"
            onClick={handleCancel}
            className="inline-flex items-center gap-1.5 text-text-secondary hover:text-text transition-colors"
          >
            <ArrowLeft size={16} /> Back
          </button>
        </nav>

        <div className="mb-8">
          <h1 className="text-h3 font-bold text-text">Delivery Details</h1>
          <p className="mt-1 text-base text-text-secondary">
            Where do you want your order delivered?
          </p>
          {!isLoggedIn && (
            <p className="mt-3 text-sm text-text-secondary">
              <Link
                to="/login"
                className="font-bold text-primary underline underline-offset-4"
              >
                Sign in
              </Link>{" "}
              to see your saved addresses
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-6 lg:gap-10">
          {/* Left: form */}
          <div className="space-y-6">
            <div>
              <label
                htmlFor="street-search"
                className="block text-sm font-bold text-text mb-2"
              >
                Street address
              </label>
              <div className="relative" ref={suggestionsBoxRef}>
                <div className="relative">
                  <Search
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary"
                  />
                  <input
                    id="street-search"
                    type="text"
                    value={query}
                    onChange={handleQueryChange}
                    onFocus={() => setShowSuggestions(true)}
                    placeholder="Search for your address and select from the dropdown"
                    className="w-full h-12 pl-11 pr-11 rounded-xl border border-border bg-white text-sm text-text placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50"
                  />
                  {isSearching && (
                    <Loader2
                      size={16}
                      className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-text-tertiary"
                    />
                  )}
                </div>
                {showSuggestions && suggestions.length > 0 && (
                  <ul className="absolute z-10 mt-1 w-full max-h-72 overflow-y-auto rounded-xl border border-border bg-white shadow-lg">
                    {suggestions.map((s) => (
                      <li key={s.place_id}>
                        <button
                          type="button"
                          onClick={() => handleSelectSuggestion(s)}
                          className="w-full text-left px-4 py-3 hover:bg-surface-muted flex items-start gap-3"
                        >
                          <MapPin
                            size={16}
                            className="mt-0.5 flex-shrink-0 text-primary"
                          />
                          <span className="flex flex-col leading-tight">
                            <span className="text-sm text-text font-medium">
                              {s.mainText || s.display_name}
                            </span>
                            {s.secondaryText && (
                              <span className="text-xs text-text-secondary">
                                {s.secondaryText}
                              </span>
                            )}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={isLocating}
                className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-primary hover:text-primary/80 disabled:opacity-60"
              >
                {isLocating ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <LocateFixed size={16} />
                )}
                {isLocating ? "Locating..." : "Use my current location"}
              </button>

              <p className="mt-2 text-xs text-text-tertiary">
                Or drag the map for accurate address delivery
              </p>
            </div>

            {error && (
              <div className="rounded-lg bg-danger-50 border border-danger-700/30 px-4 py-3 text-sm text-danger-700">
                {error}
              </div>
            )}

            {selectedAddress && (
              <div className="rounded-xl border border-border bg-white p-4 text-sm">
                <div className="font-bold text-text mb-1">Selected address</div>
                <div className="text-text-secondary">
                  {buildAddressLabel(selectedAddress) || "—"}
                  {selectedAddress.postalCode && (
                    <>, {selectedAddress.postalCode}</>
                  )}
                </div>
              </div>
            )}

            <div>
              <label
                htmlFor="complex-unit"
                className="block text-sm font-bold text-text mb-2"
              >
                Complex/Building
              </label>
              <input
                id="complex-unit"
                type="text"
                value={complexUnit}
                onChange={(e) => setComplexUnit(e.target.value)}
                placeholder="Complex or Building name, unit number or floor"
                className="w-full h-12 px-4 rounded-xl border border-border bg-white text-sm text-text placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50"
              />
            </div>

            <div>
              <label
                htmlFor="address-label"
                className="block text-sm font-bold text-text mb-2"
              >
                Address name{" "}
                <span className="font-normal text-text-tertiary">
                  (optional)
                </span>
              </label>
              <input
                id="address-label"
                type="text"
                value={addressLabel}
                onChange={(e) => setAddressLabel(e.target.value)}
                placeholder="e.g. Home, Office, Site"
                className="w-full h-12 px-4 rounded-xl border border-border bg-white text-sm text-text placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50"
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 h-12 rounded-pill border border-border bg-white text-sm font-bold text-text-secondary hover:bg-surface-muted transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!canSave || isSaving}
                className="flex-1 h-12 rounded-pill bg-belims-blue text-sm font-bold text-white hover:bg-belims-blue/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSaving ? "Saving..." : "Save address"}
              </button>
            </div>
          </div>

          {/* Right: map */}
          <div className="relative w-full min-h-[320px] lg:min-h-[520px] rounded-xl overflow-hidden border border-border bg-white">
            <iframe
              title="Delivery location map"
              src={buildMapEmbedUrl(mapCenter.lat, mapCenter.lon)}
              className="w-full h-full min-h-[320px] lg:min-h-[520px] border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliveryDetailsAddAddress;
