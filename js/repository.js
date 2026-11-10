import { client } from "./auth.js";
import { CONFIG } from "./config.js";
import {
  emptyEvaluation,
  normalizeEvaluation,
  validateClosure,
  canonical,
  sha256,
} from "../supabase/functions/_shared/domain/evaluation.js";
export class ConflictError extends Error {
  constructor() {
    super(
      "Otra pestaña o persona modificó la evaluación. Exporte su borrador y recargue la versión guardada.",
    );
    this.name = "ConflictError";
  }
}
export async function api(action, body = {}) {
  const { data, error } = await client.functions.invoke("siga-api", {
    body: body instanceof FormData ? body : { action, ...body },
  });
  if (error) {
    let message;
    try {
      message = (await error.context?.json())?.error;
    } catch {}
    if (error.context?.status === 409) throw new ConflictError();
    throw new Error(
      message ||
        "No se pudo contactar con el servidor. El borrador sigue en esta pestaña.",
    );
  }
  if (data?.error) throw new Error(data.error);
  return data;
}
function legacyPayload(row) {
  const s = emptyEvaluation(),
    aliases = {
      fechaEval: "fecha_eval",
      duracionCiclo: "duracion_ciclo",
      duracionJornada: "duracion_jornada",
      descripcionTarea: "descripcion_tarea",
      cargoMonitorista: "cargo_monitorista",
    };
  for (const key of [
    "empresa",
    "ruc",
    "sede",
    "area",
    "actividad",
    "fechaEval",
    "trabajador",
    "dni",
    "puesto",
    "antiguedad",
    "sexo",
    "turno",
    "tarea",
    "fase",
    "duracionCiclo",
    "duracionJornada",
    "frecuencia",
    "descripcionTarea",
    "monitorista",
    "cargoMonitorista",
    "observaciones",
  ])
    s.identificacion[key] = row[aliases[key] || key] || "";
  Object.assign(s.identificacion, row.checklist || {});
  s.reba = row.reba_datos || {};
  s.rula = row.rula_datos || {};
  s.psicosocial = row.psicosocial_datos || { respuestas: {} };
  return normalizeEvaluation(s);
}
export const RemoteRepository = {
  async create() {
    return api("create");
  },
  async get(id) {
    const { data, error } = await client
      .from("evaluaciones")
      .select("*")
      .eq("id", id)
      .single();
    if (error)
      throw new Error(
        "La evaluación no existe o no tiene permiso para abrirla",
      );
    return { ...data, payload: data.payload || legacyPayload(data) };
  },
  async save(id, revision, payload) {
    return api("save", { id, revision, payload });
  },
  async close(id, revision) {
    return api("close", { id, revision });
  },
  async list(filters, page = 0) {
    let q = client
      .from("evaluaciones")
      .select(
        "id,empresa,trabajador,fecha_eval,estado,reba_puntaje_final,rula_puntaje_final,psicosocial_promedio,revision,updated_at",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .order("id")
      .range(page * 20, page * 20 + 19);
    if (filters.estado) q = q.eq("estado", filters.estado);
    if (filters.desde) q = q.gte("fecha_eval", filters.desde);
    if (filters.hasta) q = q.lte("fecha_eval", filters.hasta);
    const term = (filters.buscar || "")
      .replace(/[^\p{L}\p{N}\s-]/gu, "")
      .trim()
      .slice(0, 80);
    if (term) q = q.or(`empresa.ilike.%${term}%,trabajador.ilike.%${term}%`);
    const { data, count, error } = await q;
    if (error) throw new Error("No se pudo cargar el historial");
    return { rows: data, count };
  },
  async evidence(id) {
    const { data, error } = await client
      .from("evidencias")
      .select(
        "id,evaluacion_id,tipo,nombre_archivo,descripcion,metodo,lado,fotograma_segundos,sha256,created_at,estado",
      )
      .eq("evaluacion_id", id)
      .order("created_at");
    if (error) throw new Error("No se pudieron cargar las evidencias");
    return data;
  },
  async upload(id, file, meta) {
    const form = new FormData();
    form.set("action", "upload");
    form.set("id", id);
    form.set("file", file);
    form.set("meta", JSON.stringify(meta));
    return api("upload", form);
  },
  async removeMedia(id) {
    return api("delete-media", { id });
  },
  async mediaURL(id) {
    return (await api("media-url", { id })).url;
  },
  async report(id) {
    const { data, error } = await client
      .from("informes")
      .select("*")
      .eq("evaluacion_id", id)
      .single();
    if (error) throw new Error("No hay un informe cerrado disponible");
    return data;
  },
  async events(id) {
    const { data, error } = await client
      .from("auditoria")
      .select("id,accion,actor_id,revision,created_at")
      .eq("evaluacion_id", id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error("No se pudo cargar la trazabilidad");
    return data;
  },
  async createUser(fields) {
    return api("create-user", fields);
  },
  async controls(id) {
    const { data, error } = await client
      .from("acciones_control")
      .select("*")
      .eq("evaluacion_id", id)
      .order("fecha");
    if (error) throw new Error("No se pudo cargar el seguimiento");
    return data;
  },
  async trackControl(id, evaluationId, estado, verificacion) {
    return api("control-update", { id, estado, verificacion });
  },
  async listUsers() {
    const { data, error } = await client
      .from("perfiles")
      .select("id,nombre,email,rol")
      .order("created_at", { ascending: false });
    if (error) throw new Error("No se pudieron cargar los usuarios");
    return data;
  },
};
let dbPromise;
function database() {
  return (dbPromise ??= new Promise((resolve, reject) => {
    const r = indexedDB.open("sumaq-demo-v2", 1);
    r.onupgradeneeded = () => {
      r.result.createObjectStore("evaluations", { keyPath: "id" });
      const m = r.result.createObjectStore("media", { keyPath: "id" });
      m.createIndex("evaluation", "evaluacion_id");
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () =>
      reject(new Error("El navegador no permite guardar la prueba local"));
  }));
}
async function transaction(store, mode, operation) {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode);
    let result;
    tx.oncomplete = () => resolve(result);
    tx.onabort = () =>
      reject(tx.error || new Error("No se pudo guardar en el navegador"));
    tx.onerror = () => {};
    operation(
      Array.isArray(store)
        ? Object.fromEntries(store.map((name) => [name, tx.objectStore(name)]))
        : tx.objectStore(store),
      (value) => (result = value),
      () => tx.abort(),
    );
  });
}
const now = () => new Date().toISOString();
export const LocalRepository = {
  async create() {
    const row = {
      id: crypto.randomUUID(),
      evaluador_id: "demo-user",
      revision: 0,
      estado: "en_progreso",
      payload: emptyEvaluation(),
      events: [],
      created_at: now(),
      updated_at: now(),
    };
    await transaction("evaluations", "readwrite", (s, done) => {
      s.add(row);
      done(row);
    });
    return row;
  },
  async get(id) {
    const row = await transaction("evaluations", "readonly", (s, done) => {
      s.get(id).onsuccess = (e) => done(e.target.result);
    });
    if (!row) throw new Error("La evaluación local no existe");
    return row;
  },
  async save(id, revision, payload) {
    const normalized = normalizeEvaluation(payload);
    let conflict = false,
      closed = false;
    return transaction("evaluations", "readwrite", (s, done, abort) => {
      s.get(id).onsuccess = (e) => {
        const r = e.target.result;
        if (!r || r.revision !== revision) {
          conflict = true;
          abort();
          return;
        }
        if (r.estado === "completada") {
          closed = true;
          abort();
          return;
        }
        r.payload = normalized;
        r.revision++;
        r.updated_at = now();
        r.events.push({
          id: crypto.randomUUID(),
          accion: "guardado",
          actor_id: "demo-user",
          revision: r.revision,
          created_at: r.updated_at,
        });
        s.put(r);
        done(r);
      };
    }).catch((error) => {
      if (conflict) throw new ConflictError();
      if (closed) throw new Error("El informe está cerrado");
      throw error;
    });
  },
  async close(id, revision) {
    const current = await this.get(id),
      evidence = await this.evidence(id),
      payload = validateClosure(current.payload, evidence),
      snapshot = {
        id,
        revision: revision + 1,
        versions: payload.versions,
        payload,
        evidencias: evidence.map(({ blob, ...meta }) => meta),
      },
      digest = await sha256(canonical(snapshot));
    let conflict = false;
    return transaction("evaluations", "readwrite", (s, done, abort) => {
      s.get(id).onsuccess = (e) => {
        const r = e.target.result;
        if (
          !r ||
          r.revision !== revision ||
          (r.media_revision || 0) !== (current.media_revision || 0) ||
          r.estado === "completada"
        ) {
          conflict = true;
          abort();
          return;
        }
        r.estado = "completada";
        r.revision++;
        r.updated_at = now();
        r.report = {
          id: crypto.randomUUID(),
          evaluacion_id: id,
          snapshot,
          contenido_canonico: canonical(snapshot),
          sha256: digest,
          created_at: now(),
          actor_id: "demo-user",
        };
        r.events.push({
          id: crypto.randomUUID(),
          accion: "cierre",
          actor_id: "demo-user",
          revision: r.revision,
          created_at: now(),
        });
        s.put(r);
        done(r);
      };
    }).catch((error) => {
      if (conflict) throw new ConflictError();
      throw error;
    });
  },
  async list(filters, page = 0) {
    let rows = await transaction("evaluations", "readonly", (s, done) => {
      s.getAll().onsuccess = (e) => done(e.target.result);
    });
    rows = rows
      .map((r) => ({
        ...r,
        ...r.payload.identificacion,
        fecha_eval: r.payload.identificacion.fechaEval,
        reba_puntaje_final: r.payload.reba.puntuacionFinal ?? null,
        rula_puntaje_final: r.payload.rula.puntuacionFinal ?? null,
        psicosocial_promedio: r.payload.psicosocial.promedioGlobal ?? null,
      }))
      .filter(
        (r) =>
          (!filters.estado || r.estado === filters.estado) &&
          (!filters.desde || r.fecha_eval >= filters.desde) &&
          (!filters.hasta || r.fecha_eval <= filters.hasta) &&
          (!filters.buscar ||
            `${r.empresa} ${r.trabajador}`
              .toLowerCase()
              .includes(filters.buscar.toLowerCase())),
      )
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    return { rows: rows.slice(page * 20, page * 20 + 20), count: rows.length };
  },
  async evidence(id) {
    return transaction("media", "readonly", (s, done) => {
      s.index("evaluation").getAll(id).onsuccess = (e) => done(e.target.result);
    });
  },
  async upload(id, file, meta) {
    if ((await this.get(id)).estado === "completada")
      throw new Error("El informe está cerrado");
    const { validateFile, validateEvidence } =
        await import("../supabase/functions/_shared/domain/media.js"),
      bytes = new Uint8Array(await file.arrayBuffer()),
      tipo = validateFile(file.type, bytes),
      data = validateEvidence(meta),
      hash = await sha256(bytes),
      media = {
        id: crypto.randomUUID(),
        evaluacion_id: id,
        tipo,
        nombre_archivo: file.name,
        sha256: hash,
        ...data,
        blob: file,
        created_at: now(),
        estado: "activa",
      };
    let limit = false,
      closed = false;
    return transaction(
      ["evaluations", "media"],
      "readwrite",
      ({ evaluations, media: s }, done, abort) => {
        evaluations.get(id).onsuccess = (parentEvent) => {
          const row = parentEvent.target.result;
          if (!row || row.estado === "completada") {
            closed = true;
            abort();
            return;
          }
          s.index("evaluation").getAll(id).onsuccess = (e) => {
            if (
              e.target.result.filter((x) => x.tipo === tipo).length >=
              (tipo === "imagen" ? 10 : 3)
            ) {
              limit = true;
              abort();
              return;
            }
            s.add(media);
            row.media_revision = (row.media_revision || 0) + 1;
            row.events.push({
              id: crypto.randomUUID(),
              accion: "evidencia_agregada",
              actor_id: "demo-user",
              revision: row.revision,
              created_at: now(),
              detalle: { id: media.id, sha256: media.sha256 },
            });
            evaluations.put(row);
            done(media);
          };
        };
      },
    ).catch((error) => {
      if (closed) throw new Error("El informe está cerrado");
      if (limit) throw new Error("Límite de evidencias alcanzado");
      throw error;
    });
  },
  async removeMedia(id) {
    const media = await transaction("media", "readonly", (s, done) => {
      s.get(id).onsuccess = (e) => done(e.target.result);
    });
    if (!media) return;
    let closed = false;
    return transaction(
      ["evaluations", "media"],
      "readwrite",
      ({ evaluations, media: s }, done, abort) => {
        evaluations.get(media.evaluacion_id).onsuccess = (e) => {
          const row = e.target.result;
          if (!row || row.estado === "completada") {
            closed = true;
            abort();
            return;
          }
          s.delete(id);
          row.media_revision = (row.media_revision || 0) + 1;
          row.events.push({
            id: crypto.randomUUID(),
            accion: "evidencia_eliminada",
            actor_id: "demo-user",
            revision: row.revision,
            created_at: now(),
            detalle: { id },
          });
          evaluations.put(row);
          done({ pending: false });
        };
      },
    ).catch((error) => {
      if (closed) throw new Error("El informe está cerrado");
      throw error;
    });
  },
  async mediaURL(id) {
    const media = await transaction("media", "readonly", (s, done) => {
      s.get(id).onsuccess = (e) => done(e.target.result);
    });
    if (!media) throw new Error("Evidencia no disponible");
    return URL.createObjectURL(media.blob);
  },
  async report(id) {
    const r = await this.get(id);
    if (!r.report) throw new Error("No hay un informe cerrado");
    return r.report;
  },
  async events(id) {
    return (await this.get(id)).events.slice().reverse();
  },
  async controls(id) {
    const row = await this.get(id);
    return row.report
      ? row.report.snapshot.payload.acciones.map((a) => ({
          ...a,
          ...row.followups?.[a.id],
        }))
      : [];
  },
  async trackControl(id, evaluationId, estado, verificacion) {
    if (
      !["pendiente", "en_curso", "verificada"].includes(estado) ||
      typeof verificacion !== "string" ||
      verificacion.length > 2000 ||
      (estado === "verificada" && verificacion.trim().length < 10)
    )
      throw new Error("Documente la verificación del control");
    return transaction("evaluations", "readwrite", (s, done) => {
      s.get(evaluationId).onsuccess = (e) => {
        const row = e.target.result;
        if (!row?.report?.snapshot.payload.acciones.some((a) => a.id === id)) {
          done(null);
          return;
        }
        row.followups ??= {};
        row.followups[id] = { estado, verificacion };
        row.events.push({
          id: crypto.randomUUID(),
          accion: "seguimiento_control",
          actor_id: "demo-user",
          revision: row.revision,
          created_at: now(),
        });
        s.put(row);
        done(row.followups[id]);
      };
    });
  },
  async createUser() {
    throw new Error(
      "La creación de usuarios reales se prueba con el servidor de desarrollo configurado",
    );
  },
  async listUsers() {
    return [
      {
        id: "demo-user",
        nombre: "Evaluador de prueba",
        email: "prueba@local.invalid",
        rol: "admin",
      },
    ];
  },
};
export const repository =
  CONFIG.mode === "demo" ? LocalRepository : RemoteRepository;
