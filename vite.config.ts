import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    port: 5178,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/monitor-agent.sh': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/monitor-agent.ps1': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/monitor-agent-mikrotik.sh': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
