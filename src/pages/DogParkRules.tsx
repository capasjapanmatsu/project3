import { Link } from 'react-router-dom';
import { 
  Shield, 
  Heart, 
  Users, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  PawPrint,
  Phone,
  Camera,
  Trash2,
  Volume2,
  Car,
  Droplets,
  ArrowLeft
} from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';

export function DogParkRules() {
  return (
    <div className="max-w-4xl mx-auto px-4 space-y-6">
      {/* ヘッダー */}
      <div className="text-center">
        <div className="mb-4">
          <Link 
            to="/" 
            className="inline-flex items-center text-blue-600 hover:text-blue-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            ホームに戻る
          </Link>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
          ドッグラン利用ルール
        </h1>
        <p className="text-base md:text-lg text-gray-600">
          すべての利用者と愛犬が安全で楽しく過ごすためのルールです
        </p>
      </div>

      {/* 重要な注意事項 */}
      <Card className="bg-red-50 border-red-200 p-4">
        <div className="flex flex-col md:flex-row md:items-start md:space-x-3">
          <AlertTriangle className="w-6 h-6 text-red-600 mb-2 md:mb-0 md:mt-1 md:flex-shrink-0" />
          <div>
            <h2 className="text-xl font-semibold text-red-900 mb-3">重要な注意事項</h2>
            <div className="space-y-2 text-red-800">
              <p className="flex items-start">
                <span className="w-2 h-2 bg-red-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                <span>ワクチン接種証明書が承認されていない犬は入場できません</span>
              </p>
              <p className="flex items-start">
                <span className="w-2 h-2 bg-red-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                <span>発情中のメス犬、病気や怪我をしている犬の入場はお断りします</span>
              </p>
              <p className="flex items-start">
                <span className="w-2 h-2 bg-red-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                <span>攻撃的な行動を示す犬は即座に退場していただきます</span>
              </p>
              <p className="flex items-start">
                <span className="w-2 h-2 bg-red-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                <span>事故やトラブルについて、施設は一切の責任を負いません</span>
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* 基本ルール */}
      <Card className="p-4">
        <div className="flex items-center space-x-3 mb-6">
          <Shield className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">基本ルール</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900">入場前の準備</h3>
                <p className="text-sm text-gray-600">
                  必ずリードを装着し、排泄を済ませてから入場してください
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900">飼い主の責任</h3>
                <p className="text-sm text-gray-600">
                  愛犬から目を離さず、常に監視・管理してください
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900">清潔の維持</h3>
                <p className="text-sm text-gray-600">
                  排泄物は必ず飼い主が責任を持って処理してください
                </p>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900">他の利用者への配慮</h3>
                <p className="text-sm text-gray-600">
                  大きな声での会話や騒音は控えめにしてください
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900">施設の保護</h3>
                <p className="text-sm text-gray-600">
                  設備や備品を大切に扱い、破損させないよう注意してください
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900">緊急時の対応</h3>
                <p className="text-sm text-gray-600">
                  事故や怪我が発生した場合は、すぐに管理者に連絡してください
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* 犬に関するルール */}
      <Card className="p-4">
        <div className="flex items-center space-x-3 mb-6">
          <PawPrint className="w-6 h-6 text-purple-600" />
          <h2 className="text-xl font-semibold text-gray-900">愛犬に関するルール</h2>
        </div>
        
        <div className="space-y-6">
          {/* 入場条件 */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
              <Heart className="w-5 h-5 text-red-500 mr-2" />
              入場条件
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-semibold text-green-900 mb-2">✅ 入場可能</h4>
                <ul className="text-sm text-green-800 space-y-1">
                  <li>• ワクチン接種証明書が承認済みの犬</li>
                  <li>• 健康で元気な犬</li>
                  <li>• 社会化ができている犬</li>
                  <li>• 飼い主の指示に従える犬</li>
                </ul>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <h4 className="font-semibold text-red-900 mb-2">❌ 入場不可</h4>
                <ul className="text-sm text-red-800 space-y-1">
                  <li>• 発情中のメス犬</li>
                  <li>• 病気や怪我をしている犬</li>
                  <li>• 攻撃的な行動を示す犬</li>
                  <li>• ワクチン未接種・証明書未承認の犬</li>
                </ul>
              </div>
            </div>
          </div>

          {/* サイズ別エリア */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
              <Users className="w-5 h-5 text-blue-500 mr-2" />
              サイズ別エリアの利用
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-blue-200 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">🐕 大型犬エリア</h4>
                <p className="text-sm text-blue-800">
                  体重20kg以上の犬が対象です。小型犬の入場はご遠慮ください。
                </p>
              </div>
              <div className="border border-pink-200 p-4 rounded-lg">
                <h4 className="font-semibold text-pink-900 mb-2">🐕‍🦺 小型犬エリア</h4>
                <p className="text-sm text-pink-800">
                  体重20kg未満の犬が対象です。大型犬との事故防止のため、サイズを守ってください。
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* 禁止事項 */}
      <Card className="bg-yellow-50 border-yellow-200 p-4">
        <div className="flex items-center space-x-3 mb-6">
          <AlertTriangle className="w-6 h-6 text-yellow-600" />
          <h2 className="text-xl font-semibold text-yellow-900">禁止事項</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <Volume2 className="w-5 h-5 text-red-500 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900">大声・騒音</h3>
                <p className="text-sm text-gray-600">
                  大声での会話、音楽の再生、犬の過度な鳴き声
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <Camera className="w-5 h-5 text-red-500 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900">無断撮影</h3>
                <p className="text-sm text-gray-600">
                  他の利用者や犬の無断撮影・SNS投稿
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <Trash2 className="w-5 h-5 text-red-500 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900">ゴミの放置</h3>
                <p className="text-sm text-gray-600">
                  排泄物やゴミの放置、施設の汚損
                </p>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <Heart className="w-5 h-5 text-red-500 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900">食べ物の持ち込み</h3>
                <p className="text-sm text-gray-600">
                  犬用・人用問わず、食べ物の持ち込み・給餌
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <Car className="w-5 h-5 text-red-500 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900">指定外駐車</h3>
                <p className="text-sm text-gray-600">
                  指定された駐車場以外への駐車
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <Users className="w-5 h-5 text-red-500 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900">犬以外の動物</h3>
                <p className="text-sm text-gray-600">
                  犬以外のペットの同伴入場
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* 利用時間・料金 */}
      <Card className="p-4">
        <div className="flex items-center space-x-3 mb-6">
          <Clock className="w-6 h-6 text-green-600" />
          <h2 className="text-xl font-semibold text-gray-900">利用時間・料金</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">営業時間</h3>
            <p className="text-xl md:text-2xl font-bold text-blue-600 mb-2">6:00 - 22:00</p>
            <p className="text-sm text-blue-700">年中無休・24時間無人営業</p>
          </div>
          
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <h3 className="text-lg font-semibold text-green-800 mb-2">通常利用</h3>
            <p className="text-xl md:text-2xl font-bold text-green-600 mb-2">¥800</p>
            <p className="text-sm text-green-700">1日利用（時間制限なし）</p>
          </div>
          
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <h3 className="text-lg font-semibold text-purple-800 mb-2">サブスクリプション</h3>
            <p className="text-xl md:text-2xl font-bold text-purple-600 mb-2">¥3,800</p>
            <p className="text-sm text-purple-700">月額（どこでも使い放題）</p>
          </div>
        </div>
        
        {/* 施設貸し切り料金 */}
        <div className="mt-4 p-4 bg-orange-50 rounded-lg">
          <h3 className="text-lg font-semibold text-orange-800 mb-2 text-center">施設貸し切り</h3>
          <p className="text-xl md:text-2xl font-bold text-orange-600 mb-2 text-center">¥4,400/時間</p>
          <div className="text-sm text-orange-700 text-center space-y-1">
            <p>1時間単位で予約可能</p>
            <p>人数制限なし・友達と一緒に利用可能</p>
            <p>前日までの予約が必要</p>
            <p>サブスク会員は20%OFF（¥3,520/時間）</p>
          </div>
        </div>
      </Card>

      {/* 設備・サービス */}
      <Card className="p-4">
        <div className="flex items-center space-x-3 mb-6">
          <Droplets className="w-6 h-6 text-cyan-600" />
          <h2 className="text-xl font-semibold text-gray-900">設備・サービス</h2>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Droplets, label: '給水設備', desc: '清潔な飲み水' },
            { icon: Car, label: '駐車場', desc: '無料駐車場完備' },
            { icon: Droplets, label: 'シャワー設備', desc: '犬用洗い場' },
            { icon: Users, label: '休憩スペース', desc: '飼い主用ベンチ' },
            { icon: Trash2, label: 'ゴミ箱', desc: '分別ゴミ箱設置' },
            { icon: Shield, label: 'セキュリティ', desc: '防犯カメラ設置' },
            { icon: Phone, label: '緊急連絡', desc: '24時間対応' },
            { icon: Heart, label: 'アジリティ', desc: '運動器具完備' },
          ].map((item, index) => {
            const Icon = item.icon;
            return (
              <div key={index} className="text-center p-3 bg-gray-50 rounded-lg">
                <Icon className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                <h4 className="font-semibold text-gray-900 text-sm">{item.label}</h4>
                <p className="text-xs text-gray-600">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </Card>

      {/* 緊急時の対応 */}
      <Card className="bg-orange-50 border-orange-200 p-4">
        <div className="flex items-center space-x-3 mb-6">
          <Phone className="w-6 h-6 text-orange-600" />
          <h2 className="text-xl font-semibold text-orange-900">緊急時の対応</h2>
        </div>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold text-orange-900 mb-2">事故・怪我が発生した場合</h3>
              <ol className="text-sm text-orange-800 space-y-1">
                <li>1. まず安全を確保し、他の犬を遠ざける</li>
                <li>2. 怪我の程度を確認し、必要に応じて応急処置</li>
                <li>3. 重傷の場合は救急車・動物病院に連絡</li>
                <li>4. 管理者に速やかに報告</li>
              </ol>
            </div>
            
            <div>
              <h3 className="font-semibold text-orange-900 mb-2">トラブルが発生した場合</h3>
              <ol className="text-sm text-orange-800 space-y-1">
                <li>1. 冷静に対応し、感情的にならない</li>
                <li>2. 当事者同士で話し合いを試みる</li>
                <li>3. 解決しない場合は管理者に相談</li>
                <li>4. 必要に応じて警察に通報</li>
              </ol>
            </div>
          </div>
          
          <div className="bg-orange-100 p-4 rounded-lg">
            <h3 className="font-semibold text-orange-900 mb-2">緊急連絡先</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-orange-800">
              <div>
                <p className="font-medium">管理者</p>
                <p>各ドッグランに掲示しています</p>
              </div>
              <div>
                <p className="font-medium">救急車</p>
                <p>📞 119</p>
              </div>
              <div>
                <p className="font-medium">警察</p>
                <p>📞 110</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* 同意事項 */}
      <Card className="bg-gray-50 border-gray-200 p-4">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">利用規約への同意</h2>
          <p className="text-gray-700 mb-6">
            ドッグランをご利用いただく際は、上記のルールをすべて理解し、遵守していただく必要があります。<br />
            ルールに違反した場合、退場していただく場合があります。
          </p>
          <div className="flex flex-col md:flex-row justify-center space-y-3 md:space-y-0 md:space-x-4">
            <Link to="/parks">
              <Button className="w-full md:w-auto bg-blue-600 hover:bg-blue-700">
                ルールを理解してドッグランを予約する
              </Button>
            </Link>
            <Link to="/">
              <Button variant="secondary" className="w-full md:w-auto">
                ホームに戻る
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}