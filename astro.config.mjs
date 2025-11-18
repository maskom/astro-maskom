// @ts-check
import { defineConfig } from 'astro/config';
import icon from 'astro-icon';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import cloudflare from '@astrojs/cloudflare';
import { VitePWA } from 'vite-plugin-pwa';

// Astro configuration
export default defineConfig({
  site: 'https://maskom.co.id/',
  output: 'server',
  adapter: cloudflare(),
  integrations: [icon(), sitemap()],
  vite: {
    // @ts-ignore - Vite plugin type compatibility issue
    // @ts-ignore - PWA plugin compatibility with Astro
    plugins: [
      tailwindcss(),
      // @ts-ignore - PWA plugin type compatibility
      VitePWA({
        registerType: 'autoUpdate',
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/.*\/api\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-cache',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24,
                },
              },
            },
            {
              urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'images-cache',
                expiration: {
                  maxEntries: 200,
                  maxAgeSeconds: 60 * 60 * 24 * 30,
                },
              },
            },
          ],
        },
        includeAssets: ['favicon.svg', 'logo-maskom.svg'],
        manifest: {
          name: 'Maskom Network - Internet Service Provider',
          short_name: 'Maskom Network',
          description: 'Penyedia layanan internet terpercaya di Indonesia',
          theme_color: '#4F46E5',
          background_color: '#0F1115',
          display: 'standalone',
          orientation: 'portrait',
          scope: '/',
          start_url: '/',
          icons: [
            {
              src: 'favicon.svg',
              sizes: 'any',
              type: 'image/svg+xml',
              purpose: 'any maskable',
            },
          ],
        },
      }),
    ],
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
