// @ts-check
import { defineConfig } from 'astro/config';
import icon from 'astro-icon';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import node from '@astrojs/node';

// Astro configuration
export default defineConfig({
  site: 'https://maskom.co.id/',
  output: 'server',
  adapter: node({
    mode: 'standalone',
  }),
  integrations: [icon(), sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },

  build: {
    inlineStylesheets: 'auto',
  },
});
