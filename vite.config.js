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
      manifest: {
        name: 'Clutch Stage',
        short_name: 'Clutch',
        description: 'Clutch decentralized ride-sharing demo',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#060e20',
        theme_color: '#060e20',
        icons: [
          {
            src: '/clutch-logo.svg',
            sizes: 'any',
            type: 'image/svg+xml',
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
