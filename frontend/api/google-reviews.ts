import type { VercelRequest, VercelResponse } from "@vercel/node";

// ---------------------------------------------------------------------------
// Config — baked in so the Place ID never needs to go in env vars
// ---------------------------------------------------------------------------
const PLACE_ID = "ChIJE4HCbjw39h4Rfq_ZYEWcvKM"; // Belims Hardware

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface GoogleReviewRaw {
  author_name: string;
  rating: number;
  text: string;
  time: number; // Unix timestamp (seconds)
  profile_photo_url?: string;
  relative_time_description: string;
  author_url?: string;
}

interface NormalizedReview {
  id: string;
  reviewer: string;
  rating: number;
  review: string;
  date: string; // ISO-8601
  relativeTime: string; // "2 months ago"
  photoUrl: string | null;
  source: "google";
}

interface ReviewsPayload {
  placeRating: number;
  totalRatings: number;
  reviews: NormalizedReview[];
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    console.error("[api/google-reviews] GOOGLE_PLACES_API_KEY is not set");
    res.status(500).json({ error: "Server configuration error" });
    return;
  }

  // Cache 1 hour on Vercel CDN; serve stale for up to 24 h while revalidating
  res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");

  try {
    const url = new URL(
      "https://maps.googleapis.com/maps/api/place/details/json",
    );
    url.searchParams.set("place_id", PLACE_ID);
    url.searchParams.set("fields", "rating,user_ratings_total,reviews");
    url.searchParams.set("reviews_sort", "newest");
    url.searchParams.set("key", apiKey);

    const raw = await fetch(url.toString());

    if (!raw.ok) {
      throw new Error(`Google HTTP ${raw.status}`);
    }

    const data = await raw.json();

    if (data.status !== "OK") {
      throw new Error(
        `Places API: ${data.status}${data.error_message ? ` — ${data.error_message}` : ""}`,
      );
    }

    const {
      rating = 0,
      user_ratings_total = 0,
      reviews = [],
    } = data.result ?? {};

    const normalized: NormalizedReview[] = (reviews as GoogleReviewRaw[]).map(
      (r) => ({
        id: `${r.author_name}-${r.time}`,
        reviewer: r.author_name,
        rating: r.rating,
        review: r.text?.trim() ?? "",
        date: new Date(r.time * 1000).toISOString(),
        relativeTime: r.relative_time_description,
        photoUrl: r.profile_photo_url ?? null,
        source: "google",
      }),
    );

    const payload: ReviewsPayload = {
      placeRating: rating,
      totalRatings: user_ratings_total,
      reviews: normalized,
    };

    res.status(200).json(payload);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/google-reviews]", message);
    res.status(502).json({ error: "Failed to fetch Google reviews." });
  }
}
