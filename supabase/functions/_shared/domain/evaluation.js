import { REBA } from "./reba.js";
import { RULA } from "./rula.js";
import { PSICO } from "./psicosocial.js";
import {
  SPECS,
  FLAGS,
  validatePosture,
  completePosture,
} from "./validation.js";

export const SCHEMA_VERSION = 2;
export const IDENT_FIELDS = [
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
];
export const REQUIRED_IDENT = [
  "empresa",
  "area",
  "fechaEval",
  "trabajador",
  "puesto",
  "tarea",
  "monitorista",
];
export const QUALITY = [
  "Postura habitual verificada",
  "Evidencias documentadas",
  "Puntajes reconstruibles desde las evidencias",
  "Respuesta psicosocial confidencial",
  "Controles dirigidos a las causas",
  "Resultados comunicados a SST",
];
export const VERSIONS = Object.freeze({
  schema: SCHEMA_VERSION,
  reba: REBA.version,
  rula: RULA.version,
  psicosocial: PSICO.version,
});
export function text(value, max = 2000) {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string" || value.length > max)
    throw new Error(`Texto inválido o mayor de ${max} caracteres`);
  return value.trim();
}
export function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === value;
}
export function today(date = new Date()) {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type) => p.find((x) => x.type === type).value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
export function formatDate(value) {
  return validDate(value || "")
    ? new Intl.DateTimeFormat("es-PE", {
        timeZone: "UTC",
        day: "2-digit",
        month: "long",
        year: "numeric",
      }).format(new Date(`${value}T12:00:00Z`))
    : "Sin fecha";
}
export function emptyEvaluation() {
  return {
    schemaVersion: 2,
    identificacion: {},
    reba: Object.fromEntries(FLAGS.reba.map((k) => [k, false])),
    rula: Object.fromEntries(
      FLAGS.rula.map((k) => [k, k === "usoMuscular" ? null : false]),
    ),
    psicosocial: { respuestas: {} },
    calidad: Array(6).fill(false),
    acciones: [],
    progreso: {
      identificacion: false,
      reba: false,
      rula: false,
      psicosocial: false,
    },
    versions: VERSIONS,
  };
}
export function normalizeEvaluation(input) {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new Error("Evaluación inválida");
  const out = emptyEvaluation();
  for (const key of IDENT_FIELDS)
    out.identificacion[key] = text(input.identificacion?.[key]);
  for (const key of ["c1", "c2", "c3", "c4"])
    out.identificacion[key] = input.identificacion?.[key] === true;
  const i = out.identificacion;
  if (i.fechaEval && !validDate(i.fechaEval))
    throw new Error("Fecha de evaluación inválida");
  if (i.dni && !/^\d{8}$/.test(i.dni))
    throw new Error("El DNI debe tener 8 dígitos");
  if (i.ruc && !/^\d{11}$/.test(i.ruc))
    throw new Error("El RUC debe tener 11 dígitos");
  out.progreso.identificacion = REQUIRED_IDENT.every((key) => Boolean(i[key]));
  for (const kind of ["reba", "rula"]) {
    const d = input[kind] || {};
    validatePosture(kind, d, true);
    for (const key of [...Object.keys(SPECS[kind]), ...FLAGS[kind]])
      if (d[key] !== undefined && d[key] !== null) out[kind][key] = d[key];
    // v1 distinguía dos etiquetas de la misma postura neutra; v2 muestra una opción común.
    if(kind==='rula'&&out[kind].brazo==='<20flex')out[kind].brazo='<20ext';
    out.progreso[kind] = completePosture(kind, out[kind]);
    if (out.progreso[kind])
      Object.assign(
        out[kind],
        (kind === "reba" ? REBA : RULA).calcular(out[kind]),
      );
  }
  const responses = {};
  for (let n = 1; n <= 30; n++) {
    const v = input.psicosocial?.respuestas?.[`q${n}`];
    if (v === undefined || v === null) continue;
    if (!Number.isInteger(v) || v < 1 || v > 5)
      throw new Error(`Respuesta ${n} fuera de rango`);
    responses[`q${n}`] = v;
  }
  out.psicosocial = { respuestas: responses, ...PSICO.calcularTodo(responses) };
  out.progreso.psicosocial = PSICO.getCompletitud(responses).contestadas === 30;
  out.calidad = QUALITY.map((_, n) => input.calidad?.[n] === true);
  if (input.acciones !== undefined && !Array.isArray(input.acciones))
    throw new Error("Plan de controles inválido");
  if ((input.acciones?.length || 0) > 30)
    throw new Error("Máximo 30 medidas de control");
  out.acciones = (input.acciones || []).map((a) => ({
    id: text(a.id, 100),
    descripcion: text(a.descripcion, 1000),
    responsable: text(a.responsable, 200),
    fecha: text(a.fecha, 10),
    estado: ["pendiente", "en_curso", "verificada"].includes(a.estado)
      ? a.estado
      : "pendiente",
    verificacion: text(a.verificacion, 2000),
  }));
  for (const a of out.acciones) {
    if (a.fecha && !validDate(a.fecha))
      throw new Error("Fecha de control inválida");
    if (
      !/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(
        a.id,
      )
    )
      throw new Error("Identificador del control inválido");
    if (a.estado === "verificada" && a.verificacion.length < 10)
      throw new Error("Documente la verificación de la medida");
  }
  return out;
}
export function validateClosure(state, evidence = []) {
  const s = normalizeEvaluation(state),
    errors = [];
  for (const [key, complete] of Object.entries(s.progreso))
    if (!complete) errors.push(`Complete ${key}`);
  if (!s.calidad.every(Boolean))
    errors.push("Confirme las seis verificaciones de calidad");
  if (!["c1", "c2", "c3", "c4"].every((key) => s.identificacion[key]))
    errors.push("Complete el checklist de preparación");
  const active = evidence.filter((e) => !e.estado || e.estado === "activa");
  if (
    active.filter((e) => e.tipo === "imagen").length < 1 ||
    active.filter((e) => e.tipo === "video").length < 1
  )
    errors.push("Adjunte como mínimo una foto y un video");
  for (const method of ["reba", "rula"])
    if (
      !active.some(
        (e) =>
          [method, "ambos"].includes(e.metodo) &&
          e.descripcion?.trim() &&
          e.sha256,
      )
    )
      errors.push(
        `Vincule una evidencia documentada a ${method.toUpperCase()}`,
      );
  if (
    s.reba.nivel >= 2 ||
    s.rula.nivel >= 2 ||
    s.psicosocial.promedioGlobal < 75
  ) {
    if (
      !s.acciones.some(
        (a) => a.descripcion && a.responsable && validDate(a.fecha),
      )
    )
      errors.push("Registre una medida con responsable y plazo");
  }
  if (errors.length) throw new Error(errors.join(". "));
  return s;
}
export function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.keys(value)
      .sort()
      .filter((k) => value[k] !== undefined)
      .map((k) => JSON.stringify(k) + ":" + canonical(value[k]))
      .join(",")}}`;
  return JSON.stringify(value);
}
export async function sha256(value) {
  const bytes =
    typeof value === "string" ? new TextEncoder().encode(value) : value;
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}
export async function verifyReport(report) {
  try {
    const content = report.contenido_canonico;
    return (
      typeof content === "string" &&
      canonical(JSON.parse(content)) === canonical(report.snapshot) &&
      (await sha256(content)) === report.sha256
    );
  } catch {
    return false;
  }
}
