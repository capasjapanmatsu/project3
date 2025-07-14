import { useState, useEffect, useMemo } from 'react';

export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface BreakpointValues {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  '2xl': number;
}

// Tailwind CSSのデフォルトブレークポイント
const defaultBreakpoints: BreakpointValues = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

export function useResponsive(customBreakpoints?: Partial<BreakpointValues>) {
  // useMemoを使用してbreakpointsオブジェクトの参照を安定させる
  const breakpoints = useMemo(() => ({ 
    ...defaultBreakpoints, 
    ...customBreakpoints 
  }), [customBreakpoints]);
  
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
  });

  const [currentBreakpoint, setCurrentBreakpoint] = useState<Breakpoint>('md');

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setWindowSize({
        width,
        height: window.innerHeight,
      });

      // 現在のブレークポイントを特定
      if (width >= breakpoints['2xl']) {
        setCurrentBreakpoint('2xl');
      } else if (width >= breakpoints.xl) {
        setCurrentBreakpoint('xl');
      } else if (width >= breakpoints.lg) {
        setCurrentBreakpoint('lg');
      } else if (width >= breakpoints.md) {
        setCurrentBreakpoint('md');
      } else if (width >= breakpoints.sm) {
        setCurrentBreakpoint('sm');
      } else {
        setCurrentBreakpoint('xs');
      }
    };

    // 初期化
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []); // 空の依存配列にして初回のみ実行

  // 特定のブレークポイント以上かどうかを判定
  const isAbove = (breakpoint: Breakpoint): boolean => {
    return windowSize.width >= breakpoints[breakpoint];
  };

  // 特定のブレークポイント以下かどうかを判定
  const isBelow = (breakpoint: Breakpoint): boolean => {
    return windowSize.width < breakpoints[breakpoint];
  };

  // 特定のブレークポイントの範囲内かどうかを判定
  const isBetween = (min: Breakpoint, max: Breakpoint): boolean => {
    return windowSize.width >= breakpoints[min] && windowSize.width < breakpoints[max];
  };

  // デバイスタイプの判定
  const isMobile = isBelow('md');
  const isTablet = isBetween('md', 'lg');
  const isDesktop = isAbove('lg');

  // タッチデバイスの判定
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  // プリファードリデュースモーション
  const prefersReducedMotion = typeof window !== 'undefined' 
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches 
    : false;

  // ダークモードの設定
  const prefersDarkMode = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : false;

  return {
    windowSize,
    currentBreakpoint,
    breakpoints,
    isAbove,
    isBelow,
    isBetween,
    isMobile,
    isTablet,
    isDesktop,
    isTouchDevice,
    prefersReducedMotion,
    prefersDarkMode,
  };
}

// レスポンシブな値を返すヘルパー
export function useResponsiveValue<T>(
  values: Partial<Record<Breakpoint, T>>,
  defaultValue: T
): T {
  const { currentBreakpoint, breakpoints } = useResponsive();
  
  // 現在のブレークポイント以下で最も大きいブレークポイントの値を取得
  const breakpointKeys: Breakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];
  const currentIndex = breakpointKeys.indexOf(currentBreakpoint);
  
  for (let i = currentIndex; i >= 0; i--) {
    const breakpoint = breakpointKeys[i];
    if (breakpoint && values[breakpoint] !== undefined) {
      return values[breakpoint]!;
    }
  }
  
  return defaultValue;
}

// レスポンシブなグリッドカラムを計算
export function useResponsiveGrid(
  columns: Partial<Record<Breakpoint, number>>,
  defaultColumns = 1
): {
  gridColumns: number;
  gridClass: string;
} {
  const gridColumns = useResponsiveValue(columns, defaultColumns);
  const gridClass = `grid-cols-${gridColumns}`;
  
  return { gridColumns, gridClass };
}

// レスポンシブなスペーシングを計算
export function useResponsiveSpacing(
  spacing: Partial<Record<Breakpoint, string>>,
  defaultSpacing = '4'
): string {
  const { currentBreakpoint } = useResponsive();
  
  const breakpointKeys: Breakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];
  const currentIndex = breakpointKeys.indexOf(currentBreakpoint);
  
  for (let i = currentIndex; i >= 0; i--) {
    const breakpoint = breakpointKeys[i];
    if (breakpoint && spacing[breakpoint] !== undefined) {
      return spacing[breakpoint]!;
    }
  }
  
  return defaultSpacing;
} 