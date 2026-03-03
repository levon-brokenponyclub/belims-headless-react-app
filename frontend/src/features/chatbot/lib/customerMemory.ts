import {
  createDefaultCustomerContext,
  CustomerContext,
} from "../context/customerContext";

const LOCAL_KEY = "belims_ai_context";

let currentContext: CustomerContext | null = null;
let currentUserId: string | undefined;

const nowIso = () => new Date().toISOString();

const safeJsonParse = <T>(raw: string | null): T | null => {
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

const loadLocalContext = (): CustomerContext | null => {
  if (typeof window === "undefined") {
    return null;
  }

  return safeJsonParse<CustomerContext>(window.localStorage.getItem(LOCAL_KEY));
};

const saveLocalContext = (context: CustomerContext): void => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(context));
  } catch {
    // ignore local persistence issues
  }
};

const mergeContexts = (
  base: CustomerContext,
  override?: Partial<CustomerContext> | null,
): CustomerContext => ({
  ...base,
  ...(override ?? {}),
  lastViewedCategories:
    override?.lastViewedCategories ?? base.lastViewedCategories ?? [],
  lastViewedProducts:
    override?.lastViewedProducts ?? base.lastViewedProducts ?? [],
  recentPurchases: override?.recentPurchases ?? base.recentPurchases ?? [],
  preferredBrands: override?.preferredBrands ?? base.preferredBrands ?? [],
  frequentlyBoughtCategories:
    override?.frequentlyBoughtCategories ??
    base.frequentlyBoughtCategories ??
    [],
  preferredPriceRange:
    override?.preferredPriceRange ?? base.preferredPriceRange ?? {},
  lastSessionContext:
    override?.lastSessionContext ?? base.lastSessionContext ?? {},
  updatedAt: nowIso(),
});

export async function loadCustomerContext(
  userId?: string,
): Promise<CustomerContext> {
  const local = loadLocalContext();
  const base = mergeContexts(createDefaultCustomerContext(userId), local);

  let resolved = base;

  if (userId) {
    try {
      // TODO: Replace with authenticated customer context endpoint when backend is ready.
      const response = await fetch(
        `/api/customer/context?userId=${encodeURIComponent(userId)}`,
      );
      if (response.ok) {
        const remote = (await response.json()) as Partial<CustomerContext>;
        resolved = mergeContexts(base, remote);
      }
    } catch {
      // fallback to local-only context
    }
  }

  resolved = {
    ...resolved,
    userId,
    isReturning:
      resolved.isReturning ||
      resolved.lastViewedProducts.length > 0 ||
      resolved.recentPurchases.length > 0,
    updatedAt: nowIso(),
  };

  currentContext = resolved;
  currentUserId = userId;
  saveLocalContext(resolved);

  return resolved;
}

export async function saveCustomerContext(
  context: CustomerContext,
): Promise<void> {
  const payload: CustomerContext = {
    ...context,
    updatedAt: nowIso(),
  };

  currentContext = payload;
  currentUserId = payload.userId;
  saveLocalContext(payload);

  if (!payload.userId) {
    return;
  }

  try {
    // TODO: Replace with secure backend persistence with auth/session checks.
    await fetch("/api/customer/context", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    // local copy remains source of truth for resiliency
  }
}

export async function updateCustomerContext(
  partialUpdate: Partial<CustomerContext>,
): Promise<void> {
  const base =
    currentContext ??
    (await loadCustomerContext(currentUserId ?? partialUpdate.userId));

  const merged = mergeContexts(base, partialUpdate);
  await saveCustomerContext(merged);
}

export function getCurrentCustomerContext(): CustomerContext | null {
  return currentContext;
}
