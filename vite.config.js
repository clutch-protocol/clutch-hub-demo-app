import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sdkRoot = path.resolve(__dirname, '../clutch-hub-sdk-js');

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
