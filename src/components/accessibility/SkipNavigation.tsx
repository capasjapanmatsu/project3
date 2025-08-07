import React from 'react';

/**
 * スキップナビゲーションコンポーネント
 * キーボードユーザーがメインコンテンツに素早くアクセスできるようにする
 */
export const SkipNavigation: React.FC = () => {
  return (
    <div className="sr-only focus-within:not-sr-only">
      <a
        href="#main-content"
        className="absolute top-0 left-0 z-50 px-4 py-2 bg-blue-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        style={{
          transform: 'translateY(-100%)',
          transition: 'transform 0.2s',
        }}
        onFocus={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
        }}
        onBlur={(e) => {
          e.currentTarget.style.transform = 'translateY(-100%)';
        }}
      >
        メインコンテンツへスキップ
      </a>
      <a
        href="#navigation"
        className="absolute top-0 left-40 z-50 px-4 py-2 bg-blue-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        style={{
          transform: 'translateY(-100%)',
          transition: 'transform 0.2s',
        }}
        onFocus={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
        }}
        onBlur={(e) => {
          e.currentTarget.style.transform = 'translateY(-100%)';
        }}
      >
        ナビゲーションへスキップ
      </a>
      <a
        href="#search"
        className="absolute top-0 left-80 z-50 px-4 py-2 bg-blue-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        style={{
          transform: 'translateY(-100%)',
          transition: 'transform 0.2s',
        }}
        onFocus={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
        }}
        onBlur={(e) => {
          e.currentTarget.style.transform = 'translateY(-100%)';
        }}
      >
        検索へスキップ
      </a>
    </div>
  );
};

export default SkipNavigation;