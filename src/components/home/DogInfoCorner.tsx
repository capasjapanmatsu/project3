import { Link } from 'react-router-dom';
import Button from '../Button';
import Card from '../Card';

interface DogInfoCard {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'health' | 'training' | 'walk' | 'food' | 'care';
  link: string;
  color: string;
}

const dogInfoCards: DogInfoCard[] = [
  {
    id: 'health',
    title: '健康管理',
    description: 'ワクチン接種、定期検診、病気の予防について詳しく解説します。',
    icon: '🏥',
    category: 'health',
    link: '/dog-info/vaccine',
    color: 'bg-red-50 border-red-200 hover:bg-red-100'
  },
  {
    id: 'training',
    title: 'しつけのコツ',
    description: '基本的なコマンドから問題行動の改善まで、効果的なしつけ方法を紹介。',
    icon: '🎓',
    category: 'training',
    link: '/dog-info/training',
    color: 'bg-blue-50 border-blue-200 hover:bg-blue-100'
  },
  {
    id: 'walk',
    title: 'お散歩ガイド',
    description: '安全で楽しいお散歩の方法、適切な運動量、散歩コースの選び方。',
    icon: '🐕',
    category: 'walk',
    link: '/dog-info/walk',
    color: 'bg-green-50 border-green-200 hover:bg-green-100'
  },
  {
    id: 'food',
    title: '食事・栄養',
    description: '年齢や体調に合わせた食事選び、栄養バランス、おやつの与え方。',
    icon: '🍖',
    category: 'food',
    link: '/dog-info/food',
    color: 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100'
  },
  {
    id: 'care',
    title: 'お手入れ',
    description: 'ブラッシング、爪切り、歯磨きなど、日常のお手入れ方法を解説。',
    icon: '🛁',
    category: 'care',
    link: '/dog-info/care',
    color: 'bg-purple-50 border-purple-200 hover:bg-purple-100'
  },
  {
    id: 'breeds',
    title: '犬種図鑑',
    description: '人気の犬種から珍しい犬種まで、特徴や性格、飼育のポイントを紹介。',
    icon: '📚',
    category: 'health',
    link: '/dog-info/breeds',
    color: 'bg-indigo-50 border-indigo-200 hover:bg-indigo-100'
  }
];

export function DogInfoCorner() {
  return (
    <section className="py-12 bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ヘッダー */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <span className="text-4xl mr-3">🐕</span>
            <h2 className="text-3xl font-bold text-gray-900">
              ワンちゃん情報発信コーナー
            </h2>
            <span className="text-4xl ml-3">📚</span>
          </div>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            愛犬との暮らしをもっと楽しく、もっと健康に。専門家監修の情報で、
            ワンちゃんとの絆を深めましょう。
          </p>
        </div>

        {/* カードグリッド */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {dogInfoCards.map((card) => (
            <Card
              key={card.id}
              className={`${card.color} transition-all duration-300 transform hover:scale-105 hover:shadow-lg border-2`}
            >
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <span className="text-3xl mr-3">{card.icon}</span>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {card.title}
                  </h3>
                </div>
                <p className="text-gray-600 mb-4 leading-relaxed">
                  {card.description}
                </p>
                <Link to={card.link}>
                  <Button
                    variant="outline"
                    className="w-full border-gray-300 hover:bg-gray-50"
                  >
                    詳しく見る →
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>

        {/* 特集セクション */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <div className="text-center mb-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              🎯 今月の特集
            </h3>
            <p className="text-gray-600">
              季節に合わせたワンちゃんケアのポイント
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">🌡️</span>
                </div>
              </div>
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  夏の暑さ対策
                </h4>
                <p className="text-gray-600 text-sm leading-relaxed">
                  熱中症予防、適切な水分補給、涼しい散歩時間帯の選び方など、
                  夏を快適に過ごすためのポイントを詳しく解説します。
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">🏃</span>
                </div>
              </div>
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  室内運動のアイデア
                </h4>
                <p className="text-gray-600 text-sm leading-relaxed">
                  雨の日や暑い日でもできる室内での運動方法、
                  知育玩具を使った遊び方、ストレス解消のコツを紹介。
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* コミュニティセクション */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-8 text-white">
          <div className="text-center">
            <h3 className="text-2xl font-bold mb-4">
              🐾 ワンちゃん仲間とつながろう
            </h3>
            <p className="text-lg mb-6 opacity-90">
              同じ犬種の飼い主さんや近所のワンちゃん仲間と
              情報交換やお散歩仲間を見つけませんか？
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/community">
                <Button className="bg-pink-600 text-white hover:bg-pink-700 border-pink-600">
                  コミュニティに参加
                </Button>
              </Link>
              <Link to="/dog-park-list">
                <Button variant="outline" className="border-white text-white hover:bg-white hover:text-purple-600">
                  近くのドッグパークを探す
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* ニュースレター登録 */}
        <div className="mt-8 bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              📧 最新情報をお届け
            </h3>
            <p className="text-gray-600 mb-6">
              ワンちゃんの健康やしつけの最新情報をメールでお届けします
            </p>
            <div className="max-w-md mx-auto">
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="メールアドレスを入力"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <Button className="bg-blue-600 hover:bg-blue-700">
                  登録
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                プライバシーポリシーに同意の上、登録してください
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
} 