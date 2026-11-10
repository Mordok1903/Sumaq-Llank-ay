import { bootstrap, route } from "../app.js";
import { el, $, attempt, debounce } from "../ui.js";
import { formatDate } from "../../supabase/functions/_shared/domain/evaluation.js";
export default async function () {
  const app = await bootstrap("evaluaciones");
  if (!app) return;
  $("filter-buscar").setAttribute(
    "aria-label",
    "Buscar por empresa o trabajador",
  );
  $("filter-estado").setAttribute("aria-label", "Estado de la evaluación");
  let page = 0,
    request = 0;
  const pager = el("div", { class: "pager" });
  $("evaluaciones-card").after(pager);
  async function load() {
    const serial = ++request,
      filters = {
        buscar: $("filter-buscar").value,
        estado: $("filter-estado").value,
        desde: $("filter-desde").value,
        hasta: $("filter-hasta").value,
      },
      result = await app.repo.list(filters, page);
    if (serial !== request) return;
    const table = el(
        "table",
        {
          class: "eval-table",
          role: "table",
          "aria-label": "Historial de evaluaciones",
        },
        el(
          "thead",
          { role: "rowgroup" },
          el(
            "tr",
            { role: "row" },
            ...[
              "Fecha",
              "Empresa",
              "Trabajador",
              "REBA",
              "RULA",
              "Psicosocial",
              "Estado",
              "Abrir",
            ].map((text) =>
              el("th", { text, scope: "col", role: "columnheader" }),
            ),
          ),
        ),
      ),
      body = el("tbody", { role: "rowgroup" });
    for (const row of result.rows)
      body.append(
        el(
          "tr",
          { role: "row" },
          ...[
            formatDate(row.fecha_eval),
            row.empresa || "Sin empresa",
            row.trabajador || "Sin trabajador",
            row.reba_puntaje_final ?? "Sin evaluar",
            row.rula_puntaje_final ?? "Sin evaluar",
            row.psicosocial_promedio === null ||
            row.psicosocial_promedio === undefined
              ? "Incompleto"
              : `${row.psicosocial_promedio}%`,
            row.estado === "completada" ? "Cerrada" : "En progreso",
          ].map((text, n) =>
            el("td", {
              role: "cell",
              text,
              "data-label": [
                "Fecha",
                "Empresa",
                "Trabajador",
                "REBA",
                "RULA",
                "Psicosocial",
                "Estado",
              ][n],
            }),
          ),
          el(
            "td",
            { "data-label": "Abrir", role: "cell" },
            el("a", {
              class: "btn btn-secondary btn-sm",
              href: route(
                row.estado === "completada" ? "dashboard" : "identificacion",
                row.id,
              ),
              text: "Abrir",
            }),
          ),
        ),
      );
    table.append(body);
    $("evaluaciones-table-container").replaceChildren(
      result.rows.length
        ? table
        : el("p", {
            class: "eval-empty",
            text: "No se encontraron evaluaciones",
          }),
    );
    pager.replaceChildren(
      el("button", {
        class: "btn btn-secondary btn-sm",
        text: "Anterior",
        disabled: page === 0 ? "" : null,
        onclick: () =>
          attempt(async () => {
            page--;
            await load();
          }),
      }),
      el("span", { text: `Página ${page + 1} · ${result.count} evaluaciones` }),
      el("button", {
        class: "btn btn-secondary btn-sm",
        text: "Siguiente",
        disabled: (page + 1) * 20 >= result.count ? "" : null,
        onclick: () =>
          attempt(async () => {
            page++;
            await load();
          }),
      }),
    );
  }
  const reload = debounce(() => {
    page = 0;
    attempt(load);
  });
  for (const id of [
    "filter-buscar",
    "filter-estado",
    "filter-desde",
    "filter-hasta",
  ])
    $(id).addEventListener("input", reload);
  if (app.user.rol === "admin") {
    $("admin-section").style.display = "block";
    const users = await app.repo.listUsers();
    $("admin-user-list").replaceChildren(
      ...users.map((user) =>
        el(
          "div",
          { class: "admin-user-row" },
          el("span", { text: user.nombre }),
          el("span", { text: user.email }),
          el("span", { class: "user-role-badge", text: user.rol }),
        ),
      ),
    );
    document
      .querySelector('[data-action="create-user"]')
      .addEventListener("click", () =>
        attempt(async () => {
          const button = $("btn-crear-usuario"),
            fields = {
              nombre: $("new-user-nombre").value.trim(),
              email: $("new-user-email").value.trim(),
              password: $("new-user-password").value,
              rol: $("new-user-rol").value,
            };
          if (!fields.nombre || !fields.email || fields.password.length < 12)
            throw new Error(
              "Ingrese nombre, correo y una contraseña de al menos 12 caracteres",
            );
          button.disabled = true;
          try {
            await app.repo.createUser(fields);
            $("create-user-feedback").textContent =
              "Cuenta creada. La contraseña no se conserva en este formulario.";
            $("new-user-password").value = "";
          } finally {
            button.disabled = false;
          }
        }),
      );
  }
  await load();
}
