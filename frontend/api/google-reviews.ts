import type { VercelRequest, VercelResponse } from "@vercel/node";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const PLACE_ID = "ChIJE4HCbjw39h4Rfq_ZYEWcvKM"; // Belims Hardware

// ---------------------------------------------------------------------------
// Types — Places API (New) response shape
// ---------------------------------------------------------------------------
interface NewApiReview {
  name: string; // "places/{placeId}/reviews/{reviewId}"
  rating: number;
  relativePublishTimeDescription: string;
  publishTime: string; // ISO-8601
  text?: { text: string; languageCode: string };
  authorAttribution: {
    displayName: string;
    uri?: string;
    photoUri?: string;
  };
}

interface NormalizedReview {
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

  // Cache 1 hour on Vercel CDN, serve stale for up to 24 h while revalidating
  res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");

  try {
    // Places API (New) — replaces legacy maps.googleapis.com/maps/api/place/
    const url = `https://places.googleapis.com/v1/places/${PLACE_ID}`;

    const raw = await fetch(url, {
      method: "GET",
      headers: {
        "X-Goog-Api-Key": apiKey,
        // Request only the fields we need — minimises billing cost
        "X-Goog-FieldMask":
          "rating,userRatingCount,reviews.rating,reviews.relativePublishTimeDescription,reviews.publishTime,reviews.text,reviews.authorAttribution,reviews.name",
      },
    });

    if (!raw.ok) {
      const body = await raw.json().catch(() => ({}));
      throw new Error(
        `Places API (New) ${raw.status}: ${JSON.stringify(body?.error ?? body)}`,
      );
    }

    const data = await raw.json();

    const {
      rating = 0,
      userRatingCount = 0,
      reviews = [],
    } = data as {
      rating?: number;
      userRatingCount?: number;
      reviews?: NewApiReview[];
    };

    const normalized: NormalizedReview[] = reviews.map((r) => ({
      id: r.name ?? `${r.authorAttribution?.displayName}-${r.publishTime}`,
      reviewer: r.authorAttribution?.displayName?.trim() || "Anonymous",
      rating: r.rating,
      review: r.text?.text?.trim() ?? "",
      date: r.publishTime,
      relativeTime: r.relativePublishTimeDescription,
      photoUrl: r.authorAttribution?.photoUri ?? null,
      source: "google",
    }));

    const payload: ReviewsPayload = {
      placeRating: rating,
      totalRatings: userRatingCount,
      reviews: normalized,
    };

    res.status(200).json(payload);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/google-reviews]", message);
    res.status(502).json({ error: "Failed to fetch Google reviews." });
  }
}
