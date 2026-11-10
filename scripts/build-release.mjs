import { loadEnv, build } from "vite";
import { isPublicSupabaseKey } from "../supabase/functions/_shared/domain/configuration.js";
const env = { ...loadEnv("production", process.cwd(), ""), ...process.env };
if (
  env.VITE_APP_MODE !== "supabase" ||
  !/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(env.VITE_SUPABASE_URL || "") ||
  !isPublicSupabaseKey(env.VITE_SUPABASE_ANON_KEY)
)
  throw new Error(
    "Configura VITE_APP_MODE=supabase, VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY con la clave pública de Supabase. En Vercel deben estar disponibles en el entorno del despliegue (Preview o Production). El modo de prueba local no se publica.",
  );
if (
  Object.keys(env).some(
    (key) =>
      key.startsWith("VITE_") &&
      /(SECRET|SERVICE_ROLE|PASSWORD|PRIVATE)/i.test(key),
  )
)
  throw new Error(
    "Hay un secreto en las variables públicas VITE_. Retírelo antes de publicar.",
  );
await build();
