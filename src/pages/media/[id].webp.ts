import type { APIRoute } from "astro";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { getCatalog } from "../../lib/server/products";
import { isAdmin } from "../../lib/server/auth";
import { isLocal } from "../../lib/server/config";
import { supabase } from "../../lib/server/supabase";
export const GET: APIRoute = async (context) => {
  try {
    const { products } = await getCatalog(context, await isAdmin(context));
    const product = products.find((item) => item.id === context.params.id);
    if (!product?.imagePath || !/^[a-f0-9-]{36}\.webp$/.test(product.imagePath))
      return new Response(null, { status: 404 });
    let bytes: Uint8Array<ArrayBuffer>;
    if (isLocal())
      bytes = new Uint8Array(
        await readFile(resolve(".local/images", product.imagePath)),
      );
    else {
      const { data, error } = await supabase(context)
        .storage.from("products")
        .download(product.imagePath);
      if (error || !data) throw error;
      bytes = new Uint8Array(await data.arrayBuffer());
    }
    return new Response(bytes, {
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
