import React, { useEffect, useRef, useState } from "react";
import { LocateFixed, MapPin, X } from "lucide-react";
import { ShippingAddress } from "../types";
import {
  buildPostalCodeAddress,
  detectPostalCodeFromLocation,
  LocationError,
  PostalCodeSuggestion,
  resolveAddressFromPostalCode,
  searchPostalCodeSuggestions,
} from "../services/shippingAddress";

type Variant = "popover" | "sheet";

export interface SavedAddressOption {
  id: string;
  source: "Billing" | "Shipping";
  line: string;
}

interface DeliveryDetailsPopoverProps {
  open: boolean;
  variant?: Variant;
  isLoggedIn?: boolean;
  savedAddresses?: SavedAddressOption[];
  onClose: () => void;
  onDismiss: () => void;
  onAddDetails: () => void;
  onSavePostalCode: (address: ShippingAddress) => void;
  onSelectSavedAddress?: (id: string) => void;
}

const LOCATION_ERROR_COPY: Record<LocationError["code"], string> = {
  unsupported:
    "Your browser doesn't support location. Please enter your postal code.",
  denied: "Location access was blocked. Please enter your postal code.",
  not_found:
    "We couldn't find a postal code for your location. Please enter it manually.",
};

export const DeliveryDetailsPopover: React.FC<DeliveryDetailsPopoverProps> = ({
  open,
  variant = "popover",
  isLoggedIn = false,
  savedAddresses = [],
  onClose,
  onDismiss,
  onAddDetails,
  onSavePostalCode,
  onSelectSavedAddress,
}) => {
  const hasSavedAddresses = isLoggedIn && savedAddresses.length > 0;
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [postalCode, setPostalCode] = useState("");
  const [suggestions, setSuggestions] = useState<PostalCodeSuggestion[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] =
    useState<PostalCodeSuggestion | null>(null);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValidPostalCode = /^\d{4}$/.test(postalCode);

  useEffect(() => {
    if (!open) return;
    setPostalCode("");
    setSuggestions([]);
    setSelectedSuggestion(null);
    setIsSuggestionsOpen(false);
    setIsSaving(false);
    setIsLocating(false);
    setError(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKey);
    document.addEventListener("mousedown", handleClick);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [open, onClose]);

  // Suburb suggestions once a full 4-digit postal code is typed
  useEffect(() => {
    if (!open || isLoggedIn || !isValidPostalCode || selectedSuggestion) {
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      searchPostalCodeSuggestions(postalCode, controller.signal)
        .then((results) => {
          setSuggestions(results);
          setIsSuggestionsOpen(results.length > 0);
        })
        .catch(() => setSuggestions([]));
    }, 300);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, isLoggedIn, postalCode, isValidPostalCode, selectedSuggestion]);

  if (!open) return null;

  const handlePostalCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPostalCode(e.target.value.replace(/\D/g, "").slice(0, 4));
    setSelectedSuggestion(null);
    setError(null);
  };

  const handleSelectSuggestion = (suggestion: PostalCodeSuggestion) => {
    setPostalCode(suggestion.postalCode);
    setSelectedSuggestion(suggestion);
    setIsSuggestionsOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidPostalCode || isSaving) return;
    setIsSaving(true);
    setError(null);

    if (selectedSuggestion) {
      onSavePostalCode(buildPostalCodeAddress(selectedSuggestion));
      return;
    }

    const resolved = await resolveAddressFromPostalCode(postalCode);
    onSavePostalCode(
      buildPostalCodeAddress({
        postalCode,
        city: resolved?.city,
        province: resolved?.province,
      }),
    );
  };

  const handleUseLocation = async () => {
    if (isLocating) return;
    setIsLocating(true);
    setError(null);
    try {
      onSavePostalCode(await detectPostalCodeFromLocation());
    } catch (err) {
      const code = err instanceof LocationError ? err.code : "not_found";
      setError(LOCATION_ERROR_COPY[code]);
      setIsLocating(false);
    }
  };

  // ─── Guest: postal code capture ───
  const guestContent = (
    <div>
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <h2 className="text-base font-bold text-text">
          Where are you browsing from?
        </h2>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Close"
          className="text-text-tertiary hover:text-text transition-colors"
        >
          <X size={20} />
        </button>
      </div>
      <p className="px-5 py-4 text-sm leading-relaxed text-text">
        To get the products available near you, kindly allow us to access your
        location.
      </p>
      <form
        onSubmit={handleSubmit}
        className="space-y-3 rounded-b-xl bg-surface-muted px-5 py-4"
      >
        <div className="flex items-start gap-2">
          <div className="relative flex-1">
            <label htmlFor="delivery-postal-code" className="sr-only">
              Postal code
            </label>
            <input
              id="delivery-postal-code"
              type="text"
              inputMode="numeric"
              autoComplete="postal-code"
              maxLength={4}
              value={postalCode}
              onChange={handlePostalCodeChange}
              onFocus={() => setIsSuggestionsOpen(suggestions.length > 0)}
              placeholder="Enter postal code"
              aria-autocomplete="list"
              aria-expanded={isSuggestionsOpen}
              className="w-full rounded-xl border-2 border-border bg-white px-4 py-2.5 text-sm font-medium text-text placeholder:text-text-tertiary focus:border-primary focus:outline-none transition-colors"
            />
            {isSuggestionsOpen && suggestions.length > 0 && (
              <ul
                role="listbox"
                className="absolute left-0 right-0 top-full z-10 mt-1 max-h-60 overflow-y-auto rounded-xl border border-border bg-white py-1"
              >
                {suggestions.map((suggestion) => (
                  <li key={suggestion.id} role="option" aria-selected={false}>
                    <button
                      type="button"
                      onClick={() => handleSelectSuggestion(suggestion)}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-text hover:bg-surface-muted transition-colors"
                    >
                      <MapPin
                        size={16}
                        className="flex-shrink-0 text-text-tertiary"
                      />
                      <span className="truncate">
                        {[
                          suggestion.suburb,
                          suggestion.city !== suggestion.suburb
                            ? suggestion.city
                            : "",
                          suggestion.province,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button
            type="submit"
            disabled={!isValidPostalCode || isSaving}
            className="rounded-xl bg-belims-blue px-5 py-2.5 text-sm font-bold text-white hover:bg-belims-blue/90 disabled:cursor-not-allowed disabled:bg-text-tertiary/60 transition-colors"
          >
            {isSaving ? "Saving…" : "Submit"}
          </button>
        </div>
        <button
          type="button"
          onClick={handleUseLocation}
          disabled={isLocating}
          className="inline-flex items-center gap-2 text-sm font-bold text-text hover:text-primary disabled:opacity-60 transition-colors"
        >
          <LocateFixed size={18} />
          {isLocating ? "Finding your location…" : "Use my location"}
        </button>
        {error && (
          <p role="alert" className="text-xs font-medium text-deal-sale">
            {error}
          </p>
        )}
      </form>
    </div>
  );

  // ─── Logged in: saved addresses ───
  const bodyCopy = hasSavedAddresses ? (
    <p className="text-sm leading-relaxed text-text">
      Choose one of your saved addresses, or add a new delivery address.
    </p>
  ) : (
    <p className="text-sm leading-relaxed text-text">
      To view <strong className="font-bold">product availability</strong> and{" "}
      <strong className="font-bold">local pricing</strong> for your area, please
      add your delivery details before you start shopping.
    </p>
  );

  const savedList = hasSavedAddresses && (
    <ul className="space-y-2">
      {savedAddresses.map((addr) => (
        <li key={addr.id}>
          <button
            type="button"
            onClick={() => onSelectSavedAddress?.(addr.id)}
            className="w-full text-left rounded-xl border border-border bg-white px-3 py-2.5 hover:border-primary hover:bg-primary/[0.03] transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <div className="flex items-start gap-2.5">
              <MapPin
                size={16}
                className="mt-0.5 flex-shrink-0 text-primary"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
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
  );

  const actions = (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={onDismiss}
        className="flex-1 min-w-[140px] rounded-pill border border-border bg-white px-5 py-3 text-sm font-bold text-text-secondary hover:bg-surface-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40"
      >
        Do this later
      </button>
      <button
        type="button"
        onClick={onAddDetails}
        className="flex-1 min-w-[180px] rounded-pill bg-belims-blue px-5 py-3 text-sm font-bold text-white underline underline-offset-4 hover:bg-belims-blue/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/60"
      >
        {hasSavedAddresses ? "Add new address" : "Add delivery details"}
      </button>
    </div>
  );

  const memberContent = (
    <div className="space-y-4">
      {bodyCopy}
      {savedList}
      {actions}
    </div>
  );

  if (variant === "sheet") {
    return (
      <>
        <div
          className="fixed inset-0 z-[1400] bg-black/40"
          onClick={onClose}
          aria-hidden="true"
        />
        <div
          ref={containerRef}
          role="dialog"
          aria-modal="true"
          aria-label="Add delivery details"
          className={`fixed bottom-0 left-0 right-0 z-[1401] rounded-t-2xl bg-white shadow-[0_-12px_40px_-8px_rgba(0,0,0,0.25)] ${
            isLoggedIn ? "p-5 pb-8" : "pt-3 pb-4"
          }`}
        >
          <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-border" />
          {isLoggedIn ? (
            <>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="absolute right-4 top-4 text-text-tertiary hover:text-text"
              >
                <X size={20} />
              </button>
              {memberContent}
            </>
          ) : (
            guestContent
          )}
        </div>
      </>
    );
  }

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="false"
      aria-label="Add delivery details"
      className={`absolute left-0 top-full z-[1300] mt-3 w-[380px] rounded-xl bg-white text-text shadow-[0_16px_40px_-12px_rgba(0,0,0,0.25)] ${
        isLoggedIn ? "p-5" : ""
      }`}
    >
      <span
        aria-hidden="true"
        className="absolute -top-2 left-8 h-4 w-4 rotate-45 bg-white"
      />
      <div className="relative">{isLoggedIn ? memberContent : guestContent}</div>
    </div>
  );
};
