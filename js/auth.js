import { createClient } from "@supabase/supabase-js";
import { CONFIG } from "./config.js";
export const client =
  CONFIG.mode === "supabase"
    ? createClient(CONFIG.url, CONFIG.key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          flowType: "pkce",
          storageKey: "sumaq-auth-v2",
        },
      })
    : null;
const DEMO_USER = Object.freeze({
  id: "demo-user",
  nombre: "Evaluador de prueba",
  email: "prueba@local.invalid",
  rol: "admin",
});
let profile = null;
export async function getIdentity() {
  if (!client) return DEMO_USER;
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return null;
  const result = await client
    .from("perfiles")
    .select("id,nombre,email,rol")
    .eq("id", data.user.id)
    .single();
  if (result.error)
    throw new Error(
      "No se pudo verificar el perfil. Intente iniciar sesión otra vez.",
    );
  return (profile = result.data);
}
export async function login(email, password) {
  if (!client) return DEMO_USER;
  const { error } = await client.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error)
    throw new Error(
      "Revise el correo, la contraseña y la confirmación del correo.",
    );
  return getIdentity();
}
export function clearDrafts(owner) {
  for (const key of Object.keys(sessionStorage))
    if (
      key.startsWith(`sumaq:draft:${owner}:`) ||
      key === `sumaq:active:${owner}`
    )
      sessionStorage.removeItem(key);
  localStorage.removeItem("siga_state");
  localStorage.removeItem("siga_evaluacion_id");
}
export async function logout() {
  const owner = profile?.id || DEMO_USER.id;
  if (client) {
    const { error } = await client.auth.signOut();
    if (error) throw new Error("No se pudo cerrar la sesión");
  }
  clearDrafts(owner);
  profile = null;
  location.href = "/pages/login.html";
}
if (client)
  client.auth.onAuthStateChange((event, session) => {
    if (
      event === "SIGNED_OUT" ||
      (profile && session?.user.id !== profile.id)
    ) {
      if (profile) clearDrafts(profile.id);
      profile = null;
      document.querySelector(".main-content")?.replaceChildren();
      document.body.classList.remove("auth-ready");
      if (!location.pathname.endsWith("login.html"))
        location.replace("/pages/login.html");
    }
  });
