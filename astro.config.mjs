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
    plugins: [tailwindcss()],
    ssr: {
      external: ['node:crypto'],
    },
    build: {
      rollupOptions: {
        onwarn(warning, warn) {
          // Suppress empty chunk warnings for Astro components
          if (warning.code === 'EMPTY_BUNDLE') {
            return;
          }
          warn(warning);
        },
      },
    },
  },

  build: {
    inlineStylesheets: 'auto',
  },
});
