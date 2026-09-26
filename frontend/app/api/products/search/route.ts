export async function POST(request: Request): Promise<Response> {
  const body = (await request.json()) as { query?: string; limit?: number };
  const query = String(body.query ?? "").toLowerCase();
  const limit = Math.min(Math.max(Number(body.limit ?? 5), 1), 12);
  const upstream =
    process.env.BELIMS_API_BASE_URL ??
    "https://cms.belims.co.za/wp-json/belims/v1";

  const params = new URLSearchParams({
    view: "listing",
    
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
        
      typeof item.stock === "number"
        ? item.stock
        : Number(item.maxStock ?? 0) || undefined,
  }));

  return Response.json({
    products,
    assistantText: `Found ${products.length} live product matches.`,
  });
}
