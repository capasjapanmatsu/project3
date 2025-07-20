import React from 'react';
import { Link } from 'react-router-dom';
import { Home, Search, ArrowLeft, PawPrint } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

export function NotFound() {
  const handleGoBack = () => {
    window.history.length > 1 ? window.history.back() : window.location.href = '/';
  };

  return (
    <>
      <Helmet>
        <title>ページが見つかりません - ドッグパークJP</title>
        <meta name="description" content="お探しのページは見つかりませんでした。ドッグパークJPで愛犬との楽しい時間をお過ごしください。" />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          {/* ロゴ/アイコンセクション */}
          <div className="mb-8">
            <div className="relative mx-auto w-32 h-32 bg-blue-100 rounded-full flex items-center justify-center">
              <PawPrint className="w-16 h-16 text-blue-600" />
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                <span className="text-sm font-bold text-gray-800">?</span>
              </div>
            </div>
          </div>

          {/* メインメッセージ */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              404
            </h1>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              ページが見つかりません
            </h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              お探しのページは移動または削除された可能性があります。<br />
              URLをご確認いただくか、以下のリンクから目的のページをお探しください。
            </p>
          </div>

          {/* アクションボタン */}
          <div className="space-y-4">
            <Link
              to="/"
              className="btn w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
              aria-label="ホームページに戻る"
            >
              <Home className="w-5 h-5" />
              ホームに戻る
            </Link>

            <button
              onClick={handleGoBack}
              className="btn w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
              aria-label="前のページに戻る"
            >
              <ArrowLeft className="w-5 h-5" />
              前のページに戻る
            </button>

            <Link
              to="/parks"
              className="btn w-full bg-green-100 hover:bg-green-200 text-green-700 py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
              aria-label="ドッグパークを検索する"
            >
              <Search className="w-5 h-5" />
              ドッグパークを探す
            </Link>
          </div>

          {/* 追加情報 */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              お困りの場合は
              <Link
                to="/contact"
                className="text-blue-600 hover:text-blue-800 underline ml-1"
                aria-label="お問い合わせページへ"
              >
                お問い合わせ
              </Link>
              からご連絡ください
            </p>
          </div>

          {/* よく利用されるリンク */}
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">よく利用されるページ</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <Link
                to="/register-dog"
                className="text-blue-600 hover:text-blue-800 hover:underline py-1"
                aria-label="ワンちゃん登録ページへ"
              >
                ワンちゃん登録
              </Link>
              <Link
                to="/subscription"
                className="text-blue-600 hover:text-blue-800 hover:underline py-1"
                aria-label="サブスクリプションページへ"
              >
                サブスクリプション
              </Link>
              <Link
                to="/shop"
                className="text-blue-600 hover:text-blue-800 hover:underline py-1"
                aria-label="ペットショップページへ"
              >
                ペットショップ
              </Link>
              <Link
                to="/community"
                className="text-blue-600 hover:text-blue-800 hover:underline py-1"
                aria-label="コミュニティページへ"
              >
                コミュニティ
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 
