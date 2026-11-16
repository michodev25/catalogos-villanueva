import type { APIRoute } from "astro";
import { z } from "zod";
import { maxProductPhotos, parsePrice, productImagePaths, type Product } from "../../../lib/catalog";
import { requireAdmin } from "../../../lib/server/auth";
import { deleteProduct, getCatalog, saveProduct } from "../../../lib/server/products";
import { uploadImage, removeImages } from "../../../lib/server/images";
import { limitedForm } from "../../../lib/server/request";
import { getCategories } from "../../../lib/server/categories";

const productId = z.string().regex(/^[a-zA-Z0-9-]{1,100}$/);
const photoOrder = z.array(z.string().max(100).nullable()).max(maxProductPhotos);

function productPhotos(form: FormData, currentPaths: string[]) {
  const requested = form.get("photoOrder");
  if (requested === null) {
    const file = form.get("image");
    if (file instanceof File && file.size)
      return { order: [null, ...currentPaths.slice(1)], files: [file] };
    return { order: currentPaths, files: [] };
  }

  const files = form.getAll("photos");
  try {
    const order = photoOrder.parse(JSON.parse(String(requested)));
    const keep = order.filter((path) => path !== null);
    if (
      files.every((file): file is File => file instanceof File && file.size > 0) &&
      files.length === order.length - keep.length &&
      new Set(keep).size === keep.length &&
      keep.every((path) => currentPaths.includes(path))
    ) return { order, files };
  } catch {
    // A malformed order gets the same message as invalid file positions.
  }
  throw new Error("Revisa las fotos. Puedes guardar hasta tres por producto.");
}

export const DELETE: APIRoute = async (context) => {
  try {
    await requireAdmin(context);
  } catch {
    return Response.json({ error: "Entra con tu cuenta para eliminar productos." }, { status: 401 });
  }
  try {
    const form = await limitedForm(context.request, 4096);
    const id = productId.safeParse(form.get("id"));
    const version = z.iso.datetime({ offset: true }).safeParse(form.get("expectedUpdatedAt"));
    if (!id.success || !version.success)
      return Response.json({ error: "Recarga la ficha e inténtalo de nuevo." }, { status: 400 });

    const removed = await deleteProduct(context, id.data, version.data);
    if (!removed)
      return Response.json(
        { error: "Este producto cambió o ya fue eliminado. Recarga para revisar." },
        { status: 409 },
      );
    await removeImages(context, removed).catch(() => {});
    return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json(
      { error: "No se pudo eliminar el producto. Vuelve a intentarlo." },
      { status: 500 },
    );
  }
};

export const POST: APIRoute = async (context) => {
  try {
    await requireAdmin(context);
  } catch {
    return Response.json(
      { error: "Entra con tu cuenta para guardar los cambios." },
      { status: 401 },
    );
  }
  const uploaded: string[] = [];
  let saveStarted = false;
  try {
    const form = await limitedForm(context.request);
    const id = productId.parse(form.get("id"));
    const expected =
      z
        .string()
        .max(100)
        .parse(form.get("expectedUpdatedAt") || "") || null;
    const [{ products }, categories] = await Promise.all([
      getCatalog(context, true),
      getCategories(context),
    ]);
    const category = form.get("category");
    if (typeof category !== "string" || !categories.some(({ id }) => id === category))
      throw new Error("Selecciona una categoría válida.");
    const current = products.find((item) => item.id === id);
    if ((current?.updatedAt || null) !== expected)
      throw new Error(
        "Este producto cambió en otra pestaña. Recarga para revisar la última versión.",
      );
    const priceText = String(form.get("price") || "").trim();
    const currentPaths = current ? productImagePaths(current) : [];
    const { order, files } = productPhotos(form, currentPaths);
    const product: Product = {
      id,
      name: z
        .string()
        .trim()
        .max(120)
        .parse(form.get("name") || ""),
      description: z
        .string()
        .trim()
        .max(4000)
        .parse(form.get("description") || ""),
      category,
      specifications: z
        .array(
          z.object({
            label: z.string().trim().min(1).max(50),
            value: z.string().trim().min(1).max(200),
          }),
        )
        .max(20)
        .parse(JSON.parse(String(form.get("specifications") || "[]"))),
      priceMinor: priceText ? parsePrice(priceText) : null,
      imagePath: null,
      published: form.get("published") === "true",
      available: form.get("available") === "true",
      updatedAt: new Date().toISOString(),
    };
    if (
      product.published &&
      (!product.name || !order.length || !product.priceMinor)
    )
      throw new Error(
        "Para publicar, añade nombre, foto y un precio mayor que cero.",
      );
    const paths: string[] = [];
    for (const path of order) {
      if (path !== null) {
        paths.push(path);
      } else {
        const stored = await uploadImage(context, files[uploaded.length]);
        uploaded.push(stored);
        paths.push(stored);
      }
    }
    product.imagePath = paths[0] ?? null;
    product.additionalImagePaths = paths.slice(1);
    saveStarted = true;
    const savedProduct = await saveProduct(context, product, expected);
    await removeImages(context, currentPaths.filter((path) => !paths.includes(path))).catch(() => {});
    return Response.json(
      { product: savedProduct },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    // A failed response does not prove the write failed. Retain the new image
    // after starting a save so a committed product never loses its photo.
    if (!saveStarted) await removeImages(context, uploaded).catch(() => {});
    return Response.json(
      {
        error:
          error instanceof z.ZodError
            ? "Revisa los campos. El nombre admite hasta 120 caracteres y la descripción hasta 4000."
            : error instanceof Error
              ? error.message
              : "No se pudo guardar. Vuelve a intentarlo.",
      },
      { status: 400 },
    );
  }
};
