import { createServerClient } from "@supabase/ssr";
import type { APIContext } from "astro";
import { env } from "./config";

export function supabase(context: APIContext) {
  const url = env("SUPABASE_URL");
  const key = env("SUPABASE_PUBLISHABLE_KEY");
  if (!url || !key) throw new Error("Falta configurar la conexión a Supabase.");
  return createServerClient(url, key, {
    cookies: {
      getAll: () =>
        Object.entries(
          context.request.headers
            .get("cookie")
            ?.split(";")
            .reduce<Record<string, string>>((cookies, entry) => {
              const index = entry.indexOf("=");
              if (index >= 0)
                cookies[entry.slice(0, index).trim()] = decodeURIComponent(
                  entry.slice(index + 1),
                );
              return cookies;
            }, {}) || {},
        ).map(([name, value]) => ({ name, value })),
      setAll: (cookies) =>
        cookies.forEach(({ name, value, options }) =>
          context.cookies.set(name, value, {
            ...options,
            path: "/",
            httpOnly: true,
            sameSite: "lax",
            secure: context.url.protocol === "https:",
          }),
        ),
    },
  });
}
