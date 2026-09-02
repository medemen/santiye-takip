import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    allowedHosts: true,
    port: 5173,
    strictPort: true,
  },
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('react') || id.includes('scheduler')) return 'react';
          if (id.includes('@supabase')) return 'supabase';
          if (id.includes('xlsx') || id.includes('jspdf') || id.includes('html2canvas')) return undefined;
          if (id.includes('@capacitor')) return 'capacitor';
          return 'vendor';
        },
      },
    },
  },
})
