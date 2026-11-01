import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Plus, Truck } from "lucide-react";
import { UserData, clearBillingAddress, clearShippingAddress } from "../../services/authService";
import { Notice } from "./Notice";
import { btnOutline, btnText, btnTextDanger, cardClass } from "./ui";

type AddressKey = "billing" | "shipping";

interface AddressesViewProps {
  user: UserData;
  defaultKey: AddressKey;
  /** Saves the address as the delivery default (also updates the header pill); owned by AccountPage. */
  onSetDefault: (key: AddressKey) => void;
}

const hasAddress = (a?: UserData["billing"]) => !!(a?.address_1 || a?.city || a?.postcode);

export const AddressesView: React.FC<AddressesViewProps> = ({ user, defaultKey, onSetDefault }) => {
  const navigate = useNavigate();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<AddressKey | null>(null);
  const [removing, setRemoving] = useState(false);

  const hasBilling = hasAddress(user.billing);
  const hasShipping = hasAddress(user.shipping);
  const addType: AddressKey | null = !hasBilling ? "billing" : !hasShipping ? "shipping" : null;

  const goToForm = (type: AddressKey, mode: "add" | "edit") => {
    setMessage(null);
    navigate(`/delivery-details/add-address?context=account&type=${type}&mode=${mode}`);
  };

  const remove = async (type: AddressKey) => {
    setRemoving(true);
    setMessage(null);
    try {
      if (type === "billing") await clearBillingAddress();
      else await clearShippingAddress();
      window.dispatchEvent(new Event("user-updated"));
      setMessage({ type: "success", text: "Address removed." });
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || "Failed to remove address." });
    } finally {
      setRemoving(false);
      setConfirmRemove(null);
    }
  };

  const setDefault = (type: AddressKey) => {
    onSetDefault(type);
    setMessage({ type: "success", text: "Default delivery address updated." });
  };

  const card = (type: AddressKey, title: string, Icon: typeof MapPin, a: NonNullable<UserData["billing"]>) => {
    const isDefault = defaultKey === type;
    const headingId = `address-${type}`;
    return (
      <section
        key={type}
        aria-labelledby={headingId}
        className={`${cardClass} p-5 ${isDefault ? "!border-2 !border-belims-blue" : ""}`}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id={headingId} className="flex items-center gap-2 font-heading font-condensed text-h5 font-extrabold uppercase">
            <Icon size={20} aria-hidden="true" className="text-belims-blue" />
            {title}
          </h2>
          {isDefault && (
            <span className="inline-flex items-center gap-1.5 rounded-sm border border-current bg-white px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-belims-blue">
              <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
              Default
            </span>
          )}
        </div>
        <address className="mt-3 space-y-0.5 not-italic text-text-secondary">
          <p className="font-bold text-text">
            {user.first_name} {user.last_name}
          </p>
          {a.address_1 && <p>{a.address_1}</p>}
          <p>{[a.city, a.state].filter(Boolean).join(", ")}</p>
          <p>{[a.postcode, a.country].filter(Boolean).join(" · ")}</p>
        </address>
        <div className="mt-4 border-t border-border pt-3">
          {confirmRemove === type ? (
            <div className="flex flex-wrap items-center gap-x-3">
              <span className="text-text-secondary">Remove this address?</span>
              <button type="button" onClick={() => remove(type)} disabled={removing} className={btnTextDanger}>
                {removing ? "Removing…" : "Yes, remove"}
              </button>
              <button type="button" onClick={() => setConfirmRemove(null)} className={btnText}>
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-x-2">
              <button type="button" onClick={() => goToForm(type, "edit")} className={btnText}>
                Edit<span className="sr-only"> {title.toLowerCase()}</span>
              </button>
              <button type="button" onClick={() => setConfirmRemove(type)} className={btnTextDanger}>
                Remove<span className="sr-only"> {title.toLowerCase()}</span>
              </button>
              {!isDefault && (
                <button type="button" onClick={() => setDefault(type)} className={`${btnText} ml-auto`}>
                  Set as default<span className="sr-only"> {title.toLowerCase()}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </section>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-text-secondary">
          Your default address is used for delivery quotes and shown in the site header.
        </p>
        {addType && (
          <button type="button" onClick={() => goToForm(addType, "add")} className={btnOutline}>
            <Plus size={16} aria-hidden="true" /> Add {addType} address
          </button>
        )}
      </div>

      {message && <Notice type={message.type}>{message.text}</Notice>}

      {hasBilling || hasShipping ? (
        <div className="grid gap-6 md:grid-cols-2">
          {hasShipping && user.shipping && card("shipping", "Shipping address", Truck, user.shipping)}
          {hasBilling && user.billing && card("billing", "Billing address", MapPin, user.billing)}
        </div>
      ) : (
        <section aria-labelledby="no-addresses" className={`${cardClass} p-8 text-center`}>
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-md bg-surface-muted text-belims-blue">
            <MapPin size={28} aria-hidden="true" />
          </span>
          <h2 id="no-addresses" className="mt-3 font-heading font-condensed text-h3 font-extrabold uppercase">
            No addresses saved
          </h2>
          <p className="mx-auto mt-1 max-w-md text-text-secondary">Add an address to get delivery quotes and faster checkout.</p>
        </section>
      )}
    </div>
  );
};
