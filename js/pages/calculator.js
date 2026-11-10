import { bootstrap, route } from "../app.js";
import { $, attempt } from "../ui.js";
import { REBA } from "../reba.js";
import { RULA } from "../rula.js";
import { completePosture } from "../../supabase/functions/_shared/domain/validation.js";
import { createLiveSummary } from "../layout.js";
export default async function calculator(kind) {
  const app = await bootstrap(kind);
  if (!app) return;
  const method = kind === "reba" ? REBA : RULA;
  const summary = createLiveSummary(kind);
  for (const label of document.querySelectorAll("[data-field]")) {
    const input = label.querySelector("input");
    input.name = `${kind}-${label.dataset.field}`;
    input.value = label.dataset.value;
    input.dataset.key = label.dataset.field;
  }
  for (const label of document.querySelectorAll("[data-toggle]"))
    label.querySelector("input").dataset.key = label.dataset.toggle;
  for (const label of document.querySelectorAll("[data-muscle]")) {
    const input = label.querySelector("input");
    input.dataset.key = "usoMuscular";
    input.value = label.dataset.muscle;
  }
  const restore = () => {
    const d = app.store.state[kind];
    for (const input of document.querySelectorAll("input[data-key]")) {
      input.checked =
        input.type === "checkbox"
          ? d[input.dataset.key] === true
          : input.dataset.key === "usoMuscular"
            ? String(d.usoMuscular) === input.value
            : d[input.dataset.key] === input.value;
      input
        .closest(".score-option")
        ?.classList.toggle("selected", input.checked);
    }
  };
  app.capture = (state) => {
    const data = { ...state[kind] };
    for (const input of document.querySelectorAll("input[data-key]")) {
      if (input.type === "checkbox") data[input.dataset.key] = input.checked;
      else if (input.checked)
        data[input.dataset.key] =
          input.dataset.key === "usoMuscular"
            ? input.value === "true"
            : input.value;
    }
    return { ...state, [kind]: data };
  };
  const render = () => {
    const data = app.capture(app.store.state)[kind];
    if (!completePosture(kind, data)) {
      summary(null);
      for (const id of kind === "reba"
        ? ["puntajeA-display", "puntajeB-display", "puntaje-final"]
        : ["posturaA-display", "posturaB-display", "rula-final"])
        if ($(id)) $(id).textContent = "—";
      const level = $(kind === "reba" ? "nivel-display" : "rula-nivel");
      level.textContent = "Sin evaluar · complete las selecciones";
      level.className = "score-display-level";
      $(kind === "reba" ? "accion-display" : "rula-accion").textContent = "";
      $(kind === "reba" ? "score-breakdown" : "rula-breakdown").style.display =
        "none";
      return;
    }
    const r = method.calcular(data);
    summary(r);
    const values =
      kind === "reba"
        ? {
            "puntajeA-display": r.puntuacionA,
            "puntajeB-display": r.puntuacionB,
            "puntaje-final": r.puntuacionFinal,
            "br-tablaA": r.tablaA,
            "br-carga": "+" + r.segmentos.carga,
            "br-pA": r.puntuacionA,
            "br-tablaB": r.tablaB,
            "br-acop": "+" + r.segmentos.acoplamiento,
            "br-pB": r.puntuacionB,
            "br-tablaC": r.tablaC,
            "br-act": "+" + r.sActividad,
            "br-total": r.puntuacionFinal,
          }
        : {
            "posturaA-display": r.posturaA,
            "posturaB-display": r.posturaB,
            "rula-final": r.puntuacionFinal,
            "br-pA": r.posturaA,
            "br-mus": "+" + r.segmentos.musculo,
            "br-fuerza": "+" + r.segmentos.fuerza,
            "br-C": r.puntajeC,
            "br-pB": r.posturaB,
            "br-mus2": "+" + r.segmentos.musculo,
            "br-fuerza2": "+" + r.segmentos.fuerza,
            "br-D": r.puntajeD,
            "br-total": r.puntuacionFinal,
          };
    for (const [id, value] of Object.entries(values))
      if ($(id)) $(id).textContent = value;
    const level = $(kind === "reba" ? "nivel-display" : "rula-nivel");
    level.textContent = `Nivel ${r.nivel} — ${r.riesgo}`;
    level.className = `score-display-level ${r.clase}`;
    $(kind === "reba" ? "accion-display" : "rula-accion").textContent =
      r.accion;
    $(kind === "reba" ? "score-breakdown" : "rula-breakdown").style.display =
      "flex";
  };
  restore();
  render();
  for (const input of document.querySelectorAll("input[data-key]"))
    input.addEventListener("change", () =>
      attempt(async () => {
        app.edited();
        restore();
        render();
      }),
    );
  document
    .querySelector('[data-action="reset"]')
    .addEventListener("click", () =>
      attempt(async () => {
        if (!confirm(`¿Borrar las selecciones de ${kind.toUpperCase()}?`))
          return;
        app.store.update((s) => ({ ...s, [kind]: {} }));
        restore();
        render();
        await app.save(true);
      }),
    );
  document
    .querySelector('[data-action="continue"]')
    .addEventListener("click", () =>
      attempt(async () => {
        app.captureNow();
        if (!completePosture(kind, app.store.state[kind]))
          throw new Error("Complete todas las selecciones del método");
        await app.navigate(
          route(kind === "reba" ? "rula" : "psicosocial", app.store.id),
        );
      }),
    );
}
