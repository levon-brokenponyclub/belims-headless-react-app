import { useMemo } from "react";
import type { SavedAddressOption } from "../components/DeliveryDetailsPopover";
import type { UserData } from "../services/authService";
import { saveStoredAddress } from "../services/shippingAddress";
import type { ShippingAddress } from "../types";

export interface SavedAddress extends SavedAddressOption {
  address: ShippingAddress;
}

/** The account's billing and shipping addresses (deduped), ready to use as the delivery address. */
export const useSavedAddresses = (user: UserData | null | undefined): SavedAddress[] =>
  useMemo(() => {
    if (!user) return [];
    const rows = [
      { source: "Billing" as const, raw: user.billing },
      { source: "Shipping" as const, raw: user.shipping },
    ];
    const out: SavedAddress[] = [];
    const seen = new Set<string>();
    for (const { source, raw } of rows) {
      const line1 = raw?.address_1?.trim() || "";
      if (!line1) continue;
      const city = raw?.city?.trim() || "";
      const dedupeKey = `${line1.toLowerCase()}|${city.toLowerCase()}|${(raw?.postcode || "").trim().toLowerCase()}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      const line = city ? `${line1}, ${city}` : line1;
      out.push({
        id: `${source.toLowerCase()}-${dedupeKey}`,
        source,
        type: source === "Billing" ? "billing" : "shipping",
        line,
        address: {
          street: line1,
          city,
          province: raw?.state || "",
          postalCode: raw?.postcode || "",
          country: "ZA",
          label: line,
        },
      });
    }
    return out;
  }, [user]);

export const editSavedAddressPath = (type: SavedAddressOption["type"]) =>
  `/delivery-details/add-address?context=account&type=${type}&mode=edit`;

/** Make an address the active delivery address; the header and product page refresh from the events. */
export const applyDeliveryAddress = (address: ShippingAddress) => {
  saveStoredAddress(address);
  try {
    localStorage.setItem("fulfillmentType", "delivery");
  } catch {}
  window.dispatchEvent(new Event("belims:delivery-address-updated"));
  window.dispatchEvent(new Event("belims:fulfillment-changed"));
};

export const isSameAddress = (a: ShippingAddress | null | undefined, b: ShippingAddress) =>
  Boolean(
    a &&
      a.street.trim().toLowerCase() === b.street.trim().toLowerCase() &&
      (a.city || "").trim().toLowerCase() === (b.city || "").trim().toLowerCase(),
  );
