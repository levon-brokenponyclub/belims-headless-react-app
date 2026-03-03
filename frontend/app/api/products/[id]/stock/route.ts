export async function GET(
  _request: Request,
  context: { params: { id: string } },
): Promise<Response> {
  const { id } = context.params;
  const upstream =
    process.env.BELIMS_API_BASE_URL ??
    "https://cms.belims.co.za/wp-json/belims/v1";
  const params = new URLSearchParams({
    view: "detail",
    fields: "id,in_stock,stock,stock_status,maxStock",
  });

  const response = await fetch(
    `${upstream}/products/${encodeURIComponent(id)}?${params.toString()}`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const bodyText = await response.text().catch(() => "");
    return Response.json(
      { error: `Live stock lookup failed: ${response.status} ${bodyText}` },
      { status: response.status },
    );
  }

  const payload = (await response.json()) as {
    in_stock?: boolean;
    stock?: number;
    maxStock?: number;
    stock_status?: string;
  };

  const qty =
    typeof payload.stock === "number"
      ? payload.stock
      : typeof payload.maxStock === "number"
        ? payload.maxStock
        : undefined;

  const stockStatus = String(payload.stock_status ?? "").toLowerCase();
  const inStock =
    typeof payload.in_stock === "boolean"
      ? payload.in_stock
      : typeof qty === "number"
        ? qty > 0
        : stockStatus !== "outofstock";

  return Response.json({
    productId: id,
    stock: {
      inStock,
      qty,
      updatedAt: new Date().toISOString(),
    },
  });
}
