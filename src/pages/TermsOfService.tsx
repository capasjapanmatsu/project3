import { Link } from 'react-router-dom';
import { ArrowLeft, FileText, AlertTriangle, Shield, Scale, Clock, Ban, CreditCard } from 'lucide-react';
import Card from '../components/Card';

export function TermsOfService() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <Link to="/" className="inline-flex items-center text-blue-600 hover:text-blue-800">
          <ArrowLeft className="w-4 h-4 mr-2" />
          ホームに戻る
        </Link>
      </div>

      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold mb-4">利用規約</h1>
        <p className="text-gray-600">最終更新日: 2025年6月15日</p>
      </div>

      <Card className="mb-8 p-6">
        <div className="prose max-w-none">
          <div className="flex items-start mb-6">
            <FileText className="w-6 h-6 text-blue-600 mr-3 mt-1 flex-shrink-0" />
            <div>
              <h2 className="text-xl font-bold mb-3">1. はじめに</h2>
              <p className="mb-4">
                本利用規約（以下「本規約」）は、株式会社CAPAS（以下「当社」）が提供するドッグパークJP（以下「本サービス」）の利用条件を定めるものです。ユーザーは、本サービスを利用することにより、本規約に同意したものとみなされます。
              </p>
              <p>
                本規約に同意いただけない場合は、本サービスをご利用いただくことはできません。
              </p>
            </div>
          </div>

          <div className="flex items-start mb-6">
            <FileText className="w-6 h-6 text-blue-600 mr-3 mt-1 flex-shrink-0" />
            <div>
              <h2 className="text-xl font-bold mb-3">2. サービス内容</h2>
              <p className="mb-4">
                本サービスは、全国のドッグランの検索・予約、ペット用品の購入、コミュニティ機能などを提供するプラットフォームです。当社は、本サービスの内容を予告なく変更、追加、削除する権利を有します。
              </p>
            </div>
          </div>

          <div className="flex items-start mb-6">
            <FileText className="w-6 h-6 text-blue-600 mr-3 mt-1 flex-shrink-0" />
            <div>
              <h2 className="text-xl font-bold mb-3">3. アカウント</h2>
              <p className="mb-4">ユーザーは、以下の事項に同意するものとします：</p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>正確かつ最新の情報を提供すること</li>
                <li>アカウント情報の機密性を保持し、不正アクセスから保護すること</li>
                <li>アカウントの不正使用に気づいた場合、直ちに当社に通知すること</li>
                <li>アカウントの活動に全責任を負うこと</li>
              </ul>
              <p>
                当社は、ユーザーが本規約に違反した場合、アカウントを一時停止または削除する権利を有します。
              </p>
            </div>
          </div>

          <div className="flex items-start mb-6">
            <Shield className="w-6 h-6 text-blue-600 mr-3 mt-1 flex-shrink-0" />
            <div>
              <h2 className="text-xl font-bold mb-3">4. ユーザーの義務と禁止事項</h2>
              <p className="mb-4">ユーザーは、本サービスの利用にあたり、以下の行為を行わないことに同意します：</p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>法令または公序良俗に違反する行為</li>
                <li>当社または第三者の知的財産権、プライバシー権、その他の権利を侵害する行為</li>
                <li>虚偽の情報を提供する行為</li>
                <li>本サービスの運営を妨害する行為</li>
                <li>不正アクセスまたはセキュリティを回避する行為</li>
                <li>他のユーザーに対する嫌がらせや迷惑行為</li>
                <li>商業目的での本サービスの利用（当社の許可がある場合を除く）</li>
                <li>本サービスのリバースエンジニアリングまたは改変</li>
                <li>当社の事前の許可なく自動化されたシステムを使用して本サービスにアクセスする行為</li>
              </ul>
            </div>
          </div>

          <div className="flex items-start mb-6">
            <FileText className="w-6 h-6 text-blue-600 mr-3 mt-1 flex-shrink-0" />
            <div>
              <h2 className="text-xl font-bold mb-3">5. ドッグラン利用規則</h2>
              <p className="mb-4">ドッグランを利用する際は、以下の規則を遵守してください：</p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>各施設の利用規則に従うこと</li>
                <li>ワクチン接種証明書が承認されていない犬は入場できません</li>
                <li>発情中のメス犬、病気や怪我をしている犬の入場はお断りします</li>
                <li>攻撃的な行動を示す犬は即座に退場していただきます</li>
                <li>犬から目を離さず、常に監視・管理すること</li>
                <li>排泄物は必ず飼い主が責任を持って処理すること</li>
                <li>他の利用者への配慮を忘れないこと</li>
                <li>施設や設備を大切に扱うこと</li>
              </ul>
              <p className="mb-4">
                詳細な利用ルールは、<Link to="/parks/rules" className="text-blue-600 hover:underline">ドッグラン利用ルール</Link>をご確認ください。
              </p>
            </div>
          </div>

          <div className="flex items-start mb-6">
            <CreditCard className="w-6 h-6 text-blue-600 mr-3 mt-1 flex-shrink-0" />
            <div>
              <h2 className="text-xl font-bold mb-3">6. 料金と支払い</h2>
              <p className="mb-4">
                本サービスの一部機能は有料です。料金体系は以下の通りです：
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>通常利用：800円/日（時間制限なし）</li>
                <li>サブスクリプション：3,800円/月（全国のドッグラン使い放題）</li>
                <li>施設貸し切り：4,400円/時間（サブスク会員は20%OFF）</li>
              </ul>
              <p className="mb-4">
                支払いはクレジットカードまたは当社が指定する方法で行います。サブスクリプションは、解約の申し出がない限り自動更新されます。
              </p>
              <p>
                料金は予告なく変更される場合があります。変更がある場合は、事前に通知します。
              </p>
            </div>
          </div>

          <div className="flex items-start mb-6">
            <Scale className="w-6 h-6 text-blue-600 mr-3 mt-1 flex-shrink-0" />
            <div>
              <h2 className="text-xl font-bold mb-3">7. 知的財産権</h2>
              <p className="mb-4">
                本サービスに関連するすべての知的財産権（商標、ロゴ、コンテンツなど）は、当社または正当なライセンス所有者に帰属します。ユーザーは、当社の書面による事前の許可なく、これらの知的財産を複製、配布、修正、公開、または商業的に利用することはできません。
              </p>
              <p>
                ユーザーが本サービスに投稿したコンテンツ（レビュー、コメント、画像など）については、ユーザーがその権利を保持しますが、当社に対して、そのコンテンツを本サービスの運営・改善・宣伝のために使用する世界的、非独占的、無償、サブライセンス可能かつ譲渡可能なライセンスを付与するものとします。
              </p>
            </div>
          </div>

          <div className="flex items-start mb-6">
            <AlertTriangle className="w-6 h-6 text-blue-600 mr-3 mt-1 flex-shrink-0" />
            <div>
              <h2 className="text-xl font-bold mb-3">8. 免責事項</h2>
              <p className="mb-4">
                本サービスは「現状有姿」で提供され、当社は明示または黙示を問わず、いかなる保証も行いません。当社は、本サービスの中断、エラー、セキュリティ上の問題について責任を負いません。
              </p>
              <p className="mb-4">
                当社は、ドッグラン施設内で発生した事故、怪我、トラブルについて一切の責任を負いません。ユーザーは自己の責任において本サービスを利用するものとします。
              </p>
              <p>
                法律で許容される最大限の範囲において、当社は間接的、偶発的、特別、結果的または懲罰的損害について責任を負いません。
              </p>
            </div>
          </div>

          <div className="flex items-start mb-6">
            <Ban className="w-6 h-6 text-blue-600 mr-3 mt-1 flex-shrink-0" />
            <div>
              <h2 className="text-xl font-bold mb-3">9. サービスの停止・終了</h2>
              <p className="mb-4">
                当社は、以下の場合に本サービスの全部または一部の提供を停止または中断することがあります：
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>システムの保守・点検を行う場合</li>
                <li>火災、停電、天災などの不可抗力により本サービスの運営が困難になった場合</li>
                <li>その他、当社が本サービスの停止または中断が必要と判断した場合</li>
              </ul>
              <p>
                当社は、本サービスの停止または中断によりユーザーに生じた損害について、一切の責任を負いません。
              </p>
            </div>
          </div>

          <div className="flex items-start mb-6">
            <Clock className="w-6 h-6 text-blue-600 mr-3 mt-1 flex-shrink-0" />
            <div>
              <h2 className="text-xl font-bold mb-3">10. 規約の変更</h2>
              <p className="mb-4">
                当社は、必要に応じて本規約を変更することがあります。変更後の規約は、本サービス上に掲載された時点で効力を生じるものとします。
              </p>
              <p>
                重要な変更がある場合は、メールまたはサービス内の通知で連絡します。変更後も本サービスを継続して利用することにより、ユーザーは変更後の規約に同意したものとみなされます。
              </p>
            </div>
          </div>

          <div className="flex items-start">
            <Scale className="w-6 h-6 text-blue-600 mr-3 mt-1 flex-shrink-0" />
            <div>
              <h2 className="text-xl font-bold mb-3">11. 準拠法と管轄裁判所</h2>
              <p className="mb-4">
                本規約の解釈および適用は、日本法に準拠するものとします。本規約に関連する紛争については、熊本地方裁判所を第一審の専属的合意管轄裁判所とします。
              </p>
              <div className="bg-gray-50 p-4 rounded-lg mt-6">
                <p className="font-medium">株式会社CAPAS</p>
                <p>〒861-0563 熊本県山鹿市鹿央町千田１７１８－１３</p>
                <p>メール：info@dogparkjp.com</p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}