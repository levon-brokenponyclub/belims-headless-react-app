export const slugify = (text: string): string =>
  text.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export const buildProductUrl = (product: {
  id: string | number;
  name: string;
  slug?: string;
  breadcrumbs?: Array<{ label: string; slug?: string }>;
}): string => {
  const categorySegments = (product.breadcrumbs || [])
    .filter((b) => b.label.toLowerCase() !== "shop")
    .map((b) => b.slug || slugify(b.label))
    .filter(Boolean);

  const productSlug = product.slug || slugify(product.name);
  const finalSegment = `${productSlug}-${product.id}`;

  return ["/product", ...categorySegments, finalSegment].join("/");
};

export interface ParsedDescription {
  /** "Label: Value" lines from a "Specifications" list; empty values dropped. */
  specs: [string, string][];
  /** Lines from a "Features" list. */
  features: string[];
  /** Whatever HTML remains once those lists are lifted out. */
  restHtml: string;
}

const listAfterHeading = (doc: Document, pattern: RegExp): HTMLUListElement | null => {
  const heading = Array.from(doc.body.querySelectorAll("h2, h3, h4, h5, p, strong")).find((el) =>
    pattern.test((el.textContent || "").trim().replace(/:$/, "")),
  );
  if (!heading) return null;
  const block = heading.tagName === "STRONG" ? heading.parentElement : heading;
  const next = block?.nextElementSibling;
  if (next?.tagName !== "UL" && next?.tagName !== "OL") return null;
  block?.remove();
  return next as HTMLUListElement;
};

/**
 * The CMS stores specs and features as plain lists inside the description HTML.
 * Lift them out so the product page can render a specs table and a feature list.
 */
export const parseProductDescription = (html = ""): ParsedDescription => {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const lines = (list: HTMLElement | null) =>
    Array.from(list?.querySelectorAll("li") ?? []).map((li) => (li.textContent || "").trim());

  const specList = listAfterHeading(doc, /^specifications?$/i);
  const specs = lines(specList)
    .map((line) => {
      const at = line.indexOf(":");
      return at > 0 ? ([line.slice(0, at).trim(), line.slice(at + 1).trim()] as [string, string]) : null;
    })
    .filter((row): row is [string, string] => !!row && !!row[1]);
  specList?.remove();

  const featureList = listAfterHeading(doc, /^(key )?features$/i);
  const features = lines(featureList).filter(Boolean);
  featureList?.remove();

  const restHtml = (doc.body.textContent || "").trim() ? doc.body.innerHTML.trim() : "";
  return { specs, features, restHtml };
};

/** Product `specifications` values are strings, or a { length, width, height } object for dimensions. */
export const formatSpecValue = (value: unknown): string => {
  if (value && typeof value === "object") {
    const dims = value as Record<string, string | number | undefined>;
    const parts = [dims.length, dims.width, dims.height].filter((v) => v !== undefined && v !== "");
    return parts.length ? `${parts.join(" cm × ")} cm` : "";
  }
  return value === undefined || value === null ? "" : String(value).trim();
};

export const extractProductIdFromSlug = (splat: string): string => {
  const segments = splat.split("/");
  const lastSegment = segments[segments.length - 1] || "";
  // New format: "handle-pick-poly-2446" — extract trailing numeric ID
  const suffixMatch = lastSegment.match(/-(\d+)$/);
  if (suffixMatch) return suffixMatch[1];
  // Legacy format: plain numeric ID
  if (/^\d+$/.test(lastSegment)) return lastSegment;
  return lastSegment;
};
