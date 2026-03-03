export async function POST(request: Request): Promise<Response> {
  const body = (await request.json()) as {
    cartId?: string;
    userId?: string;
    delaySeconds?: number;
  };

  // TODO: Schedule reminder via notification/CRM system.
  if (!body.cartId) {
    return Response.json({ error: "cartId is required" }, { status: 400 });
  }

  return Response.json({
    ok: true,
    message: "Cart reminder scheduled (mock).",
    scheduledFor: new Date(
      Date.now() + (body.delaySeconds ?? 60) * 1000,
    ).toISOString(),
  });
}
