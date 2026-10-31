// frontend/services/tracking.ts
// Types for POST belims/v1/track (Bob Go shipment tracking) and the shared date formatting for the Track Order page.

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

// --- Raw Bob Go payload (`raw[0]`) ---

export type ShipmentCheckpoint = {
  status?: string | null;
  status_friendly?: string | null;
  status_description?: string | null;
  /** Free-text from the courier / Bob Go, e.g. "Manually set by <staff>". */
  message?: string | null;
  location?: string | null;
  city?: string | null;
  zone?: string | null;
  country?: string | null;
  zip?: string | null;
  /** e.g. "2026-10-05 21:26:56+02:00" (space-separated, not ISO). */
  time?: string | null;
  time_string?: string | null;
  timestamp?: string | null;
  [key: string]: unknown;
};

export type ShipmentStep = {
  step_number?: number;
  label?: string;
  stage?: "done" | "current" | "pending" | string;
  time?: string | null;
  [key: string]: unknown;
};

export type ShipmentRaw = {
  id?: string | null;
  shipment_tracking_reference?: string | null;
  tracking_reference?: string | null;
  status?: string | null;
  status_friendly?: string | null;
  current_status?: string | null;
  courier_name?: string | null;
  courier_slug?: string | null;
  courier_phone?: string | null;
  courier?: string | null;
  service_level?: string | null;
  service_level_delivery_type?: string | null;
  merchant_name?: string | null;
  order_number?: string | null;
  channel_order_number?: string | null;
  custom_order_name?: string | null;
  shipment_time_created?: string | null;
  last_checkpoint_time?: string | null;
  checkpoints?: ShipmentCheckpoint[] | null;
  grouped_checkpoints?: { date?: string; checkpoints?: ShipmentCheckpoint[] }[] | null;
  tracking_steps?: Record<string, ShipmentStep> | null;
  shipment_movement_events?: Record<string, string | null> | null;
  has_ready_for_pickup_status?: boolean | null;
  show_pickup_point_details?: boolean | null;
  pickup_point_header?: string | null;
  pickup_point_instructions?: string | null;
  pickup_point_provider_name?: string | null;
  shipment_earliest_delivery_date?: string | null;
  shipment_estimated_delivery_date_from?: string | null;
  shipment_estimated_delivery_date_to?: string | null;
  expected_delivery_date?: string | null;
  [key: string]: unknown;
};

/** Response of POST belims/v1/track. Always HTTP 200 + success:true, even for an unknown reference (then `raw` is not an array). */
export type TrackResponse = {
  success?: boolean;
  trackingRef: string;
  status?: string | null;
  eta?: string | null;
  etaText?: string;
  /** Bob Go's stepper steps (label empty; real values in each `raw`). The page reads `raw[].tracking_steps` instead. */
  events?: unknown[];
  raw?: ShipmentRaw[] | { message?: string } | null;
  [key: string]: unknown;
};

// --- Date formatting: en-ZA, 24-hour, Africa/Johannesburg ---

const TZ = "Africa/Johannesburg";

/** Parses Bob Go timestamps ("2026-10-05 21:26:56+02:00" — space instead of "T", which older Safari rejects). */
export const parseTrackingDate = (value: unknown): Date | null => {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (!text) return null;
  const date = new Date(text.replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? null : date;
};

/** Day without zero padding: en-ZA pads short dates ("05 Oct"); the spec is "5 Oct 2026". */
const shortDate = (d: Date) => {
  const parts = new Intl.DateTimeFormat("en-ZA", { day: "numeric", month: "short", year: "numeric", timeZone: TZ }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${Number(get("day"))} ${get("month")} ${get("year")}`;
};

/** "5 Oct 2026, 21:26" */
export const formatTrackingDateTime = (value: unknown): string => {
  const d = parseTrackingDate(value);
  return d ? `${shortDate(d)}, ${formatTrackingTime(d)}` : "";
};

/** "5 Oct 2026" */
export const formatTrackingDate = (value: unknown): string => {
  const d = parseTrackingDate(value);
  return d ? shortDate(d) : "";
};

/** "21:26" */
export const formatTrackingTime = (value: unknown): string => {
  const d = value instanceof Date ? value : parseTrackingDate(value);
  return d ? d.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: TZ }) : "";
};

/** "Mon, 5 October 2026" — event group heading. */
export const formatTrackingDay = (value: unknown): string => {
  const d = parseTrackingDate(value);
  if (!d) return "";
  const parts = new Intl.DateTimeFormat("en-ZA", { weekday: "short", day: "numeric", month: "long", year: "numeric", timeZone: TZ }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("weekday")}, ${Number(get("day"))} ${get("month")} ${get("year")}`;
};

/** Stable key for grouping events by South African calendar day ("2026-10-05"). */
export const trackingDayKey = (value: unknown): string => {
  const d = parseTrackingDate(value);
  return d ? d.toLocaleDateString("en-CA", { timeZone: TZ }) : "";
};
