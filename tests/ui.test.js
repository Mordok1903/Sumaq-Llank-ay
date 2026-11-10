import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { JSDOM } from "jsdom";
test("todas las páginas usan módulos externos sin código ni eventos internos", () => {
  for (const file of [
    "index.html",
    ...fs
      .readdirSync("pages")
      .filter((f) => f.endsWith(".html"))
      .map((f) => "pages/" + f),
  ]) {
    const html = fs.readFileSync(file, "utf8"),
      dom = new JSDOM(html);
    assert.equal(
      dom.window.document.querySelectorAll("script:not([src])").length,
      0,
      file,
    );
    assert.equal(/\son\w+=/i.test(html), false, file);
    const ids = [...dom.window.document.querySelectorAll("[id]")].map(
      (e) => e.id,
    );
    assert.equal(new Set(ids).size, ids.length, file);
    const styles = [
      ...dom.window.document.head.querySelectorAll(
        'style,link[rel="stylesheet"]',
      ),
    ];
    assert.equal(
      styles.at(-1).getAttribute("href"),
      "/css/responsive.css",
      file + " debe cargar la adaptación después de sus estilos propios",
    );
  }
});
test("datos con HTML se muestran como texto, incluyendo nombres y atributos", async () => {
  const dom = new JSDOM("<body></body>");
  globalThis.document = dom.window.document;
  globalThis.Node = dom.window.Node;
  const { el } = await import("../js/ui.js");
  const payload = '<img src=x onerror="alert(1)">';
  const node = el("div", { text: payload, title: payload });
  assert.equal(node.querySelector("img"), null);
  assert.equal(node.textContent, payload);
  assert.equal(node.hasAttribute("onerror"), false);
  delete globalThis.document;
  delete globalThis.Node;
});
