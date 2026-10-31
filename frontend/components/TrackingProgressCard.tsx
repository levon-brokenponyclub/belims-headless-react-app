// frontend/components/TrackingProgressCard.tsx
// Track Order result: model (normalisation of the Bob Go payload) + presentation (header, stepper, summary, timeline).
import React, { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Copy,
  MapPin,
  Package,
  Phone,
  RefreshCcw,
  Route as RouteIcon,
  Store,
  Truck,
  Mail,
} from "lucide-react";
import type { Order } from "../types";
import type { ShipmentCheckpoint, ShipmentRaw, TrackResponse } from "../services/tracking";
import {
  formatTrackingDate,
  formatTrackingDateTime,
  formatTrackingDay,
  formatTrackingTime,
  parseTrackingDate,
  trackingDayKey,
} from "../services/tracking";
import { formatCurrency } from "../utils/price";

/* ------------------------------------------------------------------ model */

export type StatusKey =
  | "pending"
  | "collected"
  | "in_transit"
  | "out_for_delivery"
  | "ready_for_pickup"
  | "delivered"
  | "returned"
  | "exception"
  | "unknown";

type Tone = "ok" | "info" | "warn" | "err" | "neutral";

const STATUS_META: Record<StatusKey, { label: string; tone: Tone; terminal: boolean }> = {
  pending: { label: "Pending collection", tone: "neutral", terminal: false },
  collected: { label: "Collected", tone: "info", terminal: false },
  in_transit: { label: "In transit", tone: "info", terminal: false },
  out_for_delivery: { label: "Out for delivery", tone: "info", terminal: false },
  ready_for_pickup: { label: "Ready for pickup", tone: "info", terminal: false },
  delivered: { label: "Delivered", tone: "ok", terminal: true },
  returned: { label: "Returned", tone: "warn", terminal: true },
  exception: { label: "Delivery problem", tone: "err", terminal: false },
  unknown: { label: "Status update", tone: "neutral", terminal: false },
};

export function statusKeyFrom(status?: string | null): StatusKey {
  const s = (status || "").toLowerCase().replace(/[-_]+/g, " ").trim();
  if (!s) return "pending";
  if (s.includes("deliver") && !s.includes("out for") && !s.includes("fail") && !s.includes("undeliver") && !s.includes("attempt")) return "delivered";
  if (s.includes("return")) return "returned";
  if (/(fail|exception|undeliver|attempt|lost|damag|cancel|held|delay|problem|refus|unable)/.test(s)) return "exception";
  if (s.includes("ready for pickup") || s.includes("ready for collection")) return "ready_for_pickup";
  if (s.includes("out for delivery") || s.includes("on route") || s.includes("driver")) return "out_for_delivery";
  if (s.includes("transit") || s.includes("linehaul")) return "in_transit";
  if (s.includes("pending")) return "pending";
  if (s.includes("collect")) return "collected";
  return "unknown";
}

export type TrackingStep = {
  key: string;
  label: string;
  state: "done" | "current" | "pending";
  /** Formatted "5 Oct 2026, 21:26"; empty when the courier did not record one (e.g. skipped steps). */
  at: string;
  /** Marked done by Bob Go without a timestamp (the courier jumped ahead). Shown as completed. */
  implied: boolean;
};

export type TrackingEventView = {
  id: string;
  iso: string;
  dayKey: string;
  day: string;
  time: string;
  title: string;
  description: string;
  location: string;
};

export type NormalizedTracking = {
  trackingRef: string;
  statusKey: StatusKey;
  statusLabel: string;
  tone: Tone;
  isTerminal: boolean;
  courier: string;
  courierPhone: string;
  serviceLevel: string;
  orderNo: string;
  createdAt: string;
  deliveredAt: string;
  lastUpdated: string;
  estimated: string;
  steps: TrackingStep[];
  events: TrackingEventView[];
  pickup: { header: string; instructions: string; provider: string } | null;
};

const MANUAL_SET = /^\s*manually set by\b.*$/i;

/** Staff names are not for customers: "Manually set by <name>" → "Updated by Belims team". */
const publicMessage = (message?: string | null) => {
  const text = (message || "").trim();
  if (!text) return "";
  return MANUAL_SET.test(text) ? "Updated by Belims team" : text;
};

const clean = (v: unknown) => (typeof v === "string" ? v.trim() : "");

