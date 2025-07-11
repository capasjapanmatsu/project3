import React, { useState } from 'react';
import { FileCheck, CheckCircle, X, Eye, ArrowLeft, RefreshCw } from 'lucide-react';
import Card from '../Card';
import Button from '../Button';
import { PendingVaccine } from '../../types/admin';
import { useAdminApproval } from '../../hooks/useAdminApproval';
import { getVaccineImageUrl } from '../../utils/supabase';

interface AdminVaccineApprovalProps {
  pendingVaccines: PendingVaccine[];
  isLoading: boolean;
  onApprovalComplete: (message: string) => void;
  onError: (error: string) => void;
}

export const AdminVaccineApproval: React.FC<AdminVaccineApprovalProps> = ({
  pendingVaccines,
  isLoading,
  onApprovalComplete,
  onError
}) => {
  const [selectedVaccine, setSelectedVaccine] = useState<PendingVaccine | null>(null);
  const [rejectionNote, setRejectionNote] = useState('');
  const [imageLoadingStates, setImageLoadingStates] = useState<{[key: string]: boolean}>({});
  const [imageErrorStates, setImageErrorStates] = useState<{[key: string]: boolean}>({});

  const approval = useAdminApproval();

  const handleVaccineApproval = async (vaccineId: string, approved: boolean) => {
    try {
      const result = await approval.handleVaccineApproval(vaccineId, approved, rejectionNote);
      
      if (result.success) {
        onApprovalComplete(result.message);
        setSelectedVaccine(null);
        setRejectionNote('');
      } else {
        onError(result.message);
      }
    } catch (error) {
      onError(`処理中にエラーが発生しました: ${(error as Error).message}`);
    }
  };

  const handleImageLoad = (imageId: string) => {
    setImageLoadingStates(prev => ({ ...prev, [imageId]: false }));
  };

  const handleImageError = (imageId: string) => {
    setImageLoadingStates(prev => ({ ...prev, [imageId]: false }));
    setImageErrorStates(prev => ({ ...prev, [imageId]: true }));
  };

  const handleImageLoadStart = (imageId: string) => {
    setImageLoadingStates(prev => ({ ...prev, [imageId]: true }));
    setImageErrorStates(prev => ({ ...prev, [imageId]: false }));
  };

  const getPlaceholderImage = () => {
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzM3NDE1MSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPueUu+WDj+OBjOiqreOCgeWFpeOBv+OBvuOBm+OCk+OBp+OBl+OBnw==</dGV4dD48L3N2Zz4=';
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  // 詳細表示モード
  if (selectedVaccine) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold flex items-center">
            <FileCheck className="w-6 h-6 text-blue-600 mr-2" />
            {selectedVaccine.dog.name}のワクチン証明書審査
          </h2>
          <Button
            variant="secondary"
            onClick={() => setSelectedVaccine(null)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            一覧に戻る
          </Button>
        </div>

        {/* 犬の基本情報 */}
        <Card className="p-4">
          <h3 className="font-semibold mb-3">犬の基本情報</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">名前</p>
              <p className="font-medium">{selectedVaccine.dog.name}</p>
            </div>
            <div>
              <p className="text-gray-600">犬種</p>
              <p className="font-medium">{selectedVaccine.dog.breed}</p>
            </div>
            <div>
              <p className="text-gray-600">性別</p>
              <p className="font-medium">{selectedVaccine.dog.gender}</p>
            </div>
            <div>
              <p className="text-gray-600">飼い主</p>
              <p className="font-medium">{selectedVaccine.dog.owner.name}</p>
            </div>
          </div>
        </Card>

        {/* ワクチン証明書画像 */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4">ワクチン証明書</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* 狂犬病ワクチン */}
            <div>
              <h4 className="font-medium mb-2">狂犬病ワクチン</h4>
              {selectedVaccine.rabies_vaccine_image ? (
                <div className="border rounded-lg overflow-hidden relative">
                  {imageLoadingStates[`rabies-${selectedVaccine.id}`] && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
                      <RefreshCw className="w-6 h-6 animate-spin text-gray-600" />
                    </div>
                  )}
                  <img
                    src={getVaccineImageUrl(selectedVaccine.rabies_vaccine_image) || getPlaceholderImage()}
                    alt="狂犬病ワクチン証明書"
                    className="w-full h-64 object-contain"
                    onLoadStart={() => handleImageLoadStart(`rabies-${selectedVaccine.id}`)}
                    onLoad={() => handleImageLoad(`rabies-${selectedVaccine.id}`)}
                    onError={() => handleImageError(`rabies-${selectedVaccine.id}`)}
                  />
                  {imageErrorStates[`rabies-${selectedVaccine.id}`] && (
                    <div className="absolute inset-0 flex items-center justify-center bg-red-50 bg-opacity-90">
                      <div className="text-center">
                        <X className="w-12 h-12 text-red-500 mx-auto mb-2" />
                        <p className="text-red-700 font-medium">画像が読み込めませんでした</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                  <p className="text-gray-500">画像なし</p>
                </div>
              )}
            </div>

            {/* 混合ワクチン */}
            <div>
              <h4 className="font-medium mb-2">混合ワクチン</h4>
              {selectedVaccine.combo_vaccine_image ? (
                <div className="border rounded-lg overflow-hidden relative">
                  {imageLoadingStates[`combo-${selectedVaccine.id}`] && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
                      <RefreshCw className="w-6 h-6 animate-spin text-gray-600" />
                    </div>
                  )}
                  <img
                    src={getVaccineImageUrl(selectedVaccine.combo_vaccine_image) || getPlaceholderImage()}
                    alt="混合ワクチン証明書"
                    className="w-full h-64 object-contain"
                    onLoadStart={() => handleImageLoadStart(`combo-${selectedVaccine.id}`)}
                    onLoad={() => handleImageLoad(`combo-${selectedVaccine.id}`)}
                    onError={() => handleImageError(`combo-${selectedVaccine.id}`)}
                  />
                  {imageErrorStates[`combo-${selectedVaccine.id}`] && (
                    <div className="absolute inset-0 flex items-center justify-center bg-red-50 bg-opacity-90">
                      <div className="text-center">
                        <X className="w-12 h-12 text-red-500 mx-auto mb-2" />
                        <p className="text-red-700 font-medium">画像が読み込めませんでした</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                  <p className="text-gray-500">画像なし</p>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* 審査結果 */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4">審査結果</h3>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              却下理由（却下する場合のみ入力）
            </label>
            <textarea
              value={rejectionNote}
              onChange={(e) => setRejectionNote(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
              placeholder="例: ワクチン証明書の有効期限が切れています。最新の証明書をアップロードしてください。"
            />
          </div>
          
          <div className="flex justify-end space-x-3">
            <Button
              onClick={() => handleVaccineApproval(selectedVaccine.id, false)}
              isLoading={approval.isProcessing}
              className="bg-red-600 hover:bg-red-700"
            >
              <X className="w-4 h-4 mr-2" />
              却下
            </Button>
            <Button
              onClick={() => handleVaccineApproval(selectedVaccine.id, true)}
              isLoading={approval.isProcessing}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              承認
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // 一覧表示モード
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold flex items-center">
        <FileCheck className="w-6 h-6 text-blue-600 mr-2" />
        審査待ちワクチン証明書
      </h2>
      
      {pendingVaccines.length === 0 ? (
        <Card className="text-center py-12">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <p className="text-gray-600">審査待ちのワクチン証明書はありません</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {pendingVaccines.map((vaccine) => (
            <Card key={vaccine.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-2">{vaccine.dog.name}のワクチン証明書</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">犬種</p>
                      <p className="font-medium">{vaccine.dog.breed}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">性別</p>
                      <p className="font-medium">{vaccine.dog.gender}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">飼い主</p>
                      <p className="font-medium">{vaccine.dog.owner.name}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">申請日</p>
                      <p className="font-medium">{new Date(vaccine.created_at).toLocaleDateString('ja-JP')}</p>
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2 ml-4">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setSelectedVaccine(vaccine)}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    詳細
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleVaccineApproval(vaccine.id, true)}
                    className="bg-green-600 hover:bg-green-700"
                    disabled={approval.isProcessing}
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    承認
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedVaccine(vaccine);
                      handleVaccineApproval(vaccine.id, false);
                    }}
                    className="bg-red-600 hover:bg-red-700"
                    disabled={approval.isProcessing}
                  >
                    <X className="w-4 h-4 mr-1" />
                    却下
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}; 