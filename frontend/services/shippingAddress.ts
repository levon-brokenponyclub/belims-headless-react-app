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
  const parts = [address.street, address.city, address.province].filter(
    Boolean,
  );
  return parts.join(", ");
};

export const readStoredAddress = (): {
  address: ShippingAddress | null;
  legacyLabel: string | null;
} => {
  const legacyLabel = localStorage.getItem(DELIVERY_ADDRESS_LEGACY_KEY);
  const raw = localStorage.getItem(DELIVERY_ADDRESS_STORAGE_KEY);
  const legacyPostalCode = legacyLabel?.trim() || "";
  if (!raw) {
    if (/^\d{4}$/.test(legacyPostalCode)) {
      return {
        address: {
          street: "",
          city: "",
          province: "",
          postalCode: legacyPostalCode,
          country: "ZA",
          label: legacyPostalCode,
        },
        legacyLabel,
      };
    }

    return { address: null, legacyLabel };
  }

  try {
    const parsed = JSON.parse(raw) as ShippingAddress;
    if (parsed) {
      const normalizedCountry = (parsed.country || "ZA").toUpperCase();
      if (normalizedCountry === "ZA") {
        return {
          address: {
            ...parsed,
            country: "ZA",
            label:
              parsed.label ||
              buildAddressLabel(parsed) ||
              parsed.postalCode ||
              legacyPostalCode,
          },
          legacyLabel,
        };
      }
    }
  } catch {
  }
  return { address: null, legacyLabel };
};

export const saveStoredAddress = (address: ShippingAddress | null) => {
  if (!address) {
    localStorage.removeItem(DELIVERY_ADDRESS_STORAGE_KEY);
    localStorage.removeItem(DELIVERY_ADDRESS_LEGACY_KEY);
    return;
  }

  const label = address.label || buildAddressLabel(address) || address.postalCode;
  const payload: ShippingAddress = {
    ...address,
    country: "ZA",
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
    suburb: address.suburb || address.neighbourhood || address.neighborhood || "",
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

export const resolveAddressFromPostalCode = async (
  postalCode: string,
): Promise<ShippingAddress | null> => {
  const trimmedPostalCode = postalCode.trim();
  if (!trimmedPostalCode) return null;

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&countrycodes=za&addressdetails=1&limit=5&q=${encodeURIComponent(`${trimmedPostalCode} South Africa`)}`,
    );

    if (!response.ok) return null;

    const results = (await response.json()) as any[];
    if (!Array.isArray(results)) return null;

    for (const result of results) {
      const mapped = mapNominatimAddress(result);
      if (mapped?.city && mapped?.province) {
        return {
          ...mapped,
          postalCode: mapped.postalCode || trimmedPostalCode,
        };
      }
    }
  } catch {
    return null;
  }

  return null;
};

// ─── Postal-code-only location (guest address pill) ───

export interface PostalCodeSuggestion {
  id: string;
  postalCode: string;
  suburb: string;
  city: string;
  province: string;
}

const pickSuburb = (address: any): string =>
  address?.suburb ||
  address?.neighbourhood ||
  address?.neighborhood ||
  address?.quarter ||
  address?.village ||
  address?.town ||
  address?.city ||
  "";

export const buildPostalCodeAddress = (location: {
  postalCode: string;
  suburb?: string;
  city?: string;
  province?: string;
}): ShippingAddress => {
  const place = location.suburb || location.city || "";
  return {
    street: "",
    city: location.city || location.suburb || "",
    province: normalizeProvince(location.province),
    postalCode: location.postalCode,
    country: "ZA",
    label: [location.postalCode, place].filter(Boolean).join(", "),
  };
};

const toSuggestion = (
  result: any,
  fallbackPostalCode: string,
): PostalCodeSuggestion | null => {
  const mapped = mapNominatimAddress(result);
  if (!mapped) return null;
  const postalCode = (result?.address?.postcode || fallbackPostalCode).trim();
  if (postalCode !== fallbackPostalCode) return null;
  const suburb = pickSuburb(result.address);
  if (!suburb && !mapped.city) return null;
  return {
    id: `${postalCode}|${suburb}|${mapped.city}`.toLowerCase(),
    postalCode,
    suburb,
    city: mapped.city,
    province: mapped.province,
  };
};

export const searchPostalCodeSuggestions = async (
  postalCode: string,
  signal?: AbortSignal,
): Promise<PostalCodeSuggestion[]> => {
  const code = postalCode.trim();
  if (!/^\d{4}$/.test(code)) return [];

  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&countrycodes=za&addressdetails=1&limit=10&postalcode=${encodeURIComponent(code)}`,
    { signal },
  );
  if (!response.ok) return [];

  const results = (await response.json()) as any[];
  if (!Array.isArray(results)) return [];

  const seen = new Set<string>();
  const out: PostalCodeSuggestion[] = [];
  for (const result of results) {
    const suggestion = toSuggestion(result, code);
    if (!suggestion || seen.has(suggestion.id)) continue;
    seen.add(suggestion.id);
    out.push(suggestion);
  }
  return out;
};

export type LocationErrorCode = "unsupported" | "denied" | "not_found";

export class LocationError extends Error {
  code: LocationErrorCode;
  constructor(code: LocationErrorCode) {
    super(code);
    this.code = code;
  }
}

export const detectPostalCodeFromLocation =
  async (): Promise<ShippingAddress> => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      throw new LocationError("unsupported");
    }

    const position = await new Promise<GeolocationPosition>(
      (resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 300000,
        }),
    ).catch((error: GeolocationPositionError) => {
      throw new LocationError(error?.code === 1 ? "denied" : "not_found");
    });

    const { latitude, longitude } = position.coords;
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
    ).catch(() => null);
    if (!response?.ok) throw new LocationError("not_found");

    const data = await response.json();
    const postalCode = (data?.address?.postcode || "").trim();
    if (!/^\d{4}$/.test(postalCode)) throw new LocationError("not_found");

    const mapped = mapNominatimAddress(data);
    return buildPostalCodeAddress({
      postalCode,
      suburb: pickSuburb(data.address),
      city: mapped?.city,
      province: mapped?.province,
    });
  };
