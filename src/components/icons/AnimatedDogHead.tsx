import React from 'react';

export interface AnimatedDogHeadProps {
  size?: number | string;
  stroke?: string;
  fill?: string;
  strokeWidth?: number;
  speedSec?: number; // 左右に1往復する時間
  className?: string;
  reducedMotion?: boolean; // true の場合はアニメーション停止
}

/**
 * シンプルな線画のワンちゃんアイコン。首（頭部）のみ左右に首振りします。
 * - 依存なし（純SVG）
 * - SMIL animateTransform を使用（主要ブラウザ対応）
 */
const AnimatedDogHead: React.FC<AnimatedDogHeadProps> = ({
  size = 80,
  stroke = '#333',
  fill = 'none',
  strokeWidth = 2,
  speedSec = 2,
  className,
  reducedMotion = false,
}) => {
  // 回転の支点（首の付け根）
  const pivotX = 64;
  const pivotY = 44;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 128 128"
      width={size}
      height={size}
      className={className}
      aria-label="Animated dog head icon"
      role="img"
    >
      {/* 胴体（固定） */}
      <g
        stroke={stroke}
        strokeWidth={strokeWidth}
        fill={fill}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* 胴体の丸み */}
        <path d="M22 86c0-14 12-24 28-24h28c16 0 28 10 28 24v10c0 4-3 7-7 7H29c-4 0-7-3-7-7V86z" />
        {/* 前脚 */}
        <path d="M44 96v12M84 96v12" />
        {/* しっぽ */}
        <path d="M106 86c6 2 10 6 10 10" />
      </g>

      {/* 頭部（首振り） */}
      <g
        stroke={stroke}
        strokeWidth={strokeWidth}
        fill={fill}
        strokeLinecap="round"
        strokeLinejoin="round"
        transform={`rotate(0 ${pivotX} ${pivotY})`}
      >
        {/* アニメーション（reduce指定時は描画しない） */}
        {!reducedMotion && (
          <animateTransform
            attributeName="transform"
            type="rotate"
            values={`-8 ${pivotX} ${pivotY}; 8 ${pivotX} ${pivotY}; -8 ${pivotX} ${pivotY}`}
            dur={`${speedSec}s`}
            repeatCount="indefinite"
          />
        )}

        {/* 顔ベース */}
        <path d="M48 58c0-12 8-22 16-22s16 10 16 22c0 8-6 14-16 14s-16-6-16-14z" />
        {/* 耳 */}
        <path d="M56 38c-3 2-6 6-7 12M88 50c-1-6-4-10-7-12" />
        {/* 目 */}
        <circle cx="58" cy="52" r="1.5" fill={stroke} />
        <circle cx="78" cy="52" r="1.5" fill={stroke} />
        {/* 鼻と口 */}
        <path d="M66 56h4M60 62c4 4 12 4 16 0" />
        {/* 首 */}
        <path d="M62 70v6M74 70v6" />
      </g>
    </svg>
  );
};

export default AnimatedDogHead;


