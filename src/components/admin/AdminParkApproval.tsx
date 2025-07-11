import React, { useState } from 'react';
import { MapPin, CheckCircle, X, Eye, ArrowLeft, Building, Clock } from 'lucide-react';
import Card from '../Card';
import Button from '../Button';
import { PendingPark, FacilityImage } from '../../types/admin';
import { useAdminApproval } from '../../hooks/useAdminApproval';
import { useParkImages } from '../../hooks/useAdminData';

interface AdminParkApprovalProps {
  pendingParks: PendingPark[];
  isLoading: boolean;
  onApprovalComplete: (message: string) => void;
  onError: (error: string) => void;
}

export const AdminParkApproval: React.FC<AdminParkApprovalProps> = ({
  pendingParks,
  isLoading,
  onApprovalComplete,
  onError
}) => {
  const [selectedPark, setSelectedPark] = useState<PendingPark | null>(null);
  const [rejectionNote, setRejectionNote] = useState('');
  const [selectedImage, setSelectedImage] = useState<FacilityImage | null>(null);
  const [imageReviewMode, setImageReviewMode] = useState(false);

  const approval = useAdminApproval();
  const parkImages = useParkImages(selectedPark?.id || null);

  const handleParkApproval = async (parkId: string, approved: boolean) => {
    try {
      // 承認の場合は全画像が承認されているかチェック
      if (approved) {
        const pendingImages = parkImages.parkImages.filter(img => 
          img.is_approved === null || img.is_approved === false
        );
        if (pendingImages.length > 0) {
          onError('すべての画像を承認してから施設を承認してください');
          return;
        }
      }

      const result = await approval.handleParkApproval(parkId, approved, rejectionNote);
      
      if (result.success) {
        onApprovalComplete(result.message);
        setSelectedPark(null);
        setRejectionNote('');
      } else {
        onError(result.message);
      }
    } catch (error) {
      onError(`処理中にエラーが発生しました: ${(error as Error).message}`);
    }
  };

  const handleImageSelect = (image: FacilityImage) => {
    setSelectedImage(image);
    setImageReviewMode(true);
    setRejectionNote(image.admin_notes || '');
  };

  const handleImageApproval = async (approved: boolean) => {
    if (!selectedImage) return;

    try {
      const result = await approval.handleImageApproval(selectedImage, approved, rejectionNote);
      
      if (result.success) {
        onApprovalComplete(result.message);
        await parkImages.fetchParkImages(selectedPark!.id);
        setImageReviewMode(false);
        setSelectedImage(null);
        setRejectionNote('');
      } else {
        onError(result.message);
      }
    } catch (error) {
      onError(`処理中にエラーが発生しました: ${(error as Error).message}`);
    }
  };

  const getImageTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      'exterior': '外観',
      'interior': '内装',
      'equipment': '設備',
      'area': 'エリア',
      'other': 'その他'
    };
    return labels[type] || type;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  // 画像レビューモード
  if (imageReviewMode && selectedImage) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center space-x-4 mb-6">
          <button
            onClick={() => {
              setImageReviewMode(false);
              setSelectedImage(null);
              setRejectionNote('');
            }}
            className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            画像一覧に戻る
          </button>
        </div>
        
        <Card className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">画像レビュー: {getImageTypeLabel(selectedImage.image_type)}</h2>
            <div className="flex space-x-2">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                selectedImage.is_approved === true
                  ? 'bg-green-100 text-green-800'
                  : selectedImage.is_approved === false
                  ? 'bg-red-100 text-red-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {selectedImage.is_approved === true
                  ? '承認済み'
                  : selectedImage.is_approved === false
                  ? '却下'
                  : '審査待ち'}
              </span>
            </div>
          </div>
          
          {/* 画像表示 */}
          <div className="mb-6">
            <div className="w-full h-96 bg-gray-100 rounded-lg overflow-hidden">
              <img
                src={selectedImage.image_url}
                alt={getImageTypeLabel(selectedImage.image_type)}
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.currentTarget.src = 'https://via.placeholder.com/800x600?text=Image+Not+Available';
                }}
              />
            </div>
          </div>
          
          {/* 却下理由入力フォーム */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              却下理由（却下する場合のみ入力）
            </label>
            <textarea
              value={rejectionNote}
              onChange={(e) => setRejectionNote(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
              placeholder="例: 画像が不鮮明です。より明るく鮮明な画像を再アップロードしてください。"
            />
          </div>
          
          {/* 承認/却下ボタン */}
          <div className="flex justify-end space-x-3">
            <Button
              variant="secondary"
              onClick={() => {
                setImageReviewMode(false);
                setSelectedImage(null);
                setRejectionNote('');
              }}
            >
              キャンセル
            </Button>
            <Button
              onClick={() => handleImageApproval(false)}
              isLoading={approval.isProcessing}
              className="bg-red-600 hover:bg-red-700"
            >
              <X className="w-4 h-4 mr-2" />
              却下
            </Button>
            <Button
              onClick={() => handleImageApproval(true)}
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

  // 詳細表示モード
  if (selectedPark) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold flex items-center">
            <Building className="w-6 h-6 text-blue-600 mr-2" />
            {selectedPark.name}の審査
          </h2>
          <Button
            variant="secondary"
            onClick={() => setSelectedPark(null)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            一覧に戻る
          </Button>
        </div>

        {/* 施設の基本情報 */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4">施設情報</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">施設名</p>
              <p className="font-medium">{selectedPark.name}</p>
            </div>
            <div>
              <p className="text-gray-600">住所</p>
              <p className="font-medium">{selectedPark.address}</p>
            </div>
            <div>
              <p className="text-gray-600">オーナー</p>
              <p className="font-medium">{selectedPark.owner_name}</p>
            </div>
            <div>
              <p className="text-gray-600">申請日</p>
              <p className="font-medium">{new Date(selectedPark.created_at).toLocaleDateString('ja-JP')}</p>
            </div>
          </div>
        </Card>

        {/* 画像一覧 */}
        {selectedPark.status === 'second_stage_review' && (
          <Card className="p-6">
            <h3 className="font-semibold mb-4">施設画像</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="bg-blue-50 p-3 rounded text-center">
                <p className="font-medium text-blue-800">全画像</p>
                <p className="text-blue-600">{selectedPark.total_images}枚</p>
              </div>
              <div className="bg-yellow-50 p-3 rounded text-center">
                <p className="font-medium text-yellow-800">審査待ち</p>
                <p className="text-yellow-600">{selectedPark.pending_images}枚</p>
              </div>
              <div className="bg-green-50 p-3 rounded text-center">
                <p className="font-medium text-green-800">承認済み</p>
                <p className="text-green-600">{selectedPark.approved_images}枚</p>
              </div>
              <div className="bg-red-50 p-3 rounded text-center">
                <p className="font-medium text-red-800">却下</p>
                <p className="text-red-600">{selectedPark.rejected_images}枚</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {parkImages.parkImages.map((image) => (
                <div key={image.id} className="relative">
                  <img
                    src={image.image_url}
                    alt={getImageTypeLabel(image.image_type)}
                    className="w-full h-48 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => handleImageSelect(image)}
                  />
                  <div className="absolute top-2 right-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      image.is_approved === true
                        ? 'bg-green-100 text-green-800'
                        : image.is_approved === false
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {image.is_approved === true
                        ? '承認済み'
                        : image.is_approved === false
                        ? '却下'
                        : '審査待ち'}
                    </span>
                  </div>
                  <div className="absolute bottom-2 left-2">
                    <span className="px-2 py-1 bg-black bg-opacity-50 text-white text-xs rounded">
                      {getImageTypeLabel(image.image_type)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

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
              placeholder="例: 施設の安全性に問題があります。安全対策を講じてから再度申請してください。"
            />
          </div>
          
          <div className="flex justify-end space-x-3">
            <Button
              onClick={() => handleParkApproval(selectedPark.id, false)}
              isLoading={approval.isProcessing}
              className="bg-red-600 hover:bg-red-700"
            >
              <X className="w-4 h-4 mr-2" />
              却下
            </Button>
            <Button
              onClick={() => handleParkApproval(selectedPark.id, true)}
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
        <MapPin className="w-6 h-6 text-blue-600 mr-2" />
        審査待ちドッグラン
      </h2>
      
      {pendingParks.length === 0 ? (
        <Card className="text-center py-12">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <p className="text-gray-600">審査待ちのドッグランはありません</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {pendingParks.map((park) => (
            <Card key={park.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="text-lg font-semibold">{park.name}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      park.status === 'first_stage_passed' ? 'bg-blue-100 text-blue-800' :
                      park.status === 'second_stage_review' ? 'bg-purple-100 text-purple-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {park.status === 'first_stage_passed' ? '第一審査通過' :
                       park.status === 'second_stage_review' ? '第二審査中' :
                       '審査待ち'}
                    </span>
                  </div>
                  <p className="text-gray-600 mb-2">{park.address}</p>
                  <div className="text-sm text-gray-500">
                    <p>オーナー: {park.owner_name}</p>
                    <p>申請日: {new Date(park.created_at).toLocaleDateString('ja-JP')}</p>
                    {park.second_stage_submitted_at && (
                      <p>第二審査申請日: {new Date(park.second_stage_submitted_at).toLocaleDateString('ja-JP')}</p>
                    )}
                  </div>
                  
                  {/* 画像審査状況 */}
                  {park.status === 'second_stage_review' && (
                    <div className="mt-3 grid grid-cols-4 gap-2 text-sm">
                      <div className="bg-blue-50 p-2 rounded text-center">
                        <p className="font-medium text-blue-800">全画像</p>
                        <p className="text-blue-600">{park.total_images}枚</p>
                      </div>
                      <div className="bg-yellow-50 p-2 rounded text-center">
                        <p className="font-medium text-yellow-800">審査待ち</p>
                        <p className="text-yellow-600">{park.pending_images}枚</p>
                      </div>
                      <div className="bg-green-50 p-2 rounded text-center">
                        <p className="font-medium text-green-800">承認済み</p>
                        <p className="text-green-600">{park.approved_images}枚</p>
                      </div>
                      <div className="bg-red-50 p-2 rounded text-center">
                        <p className="font-medium text-red-800">却下</p>
                        <p className="text-red-600">{park.rejected_images}枚</p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex flex-col space-y-2">
                  <Button
                    onClick={() => setSelectedPark(park)}
                    variant="secondary"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    詳細を見る
                  </Button>
                  <Button
                    onClick={() => handleParkApproval(park.id, true)}
                    className="bg-green-600 hover:bg-green-700"
                    disabled={approval.isProcessing}
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    承認
                  </Button>
                  <Button
                    onClick={() => handleParkApproval(park.id, false)}
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