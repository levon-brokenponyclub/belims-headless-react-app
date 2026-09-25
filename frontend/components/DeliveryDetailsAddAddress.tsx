import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ChevronDown,
  Loader2,
  MapPin,
  Search,
  ShoppingBag,
  Truck,
  X,
} from "lucide-react";
import { ShippingAddress, Store } from "../types";
import {
  buildAddressLabel,
  mapNominatimAddress,
  saveStoredAddress,
} from "../services/shippingAddress";
import {
  getCurrentUser,
  saveBillingAddress,
  saveShippingAddress,
  UserData,
} from "../services/authService";
import { getApiBaseUrl } from "../services/wooCommerceService";

type Step = "address" | "option";
type Option = "delivery" | "collection";

type NominatimSuggestion = {
  place_id: string;
  display_name: string;
  lat: string;
  lon: string;
  address: any;
};

type SavedAddress = {
  id: string;
  source: "Billing" | "Shipping";
  address: ShippingAddress;
  line: string;
};

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
  return Array.isArray(data) ? (data as NominatimSuggestion[]) : [];
};

const toSavedAddress = (
  source: "Billing" | "Shipping",
  raw: UserData["billing"] | UserData["shipping"] | undefined,
): SavedAddress | null => {
  const line1 = raw?.address_1?.trim();
  if (!line1) return null;
  const city = raw?.city?.trim() || "";
  const address: ShippingAddress = {
    street: line1,
    city,
    province: raw?.state || "",
    postalCode: raw?.postcode || "",
    country: "ZA",
    label: city ? `${line1}, ${city}` : line1,
  };
  return {
    id: `${source.toLowerCase()}-${line1}-${city}`.toLowerCase(),
    source,
    address,
    line: city ? `${line1}, ${city}` : line1,
  };
};

