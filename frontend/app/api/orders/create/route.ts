export async function POST(request: Request): Promise<Response> {
  const body = (await request.json()) as {
    cartId?: string;
    shippingAddress?: string;
  };

  if (!body.cartId) {
    return Response.json({ error: "cartId is required" }, { status: 400 });
  }

  const upstreamBase =
    process.env.BELIMS_API_BASE_URL ??
    "https://cms.belims.co.za/wp-json/belims/v1";
  const upstreamUrl =
    process.env.BELIMS_ORDER_CREATE_URL ?? `${upstreamBase}/orders`;

  const response = await fetch(upstreamUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const raw = await response.text();
  const data = raw
    ? (() => {
        try {
          return JSON.parse(raw) as unknown;
        } catch {
          return { raw };
        }
      })()
    : {};

  if (!response.ok) {
    return Response.json(
      {
        error: "Order creation failed",
        status: response.status,
        details: data,
      },
      { status: response.status },
    );
  }

  return Response.json(data);
}
