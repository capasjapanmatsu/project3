/**
 * フォント最適化ユーティリティ
 * Google Fonts、ローカルフォントの最適化、フォントサブセット化
 */

interface FontOptimizationOptions {
  preload?: boolean;
  display?: 'auto' | 'block' | 'swap' | 'fallback' | 'optional';
  subsets?: string[];
  weights?: (string | number)[];
  formats?: ('woff2' | 'woff' | 'ttf')[];
}

interface LocalFontOptions {
  family: string;
  src: string;
  weight?: string | number;
  style?: 'normal' | 'italic';
  display?: 'auto' | 'block' | 'swap' | 'fallback' | 'optional';
}

/**
 * Google Fonts URLを最適化
 */
export function optimizeGoogleFontsUrl(
  families: string[],
  options: FontOptimizationOptions = {}
): string {
  const {
    display = 'swap',
    subsets = ['latin'],
    weights = [400, 700]
  } = options;

  const familyParams = families.map(family => {
    const weightsStr = weights.join(',');
    return `${family}:wght@${weightsStr}`;
  }).join('&family=');

  const params = new URLSearchParams({
    family: familyParams,
    display,
    subset: subsets.join(',')
  });

  return `https://fonts.googleapis.com/css2?${params.toString()}`;
}

/**
 * フォントプリロード用のlink要素を生成
 */
export function generateFontPreloadLinks(
  fontUrls: string[],
  crossorigin = 'anonymous'
): string[] {
  return fontUrls.map(url => 
    `<link rel="preload" href="${url}" as="font" type="font/woff2" crossorigin="${crossorigin}">`
  );
}

/**
 * ローカルフォント用のCSS @font-face ルールを生成
 */
export function generateFontFaceCSS(fonts: LocalFontOptions[]): string {
  return fonts.map(font => {
    const {
      family,
      src,
      weight = 'normal',
      style = 'normal',
      display = 'swap'
    } = font;

    return `
@font-face {
  font-family: '${family}';
  src: url('${src}') format('woff2');
  font-weight: ${weight};
  font-style: ${style};
  font-display: ${display};
}`;
  }).join('\n');
}

/**
 * フォント最適化のCSS変数を生成
 */
export function generateFontVariables(fonts: { [key: string]: string }): string {
  const variables = Object.entries(fonts)
    .map(([name, family]) => `  --font-${name}: '${family}', system-ui, sans-serif;`)
    .join('\n');

  return `:root {\n${variables}\n}`;
}

/**
 * システムフォントスタックを取得
 */
export const systemFontStacks = {
  sans: [
    'system-ui',
    '-apple-system',
    'BlinkMacSystemFont',
    '"Segoe UI"',
    'Roboto',
    '"Helvetica Neue"',
    'Arial',
    '"Noto Sans"',
    'sans-serif',
    '"Apple Color Emoji"',
    '"Segoe UI Emoji"',
    '"Segoe UI Symbol"',
    '"Noto Color Emoji"'
  ].join(', '),
  
  serif: [
    'ui-serif',
    'Georgia',
    'Cambria',
    '"Times New Roman"',
    'Times',
    'serif'
  ].join(', '),
  
  mono: [
    'ui-monospace',
    'SFMono-Regular',
    '"SF Mono"',
    'Consolas',
    '"Liberation Mono"',
    'Menlo',
    'monospace'
  ].join(', ')
};

/**
 * フォント読み込み戦略
 */
export const fontLoadingStrategies = {
  // 重要なフォント（Above the fold）
  critical: {
    display: 'block' as const,
    preload: true,
    timeout: 3000
  },
  
  // 一般的なフォント
  normal: {
    display: 'swap' as const,
    preload: false,
    timeout: 0
  },
  
  // オプショナルフォント（装飾用）
  optional: {
    display: 'optional' as const,
    preload: false,
    timeout: 100
  }
};

/**
 * フォント読み込み用のJavaScriptコードを生成
 */
export function generateFontLoadingScript(
  fonts: { url: string; strategy: keyof typeof fontLoadingStrategies }[]
): string {
  return `
(function() {
  const strategies = ${JSON.stringify(fontLoadingStrategies)};
  const fonts = ${JSON.stringify(fonts)};
  
  fonts.forEach(({ url, strategy }) => {
    const config = strategies[strategy];
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url;
    
    if (config.preload) {
      link.rel = 'preload';
      link.as = 'style';
      link.onload = function() {
        this.rel = 'stylesheet';
      };
    }
    
    if (config.timeout > 0) {
      setTimeout(() => {
        if (link.parentNode) {
          link.parentNode.removeChild(link);
        }
      }, config.timeout);
    }
    
    document.head.appendChild(link);
  });
})();`;
}

/**
 * フォント最適化用のViteプラグイン
 */
export function viteFontOptimizationPlugin(options: {
  googleFonts?: { families: string[]; options?: FontOptimizationOptions };
  localFonts?: LocalFontOptions[];
  systemFonts?: { [key: string]: string };
} = {}) {
  return {
    name: 'vite-font-optimization',
    transformIndexHtml: {
      order: 'pre',
      handler(html: string) {
        let optimizedHtml = html;
        
        // Google Fonts の最適化
        if (options.googleFonts) {
          const { families, options: fontOptions } = options.googleFonts;
          const optimizedUrl = optimizeGoogleFontsUrl(families, fontOptions);
          
          const fontLink = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${optimizedUrl}" rel="stylesheet">`;
          
          optimizedHtml = optimizedHtml.replace(
            /<head>/,
            `<head>\n  ${fontLink}`
          );
        }
        
        // ローカルフォントのCSS追加
        if (options.localFonts && options.localFonts.length > 0) {
          const fontFaceCSS = generateFontFaceCSS(options.localFonts);
          const styleTag = `<style>\n${fontFaceCSS}\n</style>`;
          
          optimizedHtml = optimizedHtml.replace(
            /<head>/,
            `<head>\n  ${styleTag}`
          );
        }
        
        // システムフォント変数の追加
        if (options.systemFonts) {
          const fontVariables = generateFontVariables(options.systemFonts);
          const styleTag = `<style>\n${fontVariables}\n</style>`;
          
          optimizedHtml = optimizedHtml.replace(
            /<head>/,
            `<head>\n  ${styleTag}`
          );
        }
        
        return optimizedHtml;
      }
    }
  };
}
