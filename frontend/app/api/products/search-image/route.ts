export async function POST(request: Request): Promise<Response> {
  const formData = await request.formData();
  const image = formData.get("image");

  if (!image) {
    return Response.json({ error: "Image is required" }, { status: 400 });
  }

  return Response.json(
    {
      error:
        "Live visual search provider is not configured. Connect embeddings/image-search backend to enable this endpoint.",
    },
    { status: 501 },
  );
}
