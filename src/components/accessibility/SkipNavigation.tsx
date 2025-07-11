import { useEffect, useState } from 'react';

interface SkipLinkItem {
  href: string;
  label: string;
}

interface SkipNavigationProps {
  links?: SkipLinkItem[];
  className?: string;
}

const defaultLinks: SkipLinkItem[] = [
  { href: '#main-content', label: 'メインコンテンツにスキップ' },
  { href: '#navigation', label: 'ナビゲーションにスキップ' },
  { href: '#footer', label: 'フッターにスキップ' },
];

export const SkipNavigation: React.FC<SkipNavigationProps> = ({
  links = defaultLinks,
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(false);

  // Escapeキーでスキップリンクを非表示にする
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isVisible) {
        setIsVisible(false);
        // フォーカスを最初の要素に戻す
        const firstFocusable = document.querySelector(
          'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select'
        ) as HTMLElement;
        firstFocusable?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isVisible]);

  const handleFocus = () => setIsVisible(true);
  const handleBlur = () => setIsVisible(false);

  const handleClick = (href: string) => {
    const target = document.querySelector(href);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // フォーカス可能な要素にフォーカスを移動
      const focusableElement = target.querySelector(
        'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])'
      ) as HTMLElement;
      
      if (focusableElement) {
        focusableElement.focus();
      } else {
        // tabindex="-1"を一時的に追加してフォーカス可能にする
        (target as HTMLElement).tabIndex = -1;
        (target as HTMLElement).focus();
        (target as HTMLElement).style.outline = 'none';
      }
    }
    setIsVisible(false);
  };

  return (
    <nav
      className={`skip-navigation fixed top-0 left-0 z-[9999] ${className}`}
      aria-label="スキップナビゲーション"
    >
      <ul className="flex flex-col">
        {links.map((link, index) => (
          <li key={link.href}>
            <a
              href={link.href}
              className={`
                inline-block px-4 py-2 bg-blue-700 text-white font-medium text-sm
                transform transition-transform duration-200 border border-blue-800
                focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-700
                ${isVisible 
                  ? 'translate-y-0 opacity-100' 
                  : '-translate-y-full opacity-0 sr-only focus:not-sr-only focus:translate-y-0 focus:opacity-100'
                }
              `}
              onFocus={handleFocus}
              onBlur={handleBlur}
              onClick={(e) => {
                e.preventDefault();
                handleClick(link.href);
              }}
              tabIndex={0}
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
      
      {/* 使用方法の説明 */}
      <div className="sr-only">
        <p>
          このページのスキップリンクです。Tabキーでアクセスし、Enterキーで移動できます。
          Escapeキーでスキップリンクを閉じることができます。
        </p>
      </div>
    </nav>
  );
};

// ページのランドマーク要素に適切なIDを設定するためのヘルパー
export const withSkipNavigation = (Component: React.ComponentType) => {
  return function SkipNavigationWrapper(props: any) {
    return (
      <>
        <SkipNavigation />
        <Component {...props} />
      </>
    );
  };
};

export default SkipNavigation; 