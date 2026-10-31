import React, { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { SectionHeading } from "./SectionHeading";

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

const MIN_REVIEW_RATING = 4;

function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={size}
          strokeWidth={0}
          className={i < rating ? "fill-amber-400 text-amber-400" : "fill-neutral-200 text-neutral-200"}
        />
      ))}
    </span>
  );
}

function Avatar({ photoUrl, name }: { photoUrl: string | null; name: string }) {
  const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

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

function GoogleMark({ size }: { size: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={size} height={size} className="shrink-0" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function SkeletonCard() {
  return (
    <div className="flex snap-start flex-col gap-4 rounded-md border-2 border-border bg-white p-5 animate-pulse">
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

interface BelimsReviewsProps {
  title?: string;
  limit?: number;
}

export const BelimsReviews: React.FC<BelimsReviewsProps> = ({
  title = "What customers say",
  limit = 3,
}) => {
  const [data, setData] = useState<ReviewsPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/google-reviews", { signal: controller.signal });

        // 404 means running locally without Vercel functions — render nothing
        if (res.status === 404) {
          setLoading(false);
          return;
        }

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error ?? `Request failed (${res.status})`);
        }

        const payload: ReviewsPayload = await res.json();
        setData(payload);
      } catch (err: unknown) {
        // Shoppers never see API errors — the section just doesn't render.
        if ((err as Error).name !== "AbortError") {
          console.error("Google reviews unavailable:", (err as Error).message);
        }
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, []);

  // Only 4- and 5-star reviews are shown on the storefront.
  const reviews = data?.reviews.filter((review) => review.rating >= MIN_REVIEW_RATING).slice(0, limit) ?? [];

  if (!loading && reviews.length === 0) return null;

  const PLACE_ID = "ChIJE4HCbjw39h4Rfq_ZYEWcvKM";
  const PLACE_URL = `https://www.google.com/maps/place/?q=place_id:${PLACE_ID}`;
  const WRITE_REVIEW_URL = `https://search.google.com/local/writereview?placeid=${PLACE_ID}`;

  return (
    <section className="w-full bg-surface py-10 md:py-14" aria-labelledby="home-reviews-title">
      <div className="container mx-auto px-4">
        <SectionHeading id="home-reviews-title" eyebrow="Google reviews" title={title} />

        <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="flex flex-col gap-3 rounded-md bg-belims-blue p-6 text-white" aria-label="Google rating summary">
            <span className="inline-flex items-center gap-2 text-sm font-bold text-white/75">
              <GoogleMark size={18} /> Google rating
            </span>
            {data ? (
              <>
                <span className="font-heading text-[64px] font-bold leading-none font-condensed">
                  {data.placeRating.toFixed(1)}
                </span>
                <Stars rating={Math.round(data.placeRating)} size={18} />
                <span className="text-base text-white/75">
                  Based on {data.totalRatings.toLocaleString()} Google reviews
                </span>
              </>
            ) : (
              <span className="h-24 animate-pulse rounded-sm bg-white/10" aria-hidden />
            )}
            <div className="mt-auto grid gap-2 pt-3">
              <a
                href={PLACE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 items-center justify-center rounded-md bg-primary px-6 font-heading text-base font-bold uppercase font-condensed tracking-wide text-white transition-colors hover:bg-white hover:text-belims-blue"
              >
                Read all reviews
              </a>
              <a
                href={WRITE_REVIEW_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 items-center justify-center rounded-md border border-white/60 px-6 font-heading text-base font-bold uppercase font-condensed tracking-wide text-white transition-colors hover:bg-white hover:text-belims-blue"
              >
                Write a review
              </a>
            </div>
          </aside>

          <div className="no-scrollbar grid snap-x snap-mandatory auto-cols-[minmax(280px,80%)] grid-flow-col gap-4 overflow-x-auto lg:auto-cols-auto lg:grid-flow-row lg:grid-cols-3 lg:overflow-visible">
            {loading
              ? Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
              : reviews.map((review) => (
                  <article
                    key={review.id}
                    className="flex snap-start flex-col gap-3 rounded-md border-2 border-border bg-white p-5 transition-colors hover:border-belims-blue"
                  >
                    <Stars rating={review.rating} />
                    <p className="flex-1 text-base leading-relaxed text-text line-clamp-5">
                      {review.review || (
                        <span className="italic text-text-tertiary">Left a {review.rating}-star rating.</span>
                      )}
                    </p>
                    <div className="mt-auto flex items-center gap-3">
                      <Avatar photoUrl={review.photoUrl} name={review.reviewer} />
                      <div className="min-w-0">
                        <p className="truncate text-base font-bold text-text">{review.reviewer}</p>
                        <p className="flex items-center gap-1.5 text-sm text-text-tertiary">
                          {review.relativeTime} · <GoogleMark size={12} /> Google
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
          </div>
        </div>
      </div>
    </section>
  );
};
