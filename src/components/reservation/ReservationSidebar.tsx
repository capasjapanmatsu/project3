import Card from '../Card';
import { Crown, CreditCard, PawPrint, Calculator, Key, Building } from 'lucide-react';

interface ReservationSidebarProps {
  hasSubscription: boolean;
}

export function ReservationSidebar({ hasSubscription }: ReservationSidebarProps) {
  return (
    <div className="space-y-6">
      {/* サブスク特典 */}
      {hasSubscription ? (
        <Card className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Crown className="w-5 h-5" />
            <span className="font-semibold">サブスク会員特典</span>
          </div>
          <div className="text-sm space-y-1">
            <p>• 3頭まで使い放題</p>
            <p>• 施設貸し切り20%OFF</p>
            <p>• ペットショップ10%OFF</p>
          </div>
        </Card>
      ) : (
        <Card className="bg-gradient-to-r from-blue-500 to-purple-500 text-white p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Crown className="w-5 h-5" />
            <span className="font-semibold">サブスクリプションがお得！</span>
          </div>
          <div className="text-sm space-y-1 mb-3">
            <p>• 月額¥3,800で3頭まで使い放題</p>
            <p>• 施設貸し切り20%OFF</p>
            <p>• ペットショップ10%OFF</p>
            <p>• 全国のドッグランで利用可能</p>
          </div>
          <p className="text-xs">
            サブスクリプションを選択して決済ページで申し込みできます
          </p>
        </Card>
      )}

      {/* 料金体系 */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2 flex items-center">
          <Calculator className="w-4 h-4 mr-2" />
          料金体系
        </h3>
        <div className="space-y-2 text-sm text-blue-800">
          <div>
            <p className="font-medium">1日券（段階的料金制）</p>
            <div className="ml-2 space-y-1">
              <p>• 1頭目: ¥800</p>
              <p>• 2頭目: +¥400</p>
              <p>• 3頭目: +¥400</p>
              <p className="font-medium">3頭合計: ¥1,600</p>
            </div>
          </div>
          <div>
            <p className="font-medium">サブスク: 月額¥3,800</p>
            <p className="ml-2">3頭まで使い放題</p>
          </div>
          <div>
            <p className="font-medium flex items-center">
              <Building className="w-3 h-3 mr-1" />
              施設貸し切り
            </p>
            <div className="ml-2 space-y-1">
              <p>• 通常: ¥4,400/1時間</p>
              <p className="text-purple-700 font-medium">• サブスク: ¥3,520/1時間（20%OFF）</p>
              <p>• 1時間単位で予約可能</p>
              <p>• <strong>2日前までの予約が必要</strong></p>
            </div>
          </div>
        </div>
      </Card>

      {/* 決済について */}
      <Card className="p-4 bg-green-50 border-green-200">
        <div className="flex items-center space-x-2 mb-2">
          <CreditCard className="w-5 h-5 text-green-600" />
          <h3 className="font-semibold text-green-900">決済について</h3>
        </div>
        <div className="space-y-1 text-sm text-green-800">
          <p>• 安全なクレジットカード決済</p>
          <p>• 決済完了後、即座にPINコード発行</p>
          <p>• 24時間有効（1日券の場合）</p>
          <p>• 全国のドッグランで利用可能</p>
          <p>• 最大3頭まで同時入場</p>
        </div>
      </Card>

      {/* 1日券の特徴 */}
      <Card className="p-4 bg-green-50 border-green-200">
        <div className="flex items-center space-x-2 mb-2">
          <Calculator className="w-5 h-5 text-green-600" />
          <h3 className="font-semibold text-green-900">1日券の特徴</h3>
        </div>
        <div className="space-y-1 text-sm text-green-800">
          <p>• 24時間有効（発行から24時間後に失効）</p>
          <p>• 最大3頭まで同時入場可能</p>
          <p>• 段階的料金制でお得</p>
          <p>• 全国のドッグランで利用可能</p>
          <p className="text-red-600 font-medium">• 施設貸し切り中は入場できません</p>
        </div>
      </Card>

      {/* 施設貸し切り特典 */}
      <Card className="p-4 bg-orange-50 border-orange-200">
        <div className="flex items-center space-x-2 mb-2">
          <Building className="w-5 h-5 text-orange-600" />
          <h3 className="font-semibold text-orange-900">施設貸し切り特典</h3>
        </div>
        <div className="space-y-1 text-sm text-orange-800">
          <p>• 施設全体を独占利用</p>
          <p>• 人数制限なし</p>
          <p>• 1時間単位での利用</p>
          <p>• 最大3頭まで同時入場</p>
          <p>• 友達にPINコード共有可能</p>
          <p>• 他の利用者を一切気にせず自由に遊べます</p>
          <p>• 大型犬・小型犬エリア両方利用可能</p>
          <p className="text-purple-700 font-medium">• サブスク会員は20%OFF！</p>
          <p className="text-red-600 font-medium">• <strong>2日前までの予約が必要</strong></p>
        </div>
      </Card>

      {/* 入場時の犬選択について */}
      <Card className="p-4 bg-yellow-50 border-yellow-200">
        <div className="flex items-center space-x-2 mb-2">
          <PawPrint className="w-5 h-5 text-yellow-600" />
          <h3 className="font-semibold text-yellow-900">入場時の犬選択</h3>
        </div>
        <div className="space-y-1 text-sm text-yellow-800">
          <p>• 最大3頭まで選択可能</p>
          <p>• 選択した犬のみ入場可能</p>
          <p>• 全ての犬のワクチン証明書が必要</p>
          <p>• 後から犬の変更はできません</p>
        </div>
      </Card>

      {/* PINコード発行の説明 */}
      <Card className="p-4 bg-green-50 border-green-200">
        <div className="flex items-center space-x-2 mb-2">
          <Key className="w-4 h-4 text-green-600" />
          <span className="text-sm font-medium text-green-900">決済完了後の流れ</span>
        </div>
        <div className="text-xs text-green-800 space-y-1">
          <p>1. 決済完了と同時に入場用PINコードが発行されます</p>
          <p>2. マイページの「入退場」からPINコードを確認</p>
          <p>3. 予約日時にドッグラン入口でPINコードを入力</p>
          <p>4. 選択した全ての犬と一緒に入場できます</p>
          <p className="text-orange-700 font-medium">5. 施設貸し切りの場合、友達にPINコードを共有可能！</p>
        </div>
      </Card>
    </div>
  );
}
