import { index, validatePosture } from "./validation.js";
// ================================================
// reba.js — Calculadora REBA Completa
// Rapid Entire Body Assessment
// Basado en: Hignett & McAtamney (2000)
// Guía Operativa Consultoría Carranza E.I.R.L.
// ================================================

export const REBA = {
  // ── TABLA A: Tronco / Cuello / Piernas → Puntuación base 1-9 ──
  version: "REBA-Cornell-2001-v2",
  getTablaA(tronco, cuello, piernas) {
    const T = [
      [
        [1, 2, 3, 4],
        [1, 2, 3, 4],
        [3, 3, 5, 6],
      ],
      [
        [2, 3, 4, 5],
        [3, 4, 5, 6],
        [4, 5, 6, 7],
      ],
      [
        [2, 4, 5, 6],
        [4, 5, 6, 7],
        [5, 6, 7, 8],
      ],
      [
        [3, 5, 6, 7],
        [5, 6, 7, 8],
        [6, 7, 8, 9],
      ],
      [
        [4, 6, 7, 8],
        [6, 7, 8, 9],
        [7, 8, 9, 9],
      ],
    ];
    return T[index(tronco, 5)][index(cuello, 3)][index(piernas, 4)];
  },

  // ── TABLA B: Brazo / Antebrazo / Muñeca ──
  getTablaB(brazo, antebrazo, muneca) {
    const T = [
      [
        [1, 2, 3],
        [1, 2, 3],
      ],
      [
        [1, 2, 3],
        [2, 3, 4],
      ],
      [
        [3, 4, 5],
        [4, 5, 5],
      ],
      [
        [4, 5, 5],
        [5, 6, 7],
      ],
      [
        [6, 7, 8],
        [7, 8, 8],
      ],
      [
        [7, 8, 8],
        [8, 9, 9],
      ],
    ];
    const bi = index(brazo, 6);
    const ai = index(antebrazo, 2);
    const mi = index(muneca, 3);
    return T[bi][ai][mi];
  },

  // ── TABLA C: PuntuaciónA / PuntuaciónB → Resultado ──
  getTablaC(pA, pB) {
    const T = [
      //  B:1  2  3  4  5  6  7  8  9 10 11 12
      /* A:1 */ [1, 1, 1, 2, 3, 3, 4, 5, 6, 7, 7, 7],
      /* A:2 */ [1, 2, 2, 3, 4, 4, 5, 6, 6, 7, 7, 8],
      /* A:3 */ [2, 3, 3, 3, 4, 5, 6, 7, 7, 8, 8, 8],
      /* A:4 */ [3, 4, 4, 4, 5, 6, 7, 8, 8, 9, 9, 9],
      /* A:5 */ [4, 4, 4, 5, 6, 7, 8, 8, 9, 9, 9, 9],
      /* A:6 */ [6, 6, 6, 7, 8, 8, 9, 9, 10, 10, 10, 10],
      /* A:7 */ [7, 7, 7, 8, 9, 9, 9, 10, 11, 11, 11, 11],
      /* A:8 */ [8, 8, 8, 9, 10, 10, 10, 10, 11, 11, 11, 11],
      /* A:9 */ [9, 9, 9, 10, 10, 10, 11, 11, 12, 12, 12, 12],
      /* A:10 */ [10, 10, 10, 11, 11, 11, 11, 12, 12, 12, 12, 12],
      /* A:11 */ [11, 11, 11, 11, 12, 12, 12, 12, 12, 12, 12, 12],
      /* A:12 */ [12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12],
    ];
    const ai = Math.min(Math.max(pA, 1), 12) - 1;
    const bi = Math.min(Math.max(pB, 1), 12) - 1;
    return T[ai][bi];
  },

  // ── PUNTAJES DE SEGMENTO ──
  getTroncoScore(grados, torsion) {
    let score;
    if (grados === "erecto") score = 1;
    else if (grados === "0-20") score = 2;
    else if (grados === "20-60" || grados === "extension>20") score = 3;
    else if (grados === ">60") score = 4;
    else score = 1;
    if (torsion) score += 1;
    return score;
  },

  getCuelloScore(grados, torsion) {
    let score;
    if (grados === "0-20") score = 1;
    else if (grados === ">20" || grados === "extension") score = 2;
    else score = 1;
    if (torsion) score += 1;
    return score;
  },

  getPiernasScore(apoyo, flexion) {
    let score;
    if (apoyo === "bilateral" || apoyo === "sentado") score = 1;
    else if (apoyo === "unilateral" || apoyo === "inestable") score = 2;
    else score = 1;
    if (apoyo === "sentado") return score;
    if (flexion === "30-60") score += 1;
    else if (flexion === ">60") score += 2;
    return score;
  },

  getCargaFuerzaScore(carga, instauracion) {
    let score;
    if (carga === "<5") score = 0;
    else if (carga === "5-10") score = 1;
    else if (carga === ">10") score = 2;
    else score = 0;
    if (instauracion) score += 1;
    return score;
  },

  getBrazoScore(grados, abduccion, hombroElevado, apoyo) {
    let score;
    if (grados === "<20") score = 1;
    else if (grados === "20-45" || grados === "extension>20") score = 2;
    else if (grados === "45-90") score = 3;
    else if (grados === ">90") score = 4;
    else score = 1;
    if (abduccion) score += 1;
    if (hombroElevado) score += 1;
    if (apoyo) score -= 1;
    return Math.max(score, 1);
  },

  getAntebrazoScore(grados) {
    if (grados === "60-100") return 1;
    return 2;
  },

  getMunecaScore(grados, desviacion) {
    let score;
    if (grados === "0-15") score = 1;
    else if (grados === ">15") score = 2;
    else score = 1;
    if (desviacion) score += 1;
    return score;
  },

  getAcoplamientoScore(tipo) {
    const map = { bueno: 0, regular: 1, malo: 2, inaceptable: 3 };
    return map[tipo] ?? 0;
  },

  getActividadScore(estatica, repeticion, cambioBrusco) {
    let score = 0;
    if (estatica) score += 1;
    if (repeticion) score += 1;
    if (cambioBrusco) score += 1;
    return score;
  },

  // ── INTERPRETACIÓN ──
  interpretar(puntaje) {
    if (puntaje === 1)
      return {
        nivel: 0,
        riesgo: "Inapreciable",
        accion: "No es necesaria acción específica. Mantener vigilancia.",
        clase: "level-0",
      };
    if (puntaje <= 3)
      return {
        nivel: 1,
        riesgo: "Bajo",
        accion: "Puede ser necesaria alguna medida. Revisar la causa.",
        clase: "level-1",
      };
    if (puntaje <= 7)
      return {
        nivel: 2,
        riesgo: "Medio",
        accion: "La acción es necesaria. Priorizar controles en el plan SST.",
        clase: "level-2",
      };
    if (puntaje <= 10)
      return {
        nivel: 3,
        riesgo: "Alto",
        accion: "Acción necesaria pronto. Establecer responsable y fecha.",
        clase: "level-3",
      };
    return {
      nivel: 4,
      riesgo: "Muy Alto",
      accion: "Actuación inmediata. Revisar continuidad de la tarea.",
      clase: "level-4",
    };
  },

  // ── CÁLCULO PRINCIPAL ──
  calcular(datos) {
    validatePosture("reba", datos);
    // Grupo A
    const sTronco = this.getTroncoScore(datos.tronco, datos.troncoTorsion);
    const sCuello = this.getCuelloScore(datos.cuello, datos.cuelloTorsion);
    const sPiernas = this.getPiernasScore(datos.piernas, datos.piernasFlexion);
    const sCarga = this.getCargaFuerzaScore(
      datos.carga,
      datos.instauracionRapida,
    );

    const tablaA = this.getTablaA(
      Math.min(sTronco, 5),
      sCuello,
      Math.min(sPiernas, 4),
    );
    const puntuacionA = tablaA + sCarga;

    // Grupo B
    const sBrazo = this.getBrazoScore(
      datos.brazo,
      datos.brazoAbduccion,
      datos.brazoHombro,
      datos.brazoApoyo,
    );
    const sAntebrazo = this.getAntebrazoScore(datos.antebrazo);
    const sMuneca = this.getMunecaScore(datos.muneca, datos.munecaDesviacion);
    const sAcoplamiento = this.getAcoplamientoScore(datos.acoplamiento);

    const tablaB = this.getTablaB(
      Math.min(sBrazo, 6),
      Math.min(sAntebrazo, 2),
      Math.min(sMuneca, 3),
    );
    const puntuacionB = tablaB + sAcoplamiento;

    // Tabla C
    const tablaC = this.getTablaC(
      Math.min(puntuacionA, 12),
      Math.min(puntuacionB, 12),
    );

    // Actividad
    const sActividad = this.getActividadScore(
      datos.actEstatica,
      datos.actRepeticion,
      datos.actCambioBrusco,
    );

    // Puntaje final
    const puntuacionFinal = tablaC + sActividad;
    const interpretacion = this.interpretar(puntuacionFinal);

    return {
      version: this.version,
      segmentos: {
        tronco: sTronco,
        cuello: sCuello,
        piernas: sPiernas,
        carga: sCarga,
        brazo: sBrazo,
        antebrazo: sAntebrazo,
        muneca: sMuneca,
        acoplamiento: sAcoplamiento,
        actividad: sActividad,
      },
      tablaA,
      puntuacionA,
      tablaB,
      puntuacionB,
      tablaC,
      sActividad,
      puntuacionFinal,
      ...interpretacion,
    };
  },
};
