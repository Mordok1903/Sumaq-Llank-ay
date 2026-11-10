import { CONFIG } from "../config.js";
import { getIdentity, login, client } from "../auth.js";
import { el } from "../ui.js";

export async function initLogin({
  root = document,
  mode = CONFIG.mode,
  auth = { getIdentity, login, client },
  redirect = (path) => location.replace(path),
  origin = location.origin,
  recovery = new URL(location.href).searchParams.get("flow") === "recovery",
} = {}) {
  const $ = (id) => root.getElementById(id),
    form = $("login-form");
  const feedback = (message, error = false) => {
    $("login-error").classList.toggle("show", error);
    $("login-error-text").textContent = error ? message : "";
    $("login-feedback").hidden = error || !message;
    $("login-feedback").textContent = error ? "" : message;
  };
  const passwordToggle = (input, button) =>
    button.addEventListener("click", () => {
      const visible = input.type === "password";
      input.type = visible ? "text" : "password";
      button.textContent = visible ? "Ocultar" : "Mostrar";
      button.setAttribute(
        "aria-label",
        visible ? "Ocultar contraseña" : "Mostrar contraseña",
      );
      button.setAttribute("aria-pressed", String(visible));
    });
  if (mode === "demo") {
    $("login-eyebrow").textContent = "Entorno de prueba";
    $("login-title").textContent = "Explora el formulario";
    $("login-subtitle").textContent =
      "Conoce el recorrido de una evaluación con información ficticia.";
    form.replaceChildren(
      el(
        "div",
        { class: "auth-demo-note" },
        el("strong", { text: "Acceso de prueba, sin cuenta" }),
        el("p", {
          text: "Los datos y archivos de esta prueba se conservan en este navegador. Utiliza información ficticia.",
        }),
      ),
      el("a", {
        class: "btn btn-primary btn-full",
        href: "/index.html",
        text: "Entrar a la prueba local →",
      }),
    );
    $("login-account-note").textContent =
      "Para trabajar con evaluaciones reales, utiliza el acceso de tu organización.";
    return;
  }
  if (recovery) {
    $("login-eyebrow").textContent = "Recuperación de acceso";
    $("login-title").textContent = "Crea una nueva contraseña";
    $("login-subtitle").textContent =
      "Utiliza al menos 12 caracteres y una contraseña que no uses en otros servicios.";
    const password = el("input", {
        class: "form-input",
        id: "new-password",
        type: "password",
        required: "",
        minlength: 12,
        autocomplete: "new-password",
      }),
      toggle = el("button", {
        class: "auth-password-toggle",
        type: "button",
        text: "Mostrar",
        "aria-label": "Mostrar contraseña",
        "aria-controls": "new-password",
        "aria-pressed": "false",
      }),
      submit = el("button", {
        class: "btn btn-primary btn-full",
        type: "submit",
        text: "Actualizar contraseña",
      });
    form.replaceChildren(
      el(
        "div",
        { class: "login-form-group" },
        el("label", { for: "new-password", text: "Nueva contraseña" }),
        el("div", { class: "auth-password" }, password, toggle),
      ),
      submit,
    );
    $("login-account-note").textContent =
      "El enlace de recuperación debe ser válido y estar abierto en este navegador.";
    passwordToggle(password, toggle);
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      feedback("");
      if (password.value.length < 12) {
        feedback("Utiliza al menos 12 caracteres.", true);
        password.focus();
        return;
      }
      submit.disabled = true;
      submit.textContent = "Actualizando…";
      try {
        const result = await auth.client.auth.updateUser({
          password: password.value,
        });
        if (result.error)
          throw new Error(
            "El enlace no es válido o expiró. Solicita uno nuevo.",
          );
        const signedOut = await auth.client.auth.signOut();
        if (signedOut.error)
          throw new Error(
            "La contraseña cambió, pero no se pudo cerrar la sesión. Vuelve a iniciar sesión.",
          );
        password.value = "";
        form.replaceChildren(
          el("a", {
            class: "btn btn-primary btn-full",
            href: "/pages/login.html",
            text: "Iniciar sesión →",
          }),
        );
        feedback("Contraseña actualizada. Ya puedes iniciar sesión.");
      } catch (error) {
        feedback(error.message || "No se pudo actualizar la contraseña.", true);
        submit.disabled = false;
        submit.textContent = "Actualizar contraseña";
      }
    });
    return;
  }
  if (await auth.getIdentity()) {
    redirect("/index.html");
    return;
  }
  passwordToggle($("login-password"), $("password-toggle"));
  const checkEmail = () => {
    const email = $("login-email");
    email.value = email.value.trim();
    const valid = email.value && email.validity.valid;
    email.setAttribute("aria-invalid", String(!valid));
    if (!valid) {
      feedback("Escribe un correo electrónico válido.", true);
      email.focus();
      return false;
    }
    return true;
  };
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    feedback("");
    if (!checkEmail()) return;
    const password = $("login-password");
    password.setAttribute("aria-invalid", String(!password.value));
    if (!password.value) {
      feedback("Ingresa tu contraseña.", true);
      password.focus();
      return;
    }
    const button = $("login-btn");
    button.disabled = true;
    button.textContent = "Iniciando sesión…";
    try {
      await auth.login($("login-email").value, password.value);
      redirect("/index.html");
    } catch (error) {
      feedback(
        error.message || "No se pudo iniciar sesión. Inténtalo de nuevo.",
        true,
      );
    } finally {
      button.disabled = false;
      button.textContent = "Iniciar sesión →";
    }
  });
  $("login-recovery").addEventListener("click", async () => {
    feedback("");
    if (!checkEmail()) return;
    const button = $("login-recovery");
    button.disabled = true;
    button.textContent = "Solicitando enlace…";
    try {
      const result = await auth.client.auth.resetPasswordForEmail(
        $("login-email").value,
        { redirectTo: `${origin}/pages/login.html?flow=recovery` },
      );
      if (result.error)
        throw new Error(
          "No se pudo solicitar la recuperación. Inténtalo de nuevo.",
        );
      feedback(
        "Si el correo está registrado, recibirás un enlace para recuperar el acceso.",
      );
    } catch (error) {
      feedback(error.message, true);
    } finally {
      button.disabled = false;
      button.textContent = "¿Olvidaste tu contraseña?";
    }
  });
}
export default initLogin;
