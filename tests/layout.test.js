import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { setupNavigation, createLiveSummary } from "../js/layout.js";

test("el menú reutiliza los enlaces al alternar celular y escritorio y conserva su estado accesible", () => {
  const dom = new JSDOM(
    '<body><div id="sidebar-root"><aside class="sidebar"><div class="sidebar-brand">Aplicación</div><nav><a href="/index.html" aria-current="page">Inicio</a><a href="/pages/evaluaciones.html">Evaluaciones</a></nav></aside></div><main><h1>Inicio</h1></main></body>',
  );
  const listeners = new Set(),
    media = {
      matches: true,
      addEventListener: (type, fn) => listeners.add(fn),
    };
  Object.assign(globalThis, {
    document: dom.window.document,
    Node: dom.window.Node,
    matchMedia: () => media,
  });
  dom.window.HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  dom.window.HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
    this.dispatchEvent(new dom.window.Event("close"));
  };
  try {
    const original = document.querySelector("nav"),
      layout = setupNavigation("index");
    assert.equal(layout.dialog.querySelector("nav"), original);
    assert.equal(document.querySelectorAll("nav").length, 1);
    layout.toggle.click();
    assert.equal(layout.dialog.open, true);
    assert.equal(layout.toggle.getAttribute("aria-expanded"), "true");
    layout.close.click();
    assert.equal(layout.dialog.open, false);
    assert.equal(document.body.classList.contains("navigation-open"), false);
    layout.toggle.click();
    media.matches = false;
    for (const fn of listeners) fn();
    assert.equal(layout.dialog.open, false);
    assert.equal(document.querySelector("#sidebar-root nav"), original);
    assert.equal(layout.toggle.getAttribute("aria-expanded"), "false");
    media.matches = true;
    for (const fn of listeners) fn();
    layout.toggle.click();
    layout.dialog.querySelector("a").click();
    assert.equal(layout.dialog.open, false);
    assert.equal(
      document.querySelector(".skip-link").getAttribute("href"),
      "#main-content",
    );
  } finally {
    dom.window.close();
    delete globalThis.document;
    delete globalThis.Node;
    delete globalThis.matchMedia;
  }
});

test("el resumen de la calculadora actualiza el puntaje y borra un resultado anterior al reiniciar", () => {
  const dom = new JSDOM(
    '<body><main><div class="score-display"></div></main></body>',
  );
  Object.assign(globalThis, {
    document: dom.window.document,
    Node: dom.window.Node,
  });
  try {
    const update = createLiveSummary("rula");
    update({ puntuacionFinal: 5, riesgo: "Cambiar pronto" });
    assert.match(
      document.querySelector(".live-summary").textContent,
      /RULA · 5Cambiar pronto/,
    );
    update(null);
    assert.match(
      document.querySelector(".live-summary").textContent,
      /RULA · —Complete las selecciones/,
    );
    assert.equal(
      document.querySelector(".live-summary a").getAttribute("href"),
      "#score-details",
    );
    assert.equal(document.querySelector("#score-details").tabIndex, -1);
  } finally {
    dom.window.close();
    delete globalThis.document;
    delete globalThis.Node;
  }
});
