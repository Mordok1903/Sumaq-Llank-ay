export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === "text") node.textContent = String(value ?? "");
    else if (key === "class") node.className = value;
    else if (key.startsWith("on") && typeof value === "function")
      node.addEventListener(key.slice(2), value);
    else if (value !== undefined && value !== null)
      node.setAttribute(key, String(value));
  }
  for (const child of children.flat())
    if (child !== null && child !== undefined)
      node.append(
        child instanceof Node ? child : document.createTextNode(String(child)),
      );
  return node;
}
export const $ = (id) => document.getElementById(id);
export function toast(message, type = "info") {
  let node = $("siga-toast");
  if (!node) {
    node = el("div", {
      id: "siga-toast",
      role: "status",
      "aria-live": "polite",
    });
    document.body.append(node);
  }
  node.className = `toast ${type}`;
  node.textContent = message;
  node.hidden = false;
  clearTimeout(node.timer);
  node.timer = setTimeout(() => (node.hidden = true), 5000);
}
export function errorMessage(error) {
  return error?.message || "No se pudo completar la operación";
}
export async function attempt(operation) {
  try {
    return await operation();
  } catch (error) {
    toast(errorMessage(error), "error");
    return null;
  }
}
export function download(name, value, type = "application/json") {
  const url = URL.createObjectURL(
    new Blob(
      [typeof value === "string" ? value : JSON.stringify(value, null, 2)],
      { type },
    ),
  );
  const a = el("a", { href: url, download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function debounce(fn, ms = 350) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}
