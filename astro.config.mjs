// @ts-check
import { defineConfig } from "astro/config";
import icon from "astro-icon";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import cloudflare from "@astrojs/cloudflare";

// Validate environment variables at config load
import "./src/middleware/env-validation.ts";

// Astro configuration
export default defineConfig({
  site: process.env.SITE_URL || "https://maskom.co.id/",
  output: "server",
  adapter: cloudflare({
    mode: "advanced",
  }),
  integrations: [
    icon(),
    sitemap(),
  ],
  vite: {
    plugins: [tailwindcss()],
  },

  build: {
    inlineStylesheets: "auto",
  },
});
