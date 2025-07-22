import { AlertCircle, ArrowLeft, Award, Clock, GraduationCap, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '../../components/Button';
import Card from '../../components/Card';

export function Training() {
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
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
              <GraduationCap className="w-6 h-6 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">しつけのコツ</h1>
          </div>
          <p className="text-lg text-gray-600">
            愛犬との信頼関係を築くための効果的なしつけ方法をご紹介します。基本から応用まで、段階的に学んでいきましょう。
          </p>
        </div>

        {/* メインコンテンツ */}
        <div className="space-y-8">
          {/* 基本コマンド */}
          <Card className="p-6">
            <div className="flex items-center mb-4">
              <Target className="w-6 h-6 text-green-600 mr-3" />
              <h2 className="text-2xl font-semibold text-gray-900">基本コマンド</h2>
            </div>
            <div className="prose max-w-none">
              <h3 className="text-lg font-medium text-gray-800 mb-3">最初に教えるべきコマンド</h3>
              <div className="grid md:grid-cols-2 gap-6 mb-4">
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">「おすわり」</h4>
                  <p className="text-sm text-green-800 mb-2">最も基本的で重要なコマンド</p>
                  <ul className="text-xs text-green-700 space-y-1">
                    <li>• おやつを鼻の上に持っていく</li>
                    <li>• 自然に座ったら「おすわり」と言う</li>
                    <li>• おやつを与えて褒める</li>
                  </ul>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">「まて」</h4>
                  <p className="text-sm text-blue-800 mb-2">安全のための重要なコマンド</p>
                  <ul className="text-xs text-blue-700 space-y-1">
                    <li>• おすわりをさせた状態で</li>
                    <li>• 手のひらを見せて「まて」</li>
                    <li>• 少しずつ距離を伸ばす</li>
                  </ul>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h4 className="font-medium text-purple-900 mb-2">「こい」</h4>
                  <p className="text-sm text-purple-800 mb-2">呼び戻しの基本</p>
                  <ul className="text-xs text-purple-700 space-y-1">
                    <li>• リードを短く持つ</li>
                    <li>• 名前を呼んで「こい」</li>
                    <li>• 来たら大げさに褒める</li>
                  </ul>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <h4 className="font-medium text-orange-900 mb-2">「ふせ」</h4>
                  <p className="text-sm text-orange-800 mb-2">落ち着かせるコマンド</p>
                  <ul className="text-xs text-orange-700 space-y-1">
                    <li>• おすわりから始める</li>
                    <li>• おやつを下に持っていく</li>
                    <li>• 伏せたら「ふせ」と言う</li>
                  </ul>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">💡 しつけの基本原則</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• <strong>一貫性</strong> - 同じコマンド、同じルールを守る</li>
                  <li>• <strong>タイミング</strong> - 良い行動の直後に褒める</li>
                  <li>• <strong>短時間</strong> - 集中力が続く15-20分程度</li>
                  <li>• <strong>楽しく</strong> - 遊びの要素を取り入れる</li>
                </ul>
              </div>
            </div>
          </Card>

          {/* 問題行動の改善 */}
          <Card className="p-6">
            <div className="flex items-center mb-4">
              <AlertCircle className="w-6 h-6 text-yellow-600 mr-3" />
              <h2 className="text-2xl font-semibold text-gray-900">問題行動の改善</h2>
            </div>
            <div className="prose max-w-none">
              <h3 className="text-lg font-medium text-gray-800 mb-3">よくある問題行動と対処法</h3>
              <div className="space-y-4 mb-4">
                <div className="border-l-4 border-red-500 pl-4">
                  <h4 className="font-medium text-gray-800 mb-2">🐕 無駄吠え</h4>
                  <p className="text-sm text-gray-600 mb-2">原因：警戒、要求、不安、退屈</p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• 吠える原因を特定する</li>
                    <li>• 吠えても要求を聞かない</li>
                    <li>• 静かにしたら褒める</li>
                    <li>• 十分な運動と刺激を与える</li>
                  </ul>
                </div>
                <div className="border-l-4 border-orange-500 pl-4">
                  <h4 className="font-medium text-gray-800 mb-2">🏠 トイレの失敗</h4>
                  <p className="text-sm text-gray-600 mb-2">原因：トイレトレーニング不足、病気、ストレス</p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• 定期的なトイレタイム</li>
                    <li>• 成功したら大げさに褒める</li>
                    <li>• 失敗しても叱らない</li>
                    <li>• トイレの場所を明確にする</li>
                  </ul>
                </div>
                <div className="border-l-4 border-purple-500 pl-4">
                  <h4 className="font-medium text-gray-800 mb-2">🦷 噛み癖</h4>
                  <p className="text-sm text-gray-600 mb-2">原因：歯の生え変わり、遊び、ストレス</p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• 噛んで良いおもちゃを与える</li>
                    <li>• 噛まれたら遊びを中断</li>
                    <li>• 子犬期は特に注意</li>
                    <li>• ストレス解消の機会を増やす</li>
                  </ul>
                </div>
                <div className="border-l-4 border-green-500 pl-4">
                  <h4 className="font-medium text-gray-800 mb-2">🏃 引っ張り癖</h4>
                  <p className="text-sm text-gray-600 mb-2">原因：興奮、好奇心、リーダーシップ</p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• 引っ張ったら立ち止まる</li>
                    <li>• リードが緩んだら歩く</li>
                    <li>• 方向転換で注意を引く</li>
                    <li>• 根気強く繰り返す</li>
                  </ul>
                </div>
              </div>
            </div>
          </Card>

          {/* しつけのタイミング */}
          <Card className="p-6">
            <div className="flex items-center mb-4">
              <Clock className="w-6 h-6 text-indigo-600 mr-3" />
              <h2 className="text-2xl font-semibold text-gray-900">しつけのタイミング</h2>
            </div>
            <div className="prose max-w-none">
              <h3 className="text-lg font-medium text-gray-800 mb-3">年齢別のしつけポイント</h3>
              <div className="grid md:grid-cols-3 gap-4 mb-4">
                <div className="bg-pink-50 p-4 rounded-lg">
                  <h4 className="font-medium text-pink-900 mb-2">子犬期（2-6ヶ月）</h4>
                  <ul className="text-sm text-pink-800 space-y-1">
                    <li>• 社会化の黄金期</li>
                    <li>• 基本的なコマンド</li>
                    <li>• トイレトレーニング</li>
                    <li>• 人や他の犬との接触</li>
                  </ul>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">成長期（6-12ヶ月）</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• より高度なコマンド</li>
                    <li>• 問題行動の修正</li>
                    <li>• リーダーシップの確立</li>
                    <li>• 運動量の調整</li>
                  </ul>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">成犬期（1歳以上）</h4>
                  <ul className="text-sm text-green-800 space-y-1">
                    <li>• 応用コマンド</li>
                    <li>• 専門的なトレーニング</li>
                    <li>• 行動の維持</li>
                    <li>• 新しい刺激の提供</li>
                  </ul>
                </div>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg">
                <h4 className="font-medium text-yellow-900 mb-2">⏰ 1日のしつけスケジュール例</h4>
                <div className="grid md:grid-cols-2 gap-4 text-sm text-yellow-800">
                  <div>
                    <h5 className="font-medium mb-2">朝（15分）</h5>
                    <ul className="space-y-1">
                      <li>• 基本的なコマンド練習</li>
                      <li>• トイレトレーニング</li>
                      <li>• 朝食前の「まて」練習</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-medium mb-2">夕方（20分）</h5>
                    <ul className="space-y-1">
                      <li>• 散歩中の引っ張り防止</li>
                      <li>• 呼び戻し練習</li>
                      <li>• 遊びながらのコマンド</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* 褒め方とご褒美 */}
          <Card className="p-6">
            <div className="flex items-center mb-4">
              <Award className="w-6 h-6 text-yellow-600 mr-3" />
              <h2 className="text-2xl font-semibold text-gray-900">褒め方とご褒美</h2>
            </div>
            <div className="prose max-w-none">
              <h3 className="text-lg font-medium text-gray-800 mb-3">効果的な褒め方</h3>
              <div className="grid md:grid-cols-2 gap-6 mb-4">
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">🎯 タイミング</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• 良い行動の直後（3秒以内）</li>
                    <li>• 一貫した言葉とトーン</li>
                    <li>• 大げさに褒める</li>
                    <li>• 体で表現する（撫でる、抱く）</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">🎁 ご褒美の種類</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• <strong>おやつ</strong> - 最も効果的</li>
                    <li>• <strong>言葉</strong> - 「いい子」「すごい」</li>
                    <li>• <strong>撫でる</strong> - 頭、胸、背中</li>
                    <li>• <strong>遊び</strong> - おもちゃ、追いかけっこ</li>
                  </ul>
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-medium text-green-900 mb-2">✅ 褒め方のコツ</h4>
                <ul className="text-sm text-green-800 space-y-1">
                  <li>• <strong>即座に</strong> - 行動の直後に褒める</li>
                  <li>• <strong>具体的に</strong> - 何が良かったかを伝える</li>
                  <li>• <strong>一貫して</strong> - 同じ言葉とトーンを使う</li>
                  <li>• <strong>段階的に</strong> - 徐々にご褒美を減らす</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>

        {/* ナビゲーション */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/dog-info/health">
              <Button variant="outline" className="w-full sm:w-auto">
                ← 健康管理
              </Button>
            </Link>
            <Link to="/dog-info/walk">
              <Button variant="outline" className="w-full sm:w-auto">
                お散歩ガイド →
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Training; 