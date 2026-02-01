// frontend/components/TrackOrderPage.tsx
import React, { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { RefreshCcw } from "lucide-react";
import type { TrackResponse } from "../services/tracking";
import {
  TrackingProgressCard,
  normalizeTrackingResult,
} from "./TrackingProgressCard";

// Get track endpoint based on environment
function getTrackEndpoint(): string {
  if (
    typeof window !== "undefined" &&
    window.location.hostname === "localhost"
  ) {
    const ngrokUrl =
      sessionStorage.getItem("ngrok_url") || localStorage.getItem("ngrok_url");
    if (ngrokUrl) {
      return ngrokUrl + "/wp-json/belims/v1/track";
    }
    return "http://belims-headless.local/wp-json/belims/v1/track";
  }
  return "https://cms.belims.co.za/wp-json/belims/v1/track";
}

const TRACK_ENDPOINT = getTrackEndpoint();

export const TrackOrderPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlOrder = (searchParams.get("order-number") || "").trim();

  const [orderNumber, setOrderNumber] = useState<string>(urlOrder);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [rawResult, setRawResult] = useState<TrackResponse | null>(null);
  const [normalizedBundle, setNormalizedBundle] = useState<ReturnType<
    typeof normalizeTrackingResult
  > | null>(null);

  const [autoRefresh, setAutoRefresh] = useState(false);

  // ✅ keep latest normalizedBundle without re-creating functions
  const normalizedRef = useRef<typeof normalizedBundle>(null);
  useEffect(() => {
    normalizedRef.current = normalizedBundle;
  }, [normalizedBundle]);

  useEffect(() => {
    setOrderNumber(urlOrder);
  }, [urlOrder]);

  const track = useCallback(
    async (value: string, opts?: { mode?: "initial" | "refresh" | "auto" }) => {
      const ref = value.trim().toUpperCase();
      if (!ref) return;

      const mode =
        opts?.mode ?? (normalizedRef.current ? "refresh" : "initial");
      const isRefresh = mode !== "initial" && Boolean(normalizedRef.current);

      if (isRefresh) setIsRefreshing(true);
      else setLoading(true);

      setError(null);

      try {
        const res = await fetch(TRACK_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ trackingRef: ref }),
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `Tracking request failed (${res.status})`);
        }

        const data = (await res.json()) as TrackResponse;

        setRawResult(data);
        setNormalizedBundle(normalizeTrackingResult(data));
      } catch (e: unknown) {
        const message =
          e instanceof Error
            ? e.message
            : "Unable to fetch tracking right now.";
        setError(message);

        // Only clear UI on initial load failure (keep UI visible on refresh failure)
        if (!isRefresh) {
          setRawResult(null);
          setNormalizedBundle(null);
        }
      } finally {
        if (isRefresh) setIsRefreshing(false);
        else setLoading(false);
      }
    },
    [],
  );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = orderNumber.trim().toUpperCase();
    if (!value) return;

    setSearchParams({ "order-number": value }, { replace: true });
    track(value, { mode: "initial" });
  };

  // ✅ auto-run if URL contains ?order-number=
  useEffect(() => {
    if (urlOrder) track(urlOrder, { mode: "initial" });
  }, [urlOrder, track]);

  // ✅ Auto refresh poll (20s), pause on background tab
  useEffect(() => {
    if (!autoRefresh) return;
    const ref = normalizedBundle?.normalized?.trackingRef?.trim();
    if (!ref) return;

    let intervalId: number | null = null;

    const stop = () => {
      if (intervalId == null) return;
      window.clearInterval(intervalId);
      intervalId = null;
    };

    const start = () => {
      if (intervalId != null) return;
      intervalId = window.setInterval(() => {
        if (document.hidden) return;
        track(ref, { mode: "auto" });
      }, 20000);
    };

    const onVisibilityChange = () => {
      if (document.hidden) stop();
      else start();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    if (!document.hidden) start();

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [autoRefresh, normalizedBundle?.normalized?.trackingRef, track]);

  return (
    <div className="container mx-auto px-4 py-8 min-h-[60vh]">
      <h1 className="text-2xl md:text-3xl font-bold text-belims-blue font-heading mb-2">
        Track Your Order
      </h1>
      <p className="text-sm md:text-base text-gray-600 max-w-xl mb-4">
        Enter your tracking reference to view live tracking updates.
      </p>

      <div className="bg-white rounded-xl shadow border border-gray-200 p-4 md:p-6">
        <form onSubmit={onSubmit} className="flex flex-col md:flex-row gap-3">
          <input
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="e.g. UASSBNJ9"
            className="flex-1 border rounded-lg px-3 py-2 font-semibold tracking-wide uppercase"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-belims-blue text-white px-5 py-2 rounded-lg font-bold disabled:opacity-60 inline-flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <RefreshCcw className="animate-spin" size={16} />
                Tracking...
              </>
            ) : (
              "Track"
            )}
          </button>
        </form>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {!error && !normalizedBundle && (
          <div className="mt-6 rounded-xl border border-dashed border-gray-200 p-6 text-sm text-gray-600">
            <div className="font-bold text-gray-900 mb-1">
              Tip: Paste your tracking ref
            </div>
            Once you’ve placed an order, you’ll receive a tracking reference
            like <span className="font-bold">UASS33KZ</span>.
          </div>
        )}

        {normalizedBundle && (
          <div className="mt-6">
            <TrackingProgressCard
              data={normalizedBundle.normalized}
              shipment={normalizedBundle.shipment}
              checkpoints={normalizedBundle.checkpoints}
              isRefreshing={isRefreshing}
              autoRefresh={autoRefresh}
              onToggleAutoRefresh={setAutoRefresh}
              onRefresh={() => {
                const v = normalizedBundle.normalized.trackingRef.trim();
                if (v) track(v, { mode: "refresh" });
              }}
            />
          </div>
        )}

        {/* Debug (optional) */}
        {false && rawResult ? (
          <pre className="mt-6 text-xs bg-gray-50 border rounded p-4 overflow-auto">
            {JSON.stringify(rawResult, null, 2)}
          </pre>
        ) : null}
      </div>
    </div>
  );
};

export default TrackOrderPage;
