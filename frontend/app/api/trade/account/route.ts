export async function POST(request: Request): Promise<Response> {
  const body = (await request.json()) as { userId?: string };

  if (!body.userId) {
    return Response.json({ error: "userId is required" }, { status: 401 });
  }

  const upstreamBase =
    process.env.BELIMS_API_BASE_URL ??
    "https://cms.belims.co.za/wp-json/belims/v1";
  const upstreamUrl =
    process.env.BELIMS_TRADE_ACCOUNT_URL ?? `${upstreamBase}/trade/account`;

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
        error: "Trade account lookup failed",
        status: response.status,
        details: data,
      },
      { status: response.status },
    );
  }

  return Response.json(data);
}
