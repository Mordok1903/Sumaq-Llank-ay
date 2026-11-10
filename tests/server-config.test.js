import test from "node:test";
import assert from "node:assert/strict";
import { serverKeys } from "../supabase/functions/_shared/server-config.js";
test("el servidor admite variables heredadas y diccionarios administrados de Supabase", () => {
  const old = {
    SUPABASE_URL: "https://test.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "secreto-ficticio",
    SUPABASE_ANON_KEY: "publica-ficticia",
  };
  assert.equal(
    serverKeys((name) => old[name] || "").secret,
    "secreto-ficticio",
  );
  const current = {
    SUPABASE_URL: "https://test.supabase.co",
    SUPABASE_SECRET_KEYS: '{"default":"secreto-ficticio"}',
    SUPABASE_PUBLISHABLE_KEYS: '{"default":"publica-ficticia"}',
  };
  assert.equal(
    serverKeys((name) => current[name] || "").publicKey,
    "publica-ficticia",
  );
  assert.throws(() => serverKeys(() => ""), /Faltan/);
  assert.throws(
    () =>
      serverKeys((name) =>
        name === "SUPABASE_SECRET_KEYS" ? "contenido invalido" : "",
      ),
    /Configuracion invalida/,
  );
});
