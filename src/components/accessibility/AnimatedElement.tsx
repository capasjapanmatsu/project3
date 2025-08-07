import React, { useEffect, useState } from 'react';

interface AnimatedElementProps {
  children: React.ReactNode;
  className?: string;
  animation?: 'fade' | 'slide' | 'scale' | 'none';
  duration?: number;
  delay?: number;
  as?: React.ElementType;
}

/**
 * アクセシブルなアニメーション要素
 * prefers-reduced-motionを考慮してアニメーションを制御
 */
export const AnimatedElement: React.FC<AnimatedElementProps> = ({
  children,
  className = '',
  animation = 'fade',
  duration = 300,
  delay = 0,
  as: Component = 'div',
}) => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // ユーザーのモーション設定を確認
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    
    // アニメーション開始
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
      clearTimeout(timer);
    };
  }, [delay]);

  // モーションを減らす設定の場合はアニメーションなし
  if (prefersReducedMotion) {
    return <Component className={className}>{children}</Component>;
  }

  // アニメーションクラスの定義
  const animationClasses = {
    fade: {
      initial: 'opacity-0',
      animate: 'opacity-100',
    },
    slide: {
      initial: 'transform translate-y-4 opacity-0',
      animate: 'transform translate-y-0 opacity-100',
    },
    scale: {
      initial: 'transform scale-95 opacity-0',
      animate: 'transform scale-100 opacity-100',
    },
    none: {
      initial: '',
      animate: '',
    },
  };

  const transitionStyle = {
    transition: `all ${duration}ms ease-out`,
  };

  const animationClass = isVisible
    ? animationClasses[animation].animate
    : animationClasses[animation].initial;

  return (
    <Component
      className={`${className} ${animationClass}`}
      style={transitionStyle}
    >
      {children}
    </Component>
  );
};

/**
 * フォーカストラップコンポーネント
 * モーダルやダイアログ内でフォーカスをトラップする
 */
export const FocusTrap: React.FC<{
  children: React.ReactNode;
  active?: boolean;
  returnFocus?: boolean;
}> = ({ children, active = true, returnFocus = true }) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const previousFocusRef = React.useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;

    // 現在のフォーカスを保存
    if (returnFocus) {
      previousFocusRef.current = document.activeElement as HTMLElement;
    }

    const container = containerRef.current;
    if (!container) return;

    // フォーカス可能な要素を取得
    const getFocusableElements = () => {
      const focusableSelectors = [
        'a[href]',
        'button:not([disabled])',
        'textarea:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
      ].join(',');

      return Array.from(
        container.querySelectorAll<HTMLElement>(focusableSelectors)
      ).filter((el) => el.offsetParent !== null);
    };

    // キーボードイベントハンドラ
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (e.shiftKey) {
        // Shift + Tab
        if (activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab
        if (activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    // ESCキーでフォーカスを元に戻す
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && returnFocus && previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };

    // 最初の要素にフォーカス
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    container.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keydown', handleEscape);
      
      // フォーカスを元に戻す
      if (returnFocus && previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, [active, returnFocus]);

  if (!active) {
    return <>{children}</>;
  }

  return (
    <div ref={containerRef} tabIndex={-1}>
      {children}
    </div>
  );
};

export default AnimatedElement;