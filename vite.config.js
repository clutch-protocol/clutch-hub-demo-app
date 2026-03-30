import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { VitePWA } from 'vite-plugin-pwa';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sdkRoot = path.resolve(__dirname, '../clutch-hub-sdk-js');

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeManifestIcons: false,
      // Important: make the PWA assets available in dev mode too.
      // Without this, /sw.js and /registerSW.js fall back to index.html.
      devOptions: {
        enabled: true,
        type: 'classic',
      },
      manifest: {
        id: '/',
        lang: 'en',
        name: 'Clutch Stage',
        short_name: 'Clutch',
        description: 'Clutch decentralized ride-sharing demo',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        display_override: ['standalone', 'browser'],
        orientation: 'portrait',
        prefer_related_applications: false,
        background_color: '#060e20',
        theme_color: '#060e20',
        icons: [
          {
            src: '/favicon.ico',
            sizes: '64x64 32x32 24x24 16x16',
            type: 'image/x-icon',
            purpose: 'any',
          },
          {
            src: '/clutch-logo.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        navigateFallback: '/index.html',
      },
    }),
  ],
  resolve: {
    alias: {
      // Always use repo SDK + fresh dist (avoids stale Vite pre-bundle of an old version)
      'clutch-hub-sdk-js': sdkRoot,
    },
  },
  optimizeDeps: {
    exclude: ['clutch-hub-sdk-js'],
  },
});
