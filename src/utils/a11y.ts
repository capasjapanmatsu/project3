/**
 * アクセシビリティ改善用のユーティリティ関数とコンポーネント
 */

// WCAG 2.1 AAレベルの最小コントラスト比
export const WCAG_CONTRAST_RATIOS = {
  // 通常テキスト（16px未満）
  normalText: 4.5,
  // 大きなテキスト（18px以上、または14px以上の太字）
  largeText: 3.0,
  // UIコンポーネントやグラフィカル要素
  uiComponent: 3.0,
} as const;

/**
 * 視覚的に隠すが、スクリーンリーダーには読み上げられるCSSクラス
 */
export const visuallyHiddenStyle = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: '0',
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  borderWidth: '0',
} as const;

/**
 * フォーカス時のアウトラインスタイル（キーボード操作対応）
 */
export const focusRingStyle = 'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2';

/**
 * アクセシブルなボタンのデフォルトprops
 */
export interface AccessibleButtonProps {
  'aria-label'?: string;
  'aria-pressed'?: boolean;
  'aria-expanded'?: boolean;
  'aria-haspopup'?: boolean | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog';
  'aria-controls'?: string;
  'aria-describedby'?: string;
  role?: string;
  tabIndex?: number;
}

/**
 * 画像のalt属性生成ヘルパー
 */
export const generateImageAlt = (
  type: 'user' | 'dog' | 'park' | 'facility' | 'product' | 'logo' | 'icon' | 'decoration',
  name?: string,
  index?: number
): string => {
  switch (type) {
    case 'user':
      return name ? `${name}さんのプロフィール画像` : 'ユーザーのプロフィール画像';
    case 'dog':
      return name ? `${name}の写真` : 'ワンちゃんの写真';
    case 'park':
      return name ? `${name}の施設画像` : `ドッグラン施設画像${index ? ` ${index}` : ''}`;
    case 'facility':
      return name ? `${name}の施設画像` : `施設画像${index ? ` ${index}` : ''}`;
    case 'product':
      return name ? `${name}の商品画像` : `商品画像${index ? ` ${index}` : ''}`;
    case 'logo':
      return 'ドッグパークJPのロゴ';
    case 'icon':
      return ''; // 装飾的なアイコンの場合は空のalt
    case 'decoration':
      return ''; // 装飾的な画像の場合は空のalt
    default:
      return '画像';
  }
};

/**
 * アイコンボタンのaria-label生成ヘルパー
 */
export const generateIconButtonLabel = (
  action: 'close' | 'menu' | 'edit' | 'delete' | 'add' | 'search' | 'filter' | 'share' | 'like' | 'bookmark' | 'settings' | 'logout' | 'back' | 'next' | 'previous',
  target?: string
): string => {
  const labels: Record<typeof action, string> = {
    close: '閉じる',
    menu: 'メニューを開く',
    edit: '編集',
    delete: '削除',
    add: '追加',
    search: '検索',
    filter: 'フィルター',
    share: '共有',
    like: 'いいね',
    bookmark: 'ブックマーク',
    settings: '設定',
    logout: 'ログアウト',
    back: '戻る',
    next: '次へ',
    previous: '前へ',
  };

  const baseLabel = labels[action];
  return target ? `${target}を${baseLabel}` : baseLabel;
};

/**
 * スキップリンクコンポーネント用のリンク生成
 */
export const skipLinks = [
  { href: '#main-content', label: 'メインコンテンツへスキップ' },
  { href: '#navigation', label: 'ナビゲーションへスキップ' },
  { href: '#search', label: '検索へスキップ' },
] as const;

/**
 * フォームフィールドのアクセシビリティprops
 */
export interface AccessibleFormFieldProps {
  id: string;
  name: string;
  'aria-required'?: boolean;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
  'aria-errormessage'?: string;
}

/**
 * ライブリージョンの設定
 */
export type AriaLiveValue = 'off' | 'polite' | 'assertive';

/**
 * ロール属性の型定義
 */
export type AriaRole = 
  | 'alert'
  | 'alertdialog'
  | 'button'
  | 'checkbox'
  | 'dialog'
  | 'gridcell'
  | 'link'
  | 'log'
  | 'marquee'
  | 'menuitem'
  | 'menuitemcheckbox'
  | 'menuitemradio'
  | 'navigation'
  | 'option'
  | 'progressbar'
  | 'radio'
  | 'scrollbar'
  | 'searchbox'
  | 'slider'
  | 'spinbutton'
  | 'status'
  | 'switch'
  | 'tab'
  | 'tabpanel'
  | 'textbox'
  | 'timer'
  | 'tooltip'
  | 'treeitem'
  | 'combobox'
  | 'grid'
  | 'listbox'
  | 'menu'
  | 'menubar'
  | 'radiogroup'
  | 'tablist'
  | 'tree'
  | 'treegrid'
  | 'article'
  | 'columnheader'
  | 'definition'
  | 'directory'
  | 'document'
  | 'group'
  | 'heading'
  | 'img'
  | 'list'
  | 'listitem'
  | 'math'
  | 'note'
  | 'presentation'
  | 'region'
  | 'row'
  | 'rowgroup'
  | 'rowheader'
  | 'separator'
  | 'toolbar'
  | 'banner'
  | 'complementary'
  | 'contentinfo'
  | 'form'
  | 'main'
  | 'search'
  | 'application';

/**
 * カラーコントラスト計算（簡易版）
 * より正確な計算が必要な場合は、専用ライブラリの使用を推奨
 */
export const calculateContrastRatio = (foreground: string, background: string): number => {
  // RGB値を取得（#RRGGBB形式を想定）
  const getRGB = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  const getLuminance = (r: number, g: number, b: number) => {
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };

  const fg = getRGB(foreground);
  const bg = getRGB(background);

  if (!fg || !bg) return 0;

  const l1 = getLuminance(fg.r, fg.g, fg.b);
  const l2 = getLuminance(bg.r, bg.g, bg.b);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
};

/**
 * 適切な見出しレベルを返すヘルパー
 */
export const getHeadingLevel = (depth: number): 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' => {
  const level = Math.min(Math.max(1, depth), 6);
  return `h${level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
};

/**
 * キーボードナビゲーション用のヘルパー
 */
export const handleArrowKeyNavigation = (
  event: React.KeyboardEvent,
  currentIndex: number,
  totalItems: number,
  onNavigate: (newIndex: number) => void
) => {
  switch (event.key) {
    case 'ArrowUp':
    case 'ArrowLeft':
      event.preventDefault();
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : totalItems - 1;
      onNavigate(prevIndex);
      break;
    case 'ArrowDown':
    case 'ArrowRight':
      event.preventDefault();
      const nextIndex = currentIndex < totalItems - 1 ? currentIndex + 1 : 0;
      onNavigate(nextIndex);
      break;
    case 'Home':
      event.preventDefault();
      onNavigate(0);
      break;
    case 'End':
      event.preventDefault();
      onNavigate(totalItems - 1);
      break;
  }
};
