import type { APIRoute } from "astro";
import { logout } from "../../../lib/server/auth";
export const POST: APIRoute = async (context) => {
  try {
    await logout(context);
    return context.redirect("/admin/login", 303);
  } catch {
    return new Response("Solicitud no autorizada.", { status: 403 });
  }
};
