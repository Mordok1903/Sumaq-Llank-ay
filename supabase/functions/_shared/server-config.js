// Solo para servidor: acepta las claves administradas actuales y las variables heredadas.
export function serverKeys(env) {
  const key = (legacy, dictionary) => {
    if (env(legacy)) return env(legacy);
    try {
      return JSON.parse(env(dictionary) || "{}").default || "";
    } catch {
      throw new Error(`Configuracion invalida de ${dictionary}`);
    }
  };
  const result = {
    url: env("SUPABASE_URL"),
    secret: key("SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEYS"),
    publicKey: key("SUPABASE_ANON_KEY", "SUPABASE_PUBLISHABLE_KEYS"),
  };
  if (!result.url || !result.secret || !result.publicKey)
    throw new Error(
      "Faltan las claves administradas de Supabase en la funcion",
    );
  return result;
}
