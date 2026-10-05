import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiUrl = env.VITE_API_URL || 'http://localhost:5000';
  const proxyTarget = apiUrl.endsWith('/api') ? apiUrl.replace(/\/api$/, '') : apiUrl;
  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
          // Rewrite not needed because target excludes /api when present
        },
      },
    },
  };
});
