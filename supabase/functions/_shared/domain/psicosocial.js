// ================================================
// psicosocial.js — Evaluación de Riesgos Psicosociales
// Cuestionario propio exploratorio; no es FPSICO ni un instrumento validado
// Dimensiones definidas en la clase del Prof. Carranza
// ================================================

export const PSICO = {
  version: "EXPLORATORIO-30-v2",

  // ── CUESTIONARIO: 30 preguntas en 7 dimensiones ──
  dimensiones: [
    {
      id: "participacion",
      nombre: "Participación, Implicación y Responsabilidad",
      descripcion:
        "Grado en que la empresa permite al trabajador tener autonomía, tomar decisiones y participar en la organización del trabajo.",
      icono: "🎯",
      preguntas: [1, 2, 6, 7, 8, 18, 20, 25],
    },
    {
      id: "formacion",
      nombre: "Formación, Información y Comunicación",
      descripcion:
        "Nivel de interés que la organización demuestra por los trabajadores facilitando flujos de información, adiestramiento y reconocimiento.",
      icono: "📢",
      preguntas: [4, 5, 11, 16, 17, 24, 26],
    },
    {
      id: "gestionTiempo",
      nombre: "Gestión del Tiempo",
      descripcion:
        "Nivel de autonomía del trabajador para determinar el ritmo, la cadencia del trabajo, las pausas y distribución de vacaciones.",
      icono: "⏱️",
      preguntas: [3, 10, 14, 15, 22],
    },
    {
      id: "cohesion",
      nombre: "Cohesión de Grupo",
      descripcion:
        "Patrón de estructura y relaciones entre los miembros del grupo: solidaridad, cooperación, clima y sentido de comunidad.",
      icono: "🤝",
      preguntas: [9, 13, 21, 23],
    },
    {
      id: "cargaMental",
      nombre: "Carga Mental",
      descripcion:
        "Conjunto de requerimientos mentales, cognitivos o intelectuales a los que el trabajador se ve sometido durante su jornada.",
      icono: "🧠",
      preguntas: [12, 19, 27, 28],
    },
    {
      id: "autonomia",
      nombre: "Autonomía y Responsabilidad",
      descripcion:
        "Grado en que el trabajador puede controlar su propio trabajo, tomar iniciativas y gestionar su nivel de responsabilidad.",
      icono: "🔑",
      preguntas: [1, 3, 14, 18],
    },
    {
      id: "condicionesLaborales",
      nombre: "Condiciones Laborales y Bienestar",
      descripcion:
        "Condiciones del entorno de trabajo, satisfacción con el rol y percepción general de bienestar en la organización.",
      icono: "🏢",
      preguntas: [29, 30],
    },
  ],

  // ── BANCO DE PREGUNTAS ──
  preguntas: {
    1: {
      texto:
        "¿Tiene posibilidad de tomar decisiones sobre cómo realizar su trabajo diario?",
      escala: ["Nunca", "Raramente", "A veces", "Frecuentemente", "Siempre"],
    },
    2: {
      texto: "¿Puede influir en la cantidad de trabajo que se le asigna?",
      escala: ["Nunca", "Raramente", "A veces", "Frecuentemente", "Siempre"],
    },
    3: {
      texto:
        "¿Puede distribuir sus propias pausas de descanso durante la jornada laboral?",
      escala: ["Nunca", "Raramente", "A veces", "Frecuentemente", "Siempre"],
    },
    4: {
      texto:
        "¿Recibe información suficiente sobre los objetivos de su puesto de trabajo?",
      escala: ["Nunca", "Raramente", "A veces", "Frecuentemente", "Siempre"],
    },
    5: {
      texto:
        "¿La empresa le facilita información suficiente para realizar bien su trabajo?",
      escala: ["Nunca", "Raramente", "A veces", "Frecuentemente", "Siempre"],
    },
    6: {
      texto: "¿Se siente parte importante del equipo de trabajo?",
      escala: ["Nunca", "Raramente", "A veces", "Frecuentemente", "Siempre"],
    },
    7: {
      texto:
        "¿Tiene claridad sobre cuáles son sus responsabilidades y funciones en el trabajo?",
      escala: ["Nunca", "Raramente", "A veces", "Frecuentemente", "Siempre"],
    },
    8: {
      texto: "¿Participa en las decisiones que afectan a su área de trabajo?",
      escala: ["Nunca", "Raramente", "A veces", "Frecuentemente", "Siempre"],
    },
    9: {
      texto: "¿Sus compañeros de trabajo le apoyan cuando lo necesita?",
      escala: ["Nunca", "Raramente", "A veces", "Frecuentemente", "Siempre"],
    },
    10: {
      texto:
        "¿Siente que el ritmo de trabajo que se le exige es adecuado para su recuperación física y mental?",
      escala: ["Nunca", "Raramente", "A veces", "Frecuentemente", "Siempre"],
    },
    11: {
      texto:
        "¿Existe una comunicación fluida entre los diferentes niveles jerárquicos de la empresa?",
      escala: ["Nunca", "Raramente", "A veces", "Frecuentemente", "Siempre"],
    },
    12: {
      texto:
        "¿Su trabajo le exige un nivel elevado de concentración o atención mental?",
      escala: ["Nunca", "Raramente", "A veces", "Frecuentemente", "Siempre"],
      inversa: true,
    },
    13: {
      texto:
        "¿Existe buen ambiente de trabajo y colaboración entre sus compañeros?",
      escala: ["Nunca", "Raramente", "A veces", "Frecuentemente", "Siempre"],
    },
    14: {
      texto:
        "¿Puede adaptar el ritmo de su trabajo cuando se lo exigen las circunstancias personales o laborales?",
      escala: ["Nunca", "Raramente", "A veces", "Frecuentemente", "Siempre"],
    },
    15: {
      texto: "¿Se siente satisfecho/a con el horario de trabajo asignado?",
      escala: [
        "Muy insatisfecho",
        "Insatisfecho",
        "Indiferente",
        "Satisfecho",
        "Muy satisfecho",
      ],
    },
    16: {
      texto:
        "¿Recibe la formación necesaria para desempeñar correctamente su trabajo?",
      escala: ["Nunca", "Raramente", "A veces", "Frecuentemente", "Siempre"],
    },
    17: {
      texto:
        "¿Considera que hay una comunicación abierta y honesta dentro de su equipo de trabajo?",
      escala: ["Nunca", "Raramente", "A veces", "Frecuentemente", "Siempre"],
    },
    18: {
      texto: "¿Puede organizar su propio trabajo de manera autónoma?",
      escala: ["Nunca", "Raramente", "A veces", "Frecuentemente", "Siempre"],
    },
    19: {
      texto: "¿Experimenta fatiga mental al final de la jornada de trabajo?",
      escala: ["Nunca", "Raramente", "A veces", "Frecuentemente", "Siempre"],
      inversa: true,
    },
    20: {
      texto:
        "¿Siente que su trabajo le permite desarrollar sus habilidades y competencias?",
      escala: ["Nunca", "Raramente", "A veces", "Frecuentemente", "Siempre"],
    },
    21: {
      texto:
        "¿Los conflictos dentro de su equipo se resuelven de forma constructiva?",
      escala: ["Nunca", "Raramente", "A veces", "Frecuentemente", "Siempre"],
    },
    22: {
      texto:
        "¿La distribución de su carga de trabajo le permite cumplir con sus tareas sin sentirse sobrecargado/a?",
      escala: ["Nunca", "Raramente", "A veces", "Frecuentemente", "Siempre"],
    },
    23: {
      texto:
        "¿Siente que pertenece a un equipo unido y con sentido de comunidad?",
      escala: ["Nunca", "Raramente", "A veces", "Frecuentemente", "Siempre"],
    },
    24: {
      texto: "¿Su empresa le reconoce y valora el trabajo bien realizado?",
      escala: ["Nunca", "Raramente", "A veces", "Frecuentemente", "Siempre"],
    },
    25: {
      texto:
        "¿El nivel de responsabilidad asignado en su puesto está acorde a sus capacidades?",
      escala: ["Nunca", "Raramente", "A veces", "Frecuentemente", "Siempre"],
    },
    26: {
      texto:
        "¿Recibe información oportuna sobre cambios que afectan directamente a su puesto de trabajo?",
      escala: ["Nunca", "Raramente", "A veces", "Frecuentemente", "Siempre"],
    },
    27: {
      texto:
        "¿Su trabajo requiere mantener altos niveles de atención de forma sostenida durante largos períodos?",
      escala: ["Nunca", "Raramente", "A veces", "Frecuentemente", "Siempre"],
      inversa: true,
    },
    28: {
      texto:
        "¿Siente que tiene suficiente tiempo para completar sus tareas sin sentirse presionado/a?",
      escala: ["Nunca", "Raramente", "A veces", "Frecuentemente", "Siempre"],
    },
    29: {
      texto:
        "¿Se siente satisfecho/a con las condiciones generales de su entorno de trabajo (espacio, temperatura, ruido, iluminación)?",
      escala: [
        "Muy insatisfecho",
        "Insatisfecho",
        "Indiferente",
        "Satisfecho",
        "Muy satisfecho",
      ],
    },
    30: {
      texto:
        "¿Considera que su empresa se preocupa genuinamente por el bienestar de sus trabajadores?",
      escala: ["Nunca", "Raramente", "A veces", "Frecuentemente", "Siempre"],
    },
  },

  // ── CÁLCULO POR DIMENSIÓN ──
  calcularDimension(dimId, respuestas) {
    const dim = this.dimensiones.find((d) => d.id === dimId);
    if (!dim) return null;

    let suma = 0;
    let contestadas = 0;
    const maxPts = dim.preguntas.length * 5;

    dim.preguntas.forEach((numPregunta) => {
      const resp = respuestas[`q${numPregunta}`];
      if (Number.isInteger(resp) && resp >= 1 && resp <= 5) {
        const pregunta = this.preguntas[numPregunta];
        // Si es pregunta inversa: 5→1, 4→2, 3→3, 2→4, 1→5
        const valor = pregunta.inversa ? 6 - parseInt(resp) : parseInt(resp);
        suma += valor;
        contestadas++;
      }
    });

    if (contestadas < dim.preguntas.length)
      return {
        score: null,
        pct: null,
        nivel: null,
        nivelTexto: "Incompleto",
        contestadas,
        total: dim.preguntas.length,
      };

    // Interpolación si no todas respondidas
    const scorePonderado = (suma / contestadas) * dim.preguntas.length;
    const pct = Math.round((scorePonderado / maxPts) * 100);

    let nivel, nivelTexto, clase;
    if (pct >= 75) {
      nivel = "adecuado";
      nivelTexto = "Adecuado";
      clase = "safe";
    } else if (pct >= 50) {
      nivel = "moderado";
      nivelTexto = "Moderado";
      clase = "warn";
    } else {
      nivel = "elevado";
      nivelTexto = "Elevado";
      clase = "danger";
    }

    return {
      score: scorePonderado,
      pct,
      nivel,
      nivelTexto,
      clase,
      contestadas,
      total: dim.preguntas.length,
    };
  },

  // ── CÁLCULO GLOBAL ──
  calcularTodo(respuestas) {
    const resultados = {};
    let sumaTotal = 0;
    let nDimensiones = 0;

    this.dimensiones.forEach((dim) => {
      const r = this.calcularDimension(dim.id, respuestas);
      resultados[dim.id] = r;
      if (r && r.pct !== null) {
        sumaTotal += r.pct;
        nDimensiones++;
      }
    });

    const promedioGlobal =
      nDimensiones === this.dimensiones.length
        ? Math.round(sumaTotal / nDimensiones)
        : null;
    let nivelGlobal;
    if (promedioGlobal === null) nivelGlobal = "Incompleto";
    else if (promedioGlobal >= 75) nivelGlobal = "Adecuado";
    else if (promedioGlobal >= 50) nivelGlobal = "Moderado";
    else nivelGlobal = "Elevado";

    return {
      version: this.version,
      dimensiones: resultados,
      promedioGlobal,
      nivelGlobal,
      exploratorio: true,
    };
  },

  // ── PREGUNTAS TOTALES Y COMPLETITUD ──
  getCompletitud(respuestas) {
    const totalPreguntasUnicas = new Set(
      this.dimensiones.flatMap((d) => d.preguntas),
    ).size;
    const contestadas = Array.from(
      { length: 30 },
      (_, i) => respuestas[`q${i + 1}`],
    ).filter((x) => Number.isInteger(x) && x >= 1 && x <= 5).length;
    return {
      contestadas,
      total: totalPreguntasUnicas,
      pct: Math.round((contestadas / totalPreguntasUnicas) * 100),
    };
  },

  // ── RECOMENDACIONES POR DIMENSIÓN ──
  recomendaciones: {
    participacion: [
      "Implementar reuniones periódicas donde el equipo proponga mejoras a los procesos.",
      "Definir claramente las funciones y responsabilidades de cada puesto.",
      "Promover la participación en decisiones que afecten directamente al trabajador.",
    ],
    formacion: [
      "Diseñar un plan anual de capacitación alineado con las necesidades del puesto.",
      "Establecer canales formales de comunicación ascendente y descendente.",
      "Implementar un sistema de reconocimiento del trabajo bien realizado.",
    ],
    gestionTiempo: [
      "Revisar la distribución de la carga de trabajo para evitar sobrecargas.",
      "Permitir flexibilidad en la gestión de pausas y tiempos de descanso.",
      "Evaluar la posibilidad de horarios flexibles o trabajo a distancia.",
    ],
    cohesion: [
      "Organizar actividades de team building para fortalecer las relaciones.",
      "Establecer protocolos claros para la resolución de conflictos.",
      "Fomentar la colaboración interdepartamental y el apoyo entre compañeros.",
    ],
    cargaMental: [
      "Revisar la carga cognitiva de las tareas y redistribuirla si es excesiva.",
      "Implementar pausas activas para reducir la fatiga mental.",
      "Evaluar el uso de herramientas tecnológicas que reduzcan la carga de atención.",
    ],
    autonomia: [
      "Revisar el nivel de supervisión para permitir mayor autonomía al trabajador.",
      "Asignar responsabilidades acordes a la cualificación y capacidad del trabajador.",
      "Evitar tanto la infracarga como la sobrecarga de responsabilidad.",
    ],
    condicionesLaborales: [
      "Evaluar y mejorar las condiciones ambientales del puesto (iluminación, temperatura, ruido).",
      "Realizar encuestas periódicas de satisfacción laboral.",
      "Implementar programas de bienestar organizacional.",
    ],
  },
};