function eventLocation(cp: ShipmentCheckpoint) {
  const parts = [clean(cp.location), clean(cp.city), clean(cp.zone), clean(cp.country)].filter(Boolean);
  return [...new Set(parts)].join(", ");
}

const STEP_ALIASES: Record<string, string> = {
  created: "created",
  collected: "collected",
  "in-transit": "in-transit",
  "out-for-delivery": "out-for-delivery",
  "ready-for-pickup": "ready-for-pickup",
  delivered: "delivered",
};

function buildSteps(shipment: ShipmentRaw, statusKey: StatusKey): TrackingStep[] {
  const movement = shipment.shipment_movement_events || {};
  const fallbackTime: Record<string, unknown> = {
    created: shipment.shipment_time_created,
    collected: movement.collected_time,
    "in-transit": movement.in_transit_time,
    "out-for-delivery": movement.out_for_delivery_time,
    "ready-for-pickup": movement.ready_for_pickup_time,
    delivered: movement.delivered_time,
  };

  let source = Object.entries(shipment.tracking_steps || {})
    .map(([key, step]) => ({
      key: STEP_ALIASES[key] || key,
      label: clean(step.label) || key,
      stage: step.stage || "pending",
      time: clean(step.time) || clean(fallbackTime[key]),
      n: Number(step.step_number) || 99,
    }))
    .sort((a, b) => a.n - b.n);

  if (source.length === 0) {
    // No step data from Bob Go: derive from the status.
    const order: [string, string][] = [
      ["created", "Created"],
      ["collected", "Collected"],
      ["in-transit", "In transit"],
      ["out-for-delivery", "Out for delivery"],
      ["delivered", "Delivered"],
    ];
    const reached = { pending: 0, collected: 1, in_transit: 2, out_for_delivery: 3, ready_for_pickup: 3, delivered: 4, returned: 4, exception: 2, unknown: 0 }[statusKey];
    source = order.map(([key, label], i) => ({
      key,
      label,
      stage: i < reached ? "done" : i === reached ? "current" : "pending",
      time: clean(fallbackTime[key]),
      n: i + 1,
    }));
  }

  const lastTimed = source.reduce((acc, s, i) => (s.time ? i : acc), -1);
  const delivered = statusKey === "delivered";

  return source.map((s, i) => {
    const state: TrackingStep["state"] = delivered ? "done" : s.stage === "done" ? "done" : s.stage === "current" ? "current" : "pending";
    return {
      key: s.key,
      label: s.label,
      state,
      at: formatTrackingDateTime(s.time),
      implied: state === "done" && !s.time && i < lastTimed,
    };
  });
}

function buildEvents(shipment: ShipmentRaw): TrackingEventView[] {
  const checkpoints: ShipmentCheckpoint[] =
    Array.isArray(shipment.checkpoints) && shipment.checkpoints.length
      ? shipment.checkpoints
      : (shipment.grouped_checkpoints || []).flatMap((g) => g.checkpoints || []);

  return checkpoints
    .map((cp, index) => {
      const iso = clean(cp.time) || clean(cp.timestamp);
      const key: StatusKey = statusKeyFrom(cp.status || cp.status_friendly);
      return {
        id: `${iso}-${index}`,
        iso,
        dayKey: trackingDayKey(iso),
        day: formatTrackingDay(iso),
        time: formatTrackingTime(iso) || clean(cp.time_string),
        title: clean(cp.status_friendly) || clean(cp.status_description) || clean(cp.status) || STATUS_META[key].label,
        description: publicMessage(cp.message),
        location: eventLocation(cp),
      };
    })
    .filter((e) => e.title || e.iso)
    .sort((a, b) => (parseTrackingDate(b.iso)?.getTime() ?? 0) - (parseTrackingDate(a.iso)?.getTime() ?? 0));
}

function buildEstimate(shipment: ShipmentRaw, fallback?: string) {
  const from = formatTrackingDate(shipment.shipment_estimated_delivery_date_from || shipment.shipment_earliest_delivery_date);
  const to = formatTrackingDate(shipment.shipment_estimated_delivery_date_to);
  if (from && to && from !== to) return `${from} – ${to}`;
  return from || to || formatTrackingDate(shipment.expected_delivery_date) || clean(fallback);
}

