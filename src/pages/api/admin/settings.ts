import type { APIRoute } from "astro";
import { requireAdmin } from "../../../lib/server/auth";
import { isLocal } from "../../../lib/server/config";
import { localDb } from "../../../lib/server/local";
import { supabase } from "../../../lib/server/supabase";
export const POST: APIRoute = async (context) => {
  try {
    await requireAdmin(context);
  } catch {
    return Response.json({ error: "Acceso no autorizado." }, { status: 401 });
  }
  try {
    const { currency } = await context.request.json();
    if (!["CUP", "USD", "EUR"].includes(currency))
      throw new Error("Moneda no válida.");
    if (isLocal())
      localDb()
        .prepare("UPDATE settings SET currency=? WHERE id=1")
        .run(currency);
    else {
      const { error } = await supabase(context)
        .from("store_settings")
        .update({ currency })
        .eq("id", 1);
      if (error) throw error;
    }
    return Response.json({ currency });
  } catch {
    return Response.json(
      { error: "No se pudo cambiar la moneda." },
      { status: 400 },
    );
  }
};
