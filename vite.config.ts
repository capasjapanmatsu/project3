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
        plugins: [
          // バンドルサイズを減らすための最適化は本番環境でのみ有効
          ...(mode === 'production' ? [] : []),
        ],
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
            template: 'treemap',
          });
        } catch (e) {
          console.warn('Bundle analyzer not available');
          return null;
        }
      })()
    ].filter(Boolean) : []),
  ],

  // 開発サーバー設定
  server: {
    port: 3000,
    host: true,
    // HMRの最適化
    hmr: {
      overlay: false,
    },
    // プリロード設定
    warmup: {
      clientFiles: [
        './src/pages/Home.tsx',
        './src/pages/Login.tsx',
        './src/pages/Register.tsx',
        './src/pages/UserDashboard.tsx'
      ]
    }
  },

  // プレビュー設定
  preview: {
    port: 4173,
    host: true,
  },

  // ビルド最適化
  build: {
    // パフォーマンス改善のためのソースマップ無効化（本番環境）
    sourcemap: mode === 'development',

    // チャンクサイズ警告の閾値
    chunkSizeWarningLimit: 1000,

    // Rollup設定
    rollupOptions: {
      // 外部依存関係の最適化
      external: [
        // 大きなライブラリは外部CDNから読み込む場合に使用
        // 'react',
        // 'react-dom',
      ],

      output: {
        // チャンク分割の最適化
        manualChunks: {
          // React関連
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],

          // UI関連
          'ui-vendor': ['framer-motion', 'lucide-react'],

          // Supabase関連
          'supabase-vendor': ['@supabase/supabase-js'],

          // Stripe関連
          'stripe-vendor': ['@stripe/stripe-js'],

          // Maps関連
          'maps-vendor': ['@googlemaps/js-api-loader'],

          // 画像処理関連
          'image-vendor': ['browser-image-compression'],

          // Admin関連（大きなコンポーネント）
          'admin-pages': [
            './src/pages/AdminDashboard.tsx',
            './src/pages/AdminParkManagement.tsx',
            './src/pages/AdminVaccineApproval.tsx',
            './src/pages/AdminFacilityApproval.tsx',
          ],

          // Park関連
          'park-pages': [
            './src/pages/DogParkList.tsx',
            './src/pages/DogParkDetail.tsx',
            './src/pages/ParkReservation.tsx',
          ],

          // Shop関連
          'shop-pages': [
            './src/pages/PetShop.tsx',
            './src/pages/Cart.tsx',
            './src/pages/Checkout.tsx',
          ],
        },

        // ファイル名の最適化
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',
      },
    },

    // 最適化設定
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: mode === 'production',
        drop_debugger: mode === 'production',
        pure_funcs: mode === 'production' ? ['console.log'] : [],
      },
    },

    // CSS最適化
    cssCodeSplit: true,

    // 並列処理でビルド高速化
    reportCompressedSize: false,
  },

  // 依存関係の最適化
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@supabase/supabase-js',
      'lucide-react',
    ],
    exclude: [
      // 大きなライブラリで動的インポートを優先するもの
      '@googlemaps/js-api-loader',
      'browser-image-compression',
    ],
  },

  // パフォーマンス設定
  experimental: {
    // 新しいパフォーマンス最適化機能
    renderBuiltUrl: (filename: string) => {
      // CDN使用時の設定例
      return filename;
    },
  },

  // 型定義
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@components': resolve(__dirname, './src/components'),
      '@pages': resolve(__dirname, './src/pages'),
      '@utils': resolve(__dirname, './src/utils'),
      '@hooks': resolve(__dirname, './src/hooks'),
      '@types': resolve(__dirname, './src/types'),
    },
  },
}));