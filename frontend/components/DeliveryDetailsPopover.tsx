import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { MapPin, Pencil, X } from "lucide-react";

type Variant = "popover" | "sheet";

export interface SavedAddressOption {
  id: string;
  source: "Billing" | "Shipping";
  type: "billing" | "shipping";
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
  onSelectSavedAddress?: (id: string) => void;
  onEditAddress?: (type: SavedAddressOption["type"]) => void;
}

export const DeliveryDetailsPopover: React.FC<DeliveryDetailsPopoverProps> = ({
  open,
  variant = "popover",
  isLoggedIn = false,
  savedAddresses = [],
  onClose,
  onDismiss,
  onAddDetails,
  onSelectSavedAddress,
  onEditAddress,
}) => {
  const hasSavedAddresses = isLoggedIn && savedAddresses.length > 0;
  // Billing + Shipping both stored (and different): nothing left to add.
  const hasMaxAddresses = hasSavedAddresses && savedAddresses.length >= 2;
  const containerRef = useRef<HTMLDivElement | null>(null);

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

  if (!open) return null;

  const bodyCopy = hasSavedAddresses ? (
    <p className="text-base leading-relaxed text-text">
      Choose one of your saved addresses, or add a new delivery address.
    </p>
  ) : (
    <p className="text-base leading-relaxed text-text">
      To view <strong className="font-bold">product availability</strong> and{" "}
      <strong className="font-bold">local pricing</strong> for your area, please
      add your delivery details before you start shopping.
    </p>
  );

  const savedList = hasSavedAddresses && (
    <ul className="space-y-2">
      {savedAddresses.map((addr) => (
        <li key={addr.id} className="relative">
          <button
            type="button"
            onClick={() => onSelectSavedAddress?.(addr.id)}
            className="w-full rounded-xl border border-border bg-white py-3 pl-4 pr-20 text-left transition-colors hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <div className="flex items-start gap-3">
              <MapPin size={18} className="mt-0.5 flex-shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <div className="mb-0.5 text-xs font-bold uppercase tracking-wide text-primary">
                  {addr.source}
                </div>
                <div className="text-sm font-medium text-text">{addr.line}</div>
              </div>
            </div>
          </button>
          <button
            type="button"
            onClick={() => onEditAddress?.(addr.type)}
            aria-label={`Edit ${addr.source.toLowerCase()} address`}
            className="absolute right-3 top-3 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-belims-blue underline-offset-4 hover:text-primary hover:underline"
          >
            <Pencil size={13} aria-hidden />
            Edit
          </button>
        </li>
      ))}
    </ul>
  );

  // Saved addresses: a single "Add new address" button. Otherwise "Do this later" + "Add delivery details".
  const actions = hasMaxAddresses ? null : hasSavedAddresses ? (
    <button
      type="button"
      onClick={onAddDetails}
      className="w-full rounded-md bg-belims-blue px-5 py-3 font-condensed text-lg font-bold uppercase tracking-wide text-white underline underline-offset-4 transition-colors hover:bg-belims-blue/90 focus:outline-none focus:ring-2 focus:ring-primary/60"
    >
      Add new address
    </button>
  ) : (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onDismiss}
        className="flex-none whitespace-nowrap rounded-pill border-2 border-border bg-white px-5 py-3 font-condensed text-lg font-bold text-text-secondary transition-colors hover:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-primary/40"
      >
        Do this later
      </button>
      <button
        type="button"
        onClick={onAddDetails}
        className="min-w-0 flex-1 whitespace-nowrap rounded-pill bg-belims-blue px-4 py-3 font-condensed text-lg font-bold text-white underline underline-offset-4 transition-colors hover:bg-belims-blue/90 focus:outline-none focus:ring-2 focus:ring-primary/60"
      >
        Add delivery details
      </button>
    </div>
  );

  const content = (
    <div className="space-y-4">
      {bodyCopy}
      {savedList}
      {actions}
      {!isLoggedIn && (
        <Link
          to="/login"
          onClick={onClose}
          className="inline-block font-condensed text-lg font-bold text-belims-blue underline underline-offset-4 hover:text-primary"
        >
          Log in to see your saved addresses
        </Link>
      )}
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
          className="fixed bottom-0 left-0 right-0 z-[1401] rounded-t-2xl bg-white p-5 pb-8 shadow-[0_-12px_40px_-8px_rgba(0,0,0,0.25)]"
        >
          <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-border" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 text-text-tertiary hover:text-text"
          >
            <X size={20} />
          </button>
          {content}
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
      className="absolute left-0 top-full z-[1300] mt-3 w-[380px] rounded-xl bg-white p-5 text-text shadow-[0_16px_40px_-12px_rgba(0,0,0,0.25)]"
    >
      <span
        aria-hidden="true"
        className="absolute -top-2 left-8 h-4 w-4 rotate-45 bg-white"
      />
      <div className="relative">{content}</div>
    </div>
  );
};
