// Cloudflare Image Transformations for CMS-hosted media.
// Requires Images → Transformations enabled on the belims.co.za zone; gated by
// VITE_CF_IMAGE_TRANSFORMS so URLs stay untouched until that is switched on.

const CMS_HOST = "cms.belims.co.za";
const ENABLED = import.meta.env.VITE_CF_IMAGE_TRANSFORMS === "true";

const parseCmsUrl = (src: string): URL | null => {
  if (!ENABLED || !src) return null;
  try {
    const url = new URL(src);
    return url.hostname === CMS_HOST && !url.pathname.startsWith("/cdn-cgi/")
      ? url
      : null;
  } catch {
    return null;
  }
};

/** Resized, format-negotiated (AVIF/WebP) URL for a CMS image; any other src is returned unchanged. */
export const cmsImage = (src: string, width: number, quality = 80): string => {
  const url = parseCmsUrl(src);
  if (!url) return src;
  return `${url.origin}/cdn-cgi/image/width=${width},quality=${quality},format=auto,fit=scale-down${url.pathname}${url.search}`;
};

/** `srcset` for a CMS image at the given widths; undefined for non-CMS sources. */
export const cmsSrcSet = (src: string, widths: number[]): string | undefined =>
  parseCmsUrl(src)
    ? widths.map((w) => `${cmsImage(src, w)} ${w}w`).join(", ")
    : undefined;

/** Product-card grid: 2-up on mobile, ~4-up from lg. */
export const CARD_IMAGE_WIDTHS = [320, 480, 640, 800];
export const CARD_IMAGE_SIZES = "(min-width: 1024px) 25vw, 50vw";
