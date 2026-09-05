// ================================================
// rula.js — Calculadora RULA Completa
// Rapid Upper Limb Assessment
// Basado en: McAtamney & Corlett (1993)
// Guía Operativa Consultoría Carranza E.I.R.L.
// ================================================

const RULA = {

  // ── TABLA A RULA: Brazo / Antebrazo / Muñeca / Giro ──
  // tablaA[brazo][antebrazo][muneca][giro] → Postura A
  getTablaA(brazo, antebrazo, muneca, giro) {
    const T = [
      // Brazo 1
      [
        [ [1,2], [2,2], [2,3] ],  // Antebrazo 1: Muñeca 1,2,3 | Giro 1,2
        [ [1,2], [2,3], [3,3] ]   // Antebrazo 2
      ],
      // Brazo 2
      [
        [ [2,2], [2,2], [3,3] ],
        [ [2,2], [2,3], [3,3] ]
      ],
      // Brazo 3
      [
        [ [2,3], [3,3], [3,4] ],
        [ [2,3], [3,4], [4,4] ]
      ],
      // Brazo 4
      [
        [ [3,3], [3,4], [4,4] ],
        [ [3,4], [4,4], [4,4] ]
      ]
    ];
    const bi = Math.min(Math.max(brazo, 1), 4) - 1;
    const ai = Math.min(Math.max(antebrazo, 1), 2) - 1;
    const mi = Math.min(Math.max(muneca, 1), 3) - 1;
    const gi = Math.min(Math.max(giro, 1), 2) - 1;
    return T[bi][ai][mi][gi];
  },

  // ── TABLA B RULA: Cuello / Tronco / Piernas → Postura B ──
  getTablaB(cuello, tronco, piernas) {
    const T = [
      //         Tronco 1  Tronco 2  Tronco 3  Tronco 4  Tronco 5  Tronco 6
      // P1 P2 | P1 P2   | P1 P2   | P1 P2   | P1 P2   | P1 P2   | P1 P2
      /* Cuello 1 */ [[1,3],[2,3],[3,4],[5,5],[6,6],[7,7]],
      /* Cuello 2 */ [[2,3],[2,3],[4,5],[5,5],[6,7],[7,7]],
      /* Cuello 3 */ [[3,3],[3,4],[4,5],[5,6],[6,7],[7,7]],
      /* Cuello 4 */ [[5,5],[5,6],[6,7],[7,7],[7,7],[8,8]],
      /* Cuello 5 */ [[7,7],[7,7],[7,8],[8,8],[8,8],[8,8]],
      /* Cuello 6 */ [[8,8],[8,8],[8,8],[8,9],[9,9],[9,9]]
    ];
    const ci = Math.min(Math.max(cuello, 1), 6) - 1;
    const ti = Math.min(Math.max(tronco, 1), 6) - 1;
    const pi = Math.min(Math.max(piernas, 1), 2) - 1;
    return T[ci][ti][pi];
  },

  // ── TABLA C RULA: Puntaje C × Puntaje D → Final ──
  getTablaC(c, d) {
    const T = [
      //  D:1  2  3  4  5  6  7+
      /* C:1 */ [1, 2, 3, 3, 4, 5, 5],
      /* C:2 */ [2, 2, 3, 4, 4, 5, 5],
      /* C:3 */ [3, 3, 3, 4, 4, 5, 6],
      /* C:4 */ [3, 3, 3, 4, 5, 6, 6],
      /* C:5 */ [4, 4, 4, 5, 6, 7, 7],
      /* C:6 */ [4, 4, 5, 6, 6, 7, 7],
      /* C:7 */ [5, 5, 6, 6, 7, 7, 7],
      /* C:8+*/ [5, 5, 6, 7, 7, 7, 7]
    ];
    const ci = Math.min(Math.max(c, 1), 8) - 1;
    const di = Math.min(Math.max(d, 1), 7) - 1;
    return T[ci][di];
  },

  // ── PUNTAJES DE SEGMENTO ──
  getBrazoScore(grados, hombroElevado, abduccion, apoyo) {
    let score;
    if (grados === '<20ext' || grados === '<20flex') score = 1;
    else if (grados === '20-45') score = 2;
    else if (grados === '45-90') score = 3;
    else if (grados === '>90') score = 4;
    else score = 1;
    if (hombroElevado) score += 1;
    if (abduccion) score += 1;
    if (apoyo) score -= 1;
    return Math.max(score, 1);
  },

  getAntebrazoScore(grados, lineaMedia, fueraDePlano) {
    let score;
    if (grados === '60-100') score = 1;
    else score = 2;
    if (lineaMedia || fueraDePlano) score += 1;
    return score;
  },

  getMunecaScore(grados, desviacion) {
    let score;
    if (grados === 'neutro') score = 1;
    else if (grados === '0-15') score = 2;
    else if (grados === '>15') score = 3;
    else score = 1;
    if (desviacion) score += 1;
    return score;
  },

  getGiroScore(giro) {
    if (giro === 'neutro') return 1;
    return 2; // 'limite'
  },

  getCuelloScore(grados, torsion, inclinacion) {
    let score;
    if (grados === '0-10') score = 1;
    else if (grados === '10-20') score = 2;
    else if (grados === '>20') score = 3;
    else if (grados === 'extension') score = 4;
    else score = 1;
    if (torsion) score += 1;
    if (inclinacion) score += 1;
    return score;
  },

  getTroncoScore(grados, torsion, inclinacion) {
    let score;
    if (grados === 'sentado') score = 1;
    else if (grados === '0-20') score = 2;
    else if (grados === '20-60') score = 3;
    else if (grados === '>60') score = 4;
    else score = 1;
    if (torsion) score += 1;
    if (inclinacion) score += 1;
    return score;
  },

  getPiernasScore(apoyo) {
    if (apoyo === 'bien') return 1;
    return 2;
  },

  getUsoMuscularScore(estaticaORepetida) {
    return estaticaORepetida ? 1 : 0;
  },

  getFuerzaCargaScore(tipo) {
    const map = {
      '<2': 0,
      '2-10-int': 1,
      '2-10-est': 2,
      '>10': 3
    };
    return map[tipo] ?? 0;
  },

  // ── INTERPRETACIÓN ──
  interpretar(puntaje) {
    if (puntaje <= 2) return { nivel: 1, riesgo: 'Aceptable', accion: 'La postura puede aceptarse si no se mantiene ni se repite prolongadamente. Mantener vigilancia.', clase: 'level-0' };
    if (puntaje <= 4) return { nivel: 2, riesgo: 'Investigar', accion: 'Se requiere investigación más detallada. Pueden ser necesarios cambios en la tarea.', clase: 'level-2' };
    if (puntaje <= 6) return { nivel: 3, riesgo: 'Cambiar pronto', accion: 'La investigación y los cambios son necesarios en el corto plazo. Priorizar controles.', clase: 'level-3' };
    return { nivel: 4, riesgo: 'Acción inmediata', accion: 'Se requieren cambios urgentes. No cerrar el hallazgo solo con capacitación o pausas activas.', clase: 'level-4' };
  },

  // ── CÁLCULO PRINCIPAL ──
  calcular(datos) {
    // Grupo A: Brazo / Antebrazo / Muñeca
    const sBrazo = this.getBrazoScore(datos.brazo, datos.brazoHombro, datos.brazoAbduccion, datos.brazoApoyo);
    const sAntebrazo = this.getAntebrazoScore(datos.antebrazo, datos.antebrazoLinea, datos.antebrazoFuera);
    const sMuneca = this.getMunecaScore(datos.muneca, datos.munecaDesviacion);
    const sGiro = this.getGiroScore(datos.giroMuneca);

    const posturaA = this.getTablaA(
      Math.min(sBrazo, 4),
      Math.min(sAntebrazo, 2),
      Math.min(sMuneca, 3),
      Math.min(sGiro, 2)
    );

    // Grupo B: Cuello / Tronco / Piernas
    const sCuello = this.getCuelloScore(datos.cuello, datos.cuelloTorsion, datos.cuelloInclinacion);
    const sTronco = this.getTroncoScore(datos.tronco, datos.troncoTorsion, datos.troncoInclinacion);
    const sPiernas = this.getPiernasScore(datos.piernas);

    const posturaB = this.getTablaB(
      Math.min(sCuello, 6),
      Math.min(sTronco, 6),
      Math.min(sPiernas, 2)
    );

    // Uso muscular y fuerza
    const sMusculo = this.getUsoMuscularScore(datos.usoMuscular);
    const sFuerza = this.getFuerzaCargaScore(datos.fuerzaCarga);

    // Puntajes C y D
    const puntajeC = posturaA + sMusculo + sFuerza;
    const puntajeD = posturaB + sMusculo + sFuerza;

    // Tabla C → Final
    const puntuacionFinal = this.getTablaC(
      Math.min(puntajeC, 8),
      Math.min(puntajeD, 7)
    );

    const interpretacion = this.interpretar(puntuacionFinal);

    return {
      segmentos: {
        brazo: sBrazo, antebrazo: sAntebrazo, muneca: sMuneca, giro: sGiro,
        cuello: sCuello, tronco: sTronco, piernas: sPiernas,
        musculo: sMusculo, fuerza: sFuerza
      },
      posturaA, posturaB,
      puntajeC, puntajeD,
      puntuacionFinal,
      ...interpretacion
    };
  }
};

window.RULA = RULA;
