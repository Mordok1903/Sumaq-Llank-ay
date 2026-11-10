import { bootstrap, route } from "../app.js";
import { el, $, attempt } from "../ui.js";
import { PSICO } from "../psicosocial.js";
export default async function () {
  const app = await bootstrap("psicosocial");
  if (!app) return;
  const container = $("cuestionario-container");
  const dimensions = $("dim-progress-grid"),
    overview = el(
      "details",
      { class: "dimension-overview" },
      el("summary", { text: "Ver resumen de las 7 dimensiones" }),
    );
  overview.open = matchMedia("(min-width: 768px)").matches;
  dimensions.before(overview);
  overview.append(dimensions);
  const completion = $("completitud-pct").closest(".card");
  completion.classList.add("questionnaire-progress");
  const progress = $("completitud-bar");
  progress.setAttribute("role", "progressbar");
  progress.setAttribute("aria-label", "Preguntas respondidas");
  progress.setAttribute("aria-valuemin", "0");
  progress.setAttribute("aria-valuemax", "100");
  for (let n = 1; n <= 30; n++) {
    const p = PSICO.preguntas[n],
      group = el(
        "fieldset",
        { class: "likert-question", id: `pregunta-${n}` },
        el(
          "legend",
          { class: "likert-text" },
          el("span", { class: "question-number", text: n }),
          el("span", { class: "question-title", text: p.texto }),
        ),
      ),
      scale = el("div", { class: "likert-scale" });
    for (let value = 1; value <= 5; value++) {
      const input = el("input", {
        type: "radio",
        name: `q${n}`,
        value,
        id: `q${n}-${value}`,
      });
      input.checked =
        app.store.state.psicosocial.respuestas?.[`q${n}`] === value;
      scale.append(
        el(
          "label",
          { class: "likert-option", for: `q${n}-${value}` },
          input,
          el("span", { class: "likert-val", text: value }),
          el("span", { class: "likert-desc", text: p.escala[value - 1] }),
        ),
      );
    }
    group.append(scale);
    container.append(group);
  }
  app.capture = (state) => {
    const respuestas = {};
    for (const input of container.querySelectorAll("input:checked"))
      respuestas[input.name] = Number(input.value);
    return { ...state, psicosocial: { ...state.psicosocial, respuestas } };
  };
  const render = () => {
    const respuestas = app.capture(app.store.state).psicosocial.respuestas,
      done = PSICO.getCompletitud(respuestas),
      result = PSICO.calcularTodo(respuestas);
    $("completitud-pct").textContent = `${done.pct}%`;
    $("completitud-count").textContent = done.contestadas;
    $("completitud-bar").style.width = `${done.pct}%`;
    progress.setAttribute("aria-valuenow", String(done.pct));
    progress.setAttribute(
      "aria-valuetext",
      `${done.contestadas} de 30 preguntas respondidas`,
    );
    $("dim-progress-grid").replaceChildren(
      ...PSICO.dimensiones.map((dim) => {
        const r = result.dimensiones[dim.id];
        return el(
          "div",
          { class: "dim-mini-card" },
          el("div", { class: "dim-mini-title", text: dim.nombre }),
          el("div", {
            class: "dim-mini-pct",
            text: r.pct === null ? "Incompleto" : `${r.pct}%`,
          }),
          el("p", {
            text: `${r.contestadas}/${dim.preguntas.length} respuestas · índice orientativo`,
          }),
        );
      }),
    );
    for (const input of container.querySelectorAll("input"))
      input.closest("label").classList.toggle("selected", input.checked);
  };
  container.addEventListener("change", () =>
    attempt(async () => {
      app.edited();
      render();
    }),
  );
  render();
  document
    .querySelector('[data-action="continue"]')
    .addEventListener("click", () =>
      attempt(async () => {
        app.captureNow();
        if (
          PSICO.getCompletitud(app.store.state.psicosocial.respuestas)
            .contestadas !== 30
        )
          throw new Error(
            "Responda las 30 preguntas. Puede guardar el borrador incompleto.",
          );
        await app.navigate(route("dashboard", app.store.id));
      }),
    );
}
