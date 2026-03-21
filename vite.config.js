import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Force local SDK so createUnsignedRideRequestCancel and other methods are available
      'clutch-hub-sdk-js': path.resolve(__dirname, '../clutch-hub-sdk-js'),
    },
  },
});
