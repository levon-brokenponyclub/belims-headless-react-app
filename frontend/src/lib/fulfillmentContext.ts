import { ShippingAddress } from "../../types";
import {
  readStoredAddress,
  saveStoredAddress,
} from "../../services/shippingAddress";

export type SharedAddress = {
  street?: string;
  city?: string;
  province?: string;
  postalCode?: string;
};

export type PdpContext = {
  productId: string;
  title: string;
  price?: number;
  imageUrl?: string;
  category?: string;
  updatedAt: string;
};

export type SharedFulfillmentContext = {
  deliveryAddress: SharedAddress | null;
  deliveryLocationSet: boolean;
  pickupStoreId: string | null;
  pickupStoreName: string | null;
  pickupStoreHours?: Record<
    string,
    {
      open?: string;
      close?: string;
      breakStart?: string;
      breakEnd?: string;
      closed?: boolean;
      note?: string;
    }
  >;
  selectedDeliveryOptionId: string | null;
  updatedAt: string;
  pdpContext: PdpContext | null;
};

const CHATBOT_FULFILLMENT_STORAGE_KEY = "belims:chatbot:fulfillment:v1";

const listeners = new Set<() => void>();

const emit = () => {
  listeners.forEach((listener) => listener());
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("belims:fulfillment-context-updated"));
  }
};

const nowIso = () => new Date().toISOString();

const toSharedAddress = (
  address: ShippingAddress | null,
): SharedAddress | null => {
  if (!address) {
    return null;
  }

  return {
    street: address.street,
    city: address.city,
    province: address.province,
    postalCode: address.postalCode,
  };
};

const toShippingAddress = (
  address: SharedAddress | null,
): ShippingAddress | null => {
  if (!address?.postalCode) {
    return null;
  }

  return {
    street: address.street ?? "",
    city: address.city ?? "",
    province: address.province ?? "",
    postalCode: address.postalCode,
    country: "ZA",
    label:
      [address.street, address.city, address.province].filter(Boolean).join(", ") ||
      address.postalCode,
  };
};

const hasDeliveryLocation = (address: SharedAddress | ShippingAddress | null) =>
  Boolean(address?.postalCode || (address?.city && address?.province));

const withStoredDeliveryAddress = (
  context: SharedFulfillmentContext,
): SharedFulfillmentContext => {
  if (context.deliveryAddress) {
    return context;
  }

  const { address } = readStoredAddress();
  const sharedAddress = toSharedAddress(address);
  if (!sharedAddress) {
    return context;
  }

  return {
    ...context,
    deliveryAddress: sharedAddress,
    deliveryLocationSet: hasDeliveryLocation(sharedAddress),
  };
};

const defaultState: SharedFulfillmentContext = {
  deliveryAddress: null,
  deliveryLocationSet: false,
  pickupStoreId: null,
  pickupStoreName: null,
  selectedDeliveryOptionId: null,
  updatedAt: nowIso(),
  pdpContext: null,
};

let state: SharedFulfillmentContext = { ...defaultState };

const persistSnapshot = (next: SharedFulfillmentContext) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      CHATBOT_FULFILLMENT_STORAGE_KEY,
      JSON.stringify(next),
    );
  } catch {
    // no-op
  }
};

const applyState = (next: SharedFulfillmentContext) => {
  state = next;
  persistSnapshot(next);
  emit();
};

export const getFulfillmentContext = (): SharedFulfillmentContext => state;

