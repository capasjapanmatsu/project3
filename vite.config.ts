import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { defineConfig } from 'vite';
import viteCompression from 'vite-plugin-compression';

// Bundle analysis plugin - we'll add this conditionally
let visualizerPlugin: any = null;
if (process.env.ANALYZE) {
  try {
    // @ts-ignore
    const { visualizer } = require('rollup-plugin-visualizer');
    visualizerPlugin = visualizer({
      filename: 'dist/stats.html',
      open: true,
      gzipSize: true,
      brotliSize: true,
      template: 'treemap',
    });
  } catch (e) {
    console.warn('Bundle analyzer not available. Run: npm install rollup-plugin-visualizer');
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  root: '.',
  plugins: [
    react({
      // React Fast Refresh はデフォルトで有効
      babel: {
        plugins: [],
      },
    }),
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 1024, // 1KB以上のファイルのみ圧縮
    }),
    viteCompression({
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 1024,
    }),
    // バンドル分析ツール（analyze modeでのみ有効）
    ...(mode === 'analyze' ? [
      (() => {
        try {
          // @ts-ignore
          const { visualizer } = require('rollup-plugin-visualizer');
          return visualizer({
            filename: 'dist/stats.html',
            open: true,
            gzipSize: true,
            brotliSize: true,
            template: 'treemap', // 'sunburst', 'treemap', 'network'
          });
        } catch (e) {
          console.warn('Bundle analyzer not available. Run: npm install rollup-plugin-visualizer');
          return null;
        }
      })()
    ].filter(Boolean) : []),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@/components': resolve(__dirname, './src/components'),
      '@/pages': resolve(__dirname, './src/pages'),
      '@/utils': resolve(__dirname, './src/utils'),
      '@/hooks': resolve(__dirname, './src/hooks'),
      '@/types': resolve(__dirname, './src/types'),
      '@/context': resolve(__dirname, './src/context'),
    },
  },
  // Netlify Supabase Extension 対応の環境変数設定
  define: {
    // 本番環境で Netlify Extension の環境変数を VITE_ プレフィックス付きで使用可能にする
    ...(process.env.NODE_ENV === 'production' && {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(
        process.env.VITE_SUPABASE_URL || 
        process.env.SUPABASE_DATABASE_URL || 
        ''
      ),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(
        process.env.VITE_SUPABASE_ANON_KEY || 
        process.env.SUPABASE_ANON_KEY || 
        ''
      ),
      'import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY': JSON.stringify(
        process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 
        process.env.SUPABASE_SERVICE_ROLE_KEY || 
        ''
      ),
      'import.meta.env.VITE_SUPABASE_JWT_SECRET': JSON.stringify(
        process.env.VITE_SUPABASE_JWT_SECRET || 
        process.env.SUPABASE_JWT_SECRET || 
        ''
      ),
    }),
  },
  build: {
    outDir: 'dist',
    sourcemap: process.env.NODE_ENV === 'development',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.warn'],
      },
      mangle: {
        safari10: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          // コアライブラリ
          vendor: ['react', 'react-dom'],
          // ルーター
          router: ['react-router-dom'],
          // Supabase関連
          supabase: ['@supabase/supabase-js'],
          // UI関連
          ui: ['lucide-react'],
          // Stripe関連
          stripe: ['@stripe/stripe-js'],
        },
        // ファイル名のハッシュ化
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',
      },
    },
    chunkSizeWarningLimit: 600,
    target: 'es2015',
    cssCodeSplit: true,
    assetsDir: 'assets',
    copyPublicDir: true,
  },
  server: {
    port: 3000,
    open: true,
    hmr: {
      overlay: false,
    },
    headers: {
      'Service-Worker-Allowed': '/',
    },
  },
  // 開発環境での最適化
  optimizeDeps: {
    include: [
      '@supabase/supabase-js',
      'react',
      'react-dom',
      'react-router-dom',
      'lucide-react',
      'react-helmet-async',
    ],
    exclude: ['@vite/client', '@vite/env'],
  },
  // プレビュー設定
  preview: {
    port: 3001,
    host: true,
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
  },
  // SSR 最適化
  ssr: {
    noExternal: ['react', 'react-dom'],
  },
}));