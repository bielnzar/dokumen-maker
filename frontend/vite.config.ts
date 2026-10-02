import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      "/api": {
        target: process.env.VITE_BACKEND_TARGET || "http://127.0.0.1:8090",
        changeOrigin: true,
      },
      "/health": {
        target: process.env.VITE_BACKEND_TARGET || "http://127.0.0.1:8090",
        changeOrigin: true,
      },
    },
  },
})
