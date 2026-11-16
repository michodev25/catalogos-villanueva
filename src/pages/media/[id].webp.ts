import type { APIRoute } from "astro";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { productImagePaths } from "../../lib/catalog";
import { getCatalog } from "../../lib/server/products";
import { isAdmin } from "../../lib/server/auth";
import { env, isLocal } from "../../lib/server/config";
import { supabase } from "../../lib/server/supabase";
import { cloudinaryDeliveryUrl, cloudinaryPublicId } from "../../lib/server/cloudinary";
export const GET: APIRoute = async (context) => {
  const position = context.url.searchParams.get("photo") ?? "1";
  if (!/^[1-3]$/.test(position)) return new Response(null, { status: 404 });
  try {
    const { products } = await getCatalog(context, await isAdmin(context));
    const product = products.find((item) => item.id === context.params.id);
    const path = product && productImagePaths(product)[Number(position) - 1];
    if (!path) return new Response(null, { status: 404 });
    let body: BodyInit;
    const publicId = cloudinaryPublicId(path);
    if (publicId) {
      const connectionUrl = env("CLOUDINARY_URL");
      if (!connectionUrl) return new Response(null, { status: 404 });
      const thumbnail = context.url.searchParams.get("size") === "thumb";
      const deliveryUrl = await cloudinaryDeliveryUrl(connectionUrl, publicId, thumbnail);
      const response = await fetch(deliveryUrl, {
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok || !response.body) return new Response(null, { status: 404 });
      body = response.body;
    } else if (!/^[a-f0-9-]{36}\.webp$/.test(path)) {
      return new Response(null, { status: 404 });
    } else if (isLocal()) {
      body = new Uint8Array(await readFile(resolve(".local/images", path)));
    } else {
      const { data, error } = await supabase(context)
        .storage.from("products")
        .download(path);
      if (error || !data) throw error;
      body = data;
    }
    return new Response(body, {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
};
