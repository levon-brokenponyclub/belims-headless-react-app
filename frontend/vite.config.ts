import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/',
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [react()],
  define: {
    // Expose REACT_APP_ environment variables to the client
    'import.meta.env.REACT_APP_GEMINI_API_KEY': JSON.stringify(process.env.REACT_APP_GEMINI_API_KEY),
    'import.meta.env.REACT_APP_WOO_SITE_URL': JSON.stringify(process.env.REACT_APP_WOO_SITE_URL),
    'import.meta.env.REACT_APP_WOO_CONSUMER_KEY': JSON.stringify(process.env.REACT_APP_WOO_CONSUMER_KEY),
    'import.meta.env.REACT_APP_WOO_CONSUMER_SECRET': JSON.stringify(process.env.REACT_APP_WOO_CONSUMER_SECRET),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  }
});
