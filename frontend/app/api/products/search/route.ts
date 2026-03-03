export async function POST(request: Request): Promise<Response> {
  const body = (await request.json()) as { query?: string; limit?: number };
  const query = String(body.query ?? "").toLowerCase();
  const limit = Math.min(Math.max(Number(body.limit ?? 5), 1), 12);
  const upstream =
    process.env.BELIMS_API_BASE_URL ??
    "https://cms.belims.co.za/wp-json/belims/v1";

  const params = new URLSearchParams({
    view: "listing",
    per_page: String(limit),
    fields:
      "id,name,slug,price,regular_price,sale_price,image,featured_image,stock,stock_status,maxStock,in_stock,rating,reviews,sku,category",
  });
  if (query) {
    params.set("search", query);
  }

  const response = await fetch(`${upstream}/products?${params.toString()}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    const bodyText = await response.text().catch(() => "");
    return Response.json(
      { error: `Live product search failed: ${response.status} ${bodyText}` },
      { status: response.status },
    );
  }

  const raw = (await response.json()) as Array<Record<string, unknown>>;
  const products = raw.map((item) => ({
    id: String(item.id ?? ""),
    title: String(item.name ?? "Product"),
    price: Number(item.price ?? 0),
    imageUrl: String(item.image ?? item.featured_image ?? ""),
    sku: typeof item.sku === "string" ? item.sku : undefined,
    rating:
      typeof item.rating === "number"
        ? item.rating
        : Number(item.rating ?? 0) || undefined,
    reviewCount:
      typeof item.reviews === "number"
        ? item.reviews
        : Number(item.reviews ?? 0) || undefined,
    inStock: Boolean(item.in_stock ?? true),
    stockQty:
      typeof item.stock === "number"
        ? item.stock
        : Number(item.maxStock ?? 0) || undefined,
  }));

  return Response.json({
    products,
    assistantText: `Found ${products.length} live product matches.`,
  });
}
