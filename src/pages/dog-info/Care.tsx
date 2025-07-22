import { ArrowLeft, Brush, Clock, Droplets, Scissors } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '../../components/Button';
import Card from '../../components/Card';

export function Care() {
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
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mr-4">
              <Scissors className="w-6 h-6 text-purple-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">お手入れ</h1>
          </div>
          <p className="text-lg text-gray-600">
            愛犬の健康と美しさを保つための日常的なお手入れ方法をご紹介します。定期的なお手入れで、ワンちゃんとの絆も深まります。
          </p>
        </div>

        {/* メインコンテンツ */}
        <div className="space-y-8">
          {/* ブラッシング */}
          <Card className="p-6">
            <div className="flex items-center mb-4">
              <Brush className="w-6 h-6 text-blue-600 mr-3" />
              <h2 className="text-2xl font-semibold text-gray-900">ブラッシング</h2>
            </div>
            <div className="prose max-w-none">
              <h3 className="text-lg font-medium text-gray-800 mb-3">ブラッシングの重要性</h3>
              <div className="grid md:grid-cols-2 gap-6 mb-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">🧹 物理的な効果</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• 抜け毛の除去</li>
                    <li>• 毛玉の防止</li>
                    <li>• 皮膚の血行促進</li>
                    <li>• 被毛の艶を保つ</li>
                  </ul>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">💕 精神的な効果</h4>
                  <ul className="text-sm text-green-800 space-y-1">
                    <li>• 飼い主とのスキンシップ</li>
                    <li>• リラックス効果</li>
                    <li>• 信頼関係の構築</li>
                    <li>• ストレス解消</li>
                  </ul>
                </div>
              </div>

              <h3 className="text-lg font-medium text-gray-800 mb-3">ブラッシングの方法</h3>
              <div className="grid md:grid-cols-2 gap-6 mb-4">
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">🛠️ 必要な道具</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• スリッカーブラシ（長毛種）</li>
                    <li>• ラバーブラシ（短毛種）</li>
                    <li>• コーム（細かい部分用）</li>
                    <li>• スプレー（必要に応じて）</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">📋 ブラッシングの手順</h4>
                  <ol className="text-sm text-gray-600 space-y-1">
                    <li>1. 落ち着いた環境で行う</li>
                    <li>2. 優しく撫でてリラックス</li>
                    <li>3. 毛の流れに沿ってブラッシング</li>
                    <li>4. 痛がる部分は避ける</li>
                    <li>5. 終わったら褒める</li>
                  </ol>
                </div>
              </div>

              <h3 className="text-lg font-medium text-gray-800 mb-3">犬種別のブラッシング頻度</h3>
              <div className="grid md:grid-cols-3 gap-4 mb-4">
                <div className="bg-pink-50 p-4 rounded-lg">
                  <h4 className="font-medium text-pink-900 mb-2">長毛種</h4>
                  <ul className="text-sm text-pink-800 space-y-1">
                    <li>• 毎日ブラッシング</li>
                    <li>• 毛玉に注意</li>
                    <li>• トリミングも必要</li>
                    <li>• 例：ポメラニアン、マルチーズ</li>
                  </ul>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">中毛種</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• 週2-3回ブラッシング</li>
                    <li>• 換毛期は毎日</li>
                    <li>• 適度な手入れ</li>
                    <li>• 例：柴犬、コーギー</li>
                  </ul>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">短毛種</h4>
                  <ul className="text-sm text-green-800 space-y-1">
                    <li>• 週1-2回ブラッシング</li>
                    <li>• ラバーブラシ使用</li>
                    <li>• 簡単な手入れ</li>
                    <li>• 例：チワワ、ダックスフント</li>
                  </ul>
                </div>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg">
                <h4 className="font-medium text-yellow-900 mb-2">💡 ブラッシングのコツ</h4>
                <ul className="text-sm text-yellow-800 space-y-1">
                  <li>• <strong>短時間から始める</strong> - 5分程度から徐々に延長</li>
                  <li>• <strong>優しく行う</strong> - 痛がらないよう注意</li>
                  <li>• <strong>褒めながら</strong> - 良い体験にさせる</li>
                  <li>• <strong>定期的に</strong> - 習慣化する</li>
                </ul>
              </div>
            </div>
          </Card>

          {/* 爪切り */}
          <Card className="p-6">
            <div className="flex items-center mb-4">
              <Scissors className="w-6 h-6 text-red-600 mr-3" />
              <h2 className="text-2xl font-semibold text-gray-900">爪切り</h2>
            </div>
            <div className="prose max-w-none">
              <h3 className="text-lg font-medium text-gray-800 mb-3">爪切りの重要性</h3>
              <div className="grid md:grid-cols-2 gap-6 mb-4">
                <div className="bg-red-50 p-4 rounded-lg">
                  <h4 className="font-medium text-red-900 mb-2">🏃 健康面</h4>
                  <ul className="text-sm text-red-800 space-y-1">
                    <li>• 歩行の安定性</li>
                    <li>• 関節への負担軽減</li>
                    <li>• 爪の変形防止</li>
                    <li>• 怪我の防止</li>
                  </ul>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">🏠 生活面</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• フローリングの傷防止</li>
                    <li>• 家具の傷防止</li>
                    <li>• 人への怪我防止</li>
                    <li>• 快適な生活</li>
                  </ul>
                </div>
              </div>

              <h3 className="text-lg font-medium text-gray-800 mb-3">爪切りの方法</h3>
              <div className="grid md:grid-cols-2 gap-6 mb-4">
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">🛠️ 必要な道具</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• 犬用爪切り</li>
                    <li>• 爪やすり</li>
                    <li>• 止血剤（万が一のため）</li>
                    <li>• おやつ（ご褒美用）</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">📋 爪切りの手順</h4>
                  <ol className="text-sm text-gray-600 space-y-1">
                    <li>1. 落ち着いた環境で行う</li>
                    <li>2. 足を優しく持つ</li>
                    <li>3. 爪の血管を確認</li>
                    <li>4. 少しずつ切る</li>
                    <li>5. やすりで整える</li>
                  </ol>
                </div>
              </div>

              <div className="bg-red-50 p-4 rounded-lg">
                <h4 className="font-medium text-red-900 mb-2">⚠️ 注意点</h4>
                <ul className="text-sm text-red-800 space-y-1">
                  <li>• <strong>血管を切らない</strong> - ピンクの部分は避ける</li>
                  <li>• <strong>少しずつ切る</strong> - 一度に多く切らない</li>
                  <li>• <strong>嫌がる場合は獣医師に</strong> - 無理をしない</li>
                  <li>• <strong>黒い爪は特に注意</strong> - 血管が見えない</li>
                </ul>
              </div>
            </div>
          </Card>

          {/* 歯磨き */}
          <Card className="p-6">
            <div className="flex items-center mb-4">
              <Brush className="w-6 h-6 text-green-600 mr-3" />
              <h2 className="text-2xl font-semibold text-gray-900">歯磨き</h2>
            </div>
            <div className="prose max-w-none">
              <h3 className="text-lg font-medium text-gray-800 mb-3">歯磨きの重要性</h3>
              <div className="grid md:grid-cols-2 gap-6 mb-4">
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">🦷 口腔衛生</h4>
                  <ul className="text-sm text-green-800 space-y-1">
                    <li>• 歯石の防止</li>
                    <li>• 口臭の改善</li>
                    <li>• 歯周病の予防</li>
                    <li>• 虫歯の防止</li>
                  </ul>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">❤️ 全身の健康</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• 心臓病のリスク軽減</li>
                    <li>• 腎臓病のリスク軽減</li>
                    <li>• 食欲の維持</li>
                    <li>• 長寿につながる</li>
                  </ul>
                </div>
              </div>

              <h3 className="text-lg font-medium text-gray-800 mb-3">歯磨きの方法</h3>
              <div className="grid md:grid-cols-2 gap-6 mb-4">
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">🛠️ 必要な道具</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• 犬用歯ブラシ</li>
                    <li>• 犬用歯磨き粉</li>
                    <li>• ガーゼ（慣れるまで）</li>
                    <li>• おやつ（ご褒美用）</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">📋 歯磨きの手順</h4>
                  <ol className="text-sm text-gray-600 space-y-1">
                    <li>1. 口周りを触る練習</li>
                    <li>2. 歯磨き粉を舐めさせる</li>
                    <li>3. 前歯から始める</li>
                    <li>4. 奥歯まで徐々に</li>
                    <li>5. 終わったら褒める</li>
                  </ol>
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-medium text-green-900 mb-2">💡 歯磨きのコツ</h4>
                <ul className="text-sm text-green-800 space-y-1">
                  <li>• <strong>子犬期から始める</strong> - 慣れやすい</li>
                  <li>• <strong>短時間から</strong> - 30秒程度から</li>
                  <li>• <strong>毎日行う</strong> - 習慣化が重要</li>
                  <li>• <strong>嫌がる場合は獣医師に相談</strong></li>
                </ul>
              </div>
            </div>
          </Card>

          {/* 耳掃除 */}
          <Card className="p-6">
            <div className="flex items-center mb-4">
              <Droplets className="w-6 h-6 text-purple-600 mr-3" />
              <h2 className="text-2xl font-semibold text-gray-900">耳掃除</h2>
            </div>
            <div className="prose max-w-none">
              <h3 className="text-lg font-medium text-gray-800 mb-3">耳掃除の重要性</h3>
              <div className="grid md:grid-cols-2 gap-6 mb-4">
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h4 className="font-medium text-purple-900 mb-2">👂 耳の健康</h4>
                  <ul className="text-sm text-purple-800 space-y-1">
                    <li>• 耳垢の除去</li>
                    <li>• 外耳炎の予防</li>
                    <li>• 耳ダニの早期発見</li>
                    <li>• 耳の臭いの改善</li>
                  </ul>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">🔍 健康チェック</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• 耳の状態確認</li>
                    <li>• 異常の早期発見</li>
                    <li>• 獣医師への相談</li>
                    <li>• 予防医療の一環</li>
                  </ul>
                </div>
              </div>

              <h3 className="text-lg font-medium text-gray-800 mb-3">耳掃除の方法</h3>
              <div className="grid md:grid-cols-2 gap-6 mb-4">
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">🛠️ 必要な道具</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• 犬用耳掃除液</li>
                    <li>• コットン</li>
                    <li>• 綿棒（必要に応じて）</li>
                    <li>• おやつ（ご褒美用）</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">📋 耳掃除の手順</h4>
                  <ol className="text-sm text-gray-600 space-y-1">
                    <li>1. 耳の状態を確認</li>
                    <li>2. 耳掃除液を数滴入れる</li>
                    <li>3. 耳の付け根をマッサージ</li>
                    <li>4. コットンで拭き取る</li>
                    <li>5. 乾燥させる</li>
                  </ol>
                </div>
              </div>

              <div className="bg-red-50 p-4 rounded-lg">
                <h4 className="font-medium text-red-900 mb-2">⚠️ 注意点</h4>
                <ul className="text-sm text-red-800 space-y-1">
                  <li>• <strong>綿棒は深く入れない</strong> - 鼓膜を傷つける危険</li>
                  <li>• <strong>異常があれば獣医師に</strong> - 赤み、臭い、かゆみ</li>
                  <li>• <strong>頻度は週1-2回</strong> - やりすぎは逆効果</li>
                  <li>• <strong>嫌がる場合は無理をしない</strong></li>
                </ul>
              </div>
            </div>
          </Card>

          {/* お手入れのスケジュール */}
          <Card className="p-6">
            <div className="flex items-center mb-4">
              <Clock className="w-6 h-6 text-indigo-600 mr-3" />
              <h2 className="text-2xl font-semibold text-gray-900">お手入れのスケジュール</h2>
            </div>
            <div className="prose max-w-none">
              <h3 className="text-lg font-medium text-gray-800 mb-3">日常的なお手入れ</h3>
              <div className="grid md:grid-cols-2 gap-6 mb-4">
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">📅 毎日行うこと</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• ブラッシング（長毛種）</li>
                    <li>• 歯磨き</li>
                    <li>• 体調チェック</li>
                    <li>• スキンシップ</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">📅 週1-2回行うこと</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• ブラッシング（中・短毛種）</li>
                    <li>• 耳掃除</li>
                    <li>• 爪切り（必要に応じて）</li>
                    <li>• シャンプー（必要に応じて）</li>
                  </ul>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">💡 お手入れのコツ</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• <strong>習慣化する</strong> - 同じ時間に行う</li>
                  <li>• <strong>楽しく行う</strong> - おやつや褒め言葉を</li>
                  <li>• <strong>短時間で</strong> - 集中力が続く時間</li>
                  <li>• <strong>体調に注意</strong> - 元気がない日は控えめに</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>

        {/* ナビゲーション */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/dog-info/food">
              <Button variant="outline" className="w-full sm:w-auto">
                ← 食事・栄養
              </Button>
            </Link>
            <Link to="/dog-info/breeds">
              <Button variant="outline" className="w-full sm:w-auto">
                犬種図鑑 →
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Care; 