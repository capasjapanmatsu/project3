import { ComponentType, LazyExoticComponent, lazy } from 'react';

/**
 * 遅延読み込みのためのユーティリティ関数
 * エラーハンドリングとリトライ機能付き
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>,
  retries = 3,
  delay = 1000
): LazyExoticComponent<T> {
  return lazy(async () => {
    let lastError: any;
    
    for (let i = 0; i < retries; i++) {
      try {
        return await componentImport();
      } catch (error) {
        lastError = error;
        console.warn(`Failed to load component (attempt ${i + 1}/${retries}):`, error);
        
        if (i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
        }
      }
    }
    
    // すべてのリトライが失敗した場合
    console.error('Failed to load component after all retries:', lastError);
    throw lastError;
  });
}

/**
 * 条件付き遅延読み込み
 * 特定の条件が満たされた場合のみコンポーネントを読み込む
 */
export function conditionalLazy<T extends ComponentType<any>>(
  condition: () => boolean,
  componentImport: () => Promise<{ default: T }>,
  fallback?: T
): LazyExoticComponent<T> | T {
  if (condition()) {
    return lazyWithRetry(componentImport);
  }
  
  if (fallback) {
    return fallback;
  }
  
  // フォールバックがない場合は空のコンポーネントを返す
  return (() => null) as T;
}

/**
 * プリロード機能付き遅延読み込み
 * ユーザーのインタラクション前にコンポーネントをプリロード
 */
export function lazyWithPreload<T extends ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>
): LazyExoticComponent<T> & { preload: () => Promise<void> } {
  const Component = lazyWithRetry(componentImport);
  
  // プリロード関数を追加
  (Component as any).preload = async () => {
    try {
      await componentImport();
    } catch (error) {
      console.warn('Failed to preload component:', error);
    }
  };
  
  return Component as LazyExoticComponent<T> & { preload: () => Promise<void> };
}

/**
 * 大きなライブラリの動的インポート
 */
export const loadGoogleMaps = () => import('@googlemaps/js-api-loader');
export const loadStripe = () => import('@stripe/stripe-js');
export const loadFramerMotion = () => import('framer-motion');
export const loadQRCode = () => import('qrcode.react');
export const loadImageCrop = () => import('react-image-crop');
export const loadDateFns = () => import('date-fns');
export const loadBrowserImageCompression = () => import('browser-image-compression');

/**
 * 重いコンポーネントのプリロード
 * ユーザーが特定のページに移動する前に事前読み込み
 */
export const preloadHeavyComponents = () => {
  // 地図関連
  if (window.location.pathname.includes('map')) {
    loadGoogleMaps();
  }
  
  // 決済関連
  if (window.location.pathname.includes('payment') || 
      window.location.pathname.includes('subscription')) {
    loadStripe();
  }
  
  // 画像編集関連
  if (window.location.pathname.includes('profile') || 
      window.location.pathname.includes('edit')) {
    loadImageCrop();
    loadBrowserImageCompression();
  }
};

/**
 * IntersectionObserverを使った遅延読み込み
 * スクロールして要素が表示領域に入ったときにコンポーネントを読み込む
 */
export function lazyOnVisible<T extends ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>,
  options?: IntersectionObserverInit
): LazyExoticComponent<T> {
  return lazy(async () => {
    // IntersectionObserverがサポートされていない場合は即座に読み込む
    if (!('IntersectionObserver' in window)) {
      return componentImport();
    }
    
    return new Promise((resolve) => {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              observer.disconnect();
              componentImport().then(resolve);
            }
          });
        },
        options || { rootMargin: '100px' }
      );
      
      // ダミー要素を監視
      const element = document.createElement('div');
      document.body.appendChild(element);
      observer.observe(element);
      
      // クリーンアップ
      setTimeout(() => {
        document.body.removeChild(element);
      }, 0);
    });
  });
}

/**
 * リソースヒントの追加
 * 重要なリソースを事前に接続・プリフェッチ
 */
export function addResourceHints() {
  // Supabase API
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (supabaseUrl) {
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = new URL(supabaseUrl).origin;
    document.head.appendChild(link);
  }
  
  // Google Fonts
  const googleFontsPreconnect = document.createElement('link');
  googleFontsPreconnect.rel = 'preconnect';
  googleFontsPreconnect.href = 'https://fonts.googleapis.com';
  document.head.appendChild(googleFontsPreconnect);
  
  const googleFontsDns = document.createElement('link');
  googleFontsDns.rel = 'dns-prefetch';
  googleFontsDns.href = 'https://fonts.gstatic.com';
  document.head.appendChild(googleFontsDns);
  
  // Stripe
  if (window.location.pathname.includes('payment')) {
    const stripePreconnect = document.createElement('link');
    stripePreconnect.rel = 'preconnect';
    stripePreconnect.href = 'https://js.stripe.com';
    document.head.appendChild(stripePreconnect);
  }
}
