import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
    // Tactical Cache-Bust: Prevent browser from caching rogue workers
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  },
  plugins: [
    inspectAttr(), 
    react(),
    // Tactical Disconnect: Disable PWA Service Worker to prevent routing interception mission failure
    // VitePWA({...})
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
