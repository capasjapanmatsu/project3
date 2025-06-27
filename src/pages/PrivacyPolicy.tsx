import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, Lock, Eye, FileText, Server, Database } from 'lucide-react';
import Card from '../components/Card';

export function PrivacyPolicy() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <Link to="/" className="inline-flex items-center text-blue-600 hover:text-blue-800">
          <ArrowLeft className="w-4 h-4 mr-2" />
          ホームに戻る
        </Link>
      </div>

      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold mb-4">プライバシーポリシー</h1>
        <p className="text-gray-600">最終更新日: 2025年6月15日</p>
      </div>

      <Card className="mb-8 p-6">
        <div className="prose max-w-none">
          <div className="flex items-start mb-6">
            <Shield className="w-6 h-6 text-blue-600 mr-3 mt-1 flex-shrink-0" />
            <div>
              <h2 className="text-xl font-bold mb-3">1. はじめに</h2>
              <p className="mb-4">
                株式会社CAPAS（以下「当社」）は、ドッグパークJP（以下「本サービス」）を提供するにあたり、ユーザーの個人情報を尊重し、適切に保護することを重要な責務と考えております。本プライバシーポリシーでは、当社が収集する個人情報の種類、利用目的、保護方法などについて説明します。
              </p>
              <p>
                本サービスをご利用いただくことにより、ユーザーは本プライバシーポリシーに同意したものとみなされます。
              </p>
            </div>
          </div>

          <div className="flex items-start mb-6">
            <Database className="w-6 h-6 text-blue-600 mr-3 mt-1 flex-shrink-0" />
            <div>
              <h2 className="text-xl font-bold mb-3">2. 収集する情報</h2>
              <p className="mb-4">当社は、以下の情報を収集することがあります：</p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li><strong>アカウント情報</strong>：氏名、メールアドレス、電話番号、住所、郵便番号</li>
                <li><strong>ペット情報</strong>：犬の名前、犬種、性別、生年月日、画像、ワクチン接種証明書</li>
                <li><strong>支払い情報</strong>：クレジットカード情報（カード番号の下4桁、有効期限）</li>
                <li><strong>利用情報</strong>：ドッグラン利用履歴、予約情報、購入履歴</li>
                <li><strong>位置情報</strong>：ドッグラン検索時のユーザーの位置情報（許可した場合のみ）</li>
                <li><strong>デバイス情報</strong>：IPアドレス、ブラウザの種類、デバイスの種類、アクセス日時</li>
              </ul>
            </div>
          </div>

          <div className="flex items-start mb-6">
            <FileText className="w-6 h-6 text-blue-600 mr-3 mt-1 flex-shrink-0" />
            <div>
              <h2 className="text-xl font-bold mb-3">3. 情報の利用目的</h2>
              <p className="mb-4">収集した情報は、以下の目的で利用します：</p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>本サービスの提供・運営・改善</li>
                <li>ユーザー認証および本人確認</li>
                <li>予約管理および決済処理</li>
                <li>カスタマーサポートの提供</li>
                <li>サービスに関するお知らせや更新情報の送信</li>
                <li>マーケティングおよび統計分析</li>
                <li>不正利用の防止およびセキュリティの確保</li>
                <li>法令遵守</li>
              </ul>
            </div>
          </div>

          <div className="flex items-start mb-6">
            <Server className="w-6 h-6 text-blue-600 mr-3 mt-1 flex-shrink-0" />
            <div>
              <h2 className="text-xl font-bold mb-3">4. 情報の共有</h2>
              <p className="mb-4">当社は、以下の場合を除き、ユーザーの個人情報を第三者と共有することはありません：</p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li><strong>サービス提供者</strong>：決済処理、データ分析、メール配信などのサービスを提供する委託先</li>
                <li><strong>ドッグラン施設オーナー</strong>：予約管理および施設利用に必要な範囲内で情報を共有</li>
                <li><strong>法的要請</strong>：法令に基づく要請や裁判所の命令に応じる場合</li>
                <li><strong>事業譲渡</strong>：合併、買収、資産売却などの際に、関連する個人情報を譲渡する場合</li>
                <li><strong>同意がある場合</strong>：ユーザーの明示的な同意がある場合</li>
              </ul>
            </div>
          </div>

          <div className="flex items-start mb-6">
            <Lock className="w-6 h-6 text-blue-600 mr-3 mt-1 flex-shrink-0" />
            <div>
              <h2 className="text-xl font-bold mb-3">5. 情報の保護</h2>
              <p className="mb-4">
                当社は、ユーザーの個人情報を保護するために、適切な物理的、技術的、管理的措置を講じています。これには、SSL暗号化、アクセス制限、定期的なセキュリティ監査などが含まれます。
              </p>
              <p>
                ただし、インターネットを通じた情報の送信は完全に安全ではなく、当社はデータの安全性を100%保証することはできません。ユーザーは自己責任で情報を提供するものとします。
              </p>
            </div>
          </div>

          <div className="flex items-start mb-6">
            <Eye className="w-6 h-6 text-blue-600 mr-3 mt-1 flex-shrink-0" />
            <div>
              <h2 className="text-xl font-bold mb-3">6. ユーザーの権利</h2>
              <p className="mb-4">ユーザーには以下の権利があります：</p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>個人情報へのアクセス、訂正、削除を要求する権利</li>
                <li>データの処理を制限する権利</li>
                <li>データポータビリティの権利</li>
                <li>同意を撤回する権利</li>
                <li>監督機関に苦情を申し立てる権利</li>
              </ul>
              <p>
                これらの権利を行使するには、下記の連絡先までお問い合わせください。
              </p>
            </div>
          </div>

          <div className="flex items-start mb-6">
            <FileText className="w-6 h-6 text-blue-600 mr-3 mt-1 flex-shrink-0" />
            <div>
              <h2 className="text-xl font-bold mb-3">7. Cookieの使用</h2>
              <p className="mb-4">
                本サービスでは、ユーザー体験の向上、サイトの利用状況の分析、広告の最適化などを目的として、Cookieおよび類似の技術を使用しています。ユーザーはブラウザの設定でCookieを無効化することができますが、一部の機能が正常に動作しなくなる可能性があります。
              </p>
            </div>
          </div>

          <div className="flex items-start mb-6">
            <FileText className="w-6 h-6 text-blue-600 mr-3 mt-1 flex-shrink-0" />
            <div>
              <h2 className="text-xl font-bold mb-3">8. 子どものプライバシー</h2>
              <p className="mb-4">
                本サービスは16歳未満の子どもを対象としていません。当社は、16歳未満の子どもから意図的に個人情報を収集することはありません。16歳未満の子どもの個人情報を収集したことが判明した場合、速やかに削除します。
              </p>
            </div>
          </div>

          <div className="flex items-start mb-6">
            <FileText className="w-6 h-6 text-blue-600 mr-3 mt-1 flex-shrink-0" />
            <div>
              <h2 className="text-xl font-bold mb-3">9. プライバシーポリシーの変更</h2>
              <p className="mb-4">
                当社は、必要に応じて本プライバシーポリシーを変更することがあります。変更があった場合は、本ページで通知するとともに、重要な変更については、メールまたはサービス内の通知で連絡します。
              </p>
              <p>
                変更後のプライバシーポリシーは、本ページに掲載された時点で効力を生じるものとします。定期的に本ページをご確認いただくことをお勧めします。
              </p>
            </div>
          </div>

          <div className="flex items-start">
            <FileText className="w-6 h-6 text-blue-600 mr-3 mt-1 flex-shrink-0" />
            <div>
              <h2 className="text-xl font-bold mb-3">10. お問い合わせ</h2>
              <p className="mb-4">
                本プライバシーポリシーに関するご質問やご意見、または個人情報の取り扱いに関するお問い合わせは、以下の連絡先までご連絡ください：
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
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