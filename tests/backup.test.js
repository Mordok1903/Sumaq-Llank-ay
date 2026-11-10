import test from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import { encryptBackup, verifyBackup } from "../scripts/backup.mjs";
test("respaldo cifrado detecta contraseña incorrecta, truncado y alteración", async () => {
  await mkdir("test-results", { recursive: true });
  const path = `test-results/backup-${crypto.randomUUID()}.enc`,
    password = "clave ficticia para probar cifrado";
  try {
    await encryptBackup(Readable.from(["expediente ficticio"]), path, password);
    assert.equal((await verifyBackup(path, password)).verified, true);
    await assert.rejects(
      verifyBackup(path, "otra contraseña suficientemente larga"),
    );
    const bytes = await readFile(path);
    assert.equal(bytes.includes(Buffer.from("expediente ficticio")), false);
    bytes[40] ^= 1;
    await writeFile(path, bytes);
    await assert.rejects(verifyBackup(path, password));
    await writeFile(path, bytes.subarray(0, 20));
    await assert.rejects(verifyBackup(path, password), /incompleto/);
  } finally {
    await unlink(path).catch(() => {});
  }
});
