import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In production nginx serves the build and proxies /api (HTTP and WebSocket) to the backend,
// stripping the prefix. The dev server does the same so the app uses /api in both cases.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8999',
        ws: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
