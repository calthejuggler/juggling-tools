import { fileURLToPath, URL } from "url";

import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    tanstackRouter(),
    react({
      babel: {
        plugins: [["babel-plugin-react-compiler"]],
      },
    }),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/recharts")) {
            return "vendor-recharts";
          }
          if (
            id.includes("node_modules/@xyflow") ||
            id.includes("node_modules/dagre") ||
            id.includes("node_modules/d3-")
          ) {
            return "vendor-react-flow";
          }
        },
      },
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    watch: { usePolling: true },
    proxy: {
      "/api": "http://localhost:3000",
      "/openapi": "http://localhost:3000",
    },
  },
});
