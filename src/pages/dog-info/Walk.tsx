import { ArrowLeft, Clock, Heart, MapPin, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '../../components/Button';
import Card from '../../components/Card';

export function Walk() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <Link to="/" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            トップページに戻る
          </Link>
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-4">
              <MapPin className="w-6 h-6 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">お散歩ガイド</h1>
          </div>
          <p className="text-lg text-gray-600">
            愛犬との楽しいお散歩のための完全ガイド。安全で効果的な散歩方法から、適切な運動量まで詳しくご紹介します。
          </p>
        </div>

        {/* メインコンテンツ */}
        <div className="space-y-8">
          {/* 散歩の基本 */}
          <Card className="p-6">
            <div className="flex items-center mb-4">
              <Heart className="w-6 h-6 text-red-600 mr-3" />
              <h2 className="text-2xl font-semibold text-gray-900">散歩の基本</h2>
            </div>
            <div className="prose max-w-none">
              <h3 className="text-lg font-medium text-gray-800 mb-3">散歩の重要性</h3>
              <div className="grid md:grid-cols-2 gap-6 mb-4">
                <div className="bg-red-50 p-4 rounded-lg">
                  <h4 className="font-medium text-red-900 mb-2">🏃 運動効果</h4>
                  <ul className="text-sm text-red-800 space-y-1">
                    <li>• 筋肉の発達</li>
                    <li>• 関節の健康維持</li>
                    <li>• 肥満の防止</li>
                    <li>• 体力の向上</li>
                  </ul>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">🧠 精神面</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• ストレス解消</li>
                    <li>• 好奇心の満足</li>
                    <li>• 社会化の促進</li>
                    <li>• 飼い主との絆強化</li>
                  </ul>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">🌍 環境適応</h4>
                  <ul className="text-sm text-green-800 space-y-1">
                    <li>• 外の世界に慣れる</li>
                    <li>• 様々な音や匂いの経験</li>
                    <li>• 他の犬や人との接触</li>
                    <li>• 新しい場所への適応</li>
                  </ul>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h4 className="font-medium text-purple-900 mb-2">🏠 行動改善</h4>
                  <ul className="text-sm text-purple-800 space-y-1">
                    <li>• 無駄吠えの減少</li>
                    <li>• 破壊行動の防止</li>
                    <li>• トイレの習慣化</li>
                    <li>• 落ち着いた行動</li>
                  </ul>
                </div>
              </div>
            </div>
          </Card>

          {/* 適切な運動量 */}
          <Card className="p-6">
            <div className="flex items-center mb-4">
              <Clock className="w-6 h-6 text-blue-600 mr-3" />
              <h2 className="text-2xl font-semibold text-gray-900">適切な運動量</h2>
            </div>
            <div className="prose max-w-none">
              <h3 className="text-lg font-medium text-gray-800 mb-3">年齢・犬種別の散歩時間</h3>
              <div className="grid md:grid-cols-3 gap-4 mb-4">
                <div className="bg-pink-50 p-4 rounded-lg">
                  <h4 className="font-medium text-pink-900 mb-2">子犬期（2-6ヶ月）</h4>
                  <ul className="text-sm text-pink-800 space-y-1">
                    <li>• 1回15-30分</li>
                    <li>• 1日2-3回</li>
                    <li>• ゆっくり歩く</li>
                    <li>• 休憩を多めに</li>
                  </ul>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">成犬期（1-7歳）</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• 1回30-60分</li>
                    <li>• 1日2回</li>
                    <li>• 犬種に応じて調整</li>
                    <li>• 活発な運動も</li>
                  </ul>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <h4 className="font-medium text-orange-900 mb-2">シニア期（7歳以上）</h4>
                  <ul className="text-sm text-orange-800 space-y-1">
                    <li>• 1回20-40分</li>
                    <li>• 1日1-2回</li>
                    <li>• ゆっくり歩く</li>
                    <li>• 体調に注意</li>
                  </ul>
                </div>
              </div>

              <h3 className="text-lg font-medium text-gray-800 mb-3">犬種別の運動量</h3>
              <div className="grid md:grid-cols-2 gap-6 mb-4">
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">🐕 大型犬（ラブラドール、ゴールデンなど）</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• 1日60-90分の運動</li>
                    <li>• ボール遊びや水泳</li>
                    <li>• アジリティなどのスポーツ</li>
                    <li>• 知的な刺激も重要</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">🐕 中型犬（柴犬、コーギーなど）</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• 1日30-60分の運動</li>
                    <li>• 活発な散歩</li>
                    <li>• 追いかけっこ</li>
                    <li>• 嗅覚を使った遊び</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">🐕 小型犬（チワワ、トイプードルなど）</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• 1日20-40分の運動</li>
                    <li>• 室内での遊びも重要</li>
                    <li>• 短時間の散歩</li>
                    <li>• 抱っこ散歩もOK</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">🐕 超小型犬（ポメラニアン、ヨークシャーなど）</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• 1日15-30分の運動</li>
                    <li>• 室内での運動中心</li>
                    <li>• 短い散歩</li>
                    <li>• 抱っこ散歩が主流</li>
                  </ul>
                </div>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg">
                <h4 className="font-medium text-yellow-900 mb-2">⚠️ 注意点</h4>
                <ul className="text-sm text-yellow-800 space-y-1">
                  <li>• <strong>天候</strong> - 暑い日は早朝や夕方に</li>
                  <li>• <strong>体調</strong> - 元気がない日は控えめに</li>
                  <li>• <strong>年齢</strong> - 子犬やシニアは無理をさせない</li>
                  <li>• <strong>犬種</strong> - 短頭種は暑さに弱い</li>
                </ul>
              </div>
            </div>
          </Card>

          {/* 安全な散歩方法 */}
          <Card className="p-6">
            <div className="flex items-center mb-4">
              <Shield className="w-6 h-6 text-green-600 mr-3" />
              <h2 className="text-2xl font-semibold text-gray-900">安全な散歩方法</h2>
            </div>
            <div className="prose max-w-none">
              <h3 className="text-lg font-medium text-gray-800 mb-3">散歩前の準備</h3>
              <div className="grid md:grid-cols-2 gap-6 mb-4">
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">🎒 持ち物チェック</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• リード（適切な長さ）</li>
                    <li>• 首輪・ハーネス</li>
                    <li>• おやつ（しつけ用）</li>
                    <li>• ビニール袋（排泄物用）</li>
                    <li>• 水（暑い日）</li>
                    <li>• 迷子札の確認</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">🏥 健康チェック</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• 元気があるか</li>
                    <li>• 食欲はあるか</li>
                    <li>• 排泄は正常か</li>
                    <li>• 歩き方はおかしくないか</li>
                    <li>• 呼吸は正常か</li>
                  </ul>
                </div>
              </div>

              <h3 className="text-lg font-medium text-gray-800 mb-3">散歩中の注意点</h3>
              <div className="space-y-4 mb-4">
                <div className="border-l-4 border-red-500 pl-4">
                  <h4 className="font-medium text-gray-800 mb-2">🚗 交通事故の防止</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• 必ずリードを付ける</li>
                    <li>• 道路では短めに持つ</li>
                    <li>• 信号を守る</li>
                    <li>• 車の音に注意</li>
                  </ul>
                </div>
                <div className="border-l-4 border-orange-500 pl-4">
                  <h4 className="font-medium text-gray-800 mb-2">🐕 他の犬との接触</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• 相手の飼い主に確認</li>
                    <li>• リードを短く持つ</li>
                    <li>• 喧嘩の兆候があれば避ける</li>
                    <li>• 子犬は特に注意</li>
                  </ul>
                </div>
                <div className="border-l-4 border-yellow-500 pl-4">
                  <h4 className="font-medium text-gray-800 mb-2">🌡️ 熱中症の防止</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• 暑い時間帯を避ける</li>
                    <li>• アスファルトの温度に注意</li>
                    <li>• 水分補給を忘れずに</li>
                    <li>• 短頭種は特に注意</li>
                  </ul>
                </div>
                <div className="border-l-4 border-green-500 pl-4">
                  <h4 className="font-medium text-gray-800 mb-2">🍃 有害物質の防止</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• 拾い食いをさせない</li>
                    <li>• 除草剤が撒かれた場所を避ける</li>
                    <li>• 毒物の可能性があるものに注意</li>
                    <li>• 排泄物は必ず持ち帰る</li>
                  </ul>
                </div>
              </div>
            </div>
          </Card>

          {/* 散歩コースの選び方 */}
          <Card className="p-6">
            <div className="flex items-center mb-4">
              <MapPin className="w-6 h-6 text-purple-600 mr-3" />
              <h2 className="text-2xl font-semibold text-gray-900">散歩コースの選び方</h2>
            </div>
            <div className="prose max-w-none">
              <h3 className="text-lg font-medium text-gray-800 mb-3">おすすめの散歩場所</h3>
              <div className="grid md:grid-cols-2 gap-6 mb-4">
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">🌳 公園・緑地</h4>
                  <ul className="text-sm text-green-800 space-y-1">
                    <li>• 安全で広いスペース</li>
                    <li>• 他の犬との交流</li>
                    <li>• 自然な刺激</li>
                    <li>• 遊具での遊び</li>
                  </ul>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">🏘️ 住宅街</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• 人や車に慣れる</li>
                    <li>• 様々な音の経験</li>
                    <li>• 社会化の促進</li>
                    <li>• 安全な環境</li>
                  </ul>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h4 className="font-medium text-purple-900 mb-2">🏪 商店街</h4>
                  <ul className="text-sm text-purple-800 space-y-1">
                    <li>• 人混みに慣れる</li>
                    <li>• 様々な匂いの経験</li>
                    <li>• 社会化の促進</li>
                    <li>• 注意が必要</li>
                  </ul>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <h4 className="font-medium text-orange-900 mb-2">🌊 河川敷・海辺</h4>
                  <ul className="text-sm text-orange-800 space-y-1">
                    <li>• 広々とした空間</li>
                    <li>• 水遊びの機会</li>
                    <li>• 自然との触れ合い</li>
                    <li>• 季節に応じて</li>
                  </ul>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">💡 コース選びのポイント</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• <strong>安全第一</strong> - 車の通りが少ない場所</li>
                  <li>• <strong>年齢に応じて</strong> - 子犬は短いコースから</li>
                  <li>• <strong>天候を考慮</strong> - 雨の日は短めに</li>
                  <li>• <strong>時間帯を考慮</strong> - 暑い日は早朝や夕方</li>
                  <li>• <strong>犬の好み</strong> - 好きな場所を組み込む</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>

        {/* ナビゲーション */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/dog-info/training">
              <Button variant="outline" className="w-full sm:w-auto">
                ← しつけのコツ
              </Button>
            </Link>
            <Link to="/dog-info/food">
              <Button variant="outline" className="w-full sm:w-auto">
                食事・栄養 →
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Walk; 