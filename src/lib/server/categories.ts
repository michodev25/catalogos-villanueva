import { createHash } from "node:crypto";
import type { APIContext } from "astro";
import { sortCategories, type Category } from "../catalog";
import { assertLocalRequest, isLocal } from "./config";
import { localDb } from "./local";
import { supabase } from "./supabase";

const categoryKey = (name: string) =>
  name.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/\s+/gu, " ").trim();

export async function getCategories(context: APIContext): Promise<Category[]> {
  assertLocalRequest(context.url);
  if (isLocal()) {
    const rows = localDb().prepare("SELECT id, name FROM categories").all();
    return sortCategories(rows.map(({ id, name }) => ({ id: String(id), name: String(name) })));
  }
  const { data, error } = await supabase(context).from("categories").select("id, name");
  if (error) throw new Error("No se pudieron cargar las categorías.");
  return sortCategories(data);
}

export async function insertCategory(context: APIContext, name: string): Promise<Category | null> {
  const key = categoryKey(name);
  if (key === "todos") return null;
  const categories = await getCategories(context);
  if (categories.some((category) => categoryKey(category.name) === key)) return null;

  // Equivalent names produce the same primary key, including concurrent requests.
  const id = `cat-${createHash("sha256").update(key).digest("hex")}`;
  if (isLocal()) {
    const result = localDb()
      .prepare("INSERT OR IGNORE INTO categories (id, name) VALUES (?, ?)")
      .run(id, name);
    return result.changes ? { id, name } : null;
  }

  const { error } = await supabase(context).from("categories").insert({ id, name });
  if (error?.code === "23505") return null;
  if (error) throw new Error("No se pudo crear la categoría.");
  return { id, name };
}

// Returns false when a published product or draft still references the category.
export async function deleteCategory(context: APIContext, id: string): Promise<boolean> {
  if (isLocal()) {
    const db = localDb();
    const result = db.prepare(
      `DELETE FROM categories WHERE id = ? AND NOT EXISTS (
        SELECT 1 FROM products WHERE json_extract(data, '$.category') = categories.id
      )`,
    ).run(id);
    return Boolean(result.changes) || !db.prepare("SELECT 1 FROM categories WHERE id = ?").get(id);
  }

  const { error } = await supabase(context).from("categories").delete().eq("id", id);
  if (error?.code === "23503") return false;
  if (error) throw new Error("No se pudo eliminar la categoría.");
  return true;
}
