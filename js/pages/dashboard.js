import Chart from "chart.js/auto";
import { bootstrap, route } from "../app.js";
import { el, $, attempt, download, toast } from "../ui.js";
import { gallery, preparePrintEvidence } from "../evidencias.js";
import { PSICO } from "../psicosocial.js";
import {
  QUALITY,
  normalizeEvaluation,
  formatDate,
  verifyReport,
} from "../../supabase/functions/_shared/domain/evaluation.js";

export default async function () {
  const app = await bootstrap("dashboard");
  if (!app) return;
  let report = null,
    state;
  const closed = app.store.row.estado === "completada";
  if (closed)
    document
      .querySelectorAll('[data-action="save"]')
      .forEach((button) => (button.disabled = true));
  if (closed) {
    report = await app.repo.report(app.store.id);
    if (!(await verifyReport(report)))
      throw new Error(
        "La integridad del informe no coincide. Solicite una revisión.",
      );
    state = report.snapshot.payload;
  } else state = normalizeEvaluation(app.store.state);
  const ident = state.identificacion;
  $("print-empresa").textContent = ident.empresa || "Sin empresa";
  $("print-fecha").textContent = formatDate(ident.fechaEval);
  $("sub-fecha").textContent = formatDate(ident.fechaEval);
  document.querySelector(".page-header p:last-child").textContent = closed
    ? "Informe cerrado: se presenta la versión conservada al cierre."
    : "Borrador: complete los módulos y la revisión de calidad antes de cerrar e imprimir.";
  $("datos-identificacion").replaceChildren(
    ...Object.entries({
      Empresa: ident.empresa,
      Área: ident.area,
      Trabajador: ident.trabajador,
      Puesto: ident.puesto,
      Tarea: ident.tarea,
      Monitorista: ident.monitorista,
    }).map(([label, value]) =>
      el(
        "div",
        {},
        el("span", { text: label + ": " }),
        el("strong", { text: value || "Pendiente" }),
      ),
    ),
  );
  for (const kind of ["reba", "rula"]) {
    const r = state[kind],
      valid = Number.isInteger(r.puntuacionFinal),
      score = valid ? r.puntuacionFinal : "Sin evaluar",
      color = valid
        ? r.nivel >= 3
          ? "danger"
          : r.nivel >= 2
            ? "warn"
            : "safe"
        : "";
    $(`val-${kind}`).textContent = score;
    $(`badge-${kind}`).textContent = valid ? r.riesgo : "Sin evaluar";
    $(`dot-${kind}`).className = `semaforo-dot ${color}`;
    $(`stat-${kind}-val`).textContent = score;
    $(`stat-${kind}-nivel`).textContent = valid
      ? r.accion
      : "Complete las selecciones";
    $(`detalle-${kind}`).replaceChildren(
      el("p", {
        text: valid
          ? r.accion
          : "No hay una evaluación completa de este método.",
      }),
      ...(valid
        ? [
            el(
              "dl",
              {},
              ...Object.entries(r.segmentos).flatMap(([key, value]) => [
                el("dt", { text: key }),
                el("dd", { text: value }),
              ]),
            ),
            el("p", { text: `Versión: ${r.version}` }),
          ]
        : []),
    );
  }
  const psico = state.psicosocial,
    pct = psico.promedioGlobal;
  $("val-psico").textContent = Number.isFinite(pct) ? `${pct}%` : "Incompleto";
  $("badge-psico").textContent = Number.isFinite(pct)
    ? "Índice orientativo"
    : "Sin evaluar";
  $("stat-psico-val").textContent = Number.isFinite(pct)
    ? `${pct}%`
    : "Incompleto";
  $("stat-psico-nivel").textContent =
    "Cuestionario propio; no equivale a FPSICO";
  $("dot-psico").className = "semaforo-dot";
  $("detalle-psicosocial").replaceChildren(
    ...PSICO.dimensiones.map((dim) => {
      const r = psico.dimensiones?.[dim.id];
      return el("p", {
        text: `${dim.nombre}: ${Number.isFinite(r?.pct) ? r.pct + "% (orientativo)" : "Incompleto"}`,
      });
    }),
  );
  new Chart($("radar-chart"), {
    type: "radar",
    data: {
      labels: [
        ["Participación"],
        ["Formación e", "información"],
        ["Gestión del", "tiempo"],
        ["Cohesión del", "grupo"],
        ["Carga mental"],
        ["Autonomía"],
        ["Condiciones", "laborales"],
      ],
      datasets: [
        {
          label: "Índice orientativo",
          data: PSICO.dimensiones.map(
            (d) => psico.dimensiones?.[d.id]?.pct ?? null,
          ),
          borderColor: "#6366f1",
          backgroundColor: "rgba(99,102,241,.15)",
          spanGaps: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: "#cbd5e1" } } },
      scales: {
        r: {
          min: 0,
          max: 100,
          grid: { color: "rgba(148,163,184,.2)" },
          angleLines: { color: "rgba(148,163,184,.2)" },
          pointLabels: { color: "#cbd5e1", font: { size: 11 } },
          ticks: {
            stepSize: 25,
            color: "#94a3b8",
            backdropColor: "transparent",
          },
        },
      },
      animation: false,
    },
  });
  $("radar-chart").setAttribute("role", "img");
  $("radar-chart").setAttribute(
    "aria-label",
    "Perfil psicosocial orientativo. Los valores de cada dimensión se presentan en el detalle inferior.",
  );
  const recs = [];
  if (state.reba.nivel >= 2) recs.push(state.reba.accion);
  if (state.rula.nivel >= 2) recs.push(state.rula.accion);
  for (const d of PSICO.dimensiones)
    if (psico.dimensiones?.[d.id]?.nivel === "elevado")
      recs.push(...PSICO.recomendaciones[d.id]);
  $("recomendaciones-container").replaceChildren(
    ...(recs.length
      ? recs
      : [
          "Las recomendaciones se presentan según los módulos completos. Un dato pendiente no indica ausencia de riesgo.",
        ]
    ).map((text) => el("p", { class: "recomendacion-card", text })),
  );
  const qualityInputs = [
    ...document.querySelectorAll(".card input[type=checkbox]"),
  ].slice(0, 6);
  qualityInputs.forEach((input, n) => {
    input.id = `quality-${n}`;
    input.checked = state.calidad[n];
    input.disabled = closed;
    input.addEventListener("change", () => attempt(async () => app.edited()));
  });
  let controls = structuredClone(state.acciones),
    plan = el(
      "section",
      { class: "card mt-lg" },
      el("h2", { text: "Medidas de control y seguimiento" }),
    ),
    list = el("div");
  function renderPlan() {
    list.replaceChildren(
      ...controls.map((a, n) => {
        const card = el("div", { class: "control-row" });
        for (const [key, label, type] of [
          ["descripcion", "Medida", "text"],
          ["responsable", "Responsable", "text"],
          ["fecha", "Plazo", "date"],
          ["verificacion", "Comprobación del control", "text"],
        ]) {
          const input = el("input", {
            class: "form-input",
            type,
            value: a[key] || "",
            "aria-label": label,
            placeholder: label,
            disabled: closed ? "" : null,
          });
          input.addEventListener("input", () => {
            controls[n][key] = input.value;
            attempt(async () => app.edited());
          });
          card.append(el("label", { text: label }, input));
        }
        const select = el(
          "select",
          {
            class: "form-select",
            "aria-label": "Estado del control",
            disabled: closed ? "" : null,
          },
          ...["pendiente", "en_curso", "verificada"].map((value) =>
            el("option", { value, text: value }),
          ),
        );
        select.value = a.estado;
        select.addEventListener("change", () => {
          controls[n].estado = select.value;
          attempt(async () => app.edited());
        });
        card.append(select);
        if (!closed)
          card.append(
            el("button", {
              type: "button",
              class: "btn btn-secondary btn-sm",
              text: "Quitar medida",
              onclick: () => {
                controls.splice(n, 1);
                renderPlan();
                attempt(async () => app.edited());
              },
            }),
          );
        return card;
      }),
    );
  }
  plan.append(list);
  if (!closed)
    plan.append(
      el("button", {
        type: "button",
        class: "btn btn-secondary",
        text: "Añadir medida",
        onclick: () => {
          controls.push({
            id: crypto.randomUUID(),
            descripcion: "",
            responsable: "",
            fecha: "",
            estado: "pendiente",
            verificacion: "",
          });
          renderPlan();
          attempt(async () => app.edited());
        },
      }),
    );
  $("recomendaciones-container").closest(".card").after(plan);
  renderPlan();
  if (closed) {
    const followup = el(
      "section",
      { class: "card mt-lg no-print" },
      el("h2", { text: "Seguimiento posterior al cierre" }),
      el("p", {
        text: "Cada actualización se registra sin cambiar el informe conservado.",
      }),
    );
    for (const action of await app.repo.controls(app.store.id)) {
      const select = el(
          "select",
          { class: "form-select", "aria-label": "Avance de la medida" },
          ...["pendiente", "en_curso", "verificada"].map((value) =>
            el("option", { value, text: value }),
          ),
        ),
        note = el("textarea", {
          class: "form-textarea",
          "aria-label": "Comprobación posterior",
          maxlength: 2000,
        });
      select.value = action.estado;
      note.value = action.verificacion || "";
      const save = el("button", {
        class: "btn btn-primary",
        text: "Guardar seguimiento",
        onclick: () =>
          attempt(async () => {
            save.disabled = true;
            try {
              await app.repo.trackControl(
                action.id,
                app.store.id,
                select.value,
                note.value,
              );
              toast("Seguimiento registrado");
            } finally {
              save.disabled = false;
            }
          }),
      });
      followup.append(
        el(
          "div",
          { class: "control-row" },
          el("p", { text: action.descripcion }),
          select,
          note,
          save,
        ),
      );
    }
    plan.after(followup);
  }
  app.capture = (s) => ({
    ...s,
    calidad: qualityInputs.map((input) => input.checked),
    acciones: structuredClone(controls),
  });
  const meta = el(
    "div",
    { class: "report-meta" },
    el("p", {
      text: `Evaluación ${app.store.id} · revisión ${app.store.revision}`,
    }),
    el("p", {
      text: `REBA ${state.versions.reba} · RULA ${state.versions.rula} · Psicosocial ${state.versions.psicosocial}`,
    }),
  );
  if (report)
    meta.append(
      el("p", {
        text: `Informe ${report.id} · cierre ${new Date(report.created_at).toLocaleString("es-PE", { timeZone: "America/Lima" })}`,
      }),
      el("p", { class: "hash", text: `SHA-256: ${report.sha256}` }),
      el("button", {
        class: "btn btn-secondary",
        text: "Descargar informe verificable (JSON)",
        onclick: () => download(`informe-${report.id}.json`, report),
      }),
    );
  document.querySelector(".page-header").after(meta);
  if (!closed) {
    const close = el("button", {
      class: "btn btn-success btn-lg",
      text: "Cerrar y conservar informe",
      onclick: () =>
        attempt(async () => {
          close.disabled = true;
          try {
            await app.save();
            await app.store.close();
            location.replace(route("dashboard", app.store.id));
          } finally {
            close.disabled = false;
          }
        }),
    });
    document.querySelector(".form-navigation").prepend(close);
  }
  const evidence = await gallery(app, "dashboard-evidencias-gallery", true);
  document.querySelectorAll('[data-action="print"]').forEach((button) =>
    button.addEventListener("click", () =>
      attempt(async () => {
        if (!closed) {
          toast(
            "Cierre la evaluación para imprimir un informe definitivo",
            "warning",
          );
          return;
        }
        button.disabled = true;
        try {
          await preparePrintEvidence(app, evidence);
          window.print();
        } finally {
          button.disabled = false;
        }
      }),
    ),
  );
  const events = await app.repo.events(app.store.id),
    history = el(
      "details",
      { class: "card mt-lg" },
      el("summary", { text: "Registro de trazabilidad" }),
      ...events.map((event) =>
        el("p", {
          text: `${event.created_at} · ${event.accion} · actor ${event.actor_id} · revisión ${event.revision}`,
        }),
      ),
    );
  document.querySelector(".form-navigation").before(history);
  // El informe cerrado conserva los metadatos y huellas de sus evidencias.
  if (report && report.snapshot.evidencias?.length !== evidence.length)
    toast(
      "La galería y el expediente de cierre difieren. Revise la trazabilidad.",
      "warning",
    );
}
