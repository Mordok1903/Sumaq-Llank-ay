export const MASCOT_MESSAGES = Object.freeze([
  "¡La postura es importante!",
  "Recuerda hacer pausas activas.",
  "¡Cuidemos la espalda!",
  "¡Yo te ayudo con los cálculos!",
]);

const CONTEXT_MESSAGES = {
  identificacion: "Paso 1: Datos del trabajador y puesto.",
  reba: "Paso 2: Evaluemos el cuerpo entero.",
  rula: "Paso 3: Evaluemos los brazos y muñecas.",
  psicosocial: "Paso 4: Revisemos el cuestionario exploratorio.",
  dashboard: "Paso 5: Revisemos los informes finales.",
};

export function setupMascot(root = document, { clock = globalThis } = {}) {
  const image = root.getElementById("mascot-img"),
    tip = root.getElementById("mascot-tooltip");
  if (!image || !tip) return;
  let next = 0,
    hideTimer,
    greetingTimer,
    source = null;
  const disposers = [];
  const listen = (element, type, handler) => {
    element.addEventListener(type, handler);
    disposers.push(() => element.removeEventListener(type, handler));
  };
  const cancelGreeting = () => clock.clearTimeout(greetingTimer);
  const hide = (owner) => {
    if (owner && source !== owner) return;
    clock.clearTimeout(hideTimer);
    source = null;
    tip.classList.remove("show");
    tip.hidden = true;
  };
  const show = (message, owner, duration = 3000) => {
    cancelGreeting();
    clock.clearTimeout(hideTimer);
    source = owner;
    tip.hidden = false;
    tip.textContent = message;
    tip.classList.add("show");
    if (duration > 0) hideTimer = clock.setTimeout(() => hide(owner), duration);
  };
  const activate = () => {
    show(MASCOT_MESSAGES[next], image);
    next = (next + 1) % MASCOT_MESSAGES.length;
    image.classList.remove("bounce");
    void image.offsetWidth;
    image.classList.add("bounce");
  };
  image.setAttribute("role", "button");
  image.tabIndex = 0;
  image.setAttribute("aria-label", "Mostrar consejo de evaluación");
  image.setAttribute("aria-controls", tip.id);
  tip.setAttribute("role", "status");
  tip.setAttribute("aria-live", "polite");
  tip.setAttribute("aria-atomic", "true");
  tip.hidden = true;
  listen(image, "click", activate);
  listen(image, "keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      activate();
    }
  });
  listen(image, "animationend", () => image.classList.remove("bounce"));
  listen(root, "keydown", (event) => {
    if (event.key === "Escape") hide();
  });
  for (const trigger of root.querySelectorAll(".mascot-trigger,.module-card")) {
    const path = (trigger.getAttribute("href") || "")
      .split("?")[0]
      .split("/")
      .pop()
      .replace(".html", "");
    const message = trigger.dataset.msg || CONTEXT_MESSAGES[path];
    if (!message) continue;
    let hovered = false,
      focused = false;
    listen(trigger, "mouseenter", () => {
      hovered = true;
      show(message, trigger, 0);
    });
    listen(trigger, "mouseleave", () => {
      hovered = false;
      if (!focused) hide(trigger);
    });
    listen(trigger, "focusin", () => {
      focused = true;
      show(message, trigger, 0);
    });
    listen(trigger, "focusout", (event) => {
      if (trigger.contains(event.relatedTarget)) return;
      focused = false;
      if (!hovered) hide(trigger);
    });
  }
  greetingTimer = clock.setTimeout(
    () =>
      show(
        "¡Hola! Soy tu asistente en SST. ¿Listo para evaluar? 🦙",
        image,
        4000,
      ),
    1000,
  );
  const destroy = () => {
    cancelGreeting();
    hide();
    image.classList.remove("bounce");
    disposers.forEach((dispose) => dispose());
  };
  if (root.defaultView)
    listen(root.defaultView, "pagehide", (event) => {
      if (!event.persisted) {
        destroy();
        return;
      }
      // Al volver desde la caché del navegador se reutiliza la misma página y sus eventos.
      cancelGreeting();
      hide();
      image.classList.remove("bounce");
    });
  return { destroy };
}
