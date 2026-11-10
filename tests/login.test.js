import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { JSDOM } from "jsdom";
import { initLogin } from "../js/pages/login.js";
const settle = () => new Promise((resolve) => setImmediate(resolve));
async function fixture(options = {}) {
  const dom = new JSDOM(fs.readFileSync("pages/login.html", "utf8"), {
      url: "https://app.invalid/pages/login.html",
    }),
    root = dom.window.document;
  globalThis.document = root;
  globalThis.Node = dom.window.Node;
  const calls = [],
    auth = {
      getIdentity: async () => null,
      login: async (...args) => calls.push(args),
      client: {
        auth: {
          resetPasswordForEmail: async () => ({ error: null }),
          updateUser: async () => ({ error: null }),
          signOut: async () => ({ error: null }),
        },
      },
    };
  await initLogin({
    root,
    mode: "supabase",
    auth,
    redirect: (path) => calls.push(path),
    origin: "https://app.invalid",
    recovery: false,
    ...options,
  });
  return {
    dom,
    root,
    calls,
    auth,
    cleanup() {
      dom.window.close();
      delete globalThis.document;
      delete globalThis.Node;
    },
  };
}
test("acceso: valida los campos, permite mostrar la clave y envia las credenciales sin modificarlas", async () => {
  const f = await fixture();
  try {
    const form = f.root.getElementById("login-form"),
      email = f.root.getElementById("login-email"),
      password = f.root.getElementById("login-password");
    form.dispatchEvent(new f.dom.window.Event("submit", { cancelable: true }));
    await settle();
    assert.equal(f.calls.length, 0);
    assert.equal(f.root.activeElement, email);
    email.value = "demo@invalid.test";
    password.value = " contraseña ficticia ";
    f.root.getElementById("password-toggle").click();
    assert.equal(password.type, "text");
    assert.equal(
      f.root.getElementById("password-toggle").getAttribute("aria-pressed"),
      "true",
    );
    f.root.getElementById("password-toggle").click();
    assert.equal(password.type, "password");
    form.dispatchEvent(new f.dom.window.Event("submit", { cancelable: true }));
    await settle();
    assert.deepEqual(f.calls[0], [
      "demo@invalid.test",
      " contraseña ficticia ",
    ]);
    assert.equal(f.calls[1], "/index.html");
  } finally {
    f.cleanup();
  }
});
test("recuperacion: usa el origen correcto y muestra una respuesta general de cuenta", async () => {
  const f = await fixture();
  try {
    let request;
    f.auth.client.auth.resetPasswordForEmail = async (...args) => {
      request = args;
      return { error: null };
    };
    f.root.getElementById("login-email").value = "demo@invalid.test";
    f.root.getElementById("login-recovery").click();
    await settle();
    assert.equal(
      request[1].redirectTo,
      "https://app.invalid/pages/login.html?flow=recovery",
    );
    assert.match(
      f.root.getElementById("login-feedback").textContent,
      /Si el correo/,
    );
  } finally {
    f.cleanup();
  }
});
test("demo: ofrece acceso de prueba sin recoger contrasenas ni iniciar sesion", async () => {
  const f = await fixture({ mode: "demo" });
  try {
    assert.equal(f.root.querySelectorAll("input[type=password]").length, 0);
    assert.match(f.root.getElementById("login-title").textContent, /Explora/);
    assert.equal(f.calls.length, 0);
  } finally {
    f.cleanup();
  }
});
test("cambio de contrasena: exige longitud, borra la clave y vuelve a ofrecer el acceso", async () => {
  const f = await fixture({ recovery: true });
  try {
    const input = f.root.getElementById("new-password"),
      form = f.root.getElementById("login-form");
    input.value = "corta";
    form.dispatchEvent(new f.dom.window.Event("submit", { cancelable: true }));
    await settle();
    assert.match(f.root.getElementById("login-error-text").textContent, /12/);
    input.value = "contraseña ficticia segura";
    form.dispatchEvent(new f.dom.window.Event("submit", { cancelable: true }));
    await settle();
    assert.match(
      f.root.getElementById("login-feedback").textContent,
      /actualizada/,
    );
    assert.equal(f.root.querySelector("input"), null);
  } finally {
    f.cleanup();
  }
});
