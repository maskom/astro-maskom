// @ts-check
import { defineConfig } from 'astro/config';
import icon from 'astro-icon';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import cloudflare from '@astrojs/cloudflare';

// Astro configuration
export default defineConfig({
  site: 'https://maskom.co.id/',
  output: 'server',
  adapter: cloudflare(),
  integrations: [icon(), sitemap()],
  vite: {
    // @ts-ignore - Vite plugin type compatibility issue with Tailwind CSS
    plugins: [tailwindcss()],
    ssr: {
      external: ['node:crypto'],
    },
  },

  build: {
    inlineStylesheets: 'auto',
  },
});
