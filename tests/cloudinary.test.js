import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  cloudinary,
  signature,
} from "../supabase/functions/_shared/cloudinary.js";
test("firmas ordenadas y URLs temporales de entrega autenticada", async () => {
  assert.equal(
    await signature({ z: 2, a: 1 }, "test-secret"),
    createHash("sha1").update("a=1&z=2test-secret").digest("hex"),
  );
  const cloud = cloudinary({
      cloud: "demo",
      key: "test-key",
      secret: "test-secret",
    }),
    url = new URL(await cloud.downloadURL("video", "siga_test", "mp4"));
  assert.equal(url.searchParams.get("type"), "authenticated");
  assert.ok(Number(url.searchParams.get("expires_at")) > Date.now() / 1000);
  assert.ok(
    Number(url.searchParams.get("expires_at")) < Date.now() / 1000 + 301,
  );
  assert.equal(url.searchParams.has("secret"), false);
});
test("borrado firmado incluye invalidación; not found es idempotente", async () => {
  let form;
  const cloud = cloudinary(
    { cloud: "demo", key: "test", secret: "test" },
    async (url, options) => {
      form = options.body;
      return Response.json({ result: "not found" });
    },
  );
  await cloud.destroy("image", "siga_test");
  assert.equal(form.get("invalidate"), "true");
  assert.equal(form.get("type"), "authenticated");
  assert.ok(form.get("signature"));
});
