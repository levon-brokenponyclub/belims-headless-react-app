export async function GET(
  _request: Request,
  context: { params: { id: string } },
): Promise<Response> {
  const { id } = context.params;

  const upstreamBase =
    process.env.BELIMS_API_BASE_URL ??
    "https://cms.belims.co.za/wp-json/belims/v1";
  const upstreamUrl = process.env.BELIMS_ORDER_TRACK_URL
    ? `${process.env.BELIMS_ORDER_TRACK_URL}/${encodeURIComponent(id)}`
    : `${upstreamBase}/orders/${encodeURIComponent(id)}`;

  const response = await fetch(upstreamUrl, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
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
        error: "Order tracking lookup failed",
        status: response.status,
        details: data,
      },
      { status: response.status },
    );
  }

  return Response.json(data);
}
