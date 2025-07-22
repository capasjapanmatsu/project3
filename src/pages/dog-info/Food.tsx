import { AlertTriangle, ArrowLeft, Clock, Heart, Scale, Utensils } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '../../components/Button';
import Card from '../../components/Card';

export function Food() {
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
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mr-4">
              <Utensils className="w-6 h-6 text-yellow-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">食事・栄養</h1>
          </div>
          <p className="text-lg text-gray-600">
            愛犬の健康を支える食事について詳しくご紹介します。年齢や体調に合わせた適切な食事選びで、ワンちゃんの健康を守りましょう。
          </p>
        </div>

        {/* メインコンテンツ */}
        <div className="space-y-8">
          {/* 基本栄養素 */}
          <Card className="p-6">
            <div className="flex items-center mb-4">
              <Heart className="w-6 h-6 text-red-600 mr-3" />
              <h2 className="text-2xl font-semibold text-gray-900">基本栄養素</h2>
            </div>
            <div className="prose max-w-none">
              <h3 className="text-lg font-medium text-gray-800 mb-3">犬に必要な栄養素</h3>
              <div className="grid md:grid-cols-2 gap-6 mb-4">
                <div className="bg-red-50 p-4 rounded-lg">
                  <h4 className="font-medium text-red-900 mb-2">🥩 タンパク質</h4>
                  <ul className="text-sm text-red-800 space-y-1">
                    <li>• 筋肉や臓器の構成要素</li>
                    <li>• 免疫機能の維持</li>
                    <li>• エネルギー源</li>
                    <li>• 体重の25-30%必要</li>
                  </ul>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">🍞 炭水化物</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• 主要なエネルギー源</li>
                    <li>• 食物繊維の供給</li>
                    <li>• 腸内環境の改善</li>
                    <li>• 体重の30-70%必要</li>
                  </ul>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">🧈 脂質</h4>
                  <ul className="text-sm text-green-800 space-y-1">
                    <li>• 高エネルギー源</li>
                    <li>• 脂溶性ビタミンの吸収</li>
                    <li>• 皮膚・被毛の健康</li>
                    <li>• 体重の10-25%必要</li>
                  </ul>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h4 className="font-medium text-purple-900 mb-2">🥬 ビタミン・ミネラル</h4>
                  <ul className="text-sm text-purple-800 space-y-1">
                    <li>• 代謝の調節</li>
                    <li>• 骨格の形成</li>
                    <li>• 免疫機能の維持</li>
                    <li>• 微量でも重要</li>
                  </ul>
                </div>
              </div>
            </div>
          </Card>

          {/* 年齢別の食事 */}
          <Card className="p-6">
            <div className="flex items-center mb-4">
              <Clock className="w-6 h-6 text-blue-600 mr-3" />
              <h2 className="text-2xl font-semibold text-gray-900">年齢別の食事</h2>
            </div>
            <div className="prose max-w-none">
              <h3 className="text-lg font-medium text-gray-800 mb-3">ライフステージ別の食事選び</h3>
              <div className="grid md:grid-cols-3 gap-4 mb-4">
                <div className="bg-pink-50 p-4 rounded-lg">
                  <h4 className="font-medium text-pink-900 mb-2">子犬期（2-12ヶ月）</h4>
                  <ul className="text-sm text-pink-800 space-y-1">
                    <li>• 高タンパク・高カロリー</li>
                    <li>• 1日3-4回の給餌</li>
                    <li>• 成長期用フード</li>
                    <li>• カルシウム豊富</li>
                  </ul>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">成犬期（1-7歳）</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• バランスの取れた栄養</li>
                    <li>• 1日2回の給餌</li>
                    <li>• 成犬用フード</li>
                    <li>• 適度なカロリー</li>
                  </ul>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <h4 className="font-medium text-orange-900 mb-2">シニア期（7歳以上）</h4>
                  <ul className="text-sm text-orange-800 space-y-1">
                    <li>• 低カロリー・高タンパク</li>
                    <li>• 1日2-3回の給餌</li>
                    <li>• シニア用フード</li>
                    <li>• 関節サポート成分</li>
                  </ul>
                </div>
              </div>

              <h3 className="text-lg font-medium text-gray-800 mb-3">給餌量の目安</h3>
              <div className="grid md:grid-cols-2 gap-6 mb-4">
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">🐕 小型犬（5kg以下）</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• 子犬期: 100-200g/日</li>
                    <li>• 成犬期: 80-150g/日</li>
                    <li>• シニア期: 60-120g/日</li>
                    <li>• 活動量で調整</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">🐕 中型犬（5-25kg）</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• 子犬期: 200-400g/日</li>
                    <li>• 成犬期: 150-300g/日</li>
                    <li>• シニア期: 120-250g/日</li>
                    <li>• 体重で調整</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">🐕 大型犬（25kg以上）</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• 子犬期: 400-800g/日</li>
                    <li>• 成犬期: 300-600g/日</li>
                    <li>• シニア期: 250-500g/日</li>
                    <li>• 運動量で調整</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">💡 給餌量の調整</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• 体重の変化をチェック</li>
                    <li>• 活動量に応じて調整</li>
                    <li>• 季節による調整</li>
                    <li>• 獣医師に相談</li>
                  </ul>
                </div>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg">
                <h4 className="font-medium text-yellow-900 mb-2">⚠️ 注意点</h4>
                <ul className="text-sm text-yellow-800 space-y-1">
                  <li>• <strong>急な変更は避ける</strong> - 1週間かけて徐々に</li>
                  <li>• <strong>新鮮な水</strong> - 常に清潔な水を提供</li>
                  <li>• <strong>食事時間</strong> - 規則正しい時間に</li>
                  <li>• <strong>食べ残し</strong> - 30分で片付ける</li>
                </ul>
              </div>
            </div>
          </Card>

          {/* 食事の種類 */}
          <Card className="p-6">
            <div className="flex items-center mb-4">
              <Utensils className="w-6 h-6 text-green-600 mr-3" />
              <h2 className="text-2xl font-semibold text-gray-900">食事の種類</h2>
            </div>
            <div className="prose max-w-none">
              <h3 className="text-lg font-medium text-gray-800 mb-3">ドッグフードの種類</h3>
              <div className="space-y-4 mb-4">
                <div className="border-l-4 border-blue-500 pl-4">
                  <h4 className="font-medium text-gray-800 mb-2">🥫 ドライフード</h4>
                  <p className="text-sm text-gray-600 mb-2">最も一般的で栄養バランスが良い</p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• 保存が簡単</li>
                    <li>• 栄養バランスが良い</li>
                    <li>• 歯の健康に良い</li>
                    <li>• コストパフォーマンスが良い</li>
                  </ul>
                </div>
                <div className="border-l-4 border-green-500 pl-4">
                  <h4 className="font-medium text-gray-800 mb-2">🍖 ウェットフード</h4>
                  <p className="text-sm text-gray-600 mb-2">水分が多く、嗜好性が高い</p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• 嗜好性が高い</li>
                    <li>• 水分補給になる</li>
                    <li>• 消化しやすい</li>
                    <li>• 高齢犬に適している</li>
                  </ul>
                </div>
                <div className="border-l-4 border-purple-500 pl-4">
                  <h4 className="font-medium text-gray-800 mb-2">🥗 手作り食</h4>
                  <p className="text-sm text-gray-600 mb-2">愛情たっぷりだが栄養管理が重要</p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• 愛情を込められる</li>
                    <li>• 食材を選べる</li>
                    <li>• 栄養バランスの管理が必要</li>
                    <li>• 時間と手間がかかる</li>
                  </ul>
                </div>
                <div className="border-l-4 border-orange-500 pl-4">
                  <h4 className="font-medium text-gray-800 mb-2">🌱 生食（BARF）</h4>
                  <p className="text-sm text-gray-600 mb-2">自然に近い食事だが注意が必要</p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• 自然に近い食事</li>
                    <li>• 消化酵素が豊富</li>
                    <li>• 衛生管理が重要</li>
                    <li>• 専門知識が必要</li>
                  </ul>
                </div>
              </div>
            </div>
          </Card>

          {/* おやつとトッピング */}
          <Card className="p-6">
            <div className="flex items-center mb-4">
              <Scale className="w-6 h-6 text-yellow-600 mr-3" />
              <h2 className="text-2xl font-semibold text-gray-900">おやつとトッピング</h2>
            </div>
            <div className="prose max-w-none">
              <h3 className="text-lg font-medium text-gray-800 mb-3">おやつの与え方</h3>
              <div className="grid md:grid-cols-2 gap-6 mb-4">
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">✅ 良いおやつ</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• 市販の犬用おやつ</li>
                    <li>• 茹でた鶏肉（無塩）</li>
                    <li>• 茹でた野菜（人参、ブロッコリー）</li>
                    <li>• 果物（リンゴ、バナナ）</li>
                    <li>• チーズ（少量）</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">❌ 避けるべき食べ物</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• チョコレート</li>
                    <li>• 玉ねぎ、ニンニク</li>
                    <li>• ブドウ、レーズン</li>
                    <li>• アボカド</li>
                    <li>• ナッツ類</li>
                    <li>• 人間用の加工食品</li>
                  </ul>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">💡 おやつの与え方のコツ</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• <strong>量の制限</strong> - 1日のカロリーの10%以下</li>
                  <li>• <strong>タイミング</strong> - しつけのご褒美として</li>
                  <li>• <strong>サイズ</strong> - 小さく切って与える</li>
                  <li>• <strong>頻度</strong> - 1日2-3回まで</li>
                </ul>
              </div>
            </div>
          </Card>

          {/* 食事の問題 */}
          <Card className="p-6">
            <div className="flex items-center mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600 mr-3" />
              <h2 className="text-2xl font-semibold text-gray-900">食事の問題と対処法</h2>
            </div>
            <div className="prose max-w-none">
              <h3 className="text-lg font-medium text-gray-800 mb-3">よくある食事の問題</h3>
              <div className="space-y-4 mb-4">
                <div className="border-l-4 border-red-500 pl-4">
                  <h4 className="font-medium text-gray-800 mb-2">🍽️ 食欲不振</h4>
                  <p className="text-sm text-gray-600 mb-2">原因：体調不良、ストレス、フードの好み</p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• 体調をチェック</li>
                    <li>• フードを温める</li>
                    <li>• トッピングを試す</li>
                    <li>• 獣医師に相談</li>
                  </ul>
                </div>
                <div className="border-l-4 border-orange-500 pl-4">
                  <h4 className="font-medium text-gray-800 mb-2">🤢 嘔吐・下痢</h4>
                  <p className="text-sm text-gray-600 mb-2">原因：食べ過ぎ、アレルギー、体調不良</p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• 12時間絶食</li>
                    <li>• 少量の水を与える</li>
                    <li>• 消化しやすい食事</li>
                    <li>• 症状が続く場合は受診</li>
                  </ul>
                </div>
                <div className="border-l-4 border-yellow-500 pl-4">
                  <h4 className="font-medium text-gray-800 mb-2">🍖 偏食</h4>
                  <p className="text-sm text-gray-600 mb-2">原因：おやつの与えすぎ、フードの変更</p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• おやつを減らす</li>
                    <li>• 食事時間を決める</li>
                    <li>• 食べ残しは片付ける</li>
                    <li>• 根気強く待つ</li>
                  </ul>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* ナビゲーション */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/dog-info/walk">
              <Button variant="outline" className="w-full sm:w-auto">
                ← お散歩ガイド
              </Button>
            </Link>
            <Link to="/dog-info/care">
              <Button variant="outline" className="w-full sm:w-auto">
                お手入れ →
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Food; 