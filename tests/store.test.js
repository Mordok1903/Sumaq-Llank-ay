import test from "node:test";
import assert from "node:assert/strict";
import { EvaluationStore } from "../js/store.js";
import {
  emptyEvaluation,
  normalizeEvaluation,
} from "../supabase/functions/_shared/domain/evaluation.js";
class Storage {
  data = new Map();
  getItem(k) {
    return this.data.get(k) || null;
  }
  setItem(k, v) {
    this.data.set(k, v);
  }
  removeItem(k) {
    this.data.delete(k);
  }
}
function fake() {
  const rows = new Map(
    ["A", "B"].map((id) => [
      id,
      { id, revision: 0, estado: "en_progreso", payload: emptyEvaluation() },
    ]),
  );
  return {
    rows,
    async get(id) {
      return structuredClone(rows.get(id));
    },
    async save(id, revision, payload) {
      await new Promise((r) => setTimeout(r, 10));
      const current = rows.get(id);
      if (current.revision !== revision) {
        const e = new Error("Conflicto");
        e.name = "ConflictError";
        throw e;
      }
      const row = {
        ...current,
        revision: revision + 1,
        payload: normalizeEvaluation(payload),
      };
      rows.set(id, row);
      return structuredClone(row);
    },
  };
}
test("el guardado serializa cambios concurrentes conservando el más reciente", async () => {
  const repo = fake(),
    store = await new EvaluationStore(repo, "user", "A", new Storage()).open();
  store.update((s) => ({ ...s, identificacion: { empresa: "Anterior" } }));
  const first = store.save();
  await new Promise((r) => setTimeout(r, 2));
  store.update((s) => ({ ...s, identificacion: { empresa: "Reciente" } }));
  const second = store.save();
  await Promise.all([first, second]);
  assert.equal(repo.rows.get("A").payload.identificacion.empresa, "Reciente");
  assert.equal(store.dirty, false);
});
test("el ID queda fijado por pestaña y nunca se toma de una clave global", async () => {
  const repo = fake(),
    storage = new Storage(),
    a = await new EvaluationStore(repo, "user", "A", storage).open(),
    b = await new EvaluationStore(repo, "user", "B", storage).open();
  a.update((s) => ({ ...s, identificacion: { empresa: "Empresa A" } }));
  b.update((s) => ({ ...s, identificacion: { empresa: "Empresa B" } }));
  await Promise.all([a.save(), b.save()]);
  assert.equal(repo.rows.get("A").payload.identificacion.empresa, "Empresa A");
  assert.equal(repo.rows.get("B").payload.identificacion.empresa, "Empresa B");
});
test("un conflicto conserva el borrador; abrir no genera escrituras", async () => {
  const repo = fake(),
    storage = new Storage(),
    a = await new EvaluationStore(repo, "user", "A", new Storage()).open(),
    b = await new EvaluationStore(repo, "user", "A", storage).open();
  assert.equal(repo.rows.get("A").revision, 0);
  a.update((s) => ({ ...s, identificacion: { empresa: "Remoto" } }));
  await a.save();
  b.update((s) => ({ ...s, identificacion: { empresa: "Borrador" } }));
  await assert.rejects(b.save(), /Conflicto/);
  assert.equal(b.dirty, true);
  assert.equal(b.conflict, true);
  assert.equal(
    JSON.parse(storage.getItem(b.key)).payload.identificacion.empresa,
    "Borrador",
  );
  assert.equal(repo.rows.get("A").payload.identificacion.empresa, "Remoto");
});
test("los borradores de otro usuario no se cargan y los fallos no indican éxito", async () => {
  const repo = fake(),
    storage = new Storage(),
    a = await new EvaluationStore(repo, "owner", "A", storage).open();
  a.update((s) => ({ ...s, identificacion: { empresa: "Privado" } }));
  const b = await new EvaluationStore(repo, "other", "A", storage).open();
  assert.equal(b.state.identificacion.empresa, undefined);
  repo.save = async () => {
    throw new Error("Sin conexión");
  };
  await assert.rejects(a.save(), /Sin conexión/);
  assert.equal(a.dirty, true);
  assert.equal(a.error, "Sin conexión");
});
test("un cierre en otra sesión conserva el borrador anterior exportable y muestra el expediente del servidor", async () => {
  const repo = fake(),
    storage = new Storage(),
    store = await new EvaluationStore(repo, "user", "A", storage).open();
  store.update((s) => ({
    ...s,
    identificacion: { empresa: "Borrador previo" },
  }));
  repo.rows.get("A").estado = "completada";
  repo.rows.get("A").payload.identificacion.empresa = "Informe cerrado";
  await store.open();
  assert.equal(store.state.identificacion.empresa, "Informe cerrado");
  assert.equal(store.dirty,false);
  assert.equal(store.recoveredDraft.identificacion.empresa, "Borrador previo");
  assert.equal(
    JSON.parse(storage.getItem(store.key)).payload.identificacion.empresa,
    "Borrador previo",
  );
});
