import { AlertTriangle, Building, CheckCircle, DollarSign } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../utils/supabase';
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
  const [nameError, setNameError] = useState<string>('');
  const [isCheckingName, setIsCheckingName] = useState(false);

  const updateFormData = (updates: Partial<BasicInfoFormData>) => {
    onFormDataChange(updates);
  };

  // ドッグラン名の重複チェック
  const checkDuplicateName = async (name: string) => {
    if (!name.trim()) {
      setNameError('');
      return;
    }

    setIsCheckingName(true);
    try {
      const { data, error } = await supabase
        .from('dog_parks')
        .select('id, name')
        .eq('name', name.trim())
        .limit(1);

      if (error) {
        console.error('名前重複チェックエラー:', error);
        setNameError('');
        return;
      }

      if (data && data.length > 0) {
        setNameError('このドッグラン名は既に使用されています。別の名前を選択してください。');
      } else {
        setNameError('');
      }
    } catch (error) {
      console.error('名前重複チェックエラー:', error);
      setNameError('');
    } finally {
      setIsCheckingName(false);
    }
  };

  // ドッグラン名が変更されたら重複チェック
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.name.trim()) {
        checkDuplicateName(formData.name);
      } else {
        setNameError('');
      }
    }, 500); // 500ms後に実行（デバウンス）

    return () => clearTimeout(timer);
  }, [formData.name]);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center space-x-2 mb-4">
          <CheckCircle className="w-6 h-6 text-green-600" />
          <span className="text-green-800 font-medium">第一次審査/本人確認申請中</span>
        </div>
        <h1 className="text-2xl font-bold mb-2">ドッグラン登録 - 詳細情報入力</h1>
        <p className="text-gray-600">第一次審査/本人確認申請中です。詳細な施設情報を入力してください。</p>
      </div>

      {/* 審査状況表示 */}
      <Card className="mb-6 bg-green-50 border-green-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <div>
              <h3 className="font-semibold text-green-900">第一次審査/本人確認申請中</h3>
              <p className="text-sm text-green-800">基本条件と本人確認を申請中です</p>
            </div>
          </div>
          <div className="text-right text-sm text-green-700">
            <p>次のステップ: 第二審査（書類審査）</p>
          </div>
        </div>
      </Card>

      {error && (
        <div className="mb-6 p-4 bg-red-50 rounded-lg">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}

      <Card className="p-6">
        <form onSubmit={onSubmit} className="space-y-6">
          <div className="mb-4">
            <Input
              label="ドッグラン名 *"
              value={formData.name}
              onChange={(e) => updateFormData({ name: e.target.value })}
              placeholder="例: 渋谷中央ドッグラン"
              required
            />
            {isCheckingName && (
              <p className="text-xs text-blue-600 mt-1">名前の重複を確認中...</p>
            )}
            {nameError && (
              <p className="text-xs text-red-600 mt-1 flex items-start space-x-1">
                <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                <span>{nameError}</span>
              </p>
            )}
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              説明
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => updateFormData({ description: e.target.value })}
              placeholder="ドッグランの特徴や魅力をご紹介ください"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>

          <div className="mb-4">
            <Input
              label="住所 *"
              value={formData.address}
              onChange={(e) => updateFormData({ address: e.target.value })}
              placeholder="例: 東京都渋谷区道玄坂1-1-1"
              required
            />
          </div>

          <div className="mb-4">
            <Input
              label="最大収容頭数 *"
              type="number"
              min="1"
              value={formData.maxCapacity}
              onChange={(e) => updateFormData({ maxCapacity: e.target.value })}
              placeholder="例: 15"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              同時に利用できる犬の最大頭数を入力してください
            </p>
          </div>

          {/* 犬のサイズ対応 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              対応犬種 *
            </label>
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.largeDogArea}
                  onChange={(e) => updateFormData({ largeDogArea: e.target.checked })}
                  className="rounded text-blue-600"
                />
                <span>大型犬エリア</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.smallDogArea}
                  onChange={(e) => updateFormData({ smallDogArea: e.target.checked })}
                  className="rounded text-blue-600"
                />
                <span>小型犬エリア</span>
              </label>
            </div>
          </div>

          {/* 貸し切りブース */}
          <div className="mb-4">
            <label className="flex items-center space-x-2 mb-2">
              <input
                type="checkbox"
                checked={formData.privateBooths}
                onChange={(e) => updateFormData({ privateBooths: e.target.checked })}
                className="rounded text-blue-600"
              />
              <span className="text-sm font-medium text-gray-700">貸し切りブース</span>
            </label>
            {formData.privateBooths && (
              <div className="ml-6">
                <Input
                  label="貸し切りブース数"
                  type="number"
                  min="1"
                  value={formData.privateBoothCount}
                  onChange={(e) => updateFormData({ privateBoothCount: e.target.value })}
                  placeholder="例: 2"
                />
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

          <Card className="bg-blue-50 border-blue-200">
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
          </Card>

          <div className="mt-4 flex justify-between items-center">
            <Link to="/owner-payment-system" className="text-blue-600 hover:text-blue-800 flex items-center">
              <DollarSign className="w-4 h-4 mr-1" />
              <span className="text-sm">収益システムについて</span>
            </Link>
            <Button 
              type="submit" 
              isLoading={isLoading}
              disabled={isLoading || !!nameError || isCheckingName}
              className="bg-blue-600 hover:bg-blue-700"
            >
              第二審査に申し込む
            </Button>
          </div>
          {nameError && (
            <div className="mt-2 p-3 bg-red-50 rounded-lg">
              <p className="text-sm text-red-800 flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>ドッグラン名に問題があります。名前を変更してから再度お試しください。</span>
              </p>
            </div>
          )}
        </form>
      </Card>
    </div>
  );
} 
