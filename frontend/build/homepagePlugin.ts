// Vite plugin: bakes CMS homepage content into the build.
//
// - Fetches GET /belims/v1/homepage at build/dev start; falls back to
//   content/homepage.fallback.json so a CMS outage never fails a build.
// - Exposes the result as `virtual:homepage` (see types/virtual-homepage.d.ts).
// - Injects the hero LCP preload into index.html, then writes app.html (no preload)
//   for every other route and homepage-version.json for the CMS live-version check.

import fs from "fs";
import path from "path";
import type { HtmlTagDescriptor, Plugin } from "vite";
import { cmsTransformUrl } from "../utils/cmsImageUrl";
import type { HomepageImage, HomepageModule, HomepagePayload, ResolvedImage } from "./homepageTypes";

const VIRTUAL_ID = "virtual:homepage";
const RESOLVED_ID = "\0" + VIRTUAL_ID;
const PRELOAD_ATTR = "data-homepage-preload";
const FETCH_TIMEOUT_MS = 10_000;

const DESKTOP = { widths: [640, 960, 1280, 1600], sizes: "(min-width: 1400px) 1352px, 100vw", media: "(min-width: 768px)" };
const MOBILE = { widths: [480, 768, 1080], sizes: "100vw", media: "(max-width: 767px)" };

interface Options {
  cmsUrl: string;
  /** VITE_CF_IMAGE_TRANSFORMS — responsive Cloudflare URLs for CMS images. */
  transforms: boolean;
}

const isImage = (img: unknown): img is HomepageImage =>
  !!img && typeof (img as HomepageImage).url === "string" && (img as HomepageImage).width > 0 && (img as HomepageImage).height > 0;

const isPayload = (data: unknown): data is HomepagePayload =>
  !!data &&
  typeof (data as HomepagePayload).version === "string" &&
  Array.isArray((data as HomepagePayload).sections) &&
  (data as HomepagePayload).sections.every((s) => s.type !== "hero" || (typeof s.title === "string" && isImage(s.image)));

const resolveImage = (img: HomepageImage, opts: Options, set: typeof DESKTOP): ResolvedImage => {
  const transformed = opts.transforms ? cmsTransformUrl(img.url, set.widths[0]) : null;
  return {
    src: transformed ? (cmsTransformUrl(img.url, 1280) as string) : img.url,
    srcSet: transformed ? set.widths.map((w) => `${cmsTransformUrl(img.url, w)} ${w}w`).join(", ") : undefined,
    sizes: set.sizes,
    width: img.width,
    height: img.height,
    alt: img.alt,
  };
};

const toModule = (payload: HomepagePayload, source: HomepageModule["source"], opts: Options): HomepageModule => {
  const hero = payload.sections.find((s) => s.type === "hero");
  return {
    version: payload.version,
    source,
    hero: hero
      ? {
          type: "hero",
          title: hero.title,
          description: hero.description,
          button: hero.button,
          image: resolveImage(hero.image, opts, DESKTOP),
          imageMobile: isImage(hero.image_mobile) ? resolveImage(hero.image_mobile, opts, MOBILE) : null,
        }
      : null,
  };
};

const loadHomepage = async (opts: Options, root: string): Promise<HomepageModule> => {
  const endpoint = `${opts.cmsUrl.replace(/\/$/, "")}/wp-json/belims/v1/homepage?ts=${Date.now()}`;
  try {
    const res = await fetch(endpoint, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS), headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: unknown = await res.json();
    if (!isPayload(data)) throw new Error("unexpected response shape");
    console.log(`[belims-homepage] CMS content v${data.version} from ${endpoint}`);
    return toModule(data, "cms", opts);
  } catch (err) {
    console.warn(`[belims-homepage] WARNING: using fallback homepage content — ${endpoint} failed: ${(err as Error).message}`);
    const fallback = JSON.parse(fs.readFileSync(path.join(root, "content/homepage.fallback.json"), "utf8")) as HomepagePayload;
    return toModule(fallback, "fallback", opts);
  }
};

const preloadTags = (data: HomepageModule): HtmlTagDescriptor[] => {
  if (!data.hero) return [];
  const { image, imageMobile } = data.hero;
  const tag = (img: ResolvedImage, media?: string): HtmlTagDescriptor => ({
    tag: "link",
    injectTo: "head-prepend",
    attrs: {
      rel: "preload",
      as: "image",
      href: img.src,
      ...(img.srcSet ? { imagesrcset: img.srcSet, imagesizes: img.sizes } : {}),
      ...(media ? { media } : {}),
      fetchpriority: "high",
      [PRELOAD_ATTR]: true,
    },
  });
  return imageMobile ? [tag(imageMobile, MOBILE.media), tag(image, DESKTOP.media)] : [tag(image)];
};

export const homepagePlugin = (opts: Options): Plugin => {
  let data: HomepageModule;
  let root = process.cwd();

  return {
    name: "belims-homepage",
    configResolved(config) {
      root = config.root;
    },
    async buildStart() {
      data = await loadHomepage(opts, root);
    },
    resolveId(id) {
      return id === VIRTUAL_ID ? RESOLVED_ID : null;
    },
    load(id) {
      return id === RESOLVED_ID ? `export default ${JSON.stringify(data)};` : null;
    },
    transformIndexHtml() {
      return preloadTags(data);
    },
    writeBundle(output) {
      const outDir = output.dir ?? path.join(root, "dist");
      const indexHtml = fs.readFileSync(path.join(outDir, "index.html"), "utf8");
      const appHtml = indexHtml.replace(new RegExp(`\\s*<link[^>]*${PRELOAD_ATTR}[^>]*>`, "g"), "");
      fs.writeFileSync(path.join(outDir, "app.html"), appHtml);
      fs.writeFileSync(
        path.join(outDir, "homepage-version.json"),
        JSON.stringify({ version: data.version, source: data.source, built_at: new Date().toISOString() })
      );
    },
  };
};
