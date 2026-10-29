import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const base = process.env.GITHUB_PAGES ? '/smartvault/' : '/';

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'robots.txt', 'icons/icon-192.png', 'icons/icon-512.png'],
      injectManifest: {
        maximumFileSizeToCacheInBytes: 35 * 1024 * 1024,
      },
      manifest: {
        name: 'SmartVault — Offline AI Photo Inventory',
        short_name: 'SmartVault',
        description: 'Offline-First AI Photo Inventory & Product Stock Management PWA',
        theme_color: '#047857',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'any',
        start_url: base,
        scope: base,
        icons: [
          {
            src: `${base}icons/icon-192.png`.replace('//', '/'),
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: `${base}icons/icon-512.png`.replace('//', '/'),
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: `${base}icons/icon-512.png`.replace('//', '/'),
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  worker: {
    format: 'es',
  },
  optimizeDeps: {
    exclude: ['@huggingface/transformers'],
  },
});
