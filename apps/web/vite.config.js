import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/auth': { target: process.env.VITE_API_URL || 'http://localhost:3001', changeOrigin: true },
      '/user': { target: process.env.VITE_API_URL || 'http://localhost:3001', changeOrigin: true },
      '/proofs': { target: process.env.VITE_API_URL || 'http://localhost:3001', changeOrigin: true },
    },
  },
});
