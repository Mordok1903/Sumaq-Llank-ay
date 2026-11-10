import { normalizeEvaluation } from "../supabase/functions/_shared/domain/evaluation.js";
export class EvaluationStore extends EventTarget {
  constructor(repo, owner, id, storage = globalThis.sessionStorage) {
    super();
    this.repo = repo;
    this.owner = owner;
    this.id = id;
    this.storage = storage;
    this.key = `sumaq:draft:${owner}:${id}`;
    this.queue = Promise.resolve();
    this.dirty = false;
    this.saving = false;
    this.serial = 0;
  }
  changed() {
    this.dispatchEvent(new Event("change"));
  }
  async open() {
    const row = await this.repo.get(this.id);
    this.row = row;
    this.revision = row.revision;
    this.state = structuredClone(row.payload);
    this.dirty = false;
    this.conflict = false;
    this.recoveredDraft = null;
    const raw = this.storage.getItem(this.key);
    if (raw) {
      let d;
      try {
        d = JSON.parse(raw);
      } catch {
        throw new Error(
          "El borrador local está dañado; conserve una copia antes de descartarlo",
        );
      }
      if (d.owner === this.owner && d.id === this.id && d.dirty) {
        if (row.estado === "completada") this.recoveredDraft = d.payload;
        else {
          this.state = d.payload;
          this.revision = d.revision;
          this.dirty = true;
          this.conflict = d.revision !== row.revision;
        }
      }
    }
    this.changed();
    return this;
  }
  update(capture) {
    if (this.row.estado === "completada") return;
    const next = capture(this.state);
    if (JSON.stringify(next) === JSON.stringify(this.state)) return;
    this.state = next;
    this.dirty = true;
    this.serial++;
    this.persist();
    this.changed();
  }
  persist() {
    try {
      this.storage.setItem(
        this.key,
        JSON.stringify({
          owner: this.owner,
          id: this.id,
          revision: this.revision,
          payload: this.state,
          dirty: this.dirty,
        }),
      );
    } catch {
      this.error =
        "No hay espacio para conservar el borrador. Exporte los datos y guarde en el servidor.";
      this.changed();
      throw new Error(this.error);
    }
  }
  save() {
    const operation = async () => {
      if (this.row.estado === "completada" || !this.dirty) return this.row;
      this.saving = true;
      this.error = null;
      this.changed();
      const serial = this.serial;
      try {
        const payload = normalizeEvaluation(this.state),
          row = await this.repo.save(this.id, this.revision, payload);
        this.row = row;
        this.revision = row.revision;
        if (serial === this.serial) {
          this.state = structuredClone(row.payload);
          this.dirty = false;
        }
        this.conflict = false;
        this.persist();
        return row;
      } catch (error) {
        this.error = error.message;
        this.conflict = error.name === "ConflictError";
        throw error;
      } finally {
        this.saving = false;
        this.changed();
      }
    };
    const result = this.queue.then(operation);
    this.queue = result.catch(() => {});
    return result;
  }
  async close() {
    await this.save();
    const row = await this.repo.close(this.id, this.revision);
    this.row = row;
    this.revision = row.revision;
    this.dirty = false;
    this.storage.removeItem(this.key);
    this.changed();
    return row;
  }
  async reload() {
    this.storage.removeItem(this.key);
    this.dirty = false;
    this.conflict = false;
    return this.open();
  }
}
