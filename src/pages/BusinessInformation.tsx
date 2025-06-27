import { Link } from 'react-router-dom';
import { ArrowLeft, Building, Mail, Phone, User, MapPin, CreditCard, Truck, Clock, FileText, ShieldCheck } from 'lucide-react';
import { Card } from '../components/Card';

export function BusinessInformation() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <Link to="/" className="inline-flex items-center text-blue-600 hover:text-blue-800">
          <ArrowLeft className="w-4 h-4 mr-2" />
          ホームに戻る
        </Link>
      </div>

      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold mb-4">特定商取引法に基づく表記</h1>
        <p className="text-gray-600">Business Information Based on the Specified Commercial Transaction Act</p>
      </div>

      <Card className="mb-8 p-6">
        <div className="space-y-8">
          <div className="border-b pb-6">
            <div className="flex items-start space-x-3">
              <Building className="w-6 h-6 text-blue-600 mt-1 flex-shrink-0" />
              <div>
                <h2 className="text-xl font-bold mb-3">販売事業者</h2>
                <table className="w-full border-collapse">
                  <tbody>
                    <tr className="border-b">
                      <th className="py-3 text-left w-1/3 align-top">事業者名</th>
                      <td className="py-3">株式会社CAPAS</td>
                    </tr>
                    <tr className="border-b">
                      <th className="py-3 text-left align-top">代表者名</th>
                      <td className="py-3">代表取締役 松本 保弘</td>
                    </tr>
                    <tr className="border-b">
                      <th className="py-3 text-left align-top">所在地</th>
                      <td className="py-3">
                        〒861-0563<br />
                        熊本県山鹿市鹿央町千田１７１８－１３
                      </td>
                    </tr>
                    <tr className="border-b">
                      <th className="py-3 text-left align-top">電話番号</th>
                      <td className="py-3">0968-36-9208（平日10:00〜17:00）</td>
                    </tr>
                    <tr className="border-b">
                      <th className="py-3 text-left align-top">メールアドレス</th>
                      <td className="py-3">info@dogparkjp.com</td>
                    </tr>
                    <tr>
                      <th className="py-3 text-left align-top">URL</th>
                      <td className="py-3">https://dogparkjp.com</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="border-b pb-6">
            <div className="flex items-start space-x-3">
              <ShieldCheck className="w-6 h-6 text-blue-600 mt-1 flex-shrink-0" />
              <div>
                <h2 className="text-xl font-bold mb-3">サービス内容</h2>
                <table className="w-full border-collapse">
                  <tbody>
                    <tr className="border-b">
                      <th className="py-3 text-left w-1/3 align-top">サービス名</th>
                      <td className="py-3">ドッグパークJP</td>
                    </tr>
                    <tr className="border-b">
                      <th className="py-3 text-left align-top">サービス内容</th>
                      <td className="py-3">
                        <ul className="list-disc pl-5 space-y-1">
                          <li>ドッグラン施設の利用（1日券）</li>
                          <li>ドッグラン施設の利用（サブスクリプション）</li>
                          <li>ドッグラン施設の貸し切り予約</li>
                          <li>ペット用品の販売</li>
                        </ul>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="border-b pb-6">
            <div className="flex items-start space-x-3">
              <CreditCard className="w-6 h-6 text-blue-600 mt-1 flex-shrink-0" />
              <div>
                <h2 className="text-xl font-bold mb-3">料金・お支払い方法</h2>
                <table className="w-full border-collapse">
                  <tbody>
                    <tr className="border-b">
                      <th className="py-3 text-left w-1/3 align-top">料金</th>
                      <td className="py-3">
                        <ul className="list-disc pl-5 space-y-1">
                          <li>ドッグラン1日券：800円（税込）</li>
                          <li>サブスクリプション：3,800円/月（税込）</li>
                          <li>施設貸し切り：4,400円/時間（税込）</li>
                          <li>ペット用品：各商品ページに表示された価格</li>
                        </ul>
                      </td>
                    </tr>
                    <tr className="border-b">
                      <th className="py-3 text-left align-top">支払い方法</th>
                      <td className="py-3">
                        <ul className="list-disc pl-5 space-y-1">
                          <li>クレジットカード決済（VISA、Mastercard、JCB、AMEX）</li>
                          <li>PayPay決済</li>
                        </ul>
                      </td>
                    </tr>
                    <tr>
                      <th className="py-3 text-left align-top">支払い時期</th>
                      <td className="py-3">
                        <ul className="list-disc pl-5 space-y-1">
                          <li>ドッグラン1日券：利用時に即時決済</li>
                          <li>サブスクリプション：申込時に初回決済、以降は毎月自動更新</li>
                          <li>施設貸し切り：予約確定時に即時決済</li>
                          <li>ペット用品：注文確定時に即時決済</li>
                        </ul>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="border-b pb-6">
            <div className="flex items-start space-x-3">
              <Truck className="w-6 h-6 text-blue-600 mt-1 flex-shrink-0" />
              <div>
                <h2 className="text-xl font-bold mb-3">商品の引き渡し時期</h2>
                <table className="w-full border-collapse">
                  <tbody>
                    <tr className="border-b">
                      <th className="py-3 text-left w-1/3 align-top">ドッグラン利用</th>
                      <td className="py-3">
                        決済完了後、即時にQRコードが発行され、24時間有効です。
                      </td>
                    </tr>
                    <tr className="border-b">
                      <th className="py-3 text-left align-top">サブスクリプション</th>
                      <td className="py-3">
                        決済完了後、即時に利用可能となり、解約するまで毎月自動更新されます。
                      </td>
                    </tr>
                    <tr className="border-b">
                      <th className="py-3 text-left align-top">施設貸し切り</th>
                      <td className="py-3">
                        予約した日時に施設を利用できます。QRコードは予約日の24時間前に発行されます。
                      </td>
                    </tr>
                    <tr>
                      <th className="py-3 text-left align-top">ペット用品</th>
                      <td className="py-3">
                        注文確定後、通常3〜5営業日以内に発送いたします。<br />
                        配送業者：ヤマト運輸、佐川急便など<br />
                        送料：全国一律690円（税込）<br />
                        ※5,000円以上のご注文、またはサブスクリプション会員は送料無料
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="border-b pb-6">
            <div className="flex items-start space-x-3">
              <Clock className="w-6 h-6 text-blue-600 mt-1 flex-shrink-0" />
              <div>
                <h2 className="text-xl font-bold mb-3">返品・キャンセルについて</h2>
                <table className="w-full border-collapse">
                  <tbody>
                    <tr className="border-b">
                      <th className="py-3 text-left w-1/3 align-top">ドッグラン利用</th>
                      <td className="py-3">
                        QRコード発行後のキャンセル・返金はできません。
                      </td>
                    </tr>
                    <tr className="border-b">
                      <th className="py-3 text-left align-top">サブスクリプション</th>
                      <td className="py-3">
                        いつでも解約可能ですが、日割り返金はありません。解約後は次回更新日まで利用可能です。
                      </td>
                    </tr>
                    <tr className="border-b">
                      <th className="py-3 text-left align-top">施設貸し切り</th>
                      <td className="py-3">
                        予約日の7日前までは全額返金、3日前までは50%返金、それ以降はキャンセル・返金できません。
                      </td>
                    </tr>
                    <tr>
                      <th className="py-3 text-left align-top">ペット用品</th>
                      <td className="py-3">
                        商品到着後8日以内に未使用・未開封の状態であれば返品可能です。<br />
                        ただし、以下の場合は返品をお受けできません：<br />
                        <ul className="list-disc pl-5 space-y-1 mt-2">
                          <li>お客様のご都合による返品（サイズ違い、イメージ違いなど）</li>
                          <li>使用済み、開封済みの商品</li>
                          <li>食品、消耗品</li>
                          <li>お客様の責任で破損・汚損した商品</li>
                        </ul>
                        返品送料はお客様負担となります。不良品・誤配送の場合は当社負担で対応いたします。
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-start space-x-3">
              <FileText className="w-6 h-6 text-blue-600 mt-1 flex-shrink-0" />
              <div>
                <h2 className="text-xl font-bold mb-3">その他の重要事項</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">動作環境</h3>
                    <p className="text-gray-700">
                      本サービスは以下の環境での動作を推奨しています：<br />
                      • iOS 14.0以上、Android 10.0以上<br />
                      • Google Chrome、Safari、Firefox、Microsoft Edgeの最新版<br />
                      • JavaScript有効
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold mb-2">ドッグラン利用条件</h3>
                    <p className="text-gray-700">
                      • 狂犬病ワクチンおよび混合ワクチンの接種証明書が必要です<br />
                      • 発情中のメス犬、攻撃的な行動を示す犬は入場できません<br />
                      • 詳細は「<Link to="/parks/rules" className="text-blue-600 hover:underline">ドッグラン利用ルール</Link>」をご確認ください
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold mb-2">免責事項</h3>
                    <p className="text-gray-700">
                      ドッグラン施設内での事故、怪我、トラブルについて、当社は一切の責任を負いません。<br />
                      ユーザーは自己の責任において本サービスを利用するものとします。<br />
                      詳細は「<Link to="/terms" className="text-blue-600 hover:underline">利用規約</Link>」をご確認ください。
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold mb-2">個人情報の取り扱い</h3>
                    <p className="text-gray-700">
                      お客様の個人情報は、「<Link to="/privacy" className="text-blue-600 hover:underline">プライバシーポリシー</Link>」に基づき適切に管理いたします。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="text-center text-sm text-gray-600">
        <p>本ページの記載内容は、特定商取引法第11条（通信販売についての広告）に基づく表記です。</p>
        <p>最終更新日: 2025年6月20日</p>
      </div>
    </div>
  );
}