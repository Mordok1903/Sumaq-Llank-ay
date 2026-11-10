import test from "node:test";
import assert from "node:assert/strict";
import { isPublicSupabaseKey } from "../supabase/functions/_shared/domain/configuration.js";
test("el cliente rechaza claves secretas y JWT del rol de servicio", () => {
  const jwt = (role) =>
    `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ role })).toString("base64url")}.firma`;
  assert.equal(isPublicSupabaseKey(jwt("anon")), true);
  assert.equal(isPublicSupabaseKey(jwt("service_role")), false);
  assert.equal(isPublicSupabaseKey("sb_secret_no_publicar"), false);
  assert.equal(isPublicSupabaseKey("sb_publishable_claveficticia"), true);
  assert.equal(isPublicSupabaseKey("texto_invalido"), false);
});
