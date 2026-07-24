import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Dev-only: forward /api/* to the Express server so the React dev
    // server and the API can be hit from the same origin (no CORS).
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
  build: {
    // Matches the path server/index.js serves as static files in production.
    outDir: 'dist',
  },
})
