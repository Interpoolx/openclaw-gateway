import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from "@tailwindcss/vite";
import path from 'path';
import fs from "fs";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
      '/openclaw-ws': {
        target: 'ws://127.0.0.1:18789',
        ws: true,
        changeOrigin: true,
        rewrite: (proxyPath) => proxyPath.replace(/^\/openclaw-ws/, ''),
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('shiki')) {
              return 'vendor-shiki';
            }
            return 'vendor';
          }
        }
      }
    }
  },
});
