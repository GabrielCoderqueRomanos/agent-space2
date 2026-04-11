import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@agent-space/shared': path.resolve(__dirname, '../../shared/types.ts'),
    },
  },
  server: {
    open: true,
    port: 5173,
  },
});
