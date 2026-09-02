import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Sección 2: paleta como variables de tema (CSS vars / theme tokens).
// El proxy '/api' apunta al backend en :4000 para evitar CORS en dev.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