export const subscribeFulfillmentContext = (
  listener: () => void,
): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const hydrateFromSiteStorage = (): SharedFulfillmentContext => {
  if (typeof window === "undefined") {
    return state;
  }

  const { address } = readStoredAddress();
  const storedPickup = window.localStorage.getItem("selectedPickupStore");
  const selectedDeliveryOptionId =
    window.sessionStorage.getItem("selectedDeliveryOptionId") ||
    state.selectedDeliveryOptionId ||
    null;

  let pickupStoreId: string | null = null;
  let pickupStoreName: string | null = null;
  let pickupStoreHours: SharedFulfillmentContext["pickupStoreHours"];

  if (storedPickup) {
    try {
      const parsed = JSON.parse(storedPickup) as {
        id?: string;
        name?: string;
        hours?: SharedFulfillmentContext["pickupStoreHours"];
      };
      pickupStoreId = parsed.id ?? null;
      pickupStoreName = parsed.name ?? null;
      pickupStoreHours = parsed.hours;
    } catch {
      pickupStoreId = null;
      pickupStoreName = null;
      pickupStoreHours = undefined;
    }
  }

  const merged: SharedFulfillmentContext = {
    ...state,
    deliveryAddress: toSharedAddress(address),
    deliveryLocationSet: hasDeliveryLocation(address),
    pickupStoreId,
    pickupStoreName,
    pickupStoreHours,
    selectedDeliveryOptionId,
    updatedAt: nowIso(),
  };

  applyState(merged);
  return merged;
};

export const persistToSiteStorage = (
  context: SharedFulfillmentContext = state,
) => {
  if (typeof window === "undefined") {
    return;
  }

  const nextContext = withStoredDeliveryAddress(context);
  const shippingAddress = toShippingAddress(nextContext.deliveryAddress);
  if (shippingAddress) {
    saveStoredAddress(shippingAddress);
  }

  if (nextContext.pickupStoreId) {
    const payload = {
      id: nextContext.pickupStoreId,
      name: nextContext.pickupStoreName ?? "Selected store",
      hours: nextContext.pickupStoreHours,
    };
    window.localStorage.setItem("selectedPickupStore", JSON.stringify(payload));
    window.localStorage.setItem("pickupStoreSelected", "true");
  }

  if (nextContext.selectedDeliveryOptionId) {
    window.sessionStorage.setItem(
      "selectedDeliveryOptionId",
      nextContext.selectedDeliveryOptionId,
    );
  } else {
    window.sessionStorage.removeItem("selectedDeliveryOptionId");
  }

  state = nextContext;
  persistSnapshot(nextContext);
};

export const setDeliveryAddress = (address: SharedAddress | null) => {
  const next: SharedFulfillmentContext = {
    ...state,
    deliveryAddress: address,
    deliveryLocationSet: hasDeliveryLocation(address),
    selectedDeliveryOptionId: null,
    updatedAt: nowIso(),
  };
  applyState(next);
  persistToSiteStorage(next);
};

export const setPickupStore = (
  storeId: string | null,
  storeName: string | null,
  storeHours?: SharedFulfillmentContext["pickupStoreHours"],
) => {
  const next: SharedFulfillmentContext = {
    ...state,
    pickupStoreId: storeId,
    pickupStoreName: storeName,
    pickupStoreHours: storeHours,
    updatedAt: nowIso(),
  };
  applyState(next);
  persistToSiteStorage(next);
};

export const setSelectedDeliveryOption = (optionId: string | null) => {
  const next: SharedFulfillmentContext = {
    ...state,
    selectedDeliveryOptionId: optionId,
    updatedAt: nowIso(),
  };
  applyState(next);
  persistToSiteStorage(next);
};

export const setPdpContext = (
  context: Omit<PdpContext, "updatedAt"> | null,
) => {
  const next: SharedFulfillmentContext = {
    ...state,
    pdpContext: context
      ? {
          ...context,
          updatedAt: nowIso(),
        }
      : null,
    updatedAt: nowIso(),
  };
  applyState(next);
};

if (typeof window !== "undefined") {
  try {
    const raw = window.localStorage.getItem(CHATBOT_FULFILLMENT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SharedFulfillmentContext>;
      state = {
        ...defaultState,
        ...parsed,
        updatedAt: parsed.updatedAt ?? nowIso(),
      };
    }
  } catch {
    state = { ...defaultState };
  }
}
