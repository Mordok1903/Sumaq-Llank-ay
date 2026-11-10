const page = document.body.dataset.page;
try {
  const controller = await import(`./pages/${page}.js`);
  await controller.default();
} catch (error) {
  document.body.classList.add("auth-ready");
  const main = document.querySelector("main") || document.body;
  const box = document.createElement("div");
  box.className = "alert alert-danger";
  box.setAttribute("role", "alert");
  box.textContent = error.message || "No se pudo abrir la aplicación";
  main.prepend(box);
}
