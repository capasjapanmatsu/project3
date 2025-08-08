import {
  Award,
  Calendar,
  Camera,
  Coffee,
  Dog,
  Instagram,
  Lock,
  MapPin,
  MessageCircle,
  Search,
  Shield,
  Smartphone,
  Star,
  Twitter,
  Users,
  Zap
} from 'lucide-react';
import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/Button';
import '../index.css';

export default function Landing() {
  const handleScrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
    e.preventDefault();
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleAppDownload = () => {
    alert('アプリストアに移動します（開発中）');
  };

  const handleSearchDogRun = () => {
    window.location.href = '/parks';
  };

  return (
    <div className="min-h-screen">
      {/* ヘッダー */}
      <header className="border-b bg-white/95 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <Dog className="h-8 w-8 text-orange-500" />
            <span className="font-bold text-xl">DogPark.jp</span>
          </Link>
          <nav className="hidden md:flex items-center space-x-6">
            <a href="#features" onClick={(e) => handleScrollToSection(e, 'features')} className="hover:text-blue-600 transition-colors">特徴</a>
            <a href="#community" onClick={(e) => handleScrollToSection(e, 'community')} className="hover:text-blue-600 transition-colors">コミュニティ</a>
            <a href="#how-to-use" onClick={(e) => handleScrollToSection(e, 'how-to-use')} className="hover:text-blue-600 transition-colors">使い方</a>
            <a href="#facilities" onClick={(e) => handleScrollToSection(e, 'facilities')} className="hover:text-blue-600 transition-colors">施設情報</a>
            <Button variant="outline" onClick={handleAppDownload}>アプリをダウンロード</Button>
            <Link to="/admin">
              <Button variant="outline" className="bg-gray-800 text-white hover:bg-gray-700">
                <Shield className="mr-2 h-4 w-4" />
                管理者
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* ヒーローセクション */}
      <section className="py-20 px-4 bg-gradient-to-br from-orange-50 to-blue-50">
        <div className="container mx-auto text-center max-w-4xl">
          <div className="inline-flex items-center px-4 py-2 bg-white/80 backdrop-blur rounded-full text-sm font-medium mb-4">
            <Zap className="h-4 w-4 mr-2 text-yellow-500" />
            全国初のスマートドッグランプラットフォーム
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 text-gray-900">
            愛犬と一緒に<br />
            <span className="text-orange-600">新しい出会い</span>と<br />
            <span className="text-blue-600">楽しい体験</span>を
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            スマートロックで24時間利用可能なドッグランと、愛犬家同士が繋がるコミュニティ。
            全国の犬と飼い主さんが集まる、新しいドッグライフプラットフォームです。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-orange-600 hover:bg-orange-700 text-white" onClick={handleAppDownload}>
              <Smartphone className="mr-2 h-5 w-5" />
              無料アプリをダウンロード
            </Button>
            <Button size="lg" variant="outline" onClick={handleSearchDogRun}>
              <Search className="mr-2 h-5 w-5" />
              近くのドッグランを探す
            </Button>
          </div>
        </div>
      </section>

      {/* 特徴セクション */}
      <section id="features" className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">DogPark.jpの特徴</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              最新テクノロジーとコミュニティの力で、愛犬との毎日をもっと豊かに
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="bg-white text-center shadow-lg rounded-xl p-6">
              <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                <Lock className="h-8 w-8 text-orange-600" />
              </div>
              <h3 className="text-xl font-bold mb-4">スマートロックシステム</h3>
              <p className="text-gray-600">
                アプリで予約・決済後、スマホでゲートを開錠。24時間いつでも無人で安全にご利用いただけます。
              </p>
            </div>

            <div className="bg-white text-center shadow-lg rounded-xl p-6">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <MapPin className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold mb-4">全国ドッグラン検索</h3>
              <p className="text-gray-600">
                GPS機能で現在地周辺のドッグランを簡単検索。施設情報、料金、空き状況もリアルタイムで確認。
              </p>
            </div>

            <div className="bg-white text-center shadow-lg rounded-xl p-6">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Users className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold mb-4">愛犬家コミュニティ</h3>
              <p className="text-gray-600">
                同じエリアの愛犬家同士で情報交換。写真シェア、お散歩仲間探し、イベント開催も。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* コミュニティセクション */}
      <section id="community" className="py-20 px-4 bg-gradient-to-r from-orange-50 to-yellow-50">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">愛犬家コミュニティ</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              全国の愛犬家と繋がって、もっと楽しいドッグライフを始めませんか
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            <div className="bg-white text-center shadow-lg rounded-xl p-6">
              <div className="mx-auto w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center mb-3">
                <Camera className="h-6 w-6 text-pink-600" />
              </div>
              <h4 className="text-lg font-bold mb-3">写真シェア</h4>
              <p className="text-sm text-gray-600">
                愛犬の可愛い瞬間を投稿して、みんなでシェア。いいね！やコメントで交流しよう。
              </p>
            </div>

            <div className="bg-white text-center shadow-lg rounded-xl p-6">
              <div className="mx-auto w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-3">
                <MessageCircle className="h-6 w-6 text-purple-600" />
              </div>
              <h4 className="text-lg font-bold mb-3">チャット機能</h4>
              <p className="text-sm text-gray-600">
                近くの愛犬家とチャットでやり取り。お散歩仲間やプレイデートの約束も簡単。
              </p>
            </div>

            <div className="bg-white text-center shadow-lg rounded-xl p-6">
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
                <Calendar className="h-6 w-6 text-green-600" />
              </div>
              <h4 className="text-lg font-bold mb-3">イベント開催</h4>
              <p className="text-sm text-gray-600">
                ドッグランでのオフ会やしつけ教室など、コミュニティ主催のイベントに参加。
              </p>
            </div>

            <div className="bg-white text-center shadow-lg rounded-xl p-6">
              <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                <Award className="h-6 w-6 text-blue-600" />
              </div>
              <h4 className="text-lg font-bold mb-3">レビュー・評価</h4>
              <p className="text-sm text-gray-600">
                実際に利用したドッグランのレビューを投稿。みんなの評価で最適な施設を見つけよう。
              </p>
            </div>
          </div>

          <div className="text-center mt-12">
            <Link to="/community">
              <Button size="lg" className="bg-orange-600 hover:bg-orange-700 text-white">
                <Users className="mr-2 h-5 w-5" />
                コミュニティに参加する
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 利用方法セクション */}
      <section id="how-to-use" className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">簡単3ステップで利用開始</h2>
            <p className="text-xl text-gray-600">
              アプリをダウンロードして、今すぐ愛犬と新しい体験を始めましょう
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-500 text-white rounded-full flex items-center justify-center mx-auto mb-6 font-bold text-2xl">
                1
              </div>
              <h3 className="font-bold text-xl mb-4">アプリダウンロード</h3>
              <p className="text-gray-600">
                App StoreまたはGoogle Playから無料ダウンロード。愛犬のプロフィール登録で準備完了。
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-500 text-white rounded-full flex items-center justify-center mx-auto mb-6 font-bold text-2xl">
                2
              </div>
              <h3 className="font-bold text-xl mb-4">施設検索・予約</h3>
              <p className="text-gray-600">
                近くのドッグランを検索して予約。料金確認からオンライン決済まで全てアプリで完結。
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-6 font-bold text-2xl">
                3
              </div>
              <h3 className="font-bold text-xl mb-4">スマホで入場・楽しむ</h3>
              <p className="text-gray-600">
                現地でアプリを起動してスマートロックを開錠。愛犬と楽しい時間を過ごしながら、写真投稿も。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 施設紹介セクション */}
      <section id="facilities" className="py-20 px-4 bg-gray-50">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">愛犬と楽しめる施設情報</h2>
            <p className="text-xl text-gray-600">
              ドッグラン以外にも、愛犬と一緒に楽しめるスポットをご紹介
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white overflow-hidden shadow-lg rounded-xl">
              <div className="aspect-video relative bg-gray-200">
                <img
                  src="https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=400&h=300&fit=crop&crop=center"
                  alt="スマートドッグラン"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6">
                <h4 className="font-bold text-lg mb-2 flex items-center">
                  <Lock className="mr-2 h-5 w-5 text-orange-600" />
                  スマートドッグラン
                </h4>
                <p className="text-sm text-gray-600">
                  24時間利用可能な最新設備のドッグラン。大型犬・小型犬エリア完備。
                </p>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow-lg rounded-xl">
              <div className="aspect-video relative bg-gray-200">
                <img
                  src="https://images.unsplash.com/photo-1581888227599-779811939961?w=400&h=300&fit=crop&crop=center"
                  alt="ペット同伴カフェ"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6">
                <h4 className="font-bold text-lg mb-2 flex items-center">
                  <Coffee className="mr-2 h-5 w-5 text-pink-600" />
                  ペット同伴カフェ
                </h4>
                <p className="text-sm text-gray-600">
                  愛犬と一緒に食事が楽しめるペットフレンドリーなカフェやレストラン情報。
                </p>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow-lg rounded-xl">
              <div className="aspect-video relative bg-gray-200">
                <img
                  src="https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=400&h=300&fit=crop&crop=center"
                  alt="ペットホテル"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6">
                <h4 className="font-bold text-lg mb-2 flex items-center">
                  <Shield className="mr-2 h-5 w-5 text-blue-600" />
                  ペットホテル
                </h4>
                <p className="text-sm text-gray-600">
                  信頼できるペットホテル・ペットシッター。旅行や出張時も安心。
                </p>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow-lg rounded-xl">
              <div className="aspect-video relative bg-gray-200">
                <img
                  src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop&crop=center"
                  alt="ドッグトレーニング"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6">
                <h4 className="font-bold text-lg mb-2 flex items-center">
                  <Star className="mr-2 h-5 w-5 text-yellow-600" />
                  ドッグトレーニング
                </h4>
                <p className="text-sm text-gray-600">
                  プロのトレーナーによるしつけ教室・アジリティトレーニング施設。
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* お客様の声セクション */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">利用者の声</h2>
            <p className="text-xl text-gray-600">
              実際にDogPark.jpをご利用いただいている飼い主さんの声
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="bg-white shadow-lg rounded-xl p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <Dog className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <h4 className="font-bold">田中さん（柴犬・まるちゃん）</h4>
                  <div className="flex text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-gray-600">
                「24時間利用できるのが本当に助かります。仕事の関係で夜遅くしか時間がないので、まるちゃんも喜んでいます！」
              </p>
            </div>

            <div className="bg-white shadow-lg rounded-xl p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Dog className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-bold">佐藤さん（ゴールデンレトリバー・そらくん）</h4>
                  <div className="flex text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-gray-600">
                「コミュニティ機能で同じ地域の愛犬家さんと出会えました。今では毎週一緒にお散歩しています♪」
              </p>
            </div>

            <div className="bg-white shadow-lg rounded-xl p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Dog className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h4 className="font-bold">鈴木さん（トイプードル・ももちゃん）</h4>
                  <div className="flex text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-gray-600">
                「スマホひとつで予約から入場まで完結するのがすごく便利。ももちゃんの可愛い写真もたくさんシェアしています！」
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTAセクション */}
      <section className="py-20 px-4 bg-gradient-to-r from-orange-600 to-yellow-600 text-white">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            愛犬との素敵な毎日を始めませんか？
          </h2>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            DogPark.jpで、全国の愛犬家コミュニティに参加して、
            愛犬と一緒にもっと楽しい体験を見つけましょう。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-white text-gray-800 hover:bg-gray-100"
              onClick={handleAppDownload}
            >
              <Smartphone className="mr-2 h-5 w-5" />
              App Storeからダウンロード
            </Button>
            <Button 
              size="lg" 
              className="bg-white text-gray-800 hover:bg-gray-100"
              onClick={handleAppDownload}
            >
              <Smartphone className="mr-2 h-5 w-5" />
              Google Playからダウンロード
            </Button>
          </div>
        </div>
      </section>

      {/* フッター */}
      <footer className="py-12 px-4 bg-gray-900 text-white">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Dog className="h-6 w-6 text-orange-500" />
                <span className="font-bold text-lg">DogPark.jp</span>
              </div>
              <p className="text-gray-400">
                愛犬と飼い主さんの笑顔のために。<br />
                全国の愛犬家コミュニティプラットフォーム。
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">サービス</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link to="/parks" className="hover:text-white transition-colors">ドッグラン検索・予約</Link></li>
                <li><Link to="/community" className="hover:text-white transition-colors">コミュニティ機能</Link></li>
                <li><Link to="/facilities" className="hover:text-white transition-colors">施設情報・レビュー</Link></li>
                <li><a href="#" className="hover:text-white transition-colors">イベント・オフ会</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">サポート</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">よくある質問</a></li>
                <li><Link to="/contact" className="hover:text-white transition-colors">お問い合わせ</Link></li>
                <li><Link to="/terms-of-service" className="hover:text-white transition-colors">利用規約</Link></li>
                <li><Link to="/privacy-policy" className="hover:text-white transition-colors">プライバシーポリシー</Link></li>
                <li><Link to="/admin" className="hover:text-white transition-colors">管理者ページ</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">フォローする</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#" className="hover:text-white transition-colors flex items-center">
                    <Twitter className="mr-2 h-4 w-4" />
                    公式Twitter
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors flex items-center">
                    <Instagram className="mr-2 h-4 w-4" />
                    Instagram
                  </a>
                </li>
                <li><a href="#" className="hover:text-white transition-colors">運営会社</a></li>
                <li><a href="#" className="hover:text-white transition-colors">採用情報</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8 text-center text-gray-400">
            <p>&copy; 2025 DogPark.jp. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}