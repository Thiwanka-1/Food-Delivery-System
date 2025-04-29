// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8081',
        secure: false,
      },
      // add this block:
      '/socket.io': {
        target: 'http://localhost:8081',
        ws: true,
        secure: false,
      },
    },
  },
  plugins: [react()],
});
