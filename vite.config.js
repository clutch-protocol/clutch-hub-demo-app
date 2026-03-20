import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Sibling repo `clutch-hub-sdk-js` — same path Docker dev uses (`/app` → `/clutch-hub-sdk-js`). */
const localSdkRoot = path.resolve(__dirname, '../clutch-hub-sdk-js');
const localSdkEntry = path.join(localSdkRoot, 'src/index.ts');

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Always bundle the local SDK source so `subscribe*` etc. are never stale (avoids old
      // `node_modules` from Docker named volumes or pre–subscription npm tarballs).
      'clutch-hub-sdk-js': localSdkEntry,
    },
  },
  optimizeDeps: {
    include: ['graphql-ws', 'buffer', 'axios', 'rlp', '@noble/hashes', '@noble/secp256k1'],
  },
});
