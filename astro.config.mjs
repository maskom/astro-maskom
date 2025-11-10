// @ts-check
import { defineConfig } from "astro/config";
import icon from "astro-icon";
import sitemap from "@astrojs/sitemap";
import tailwind from "@tailwindcss/vite";

// Astro configuration
export default defineConfig({
  site: "https://maskom.co.id/",
  output: "static",
  integrations: [
    tailwind(),
    icon(),
    sitemap(),
  ],

  build: {
    inlineStylesheets: "auto",
  },
});
