import react from '@vitejs/plugin-react';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig } from 'vite';

// Bundle分析用の設定
export default defineConfig({
  plugins: [
    react(),
    visualizer({
      template: 'treemap', // or 'sunburst', 'network'
      open: true,
      gzipSize: true,
      brotliSize: true,
      filename: 'bundle-analysis.html',
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['lucide-react', 'framer-motion'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
          'vendor-utils': ['date-fns', 'browser-image-compression'],
        }
      }
    }
  }
});