import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  envPrefix: ['VITE_', 'AI_'],
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined;
          }

          if (id.includes('react/') || id.includes('react-dom') || id.includes('scheduler')) {
            return 'react-core';
          }

          if (id.includes('react-router')) {
            return 'router';
          }

          if (id.includes('@supabase/supabase-js')) {
            return 'supabase';
          }

          if (id.includes('xlsx')) {
            return 'xlsx';
          }

          if (id.includes('jszip')) {
            return 'jszip';
          }

          if (id.includes('pdfjs-dist')) {
            return 'pdf-tools';
          }

          if (id.includes('tesseract.js')) {
            return 'ocr-tools';
          }

          if (id.includes('marked') || id.includes('highlight.js')) {
            return 'content-tools';
          }

          return 'vendor';
        },
      },
    },
  },
})
