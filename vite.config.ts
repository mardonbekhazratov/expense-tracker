import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// No PWA / service worker: the app only ships inside the Capacitor shell, and
// the browser build is just for development.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5174,
  },
});
