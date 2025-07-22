import { AlertTriangle, ArrowLeft, Calendar, CheckCircle, Heart, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '../../components/Button';
import Card from '../../components/Card';

export function HealthManagement() {
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
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
              <Heart className="w-6 h-6 text-red-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">健康管理</h1>
          </div>
          <p className="text-lg text-gray-600">
            愛犬の健康を守るための重要な情報をご紹介します。定期的な健康管理で、ワンちゃんとの長い時間を楽しみましょう。
          </p>
        </div>

        {/* メインコンテンツ */}
        <div className="space-y-8">
          {/* ワクチン接種 */}
          <Card className="p-6">
            <div className="flex items-center mb-4">
              <Shield className="w-6 h-6 text-blue-600 mr-3" />
              <h2 className="text-2xl font-semibold text-gray-900">ワクチン接種</h2>
            </div>
            <div className="prose max-w-none">
              <h3 className="text-lg font-medium text-gray-800 mb-3">必須ワクチン</h3>
              <ul className="space-y-2 mb-4">
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span><strong>狂犬病ワクチン</strong> - 法律で義務付けられています（年1回）</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span><strong>混合ワクチン</strong> - ジステンパー、パルボウイルスなど（年1回）</span>
                </li>
              </ul>
              
              <h3 className="text-lg font-medium text-gray-800 mb-3">推奨ワクチン</h3>
              <ul className="space-y-2 mb-4">
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span><strong>フィラリア予防薬</strong> - 蚊のシーズン中（月1回）</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span><strong>ノミ・ダニ予防薬</strong> - 通年またはシーズン中</span>
                </li>
              </ul>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">💡 ワクチン接種のポイント</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• 子犬期は特に重要（生後6-8週から開始）</li>
                  <li>• 接種前は体調を確認</li>
                  <li>• 接種後は安静に</li>
                  <li>• 副作用があればすぐに獣医師に相談</li>
                </ul>
              </div>
            </div>
          </Card>

          {/* 定期検診 */}
          <Card className="p-6">
            <div className="flex items-center mb-4">
              <Calendar className="w-6 h-6 text-green-600 mr-3" />
              <h2 className="text-2xl font-semibold text-gray-900">定期検診</h2>
            </div>
            <div className="prose max-w-none">
              <h3 className="text-lg font-medium text-gray-800 mb-3">検診の頻度</h3>
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">子犬期（1歳未満）</h4>
                  <p className="text-sm text-green-800">月1回の検診が推奨されます</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">成犬期（1-7歳）</h4>
                  <p className="text-sm text-blue-800">年1-2回の検診が推奨されます</p>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <h4 className="font-medium text-orange-900 mb-2">シニア期（7歳以上）</h4>
                  <p className="text-sm text-orange-800">年2-3回の検診が推奨されます</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h4 className="font-medium text-purple-900 mb-2">慢性疾患がある場合</h4>
                  <p className="text-sm text-purple-800">獣医師の指示に従って検診</p>
                </div>
              </div>

              <h3 className="text-lg font-medium text-gray-800 mb-3">検診内容</h3>
              <ul className="space-y-2 mb-4">
                <li>• 体重測定と体格チェック</li>
                <li>• 心音・呼吸音の確認</li>
                <li>• 歯の健康状態チェック</li>
                <li>• 血液検査（年齢に応じて）</li>
                <li>• 寄生虫の確認</li>
                <li>• 行動・精神状態の確認</li>
              </ul>
            </div>
          </Card>

          {/* 病気の予防 */}
          <Card className="p-6">
            <div className="flex items-center mb-4">
              <AlertTriangle className="w-6 h-6 text-yellow-600 mr-3" />
              <h2 className="text-2xl font-semibold text-gray-900">病気の予防</h2>
            </div>
            <div className="prose max-w-none">
              <h3 className="text-lg font-medium text-gray-800 mb-3">日常的な予防策</h3>
              <div className="grid md:grid-cols-2 gap-6 mb-4">
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">🏠 室内環境</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• 適切な温度・湿度管理</li>
                    <li>• 清潔な寝床の維持</li>
                    <li>• 危険物の除去</li>
                    <li>• 定期的な掃除</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">🍽️ 食事管理</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• 年齢に適したフード</li>
                    <li>• 適切な量の給餌</li>
                    <li>• 新鮮な水の提供</li>
                    <li>• おやつの量を制限</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">🏃 運動管理</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• 適度な運動量</li>
                    <li>• 天候に配慮した散歩</li>
                    <li>• 室内での遊び</li>
                    <li>• ストレス解消</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">🧼 衛生管理</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• 定期的なブラッシング</li>
                    <li>• 歯磨きの習慣</li>
                    <li>• 爪切り</li>
                    <li>• 耳掃除</li>
                  </ul>
                </div>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg">
                <h4 className="font-medium text-yellow-900 mb-2">⚠️ 注意すべき症状</h4>
                <p className="text-sm text-yellow-800 mb-2">以下の症状が見られたら、すぐに獣医師に相談してください：</p>
                <ul className="text-sm text-yellow-800 space-y-1">
                  <li>• 食欲不振が続く</li>
                  <li>• 元気がない、ぐったりしている</li>
                  <li>• 嘔吐や下痢が続く</li>
                  <li>• 咳やくしゃみが頻繁</li>
                  <li>• 歩き方がおかしい</li>
                  <li>• 体重の急激な変化</li>
                </ul>
              </div>
            </div>
          </Card>

          {/* 緊急時の対応 */}
          <Card className="p-6">
            <div className="flex items-center mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600 mr-3" />
              <h2 className="text-2xl font-semibold text-gray-900">緊急時の対応</h2>
            </div>
            <div className="prose max-w-none">
              <div className="bg-red-50 p-4 rounded-lg mb-4">
                <h4 className="font-medium text-red-900 mb-2">🚨 緊急を要する症状</h4>
                <ul className="text-sm text-red-800 space-y-1">
                  <li>• 呼吸困難</li>
                  <li>• 意識がない</li>
                  <li>• 大量の出血</li>
                  <li>• 痙攣</li>
                  <li>• 中毒の疑い</li>
                  <li>• 交通事故</li>
                </ul>
              </div>

              <h3 className="text-lg font-medium text-gray-800 mb-3">緊急時の行動</h3>
              <ol className="space-y-2 text-sm text-gray-700">
                <li>1. <strong>落ち着いて状況を確認</strong> - パニックにならず、冷静に判断</li>
                <li>2. <strong>獣医師に連絡</strong> - かかりつけ医または緊急病院に電話</li>
                <li>3. <strong>安全な搬送</strong> - 必要に応じて救急車やタクシーを利用</li>
                <li>4. <strong>症状の記録</strong> - 発症時間、症状の詳細をメモ</li>
                <li>5. <strong>冷静な説明</strong> - 獣医師に正確な情報を伝える</li>
              </ol>
            </div>
          </Card>
        </div>

        {/* ナビゲーション */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/dog-info/training">
              <Button variant="outline" className="w-full sm:w-auto">
                しつけのコツ →
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

export default HealthManagement; 