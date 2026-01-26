// frontend/components/TrackingProgressCard.tsx
import React, { useMemo, useState } from "react";
import {
  Package,
  Truck,
  Route as RouteIcon,
  MapPin,
  CheckCircle2,
  RefreshCcw,
  Copy,
  Sparkles,
  TimerReset,
} from "lucide-react";
import type { ShipmentRaw, TrackResponse } from "../services/tracking";

// Derive checkpoint item type from ShipmentRaw (no need to import ShipmentCheckpoint)
type ShipmentCheckpoint = NonNullable<ShipmentRaw["checkpoints"]>[number];

type StepKey =
  | "created"
  | "collected"
  | "in_transit"
  | "out_for_delivery"
  | "delivered";

const TRACK_STEPS: {
  key: StepKey;
  label: string;
  Icon: React.ComponentType<{ size?: number }>;
  match: (s: string) => boolean;
}[] = [
  {
    key: "created",
    label: "Created",
    Icon: Package,
    match: (s) =>
      s.includes("created") ||
      s.includes("submitted") ||
      s.includes("booked") ||
      s.includes("pending collection") ||
      s.includes("pending"),
  },
  {
    key: "collected",
    label: "Collected",
    Icon: Truck,
    match: (s) => s.includes("collected") || s.includes("collection"),
  },
  {
    key: "in_transit",
    label: "In transit",
    Icon: RouteIcon,
    match: (s) =>
      s.includes("in transit") ||
      s.includes("transit") ||
      s.includes("linehaul"),
  },
  {
    key: "out_for_delivery",
    label: "Out for delivery",
    Icon: MapPin,
    match: (s) =>
      s.includes("out for delivery") ||
      s.includes("delivery run") ||
      s.includes("driver") ||
      s.includes("on route"),
  },
  {
    key: "delivered",
    label: "Delivered",
    Icon: CheckCircle2,
    match: (s) => s.includes("delivered") || s.includes("complete"),
  },
];

function normalizeStatus(status?: string): string {
  return (status || "").toLowerCase().trim();
}

function activeStepIndexFromStatus(status?: string): number {
  const s = normalizeStatus(status);
  if (!s) return 0;
  if (s.includes("pending collection")) return 0;
  const idx = TRACK_STEPS.findIndex((st) => st.match(s));
  return idx >= 0 ? idx : 0;
}