export const DeliveryDetailsAddAddress: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isAccountContext = searchParams.get("context") === "account";
  const profileType =
    searchParams.get("type") === "shipping"
      ? "shipping"
      : searchParams.get("type") === "billing"
        ? "billing"
        : null;
  const isEditMode = searchParams.get("mode") === "edit";

  const [step, setStep] = useState<Step>("address");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<NominatimSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<ShippingAddress | null>(
    null,
  );

  const [option, setOption] = useState<Option>("delivery");
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>("");

  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const searchAbortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<number | null>(null);
  const suggestionsBoxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let mounted = true;
    getCurrentUser()
      .then((user) => {
        if (!mounted) return;
        if (!user) return;
        setIsLoggedIn(true);
        const rows: SavedAddress[] = [];
        const billing = toSavedAddress("Billing", user.billing);
        const shipping = toSavedAddress("Shipping", user.shipping);
        if (billing) rows.push(billing);
        if (
          shipping &&
          (!billing || shipping.line.toLowerCase() !== billing.line.toLowerCase())
        ) {
          rows.push(shipping);
        }
        setSavedAddresses(rows);

        if (isEditMode && profileType) {
          const source =
            profileType === "billing"
              ? toSavedAddress("Billing", user.billing)
              : toSavedAddress("Shipping", user.shipping);
          if (source) {
            setSelectedAddress(source.address);
            setQuery(source.address.label || buildAddressLabel(source.address));
          }
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [isEditMode, profileType]);

  useEffect(() => {
    let mounted = true;
    fetch(`${getApiBaseUrl()}/ecommerce-policies`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!mounted || !data) return;
        const rawStores = Array.isArray(data?.store_locations)
          ? data.store_locations
          : [];
        const normalized: Store[] = rawStores
          .map((store: any, index: number) => {
            const name = String(store?.name || "").trim();
            const address = String(store?.address || "")
              .replace(/\s*\n\s*/g, ", ")
              .trim();
            if (!name && !address) return null;
            return {
              id: String(store?.id || name || index + 1),
              name: name || `Store ${index + 1}`,
              address,
              phone: store?.phone ? String(store.phone) : undefined,
            } as Store;
          })
          .filter(Boolean) as Store[];
        setStores(normalized);
        try {
          const stored = localStorage.getItem("selectedPickupStore");
          if (stored) {
            const parsed = JSON.parse(stored) as Store;
            const match = normalized.find((s) => s.id === parsed.id);
            if (match) setSelectedStoreId(match.id);
          }
        } catch {}
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
    setSelectedAddress(null);
    setShowSuggestions(true);
    setError(null);
    runSearch(value);
  };

  const applyAddress = (address: ShippingAddress) => {
    setSelectedAddress(address);
    setQuery(address.label || buildAddressLabel(address));
    setShowSuggestions(false);
    setSuggestions([]);
    setError(null);
  };

  const handleSelectSuggestion = (suggestion: NominatimSuggestion) => {
    const mapped = mapNominatimAddress(suggestion);
    if (!mapped) {
      setError("Could not read that address. Try another.");
      return;
    }
    applyAddress(mapped);
  };

  const handleSelectSaved = (id: string) => {
    const found = savedAddresses.find((a) => a.id === id);
    if (found) applyAddress(found.address);
  };

  const handleClearAddress = () => {
    setSelectedAddress(null);
    setQuery("");
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleConfirmAddress = async () => {
    if (!selectedAddress) {
      setError("Please choose an address first.");
      return;
    }
    setError(null);

    if (isAccountContext && profileType) {
      setIsSaving(true);
      try {
        if (profileType === "billing") {
          await saveBillingAddress(selectedAddress);
        } else {
          await saveShippingAddress(selectedAddress);
        }
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("user-updated"));
        }
        navigate("/account/addresses");
      } catch (e: any) {
        setError(e?.message || "Failed to save address.");
        setIsSaving(false);
      }
      return;
    }

    setStep("option");
  };

  const handleBackToAddress = () => {
    setStep("address");
  };

  const canSaveFinal = useMemo(() => {
    if (!selectedAddress) return false;
    if (option === "collection") return Boolean(selectedStoreId);
    return true;
  }, [selectedAddress, option, selectedStoreId]);

  const handleFinalConfirm = () => {
    if (!selectedAddress) return;
    setIsSaving(true);

    saveStoredAddress(selectedAddress);
    try {
      localStorage.setItem("belims_delivery_popover_dismissed", "1");
    } catch {}

    if (option === "collection") {
      const picked = stores.find((s) => s.id === selectedStoreId);
      if (!picked) {
        setError("Please choose a store to collect from.");
        setIsSaving(false);
        return;
      }
      try {
        localStorage.setItem("selectedPickupStore", JSON.stringify(picked));
        localStorage.setItem("pickupStoreSelected", "true");
        localStorage.setItem("fulfillmentType", "pickup");
      } catch {}
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("belims:pickup-store-updated", { detail: picked }),
        );
      }
    } else {
      try {
        localStorage.setItem("fulfillmentType", "delivery");
      } catch {}
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("belims:delivery-address-updated"));
      window.dispatchEvent(new Event("belims:fulfillment-changed"));
    }
    navigate("/");
  };

  const handleClose = () => {
    if (isAccountContext) {
      navigate("/account/addresses");
    } else {
      navigate(-1);
    }
  };

  const streetOnly = selectedAddress?.street || query.split(",")[0];

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-6 pt-6 pb-24 md:pt-10 md:pb-32">
        {/* Header: back arrow (step 2), stepper dots, close */}
        <div className="relative mb-6 flex items-center justify-center">
          {step === "option" && (
            <button
              type="button"
              onClick={handleBackToAddress}
              aria-label="Back"
              className="absolute left-0 text-text hover:opacity-70"
            >
              <ArrowLeft size={22} />
            </button>
          )}
          {!isAccountContext && (
            <div className="flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${step === "address" ? "bg-text" : "bg-gray-300"}`}
                aria-hidden="true"
              />
              <span
                className={`h-2.5 w-2.5 rounded-full ${step === "option" ? "bg-text" : "bg-gray-300"}`}
                aria-hidden="true"
              />
            </div>
          )}
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            className="absolute right-0 text-text hover:opacity-70"
          >
            <X size={22} />
          </button>
        </div>

        {step === "address" ? (
          <>
            <h1 className="text-h4 md:text-h3 font-bold text-text text-center">
              {isAccountContext
                ? isEditMode
                  ? `Edit ${profileType === "shipping" ? "shipping" : "billing"} address`
                  : `Add ${profileType === "shipping" ? "shipping" : "billing"} address`
                : "Confirm your address"}
            </h1>
            <p className="mt-3 text-center text-base text-text-secondary max-w-lg mx-auto">
              {isAccountContext
                ? "Enter or search for an address to save to your profile."
                : "Enter your address or select one below to customize your shopping experience. This way, you'll only see what's available in your area."}
            </p>

            <div className="mt-8" ref={suggestionsBoxRef}>
              <div className="relative">
                <input
                  id="street-search"
                  type="text"
                  value={query}
                  onChange={handleQueryChange}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="Enter your street address eg. 12 Main Road, Suburb"
                  className="w-full h-14 pl-5 pr-14 rounded-lg border border-border bg-white text-base text-text placeholder:text-text-tertiary focus:outline-none focus:border-text"
                />
                {selectedAddress ? (
                  <button
                    type="button"
                    onClick={handleClearAddress}
                    aria-label="Clear address"
                    className="absolute right-4 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full border border-text text-text hover:bg-surface-muted"
                  >
                    <X size={14} />
                  </button>
                ) : isSearching ? (
                  <Loader2
                    size={20}
                    className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-text-tertiary"
                  />
                ) : (
                  <Search
                    size={20}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-text"
                  />
                )}
              </div>
              {showSuggestions && suggestions.length > 0 && !selectedAddress && (
                <ul className="mt-1 max-h-72 overflow-y-auto rounded-lg border border-border bg-white shadow-sm">
                  {suggestions.map((s) => (
                    <li key={s.place_id}>
                      <button
                        type="button"
                        onClick={() => handleSelectSuggestion(s)}
                        className="w-full text-left px-4 py-3 hover:bg-belims-blue/[0.06] text-sm text-text"
                      >
                        {s.display_name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {error && (
              <div className="mt-4 rounded-lg bg-danger-50 border border-danger-700/30 px-4 py-3 text-sm text-danger-700">
                {error}
              </div>
            )}

            {isLoggedIn && savedAddresses.length > 0 && (
              <div className="mt-6">
                <div className="text-sm font-bold text-text mb-2">
                  Your saved addresses
                </div>
                <ul className="space-y-2">
                  {savedAddresses.map((addr) => (
                    <li key={addr.id}>
                      <button
                        type="button"
                        onClick={() => handleSelectSaved(addr.id)}
                        className="w-full text-left rounded-lg border border-border bg-white px-4 py-3 hover:border-text transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <MapPin
                            size={16}
                            className="mt-0.5 flex-shrink-0 text-primary"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="mb-0.5">
                              <span className="inline-flex items-center rounded-pill bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                                {addr.source}
                              </span>
                            </div>
                            <div className="text-sm font-medium text-text truncate">
                              {addr.line}
                            </div>
                          </div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {!isLoggedIn && (
              <p className="mt-8 text-center text-sm text-text">
                To see your saved addresses{" "}
                <Link
                  to="/login"
                  className="font-bold underline underline-offset-4"
                >
                  Sign In
                </Link>
              </p>
            )}

            <div className="mt-12 flex justify-end">
              <button
                type="button"
                onClick={handleConfirmAddress}
                disabled={!selectedAddress || isSaving}
                className="px-8 h-12 rounded-none bg-text text-white text-sm font-bold uppercase tracking-wide hover:bg-text/90 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {isSaving
                  ? "Saving..."
                  : isAccountContext
                    ? "Save address"
                    : "Confirm address"}
              </button>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-h4 md:text-h3 font-bold text-text text-center">
              Confirm Your Option
            </h1>
            <p className="mt-3 text-center text-base">
              <span className="font-bold text-text">{streetOnly}</span>{" "}
              <button
                type="button"
                onClick={handleBackToAddress}
                className="ml-2 text-text-secondary underline underline-offset-4 hover:text-text"
              >
                Edit
              </button>
            </p>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setOption("delivery")}
                className={`text-left rounded-lg border p-6 min-h-[220px] transition-colors ${
                  option === "delivery"
                    ? "border-primary bg-primary/[0.04] ring-1 ring-primary"
                    : "border-border bg-white hover:border-text"
                }`}
                aria-pressed={option === "delivery"}
              >
                <div className="flex flex-col items-center text-center h-full">
                  <Truck size={40} strokeWidth={1.75} className="text-text" />
                  <div className="mt-4 text-lg font-bold uppercase tracking-wide text-text">
                    Delivery
                  </div>
                  <p className="mt-4 text-sm text-text-secondary">
                    Delivered to your door
                  </p>
                </div>
              </button>

              <div
                className={`rounded-lg border overflow-hidden transition-colors ${
                  option === "collection"
                    ? "border-primary ring-1 ring-primary"
                    : "border-border"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setOption("collection")}
                  aria-pressed={option === "collection"}
                  className={`w-full text-left p-6 min-h-[220px] ${
                    option === "collection"
                      ? "bg-primary/[0.04]"
                      : "bg-white hover:bg-surface-muted"
                  }`}
                >
                  <div className="flex flex-col items-center text-center h-full">
                    <ShoppingBag
                      size={40}
                      strokeWidth={1.75}
                      className="text-text"
                    />
                    <div className="mt-4 text-lg font-bold uppercase tracking-wide text-text">
                      Click &amp; Collect
                    </div>
                    <p className="mt-4 text-sm text-text-secondary">
                      Collect from a nearby store
                    </p>
                  </div>
                </button>
                {option === "collection" && (
                  <div className="border-t border-border">
                    <div className="relative">
                      <select
                        value={selectedStoreId}
                        onChange={(e) => setSelectedStoreId(e.target.value)}
                        className="w-full h-14 pl-5 pr-10 bg-white text-sm text-text appearance-none focus:outline-none"
                      >
                        <option value="">Choose a store</option>
                        {stores.map((store) => (
                          <option key={store.id} value={store.id}>
                            {store.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        size={18}
                        className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-text"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="mt-4 rounded-lg bg-danger-50 border border-danger-700/30 px-4 py-3 text-sm text-danger-700">
                {error}
              </div>
            )}

            <div className="mt-12 flex justify-end">
              <button
                type="button"
                onClick={handleFinalConfirm}
                disabled={!canSaveFinal || isSaving}
                className="px-8 h-12 rounded-none bg-text text-white text-sm font-bold uppercase tracking-wide hover:bg-text/90 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {isSaving
                  ? "Saving..."
                  : option === "collection"
                    ? "Confirm collection"
                    : "Confirm delivery"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DeliveryDetailsAddAddress;
