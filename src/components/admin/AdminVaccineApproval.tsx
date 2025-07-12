import React, { useState } from 'react';
import { FileCheck, CheckCircle, X, Eye, ArrowLeft, RefreshCw, ZoomIn, ZoomOut } from 'lucide-react';
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
  const [enlargedImage, setEnlargedImage] = useState<{ src: string; alt: string; type: string } | null>(null);
  const [imageZoom, setImageZoom] = useState(1);
  const [editingExpiry, setEditingExpiry] = useState(false);
  const [expiryDates, setExpiryDates] = useState<{
    rabies_expiry_date: string;
    combo_expiry_date: string;
  }>({
    rabies_expiry_date: '',
    combo_expiry_date: ''
  });

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

  const handleImageClick = (imageSrc: string, imageAlt: string, imageType: string) => {
    setEnlargedImage({ src: imageSrc, alt: imageAlt, type: imageType });
    setImageZoom(1);
  };

  const handleCloseEnlargedImage = () => {
    setEnlargedImage(null);
    setImageZoom(1);
  };

  const handleZoomIn = () => {
    setImageZoom(prev => Math.min(prev + 0.5, 3));
  };

  const handleZoomOut = () => {
    setImageZoom(prev => Math.max(prev - 0.5, 0.5));
  };

  const initializeExpiryDates = (vaccine: PendingVaccine) => {
    setExpiryDates({
      rabies_expiry_date: vaccine.rabies_expiry_date || '',
      combo_expiry_date: vaccine.combo_expiry_date || ''
    });
  };

  const handleExpiryUpdate = async () => {
    if (!selectedVaccine) return;

    try {
      const result = await approval.handleVaccineExpiryUpdate(
        selectedVaccine.id,
        expiryDates.rabies_expiry_date || null,
        expiryDates.combo_expiry_date || null
      );

      if (result.success) {
        onApprovalComplete(result.message);
        setEditingExpiry(false);
        // 選択されたワクチンの有効期限を更新
        if (selectedVaccine) {
          selectedVaccine.rabies_expiry_date = expiryDates.rabies_expiry_date || null;
          selectedVaccine.combo_expiry_date = expiryDates.combo_expiry_date || null;
        }
      } else {
        onError(result.message);
      }
    } catch (error) {
      onError(`有効期限の更新に失敗しました: ${(error as Error).message}`);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '未設定';
    try {
      return new Date(dateString).toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return '無効な日付';
    }
  };

  const isExpiringSoon = (dateString: string | null) => {
    if (!dateString) return false;
    const expiryDate = new Date(dateString);
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + (30 * 24 * 60 * 60 * 1000));
    return expiryDate <= thirtyDaysFromNow;
  };

  const isExpired = (dateString: string | null) => {
    if (!dateString) return false;
    const expiryDate = new Date(dateString);
    const today = new Date();
    return expiryDate < today;
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
    // 有効期限の初期化（最初に表示する際）
    if (expiryDates.rabies_expiry_date === '' && expiryDates.combo_expiry_date === '') {
      initializeExpiryDates(selectedVaccine);
    }

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold flex items-center">
            <FileCheck className="w-6 h-6 text-blue-600 mr-2" />
            {selectedVaccine.dog.name}のワクチン証明書審査
          </h2>
          <Button
            variant="secondary"
            onClick={() => {
              setSelectedVaccine(null);
              setEditingExpiry(false);
              setExpiryDates({ rabies_expiry_date: '', combo_expiry_date: '' });
            }}
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

        {/* ワクチン有効期限 */}
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">ワクチン有効期限</h3>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setEditingExpiry(!editingExpiry)}
            >
              {editingExpiry ? 'キャンセル' : '編集'}
            </Button>
          </div>
          
          {editingExpiry ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    狂犬病ワクチン有効期限
                  </label>
                  <input
                    type="date"
                    value={expiryDates.rabies_expiry_date}
                    onChange={(e) => setExpiryDates(prev => ({ ...prev, rabies_expiry_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    混合ワクチン有効期限
                  </label>
                  <input
                    type="date"
                    value={expiryDates.combo_expiry_date}
                    onChange={(e) => setExpiryDates(prev => ({ ...prev, combo_expiry_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setEditingExpiry(false);
                    initializeExpiryDates(selectedVaccine);
                  }}
                >
                  キャンセル
                </Button>
                <Button
                  onClick={handleExpiryUpdate}
                  isLoading={approval.isProcessing}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  保存
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">狂犬病ワクチン有効期限</p>
                <div className="flex items-center space-x-2">
                  <p className={`font-medium ${
                    isExpired(selectedVaccine.rabies_expiry_date) ? 'text-red-600' :
                    isExpiringSoon(selectedVaccine.rabies_expiry_date) ? 'text-yellow-600' :
                    'text-green-600'
                  }`}>
                    {formatDate(selectedVaccine.rabies_expiry_date)}
                  </p>
                  {isExpired(selectedVaccine.rabies_expiry_date) && (
                    <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                      期限切れ
                    </span>
                  )}
                  {isExpiringSoon(selectedVaccine.rabies_expiry_date) && !isExpired(selectedVaccine.rabies_expiry_date) && (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                      期限間近
                    </span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">混合ワクチン有効期限</p>
                <div className="flex items-center space-x-2">
                  <p className={`font-medium ${
                    isExpired(selectedVaccine.combo_expiry_date) ? 'text-red-600' :
                    isExpiringSoon(selectedVaccine.combo_expiry_date) ? 'text-yellow-600' :
                    'text-green-600'
                  }`}>
                    {formatDate(selectedVaccine.combo_expiry_date)}
                  </p>
                  {isExpired(selectedVaccine.combo_expiry_date) && (
                    <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                      期限切れ
                    </span>
                  )}
                  {isExpiringSoon(selectedVaccine.combo_expiry_date) && !isExpired(selectedVaccine.combo_expiry_date) && (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                      期限間近
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
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
                    className="w-full h-64 object-contain cursor-pointer hover:opacity-80 transition-opacity"
                    onLoadStart={() => handleImageLoadStart(`rabies-${selectedVaccine.id}`)}
                    onLoad={() => handleImageLoad(`rabies-${selectedVaccine.id}`)}
                    onError={() => handleImageError(`rabies-${selectedVaccine.id}`)}
                    onClick={() => handleImageClick(getVaccineImageUrl(selectedVaccine.rabies_vaccine_image) || getPlaceholderImage(), "狂犬病ワクチン証明書", "rabies")}
                  />
                  {/* クリック可能アイコン */}
                  <div className="absolute top-2 left-2 bg-white bg-opacity-90 text-gray-800 p-1 rounded border shadow-sm">
                    <ZoomIn className="w-4 h-4" />
                  </div>
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
                    className="w-full h-64 object-contain cursor-pointer hover:opacity-80 transition-opacity"
                    onLoadStart={() => handleImageLoadStart(`combo-${selectedVaccine.id}`)}
                    onLoad={() => handleImageLoad(`combo-${selectedVaccine.id}`)}
                    onError={() => handleImageError(`combo-${selectedVaccine.id}`)}
                    onClick={() => handleImageClick(getVaccineImageUrl(selectedVaccine.combo_vaccine_image) || getPlaceholderImage(), "混合ワクチン証明書", "combo")}
                  />
                  {/* クリック可能アイコン */}
                  <div className="absolute top-2 left-2 bg-white bg-opacity-90 text-gray-800 p-1 rounded border shadow-sm">
                    <ZoomIn className="w-4 h-4" />
                  </div>
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
        
        {/* 画像拡大表示モーダル */}
        {enlargedImage && (
          <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
            <div className="relative max-w-full max-h-full">
              {/* コントロールバー */}
              <div className="absolute top-4 right-4 flex items-center space-x-2 z-10">
                <div className="bg-white bg-opacity-90 text-gray-800 px-3 py-1 rounded border shadow-sm text-sm">
                  {enlargedImage.type === 'rabies' ? '狂犬病ワクチン' : '混合ワクチン'}
                </div>
                <Button
                  size="sm"
                  onClick={handleZoomOut}
                  className="bg-white bg-opacity-90 shadow-lg text-gray-800 hover:bg-opacity-100 border border-gray-300"
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  onClick={handleZoomIn}
                  className="bg-white bg-opacity-90 shadow-lg text-gray-800 hover:bg-opacity-100 border border-gray-300"
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  onClick={handleCloseEnlargedImage}
                  className="bg-white bg-opacity-90 shadow-lg text-gray-800 hover:bg-opacity-100 border border-gray-300"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              {/* 画像表示 */}
              <div className="overflow-auto max-h-screen">
                <img
                  src={enlargedImage.src}
                  alt={enlargedImage.alt}
                  className="max-w-none transition-transform duration-200"
                  style={{
                    transform: `scale(${imageZoom})`,
                    transformOrigin: 'center center'
                  }}
                  onError={(e) => {
                    e.currentTarget.src = getPlaceholderImage();
                  }}
                />
              </div>
              
              {/* 使用方法のヒント */}
              <div className="absolute bottom-4 left-4 bg-white bg-opacity-90 text-gray-800 px-3 py-2 rounded border shadow-sm text-sm">
                <p>拡大/縮小: ズームボタンを使用</p>
                <p>閉じる: Xボタンまたは画像外をクリック</p>
              </div>
            </div>
            
            {/* 背景クリックで閉じる */}
            <div 
              className="absolute inset-0 -z-10"
              onClick={handleCloseEnlargedImage}
            />
          </div>
        )}
      </div>
    );
  }

  // 一覧表示モード
  return (
    <>
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
      
      {/* 画像拡大表示モーダル */}
      {enlargedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-full max-h-full">
            {/* コントロールバー */}
            <div className="absolute top-4 right-4 flex items-center space-x-2 z-10">
              <div className="bg-white bg-opacity-90 text-gray-800 px-3 py-1 rounded border shadow-sm text-sm">
                {enlargedImage.type === 'rabies' ? '狂犬病ワクチン' : '混合ワクチン'}
              </div>
              <Button
                size="sm"
                onClick={handleZoomOut}
                className="bg-white bg-opacity-90 shadow-lg text-gray-800 hover:bg-opacity-100 border border-gray-300"
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                onClick={handleZoomIn}
                className="bg-white bg-opacity-90 shadow-lg text-gray-800 hover:bg-opacity-100 border border-gray-300"
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                onClick={handleCloseEnlargedImage}
                className="bg-white bg-opacity-90 shadow-lg text-gray-800 hover:bg-opacity-100 border border-gray-300"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            {/* 画像表示 */}
            <div className="overflow-auto max-h-screen">
              <img
                src={enlargedImage.src}
                alt={enlargedImage.alt}
                className="max-w-none transition-transform duration-200"
                style={{
                  transform: `scale(${imageZoom})`,
                  transformOrigin: 'center center'
                }}
                onError={(e) => {
                  e.currentTarget.src = getPlaceholderImage();
                }}
              />
            </div>
            
            {/* 使用方法のヒント */}
            <div className="absolute bottom-4 left-4 bg-white bg-opacity-90 text-gray-800 px-3 py-2 rounded border shadow-sm text-sm">
              <p>拡大/縮小: ズームボタンを使用</p>
              <p>閉じる: Xボタンまたは画像外をクリック</p>
            </div>
          </div>
          
          {/* 背景クリックで閉じる */}
          <div 
            className="absolute inset-0 -z-10"
            onClick={handleCloseEnlargedImage}
          />
        </div>
      )}
    </>
  );
}; 