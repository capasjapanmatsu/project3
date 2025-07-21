import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { defineConfig } from 'vite';
import viteCompression from 'vite-plugin-compression';

// パフォーマンス監視用の設定
const PERFORMANCE_THRESHOLD_MS = 500;

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      // 開発時のランタイムエラー表示強化
      jsxRuntime: 'automatic',
    }),
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 1024,
    }),
    // カスタムプラグイン：ビルド時間監視
    {
      name: 'performance-monitor',
      buildStart() {
        (this as any).buildStartTime = Date.now();
      },
      buildEnd() {
        const buildTime = Date.now() - (this as any).buildStartTime;
        if (buildTime > PERFORMANCE_THRESHOLD_MS) {
          console.warn(`⚠️  ビルド時間警告: ${buildTime}ms (閾値: ${PERFORMANCE_THRESHOLD_MS}ms)`);
          console.log(`📊 最適化案:\n- 不要な依存関係の削除\n- Code Splittingの検討\n- Tree Shakingの確認`);
        }
      },
    },
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
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    assetsDir: 'assets',
    copyPublicDir: true,
    // チャンク分割最適化
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'supabase-vendor': ['@supabase/supabase-js'],
          'ui-vendor': ['lucide-react', 'react-helmet-async'],
        },
      },
    },
    // ソースマップを開発時のみ有効化
    sourcemap: process.env.NODE_ENV === 'development',
  },
  server: {
    port: 3000,
    open: true,
    hmr: {
      overlay: true,
      port: 3001, // HMR専用ポート
    },
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@supabase/supabase-js',
      'lucide-react',
      'react-helmet-async'
    ],
    // 事前バンドリング設定
    force: process.env.NODE_ENV === 'development',
  },
  // より詳細なログ設定（トップレベル）
  logLevel: 'info',
  clearScreen: false, // ログを消去しない
});