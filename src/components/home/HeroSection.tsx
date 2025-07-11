import React from 'react';
import { Link } from 'react-router-dom';

interface HeroSectionProps {
  isLoggedIn: boolean;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ isLoggedIn }) => {
  if (isLoggedIn) {
    return (
      <section className="text-center py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          おかえりなさい！
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          今日も愛犬と素敵な時間をお過ごしください
        </p>
        <div className="flex justify-center space-x-4">
          <Link
            to="/parks"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            ドッグランを探す
          </Link>
          <Link
            to="/dashboard"
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            ダッシュボード
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="text-center py-12">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">
        愛犬とのお散歩を、もっと楽しく
      </h1>
      <p className="text-xl text-gray-600 mb-8">
        近くのドッグランを見つけて、新しい出会いを見つけましょう
      </p>
      <div className="flex justify-center space-x-4">
        <Link
          to="/register"
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          無料で始める
        </Link>
        <Link
          to="/magic-link"
          className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors font-medium"
        >
          Magic Linkで簡単ログイン
        </Link>
      </div>
    </section>
  );
};

export default HeroSection; 