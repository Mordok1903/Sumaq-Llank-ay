import { bootstrap, route } from "../app.js";
import { $, attempt } from "../ui.js";
import { uploadZone } from "../evidencias.js";
import {
  IDENT_FIELDS,
  REQUIRED_IDENT,
  normalizeEvaluation,
  today,
} from "../../supabase/functions/_shared/domain/evaluation.js";
export default async function () {
  const app = await bootstrap("identificacion");
  if (!app) return;
  const saved = app.store.state.identificacion;
  for (const key of IDENT_FIELDS) {
    const node = $(key);
    if (node) {
      node.value = saved[key] || "";
      node.maxLength = 2000;
    }
  }
  if (!$("fechaEval").value) $("fechaEval").value = today();
  $("dni").pattern = "[0-9]{8}";
  $("ruc").pattern = "[0-9]{11}";
  for (const key of ["c1", "c2", "c3", "c4"])
    $(key).checked = saved[key] === true;
  app.capture = (state) => {
    const data = {};
    for (const key of IDENT_FIELDS) data[key] = $(key).value;
    for (const key of ["c1", "c2", "c3", "c4"]) data[key] = $(key).checked;
    return { ...state, identificacion: data };
  };
  for (const node of document.querySelectorAll(
    "#form-identificacion input:not([type=file]),#form-identificacion select,#form-identificacion textarea",
  ))
    node.addEventListener("input", () =>
      attempt(async () => {
        app.edited();
        node
          .closest(".score-option")
          ?.classList.toggle("selected", node.checked);
      }),
    );
  document
    .querySelector('[data-action="continue"]')
    .addEventListener("click", () =>
      attempt(async () => {
        app.captureNow();
        const state = normalizeEvaluation(app.store.state),
          missing = REQUIRED_IDENT.find((key) => !state.identificacion[key]);
        if (missing) {
          $(missing).focus();
          throw new Error("Complete los campos obligatorios");
        }
        await app.navigate(route("reba", app.store.id));
      }),
    );
  await uploadZone(app);
}
