export function env(name: string): string {
  return process.env[name] || (import.meta.env?.[name] as string) || "";
}
export const isLocal = () => env("DATA_MODE") === "local";
export function assertLocalRequest(url: URL) {
  if (
    isLocal() &&
    (import.meta.env.PROD ||
      !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname))
  ) {
    throw new Error(
      "El modo de demostración solo funciona en desarrollo local. Configura Supabase para publicar.",
    );
  }
}
