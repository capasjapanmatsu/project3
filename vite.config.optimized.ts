import react from '@vitejs/plugin-react';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig } from 'vite';
import compression from 'vite-plugin-compression';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      // React Fast Refreshの最適化
      fastRefresh: true,
      // Babelプラグインでコンソールログを削除（プロダクションのみ）
      babel: {
        plugins: process.env.NODE_ENV === 'production' ? [
          ['transform-remove-console', { exclude: ['error', 'warn'] }],
          'transform-remove-debugger'
        ] : []
      }
    }),
    
    // PWA設定
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024, // 3MB
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/[^.]+\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-cache',
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 1週間
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1年
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /\.(png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30日
              },
            },
          },
        ],
      },
      manifest: {
        name: 'ドッグパーク JP',
        short_name: 'DogParkJP',
        description: '愛犬との素敵な時間を',
        theme_color: '#4F46E5',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon_192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icons/icon_512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    }),
    
    // Gzip圧縮
    compression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 10240, // 10KB以上のファイルを圧縮
      deleteOriginFile: false,
    }),
    
    // Brotli圧縮
    compression({
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 10240,
      deleteOriginFile: false,
    }),
    
    // バンドル分析（開発時のみ）
    process.env.ANALYZE && visualizer({
      template: 'treemap',
      open: true,
      gzipSize: true,
      brotliSize: true,
      filename: 'bundle-analysis.html',
    })
  ].filter(Boolean),
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  
  build: {
    // ビルド最適化設定
    target: 'es2020',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
      },
    },
    
    // チャンクサイズ警告の閾値
    chunkSizeWarningLimit: 1000, // 1MB
    
    // ソースマップ（プロダクションでは無効化）
    sourcemap: process.env.NODE_ENV !== 'production',
    
    // Rollupオプション
    rollupOptions: {
      output: {
        // より細かいチャンク分割
        manualChunks: (id) => {
          // node_modulesの処理
          if (id.includes('node_modules')) {
            // React関連
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'react-vendor';
            }
            // Supabase
            if (id.includes('@supabase')) {
              return 'supabase-vendor';
            }
            // Capacitor（モバイル機能）
            if (id.includes('@capacitor')) {
              return 'capacitor-vendor';
            }
            // フォーム関連
            if (id.includes('react-hook-form') || id.includes('@hookform') || id.includes('zod')) {
              return 'forms-vendor';
            }
            // UI関連
            if (id.includes('lucide-react') || id.includes('framer-motion')) {
              return 'ui-vendor';
            }
            // 地図関連
            if (id.includes('@googlemaps')) {
              return 'maps-vendor';
            }
            // 決済関連
            if (id.includes('@stripe')) {
              return 'payment-vendor';
            }
            // ユーティリティ
            if (id.includes('date-fns') || id.includes('browser-image-compression')) {
              return 'utils-vendor';
            }
            // その他の小さなライブラリ
            return 'misc-vendor';
          }
          
          // アプリケーションコードの分割
          if (id.includes('/src/')) {
            // 管理者機能
            if (id.includes('/admin/') || id.includes('Admin')) {
              return 'admin';
            }
            // ドッグラン機能
            if (id.includes('/park/') || id.includes('Park') || id.includes('DogPark')) {
              return 'parks';
            }
            // 決済機能
            if (id.includes('/payment/') || id.includes('Payment') || id.includes('Subscription')) {
              return 'payment';
            }
            // 共通コンポーネント
            if (id.includes('/components/')) {
              return 'components';
            }
            // ページコンポーネント
            if (id.includes('/pages/')) {
              return 'pages';
            }
          }
        },
        
        // アセット名の設定
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `assets/images/[name]-[hash][extname]`;
          } else if (/woff|woff2|eot|ttf|otf/i.test(ext)) {
            return `assets/fonts/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
        
        // チャンクファイル名
        chunkFileNames: 'js/[name]-[hash].js',
        
        // エントリーファイル名
        entryFileNames: 'js/[name]-[hash].js',
      },
    },
  },
  
  // 開発サーバー設定
  server: {
    port: 5173,
    host: true,
    open: true,
  },
  
  // 最適化設定
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@supabase/supabase-js',
      'lucide-react',
    ],
    exclude: [
      '@capacitor/core',
      '@capacitor/app',
    ],
  },
});
