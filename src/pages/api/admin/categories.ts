import type { APIRoute } from "astro";
import { z } from "zod";
import { requireAdmin } from "../../../lib/server/auth";
import { deleteCategory, insertCategory } from "../../../lib/server/categories";
import { limitedForm } from "../../../lib/server/request";

const categoryName = z.string()
  .transform((name) => name.normalize("NFC").replace(/\s+/gu, " ").trim())
  .pipe(z.string().min(1).max(60).refine((name) => /[\p{L}\p{N}]/u.test(name)));

export const DELETE: APIRoute = async (context) => {
  try {
    await requireAdmin(context);
  } catch {
    return Response.json({ error: "Entra con tu cuenta para eliminar categorías." }, { status: 401 });
  }
  try {
    const form = await limitedForm(context.request, 4096);
    const id = z.string().min(1).max(100).safeParse(form.get("id"));
    if (!id.success)
      return Response.json({ error: "Selecciona una categoría válida." }, { status: 400 });
    if (!(await deleteCategory(context, id.data)))
      return Response.json(
        { error: "Tiene productos asignados. Muévelos a otra categoría antes de eliminarla." },
        { status: 409 },
      );
    return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json(
      { error: "No se pudo eliminar la categoría. Vuelve a intentarlo." },
      { status: 500 },
    );
  }
};

export const POST: APIRoute = async (context) => {
  try {
    await requireAdmin(context);
  } catch {
    return Response.json({ error: "Entra con tu cuenta para crear categorías." }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await limitedForm(context.request, 4096);
  } catch {
    return Response.json({ error: "No se pudo leer el formulario." }, { status: 400 });
  }
  const name = categoryName.safeParse(form.get("name"));
  if (!name.success) {
    return Response.json(
      { error: "Escribe un nombre de hasta 60 caracteres que contenga letras o números." },
      { status: 400 },
    );
  }

  try {
    const category = await insertCategory(context, name.data);
    if (!category)
      return Response.json({ error: "Ya existe una categoría con ese nombre." }, { status: 409 });
    return Response.json(
      { category },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { error: "No se pudo crear la categoría. Vuelve a intentarlo." },
      { status: 500 },
    );
  }
};
