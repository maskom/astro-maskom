// @ts-check
import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import icon from "astro-icon";
import sitemap from "@astrojs/sitemap";

// Astro configuration
export default defineConfig({
  site: "https://maskom.co.id/",
  output: "static",
  integrations: [
    tailwind({
      applyBaseStyles: true,
    }),
    icon(),
    sitemap(),
  ],

  build: {
    inlineStylesheets: "auto",
  },
});
