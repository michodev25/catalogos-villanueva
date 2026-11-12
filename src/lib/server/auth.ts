import {
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import type { APIContext } from "astro";
import { env, isLocal, assertLocalRequest } from "./config";
import { localDb } from "./local";
import { supabase } from "./supabase";

const attempts = new Map<string, { count: number; until: number }>();
const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

export async function isAdmin(context: APIContext): Promise<boolean> {
  assertLocalRequest(context.url);
  if (isLocal()) {
    const token = context.cookies.get("villanueva_session")?.value;
    return (
      !!token &&
      !!localDb()
        .prepare("SELECT token FROM sessions WHERE token = ? AND expires > ?")
        .get(hashToken(token), Date.now())
    );
  }
  const { data, error } = await supabase(context).auth.getUser();
  return !error && !!data.user && data.user.id === env("ADMIN_USER_ID");
}
export function checkOrigin(context: APIContext) {
  const origin = context.request.headers.get("origin");
  if (origin !== (env("APP_ORIGIN") || context.url.origin))
    throw new Error("Solicitud no autorizada. Recarga la página.");
}
export async function requireAdmin(context: APIContext) {
  checkOrigin(context);
  if (!(await isAdmin(context)))
    throw new Error("La sesión ha caducado. Vuelve a entrar para guardar.");
}
export async function login(
  context: APIContext,
  username: string,
  password: string,
) {
  checkOrigin(context);
  assertLocalRequest(context.url);
  let address = "unknown";
  try {
    address = context.clientAddress;
  } catch {
    /* Use the restrictive shared bucket if the adapter cannot provide an IP. */
  }
  const now = Date.now();
  for (const [key, value] of attempts)
    if (value.until < now) attempts.delete(key);
  const attempt = attempts.get(address) || {
    count: 0,
    until: now + 15 * 60_000,
  };
  if (attempt.count >= 5)
    throw new Error(
      "Demasiados intentos. Espera 15 minutos antes de volver a entrar.",
    );
  attempt.count++;
  attempts.set(address, attempt);
  let valid = false;
  if (username === "admin" && password.length <= 256) {
    if (isLocal()) {
      const encoded = env("ADMIN_PASSWORD_HASH");
      const [salt, expected] = encoded.split(":");
      if (!salt || !expected)
        throw new Error(
          "Configura ADMIN_PASSWORD_HASH para entrar al panel local.",
        );
      const computed = scryptSync(password, salt, 64);
      const stored = Buffer.from(expected, "hex");
      valid =
        stored.length === computed.length && timingSafeEqual(computed, stored);
      if (valid) {
        const token = randomBytes(32).toString("hex");
        localDb().prepare("DELETE FROM sessions WHERE expires <= ?").run(now);
        localDb()
          .prepare("INSERT INTO sessions VALUES(?, ?)")
          .run(hashToken(token), now + 8 * 3600_000);
        context.cookies.set("villanueva_session", token, {
          httpOnly: true,
          sameSite: "strict",
          path: "/",
          secure: false,
          maxAge: 8 * 3600,
        });
      }
    } else {
      const client = supabase(context);
      const { data, error } = await client.auth.signInWithPassword({
        email: env("ADMIN_EMAIL"),
        password,
      });
      valid = !error && data.user?.id === env("ADMIN_USER_ID");
      if (!valid && data.session) await client.auth.signOut();
    }
  }
  if (!valid) throw new Error("Usuario o contraseña incorrectos.");
  attempts.delete(address);
}
export async function logout(context: APIContext) {
  checkOrigin(context);
  if (isLocal()) {
    const token = context.cookies.get("villanueva_session")?.value;
    if (token)
      localDb()
        .prepare("DELETE FROM sessions WHERE token = ?")
        .run(hashToken(token));
    context.cookies.delete("villanueva_session", { path: "/" });
  } else await supabase(context).auth.signOut();
}
