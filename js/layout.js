import { el } from "./ui.js";

// La navegación es la misma en todos los tamaños: se mueve al diálogo sin duplicar enlaces.
export function setupNavigation(page) {
  const root = document.getElementById("sidebar-root"),
    sidebar = root?.querySelector(".sidebar"),
    main = document.querySelector("main");
  if (!sidebar || !main) return;
  main.id = "main-content";
  main.tabIndex = -1;
  const names = {
    index: "Inicio",
    evaluaciones: "Mis evaluaciones",
    identificacion: "Identificación",
    reba: "REBA",
    rula: "RULA",
    psicosocial: "Cuestionario",
    dashboard: "Resultados",
  };
  const toggle = el(
    "button",
    {
      type: "button",
      class: "menu-toggle",
      "aria-label": "Abrir menú",
      "aria-controls": "navigation-dialog",
      "aria-expanded": "false",
    },
    el("span", { "aria-hidden": "true", text: "☰" }),
    el("span", { text: "Menú" }),
  );
  const header = el(
    "header",
    { class: "mobile-header no-print" },
    el("a", {
      class: "mobile-brand",
      href: "/index.html",
      text: "Sumaq Llank’ay",
    }),
    el("span", { class: "mobile-page", text: names[page] || "Evaluación" }),
    toggle,
  );
  const close = el("button", {
    type: "button",
    class: "nav-close",
    "aria-label": "Cerrar menú",
    text: "✕",
  });
  sidebar.querySelector(".sidebar-brand").append(close);
  const dialog = el("dialog", {
    id: "navigation-dialog",
    class: "navigation-dialog",
    "aria-label": "Menú de navegación",
  });
  const skip = el("a", {
    class: "skip-link",
    href: "#main-content",
    text: "Ir al contenido",
  });
  document.body.prepend(skip, header);
  document.body.append(dialog);
  const compact = matchMedia("(max-width: 1100px)");
  const reset = () => {
    toggle.setAttribute("aria-expanded", "false");
    document.body.classList.remove("navigation-open");
  };
  const hide = () => {
    if (dialog.open) dialog.close();
    reset();
  };
  const change = () => {
    const focused = sidebar.contains(document.activeElement);
    if (compact.matches) {
      dialog.append(sidebar);
      if (focused) toggle.focus({ preventScroll: true });
    } else {
      hide();
      root.append(sidebar);
      if (document.activeElement === toggle)
        sidebar
          .querySelector('[aria-current="page"]')
          ?.focus({ preventScroll: true });
    }
  };
  toggle.addEventListener("click", () => {
    if (!compact.matches) return;
    dialog.showModal();
    toggle.setAttribute("aria-expanded", "true");
    document.body.classList.add("navigation-open");
    close.focus();
  });
  close.addEventListener("click", hide);
  dialog.addEventListener("keydown", (event) => {
    if (event.key !== "Tab" || !dialog.open) return;
    const items = [
        ...dialog.querySelectorAll(
          'a[href],button:not(:disabled),[tabindex="0"]',
        ),
      ].filter((node) => node.getClientRects().length),
      first = items[0],
      last = items.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  });
  dialog.addEventListener("close", reset);
  dialog.addEventListener("click", (event) => {
    if (event.target.closest("a[href]")) {
      hide();
      return;
    }
    if (event.target === dialog) {
      const bounds = dialog.getBoundingClientRect();
      if (
        event.clientX < bounds.left ||
        event.clientX > bounds.right ||
        event.clientY < bounds.top ||
        event.clientY > bounds.bottom
      )
        hide();
    }
  });
  compact.addEventListener("change", change);
  change();
  return { dialog, toggle, close, compact };
}

export function createLiveSummary(kind) {
  const panel = document.querySelector(".score-display");
  panel.id = "score-details";
  panel.tabIndex = -1;
  const score = el("strong", { class: "live-summary-score" }),
    level = el("span", { class: "live-summary-level" });
  const summary = el(
    "aside",
    {
      class: "live-summary no-print",
      "aria-label": `Resultado ${kind.toUpperCase()} en tiempo real`,
    },
    el(
      "div",
      { role: "status", "aria-live": "polite", "aria-atomic": "true" },
      score,
      level,
    ),
    el("a", {
      class: "btn btn-secondary btn-sm",
      href: "#score-details",
      text: "Ver detalle",
    }),
  );
  document.querySelector("main").append(summary);
  return (result) => {
    score.textContent = `${kind.toUpperCase()} · ${result?.puntuacionFinal ?? "—"}`;
    level.textContent = result ? result.riesgo : "Complete las selecciones";
  };
}
