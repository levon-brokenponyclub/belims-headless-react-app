import React, { useEffect, useState } from "react";
import { Star, Quote } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface GoogleReview {
  id: string;
  reviewer: string;
  rating: number;
  review: string;
  date: string;
  relativeTime: string;
  photoUrl: string | null;
  source: "google";
}

interface ReviewsPayload {
  placeRating: number;
  totalRatings: number;
  reviews: GoogleReview[];
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function Stars({
  rating,
  size = 14,
}: {
  rating: number;
  size?: number;
}) {
  return (
    <span
      className="flex items-center gap-0.5"
      aria-label={`${rating} out of 5 stars`}
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={size}
          strokeWidth={0}
          className={
            i < rating
              ? "fill-amber-400 text-amber-400"
              : "fill-neutral-200 text-neutral-200"
          }
        />
      ))}
    </span>
  );
}

function Avatar({
  photoUrl,
  name,
}: {
  photoUrl: string | null;
  name: string;
}) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        className="h-9 w-9 rounded-full object-cover ring-2 ring-white"
        loading="lazy"
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-belims-blue text-xs font-bold text-white ring-2 ring-white">
      {initials}
    </span>
  );
}

function SkeletonCard() {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-5 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-neutral-200" />
        <div className="space-y-1.5 flex-1">
          <div className="h-3 w-24 rounded bg-neutral-200" />
          <div className="h-3 w-16 rounded bg-neutral-100" />
        </div>
      </div>
      <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-3.5 w-3.5 rounded-full bg-neutral-200" />
        ))}
      </div>
      <div className="space-y-2">
        <div className="h-3 rounded bg-neutral-100" />
        <div className="h-3 w-4/5 rounded bg-neutral-100" />
        <div className="h-3 w-3/5 rounded bg-neutral-100" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
interface BelimsReviewsProps {
  /** Section heading — defaults to "What Our Customers Say" */
  title?: string;
  /** Max reviews to display — Google returns up to 5 */
  limit?: number;
}

export const BelimsReviews: React.FC<BelimsReviewsProps> = ({
  title = "What Our Customers Say",
  limit = 5,
}) => {
  const [data, setData] = useState<ReviewsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/google-reviews", {
          signal: controller.signal,
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error ?? `Request failed (${res.status})`);
        }
        const payload: ReviewsPayload = await res.json();
        setData(payload);
      } catch (err: unknown) {
        if ((err as Error).name !== "AbortError") {
          setError(
            (err as Error).message ?? "Could not load reviews right now.",
          );
        }
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, []);

  const reviews = data?.reviews.slice(0, limit) ?? [];

  return (
    <section className="w-full py-12 bg-surface" aria-label={title}>
      <div className="container mx-auto px-4">

        {/* ── Header ── */}
        <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-heading text-h5 md:text-h4 font-bold text-text">
              {title}
            </h2>
            {data && (
              <div className="mt-1.5 flex items-center gap-2">
                <Stars rating={Math.round(data.placeRating)} size={15} />
                <span className="text-sm text-text-secondary">
                  <span className="font-semibold text-text">
                    {data.placeRating.toFixed(1)}
                  </span>{" "}
                  · {data.totalRatings.toLocaleString()} Google reviews
                </span>
              </div>
            )}
          </div>

          <a
            href={`https://www.google.com/maps/place/?q=place_id:ChIJE4HCbjw39h4Rfq_ZYEWcvKM`}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-text hover:text-primary transition-colors"
          >
            {/* Google "G" logo */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              width="16"
              height="16"
              className="shrink-0"
            >
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            View all on Google ›
          </a>
        </div>

        {/* ── Loading ── */}
        {loading && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* ── Error ── */}
        {!loading && error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* ── Empty ── */}
        {!loading && !error && reviews.length === 0 && (
          <div className="rounded-xl border border-border bg-surface-muted px-6 py-12 text-center">
            <p className="text-sm text-text-secondary">
              No reviews available yet.
            </p>
          </div>
        )}

        {/* ── Review cards ── */}
        {!loading && !error && reviews.length > 0 && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {reviews.map((review) => (
              <article
                key={review.id}
                className="group relative flex flex-col gap-4 rounded-xl border border-border bg-white p-5 shadow-sm transition-shadow hover:shadow-card"
              >
                {/* Quote mark */}
                <Quote
                  size={28}
                  strokeWidth={1.5}
                  className="absolute right-4 top-4 text-neutral-100 group-hover:text-neutral-200 transition-colors"
                  aria-hidden
                />

                {/* Reviewer */}
                <div className="flex items-center gap-3">
                  <Avatar photoUrl={review.photoUrl} name={review.reviewer} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-text">
                      {review.reviewer}
                    </p>
                    <p className="text-xs text-text-tertiary">
                      {review.relativeTime}
                    </p>
                  </div>
                </div>

                {/* Stars */}
                <Stars rating={review.rating} />

                {/* Review text */}
                <p className="flex-1 text-sm leading-relaxed text-text-secondary line-clamp-5">
                  {review.review || (
                    <span className="italic text-text-tertiary">
                      Left a {review.rating}-star rating.
                    </span>
                  )}
                </p>

                {/* Google badge */}
                <div className="mt-auto flex items-center gap-1.5 border-t border-border pt-3">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    width="12"
                    height="12"
                    className="shrink-0"
                  >
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  <span className="text-xs text-text-tertiary">
                    Posted on Google
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* ── Mobile Google link ── */}
        {!loading && !error && reviews.length > 0 && (
          <div className="mt-6 text-center sm:hidden">
            <a
              href={`https://www.google.com/maps/place/?q=place_id:ChIJE4HCbjw39h4Rfq_ZYEWcvKM`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-text hover:text-primary transition-colors"
            >
              View all on Google ›
            </a>
          </div>
        )}

      </div>
    </section>
  );
};
