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
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname, location.search, location.hash, location.key]);

  return null;
}