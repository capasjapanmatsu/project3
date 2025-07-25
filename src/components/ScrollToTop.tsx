import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // ページ遷移時にスクロール位置をトップにリセット
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
} 