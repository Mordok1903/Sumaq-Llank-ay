import { el, $, attempt, toast } from "./ui.js";
import { CONFIG } from "./config.js";
import {
  validateEvidence,
  validateFile,
} from "../supabase/functions/_shared/domain/media.js";
const urls = new Set();
export async function gallery(app, containerId, readOnly = false) {
  const container = $(containerId);
  if (!container) return;
  const evidence = await app.repo.evidence(app.store.id),
    grid = el("div", { class: "upload-gallery" });
  for (const item of evidence) {
    const card = el("div", { class: "upload-thumb" }),
      media = el("button", {
        class: "media-placeholder",
        type: "button",
        text: item.tipo === "video" ? "▶ Ver video" : "📷 Ver foto",
        onclick: () =>
          attempt(async () => {
            const url = await app.repo.mediaURL(item.id);
            if (url.startsWith("blob:")) urls.add(url);
            const dialog = el("dialog", {
                class: "evidence-dialog",
                "aria-label":
                  item.tipo === "video"
                    ? "Evidencia en video"
                    : "Evidencia fotográfica",
              }),
              player = el(item.tipo === "video" ? "video" : "img", {
                src: url,
                alt: item.descripcion,
                controls: item.tipo === "video" ? "" : null,
                preload: item.tipo === "video" ? "metadata" : null,
              });
            dialog.append(
              el("button", {
                class: "btn btn-secondary",
                text: "Cerrar",
                onclick: () => {
                  dialog.close();
                },
              }),
              player,
              el("p", { text: item.descripcion }),
            );
            dialog.addEventListener(
              "close",
              () => {
                if (item.tipo === "video") player.pause();
                dialog.remove();
                if (url.startsWith("blob:")) {
                  URL.revokeObjectURL(url);
                  urls.delete(url);
                }
              },
              { once: true },
            );
            document.body.append(dialog);
            dialog.showModal();
          }),
      });
    card.append(
      media,
      el(
        "div",
        { class: "upload-thumb-info" },
        el("span", { text: item.nombre_archivo }),
      ),
      el("p", {
        class: "evidence-caption",
        text: `${item.metodo || "Sin vincular"} · ${item.lado || "sin lado"}`,
      }),
      item.tipo === "video"
        ? el("p", {
            class: "evidence-caption",
            text: `Postura a los ${item.fotograma_segundos ?? 0} s`,
          })
        : null,
      el("p", {
        class: "evidence-caption",
        text: item.descripcion || "Evidencia anterior: requiere revisión",
      }),
    );
    if (!readOnly)
      card.append(
        el("button", {
          type: "button",
          class: "btn btn-secondary btn-sm",
          text:
            item.estado === "eliminando"
              ? "Reintentar eliminación"
              : "Eliminar",
          onclick: () =>
            attempt(async () => {
              if (!confirm("¿Eliminar esta evidencia y su archivo?")) return;
              await app.repo.removeMedia(item.id);
              await gallery(app, containerId, readOnly);
              toast(
                "Archivo eliminado o incorporado a la cola de eliminación",
                "info",
              );
            }),
        }),
      );
    grid.append(card);
  }
  container.replaceChildren(
    el("p", {
      text: `${evidence.filter((x) => x.tipo === "imagen").length}/10 fotos · ${evidence.filter((x) => x.tipo === "video").length}/3 videos`,
    }),
    grid,
  );
  return evidence;
}
export async function preparePrintEvidence(app, evidence) {
  const container = $("dashboard-evidencias-gallery");
  container.querySelectorAll(".print-photo").forEach((node) => node.remove());
  await Promise.all(
    evidence
      .filter((item) => item.tipo === "imagen")
      .map(async (item) => {
        const url = await app.repo.mediaURL(item.id);
        if (url.startsWith("blob:")) urls.add(url);
        const image = el("img", {
          class: "print-photo",
          src: url,
          alt: item.descripcion,
        });
        const loaded = new Promise((resolve, reject) => {
          image.onload = resolve;
          image.onerror = () =>
            reject(
              new Error(
                "No se pudo cargar una foto del informe. Reintente la impresión.",
              ),
            );
        });
        container.append(
          el(
            "figure",
            { class: "print-photo" },
            image,
            el("figcaption", { text: item.descripcion }),
          ),
        );
        await loaded;
      }),
  );
}
export async function uploadZone(app) {
  const container = $("evidencias-upload-container");
  if (!container) return;
  const method = el(
    "select",
    { class: "form-select", "aria-label": "Método de la evidencia" },
    ...[
      ["ambos", "REBA y RULA"],
      ["reba", "REBA"],
      ["rula", "RULA"],
    ].map(([value, label]) => el("option", { value, text: label })),
  );
  const side = el(
    "select",
    { class: "form-select", "aria-label": "Lado corporal" },
    ...[
      ["ambos", "Ambos lados"],
      ["derecho", "Derecho"],
      ["izquierdo", "Izquierdo"],
      ["no_aplica", "No aplica"],
    ].map(([value, label]) => el("option", { value, text: label })),
  );
  const frame = el("input", {
      type: "number",
      min: 0,
      max: 86400,
      step: "any",
      value: 0,
      class: "form-input",
      "aria-describedby": "evidence-frame-help evidence-frame-batch-help",
    }),
    description = el("textarea", {
      class: "form-textarea",
      placeholder: "Describa la postura, los ángulos y el momento observado",
      maxlength: 2000,
      minlength: 10,
      required: "",
      "aria-describedby": "evidence-description-help",
      "aria-label": "Descripción de la evidencia",
    }),
    progress = el("p", { role: "status" }),
    list = el("div", { id: "evidence-list" });
  const batchHelp = el("p", { id: "evidence-frame-batch-help" });
  const frameGroup = el(
    "div",
    { hidden: "" },
    el(
      "label",
      { text: "Momento de la postura en el video (segundos)" },
      frame,
    ),
    el("p", {
      id: "evidence-frame-help",
      text: "Si la postura se ve en 0:12, escribe 12. Usa 0 si se ve al inicio.",
    }),
    batchHelp,
  );
  const files = [];
  const selected = el("ul", {
    class: "evidence-selection",
    "aria-label": "Archivos listos para subir",
  });
  const sources = [
    {
      label: "Elegir archivos",
      accept: [...CONFIG.imageTypes, ...CONFIG.videoTypes].join(","),
      multiple: "",
    },
    { label: "Tomar foto", accept: "image/*", capture: "environment" },
    { label: "Grabar video", accept: "video/*", capture: "environment" },
  ].map(({ label, ...attributes }) => {
    const input = el("input", {
      type: "file",
      hidden: "",
      "aria-label": label,
      ...attributes,
      onchange: () => {
        files.push(...input.files);
        input.value = "";
        progress.textContent = "";
        renderSelection();
      },
    });
    const button = el("button", {
      type: "button",
      class: "btn btn-secondary",
      text: label,
      onclick: () => input.click(),
    });
    return { input, button };
  });
  function renderSelection() {
    const videoCount = files.filter((file) =>
      CONFIG.videoTypes.includes(file.type),
    ).length;
    frameGroup.hidden = videoCount === 0;
    if (!videoCount) frame.value = "0";
    batchHelp.textContent =
      videoCount > 1
        ? "Este segundo se aplica a los videos seleccionados. Si cambia de un video a otro, súbelos por separado."
        : "";
    selected.replaceChildren(
      ...files.map((file, index) =>
        el(
          "li",
          {},
          el("span", { text: file.name }),
          el("button", {
            type: "button",
            class: "btn btn-secondary btn-sm",
            text: "Quitar",
            "aria-label": `Quitar ${file.name}`,
            onclick: () => {
              files.splice(index, 1);
              progress.textContent = "";
              renderSelection();
              (
                selected.querySelectorAll("button")[index] || sources[0].button
              ).focus();
            },
          }),
        ),
      ),
    );
    selected.hidden = !files.length;
  }
  const upload = el("button", {
    type: "button",
    class: "btn btn-primary",
    text: "Subir evidencias",
    onclick: () =>
      attempt(async () => {
        upload.disabled = true;
        for (const { button } of sources) button.disabled = true;
        for (const button of selected.querySelectorAll("button"))
          button.disabled = true;
        let uploaded = 0;
        try {
          if (!files.length) throw new Error("Seleccione un archivo");
          const meta = validateEvidence({
            metodo: method.value,
            lado: side.value,
            fotograma_segundos: Number(frame.value),
            descripcion: description.value,
          });
          const batch = [];
          for (const file of files) {
            if (
              file.size >
              (file.type.startsWith("image/")
                ? CONFIG.maxImageBytes
                : CONFIG.maxVideoBytes)
            )
              throw new Error("Máximo 10 MB por imagen y 25 MB por video");
            const type = validateFile(
              file.type,
              new Uint8Array(await file.arrayBuffer()),
            );
            batch.push({ file, type });
          }
          await app.save();
          for (const { file, type } of batch) {
            progress.textContent = `Subiendo ${file.name}…`;
            await app.repo.upload(app.store.id, file, {
              ...meta,
              fotograma_segundos:
                type === "video" ? meta.fotograma_segundos : 0,
            });
            files.shift();
            uploaded++;
          }
          progress.textContent = "Evidencias guardadas";
        } catch (error) {
          progress.textContent =
            error.message || "La carga no se completó. Reintente.";
          if (uploaded) {
            progress.textContent = `${uploaded} archivo(s) guardado(s). Puedes reintentar los pendientes. ${progress.textContent}`;
          }
          throw error;
        } finally {
          if (uploaded) {
            await gallery(app, "evidence-list").catch(() => {
              progress.textContent +=
                " Recarga la página para actualizar la galería.";
            });
          }
          renderSelection();
          for (const { button } of sources) button.disabled = false;
          upload.disabled = false;
        }
      }),
  });
  container.replaceChildren(
    el("p", {
      text: "Mínimo para cerrar: 1 foto y 1 video. Imágenes: JPG, PNG, WebP hasta 10 MB. Videos: MP4, MOV, WebM hasta 25 MB.",
    }),
    el("label", { text: "Método documentado" }, method),
    el("label", { text: "Lado corporal" }, side),
    el(
      "label",
      { text: "Postura y ángulos observados (obligatorio)" },
      description,
    ),
    el("p", {
      id: "evidence-description-help",
      text: "Escriba al menos 10 caracteres sobre la postura observada antes de subir fotos o videos.",
    }),
    el(
      "div",
      { class: "evidence-sources" },
      ...sources.flatMap(({ input, button }) => [input, button]),
    ),
    selected,
    frameGroup,
    upload,
    progress,
    list,
  );
  renderSelection();
  await gallery(app, "evidence-list");
}
addEventListener("pagehide", () => {
  for (const url of urls) URL.revokeObjectURL(url);
  urls.clear();
});
