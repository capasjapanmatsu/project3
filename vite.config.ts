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
    // 追加：Brotli圧縮（より高効率）
    viteCompression({
      algorithm: 'brotliCompress',
      ext: '.br',
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
    // さらに積極的な最適化
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // console.log削除（プロダクション）
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info'], // 特定関数削除
      },
    },
    // 最適化されたチャンク分割戦略（修正版）
    rollupOptions: {
      output: {
        manualChunks: {
          // 1. 最小限のReact核心部分（初期ロード必須）
          'react-vendor': [
            'react', 
            'react-dom'
          ],
          
          // 2. ルーティング（ページ遷移時）
          'router': [
            'react-router-dom'
          ],
          
          // 3. データベース（認証・データアクセス時）
          'supabase': [
            '@supabase/supabase-js'
          ],
          
          // 4. UI基本ライブラリ（表示時）
          'ui-basic': [
            'lucide-react',
            'react-helmet-async'
          ],
          
          // 5. フォーム関連（フォームページ時）
          'forms': [
            'react-hook-form',
            '@hookform/resolvers',
            'zod'
          ],
          
          // 6. アニメーション・日付（使用ページ時）
          'motion': [
            'framer-motion',
            'date-fns'
          ],
          
          // 7. 外部API（機能使用時）
          'external-api': [
            '@stripe/stripe-js',
            '@googlemaps/js-api-loader'
          ],
          
          // 8. 重い機能ライブラリ（機能使用時）
          'heavy-features': [
            'browser-image-compression',
            'qrcode.react',
            '@tanstack/react-query'
          ]
        },
        // チャンクファイル名最適化
        chunkFileNames: 'assets/js/[name]-[hash].js',
        // エントリーファイル名
        entryFileNames: 'assets/js/[name]-[hash].js',
        // アセット命名最適化
        assetFileNames: (assetInfo) => {
          const extType = assetInfo.name?.split('.').at(1);
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType || '')) {
            return `assets/images/[name]-[hash][extname]`;
          }
          if (/css/i.test(extType || '')) {
            return `assets/css/[name]-[hash][extname]`;
          }
          if (/woff2?|eot|ttf|otf/i.test(extType || '')) {
            return `assets/fonts/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
      },
    },
    // ソースマップを開発時のみ有効化
    sourcemap: process.env.NODE_ENV === 'development',
    // 静的アセット処理の最適化
    assetsInlineLimit: 4096, // 4KB以下をインライン化
    // チャンクサイズ警告の閾値を調整
    chunkSizeWarningLimit: 1000, // 1MBまで警告を抑制
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
      // 初期ロードに必要な依存関係のみ事前バンドル
      'react',
      'react-dom',
      'react-router-dom',
      '@supabase/supabase-js',
      'lucide-react'
    ],
    // 除外対象（開発時のみ必要 + モバイル機能）
    exclude: [
      '@tanstack/react-query-devtools',
      // Capacitorモジュールは全て除外（Webアプリでは不要）
      '@capacitor/core',
      '@capacitor/android',
      '@capacitor/camera',
      '@capacitor/geolocation',
      '@capacitor/haptics',
      '@capacitor/local-notifications',
      '@capacitor/push-notifications'
    ],
    // 事前バンドリング設定
    force: process.env.NODE_ENV === 'development',
  },
  // Tree Shaking強化
  define: {
    // 開発時のみ有効な機能を無効化
    __DEV__: process.env.NODE_ENV === 'development',
    // React Query Devtoolsを本番では無効化
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
  },
  // より詳細なログ設定（トップレベル）
  logLevel: 'info',
  clearScreen: false, // ログを消去しない
});