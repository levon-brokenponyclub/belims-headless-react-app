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
  GP: "Gauteng",
  WC: "Western Cape",
  EC: "Eastern Cape",
  FS: "Free State",
  LP: "Limpopo",
  MP: "Mpumalanga",
  NC: "Northern Cape",
  NW: "North West",
  gp: "Gauteng",
  wc: "Western Cape",
  ec: "Eastern Cape",
  fs: "Free State",
  lp: "Limpopo",
  mp: "Mpumalanga",
  nc: "Northern Cape",
  nw: "North West",
};

const ISO_PROVINCE_CODES: Record<string, string> = {
  EC: "Eastern Cape",
  FS: "Free State",
  GP: "Gauteng",
  KZN: "KwaZulu-Natal",
  LP: "Limpopo",
  MP: "Mpumalanga",
  NC: "Northern Cape",
  NW: "North West",
  WC: "Western Cape",
};

export const normalizeProvince = (value?: string | null): string => {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";

  const exactMatch = PROVINCES.find(
    (province) => province.toLowerCase() === trimmed.toLowerCase(),
  );
  if (exactMatch) return exactMatch;

  const isoMatch = trimmed.match(/^ZA-([A-Z]{2,3})$/i);
  if (isoMatch) {
    const isoCode = isoMatch[1].toUpperCase();
    if (ISO_PROVINCE_CODES[isoCode]) {
      return ISO_PROVINCE_CODES[isoCode];
    }
  }

  const alias =
    PROVINCE_ALIASES[trimmed] || PROVINCE_ALIASES[trimmed.toLowerCase()];
  if (alias) return alias;

  const cleaned = trimmed
    .replace(/\s+Province$/i, "")
    .replace(/[-–—]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const directMatch = PROVINCES.find((province) => {
    const normalizedProvince = province
      .replace(/[-–—]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
    return normalizedProvince === cleaned.toLowerCase();
  });

  if (directMatch) return directMatch;

  const containsMatch = PROVINCES.find((province) =>
    cleaned.toLowerCase().includes(province.toLowerCase()),
  );

  return containsMatch || "";
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

  let province = normalizeProvince(
    address.state || address.province || address.state_district,
  );

  if (!province) {
    province = normalizeProvince(address["ISO3166-2-lvl4"]);
  }

  if (!province && typeof data?.display_name === "string") {
    const displayNameLower = data.display_name.toLowerCase();
    const matchedProvince = PROVINCES.find((candidate) =>
      displayNameLower.includes(candidate.toLowerCase()),
    );
    if (matchedProvince) {
      province = matchedProvince;
    }
  }

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
