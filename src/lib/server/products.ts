import type { APIContext } from "astro";
import type { Product } from "../catalog";
import { isLocal, assertLocalRequest } from "./config";
import { localDb } from "./local";
import { supabase } from "./supabase";
import { isAdmin } from "./auth";

export async function getCatalog(
  context: APIContext,
  admin = false,
): Promise<{ products: Product[]; currency: string }> {
  assertLocalRequest(context.url);
  if (admin && !(await isAdmin(context)))
    throw new Error("Acceso no autorizado.");
  if (isLocal()) {
    const products = localDb()
      .prepare("SELECT data FROM products")
      .all()
      .map((row) => JSON.parse(String(row.data)) as Product);
    const settings = localDb()
      .prepare("SELECT currency FROM settings WHERE id=1")
      .get();
    return {
      products: products.filter((product) => admin || product.published),
      currency: String(settings?.currency || "USD"),
    };
  }
  const client = supabase(context);
  let query = client.from("products").select("*").order("created_at");
  if (!admin) query = query.eq("published", true);
  const [{ data, error }, settings] = await Promise.all([
    query,
    client.from("store_settings").select("currency").eq("id", 1).single(),
  ]);
  if (error || settings.error)
    throw new Error("No se pudo cargar el catálogo. Inténtalo de nuevo.");
  return {
    products: (data || []).map((row) => ({
      id: row.id,
      name: row.name,
      category: row.category,
      description: row.description,
      specifications: row.specifications,
      priceMinor: row.price_minor,
      imagePath: row.image_path,
      published: row.published,
      available: row.available,
      updatedAt: row.updated_at,
    })),
    currency: settings.data.currency,
  };
}

export async function saveProduct(
  context: APIContext,
  product: Product,
  expectedVersion: string | null,
) {
  if (isLocal()) {
    const db = localDb();
    if (expectedVersion) {
      const result = db
        .prepare(
          "UPDATE products SET data=? WHERE id=? AND json_extract(data, '$.updatedAt')=?",
        )
        .run(JSON.stringify(product), product.id, expectedVersion);
      if (!result.changes)
        throw new Error(
          "Este producto cambió en otra pestaña. Recarga para revisar la última versión.",
        );
    } else {
      const result = db
        .prepare("INSERT OR IGNORE INTO products VALUES(?, ?)")
        .run(product.id, JSON.stringify(product));
      if (!result.changes)
        throw new Error(
          "Este producto ya se guardó. Abre su ficha desde el listado.",
        );
    }
    return product;
  }
  const row = {
    id: product.id,
    name: product.name,
    category: product.category,
    description: product.description,
    specifications: product.specifications,
    price_minor: product.priceMinor,
    image_path: product.imagePath,
    published: product.published,
    available: product.available,
    updated_at: product.updatedAt,
  };
  const client = supabase(context);
  const result = expectedVersion
    ? await client
        .from("products")
        .update(row)
        .eq("id", product.id)
        .eq("updated_at", expectedVersion)
        .select("id, updated_at")
    : await client.from("products").insert(row).select("id, updated_at");
  if (result.error?.code === "23503")
    throw new Error("Selecciona una categoría válida.");
  if (result.error || !result.data?.length)
    throw new Error(
      "No se pudo guardar. El producto pudo cambiar en otra pestaña. Recarga y revisa.",
    );
  return { ...product, updatedAt: result.data[0].updated_at as string };
}

export async function deleteProduct(context: APIContext, id: string, expectedVersion: string) {
  if (isLocal()) {
    const db = localDb();
    const removed = db.prepare(
      `DELETE FROM products WHERE id = ? AND json_extract(data, '$.updatedAt') = ?
       RETURNING json_extract(data, '$.imagePath') AS image_path`,
    ).get(id, expectedVersion);
    return removed ? { imagePath: removed.image_path as string | null } : null;
  }

  const { data, error } = await supabase(context)
    .from("products")
    .delete()
    .eq("id", id)
    .eq("updated_at", expectedVersion)
    .select("image_path")
    .maybeSingle();
  if (error) throw new Error("No se pudo eliminar el producto.");
  return data ? { imagePath: data.image_path as string | null } : null;
}
