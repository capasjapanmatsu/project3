import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/Button';
import { ChevronRight, MapPin, Dog, Shield, Calendar, Clock, Users, Star, CheckCircle, Heart } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-green-50">
      {/* ヒーローセクション */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-green-500/10"></div>
        <div className="relative z-10 container mx-auto px-4 py-20 sm:py-32">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
              愛犬と一緒に、
              <span className="text-blue-600 block sm:inline">最高の時間を</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              ドッグパークJPは、全国のドッグランやペット施設を簡単に検索・予約できる
              <br className="hidden sm:block" />
              日本最大級の愛犬家コミュニティプラットフォームです
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register">
                <Button size="lg" className="w-full sm:w-auto text-lg px-8 py-6 bg-blue-600 hover:bg-blue-700">
                  無料で始める
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/parks">
                <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg px-8 py-6">
                  施設を探す
                  <MapPin className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              クレジットカード不要・1分で登録完了
            </p>
          </div>
        </div>
      </section>

      {/* 特徴セクション */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">ドッグパークJPの特徴</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 rounded-full p-4 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <MapPin className="h-10 w-10 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">全国のドッグラン検索</h3>
              <p className="text-gray-600">
                現在地から最寄りのドッグランを簡単検索。施設の詳細情報や口コミも確認できます。
              </p>
            </div>
            <div className="text-center">
              <div className="bg-green-100 rounded-full p-4 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <Calendar className="h-10 w-10 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">簡単予約システム</h3>
              <p className="text-gray-600">
                24時間いつでもオンラインで予約可能。QRコードでスムーズな入退場を実現。
              </p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 rounded-full p-4 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <Users className="h-10 w-10 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">愛犬家コミュニティ</h3>
              <p className="text-gray-600">
                同じ地域の愛犬家と繋がり、情報交換やイベント参加が可能です。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* メリットセクション */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">愛犬家の皆様へのメリット</h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="flex items-start">
              <CheckCircle className="h-6 w-6 text-green-500 mt-1 mr-3 flex-shrink-0" />
              <div>
                <h3 className="font-semibold mb-1">安心・安全な施設選び</h3>
                <p className="text-gray-600">ワクチン接種証明書の管理機能で、安心して利用できる施設を選べます</p>
              </div>
            </div>
            <div className="flex items-start">
              <CheckCircle className="h-6 w-6 text-green-500 mt-1 mr-3 flex-shrink-0" />
              <div>
                <h3 className="font-semibold mb-1">お得な料金プラン</h3>
                <p className="text-gray-600">サブスクリプションプランで、毎月の利用料金を大幅削減</p>
              </div>
            </div>
            <div className="flex items-start">
              <CheckCircle className="h-6 w-6 text-green-500 mt-1 mr-3 flex-shrink-0" />
              <div>
                <h3 className="font-semibold mb-1">愛犬の健康管理</h3>
                <p className="text-gray-600">JPパスポート機能で、愛犬の健康情報を一元管理</p>
              </div>
            </div>
            <div className="flex items-start">
              <CheckCircle className="h-6 w-6 text-green-500 mt-1 mr-3 flex-shrink-0" />
              <div>
                <h3 className="font-semibold mb-1">イベント・交流会</h3>
                <p className="text-gray-600">定期的な愛犬家イベントで、新しい友達作り</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 数字で見る実績 */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">数字で見るドッグパークJP</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600 mb-2">500+</div>
              <p className="text-gray-600">登録施設数</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-green-600 mb-2">10,000+</div>
              <p className="text-gray-600">登録ユーザー数</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-purple-600 mb-2">4.8</div>
              <p className="text-gray-600">平均評価</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-orange-600 mb-2">24/7</div>
              <p className="text-gray-600">サポート体制</p>
            </div>
          </div>
        </div>
      </section>

      {/* 利用者の声 */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">利用者の声</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex items-center mb-4">
                <Star className="h-5 w-5 text-yellow-400 fill-current" />
                <Star className="h-5 w-5 text-yellow-400 fill-current" />
                <Star className="h-5 w-5 text-yellow-400 fill-current" />
                <Star className="h-5 w-5 text-yellow-400 fill-current" />
                <Star className="h-5 w-5 text-yellow-400 fill-current" />
              </div>
              <p className="text-gray-600 mb-4">
                「予約システムがとても使いやすく、QRコードでの入退場もスムーズです。愛犬と安心して遊べる場所が簡単に見つかりました！」
              </p>
              <p className="font-semibold">- 田中様（ゴールデンレトリバー飼い主）</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex items-center mb-4">
                <Star className="h-5 w-5 text-yellow-400 fill-current" />
                <Star className="h-5 w-5 text-yellow-400 fill-current" />
                <Star className="h-5 w-5 text-yellow-400 fill-current" />
                <Star className="h-5 w-5 text-yellow-400 fill-current" />
                <Star className="h-5 w-5 text-yellow-400 fill-current" />
              </div>
              <p className="text-gray-600 mb-4">
                「サブスクプランのおかげで、月々の利用料金が大幅に節約できました。複数のドッグランを気軽に利用できるようになりました。」
              </p>
              <p className="font-semibold">- 佐藤様（柴犬飼い主）</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex items-center mb-4">
                <Star className="h-5 w-5 text-yellow-400 fill-current" />
                <Star className="h-5 w-5 text-yellow-400 fill-current" />
                <Star className="h-5 w-5 text-yellow-400 fill-current" />
                <Star className="h-5 w-5 text-yellow-400 fill-current" />
                <Star className="h-5 w-5 text-yellow-400 fill-current" />
              </div>
              <p className="text-gray-600 mb-4">
                「JPパスポート機能が便利！ワクチン接種の記録や健康情報を一元管理できて、どこの施設でも安心して利用できます。」
              </p>
              <p className="font-semibold">- 鈴木様（トイプードル飼い主）</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTAセクション */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-blue-700">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-6">
            今すぐ始めよう
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            愛犬との素敵な思い出作りを、ドッグパークJPがサポートします。
            まずは無料登録から始めてみませんか？
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register">
              <Button size="lg" className="w-full sm:w-auto text-lg px-8 py-6 bg-white text-blue-600 hover:bg-gray-100">
                無料で登録する
                <Heart className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg px-8 py-6 border-white text-white hover:bg-white/10">
                ログインはこちら
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* フッター */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="font-bold mb-4">ドッグパークJP</h3>
              <p className="text-gray-400">
                愛犬と飼い主様の幸せな時間をサポートする、日本最大級のペットコミュニティ
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">サービス</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link to="/parks" className="hover:text-white">ドッグラン検索</Link></li>
                <li><Link to="/facilities" className="hover:text-white">ペット施設</Link></li>
                <li><Link to="/subscription-intro" className="hover:text-white">料金プラン</Link></li>
                <li><Link to="/jp-passport" className="hover:text-white">JPパスポート</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">サポート</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link to="/contact" className="hover:text-white">お問い合わせ</Link></li>
                <li><Link to="/rules" className="hover:text-white">利用規約</Link></li>
                <li><Link to="/privacy-policy" className="hover:text-white">プライバシーポリシー</Link></li>
                <li><Link to="/terms-of-service" className="hover:text-white">利用規約</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">フォローする</h4>
              <p className="text-gray-400 mb-4">
                最新情報をお届けします
              </p>
              <div className="flex space-x-4">
                {/* SNSアイコンは必要に応じて追加 */}
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-gray-400">
            <p>&copy; 2025 ドッグパークJP. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
