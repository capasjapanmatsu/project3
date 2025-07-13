import { Link } from 'react-router-dom';
import { CheckCircle, DollarSign, Building } from 'lucide-react';
import Button from '../Button';
import Card from '../Card';
import Input from '../Input';

interface BasicInfoFormData {
  name: string;
  description: string;
  address: string;
  maxCapacity: string;
  largeDogArea: boolean;
  smallDogArea: boolean;
  privateBooths: boolean;
  privateBoothCount: string;
  facilities: {
    parking: boolean;
    shower: boolean;
    restroom: boolean;
    agility: boolean;
    rest_area: boolean;
    water_station: boolean;
  };
  facilityDetails: string;
}

interface BasicInfoFormProps {
  formData: BasicInfoFormData;
  onFormDataChange: (data: Partial<BasicInfoFormData>) => void;
  onSubmit: (e: React.FormEvent) => void;
  error: string;
  isLoading: boolean;
}

export default function BasicInfoForm({
  formData,
  onFormDataChange,
  onSubmit,
  error,
  isLoading,
}: BasicInfoFormProps) {
  const updateFormData = (updates: Partial<BasicInfoFormData>) => {
    onFormDataChange(updates);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center space-x-2 mb-4">
          <CheckCircle className="w-6 h-6 text-green-600" />
          <span className="text-green-800 font-medium">第一審査通過・本人確認完了</span>
        </div>
        <h1 className="text-2xl font-bold mb-2">ドッグラン登録 - 詳細情報入力</h1>
        <p className="text-gray-600">第一審査を通過し、本人確認が完了しました。詳細な施設情報を入力してください。</p>
      </div>

      {/* 審査状況表示 */}
      <Card className="mb-6 bg-green-50 border-green-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <div>
              <h3 className="font-semibold text-green-900">第一審査・本人確認完了</h3>
              <p className="text-sm text-green-800">基本条件をクリアしました</p>
            </div>
          </div>
          <div className="text-right text-sm text-green-700">
            <p>次のステップ: 第二審査（書類審査）</p>
          </div>
        </div>
      </Card>

      <Card>
        <form onSubmit={onSubmit}>
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          <Input
            label="施設名 *"
            value={formData.name}
            onChange={(e) => updateFormData({ name: e.target.value })}
            required
          />
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              説明 *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => updateFormData({ description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
              required
            />
          </div>
          
          <Input
            label="住所 *"
            value={formData.address}
            onChange={(e) => updateFormData({ address: e.target.value })}
            required
          />
          
          {/* 料金情報（固定） */}
          <div className="mb-4 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2 flex items-center">
              <DollarSign className="w-5 h-5 mr-2" />
              料金情報（全国統一）
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
              <div>
                <p className="font-medium">通常利用料金</p>
                <p>¥800/日（固定）</p>
              </div>
              <div>
                <p className="font-medium">施設貸し切り料金</p>
                <p>¥4,400/時間（固定）</p>
              </div>
              <div>
                <p className="font-medium">サブスクリプション</p>
                <p>¥3,800/月（全国共通）</p>
              </div>
            </div>
            <p className="text-xs text-blue-600 mt-2">
              ※ 料金はシステムで自動設定されます。オーナー様の取り分は売上の80%です。
            </p>
          </div>
          
          <Input
            label="最大収容人数 *"
            type="number"
            min="1"
            value={formData.maxCapacity}
            onChange={(e) => updateFormData({ maxCapacity: e.target.value })}
            required
          />
          
          {/* Dog Size Areas */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              対応犬種サイズ
            </label>
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.largeDogArea}
                  onChange={(e) => updateFormData({
                    largeDogArea: e.target.checked,
                  })}
                  className="rounded text-blue-600"
                />
                <span>大型犬エリア</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.smallDogArea}
                  onChange={(e) => updateFormData({
                    smallDogArea: e.target.checked,
                  })}
                  className="rounded text-blue-600"
                />
                <span>小型犬エリア</span>
              </label>
            </div>
          </div>

          {/* Private Booths */}
          <div className="mb-4">
            <label className="flex items-center space-x-2 mb-3">
              <input
                type="checkbox"
                checked={formData.privateBooths}
                onChange={(e) => updateFormData({
                  privateBooths: e.target.checked,
                  privateBoothCount: e.target.checked ? formData.privateBoothCount : '0',
                })}
                className="rounded text-blue-600"
              />
              <span className="text-sm font-medium text-gray-700">プライベートブースあり</span>
            </label>
            
            {formData.privateBooths && (
              <div className="ml-6">
                <Input
                  label="ブース数"
                  type="number"
                  min="1"
                  value={formData.privateBoothCount}
                  onChange={(e) => updateFormData({ privateBoothCount: e.target.value })}
                />
                <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <span className="font-medium">プライベートブース料金:</span> サブスク使い放題・1日券でも利用可能（追加料金なし）
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    ※ 料金はシステムで自動設定されます
                  </p>
                </div>
              </div>
            )}
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              設備・サービス（第一審査で選択した内容を確認・修正できます）
            </label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries({
                parking: '駐車場',
                shower: 'シャワー設備',
                restroom: 'トイレ',
                agility: 'アジリティ設備',
                rest_area: '休憩スペース',
                water_station: '給水設備',
              }).map(([key, label]) => (
                <label key={key} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.facilities[key as keyof typeof formData.facilities]}
                    onChange={(e) => updateFormData({
                      facilities: {
                        ...formData.facilities,
                        [key]: e.target.checked,
                      },
                    })}
                    className="rounded text-blue-600"
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              設備の詳細情報
            </label>
            <textarea
              value={formData.facilityDetails}
              onChange={(e) => updateFormData({ facilityDetails: e.target.value })}
              placeholder="設備やサービスについての詳細な情報を入力してください"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-start space-x-2">
              <Building className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">第二審査について</p>
                <ul className="space-y-1 text-xs">
                  <li>• 詳細な施設情報と必要書類の審査を行います</li>
                  <li>• 審査期間は通常3-5営業日です</li>
                  <li>• 通過後、QRコード実証検査の日程調整を行います</li>
                  <li>• 実証検査完了後、一般公開となります</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-4 flex justify-between items-center">
            <Link to="/owner-payment-system" className="text-blue-600 hover:text-blue-800 flex items-center">
              <DollarSign className="w-4 h-4 mr-1" />
              <span className="text-sm">収益システムについて</span>
            </Link>
            <Button 
              type="submit" 
              isLoading={isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              第二審査に申し込む
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
} 