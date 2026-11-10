import { bootstrap, route } from "../app.js";
import { attempt } from "../ui.js";
import { setupMascot } from "../mascot.js";
export default async function () {
  const app = await bootstrap("index");
  if (!app) return;
  const active = sessionStorage.getItem(`sumaq:active:${app.user.id}`);
  for (const a of document.querySelectorAll('a[href*="pages/"]')) {
    const p = a.getAttribute("href").split("/").pop().replace(".html", "");
    a.href = route(p, active);
  }
  setupMascot();
  for (const name of ["identificacion", "reba", "rula", "psicosocial"])
    document.getElementById(`status-${name}`).textContent = active
      ? "Abrir evaluación seleccionada"
      : "Pendiente";
  document.querySelector(".hero-cta a")?.addEventListener("click", (e) => {
    if (!active) {
      e.preventDefault();
      attempt(() => app.newEvaluation());
    }
  });
}
