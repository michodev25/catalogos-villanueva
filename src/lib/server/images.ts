import sharp from "sharp";
import { randomUUID } from "node:crypto";
import { writeFile, unlink } from "node:fs/promises";
import { resolve } from "node:path";
import type { APIContext } from "astro";
import { isLocal } from "./config";
import { supabase } from "./supabase";
import { localDb } from "./local";
import { getCatalog } from "./products";

export async function uploadImage(
  context: APIContext,
  file: File,
): Promise<string> {
  if (
    file.size > 8 * 1024 * 1024 ||
    !["image/jpeg", "image/png", "image/webp"].includes(file.type)
  )
    throw new Error("Usa una foto JPG, PNG o WebP de hasta 8 MB.");
  const image = sharp(Buffer.from(await file.arrayBuffer()), {
    limitInputPixels: 24_000_000,
  });
  const metadata = await image.metadata();
  if (!["jpeg", "png", "webp"].includes(metadata.format || ""))
    throw new Error("El contenido del archivo no es una foto válida.");
  const buffer = await image
    .rotate()
    .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
  const path = `${randomUUID()}.webp`;
  if (isLocal()) {
    localDb();
    await writeFile(resolve(".local/images", path), buffer, { flag: "wx" });
  } else {
    const { error } = await supabase(context)
      .storage.from("products")
      .upload(path, buffer, { contentType: "image/webp", upsert: false });
    if (error) throw new Error("No se pudo subir la foto. Inténtalo de nuevo.");
  }
  return path;
}
export async function removeImage(context: APIContext, path: string) {
  if (!/^[a-f0-9-]{36}\.webp$/.test(path)) return;
  const { products } = await getCatalog(context, true);
  if (products.some((product) => product.imagePath === path)) return;
  if (isLocal()) await unlink(resolve(".local/images", path)).catch(() => {});
  else await supabase(context).storage.from("products").remove([path]);
}
