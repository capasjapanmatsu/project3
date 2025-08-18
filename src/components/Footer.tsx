import { Handshake, Mail, MapPin, PawPrint, Store } from 'lucide-react';
import { Link } from 'react-router-dom';
import useAuth from '../context/AuthContext';

export function Footer() {
  const { isAuthenticated } = useAuth();
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-gray-900 text-white py-16 pb-28 md:pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 目立つお問い合わせリンク（フッター上部） */}
        {isAuthenticated && (
          <div className="mb-8">
            <Link
              to="/inquiry"
              className="block w-full text-center bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white font-bold py-3 rounded-xl shadow-lg"
            >
              要望・お問い合わせはこちら（ログイン中）
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* Logo & Description */}
          <div className="md:col-span-2 lg:col-span-1">
            <div className="flex items-center mb-4">
              <PawPrint className="h-8 w-8 text-blue-400 mr-2" />
              <h3 className="text-xl font-bold">ドッグパークJP</h3>
            </div>
            <p className="text-gray-400 leading-relaxed">
              愛犬とのお散歩をもっと楽しく。
              全国のドッグランを簡単に検索・予約できるサービスです。
            </p>
          </div>
          
          {/* Navigation Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">サービス</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-gray-400 hover:text-white transition-colors">
                  ホーム
                </Link>
              </li>
              <li>
                <Link to="/parks" className="text-gray-400 hover:text-white transition-colors">
                  ドッグラン一覧
                </Link>
              </li>
              <li>
                <Link to="/rules" className="text-gray-400 hover:text-white transition-colors">
                  利用ルール
                </Link>
              </li>
              <li>
                <Link to="/petshop" className="text-gray-400 hover:text-white transition-colors">
                  ペットショップ
                </Link>
              </li>
              <li>
                <Link to={isAuthenticated ? "/subscription-intro" : "/login"} className="text-gray-400 hover:text-white transition-colors">
                  サブスクリプション
                </Link>
              </li>
              <li>
                <Link to="/news" className="text-gray-400 hover:text-white transition-colors">
                  新着情報
                </Link>
              </li>
            </ul>
          </div>
          
          {/* For users */}
          <div>
            <h3 className="text-lg font-semibold mb-4">ご利用者様向け</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/register" className="text-gray-400 hover:text-white transition-colors">
                  新規登録
                </Link>
              </li>
              <li>
                <Link to="/liff/login" className="text-gray-400 hover:text-white transition-colors">
                  ログイン
                </Link>
              </li>
              <li>
                <Link to="/dog-registration" className="text-gray-400 hover:text-white transition-colors">
                  ワンちゃん登録
                </Link>
              </li>
              <li>
                <Link to={isAuthenticated ? "/access-control" : "/login"} className="text-gray-400 hover:text-white transition-colors">
                  入場管理
                </Link>
              </li>
              <li>
                <Link to={isAuthenticated ? "/community" : "/login"} className="text-gray-400 hover:text-white transition-colors">
                  コミュニティ
                </Link>
              </li>
            </ul>
          </div>

          {/* For business */}
          <div>
            <h3 className="text-lg font-semibold mb-4">事業者向け</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/park-registration-agreement" className="text-gray-400 hover:text-white transition-colors flex items-center">
                  <PawPrint className="w-4 h-4 mr-2" />
                  ドッグラン経営者募集
                </Link>
              </li>
              <li>
                <Link to="/facility-registration" className="text-gray-400 hover:text-white transition-colors flex items-center">
                  <Store className="w-4 h-4 mr-2" />
                  ワンちゃんを行ける施設オーナー募集
                </Link>
              </li>
              <li>
                <Link to="/sponsor-inquiry" className="text-gray-400 hover:text-white transition-colors flex items-center">
                  <Handshake className="w-4 h-4 mr-2" />
                  スポンサー募集
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Contact Section - Full Width */}
        <div className="border-t border-gray-700 pt-8 mb-8">
          <h3 className="text-lg font-semibold mb-4">お問い合わせ</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start">
              <Mail className="w-5 h-5 text-gray-400 mr-2 mt-0.5" />
              <span className="text-gray-400">info@dogparkjp.com</span>
            </div>
            <div className="flex items-start">
              <MapPin className="w-5 h-5 text-gray-400 mr-2 mt-0.5" />
              <span className="text-gray-400">
                〒861-0563 熊本県山鹿市鹿央町千田１７１８－１３ 株式会社ＣＡＰＡＳ
              </span>
            </div>
          </div>
        </div>
        
        <hr className="border-gray-700 my-8" />
        
        <div className="flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-400 text-sm mb-4 md:mb-0">
            &copy; {currentYear} ドッグパークJP. All rights reserved.
          </p>
          <div className="flex space-x-6">
            <Link to="/privacy-policy" className="text-gray-400 hover:text-white transition-colors text-sm">
              プライバシーポリシー
            </Link>
            <Link to="/terms" className="text-gray-400 hover:text-white transition-colors text-sm">
              利用規約
            </Link>
            <Link to="/business-information" className="text-gray-400 hover:text-white transition-colors text-sm">
              特定商取引法に基づく表記
            </Link>
            <Link to="/contact" className="text-gray-400 hover:text-white transition-colors text-sm">
              お問い合わせ
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
