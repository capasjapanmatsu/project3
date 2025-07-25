/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html', 
    './src/**/*.{js,ts,jsx,tsx}',
    './src/**/*.{html,vue}', // 追加ファイル形式
    './public/**/*.html',
  ],
  // 未使用のスタイルを積極的に削除
  purge: {
    enabled: process.env.NODE_ENV === 'production',
    content: [
      './index.html',
      './src/**/*.{js,ts,jsx,tsx,html,vue}',
      './src/**/*.css',
    ],
    // 動的に生成される可能性のあるクラス名を保護
    safelist: [
      'animate-spin',
      'animate-pulse',
      'animate-bounce',
      'bg-red-50',
      'bg-red-500',
      'bg-blue-50',
      'bg-blue-600',
      'bg-green-50', 
      'bg-green-600',
      'text-red-600',
      'text-blue-600',
      'text-green-600',
      'border-red-500',
      'border-blue-500',
      'border-green-500',
      // グリッドとフレックス（動的に使用される可能性）
      /^grid-cols-/,
      /^col-span-/,
      /^gap-/,
      /^space-/,
      // レスポンシブ関連
      /^sm:/,
      /^md:/,
      /^lg:/,
      /^xl:/,
      /^2xl:/,
    ],
    // より積極的なPurging
    options: {
      keyframes: true,
      fontFace: true,
    }
  },
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      // カスタムスクリーン（必要最小限）
      screens: {
        'xs': '475px',
      },
    },
  },
  // 本番環境でのCSS最小化
  corePlugins: {
    // 使用していない機能を無効化してバンドルサイズ削減
    preflight: true, // リセットCSSは保持
    container: false, // 使用していない場合は無効化
    accessibility: true,
    alignContent: true,
    alignItems: true,
    alignSelf: true,
    animation: true,
    appearance: true,
    backdropBlur: false, // 使用頻度が低い
    backdropBrightness: false,
    backdropContrast: false,
    backdropFilter: false,
    backdropGrayscale: false,
    backdropHueRotate: false,
    backdropInvert: false,
    backdropOpacity: false,
    backdropSaturate: false,
    backdropSepia: false,
    backgroundAttachment: false,
    backgroundColor: true,
    backgroundClip: true,
    backgroundImage: true,
    backgroundOpacity: true,
    backgroundPosition: true,
    backgroundRepeat: true,
    backgroundSize: true,
    blur: false, // 使用頻度が低い
    brightness: false,
    borderCollapse: true,
    borderColor: true,
    borderOpacity: true,
    borderRadius: true,
    borderStyle: true,
    borderWidth: true,
    boxShadow: true,
    boxSizing: true,
    clear: false,
    contrast: false,
    cursor: true,
    display: true,
    divideColor: true,
    divideOpacity: true,
    divideStyle: true,
    divideWidth: true,
    dropShadow: false,
    fill: true,
    filter: false,
    flex: true,
    flexDirection: true,
    flexGrow: true,
    flexShrink: true,
    flexWrap: true,
    float: false,
    fontFamily: true,
    fontSize: true,
    fontSmoothing: true,
    fontStyle: true,
    fontVariantNumeric: false,
    fontWeight: true,
    gap: true,
    gradientColorStops: true,
    grayscale: false,
    gridAutoColumns: true,
    gridAutoFlow: true,
    gridAutoRows: true,
    gridColumn: true,
    gridColumnEnd: true,
    gridColumnStart: true,
    gridRow: true,
    gridRowEnd: true,
    gridRowStart: true,
    gridTemplateColumns: true,
    gridTemplateRows: true,
    height: true,
    hueRotate: false,
    invert: false,
    isolation: false,
    justifyContent: true,
    justifyItems: true,
    justifySelf: true,
    letterSpacing: true,
    lineHeight: true,
    listStylePosition: false,
    listStyleType: false,
    margin: true,
    maxHeight: true,
    maxWidth: true,
    minHeight: true,
    minWidth: true,
    mixBlendMode: false,
    objectFit: true,
    objectPosition: true,
    opacity: true,
    order: true,
    outline: true,
    overflow: true,
    overscrollBehavior: false,
    padding: true,
    placeContent: true,
    placeItems: true,
    placeSelf: true,
    placeholderColor: true,
    placeholderOpacity: true,
    pointerEvents: true,
    position: true,
    resize: false,
    ringColor: true,
    ringOffsetColor: true,
    ringOffsetWidth: true,
    ringOpacity: true,
    ringWidth: true,
    rotate: false,
    saturate: false,
    scale: false,
    sepia: false,
    skew: false,
    space: true,
    stroke: true,
    strokeWidth: true,
    tableLayout: false,
    textAlign: true,
    textColor: true,
    textDecoration: true,
    textDecorationColor: false,
    textDecorationStyle: false,
    textDecorationThickness: false,
    textIndent: false,
    textOpacity: true,
    textOverflow: true,
    textTransform: true,
    textUnderlineOffset: false,
    transform: true,
    transformOrigin: true,
    transitionDelay: true,
    transitionDuration: true,
    transitionProperty: true,
    transitionTimingFunction: true,
    translate: true,
    userSelect: true,
    verticalAlign: true,
    visibility: true,
    whitespace: true,
    width: true,
    wordBreak: true,
    zIndex: true,
  },
  plugins: [],
};