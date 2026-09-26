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
