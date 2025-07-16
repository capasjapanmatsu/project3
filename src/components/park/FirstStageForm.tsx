import { AlertCircle, AlertTriangle, DollarSign, Edit, FileText, Shield, ShieldAlert, Upload, User } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../Button';
import Card from '../Card';
import Input from '../Input';

interface FirstStageFormData {
  isCurrentlyOperating: string;
  isOwnedLand: string;
  hasOwnerPermission: string;
  hasNeighborConsent: string;
  landArea: string;
  isAntiSocialForces: string;
  canVisitWeekly: string;
  canReachQuickly: string;
  facilities: {
    parking: boolean;
    shower: boolean;
    restroom: boolean;
    agility: boolean;
    rest_area: boolean;
    water_station: boolean;
  };
  // 本人確認書類のフィールドを追加
  identityDocument: File | null;
}

interface ProfileData {
  name: string;
  postal_code: string;
  address: string;
  phone_number: string;
  email: string;
}

interface FirstStageFormProps {
  formData: FirstStageFormData;
  onFormDataChange: (data: Partial<FirstStageFormData>) => void;
  onSubmit: (e: React.FormEvent) => void;
  error: string;
  profileData: ProfileData;
  profileLoading: boolean;
  onProfileUpdate: (data: ProfileData) => void;
}

