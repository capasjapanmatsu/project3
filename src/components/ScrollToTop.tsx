import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTop() {
  const location = useLocation();

  // ブラウザのスクロール位置復元を無効化（戻る/進む含む）
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      const prev = window.history.scrollRestoration;
      try { window.history.scrollRestoration = 'manual'; } catch {}
      return () => {
        try { window.history.scrollRestoration = prev as any; } catch {}
      };
    }
  }, []);

  useEffect(() => {
    // ルート変更時は常に最上部へ
    // 1) ウィンドウ自体
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    // 2) レイアウト内のスクロールコンテナ（存在する場合）
    const main = document.getElementById('main-content');
    if (main && typeof (main as any).scrollTo === 'function') {
      (main as any).scrollTo({ top: 0, left: 0, behavior: 'auto' });
    } else if (main) {
      (main as any).scrollTop = 0;
      (main as any).scrollLeft = 0;
    }
    // 3) ブラウザ依存でのフォールバック
    const se = (document as any).scrollingElement as HTMLElement | undefined;
    if (se) {
      se.scrollTop = 0;
      se.scrollLeft = 0;
    }
  }, [location.pathname, location.search, location.hash, location.key]);

  return null;
}