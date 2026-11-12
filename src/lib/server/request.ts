export async function limitedForm(
  request: Request,
  limit = 9 * 1024 * 1024,
): Promise<FormData> {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Formulario vacío.");
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > limit) {
      await reader.cancel();
      throw new Error("El archivo supera el tamaño permitido.");
    }
    chunks.push(value);
  }
  return new Response(Buffer.concat(chunks), {
    headers: { "Content-Type": request.headers.get("content-type") || "" },
  }).formData();
}
