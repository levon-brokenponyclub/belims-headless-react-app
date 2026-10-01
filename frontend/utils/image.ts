// Cloudflare Image Transformations for CMS-hosted media.
// Requires Images → Transformations enabled on the belims.co.za zone; gated by
// VITE_CF_IMAGE_TRANSFORMS so URLs stay untouched until that is switched on.

import { cmsTransformUrl } from "./cmsImageUrl";

const ENABLED = import.meta.env.VITE_CF_IMAGE_TRANSFORMS === "true";

/** Resized, format-negotiated (AVIF/WebP) URL for a CMS image; any other src is returned unchanged. */
export const cmsImage = (src: string, width: number, quality = 80): string =>
  (ENABLED && cmsTransformUrl(src, width, quality)) || src;

/** `srcset` for a CMS image at the given widths; undefined for non-CMS sources. */
export const cmsSrcSet = (src: string, widths: number[]): string | undefined =>
  ENABLED && cmsTransformUrl(src, widths[0])
    ? widths.map((w) => `${cmsTransformUrl(src, w)} ${w}w`).join(", ")
    : undefined;

/** Product-card grid: 2-up on mobile, ~4-up from lg. */
export const CARD_IMAGE_WIDTHS = [320, 480, 640, 800];
export const CARD_IMAGE_SIZES = "(min-width: 1024px) 25vw, 50vw";
