import { isPublicSupabaseKey } from "../supabase/functions/_shared/domain/configuration.js";
const env = import.meta.env || {};
export const CONFIG = Object.freeze({
  mode: env.VITE_APP_MODE || "demo",
  url: env.VITE_SUPABASE_URL || "",
  key: env.VITE_SUPABASE_ANON_KEY || "",
  maxImageBytes: 10_000_000,
  maxVideoBytes: 25_000_000,
  maxPhotos: 10,
  maxVideos: 3,
  imageTypes: ["image/jpeg", "image/png", "image/webp"],
  videoTypes: ["video/mp4", "video/quicktime", "video/webm"],
});
if (!["demo", "supabase"].includes(CONFIG.mode))
  throw new Error("Modo de aplicación inválido");
if (
  CONFIG.mode === "supabase" &&
  (!(
    CONFIG.url.startsWith("https://") ||
    (env.DEV && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(CONFIG.url))
  ) ||
    !isPublicSupabaseKey(CONFIG.key))
)
  throw new Error("Falta configurar el proyecto Supabase de desarrollo");
