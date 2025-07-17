import {
    AlertCircle,
    Building,
    CheckCircle,
    CreditCard,
    DollarSign,
    Settings
} from 'lucide-react';
import { useEffect, useState } from 'react';
import Button from '../Button';
import Card from '../Card';
import {
    enableFreeMode,
    enablePaidMode,
    FacilityPricingConfig,
    getFacilityPricingConfig,
    updateFacilityPricingConfig
} from '../utils/facilityPricing';

interface FacilityPricingManagerProps {
  adminUserId: string;
}

export default function FacilityPricingManager({ adminUserId }: FacilityPricingManagerProps) {
  const [config, setConfig] = useState<FacilityPricingConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  
  // 編集用の状態
  const [editConfig, setEditConfig] = useState<Partial<FacilityPricingConfig>>({});

  // 設定を読み込み
  const loadConfig = async () => {
    try {
      setIsLoading(true);
      const loadedConfig = await getFacilityPricingConfig();
      setConfig(loadedConfig);
      setEditConfig(loadedConfig);
    } catch (error) {
      console.error('Failed to load pricing config:', error);
      setError('設定の読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadConfig();
  }, []);

  // 有料モードに切り替え
  const handleEnablePaidMode = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const success = await enablePaidMode(adminUserId);
      if (success) {
        setSuccessMessage('有料モードに切り替えました');
        await loadConfig();
      } else {
        setError('有料モードへの切り替えに失敗しました');
      }
    } catch (error) {
      console.error('Failed to enable paid mode:', error);
      setError('有料モードへの切り替えに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // 無料モードに切り替え
  const handleEnableFreeMode = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const success = await enableFreeMode(adminUserId);
      if (success) {
        setSuccessMessage('無料モードに切り替えました');
        await loadConfig();
      } else {
        setError('無料モードへの切り替えに失敗しました');
      }
    } catch (error) {
      console.error('Failed to enable free mode:', error);
      setError('無料モードへの切り替えに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // 詳細設定の保存
  const handleSaveConfig = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const success = await updateFacilityPricingConfig({
        ...editConfig,
        lastUpdated: new Date().toISOString(),
        updatedBy: adminUserId
      }, adminUserId);
      
      if (success) {
        setSuccessMessage('設定を保存しました');
        setIsEditing(false);
        await loadConfig();
      } else {
        setError('設定の保存に失敗しました');
      }
    } catch (error) {
      console.error('Failed to save config:', error);
      setError('設定の保存に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  if (!config) {
    return <div className="text-center py-4">設定を読み込み中...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Settings className="w-6 h-6 mr-2" />
            施設掲載料金設定
          </h2>

          {/* エラーメッセージ */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                <span className="text-red-700">{error}</span>
              </div>
            </div>
          )}

          {/* 成功メッセージ */}
          {successMessage && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                <span className="text-green-700">{successMessage}</span>
              </div>
            </div>
          )}

          {/* 現在の状態 */}
          <div className="mb-6 p-4 border rounded-lg">
            <div className="flex items-center mb-2">
              {config.isPaidMode ? (
                <DollarSign className="w-5 h-5 text-orange-500 mr-2" />
              ) : (
                <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
              )}
              <span className="font-medium">
                現在のモード: {config.isPaidMode ? '有料' : '無料'}
              </span>
            </div>
            
            <div className="text-sm text-gray-600 space-y-1">
              <p>本人確認: {config.requiresIdentityVerification ? '必須' : '不要'}</p>
              <p>支払い: {config.requiresPayment ? '必要' : '不要'}</p>
              {config.isPaidMode && (
                <p>月額料金: ¥{config.monthlyFee.toLocaleString()}</p>
              )}
              <p>最終更新: {new Date(config.lastUpdated).toLocaleString()}</p>
            </div>
          </div>

          {/* クイック切り替えボタン */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Button
              onClick={() => void handleEnableFreeMode()}
              disabled={isLoading || !config.isPaidMode}
              className={`p-4 ${!config.isPaidMode ? 'bg-green-500 text-white' : ''}`}
            >
              <CheckCircle className="w-5 h-5 mr-2" />
              無料モード
            </Button>
            
            <Button
              onClick={() => void handleEnablePaidMode()}
              disabled={isLoading || config.isPaidMode}
              className={`p-4 ${config.isPaidMode ? 'bg-orange-500 text-white' : ''}`}
            >
              <DollarSign className="w-5 h-5 mr-2" />
              有料モード
            </Button>
          </div>

          {/* 詳細設定 */}
          <div className="border-t pt-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">詳細設定</h3>
              <Button
                onClick={() => setIsEditing(!isEditing)}
                disabled={isLoading}
              >
                {isEditing ? 'キャンセル' : '編集'}
              </Button>
            </div>

            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    月額料金（円）
                  </label>
                  <input
                    type="number"
                    value={editConfig.monthlyFee || 0}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 0;
                      setEditConfig({ ...editConfig, monthlyFee: value });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    支払い猶予期間（日）
                  </label>
                  <input
                    type="number"
                    value={editConfig.paymentGracePeriodDays || 0}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 0;
                      setEditConfig({ ...editConfig, paymentGracePeriodDays: value });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    支払い方法
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={editConfig.paymentMethods?.creditCard || false}
                        onChange={(e) => {
                          setEditConfig({
                            ...editConfig,
                            paymentMethods: {
                              ...editConfig.paymentMethods,
                              creditCard: e.target.checked,
                              bankTransfer: editConfig.paymentMethods?.bankTransfer || false
                            }
                          });
                        }}
                        className="mr-2"
                      />
                      <CreditCard className="w-4 h-4 mr-1" />
                      クレジットカード（サブスクリプション）
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={editConfig.paymentMethods?.bankTransfer || false}
                        onChange={(e) => {
                          setEditConfig({
                            ...editConfig,
                            paymentMethods: {
                              ...editConfig.paymentMethods,
                              bankTransfer: e.target.checked,
                              creditCard: editConfig.paymentMethods?.creditCard || false
                            }
                          });
                        }}
                        className="mr-2"
                      />
                      <Building className="w-4 h-4 mr-1" />
                      銀行振込
                    </label>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={() => void handleSaveConfig()}
                    disabled={isLoading}
                  >
                    {isLoading ? '保存中...' : '設定を保存'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-600 space-y-2">
                <p>月額料金: ¥{config.monthlyFee.toLocaleString()}</p>
                <p>支払い猶予期間: {config.paymentGracePeriodDays}日</p>
                <p>支払い方法: {[
                  config.paymentMethods.creditCard && 'クレジットカード',
                  config.paymentMethods.bankTransfer && '銀行振込'
                ].filter(Boolean).join(', ')}</p>
                <p>未払い時の掲載停止: {config.listingSuspensionOnNonPayment ? '有効' : '無効'}</p>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
