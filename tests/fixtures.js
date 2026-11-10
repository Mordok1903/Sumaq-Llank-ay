import {
  emptyEvaluation,
  normalizeEvaluation,
} from "../supabase/functions/_shared/domain/evaluation.js";
export const ACTOR = "00000000-0000-4000-8000-000000000001";
export const OTHER = "00000000-0000-4000-8000-000000000002";
export const ADMIN = "00000000-0000-4000-8000-000000000003";
export const reba = {
  tronco: "erecto",
  cuello: "0-20",
  piernas: "bilateral",
  piernasFlexion: "ninguna",
  carga: "<5",
  brazo: "<20",
  antebrazo: "60-100",
  muneca: "0-15",
  acoplamiento: "bueno",
};
export const rula = {
  brazo: "<20ext",
  antebrazo: "60-100",
  muneca: "neutro",
  giroMuneca: "neutro",
  cuello: "0-10",
  tronco: "sentado",
  piernas: "bien",
  fuerzaCarga: "<2",
  usoMuscular: false,
};
export function complete() {
  const s = emptyEvaluation();
  s.identificacion = {
    empresa: "Empresa de prueba",
    area: "Taller",
    fechaEval: "2026-11-10",
    trabajador: "Persona ficticia",
    puesto: "Prueba",
    tarea: "Montaje",
    monitorista: "Evaluador",
    c1: true,
    c2: true,
    c3: true,
    c4: true,
  };
  s.reba = reba;
  s.rula = rula;
  s.psicosocial.respuestas = Object.fromEntries(
    Array.from({ length: 30 }, (_, i) => ["q" + (i + 1), 3]),
  );
  s.calidad = Array(6).fill(true);
  s.acciones = [
    {
      id: crypto.randomUUID(),
      descripcion: "Revisar la altura de la mesa",
      responsable: "Responsable SST",
      fecha: "2026-12-01",
      estado: "pendiente",
      verificacion: "",
    },
  ];
  return normalizeEvaluation(s);
}
export const evidence = () =>
  ["imagen", "video"].map((tipo) => ({
    id: crypto.randomUUID(),
    tipo,
    metodo: "ambos",
    lado: "ambos",
    descripcion: "Postura y ángulos documentados durante la tarea",
    sha256: "a".repeat(64),
    estado: "activa",
  }));
