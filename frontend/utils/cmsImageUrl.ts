// Pure Cloudflare Image Transformations URL builder for CMS-hosted media.
// No env access, so both the app (utils/image.ts) and vite.config.ts (homepage
// build step) produce identical URLs.

export const CMS_HOST = "cms.belims.co.za";

/** Transformed URL for a cms.belims.co.za image, or null for any other source. */
export const cmsTransformUrl = (src: string, width: number, quality = 80): string | null => {
  if (!src) return null;
  try {
    const url = new URL(src);
    if (url.hostname !== CMS_HOST || url.pathname.startsWith("/cdn-cgi/")) return null;
    return `${url.origin}/cdn-cgi/image/width=${width},quality=${quality},format=auto,fit=scale-down${url.pathname}${url.search}`;
  } catch {
    return null;
  }
};
