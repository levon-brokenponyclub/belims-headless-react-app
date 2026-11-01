// frontend/components/TrackOrderPage.tsx
import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Mail, Phone, RefreshCcw, Search } from "lucide-react";
import type { TrackResponse } from "../services/tracking";
import { getAuthToken } from "../services/authService";
import { getApiBaseUrl } from "../services/wooCommerceService";
import { inputClass, pageTitleClass, primaryButtonClass } from "./ui/classes";
import { useCustomerOrders } from "../hooks/useCustomerOrders";
import { TrackingProgressCard, normalizeTrackingResult, StatusPill } from "./TrackingProgressCard";
import type { NormalizedTracking } from "./TrackingProgressCard";

const TRACK_ENDPOINT = getApiBaseUrl() + "/track";
const POLL_MS = 20000;

type Failure = { kind: "not-found" | "error"; message: string } | null;

const Skeleton: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`animate-pulse rounded-md bg-surface-muted motion-reduce:animate-none ${className}`} />
);

const LoadingSkeleton = () => (
  <div className="space-y-6" aria-busy="true" aria-label="Loading tracking information">
    <div className="space-y-3">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-9 w-56" />
      <Skeleton className="h-6 w-80 max-w-full" />
    </div>
    <Skeleton className="h-28 w-full" />
    <div className="grid gap-8 lg:grid-cols-12">
      <Skeleton className="h-56 w-full lg:col-span-7" />
      <Skeleton className="h-56 w-full lg:col-span-5" />
    </div>
  </div>
);

