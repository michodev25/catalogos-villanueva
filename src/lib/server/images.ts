import sharp from "sharp";
import { randomUUID } from "node:crypto";
import { writeFile, unlink } from "node:fs/promises";
import { resolve } from "node:path";
import type { APIContext } from "astro";
import { maxPhotoBytes, photoTypes, productImagePaths } from "../catalog";
import { env, isLocal } from "./config";
import { cloudinaryPublicId, removeCloudinaryPhoto, uploadCloudinaryPhoto } from "./cloudinary";
import { supabase } from "./supabase";
import { localDb } from "./local";
import { getCatalog } from "./products";

export async function uploadImage(
  context: APIContext,
  file: File,
): Promise<string> {
  if (
    file.size > maxPhotoBytes ||
    !photoTypes.includes(file.type)
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
  const id = randomUUID();
  const path = `${id}.webp`;
  if (isLocal()) {
    localDb();
    await writeFile(resolve(".local/images", path), buffer, { flag: "wx" });
  } else {
    const cloudinaryUrl = env("CLOUDINARY_URL");
    if (cloudinaryUrl) return uploadCloudinaryPhoto(cloudinaryUrl, id, buffer);
    const { error } = await supabase(context)
      .storage.from("products")
      .upload(path, buffer, { contentType: "image/webp", upsert: false });
    if (error) throw new Error("No se pudo subir la foto. Inténtalo de nuevo.");
  }
  return path;
}
export async function removeImages(context: APIContext, paths: string[]) {
  const stored = [...new Set(paths)];
  if (!stored.length) return;
  const { products } = await getCatalog(context, true);
  const inUse = new Set(products.flatMap(productImagePaths));
  const unused = stored.filter((path) => !inUse.has(path));
  const webpPaths = unused.filter((path) => /^[a-f0-9-]{36}\.webp$/.test(path));
  if (isLocal()) {
    await Promise.allSettled(webpPaths.map((path) => unlink(resolve(".local/images", path))));
    return;
  }
  const cloudinaryUrl = env("CLOUDINARY_URL");
  const deletions = unused.flatMap((path) => {
    const publicId = cloudinaryPublicId(path);
    return publicId && cloudinaryUrl ? [removeCloudinaryPhoto(cloudinaryUrl, publicId)] : [];
  });
  const storageDeletion = webpPaths.length
    ? supabase(context).storage.from("products").remove(webpPaths)
    : null;
  await Promise.allSettled([...deletions, storageDeletion]);
}
