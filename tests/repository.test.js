import test from "node:test";
import assert from "node:assert/strict";
import "fake-indexeddb/auto";
globalThis.addEventListener = () => {};
const { LocalRepository: repo } = await import("../js/repository.js");
const { complete } = await import("./fixtures.js");
const { verifyReport } =
  await import("../supabase/functions/_shared/domain/evaluation.js");
const metadata = {
  metodo: "ambos",
  lado: "ambos",
  descripcion: "Postura documentada en prueba local",
  fotograma_segundos: 0,
};
const photo = () =>
  new File([new Uint8Array([255, 216, 255, 0])], "prueba.jpg", {
    type: "image/jpeg",
  });
const video = () =>
  new File(
    [new Uint8Array([0, 0, 0, 20, 102, 116, 121, 112, 105, 115, 111, 109])],
    "prueba.mp4",
    { type: "video/mp4" },
  );
test("repositorio local: carga concurrente respeta cupo atómico y cierre inmutable con seguimiento", async () => {
  const row = await repo.create();
  await repo.save(row.id, 0, complete());
  const uploads = await Promise.allSettled(
    Array.from({ length: 12 }, () => repo.upload(row.id, photo(), metadata)),
  );
  assert.equal(uploads.filter((r) => r.status === "fulfilled").length, 10);
  assert.equal(uploads.filter((r) => r.status === "rejected").length, 2);
  const initial = await repo.evidence(row.id);
  await repo.removeMedia(initial[0].id);
  assert.equal((await repo.evidence(row.id)).length, 9);
  await repo.upload(row.id, video(), metadata);
  await repo.close(row.id, 1);
  const report = await repo.report(row.id);
  assert.equal(await verifyReport(report), true);
  const edited = structuredClone(report);
  edited.snapshot.payload.identificacion.empresa = "Modificada";
  assert.equal(await verifyReport(edited), false);
  await assert.rejects(repo.save(row.id, 2, complete()), /cerrado/);
  await assert.rejects(repo.upload(row.id, photo(), metadata), /cerrado/);
  await assert.rejects(repo.removeMedia(initial[1].id), /cerrado/);
  const control = (await repo.controls(row.id))[0];
  await assert.rejects(
    repo.trackControl(control.id, row.id, "verificada", ""),
    /verificación/,
  );
  await repo.trackControl(
    control.id,
    row.id,
    "verificada",
    "Altura revisada durante la prueba",
  );
  assert.equal((await repo.controls(row.id))[0].estado, "verificada");
  assert.equal((await repo.report(row.id)).sha256, report.sha256);
});
