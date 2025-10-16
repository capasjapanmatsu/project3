import { Handshake, PawPrint, Store } from 'lucide-react';
import { Link } from 'react-router-dom';
import useAuth from '../context/AuthContext';

export function Footer() {
  const { isAuthenticated } = useAuth();
  const currentYear = new Date().getFullYear();
  const isStandalone = typeof window !== 'undefined' && (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as any).standalone);
  
  return (
    <footer className="bg-gray-900 text-white py-8 pb-12 md:pb-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* Logo & Description */}
          <div className="md:col-span-2 lg:col-span-1">
            <div className="flex items-center mb-3">
              <PawPrint className="h-6 w-6 text-blue-400 mr-2" />
              <h3 className="text-lg font-bold">ドッグパークJP</h3>
            </div>
            <p className="text-gray-400 leading-relaxed">
              愛犬とのお散歩をもっと楽しく。
              全国のドッグランを簡単に検索・予約できるサービスです。
            </p>
            <div className="mt-3">
              <a
                href="https://line.me/R/ti/p/%40662udgcy"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="公式LINEに登録"
                className="inline-flex items-center px-3 py-1.5 rounded-md bg-[#06C755] hover:bg-[#05b34d] text-white text-sm font-semibold shadow"
              >
                公式LINEに登録
              </a>
            </div>

            {/* ブラウザ閲覧時のみアプリ誘導（iOS未完成でも表示可） */}
            {!isStandalone && (
              <div className="mt-4 p-3 rounded-lg bg-gray-800/60 border border-gray-700">
                <h4 className="font-semibold text-sm mb-2">アプリでもっと快適に</h4>
                <div className="flex items-center gap-3">
                  <a
                    href="https://play.google.com/store/apps/details?id=com.dogparkjp.app2"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                    aria-label="Google Play で入手"
                    title="Google Play で入手"
                  >
                    <img
                      src="/qr/google-play-qr-300.png"
                      alt="Google Play QRコード"
                      className="w-16 h-16 rounded bg-white p-1"
                      loading="lazy"
                      decoding="async"
                    />
                  </a>
                  <div className="text-[11px] text-gray-300">
                    <p className="mb-1">スマホでQRを読み取ってインストール</p>
                    <a
                      href="https://play.google.com/store/apps/details?id=com.dogparkjp.app2"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-1 underline text-blue-300 hover:text-blue-200"
                    >
                      Google Playで開く
                    </a>
                    <p className="mt-2 opacity-80">iOS版は準備中です</p>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Navigation Links */}
          <div>
            {isAuthenticated && (
              <Link
                to="/inquiry"
                className="block w-full text-center bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white font-bold py-2 rounded-lg shadow mb-3"
              >
                要望・お問い合わせはこちら
              </Link>
            )}
            <h3 className="text-base font-semibold mb-3">サービス</h3>
            <ul className="space-y-1.5">
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
            <h3 className="text-base font-semibold mb-3">ご利用者様向け</h3>
            <ul className="space-y-1.5">
              <li>
                <Link to="/register" className="text-gray-400 hover:text-white transition-colors">
                  新規登録
                </Link>
              </li>
              <li>
                <Link to="/login" className="text-gray-400 hover:text-white transition-colors">
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
            <h3 className="text-base font-semibold mb-3">事業者向け</h3>
            <ul className="space-y-1.5">
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

        
        
        <hr className="border-gray-700 my-4" />
        
        <div className="flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-400 text-xs mb-4 md:mb-0">
            &copy; {currentYear} ドッグパークJP. All rights reserved.
          </p>
          <div className="flex space-x-4">
            <Link to="/privacy" className="text-gray-400 hover:text-white transition-colors text-xs">
              プライバシーポリシー
            </Link>
            <Link to="/terms" className="text-gray-400 hover:text-white transition-colors text-xs">
              利用規約
            </Link>
            <Link to="/legal/tokushoho" className="text-gray-400 hover:text-white transition-colors text-xs">
              特定商取引法に基づく表記
            </Link>
            <Link to="/contact" className="text-gray-400 hover:text-white transition-colors text-xs">
              お問い合わせ
            </Link>
            <a
              href="https://line.me/R/ti/p/%40662udgcy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition-colors text-xs"
            >
              公式LINE
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
