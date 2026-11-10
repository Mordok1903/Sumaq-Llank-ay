export const SPECS = {
  reba: {
    tronco: ["erecto", "0-20", "20-60", ">60", "extension>20"],
    cuello: ["0-20", ">20", "extension"],
    piernas: ["bilateral", "unilateral", "sentado"],
    piernasFlexion: ["ninguna", "30-60", ">60"],
    carga: ["<5", "5-10", ">10"],
    brazo: ["<20", "20-45", "45-90", ">90", "extension>20"],
    antebrazo: ["60-100", "fuera"],
    muneca: ["0-15", ">15"],
    acoplamiento: ["bueno", "regular", "malo", "inaceptable"],
  },
  rula: {
    brazo: ["<20ext", "<20flex", "20-45", "45-90", ">90", "extension>20"],
    antebrazo: ["60-100", "fuera"],
    muneca: ["neutro", "0-15", ">15"],
    giroMuneca: ["neutro", "limite"],
    cuello: ["0-10", "10-20", ">20", "extension"],
    tronco: ["sentado", "0-20", "20-60", ">60"],
    piernas: ["bien", "mal"],
    fuerzaCarga: ["<2", "2-10-int", "2-10-est", ">10"],
  },
};
export const FLAGS = {
  reba: [
    "troncoTorsion",
    "cuelloTorsion",
    "instauracionRapida",
    "brazoAbduccion",
    "brazoHombro",
    "brazoApoyo",
    "munecaDesviacion",
    "actEstatica",
    "actRepeticion",
    "actCambioBrusco",
  ],
  rula: [
    "brazoHombro",
    "brazoAbduccion",
    "brazoApoyo",
    "antebrazoLinea",
    "antebrazoFuera",
    "munecaDesviacion",
    "cuelloTorsion",
    "cuelloInclinacion",
    "troncoTorsion",
    "troncoInclinacion",
    "usoMuscular",
  ],
};
export function index(value, max) {
  if (!Number.isInteger(value) || value < 1 || value > max)
    throw new Error("Puntaje de segmento fuera de rango");
  return value - 1;
}
export function validatePosture(kind, data, partial = false) {
  if (!data || typeof data !== "object" || Array.isArray(data))
    throw new Error("Datos de postura inválidos");
  for (const [key, values] of Object.entries(SPECS[kind])) {
    if (
      partial &&
      (data[key] === undefined || data[key] === null || data[key] === "")
    )
      continue;
    if (!values.includes(data[key]))
      throw new Error(`Seleccione ${key} (${kind.toUpperCase()})`);
  }
  for (const key of FLAGS[kind]) {
    if (
      data[key] !== undefined &&
      typeof data[key] !== "boolean" &&
      !(partial && data[key] === null)
    )
      throw new Error(`Valor inválido: ${key}`);
  }
  if (!partial && kind === "rula" && typeof data.usoMuscular !== "boolean")
    throw new Error("Seleccione uso muscular");
  return true;
}
export function completePosture(kind, data) {
  try {
    validatePosture(kind, data);
    return true;
  } catch {
    return false;
  }
}
