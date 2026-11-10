import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { setupMascot, MASCOT_MESSAGES } from "../js/mascot.js";

function fixture() {
  const dom = new JSDOM(
    '<img id="mascot-img"><div id="mascot-tooltip"></div><a class="mascot-trigger" href="/pages/identificacion.html" data-msg="Empecemos por identificar al trabajador">Iniciar</a><a class="module-card" href="/pages/reba.html?id=prueba">REBA</a>',
  );
  let now = 0,
    id = 0;
  const jobs = new Map();
  const clock = {
    setTimeout(fn, delay) {
      const key = ++id;
      jobs.set(key, { fn, at: now + delay });
      return key;
    },
    clearTimeout(key) {
      jobs.delete(key);
    },
  };
  const tick = (duration) => {
    const end = now + duration;
    while (true) {
      const entry = [...jobs]
        .filter(([, job]) => job.at <= end)
        .sort((a, b) => a[1].at - b[1].at)[0];
      if (!entry) break;
      jobs.delete(entry[0]);
      now = entry[1].at;
      entry[1].fn();
    }
    now = end;
  };
  const doc = dom.window.document,
    mascot = setupMascot(doc, { clock }),
    image = doc.getElementById("mascot-img"),
    tip = doc.getElementById("mascot-tooltip");
  return {
    dom,
    doc,
    image,
    tip,
    tick,
    jobs,
    cleanup() {
      mascot.destroy();
      dom.window.close();
    },
  };
}

test("la mascota saluda al iniciar y el mensaje se oculta al vencer su tiempo", () => {
  const f = fixture();
  try {
    assert.equal(f.tip.hidden, true);
    f.tick(1000);
    assert.match(f.tip.textContent, /Hola.*SST/);
    assert.equal(f.tip.hidden, false);
    f.tick(4000);
    assert.equal(f.tip.hidden, true);
  } finally {
    f.cleanup();
  }
});
test("cada activación cambia la frase y los temporizadores anteriores no ocultan el mensaje nuevo", () => {
  const f = fixture();
  try {
    const seen = [];
    for (let n = 0; n < MASCOT_MESSAGES.length; n++) {
      f.image.click();
      seen.push(f.tip.textContent);
      f.tick(500);
    }
    assert.deepEqual(seen, [...MASCOT_MESSAGES]);
    assert.equal(f.image.classList.contains("bounce"), true);
    f.tick(1000);
    assert.equal(f.tip.hidden, false);
    f.image.dispatchEvent(
      new f.dom.window.KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
        cancelable: true,
      }),
    );
    assert.equal(f.tip.textContent, MASCOT_MESSAGES[0]);
    f.tick(2999);
    assert.equal(f.tip.hidden, false);
    f.tick(1);
    assert.equal(f.tip.hidden, true);
    f.image.dispatchEvent(
      new f.dom.window.KeyboardEvent("keydown", {
        key: " ",
        bubbles: true,
        cancelable: true,
      }),
    );
    assert.equal(f.tip.textContent, MASCOT_MESSAGES[1]);
  } finally {
    f.cleanup();
  }
});
test("botones y tarjetas muestran su contexto con mouse o teclado sin ocultar mensajes más recientes", () => {
  const f = fixture();
  try {
    const [start, reba] = f.doc.querySelectorAll("a");
    start.dispatchEvent(new f.dom.window.MouseEvent("mouseenter"));
    assert.match(f.tip.textContent, /Empecemos/);
    reba.focus();
    assert.equal(f.tip.textContent, "Paso 2: Evaluemos el cuerpo entero.");
    start.dispatchEvent(new f.dom.window.MouseEvent("mouseleave"));
    assert.equal(f.tip.hidden, false);
    f.image.click();
    reba.blur();
    assert.equal(f.tip.textContent, MASCOT_MESSAGES[0]);
    assert.equal(f.tip.hidden, false);
    f.doc.dispatchEvent(
      new f.dom.window.KeyboardEvent("keydown", { key: "Escape" }),
    );
    assert.equal(f.tip.hidden, true);
  } finally {
    f.cleanup();
  }
});
test("al abandonar la página se cancelan mensajes y listeners pendientes", () => {
  const f = fixture();
  try {
    f.dom.window.dispatchEvent(new f.dom.window.Event("pagehide"));
    assert.equal(f.jobs.size, 0);
    f.image.click();
    assert.equal(f.tip.hidden, true);
  } finally {
    f.cleanup();
  }
});
test("al volver a una página conservada en caché la mascota sigue respondiendo", () => {
  const f = fixture();
  try {
    f.image.click();
    f.dom.window.dispatchEvent(
      new f.dom.window.PageTransitionEvent("pagehide", { persisted: true }),
    );
    assert.equal(f.jobs.size, 0);
    assert.equal(f.tip.hidden, true);
    f.dom.window.dispatchEvent(
      new f.dom.window.PageTransitionEvent("pageshow", { persisted: true }),
    );
    f.image.click();
    assert.equal(f.tip.textContent, MASCOT_MESSAGES[1]);
    assert.equal(f.tip.hidden, false);
  } finally {
    f.cleanup();
  }
});
