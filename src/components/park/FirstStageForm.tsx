import { Link } from 'react-router-dom';
import { FileText, DollarSign, AlertTriangle, ShieldAlert } from 'lucide-react';
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
}

interface FirstStageFormProps {
  formData: FirstStageFormData;
  onFormDataChange: (data: Partial<FirstStageFormData>) => void;
  onSubmit: (e: React.FormEvent) => void;
  error: string;
}

export default function FirstStageForm({
  formData,
  onFormDataChange,
  onSubmit,
  error,
}: FirstStageFormProps) {
  const updateFormData = (updates: Partial<FirstStageFormData>) => {
    onFormDataChange(updates);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-center mb-8">ドッグラン登録 - 第一審査</h1>
      
      {/* 審査プロセスの説明 */}
      <Card className="mb-6 bg-blue-50 border-blue-200">
        <div className="flex items-start space-x-3">
          <FileText className="w-6 h-6 text-blue-600 mt-1" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">審査プロセスについて</h3>
            <div className="text-sm text-blue-800 space-y-1">
              <p><strong>第一審査:</strong> 基本的な条件の確認</p>
              <p><strong>本人確認:</strong> 安全なプラットフォーム運営のための本人確認</p>
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

      <Card>
        <form onSubmit={onSubmit}>
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {/* 現在の運営状況 */}
          <div className="mb-6">
            <label className="block text-lg font-bold text-gray-800 mb-3">
              予定地は現在すでにドッグランを運営していますか？ *
            </label>
            <div className="space-y-3">
              <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  value="yes"
                  checked={formData.isCurrentlyOperating === 'yes'}
                  onChange={(e) => updateFormData({ 
                    isCurrentlyOperating: e.target.value,
                    isOwnedLand: '', // リセット
                    hasOwnerPermission: '', // リセット
                    hasNeighborConsent: '' // リセット
                  })}
                  className="form-radio text-blue-600"
                />
                <div>
                  <span className="font-medium">はい</span>
                  <p className="text-sm text-gray-600">既にドッグランとして運営している施設です</p>
                </div>
              </label>
              <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  value="no"
                  checked={formData.isCurrentlyOperating === 'no'}
                  onChange={(e) => updateFormData({ 
                    isCurrentlyOperating: e.target.value 
                  })}
                  className="form-radio text-blue-600"
                />
                <div>
                  <span className="font-medium">いいえ</span>
                  <p className="text-sm text-gray-600">新規でドッグランを開設予定です</p>
                </div>
              </label>
            </div>
          </div>

          {/* 新規開設の場合の追加質問 */}
          {formData.isCurrentlyOperating === 'no' && (
            <>
              <div className="mb-6">
                <label className="block text-lg font-bold text-gray-800 mb-3">
                  予定地は所有地ですか？ *
                </label>
                <div className="space-y-3">
                  <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      value="yes"
                      checked={formData.isOwnedLand === 'yes'}
                      onChange={(e) => updateFormData({ 
                        isOwnedLand: e.target.value,
                        hasOwnerPermission: '' // 所有地の場合はリセット
                      })}
                      className="form-radio text-blue-600"
                    />
                    <div>
                      <span className="font-medium">はい</span>
                      <p className="text-sm text-gray-600">自己所有の土地です</p>
                    </div>
                  </label>
                  <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      value="no"
                      checked={formData.isOwnedLand === 'no'}
                      onChange={(e) => updateFormData({ 
                        isOwnedLand: e.target.value
                      })}
                      className="form-radio text-blue-600"
                    />
                    <div>
                      <span className="font-medium">いいえ</span>
                      <p className="text-sm text-gray-600">賃貸または借用地です</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* 借用地の場合の所有者許可確認 */}
              {formData.isOwnedLand === 'no' && (
                <div className="mb-6">
                  <label className="block text-lg font-bold text-gray-800 mb-3">
                    土地所有者の許可を得られていますか？ *
                  </label>
                  <div className="space-y-3">
                    <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        value="yes"
                        checked={formData.hasOwnerPermission === 'yes'}
                        onChange={(e) => updateFormData({ 
                          hasOwnerPermission: e.target.value 
                        })}
                        className="form-radio text-blue-600"
                      />
                      <div>
                        <span className="font-medium">はい</span>
                        <p className="text-sm text-gray-600">土地所有者からドッグラン運営の許可を得ています</p>
                      </div>
                    </label>
                    <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        value="no"
                        checked={formData.hasOwnerPermission === 'no'}
                        onChange={(e) => updateFormData({ 
                          hasOwnerPermission: e.target.value 
                        })}
                        className="form-radio text-blue-600"
                      />
                      <div>
                        <span className="font-medium">いいえ</span>
                        <p className="text-sm text-gray-600">まだ土地所有者の許可を得ていません</p>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* 近隣住民の理解確認（所有地・借用地両方で必要） */}
              {(formData.isOwnedLand === 'yes' || formData.isOwnedLand === 'no') && (
                <div className="mb-6">
                  <label className="block text-lg font-bold text-gray-800 mb-3">
                    近隣住民の理解を得られていますか？ *
                  </label>
                  <div className="space-y-3">
                    <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        value="yes"
                        checked={formData.hasNeighborConsent === 'yes'}
                        onChange={(e) => updateFormData({ 
                          hasNeighborConsent: e.target.value 
                        })}
                        className="form-radio text-blue-600"
                      />
                      <div>
                        <span className="font-medium">はい</span>
                        <p className="text-sm text-gray-600">近隣住民に説明し、理解を得ています</p>
                      </div>
                    </label>
                    <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        value="no"
                        checked={formData.hasNeighborConsent === 'no'}
                        onChange={(e) => updateFormData({ 
                          hasNeighborConsent: e.target.value 
                        })}
                        className="form-radio text-blue-600"
                      />
                      <div>
                        <span className="font-medium">いいえ</span>
                        <p className="text-sm text-gray-600">まだ近隣住民への説明ができていません</p>
                      </div>
                    </label>
                  </div>
                </div>
              )}
            </>
          )}

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
            <div className="space-y-3">
              <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  value="yes"
                  checked={formData.canVisitWeekly === 'yes'}
                  onChange={(e) => updateFormData({ 
                    canVisitWeekly: e.target.value 
                  })}
                  className="form-radio text-blue-600"
                />
                <div>
                  <span className="font-medium">はい</span>
                  <p className="text-sm text-gray-600">週に1度程度の訪問が可能です</p>
                </div>
              </label>
              <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  value="no"
                  checked={formData.canVisitWeekly === 'no'}
                  onChange={(e) => updateFormData({ 
                    canVisitWeekly: e.target.value 
                  })}
                  className="form-radio text-blue-600"
                />
                <div>
                  <span className="font-medium">いいえ</span>
                  <p className="text-sm text-gray-600">週に1度程度の訪問は難しいです</p>
                </div>
              </label>
            </div>
          </div>

          {/* 緊急時の到着可否 */}
          <div className="mb-6">
            <label className="block text-lg font-bold text-gray-800 mb-3">
              緊急時に1時間以内に施設まで行ける場所ですか？ *
            </label>
            <div className="space-y-3">
              <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  value="yes"
                  checked={formData.canReachQuickly === 'yes'}
                  onChange={(e) => updateFormData({ 
                    canReachQuickly: e.target.value 
                  })}
                  className="form-radio text-blue-600"
                />
                <div>
                  <span className="font-medium">はい</span>
                  <p className="text-sm text-gray-600">緊急時に1時間以内に到着できます</p>
                </div>
              </label>
              <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  value="no"
                  checked={formData.canReachQuickly === 'no'}
                  onChange={(e) => updateFormData({ 
                    canReachQuickly: e.target.value 
                  })}
                  className="form-radio text-blue-600"
                />
                <div>
                  <span className="font-medium">いいえ</span>
                  <p className="text-sm text-gray-600">緊急時に1時間以内の到着は難しいです</p>
                </div>
              </label>
            </div>
          </div>

          {/* 反社会的勢力との関係確認 */}
          <div className="mb-6">
            <label className="block text-lg font-bold text-gray-800 mb-3">
              反社会的勢力との関係について *
            </label>
            <div className="space-y-3">
              <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  value="no"
                  checked={formData.isAntiSocialForces === 'no'}
                  onChange={(e) => updateFormData({ 
                    isAntiSocialForces: e.target.value 
                  })}
                  className="form-radio text-blue-600"
                />
                <div>
                  <span className="font-medium">いいえ</span>
                  <p className="text-sm text-gray-600">反社会的勢力との関係はありません</p>
                </div>
              </label>
              <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  value="yes"
                  checked={formData.isAntiSocialForces === 'yes'}
                  onChange={(e) => updateFormData({ 
                    isAntiSocialForces: e.target.value 
                  })}
                  className="form-radio text-red-600"
                />
                <div>
                  <span className="font-medium">はい</span>
                  <p className="text-sm text-gray-600">反社会的勢力との関係があります</p>
                </div>
              </label>
            </div>
            <div className="mt-2 p-3 bg-red-50 rounded-lg">
              <div className="flex items-start space-x-2">
                <ShieldAlert className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-800">
                  反社会的勢力との関係がある場合、ドッグランの登録はできません。当社は反社会的勢力との関係を一切認めておりません。
                </p>
              </div>
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

          <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium mb-1">第一審査について</p>
                <ul className="space-y-1 text-xs">
                  <li>• 基本的な開設条件を満たしているかを確認します</li>
                  <li>• 通過後、本人確認を行います</li>
                  <li>• 本人確認後、詳細な施設情報の入力に進みます</li>
                  <li>• 第二審査では書類審査を行います</li>
                  <li>• 最終的にQRコード実証検査を経て掲載開始となります</li>
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
              className="w-1/2 bg-blue-600 hover:bg-blue-700"
            >
              第一審査を申し込む
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
} 