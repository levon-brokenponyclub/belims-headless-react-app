import { ShippingAddress } from "../types";

export const DELIVERY_ADDRESS_STORAGE_KEY = "deliveryAddressV2";
export const DELIVERY_ADDRESS_LEGACY_KEY = "deliveryAddress";

export const PROVINCES = [
  "Eastern Cape",
  "Free State",
  "Gauteng",
  "KwaZulu-Natal",
  "Limpopo",
  "Mpumalanga",
  "Northern Cape",
  "North West",
  "Western Cape",
] as const;

const PROVINCE_ALIASES: Record<string, string> = {
  "KwaZulu Natal": "KwaZulu-Natal",
  "KwaZulu Natal Province": "KwaZulu-Natal",
  "KwaZulu-Natal Province": "KwaZulu-Natal",
  KZN: "KwaZulu-Natal",
  "North-West": "North West",
  "North West Province": "North West",
  "North-West Province": "North West",
  "Eastern Cape Province": "Eastern Cape",
  "Free State Province": "Free State",
  "Gauteng Province": "Gauteng",
  "Limpopo Province": "Limpopo",
  "Mpumalanga Province": "Mpumalanga",
  "Northern Cape Province": "Northern Cape",
  "Western Cape Province": "Western Cape",
};

export const normalizeProvince = (value?: string | null): string => {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";

  const alias = PROVINCE_ALIASES[trimmed];
  if (alias) return alias;

  const cleaned = trimmed
    .replace(/\s+Province$/i, "")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const directMatch = PROVINCES.find(
    (province) => province.toLowerCase() === cleaned.toLowerCase(),
  );

  return directMatch || "";
};

export const buildAddressLabel = (address: ShippingAddress): string => {
  const parts = [address.city, address.province].filter(Boolean);
  return parts.join(", ");
};

export const readStoredAddress = (): {
  address: ShippingAddress | null;
  legacyLabel: string | null;
} => {
  const legacyLabel = localStorage.getItem(DELIVERY_ADDRESS_LEGACY_KEY);
  const raw = localStorage.getItem(DELIVERY_ADDRESS_STORAGE_KEY);
  if (!raw) {
    return { address: null, legacyLabel };
  }

  try {
    const parsed = JSON.parse(raw) as ShippingAddress;
    if (parsed && parsed.country === "ZA") {
      return { address: parsed, legacyLabel };
    }
  } catch {
    // ignore parsing errors
  }

  return { address: null, legacyLabel };
};

export const saveStoredAddress = (address: ShippingAddress | null) => {
  if (!address) {
    localStorage.removeItem(DELIVERY_ADDRESS_STORAGE_KEY);
    localStorage.removeItem(DELIVERY_ADDRESS_LEGACY_KEY);
    return;
  }

  const label = address.label || buildAddressLabel(address);
  const payload: ShippingAddress = {
    ...address,
    label,
  };

  localStorage.setItem(DELIVERY_ADDRESS_STORAGE_KEY, JSON.stringify(payload));
  localStorage.setItem(DELIVERY_ADDRESS_LEGACY_KEY, label);
};

export const mapNominatimAddress = (data: any): ShippingAddress | null => {
  const address = data?.address;
  if (!address) return null;

  const city =
    address.city ||
    address.town ||
    address.village ||
    address.municipality ||
    address.county ||
    "";

  const province = normalizeProvince(
    address.state || address.province || address.state_district,
  );

  const postalCode = address.postcode || "";

  const streetParts = [
    address.house_number,
    address.road,
    address.suburb,
    address.neighbourhood || address.neighborhood,
    address.city_district,
  ].filter(Boolean);

  const street = streetParts.join(" ").trim();

  const draft: ShippingAddress = {
    street,
    city,
    province,
    postalCode,
    country: "ZA",
  };

  const label =
    buildAddressLabel(draft) ||
    (typeof data.display_name === "string"
      ? data.display_name.split(",").slice(0, 2).join(",").trim()
      : "");

  return { ...draft, label };
};
