import { CONFIG } from "./config.js";
import { getIdentity, logout } from "./auth.js";
import { repository } from "./repository.js";
import { EvaluationStore } from "./store.js";
import { el, $, toast, attempt, download, debounce } from "./ui.js";
import { normalizeEvaluation } from "../supabase/functions/_shared/domain/evaluation.js";
import { setupNavigation } from "./layout.js";

export function route(page, id) {
  return (
    (page === "index" ? "/index.html" : `/pages/${page}.html`) +
    (id ? `?id=${encodeURIComponent(id)}` : "")
  );
}
export async function bootstrap(page) {
  const user = await getIdentity();
  if (!user) {
    location.replace("/pages/login.html");
    return null;
  }
  const app = { user, repo: repository, page, store: null, capture: null };
  const needsEvaluation = [
    "identificacion",
    "reba",
    "rula",
    "psicosocial",
    "dashboard",
  ].includes(page);
  let id = new URL(location.href).searchParams.get("id");
  if (needsEvaluation) {
    id = id || sessionStorage.getItem(`sumaq:active:${user.id}`);
    if (!id && page === "identificacion") id = (await repository.create()).id;
    if (!id) {
      location.replace(route("evaluaciones"));
      return null;
    }
    app.store = await new EvaluationStore(repository, user.id, id).open();
    sessionStorage.setItem(`sumaq:active:${user.id}`, id);
    history.replaceState(null, "", route(page, id));
  }
  app.captureNow = () => {
    if (app.capture && app.store) app.store.update(app.capture);
  };
  app.save = async (notify = false) => {
    app.captureNow();
    if (app.store) await app.store.save();
    if (notify)
      toast(
        CONFIG.mode === "demo"
          ? "Guardado en este navegador"
          : "Guardado en el servidor",
        "success",
      );
  };
  app.navigate = async (target) => {
    await app.save();
    location.href = target;
  };
  app.newEvaluation = async () => {
    await app.save();
    const row = await repository.create();
    location.href = route("identificacion", row.id);
  };
  const auto = debounce(() => attempt(() => app.save()), 700);
  app.edited = () => {
    app.captureNow();
    auto();
  };
  renderSidebar(app);
  setupNavigation(page);
  const status = el("div", {
      class: "save-status",
      role: "status",
      "aria-live": "polite",
    }),
    recovery = el("div", { class: "recovery-actions" });
  document.querySelector(".main-content").prepend(status, recovery);
  if (CONFIG.mode === "demo")
    document.querySelector(".main-content").prepend(
      el("div", {
        class: "demo-banner",
        text: "Prueba local · Los datos y archivos se guardan solo en este navegador. Use información ficticia.",
      }),
    );
  if (app.store) {
    const update = () => {
      const s = app.store;
      status.textContent =
        s.row.estado === "completada"
          ? `Informe cerrado · revisión ${s.revision}`
          : s.error
            ? `Pendiente de guardar: ${s.error}`
            : s.saving
              ? "Guardando…"
              : s.dirty
                ? "Borrador en esta pestaña · pendiente de sincronizar"
                : `${CONFIG.mode === "demo" ? "Guardado local" : "Sincronizado"} · revisión ${s.revision}`;
      status.classList.toggle("save-error", Boolean(s.error || s.conflict));
      recovery.replaceChildren();
      if (s.recoveredDraft)
        recovery.append(
          el("p", {
            text: "La evaluación se cerró en otra sesión. Su borrador anterior sigue disponible para exportar.",
          }),
          el("button", {
            class: "btn btn-secondary btn-sm",
            text: "Exportar borrador anterior",
            onclick: () =>
              download(`borrador-anterior-${s.id}.json`, s.recoveredDraft),
          }),
        );
      if (s.error || s.conflict)
        recovery.append(
          el("button", {
            class: "btn btn-secondary btn-sm",
            text: "Exportar borrador",
            onclick: () => download(`borrador-${s.id}.json`, s.state),
          }),
          el("button", {
            class: "btn btn-secondary btn-sm",
            text: "Reintentar",
            onclick: () => attempt(() => app.save()),
          }),
          el("button", {
            class: "btn btn-secondary btn-sm",
            text: "Recargar versión guardada",
            onclick: () => {
              if (
                confirm(
                  "Se descartará el borrador de esta pestaña. Exporte una copia si desea conservarlo.",
                )
              )
                attempt(async () => {
                  await s.reload();
                  location.reload();
                });
            },
          }),
        );
      try {
        const state = normalizeEvaluation(s.state),
          done = Object.values(state.progreso).filter(Boolean).length;
        $("progress-label").textContent = `${done * 25}%`;
        $("progress-fill").style.width = `${done * 25}%`;
      } catch {
        /* Los valores inválidos se conservan en el borrador para corregirlos. */
      }
    };
    app.store.addEventListener("change", update);
    update();
    addEventListener("beforeunload", (event) => {
      if (app.store.dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    });
    addEventListener("online", () => {
      if (app.store.dirty) attempt(() => app.save());
    });
    if (app.store.row.estado === "completada" && page !== "dashboard") {
      location.replace(route("dashboard", id));
      return null;
    }
  }
  document
    .querySelectorAll('[data-action="save"]')
    .forEach((button) =>
      button.addEventListener("click", () => attempt(() => app.save(true))),
    );
  document
    .querySelectorAll('[data-action="new"]')
    .forEach((button) =>
      button.addEventListener("click", () =>
        attempt(() => app.newEvaluation()),
      ),
    );
  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      attempt(() => app.save(true));
    }
  });
  document.addEventListener("click", (event) => {
    const a = event.target.closest("a[href]");
    if (
      !a ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      a.target === "_blank" ||
      a.hasAttribute("download") ||
      a.getAttribute("href")?.startsWith("#")
    )
      return;
    const target = new URL(a.href, location.href);
    if (target.origin !== location.origin) return;
    if (app.store && /\.html$/.test(target.pathname)) {
      event.preventDefault();
      if (a.dataset.module) target.searchParams.set("id", id);
      attempt(() => app.navigate(target.href));
    }
  });
  document.body.classList.add("auth-ready");
  return app;
}
function renderSidebar(app) {
  const aside = el("aside", { class: "sidebar" }),
    brand = el(
      "div",
      { class: "sidebar-brand" },
      el("div", { class: "sidebar-logo-text", text: "Sumaq Llank'ay" }),
      el("div", {
        class: "sidebar-logo-sub",
        text: "Evaluación de riesgos laborales",
      }),
    );
  const progress = el(
    "div",
    { class: "sidebar-progress" },
    el(
      "div",
      { class: "progress-label" },
      el("span", { text: "Progreso de la evaluación" }),
      el("span", { id: "progress-label", text: "0%" }),
    ),
    el(
      "div",
      { class: "progress-bar-track" },
      el("div", { class: "progress-bar-fill", id: "progress-fill" }),
    ),
  );
  const nav = el("nav", {
    class: "sidebar-nav",
    "aria-label": "Navegación principal",
  });
  for (const [page, label] of [
    ["index", "🏠 Inicio"],
    ["evaluaciones", "📋 Mis evaluaciones"],
    ["identificacion", "👤 Identificación"],
    ["reba", "🏋️ REBA"],
    ["rula", "💪 RULA"],
    ["psicosocial", "🧠 Cuestionario exploratorio"],
    ["dashboard", "📊 Resultados"],
    ["ayuda", "📖 Guía de uso"],
  ])
    nav.append(
      el("a", {
        class: `nav-item ${page === app.page ? "active" : ""}`,
        href: route(page, app.store?.id),
        "aria-current": page === app.page ? "page" : null,
        text: label,
      }),
    );
  nav.append(
    el("button", {
      class: "nav-item nav-button",
      text: "＋ Nueva evaluación",
      onclick: () => attempt(() => app.newEvaluation()),
    }),
  );
  const badge = el(
    "div",
    { class: "sidebar-user" },
    el(
      "div",
      { class: "sidebar-user-info" },
      el("div", { class: "sidebar-user-name", text: app.user.nombre }),
      el("span", {
        class: "user-role-badge",
        text: CONFIG.mode === "demo" ? "Prueba local" : app.user.rol,
      }),
    ),
    el("button", {
      class: "sidebar-user-logout",
      text: "Salir",
      onclick: () =>
        attempt(async () => {
          await app.save();
          await logout();
        }),
    }),
  );
  aside.append(
    brand,
    progress,
    nav,
    badge,
    el("div", {
      class: "sidebar-footer",
      text: "Versión 2.0 · Evaluaciones con revisión y trazabilidad",
    }),
  );
  $("sidebar-root").replaceChildren(aside);
}
