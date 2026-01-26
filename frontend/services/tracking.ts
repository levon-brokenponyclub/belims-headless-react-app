// frontend/services/tracking.ts

export type TrackingApiEvent = {
  label?: string | null;
  timestamp?: string | null;
  location?: string | null;
  status?: string | null;
  time?: string | null;
  raw?: any;
  [key: string]: unknown;
};

export type TrackingApiResponse = {
  success?: boolean;
  trackingRef?: string | null;
  status?: string | null;
  eta?: string | null;
  etaText?: string | null;
  details?: unknown;
  events?: TrackingApiEvent[] | null;
  raw?: any;
  [key: string]: unknown;
};

export type NormalizedEvent = {
  label: string;
  timestamp: string;
  location?: string;
  status?: string;
};

export type NormalizedTracking = {
  trackingRef: string;
  status: string;
  statusBadge: string;
  etaText?: string;
  lastUpdated?: string;
  details?: {
    orderNo?: string | number;
    courier?: string;
    serviceLevel?: string;
    customer?: string;
  };
  events: NormalizedEvent[];
};

// --- Raw Bob Go / Woo tracking payload shapes (for UI components that read `raw[0].checkpoints`) ---

export type ShipmentCheckpoint = {
  status?: string | null;
  status_description?: string | null;
  location?: string | null;
  timestamp?: string | null;
  [key: string]: unknown;
};

export type ShipmentRaw = {
  tracking_reference?: string | null;
  status?: string | null;
  current_status?: string | null;
  expected_delivery_date?: string | null;
  courier?: string | null;
  service_level?: string | null;
  order_number?: string | null;
  customer?: string | null;
  checkpoints?: ShipmentCheckpoint[] | null;
  [key: string]: unknown;
};

// Minimal shape used by `TrackOrderPage` + `TrackingProgressCard`
export type TrackResponse = {
  trackingRef: string;
  status: string;
  etaText?: string;
  details?: {
    orderNo?: string;
    courier?: string;
    serviceLevel?: string;
  };
  events: Array<{
    label: string;
    timestamp: string;
    location?: string;
    status?: string;
  }>;
  raw?: ShipmentRaw[];
  [key: string]: unknown;
};
