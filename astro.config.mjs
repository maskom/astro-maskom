// @ts-check
import { defineConfig } from "astro/config";
import icon from "astro-icon";
import sitemap from "@astrojs/sitemap";
import tailwind from "@astrojs/tailwind";
import node from "@astrojs/node";

// Astro configuration
export default defineConfig({
  site: "https://maskom.co.id/",
  output: "server",
  adapter: node({
    mode: "standalone",
  }),
  integrations: [
    tailwind(),
    icon(),
    sitemap(),
  ],

  build: {
    inlineStylesheets: "auto",
  },
});