/** One entry per shipment in the response. Empty array = the reference was not found. */
export function normalizeTrackingResult(data: TrackResponse): { shipments: NormalizedTracking[] } {
  const raw = Array.isArray(data?.raw) ? (data.raw as ShipmentRaw[]) : [];
  const shipments = raw
    .filter((s) => s && typeof s === "object")
    .map((shipment) => {
      const statusText = clean(shipment.status) || clean(shipment.current_status) || clean(data?.status);
      const statusKey = statusKeyFrom(statusText);
      const meta = STATUS_META[statusKey];
      const steps = buildSteps(shipment, statusKey);
      const events = buildEvents(shipment);
      const delivery = steps.find((s) => s.key === "delivered");
      const lastUpdated = formatTrackingDateTime(shipment.last_checkpoint_time) || (events[0] ? formatTrackingDateTime(events[0].iso) : "");
      const ref = clean(shipment.shipment_tracking_reference) || clean(shipment.id) || clean(shipment.tracking_reference) || clean(data?.trackingRef);

      return {
        trackingRef: ref.toUpperCase(),
        statusKey,
        statusLabel: statusKey === "unknown" ? clean(shipment.status_friendly) || meta.label : meta.label,
        tone: meta.tone,
        isTerminal: meta.terminal,
        courier: clean(shipment.courier_name) || clean(shipment.courier),
        courierPhone: clean(shipment.courier_phone),
        serviceLevel: clean(shipment.service_level),
        orderNo: clean(shipment.order_number) || clean(shipment.channel_order_number) || clean(shipment.custom_order_name),
        createdAt: formatTrackingDateTime(shipment.shipment_time_created),
        deliveredAt: statusKey === "delivered" ? delivery?.at || (events[0] ? formatTrackingDateTime(events[0].iso) : "") : "",
        lastUpdated,
        estimated: statusKey === "delivered" || statusKey === "returned" ? "" : buildEstimate(shipment, data?.etaText as string | undefined),
        steps,
        events,
        pickup: shipment.show_pickup_point_details
          ? {
              header: clean(shipment.pickup_point_header),
              instructions: clean(shipment.pickup_point_instructions),
              provider: clean(shipment.pickup_point_provider_name),
            }
          : null,
      } as NormalizedTracking;
    });
  return { shipments };
}

/* ----------------------------------------------------------- presentation */

const STEP_ICON: Record<string, React.ComponentType<{ size?: number; "aria-hidden"?: boolean }>> = {
  created: Package,
  collected: Truck,
  "in-transit": RouteIcon,
  "out-for-delivery": MapPin,
  "ready-for-pickup": Store,
  delivered: CheckCircle2,
};

const TONE_CLASS: Record<Tone, string> = {
  ok: "text-success",
  info: "text-belims-blue",
  warn: "text-stock-low",
  err: "text-error",
  neutral: "text-text-secondary",
};

const SUPPORT_PHONE = { label: "039 974 2082", href: "tel:+27399742082" };
const SUPPORT_EMAIL = "info@belims.co.za";

const btn =
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md border-2 border-belims-blue bg-white px-4 font-heading font-condensed text-button font-bold uppercase text-belims-blue transition-colors hover:bg-belims-blue hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-belims-blue focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none";