function safeDate(value: unknown): Date | null {
  if (!value) return null;
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function formatFriendlyDate(value: unknown) {
  const d = safeDate(value);
  if (!d) return value ? String(value) : "";
  return d.toLocaleString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatEtaText(eta?: unknown) {
  if (!eta) return "";
  const text = String(eta);

  if (text.includes("–")) return text;
  if (text.includes(" - ")) return text.replace(" - ", " – ");

  const cleaned = text.replace(" ", "T"); // "2026-01-26 16:02:42+00:00"
  const d = safeDate(cleaned);
  if (d) {
    return d.toLocaleDateString(undefined, {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  }

  return text;
}

type NormalizedEvent = {
  label: string;
  timestamp: string;
  location?: string;
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
  };
  events: NormalizedEvent[];
};

function pickNonEmptyString(v: unknown) {
  return typeof v === "string" && v.trim() ? v.trim() : "";
}

function eventLabelFromCheckpoint(cp: ShipmentCheckpoint): string {
  const anyCp = cp as Record<string, unknown>;
  return (
    pickNonEmptyString(anyCp.status_friendly) ||
    pickNonEmptyString(anyCp.status_description) ||
    pickNonEmptyString(anyCp.status) ||
    pickNonEmptyString(anyCp.message) ||
    "Tracking update"
  );
}

function eventLocationFromCheckpoint(cp: ShipmentCheckpoint): string {
  const anyCp = cp as Record<string, unknown>;
  return (
    pickNonEmptyString(anyCp.location) ||
    pickNonEmptyString(anyCp.city) ||
    pickNonEmptyString(anyCp.zone) ||
    pickNonEmptyString(anyCp.country) ||
    ""
  );
}

function eventTimeFromCheckpoint(cp: ShipmentCheckpoint): string {
  const anyCp = cp as Record<string, unknown>;
  return (
    pickNonEmptyString(anyCp.timestamp) ||
    pickNonEmptyString(anyCp.time) ||
    pickNonEmptyString(anyCp.created_at) ||
    ""
  );
}

function badgeFromStatus(status?: string) {
  const s = normalizeStatus(status);
  if (s.includes("delivered") || s.includes("complete")) return "Delivered";
  if (
    s.includes("out for delivery") ||
    s.includes("driver") ||
    s.includes("on route")
  )
    return "Out for delivery";
  if (
    s.includes("transit") ||
    s.includes("in transit") ||
    s.includes("linehaul")
  )
    return "In transit";
  if (s.includes("collected") || s.includes("collection")) return "Collected";
  return "Pending collection";
}

export function normalizeTrackingResult(data: TrackResponse): {
  normalized: NormalizedTracking;
  shipment: ShipmentRaw | null;
  checkpoints: ShipmentCheckpoint[];
} {
  const trackingRef = (data?.trackingRef || "").toUpperCase();

  const shipment =
    Array.isArray(data.raw) && data.raw.length
      ? (data.raw[0] as ShipmentRaw)
      : null;

  const status =
    shipment?.current_status ||
    shipment?.status ||
    data?.status ||
    "Pending collection";

  const etaText = formatEtaText(
    shipment?.expected_delivery_date || data?.etaText || (data as any)?.eta,
  );

  const checkpoints: ShipmentCheckpoint[] = Array.isArray(shipment?.checkpoints)
    ? (shipment!.checkpoints as ShipmentCheckpoint[])
    : [];

  let events: NormalizedEvent[] = [];

  if (checkpoints.length) {
    events = checkpoints
      .map((cp) => ({
        label: eventLabelFromCheckpoint(cp),
        timestamp: eventTimeFromCheckpoint(cp),
        location: eventLocationFromCheckpoint(cp) || undefined,
      }))
      .filter((e) => e.label || e.timestamp);
  } else if (Array.isArray(data.events)) {
    events = data.events
      .map((ev) => ({
        label:
          pickNonEmptyString((ev as any).label) ||
          pickNonEmptyString((ev as any).status) ||
          "Tracking update",
        timestamp: String((ev as any).timestamp || (ev as any).time || ""),
        location: pickNonEmptyString((ev as any).location) || undefined,
      }))
      .filter((e) => e.label || e.timestamp);
  }

  // newest first
  events.sort((a, b) => {
    const da = safeDate(a.timestamp)?.getTime() ?? 0;
    const db = safeDate(b.timestamp)?.getTime() ?? 0;
    return db - da;
  });

  const lastUpdated = events?.[0]?.timestamp
    ? formatFriendlyDate(events[0].timestamp)
    : "";

  const details = {
    orderNo:
      shipment?.order_number ||
      (shipment as any)?.channel_order_number ||
      (shipment as any)?.custom_order_name,
    courier:
      shipment?.courier ||
      (shipment as any)?.courier_name ||
      (shipment as any)?.courier_slug,
    serviceLevel: shipment?.service_level,
  };

  return {
    normalized: {
      trackingRef,
      status,
      statusBadge: badgeFromStatus(status),
      etaText: etaText || undefined,
      lastUpdated: lastUpdated || undefined,
      details,
      events,
    },
    shipment,
    checkpoints,
  };
}

export const TrackingProgressCard = ({
  data,
  shipment,
  onRefresh,
  isRefreshing,
  autoRefresh,
  onToggleAutoRefresh,
}: {
  data: NormalizedTracking;
  shipment: ShipmentRaw | null;
  checkpoints: ShipmentCheckpoint[];
  onRefresh: () => void;
  isRefreshing: boolean;
  autoRefresh: boolean;
  onToggleAutoRefresh: (v: boolean) => void;
}) => {
  const [newestFirst, setNewestFirst] = useState(true);

  const activeIdx = activeStepIndexFromStatus(data.status);
  const progressPct =
    TRACK_STEPS.length === 1 ? 0 : (activeIdx / (TRACK_STEPS.length - 1)) * 100;

  const badgeTone =
    data.statusBadge === "Delivered"
      ? "bg-green-50 text-green-700 border-green-200"
      : data.statusBadge === "Out for delivery"
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : data.statusBadge === "In transit"
          ? "bg-blue-50 text-belims-blue border-blue-200"
          : "bg-gray-50 text-gray-700 border-gray-200";

  const copyLink = async () => {
    const link = `${window.location.origin}/track-order?order-number=${encodeURIComponent(
      data.trackingRef,
    )}`;
    try {
      await navigator.clipboard.writeText(link);
      alert("Tracking link copied ✅");
    } catch {
      // eslint-disable-next-line no-alert
      prompt("Copy this tracking link:", link);
    }
  };

  const courier =
    data.details?.courier ||
    shipment?.courier ||
    (shipment as any)?.courier_name ||
    "—";
  const serviceLevel =
    data.details?.serviceLevel || shipment?.service_level || "—";
  const orderNo = data.details?.orderNo || shipment?.order_number || "—";
  const etaText = data.etaText || "—";

  const orderedEvents = useMemo(() => {
    const events = Array.isArray(data.events) ? data.events : [];
    return newestFirst ? events : [...events].reverse();
  }, [data.events, newestFirst]);

  return (
    <div className="space-y-5">
      {/* Header / Summary Card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 md:px-6 md:py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-belims-blue">
                <Package size={18} />
              </div>

              <div className="min-w-0">
                <div className="text-xs text-gray-500">Tracking reference</div>
                <div className="text-lg font-extrabold tracking-tight text-gray-900 font-heading truncate">
                  {data.trackingRef}
                </div>
              </div>

              <span
                className={`ml-auto md:ml-0 inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold ${badgeTone}`}
              >
                <Sparkles size={14} />
                {data.statusBadge}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
              {courier !== "—" ? (
                <span className="inline-flex items-center rounded-full bg-gray-50 border border-gray-200 px-3 py-1">
                  Courier: <span className="ml-1 font-bold">{courier}</span>
                </span>
              ) : null}

              {serviceLevel !== "—" ? (
                <span className="inline-flex items-center rounded-full bg-gray-50 border border-gray-200 px-3 py-1">
                  Service:{" "}
                  <span className="ml-1 font-bold">{serviceLevel}</span>
                </span>
              ) : null}

              {data.etaText ? (
                <span className="inline-flex items-center rounded-full bg-gray-50 border border-gray-200 px-3 py-1">
                  ETA: <span className="ml-1 font-bold">{data.etaText}</span>
                </span>
              ) : null}

              {data.lastUpdated ? (
                <span className="inline-flex items-center rounded-full bg-gray-50 border border-gray-200 px-3 py-1">
                  <TimerReset size={14} className="mr-1" />
                  Updated:{" "}
                  <span className="ml-1 font-bold">{data.lastUpdated}</span>
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={copyLink}
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 transition"
            >
              <Copy size={16} />
              Copy link
            </button>

            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 transition disabled:opacity-60"
            >
              <RefreshCcw
                size={16}
                className={isRefreshing ? "animate-spin" : ""}
              />
              {isRefreshing ? "Refreshing" : "Refresh"}
            </button>
          </div>
        </div>

        {/* Progress */}
        <div className="px-5 pb-5 md:px-6 md:pb-6">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Order tracking</span>

            <label className="inline-flex items-center gap-2 select-none">
              <span className="font-semibold text-gray-600">Auto-refresh</span>
              <button
                type="button"
                onClick={() => onToggleAutoRefresh(!autoRefresh)}
                className={[
                  "relative h-6 w-11 rounded-full border transition",
                  autoRefresh
                    ? "bg-belims-blue border-belims-blue"
                    : "bg-gray-200 border-gray-300",
                ].join(" ")}
              >
                <span
                  className={[
                    "absolute top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-white shadow transition",
                    autoRefresh ? "left-6" : "left-1",
                  ].join(" ")}
                />
              </button>
            </label>
          </div>

          <div className="relative mt-4">
            <div className="h-[3px] bg-gray-200 rounded-full" />
            <div
              className="absolute top-0 left-0 h-[3px] bg-belims-blue rounded-full transition-[width] duration-800 ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <div className="mt-6 grid grid-cols-5 gap-2 md:gap-4">
            {TRACK_STEPS.map((step, idx) => {
              const Icon = step.Icon;
              const isDone = idx < activeIdx;
              const isActive = idx === activeIdx;

              return (
                <div key={step.key} className="flex flex-col items-center">
                  <div
                    className={[
                      "relative flex h-12 w-12 items-center justify-center rounded-full transition-all transition-transform duration-300",
                      isDone
                        ? "bg-belims-blue text-white shadow-md"
                        : isActive
                          ? "bg-white border-2 border-belims-blue text-belims-blue shadow-sm"
                          : "bg-gray-100 text-gray-400",
                    ].join(" ")}
                    style={
                      {
                        transform: isDone ? "scale(1.06)" : "scale(1)",
                        animation: isActive
                          ? "softPulse 2.3s ease-in-out infinite"
                          : undefined,
                      } as React.CSSProperties
                    }
                  >
                    <Icon size={20} />
                  </div>

                  <div className="mt-3 text-[11px] md:text-xs font-bold uppercase tracking-wide text-gray-600 text-center">
                    {step.label}
                  </div>

                  {idx === activeIdx && data.events?.length ? (
                    <div className="mt-1 text-[11px] text-gray-500 tabular-nums text-center">
                      {formatFriendlyDate(data.events[0]?.timestamp)}
                    </div>
                  ) : (
                    <div className="mt-1 h-[14px]" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Shipping details */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-extrabold text-gray-900 font-heading">
              Shipping details
            </div>
            <div className="mt-1 text-sm text-gray-600">
              Live updates from Bob Go
            </div>
          </div>

          <div className="shrink-0">
            <span
              className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-bold ${badgeTone}`}
            >
              {data.statusBadge}
            </span>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="rounded-xl border border-gray-100 p-4">
            <div className="text-gray-500">Shipment</div>
            <div className="font-bold text-gray-900">{data.trackingRef}</div>

            <div className="mt-3 text-gray-500">Order</div>
            <div className="font-bold text-gray-900">{String(orderNo)}</div>
          </div>

          <div className="rounded-xl border border-gray-100 p-4">
            <div className="text-gray-500">Service level</div>
            <div className="font-bold text-gray-900">{serviceLevel}</div>

            <div className="mt-3 text-gray-500">Courier</div>
            <div className="font-bold text-gray-900">{courier}</div>

            <div className="mt-3 text-gray-500">Estimated delivery</div>
            <div className="font-bold text-gray-900 tabular-nums">
              {etaText}
            </div>
          </div>
        </div>
      </div>

      {/* Events timeline */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 md:p-6">
        <div className="flex items-center justify-between">
          <div className="text-lg font-extrabold text-gray-900 font-heading">
            Tracking events
          </div>
          <button
            type="button"
            onClick={() => setNewestFirst((v) => !v)}
            className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-bold text-gray-700 hover:bg-gray-50 transition"
          >
            {newestFirst ? "Newest first" : "Oldest first"}
          </button>
        </div>

        {orderedEvents.length > 0 ? (
          <div className="mt-5 relative">
            <div className="absolute left-[11px] top-1 bottom-1 w-[2px] bg-gray-100" />

            <div className="space-y-4">
              {orderedEvents.map((ev, idx) => (
                <div
                  key={idx}
                  className="relative pl-10"
                  style={{
                    opacity: 1,
                    transform: "translateY(0px)",
                    transition: "all 250ms ease",
                    transitionDelay: `${idx * 35}ms`,
                  }}
                >
                  <div
                    className={[
                      "absolute left-[3px] top-[6px] h-5 w-5 rounded-full border-2 flex items-center justify-center",
                      idx === 0
                        ? "border-belims-blue bg-blue-50"
                        : "border-gray-200 bg-white",
                    ].join(" ")}
                  >
                    <div
                      className={[
                        "h-2.5 w-2.5 rounded-full",
                        idx === 0 ? "bg-belims-blue" : "bg-gray-300",
                      ].join(" ")}
                    />
                  </div>

                  <div className="rounded-xl border border-gray-100 bg-white p-4 hover:border-gray-200 hover:shadow-sm transition">
                    <div className="flex items-start justify-between gap-3">
                      <div className="font-bold text-gray-900">
                        {ev.label?.trim() || "Status update"}
                      </div>
                      <div className="text-xs text-gray-500 tabular-nums">
                        {ev.timestamp ? formatFriendlyDate(ev.timestamp) : "—"}
                      </div>
                    </div>

                    <div className="mt-1 text-sm text-gray-600">
                      {ev.location?.trim() || "—"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-gray-200 p-5 text-sm text-gray-600">
            No tracking events yet. Your shipment will update once Bob Go
            registers the first scan.
          </div>
        )}
      </div>

      <style>{`
        @keyframes softPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(30, 64, 175, .18); }
          50% { box-shadow: 0 0 0 12px rgba(30, 64, 175, 0); }
        }
      `}</style>
    </div>
  );
};
