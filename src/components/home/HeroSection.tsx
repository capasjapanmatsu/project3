import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, User } from 'lucide-react';
import { SponsorBanner } from './SponsorBanner';

interface HeroSectionProps {
  isLoggedIn: boolean;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ isLoggedIn }) => {
  return (
    <section className="py-4">
      {/* スポンサーバナー（ログイン状態に関係なく表示） */}
      <SponsorBanner />
      
      {isLoggedIn ? (
        /* ログイン済みユーザー向けアクションボタン */
        <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mt-6">
          <Link
            to="/parks"
            className="flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <MapPin className="w-5 h-5" />
            ドッグランを探す
          </Link>
          <Link
            to="/dashboard"
            className="flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            <User className="w-5 h-5" />
            マイページ
          </Link>
        </div>
      ) : (
        /* 未ログインユーザー向けコンテンツ */
        <div className="text-center py-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            愛犬とのお散歩を、もっと楽しく
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            近くのドッグランを見つけて、新しい出会いを見つけましょう
          </p>
          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
            <Link
              to="/register"
              className="text-center bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              無料で始める
            </Link>
            <Link
              to="/login?method=magic"
              className="text-center bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition-colors font-medium"
            >
              Magic Linkで簡単ログイン
            </Link>
          </div>
        </div>
      )}
    </section>
  );
};

export default HeroSection; 