export const TrackOrderPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlRef = (searchParams.get("order-number") || "").trim();

  const [input, setInput] = useState(urlRef);
  const [inputError, setInputError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [failure, setFailure] = useState<Failure>(null);
  const [refreshFailed, setRefreshFailed] = useState(false);
  const [shipments, setShipments] = useState<NormalizedTracking[] | null>(null);
  const [selected, setSelected] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  const headingRef = useRef<HTMLHeadingElement>(null);
  const hasResult = useRef(false);
  const lastRef = useRef("");
  const focusResult = useRef(false);

  useEffect(() => setInput(urlRef), [urlRef]);

  // Signed-in customers: match the shipment to one of their orders (by tracking number, then order number).
  const signedIn = !!getAuthToken();
  const { orders } = useCustomerOrders(signedIn);

  const current = shipments?.[Math.min(selected, (shipments?.length ?? 1) - 1)] ?? null;
  const matchedOrder = useMemo(() => {
    if (!current || !orders.length) return null;
    return (
      orders.find((o) => o.tracking?.some((t) => t.tracking_number?.toUpperCase() === current.trackingRef)) ||
      (current.orderNo ? orders.find((o) => o.order_number === current.orderNo || String(o.id) === current.orderNo) : undefined) ||
      null
    );
  }, [current, orders]);

  const track = useCallback(async (value: string, mode: "initial" | "refresh" | "auto" = "initial") => {
    const ref = value.trim().toUpperCase();
    if (!ref) return;
    lastRef.current = ref;
    const isRefresh = mode !== "initial" && hasResult.current;

    if (isRefresh) setIsRefreshing(true);
    else {
      // A fresh lookup replaces the previous result (never leave another shipment on screen while loading).
      hasResult.current = false;
      setShipments(null);
      setLoading(true);
      setFailure(null);
    }
    setRefreshFailed(false);

    try {
      const res = await fetch(TRACK_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackingRef: ref }),
      });
      if (!res.ok) throw new Error(`Tracking request failed (${res.status})`);

      const data = (await res.json()) as TrackResponse;
      const { shipments: found } = normalizeTrackingResult(data);

      // The endpoint answers 200 + success:true for an unknown reference; no shipment object = not found.
      if (found.length === 0) {
        if (isRefresh) {
          setRefreshFailed(true);
        } else {
          hasResult.current = false;
          setShipments(null);
          setFailure({ kind: "not-found", message: ref });
        }
        return;
      }

      const previous = isRefresh ? shipments?.[0]?.statusLabel : "";
      hasResult.current = true;
      setShipments(found);
      setSelected((i) => (isRefresh ? Math.min(i, found.length - 1) : 0));
      if (mode === "initial") {
        setAnnouncement(`Tracking found: ${found[0].statusLabel}`);
        focusResult.current = true;
      } else if (previous && previous !== found[0].statusLabel) {
        setAnnouncement(`Status updated: ${found[0].statusLabel}`);
      } else {
        setAnnouncement("Tracking is up to date");
      }
    } catch {
      if (isRefresh) setRefreshFailed(true);
      else {
        hasResult.current = false;
        setShipments(null);
        setFailure({ kind: "error", message: "We couldn't reach the tracking service." });
      }
    } finally {
      if (isRefresh) setIsRefreshing(false);
      else setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shipments]);

  // Move focus to the result heading after an explicit lookup.
  useEffect(() => {
    if (focusResult.current && current) {
      focusResult.current = false;
      headingRef.current?.focus();
    }
  }, [current]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = input.trim().toUpperCase();
    if (!value) {
      setInputError("Enter your tracking reference, e.g. UASS33KZ.");
      return;
    }
    if (!/^[A-Z0-9-]{4,24}$/.test(value)) {
      setInputError("A tracking reference has letters and numbers only, e.g. UASS33KZ.");
      return;
    }
    setInputError("");
    if (value === urlRef) track(value, "initial");
    else setSearchParams({ "order-number": value }, { replace: true });
  };

  // Look up whenever the URL carries a reference (also the shareable-link behaviour).
  useEffect(() => {
    if (urlRef) track(urlRef, "initial");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlRef]);

  // Auto-refresh every 20s, paused in background tabs and stopped once the shipment is delivered / returned.
  const isTerminal = !!current?.isTerminal;
  useEffect(() => {
    if (!autoRefresh || isTerminal || !current) return;
    const ref = current.trackingRef;
    let id: number | null = null;
    const stop = () => {
      if (id !== null) window.clearInterval(id);
      id = null;
    };
    const start = () => {
      if (id === null) id = window.setInterval(() => !document.hidden && track(ref, "auto"), POLL_MS);
    };
    const onVisibility = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVisibility);
    if (!document.hidden) start();
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [autoRefresh, isTerminal, current?.trackingRef, track]);

  useEffect(() => {
    if (isTerminal) setAutoRefresh(false);
  }, [isTerminal]);

  // Title + noindex (tracking links are personal and should not be indexed).
  useEffect(() => {
    const previous = document.title;
    document.title = current ? `Track order ${current.trackingRef} · Belims` : "Track your order · Belims";
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex";
    document.head.appendChild(meta);
    return () => {
      document.title = previous;
      meta.remove();
    };
  }, [current?.trackingRef]);

  return (
    <div className="container mx-auto min-h-[60vh] max-w-[1100px] px-4 py-8 md:py-12">
      <h1 className={pageTitleClass}>Track your order</h1>
      <p className="mt-2 max-w-xl text-base text-text-secondary">Enter your tracking reference to see live updates from the courier.</p>

      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>

      <form onSubmit={onSubmit} noValidate className="mt-6">
        <label htmlFor="tracking-ref" className="mb-1 block text-caption font-bold uppercase tracking-wider text-text-secondary">
          Tracking reference
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            id="tracking-ref"
            name="tracking-ref"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. UASS33KZ"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            aria-invalid={inputError ? true : undefined}
            aria-describedby={inputError ? "tracking-ref-error" : "tracking-ref-hint"}
            className={`${inputClass} flex-1 font-semibold uppercase tracking-wide placeholder:font-normal placeholder:normal-case placeholder:tracking-normal`}
          />
          <button
            type="submit"
            disabled={loading}
            className={`${primaryButtonClass} px-6 motion-reduce:transition-none`}
          >
            {loading ? (
              <>
                <RefreshCcw size={16} aria-hidden="true" className="animate-spin motion-reduce:animate-none" /> Tracking…
              </>
            ) : (
              <>
                <Search size={16} aria-hidden="true" /> Track
              </>
            )}
          </button>
        </div>
        {inputError ? (
          <p id="tracking-ref-error" role="alert" className="mt-2 font-semibold text-error">
            {inputError}
          </p>
        ) : (
          <p id="tracking-ref-hint" className="mt-2 text-caption text-text-tertiary">
            You'll find it in your shipping email or under Orders in your account.
          </p>
        )}
      </form>

      <div className="mt-8">
        {loading && !shipments && <LoadingSkeleton />}

        {!loading && failure?.kind === "not-found" && (
          <section aria-labelledby="trk-not-found" className="rounded-md border border-border p-6 md:p-8">
            <h2 id="trk-not-found" className="font-heading font-condensed text-h3 font-extrabold uppercase">
              We couldn't find {failure.message}
            </h2>
            <p className="mt-2 max-w-xl text-text-secondary">
              Check the reference for typos. A new shipment can take a little while to appear after it ships — try again shortly, or contact us and we'll look it up.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <a href="tel:+27399742082" className="inline-flex min-h-[44px] items-center gap-2 font-bold text-belims-blue underline underline-offset-4 hover:text-primary">
                <Phone size={16} aria-hidden="true" /> 039 974 2082
              </a>
              <a href="mailto:info@belims.co.za" className="inline-flex min-h-[44px] items-center gap-2 font-bold text-belims-blue underline underline-offset-4 hover:text-primary">
                <Mail size={16} aria-hidden="true" /> info@belims.co.za
              </a>
              {signedIn && (
                <Link to="/account/orders" className="inline-flex min-h-[44px] items-center font-bold text-belims-blue underline underline-offset-4 hover:text-primary">
                  Find it in your orders
                </Link>
              )}
            </div>
          </section>
        )}

        {!loading && failure?.kind === "error" && (
          <section role="alert" aria-labelledby="trk-error" className="rounded-md border-l-4 border-error bg-surface-muted p-5">
            <h2 id="trk-error" className="font-heading font-condensed text-h4 font-extrabold uppercase text-error">
              Tracking is unavailable right now
            </h2>
            <p className="mt-1 text-text-secondary">{failure.message} Please try again in a moment.</p>
            <button
              type="button"
              onClick={() => track(lastRef.current || urlRef, "initial")}
              className="mt-3 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md border-2 border-belims-blue bg-white px-4 font-heading font-condensed text-button font-bold uppercase text-belims-blue transition-colors hover:bg-belims-blue hover:text-white"
            >
              <RefreshCcw size={16} aria-hidden="true" /> Retry
            </button>
          </section>
        )}

        {!loading && !failure && !shipments && !urlRef && (
          <section aria-labelledby="trk-tip" className="rounded-md border border-dashed border-border-strong p-6">
            <h2 id="trk-tip" className="font-heading font-condensed text-h5 font-extrabold uppercase">
              Where's my reference?
            </h2>
            <p className="mt-1 max-w-xl text-text-secondary">
              Once your order ships you'll get an email with a tracking reference like <strong className="text-text">UASS33KZ</strong>. Signed in? It's also on your order page.
            </p>
          </section>
        )}

        {current && shipments && (
          <div className="space-y-6">
            {refreshFailed && (
              <p role="alert" className="flex flex-wrap items-center gap-3 rounded-md border-l-4 border-stock-low bg-surface-muted p-3 font-semibold">
                We couldn't refresh just now — showing the last update.
                <button type="button" onClick={() => track(current.trackingRef, "refresh")} className="min-h-[44px] font-bold text-belims-blue underline underline-offset-4 hover:text-primary">
                  Retry
                </button>
              </p>
            )}

            {shipments.length > 1 && (
              <div role="group" aria-label="Shipments in this order" className="flex flex-wrap items-center gap-2">
                <span className="text-text-secondary">{shipments.length} shipments:</span>
                {shipments.map((s, i) => (
                  <button
                    key={s.trackingRef + i}
                    type="button"
                    aria-pressed={i === selected}
                    onClick={() => setSelected(i)}
                    className={`inline-flex min-h-[44px] items-center gap-2 rounded-md border-2 px-3 font-bold transition-colors ${
                      i === selected ? "border-belims-blue bg-belims-blue text-white" : "border-border-strong bg-white text-belims-blue hover:border-belims-blue"
                    }`}
                  >
                    {s.trackingRef}
                    {i !== selected && <StatusPill label={s.statusLabel} tone={s.tone} />}
                  </button>
                ))}
              </div>
            )}

            <TrackingProgressCard
              key={current.trackingRef}
              data={current}
              order={matchedOrder}
              isRefreshing={isRefreshing}
              autoRefresh={autoRefresh}
              onToggleAutoRefresh={setAutoRefresh}
              onRefresh={() => track(current.trackingRef, "refresh")}
              onAnnounce={setAnnouncement}
              headingRef={headingRef}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default TrackOrderPage;
