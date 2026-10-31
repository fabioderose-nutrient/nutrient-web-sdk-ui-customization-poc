import { defineConfig } from "vite";
import { SDK_SCRIPT_URL } from "./src/catalog.js";

const port = Number(process.env.PORT) || 4610;

export default defineConfig({
  base: process.env.DEPLOY_BASE || "/",
  server: { port, strictPort: true },
  preview: { port, strictPort: true },
  build: { target: "es2022" },
  plugins: [
    {
      // index.html loads the Web SDK from the CDN; the version lives in src/catalog.js only.
      name: "nutrient-sdk-script",
      transformIndexHtml: (html) => html.replace("__SDK_SCRIPT_URL__", SDK_SCRIPT_URL),
    },
  ],
});
