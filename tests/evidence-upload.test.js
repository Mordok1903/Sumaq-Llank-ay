import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";

async function screen(run, uploadImpl) {
  const dom = new JSDOM(
    '<body><div id="evidencias-upload-container"></div></body>',
  );
  const previous = Object.fromEntries(
    ["document", "Node", "addEventListener"].map((key) => [
      key,
      globalThis[key],
    ]),
  );
  globalThis.document = dom.window.document;
  globalThis.Node = dom.window.Node;
  globalThis.addEventListener = dom.window.addEventListener.bind(dom.window);
  const records = [],
    calls = { save: 0, upload: 0 };
  const app = {
    store: { id: "test-evaluation" },
    save: async () => {
      calls.save++;
    },
    repo: {
      evidence: async () => records,
      upload: async (id, file, meta) => {
        calls.upload++;
        await uploadImpl?.(calls.upload, file, meta);
        records.push({
          id: String(calls.upload),
          tipo: file.type.startsWith("image/") ? "imagen" : "video",
          nombre_archivo: file.name,
          estado: "activa",
          ...meta,
        });
      },
    },
  };
  try {
    const { uploadZone } = await import("../js/evidencias.js");
    await uploadZone(app);
    const container = document.getElementById("evidencias-upload-container");
    const input = container.querySelector('input[type="file"]');
    const description = container.querySelector("textarea");
    const button = [...container.querySelectorAll("button")].find(
      (node) => node.textContent === "Subir evidencias",
    );
    const status = container.querySelector('[role="status"]');
    const select = (files, source = input) => {
      Object.defineProperty(source, "files", {
        configurable: true,
        value: files,
      });
      source.dispatchEvent(new dom.window.Event("change"));
    };
    const submit = async () => {
      button.click();
      const deadline = Date.now() + 2000;
      do {
        await new Promise((resolve) => setImmediate(resolve));
      } while (button.disabled && Date.now() < deadline);
      assert.equal(
        button.disabled,
        false,
        "el botón debe volver a habilitarse",
      );
    };
    await run({ calls, select, submit, description, status, container });
  } finally {
    clearTimeout(document.getElementById("siga-toast")?.timer);
    dom.window.close();
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    }
  }
}
const photo = () =>
  new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], "foto.png", {
    type: "image/png",
  });
const video = () =>
  new File(
    [new Uint8Array([0, 0, 0, 20, 102, 116, 121, 112, 105, 115, 111, 109])],
    "video.mp4",
    { type: "video/mp4" },
  );

test("carga: descripción ausente se explica antes de guardar o enviar archivos", () =>
  screen(async ({ calls, select, submit, description, status, container }) => {
    select([photo()]);
    await submit();
    assert.deepEqual(calls, { save: 0, upload: 0 });
    assert.match(status.textContent, /mínimo 10 caracteres/);
    assert.equal(description.required, true);
    assert.equal(description.minLength, 10);
    assert.ok(
      container.querySelector(
        "#" + description.getAttribute("aria-describedby"),
      ),
    );
  }));

test("carga: foto y video válidos actualizan la galería y terminan el progreso", () =>
  screen(async ({ calls, select, submit, description, status, container }) => {
    description.value = "Postura de prueba con ambos lados documentados";
    select([photo(), video()]);
    await submit();
    assert.deepEqual(calls, { save: 1, upload: 2 });
    assert.equal(status.textContent, "Evidencias guardadas");
    assert.match(container.textContent, /1\/10 fotos · 1\/3 videos/);
  }));

test("carga: fallo del servidor retira el estado Subiendo y permite reintentar", () =>
  screen(
    async ({ select, submit, description, status }) => {
      description.value = "Postura de prueba suficientemente documentada";
      select([photo()]);
      await submit();
      assert.equal(status.textContent, "Proveedor no disponible");
      assert.doesNotMatch(status.textContent, /Subiendo/);
    },
    async () => {
      throw new Error("Proveedor no disponible");
    },
  ));

test("carga: archivo excesivo se rechaza sin leerlo a memoria ni enviarlo", () =>
  screen(async ({ calls, select, submit, description, status }) => {
    description.value = "Postura de prueba suficientemente documentada";
    let reads = 0;
    select([
      {
        name: "demasiado-grande.png",
        type: "image/png",
        size: 10_000_001,
        arrayBuffer: async () => {
          reads++;
          return new ArrayBuffer(0);
        },
      },
    ]);
    await submit();
    assert.equal(reads, 0);
    assert.deepEqual(calls, { save: 0, upload: 0 });
    assert.match(status.textContent, /10 MB/);
  }));

test("carga: un lote parcial permite reintentar solo el archivo pendiente", () =>
  screen(
    async ({ calls, select, submit, description, status, container }) => {
      description.value = "Postura de prueba suficientemente documentada";
      select([photo(), video()]);
      await submit();
      assert.match(
        status.textContent,
        /1 archivo\(s\) guardado\(s\).*reintentar los pendientes/,
      );
      assert.match(container.textContent, /1\/10 fotos · 0\/3 videos/);
      assert.equal(
        container.querySelectorAll(".evidence-selection li").length,
        1,
      );
      await submit();
      assert.equal(calls.upload, 3);
      assert.match(container.textContent, /1\/10 fotos · 1\/3 videos/);
    },
    async (call) => {
      if (call === 2) throw new Error("No se pudo guardar el video");
    },
  ));

test("cámara: foto y video usan sus selectores nativos y solo el video guarda el segundo indicado", () => {
  const timestamps = [];
  return screen(
    async ({ calls, select, submit, description, container }) => {
      const style = document.createElement("style");
      style.textContent = readFileSync(
        new URL("../css/responsive.css", import.meta.url),
        "utf8",
      );
      document.head.append(style);
      const frame = container.querySelector('input[type="number"]');
      assert.equal(frame.closest("[hidden]") !== null, true);
      for (const [label, accept, file] of [
        ["Tomar foto", "image/*", photo()],
        ["Grabar video", "video/*", video()],
      ]) {
        const source = container.querySelector(`input[aria-label="${label}"]`);
        assert.equal(
          document.defaultView.getComputedStyle(source).display,
          "none",
        );
        assert.equal(source.getAttribute("capture"), "environment");
        assert.equal(source.accept, accept);
        const button = [...container.querySelectorAll("button")].find(
          (node) => node.textContent === label,
        );
        source.addEventListener("click", () => select([file], source), {
          once: true,
        });
        button.click();
      }
      assert.equal(calls.upload, 0);
      assert.equal(frame.closest("[hidden]"), null);
      frame.value = "12.5";
      description.value = "Postura documentada desde la cámara del dispositivo";
      await submit();
      assert.deepEqual(timestamps, [
        ["foto.png", 0],
        ["video.mp4", 12.5],
      ]);
      assert.equal(frame.closest("[hidden]") !== null, true);
      assert.match(container.textContent, /Postura a los 12\.5 s/);
    },
    async (call, file, meta) => {
      timestamps.push([file.name, meta.fotograma_segundos]);
    },
  );
});
