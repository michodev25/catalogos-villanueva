import type { APIRoute } from "astro";
import { login } from "../../../lib/server/auth";
import { limitedForm } from "../../../lib/server/request";
export const POST: APIRoute = async (context) => {
  try {
    const form = await limitedForm(context.request, 4096);
    await login(
      context,
      String(form.get("username") || ""),
      String(form.get("password") || ""),
    );
    return Response.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "No se pudo entrar." },
      { status: 401 },
    );
  }
};
