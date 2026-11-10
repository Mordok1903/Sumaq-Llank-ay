import test from "node:test";
import assert from "node:assert/strict";
import { REBA } from "../js/reba.js";
import { RULA } from "../js/rula.js";
import { PSICO } from "../js/psicosocial.js";
import { SPECS } from "../supabase/functions/_shared/domain/validation.js";
import {
  normalizeEvaluation,
  validateClosure,
  formatDate,
  today,
  validDate,
  canonical,
} from "../supabase/functions/_shared/domain/evaluation.js";
import {
  validateFile,
  validateEvidence,
} from "../supabase/functions/_shared/domain/media.js";
import { complete, evidence, reba, rula } from "./fixtures.js";

test("regresiones REBA: cuello 3, tablas A y B y posición sentada", () => {
  assert.equal(REBA.getTablaA(5, 1, 1), 4);
  assert.equal(REBA.getTablaB(1, 1, 3), 3);
  const result = REBA.calcular({ ...reba, cuello: ">20", cuelloTorsion: true });
  assert.equal(result.segmentos.cuello, 3);
  assert.equal(result.tablaA, 3);
  assert.equal(result.puntuacionFinal, 2);
  assert.equal(REBA.getPiernasScore("sentado", ">60"), 1);
  assert.equal(REBA.getTroncoScore("extension>20", false), 3);
});
test("regresiones RULA: puntajes altos y celdas corregidas del artículo original", () => {
  assert.equal(RULA.getTablaA(1, 2, 1, 1), 2);
  assert.equal(RULA.getTablaA(4, 1, 3, 2), 5);
  assert.equal(RULA.getTablaA(6, 2, 1, 1), 8);
  const result = RULA.calcular({
    ...rula,
    brazo: ">90",
    brazoHombro: true,
    brazoAbduccion: true,
    antebrazo: "fuera",
    antebrazoLinea: true,
    muneca: ">15",
    munecaDesviacion: true,
    giroMuneca: "limite",
  });
  assert.deepEqual(
    [
      result.segmentos.brazo,
      result.segmentos.antebrazo,
      result.segmentos.muneca,
    ],
    [6, 3, 4],
  );
  assert.equal(result.posturaA, 9);
  assert.equal(result.puntuacionFinal, 5);
});
test("todas las combinaciones válidas de índices están definidas", () => {
  for (let t = 1; t <= 5; t++)
    for (let c = 1; c <= 3; c++)
      for (let p = 1; p <= 4; p++) assert.ok(REBA.getTablaA(t, c, p) >= 1);
  for (let a = 1; a <= 6; a++)
    for (let b = 1; b <= 3; b++)
      for (let w = 1; w <= 4; w++)
        for (let g = 1; g <= 2; g++) assert.ok(RULA.getTablaA(a, b, w, g) >= 1);
  for (const [n, max] of [
    ["reba", 15],
    ["rula", 7],
  ]) {
    const calculator = n === "reba" ? REBA : RULA,
      base = n === "reba" ? reba : rula;
    for (const [key, values] of Object.entries(SPECS[n]))
      for (const value of values) {
        const r = calculator.calcular({ ...base, [key]: value });
        assert.ok(r.puntuacionFinal >= 1 && r.puntuacionFinal <= max);
      }
  }
  assert.throws(() => REBA.getTablaA(1, 4, 1));
  assert.throws(() => RULA.getTablaA(7, 1, 1, 1));
});
test("un método incompleto o manipulado no produce un riesgo", () => {
  assert.throws(() => REBA.calcular({}));
  assert.throws(() => RULA.calcular({ ...rula, usoMuscular: undefined }));
  assert.throws(() =>
    normalizeEvaluation({
      ...complete(),
      reba: { ...reba, tronco: "inventado" },
    }),
  );
  const value = normalizeEvaluation({
    identificacion: {},
    reba: { puntuacionFinal: 15, nivel: 4 },
  });
  assert.equal(value.reba.puntuacionFinal, undefined);
  assert.equal(value.progreso.reba, false);
});
test("resultados del cliente se recalculan y el cierre exige integridad", () => {
  assert.equal(normalizeEvaluation({rula:{...rula,brazo:'<20flex'}}).rula.brazo,'<20ext');
  const forged = complete();
  forged.reba.puntuacionFinal = 15;
  forged.psicosocial.promedioGlobal = 100;
  const actual = normalizeEvaluation(forged);
  assert.equal(actual.reba.puntuacionFinal, 1);
  assert.equal(actual.psicosocial.promedioGlobal, 60);
  assert.throws(() => validateClosure(actual, []), /foto y un video/);
  assert.doesNotThrow(() => validateClosure(actual, evidence()));
  actual.calidad[0] = false;
  assert.throws(() => validateClosure(actual, evidence()), /calidad/);
});
test("15 respuestas nunca producen un global ni completitud completa", () => {
  const partial = Object.fromEntries(
    Array.from({ length: 15 }, (_, i) => ["q" + (i + 1), i === 11 ? 1 : 5]),
  );
  const result = PSICO.calcularTodo(partial);
  assert.equal(result.promedioGlobal, null);
  assert.equal(PSICO.getCompletitud({ ...partial, extra: 5 }).contestadas, 15);
  assert.equal(PSICO.calcularTodo({}).nivelGlobal, "Incompleto");
  assert.throws(
    () => normalizeEvaluation({ psicosocial: { respuestas: { q1: 6 } } }),
    /fuera de rango/,
  );
});
test("fechas de calendario no cambian por UTC y hoy se calcula en Lima", () => {
  assert.match(formatDate("2026-11-10"), /10/);
  assert.equal(today(new Date("2026-11-11T01:00:00Z")), "2026-11-10");
  assert.equal(validDate("2026-02-30"), false);
  assert.equal(validDate("2024-02-29"), true);
});
test("evidencias: límites, contenido, metadatos y serialización estable", () => {
  assert.equal(
    validateFile("image/jpeg", new Uint8Array([255, 216, 255, 0])),
    "imagen",
  );
  assert.throws(() =>
    validateFile(
      "image/jpeg",
      new Uint8Array([60, 115, 99, 114, 105, 112, 116]),
    ),
  );
  const big = new Uint8Array(10_000_001);
  big.set([255, 216, 255]);
  assert.throws(() => validateFile("image/jpeg", big), /10 MB/);
  assert.throws(() =>
    validateEvidence({ metodo: "ambos", lado: "ambos", descripcion: "corta" }),
  );
  assert.equal(canonical({ z: 2, a: 1 }), canonical({ a: 1, z: 2 }));
});
