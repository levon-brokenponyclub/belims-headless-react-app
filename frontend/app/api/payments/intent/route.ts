export async function POST(request: Request): Promise<Response> {
  const body = (await request.json()) as { orderId?: string; amount?: number };

  if (!body.orderId || typeof body.amount !== "number") {
    return Response.json(
      { error: "orderId and numeric amount are required" },
      { status: 400 },
    );
  }

  const upstreamBase =
    process.env.BELIMS_API_BASE_URL ??
    "https://cms.belims.co.za/wp-json/belims/v1";
  const upstreamUrl =
    process.env.BELIMS_PAYMENT_INTENT_URL ?? `${upstreamBase}/payments/intent`;

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
        error: "Payment intent creation failed",
        status: response.status,
        details: data,
      },
      { status: response.status },
    );
  }

  return Response.json(data);
}