export default function FirstStageForm({
  formData,
  onFormDataChange,
  onSubmit,
  error,
  profileData,
  profileLoading,
  onProfileUpdate,
}: FirstStageFormProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [showProfileEditModal, setShowProfileEditModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState<ProfileData>(profileData);
  
  const updateFormData = (updates: Partial<FirstStageFormData>) => {
    onFormDataChange(updates);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      updateFormData({ identityDocument: e.target.files[0] });
    }
  };

  const handleProfileSave = () => {
    onProfileUpdate(editingProfile);
    setShowProfileEditModal(false);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-center mb-8">ドッグラン登録 - 第一審査・本人確認</h1>
      
      {/* 審査プロセスの説明 */}
      <Card className="mb-6 bg-blue-50 border-blue-200">
        <div className="flex items-start space-x-3">
          <FileText className="w-6 h-6 text-blue-600 mt-1" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">新しい審査プロセスについて</h3>
            <div className="text-sm text-blue-800 space-y-1">
              <p><strong>第一審査・本人確認:</strong> 基本的な条件の確認と本人確認書類の審査</p>
              <p><strong>第二審査:</strong> 詳細な施設情報と書類審査</p>
              <p><strong>QRコード実証検査:</strong> 実際の施設での動作確認</p>
              <p><strong>掲載・運営開始:</strong> 一般公開と予約受付開始</p>
            </div>
            <div className="mt-3 flex items-center">
              <Link to="/owner-payment-system" className="text-blue-600 hover:text-blue-800 flex items-center">
                <DollarSign className="w-4 h-4 mr-1" />
                <span className="text-sm font-medium">料金体系と収益システムについて詳しく見る</span>
              </Link>
            </div>
          </div>
        </div>
      </Card>

      {/* 登録情報の確認 */}
      <Card className="mb-6 bg-yellow-50 border-yellow-200">
        <div className="flex items-start space-x-3">
          <User className="w-6 h-6 text-yellow-600 mt-1" />
          <div className="flex-1">
            <h3 className="font-semibold text-yellow-900 mb-2">登録情報の確認</h3>
            <div className="text-sm text-yellow-800 mb-4">
              <p>本人確認書類に記載された情報と一致するかご確認ください。</p>
              <p>間違いがある場合は修正してから本人確認書類をアップロードしてください。</p>
            </div>
            
            {profileLoading ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-600"></div>
                <span className="ml-2 text-yellow-800">プロフィール情報を読み込み中...</span>
              </div>
            ) : (
              <div className="bg-white p-4 rounded-lg border border-yellow-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">氏名</p>
                    <p className="font-medium text-gray-900">{profileData.name || '未設定'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">郵便番号</p>
                    <p className="font-medium text-gray-900">{profileData.postal_code || '未設定'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">住所</p>
                    <p className="font-medium text-gray-900">{profileData.address || '未設定'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">電話番号</p>
                    <p className="font-medium text-gray-900">{profileData.phone_number || '未設定'}</p>
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setEditingProfile(profileData);
                      setShowProfileEditModal(true);
                    }}
                    className="flex items-center"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    情報を修正
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* 本人確認について */}
      <Card className="mb-6 bg-green-50 border-green-200">
        <div className="flex items-start space-x-3">
          <Shield className="w-6 h-6 text-green-600 mt-1" />
          <div>
            <h3 className="font-semibold text-green-900 mb-2">本人確認書類について</h3>
            <div className="text-sm text-green-800 space-y-1">
              <p>安全なプラットフォーム運営のため、ドッグランオーナーには本人確認が必要です。</p>
              <p>運転免許証、マイナンバーカード、パスポートなどの本人確認書類の画像をアップロードしてください。</p>
              <p>住所と氏名が登録情報と一致することを確認させていただきます。</p>
            </div>
          </div>
        </div>
      </Card>

      {/* 照合確認警告 */}
      <Card className="mb-6 bg-orange-50 border-orange-200">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-6 h-6 text-orange-600 mt-1" />
          <div>
            <h3 className="font-semibold text-orange-900 mb-2">重要な注意事項</h3>
            <div className="text-sm text-orange-800 space-y-1">
              <p><strong>本人確認書類の住所・氏名と上記の登録情報が一致している必要があります。</strong></p>
              <p>一致しない場合は審査が通らない場合があります。</p>
              <p>引っ越しなどで住所が変わった場合は、必ず上記の「情報を修正」から最新の情報に更新してください。</p>
            </div>
          </div>
        </div>
      </Card>

      {/* プロフィール編集モーダル */}
      {showProfileEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">登録情報の修正</h3>
            <div className="space-y-4">
              <Input
                label="氏名"
                value={editingProfile.name}
                onChange={(e) => setEditingProfile({...editingProfile, name: e.target.value})}
                placeholder="山田太郎"
              />
              <Input
                label="郵便番号"
                value={editingProfile.postal_code}
                onChange={(e) => setEditingProfile({...editingProfile, postal_code: e.target.value})}
                placeholder="123-4567"
              />
              <Input
                label="住所"
                value={editingProfile.address}
                onChange={(e) => setEditingProfile({...editingProfile, address: e.target.value})}
                placeholder="東京都新宿区西新宿1-1-1"
              />
              <Input
                label="電話番号"
                value={editingProfile.phone_number}
                onChange={(e) => setEditingProfile({...editingProfile, phone_number: e.target.value})}
                placeholder="090-1234-5678"
              />
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <Button
                variant="secondary"
                onClick={() => setShowProfileEditModal(false)}
              >
                キャンセル
              </Button>
              <Button
                onClick={handleProfileSave}
                disabled={profileLoading}
              >
                保存
              </Button>
            </div>
          </div>
        </div>
      )}

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
          {/* 現在の運営状況 */}
          <div className="mb-6">
            <label className="block text-lg font-bold text-gray-800 mb-3">
              現在ドッグランを運営していますか？ *
            </label>
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="isCurrentlyOperating"
                  value="yes"
                  checked={formData.isCurrentlyOperating === 'yes'}
                  onChange={(e) => updateFormData({ isCurrentlyOperating: e.target.value })}
                  className="text-blue-600"
                />
                <span>はい（すでに運営中）</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="isCurrentlyOperating"
                  value="no"
                  checked={formData.isCurrentlyOperating === 'no'}
                  onChange={(e) => updateFormData({ isCurrentlyOperating: e.target.value })}
                  className="text-blue-600"
                />
                <span>いいえ（新規開設予定）</span>
              </label>
            </div>

            {/* 新規開設予定の場合のみ表示 */}
            {formData.isCurrentlyOperating === 'no' && (
              <>
                {/* 土地の所有状況 */}
                <div className="mt-4 pl-4 border-l-4 border-blue-200">
                  <label className="block text-lg font-bold text-gray-800 mb-3">
                    予定地はあなたの所有地ですか？ *
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="isOwnedLand"
                        value="yes"
                        checked={formData.isOwnedLand === 'yes'}
                        onChange={(e) => updateFormData({ isOwnedLand: e.target.value })}
                        className="text-blue-600"
                      />
                      <span>はい（所有地）</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="isOwnedLand"
                        value="no"
                        checked={formData.isOwnedLand === 'no'}
                        onChange={(e) => updateFormData({ isOwnedLand: e.target.value })}
                        className="text-blue-600"
                      />
                      <span>いいえ（借用地）</span>
                    </label>
                  </div>

                  {/* 借用地の場合のみ表示 */}
                  {formData.isOwnedLand === 'no' && (
                    <div className="mt-4 pl-4 border-l-4 border-yellow-200">
                      <label className="block text-lg font-bold text-gray-800 mb-3">
                        土地所有者の許可は得ていますか？ *
                      </label>
                      <div className="space-y-2">
                        <label className="flex items-center space-x-2">
                          <input
                            type="radio"
                            name="hasOwnerPermission"
                            value="yes"
                            checked={formData.hasOwnerPermission === 'yes'}
                            onChange={(e) => updateFormData({ hasOwnerPermission: e.target.value })}
                            className="text-blue-600"
                          />
                          <span>はい</span>
                        </label>
                        <label className="flex items-center space-x-2">
                          <input
                            type="radio"
                            name="hasOwnerPermission"
                            value="no"
                            checked={formData.hasOwnerPermission === 'no'}
                            onChange={(e) => updateFormData({ hasOwnerPermission: e.target.value })}
                            className="text-blue-600"
                          />
                          <span>いいえ</span>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* 近隣住民の理解 */}
                  <div className="mt-4 pl-4 border-l-4 border-green-200">
                    <label className="block text-lg font-bold text-gray-800 mb-3">
                      近隣住民の理解は得ていますか？ *
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="hasNeighborConsent"
                          value="yes"
                          checked={formData.hasNeighborConsent === 'yes'}
                          onChange={(e) => updateFormData({ hasNeighborConsent: e.target.value })}
                          className="text-blue-600"
                        />
                        <span>はい</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="hasNeighborConsent"
                          value="no"
                          checked={formData.hasNeighborConsent === 'no'}
                          onChange={(e) => updateFormData({ hasNeighborConsent: e.target.value })}
                          className="text-blue-600"
                        />
                        <span>いいえ</span>
                      </label>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* 広さ */}
          <div className="mb-6">
            <Input
              label={<span className="text-lg font-bold text-gray-800">広さ（㎡） *</span>}
              type="number"
              min="1"
              value={formData.landArea}
              onChange={(e) => updateFormData({ landArea: e.target.value })}
              placeholder="例: 500"
              required
            />
            <p className="text-sm text-gray-500 mt-1">
              ドッグランの運営には最低100㎡以上の広さが必要です
            </p>
          </div>

          {/* 週1回の訪問可否 */}
          <div className="mb-6">
            <label className="block text-lg font-bold text-gray-800 mb-3">
              施設までは週に1度程度、状況の確認やメンテナンスに行くことができますか？ *
            </label>
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="canVisitWeekly"
                  value="yes"
                  checked={formData.canVisitWeekly === 'yes'}
                  onChange={(e) => updateFormData({ canVisitWeekly: e.target.value })}
                  className="text-blue-600"
                />
                <span>はい</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="canVisitWeekly"
                  value="no"
                  checked={formData.canVisitWeekly === 'no'}
                  onChange={(e) => updateFormData({ canVisitWeekly: e.target.value })}
                  className="text-blue-600"
                />
                <span>いいえ</span>
              </label>
            </div>
          </div>

          {/* 緊急時の到着可否 */}
          <div className="mb-6">
            <label className="block text-lg font-bold text-gray-800 mb-3">
              緊急時（怪我や事故など）に1時間以内に施設に到着できますか？ *
            </label>
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="canReachQuickly"
                  value="yes"
                  checked={formData.canReachQuickly === 'yes'}
                  onChange={(e) => updateFormData({ canReachQuickly: e.target.value })}
                  className="text-blue-600"
                />
                <span>はい</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="canReachQuickly"
                  value="no"
                  checked={formData.canReachQuickly === 'no'}
                  onChange={(e) => updateFormData({ canReachQuickly: e.target.value })}
                  className="text-blue-600"
                />
                <span>いいえ</span>
              </label>
            </div>
          </div>

          {/* 反社会的勢力 */}
          <div className="mb-6">
            <label className="block text-lg font-bold text-gray-800 mb-3">
              反社会的勢力との関係はありますか？ *
            </label>
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="isAntiSocialForces"
                  value="no"
                  checked={formData.isAntiSocialForces === 'no'}
                  onChange={(e) => updateFormData({ isAntiSocialForces: e.target.value })}
                  className="text-blue-600"
                />
                <span>いいえ（関係なし）</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="isAntiSocialForces"
                  value="yes"
                  checked={formData.isAntiSocialForces === 'yes'}
                  onChange={(e) => updateFormData({ isAntiSocialForces: e.target.value })}
                  className="text-blue-600"
                />
                <span>はい（関係あり）</span>
              </label>
            </div>
            {formData.isAntiSocialForces === 'yes' && (
              <div className="mt-2 p-3 bg-red-50 rounded-lg">
                <div className="flex items-start space-x-2">
                  <ShieldAlert className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-800">
                    反社会的勢力との関係がある場合、ドッグランの登録はできません。当社は反社会的勢力との関係を一切認めておりません。
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 本人確認書類のアップロード */}
          <div className="mb-6">
            <label className="block text-lg font-bold text-gray-800 mb-3">
              本人確認書類のアップロード *
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={handleFileChange}
                className="hidden"
                id="identity-upload"
                required
              />
              <label 
                htmlFor="identity-upload" 
                className="cursor-pointer text-blue-600 hover:text-blue-800 font-medium"
              >
                ファイルを選択
              </label>
              <p className="text-sm text-gray-500 mt-2">
                運転免許証・マイナンバーカード・パスポート等の画像またはPDF
              </p>
              <p className="text-sm text-gray-500">
                最大ファイルサイズ: 10MB
              </p>
              {formData.identityDocument && (
                <p className="text-sm text-green-600 mt-2">
                  選択されたファイル: {formData.identityDocument.name}
                </p>
              )}
            </div>
          </div>

          {/* 予定設備 */}
          <div className="mb-6">
            <label className="block text-lg font-bold text-gray-800 mb-3">
              予定設備 *
            </label>
            <div className="grid grid-cols-2 gap-3">
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
                  <span className="text-sm">{label}</span>
                </label>
              ))}
            </div>
          </div>

          <Card className="bg-yellow-50 border-yellow-200">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium mb-1">第一審査・本人確認について</p>
                <ul className="space-y-1 text-xs">
                  <li>• 基本的な開設条件を満たしているかを確認します</li>
                  <li>• 本人確認書類の住所・氏名が登録情報と一致することを確認します</li>
                  <li>• 通過後、詳細な施設情報の入力に進みます</li>
                  <li>• 第二審査では書類審査を行います</li>
                  <li>• 最終的にQRコード実証検査を経て掲載開始となります</li>
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
              className="w-1/2 bg-blue-600 hover:bg-blue-700"
              disabled={!formData.identityDocument || isUploading}
              isLoading={isUploading}
            >
              <Shield className="w-4 h-4 mr-2" />
              第一審査・本人確認を申し込む
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
} 