export const StatusPill: React.FC<{ label: string; tone: Tone }> = ({ label, tone }) => (
  <span
    className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-sm border border-current bg-white px-2 py-0.5 text-caption font-bold uppercase tracking-wide ${TONE_CLASS[tone]}`}
  >
    <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
    {label}
  </span>
);

const Stepper: React.FC<{ steps: TrackingStep[]; delivered: boolean }> = ({ steps, delivered }) => (
  <ol className="flex flex-col gap-4 sm:grid sm:auto-cols-fr sm:grid-flow-col sm:gap-0" aria-label="Shipment progress">
    {steps.map((step, index) => {
      const Icon = STEP_ICON[step.key] || Circle;
      const reached = step.state !== "pending";
      const isFinalDelivered = delivered && index === steps.length - 1;
      return (
        <li
          key={step.key}
          aria-current={step.state === "current" ? "step" : undefined}
          className={`relative flex items-start gap-3 sm:flex-col sm:items-center sm:gap-2 sm:text-center ${
            index > 0
              ? "before:absolute before:-top-4 before:left-5 before:h-4 before:w-0.5 before:content-[''] sm:before:left-auto sm:before:right-1/2 sm:before:top-5 sm:before:h-0.5 sm:before:w-full"
              : ""
          } ${index > 0 ? (reached ? "before:bg-belims-blue" : "before:bg-border") : ""}`}
        >
          <span
            className={`relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full motion-reduce:transition-none ${
              isFinalDelivered
                ? "bg-success text-white"
                : step.state === "done"
                  ? "bg-belims-blue text-white"
                  : step.state === "current"
                    ? "border-[3px] border-primary bg-white text-primary"
                    : "border-2 border-border bg-white text-text-tertiary"
            }`}
          >
            <Icon size={20} aria-hidden={true} />
          </span>
          <span className="min-w-0 pt-1 sm:pt-0">
            <span className={`block text-caption font-bold uppercase tracking-wide ${step.state === "pending" ? "text-text-tertiary" : "text-text"}`}>
              {step.label}
              <span className="sr-only">
                {" "}
                ({step.state === "done" ? "complete" : step.state === "current" ? "current step" : "upcoming"}
                {step.implied ? ", no scan recorded" : ""})
              </span>
            </span>
            {step.at && <span className="block text-caption tabular-nums text-text-secondary">{step.at}</span>}
          </span>
        </li>
      );
    })}
  </ol>
);

export const TrackingProgressCard = ({
  data,
  order,
  isRefreshing,
  autoRefresh,
  onToggleAutoRefresh,
  onRefresh,
  onAnnounce,
  headingRef,
}: {
  data: NormalizedTracking;
  /** The signed-in customer's matching order, when there is one. */
  order?: Order | null;
  isRefreshing: boolean;
  autoRefresh: boolean;
  onToggleAutoRefresh: (v: boolean) => void;
  onRefresh: () => void;
  onAnnounce: (message: string) => void;
  headingRef?: React.Ref<HTMLHeadingElement>;
}) => {
  const [newestFirst, setNewestFirst] = useState(true);
  const copyFallbackRef = useRef<HTMLInputElement>(null);
  const [copyFallback, setCopyFallback] = useState(false);

  const link = `${window.location.origin}/track-order?order-number=${encodeURIComponent(data.trackingRef)}`;
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      onAnnounce("Tracking link copied");
    } catch {
      setCopyFallback(true);
      window.setTimeout(() => copyFallbackRef.current?.select(), 0);
    }
  };

  const groups = useMemo(() => {
    const sorted = newestFirst ? data.events : [...data.events].reverse();
    const out: { dayKey: string; day: string; events: TrackingEventView[] }[] = [];
    sorted.forEach((event) => {
      const last = out[out.length - 1];
      if (last && last.dayKey === event.dayKey) last.events.push(event);
      else out.push({ dayKey: event.dayKey, day: event.day, events: [event] });
    });
    return out;
  }, [data.events, newestFirst]);

  const delivered = data.statusKey === "delivered";
  const problem = data.statusKey === "exception" || data.statusKey === "returned" || data.statusKey === "unknown";
  const showProblem = data.statusKey === "exception" || data.statusKey === "returned";

  const details: { label: string; value: React.ReactNode }[] = [
    {
      label: "Order",
      value: order ? (
        <Link to={`/account/orders/${encodeURIComponent(order.order_number)}`} className="inline-flex min-h-[44px] items-center font-bold text-belims-blue underline underline-offset-4 hover:text-primary">
          #{order.order_number}
        </Link>
      ) : (
        data.orderNo && `#${data.orderNo}`
      ),
    },
    { label: "Courier", value: data.courier },
    {
      label: "Courier phone",
      value: data.courierPhone ? (
        <a href={`tel:${data.courierPhone.replace(/[^+\d]/g, "")}`} className="inline-flex min-h-[44px] items-center font-bold underline underline-offset-4 hover:text-primary">
          {data.courierPhone}
        </a>
      ) : (
        ""
      ),
    },
    { label: "Service level", value: data.serviceLevel },
    { label: "Created", value: data.createdAt },
    { label: delivered ? "Delivered" : "Estimated delivery", value: delivered ? data.deliveredAt : data.estimated },
  ].filter((row) => row.value);

  const orderTotal = order ? parseFloat(order.total) || 0 : 0;

  return (
    <div className="space-y-6">
      {/* Header: reference once, status, courier + service, last update, actions */}
      <section aria-labelledby="trk-ref" className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-caption font-bold uppercase tracking-wider text-text-tertiary">Tracking reference</p>
          <h2
            id="trk-ref"
            ref={headingRef}
            tabIndex={-1}
            className="mt-0.5 break-all font-heading font-condensed text-h3 font-extrabold uppercase leading-none focus:outline-none"
          >
            {data.trackingRef}
          </h2>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-caption text-text-secondary">
            <StatusPill label={data.statusLabel} tone={data.tone} />
            {data.courier && (
              <span>
                {data.courier}
                {data.serviceLevel ? ` · ${data.serviceLevel}` : ""}
              </span>
            )}
            {data.lastUpdated && <span className="tabular-nums">Updated {data.lastUpdated}</span>}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={copyLink} className={btn}>
            <Copy size={16} aria-hidden="true" /> Copy link
          </button>
          {!data.isTerminal && (
            <>
              <button type="button" onClick={onRefresh} disabled={isRefreshing} className={btn}>
                <RefreshCcw size={16} aria-hidden="true" className={isRefreshing ? "animate-spin motion-reduce:animate-none" : ""} />
                {isRefreshing ? "Refreshing" : "Refresh"}
              </button>
              <button
                type="button"
                role="switch"
                aria-checked={autoRefresh}
                onClick={() => onToggleAutoRefresh(!autoRefresh)}
                className="inline-flex min-h-[44px] items-center gap-2 font-semibold text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-belims-blue focus-visible:ring-offset-2"
              >
                <span className={`relative h-6 w-11 rounded-full border transition-colors motion-reduce:transition-none ${autoRefresh ? "border-belims-blue bg-belims-blue" : "border-border-strong bg-surface-muted"}`}>
                  <span className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-white transition-all motion-reduce:transition-none ${autoRefresh ? "left-6" : "left-0.5"}`} />
                </span>
                Auto-refresh
              </button>
            </>
          )}
        </div>
        {copyFallback && (
          <div className="w-full">
            <label htmlFor="trk-link" className="mb-1 block text-caption font-bold uppercase tracking-wider text-text-secondary">
              Copy this link
            </label>
            <input id="trk-link" ref={copyFallbackRef} readOnly value={link} className="min-h-[44px] w-full rounded-md border border-border-strong px-3 text-base" onFocus={(e) => e.currentTarget.select()} />
          </div>
        )}
      </section>

      {delivered && (
        <section aria-labelledby="trk-delivered" className="flex flex-wrap items-center justify-between gap-3 rounded-md border-l-4 border-success bg-surface-muted p-4">
          <div>
            <h2 id="trk-delivered" className="font-heading font-condensed text-h4 font-extrabold uppercase text-success">
              {data.deliveredAt ? `Delivered on ${data.deliveredAt}` : "Delivered"}
            </h2>
            <p className="text-text-secondary">Your parcel has arrived. Something not right with it?</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a href={SUPPORT_PHONE.href} className={btn}>
              <Phone size={16} aria-hidden="true" /> {SUPPORT_PHONE.label}
            </a>
            <a href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`Order ${data.orderNo || data.trackingRef}`)}`} className={btn}>
              <Mail size={16} aria-hidden="true" /> Email us
            </a>
          </div>
        </section>
      )}

      {showProblem && (
        <section aria-labelledby="trk-problem" role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-md border-l-4 border-error bg-surface-muted p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle size={22} aria-hidden="true" className="mt-0.5 shrink-0 text-error" />
            <div>
              <h2 id="trk-problem" className="font-heading font-condensed text-h4 font-extrabold uppercase text-error">
                {data.statusKey === "returned" ? "This parcel is being returned" : "There's a problem with this delivery"}
              </h2>
              <p className="text-text-secondary">Please contact the Belims team and quote {data.orderNo ? `order #${data.orderNo}` : `reference ${data.trackingRef}`}.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <a href={SUPPORT_PHONE.href} className={btn}>
              <Phone size={16} aria-hidden="true" /> {SUPPORT_PHONE.label}
            </a>
            <a href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`Delivery problem: ${data.trackingRef}`)}`} className={btn}>
              <Mail size={16} aria-hidden="true" /> Email us
            </a>
          </div>
        </section>
      )}

      {/* Stepper */}
      <section aria-labelledby="trk-progress" className="border-y border-border py-6">
        <h2 id="trk-progress" className="sr-only">
          Shipment progress
        </h2>
        <Stepper steps={data.steps} delivered={delivered} />
      </section>

      {/* Events (left) + summary (right on desktop, first on mobile) */}
      <div className="grid gap-8 lg:grid-cols-12">
        <section aria-labelledby="trk-events" className="order-2 min-w-0 lg:order-1 lg:col-span-7">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 id="trk-events" className="font-heading font-condensed text-h4 font-extrabold uppercase">
              Tracking events
            </h2>
            {data.events.length > 1 && (
              <button
                type="button"
                onClick={() => setNewestFirst((v) => !v)}
                aria-label={`Sort order: ${newestFirst ? "newest first" : "oldest first"}. Activate to reverse.`}
                className="inline-flex min-h-[44px] items-center rounded-md border border-border-strong bg-white px-3 text-caption font-bold uppercase tracking-wide text-text hover:border-belims-blue hover:text-belims-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-belims-blue focus-visible:ring-offset-2"
              >
                {newestFirst ? "Newest first" : "Oldest first"}
              </button>
            )}
          </div>

          {groups.length > 0 ? (
            <div className="space-y-6">
              {groups.map((group) => (
                <div key={group.dayKey || group.day}>
                  <h3 className="mb-3 font-heading text-base font-bold text-text">{group.day}</h3>
                  <ol>
                    {group.events.map((event, i) => (
                      <li key={event.id} className="relative flex gap-4 pb-5 last:pb-0">
                        {i < group.events.length - 1 && <span className="absolute bottom-0 left-[5px] top-4 w-px bg-border" aria-hidden="true" />}
                        <span className={`relative z-10 mt-1.5 h-[11px] w-[11px] shrink-0 rounded-full ${i === 0 && group === groups[0] ? "bg-belims-blue" : "border-2 border-border-strong bg-white"}`} aria-hidden="true" />
                        <div className="min-w-0">
                          <p className="flex flex-wrap items-baseline gap-x-3">
                            {event.time && <time dateTime={event.iso} className="font-semibold tabular-nums text-text-secondary">{event.time}</time>}
                            <span className="font-bold text-text">{event.title}</span>
                          </p>
                          {event.description && <p className="text-text-secondary">{event.description}</p>}
                          {event.location && (
                            <p className="flex items-center gap-1 text-caption text-text-tertiary">
                              <MapPin size={12} aria-hidden="true" /> {event.location}
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-md border border-dashed border-border-strong p-5 text-text-secondary">
              No courier scans yet. Updates appear here as soon as the courier registers the first scan.
            </p>
          )}
        </section>

        <aside className="order-1 space-y-6 lg:order-2 lg:col-span-5" aria-label="Shipment summary">
          <section aria-labelledby="trk-details">
            <h2 id="trk-details" className="mb-3 font-heading font-condensed text-h4 font-extrabold uppercase">
              Shipment details
            </h2>
            <dl className="divide-y divide-border border-y border-border">
              {details.map((row) => (
                <div key={row.label} className="flex items-baseline justify-between gap-4 py-2.5">
                  <dt className="text-text-secondary">{row.label}</dt>
                  <dd className="text-right font-semibold text-text">{row.value}</dd>
                </div>
              ))}
            </dl>
            {data.pickup && (data.pickup.header || data.pickup.instructions || data.pickup.provider) && (
              <div className="mt-4 rounded-md border border-border p-4">
                <p className="font-bold">{data.pickup.header || "Pickup point"}</p>
                {data.pickup.provider && <p className="text-text-secondary">{data.pickup.provider}</p>}
                {data.pickup.instructions && <p className="mt-1 text-text-secondary">{data.pickup.instructions}</p>}
              </div>
            )}
          </section>

          {order && (
            <section aria-labelledby="trk-order">
              <h2 id="trk-order" className="mb-3 font-heading font-condensed text-h4 font-extrabold uppercase">
                Your order
              </h2>
              <ul className="divide-y divide-border border-y border-border">
                {order.line_items.map((line) => (
                  <li key={line.id} className="flex items-baseline justify-between gap-4 py-2.5">
                    <span className="min-w-0">
                      {line.name} <span className="text-text-secondary">× {line.quantity}</span>
                    </span>
                    <span className="font-semibold tabular-nums">{formatCurrency(parseFloat(line.total) || 0)}</span>
                  </li>
                ))}
                <li className="flex items-baseline justify-between gap-4 py-2.5 font-bold">
                  <span>Total</span>
                  <span className="tabular-nums">{formatCurrency(orderTotal)}</span>
                </li>
              </ul>
              <Link to={`/account/orders/${encodeURIComponent(order.order_number)}`} className="mt-3 inline-flex min-h-[44px] items-center font-bold text-belims-blue underline underline-offset-4 hover:text-primary">
                View order #{order.order_number}
              </Link>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
};
