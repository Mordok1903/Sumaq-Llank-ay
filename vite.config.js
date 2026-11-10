import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  server: { host: "127.0.0.1", port: 5173, strictPort: true },
  build: {
    target: "es2022",
    rollupOptions: {
      input: Object.fromEntries(
        [
          "index",
          "login",
          "ayuda",
          "evaluaciones",
          "identificacion",
          "reba",
          "rula",
          "psicosocial",
          "dashboard",
        ].map((name) => [
          name,
          resolve(name === "index" ? "index.html" : `pages/${name}.html`),
        ]),
      ),
    },
  },
});
