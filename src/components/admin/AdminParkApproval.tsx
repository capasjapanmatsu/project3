import {
    AlertTriangle,
    ArrowLeft,
    Building,
    CheckCircle,
    Eye,
    FileText,
    Loader,
    MapPin,
    Shield,
    User,
    X,
    ZoomIn
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useAdminApproval } from '../../hooks/useAdminApproval';
import { useParkImages } from '../../hooks/useAdminData';
import { FacilityImage, PendingPark } from '../../types/admin';
import { supabase } from '../../utils/supabase';
import Button from '../Button';
import Card from '../Card';

interface AdminParkApprovalProps {
  pendingParks: PendingPark[];
  isLoading: boolean;
  onApprovalComplete: (message: string) => void;
  onError: (error: string) => void;
}

interface OwnerIdentityData {
  id: string;
  owner_name: string;
  postal_code: string;
  address: string;
  phone_number: string;
  email: string;
  identity_document_url: string;
  identity_document_filename: string;
  identity_status: string;
  identity_created_at: string;
}

export const AdminParkApproval: React.FC<AdminParkApprovalProps> = ({
  pendingParks,
  isLoading,
  onApprovalComplete,
  onError
}) => {
  // デバッグ: 受け取っているparksデータを確認
  console.log('🔍 AdminParkApproval received parks:', pendingParks);
  pendingParks.forEach((park, index) => {
    console.log(`🏞️ Park ${index + 1}:`, {
      id: park.id,
      name: park.name,
      owner_id: park.owner_id,
      owner_name: park.owner_name,
      owner_address: park.owner_address,
      owner_postal_code: park.owner_postal_code,
      owner_phone_number: park.owner_phone_number,
      owner_email: park.owner_email
    });
  });

  const [selectedPark, setSelectedPark] = useState<PendingPark | null>(null);
  const [rejectionNote, setRejectionNote] = useState('');
  const [selectedImage, setSelectedImage] = useState<FacilityImage | null>(null);
  const [imageReviewMode, setImageReviewMode] = useState(false);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const [ownerIdentityData, setOwnerIdentityData] = useState<OwnerIdentityData | null>(null);
  const [identityImageError, setIdentityImageError] = useState<string | null>(null);
  const [identityImageLoading, setIdentityImageLoading] = useState(false);

  const approval = useAdminApproval();
  const parkImages = useParkImages(selectedPark?.id || null);

  // デバッグ用：owner_verificationsテーブルのデータを確認
  useEffect(() => {
    const debugOwnerVerifications = async () => {
      console.log('🔍 Debugging owner_verifications table...');
      
      try {
        const { data, error } = await supabase
          .from('owner_verifications')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('❌ Error fetching owner_verifications:', error);
        } else {
          console.log('✅ Owner verifications data:', data);
          
          // identity_から始まるファイルを検索
          const identityFiles = data?.filter(item => 
            item.verification_id && item.verification_id.includes('identity_')
          );
          
          console.log('📄 Identity files found:', identityFiles);
          
          // verification_dataの中身も確認
          data?.forEach(item => {
            console.log(`🔍 Verification item ${item.id}:`, {
              user_id: item.user_id,
              verification_id: item.verification_id,
              status: item.status,
              verification_data: item.verification_data
            });
          });
        }
      } catch (error) {
        console.error('❌ Debug query failed:', error);
      }
    };
    
    debugOwnerVerifications();
  }, []);

  // 本人確認書類データを取得
  useEffect(() => {
    if (selectedPark?.owner_id) {
      fetchOwnerIdentityData(selectedPark.owner_id);
    }
  }, [selectedPark]);

  const fetchOwnerIdentityData = async (ownerId: string) => {
    try {
      setIdentityImageLoading(true);
      setIdentityImageError(null);
      console.log('🔍 本人確認書類データを取得中:', ownerId);

      // プロフィール情報を取得
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('name, postal_code, address, phone_number, email')
        .eq('id', ownerId)
        .single();

      if (profileError) {
        console.error('❌ プロフィール取得エラー:', profileError);
        setIdentityImageError(`プロフィール情報の取得に失敗しました: ${profileError.message}`);
        return;
      }

      console.log('✅ プロフィール情報:', profileData);

      // 本人確認書類情報を取得
      const { data: identityData, error: identityError } = await supabase
        .from('owner_verifications')
        .select('*')
        .eq('user_id', ownerId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (identityError) {
        console.error('❌ 本人確認書類取得エラー:', identityError);
        // エラーがあってもプロフィール情報は表示する
        console.log('⚠️ 本人確認書類がないため、プロフィール情報のみ表示');
      }

      console.log('📊 本人確認書類データ:', identityData);

      if (identityData && identityData.length > 0) {
        const identity = identityData[0];
        console.log('📋 本人確認書類詳細:', identity);
        
        // verification_dataの構造を確認
        console.log('🔍 verification_data:', identity.verification_data);
        
        // 複数の方法でdocument_urlを取得
        let documentUrl = '';
        let documentFilename = '';
        
        if (identity.verification_data) {
          // verification_dataがオブジェクトの場合
          if (typeof identity.verification_data === 'object') {
            documentUrl = identity.verification_data.document_url || identity.verification_data.file_path || '';
            documentFilename = identity.verification_data.file_name || identity.verification_data.filename || '';
          }
        }
        
        // document_urlが見つからない場合はverification_idを使用
        if (!documentUrl && identity.verification_id) {
          documentUrl = identity.verification_id;
        }
        
        // ファイル名が見つからない場合はデフォルト名を使用
        if (!documentFilename) {
          documentFilename = documentUrl.split('/').pop() || 'identity_document';
        }
        
        console.log('📄 最終的な画像URL:', documentUrl);
        console.log('📄 ファイル名:', documentFilename);
        
        setOwnerIdentityData({
          id: identity.id,
          owner_name: profileData.name || '名前未登録',
          postal_code: profileData.postal_code || '未登録',
          address: profileData.address || '未登録',
          phone_number: profileData.phone_number || '未登録',
          email: profileData.email || '未登録',
          identity_document_url: documentUrl,
          identity_document_filename: documentFilename,
          identity_status: identity.status || 'pending',
          identity_created_at: identity.created_at || new Date().toISOString()
        });
      } else {
        // 本人確認書類がない場合でも、プロフィール情報は表示
        console.log('📋 本人確認書類未提出のため、プロフィール情報のみ表示');
        setOwnerIdentityData({
          id: '',
          owner_name: profileData.name || '名前未登録',
          postal_code: profileData.postal_code || '未登録',
          address: profileData.address || '未登録',
          phone_number: profileData.phone_number || '未登録',
          email: profileData.email || '未登録',
          identity_document_url: '',
          identity_document_filename: '',
          identity_status: 'not_submitted',
          identity_created_at: ''
        });
      }
    } catch (error) {
      console.error('❌ 本人確認書類データ取得エラー:', error);
      setIdentityImageError(`データの取得に失敗しました: ${error}`);
    } finally {
      setIdentityImageLoading(false);
    }
  };

  const getImageFromStorage = async (url: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('vaccine-certs')
        .download(url);
      
      if (error) {
        console.error('画像取得エラー:', error);
        return null;
      }
      
      return URL.createObjectURL(data);
    } catch (error) {
      console.error('画像取得例外:', error);
      return null;
    }
  };

  const handleParkApproval = async (parkId: string, approved: boolean) => {
    try {
      console.log(`${approved ? '✅' : '❌'} ドッグラン${approved ? '承認' : '却下'}中:`, parkId);
      
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
      console.error('❌ ドッグラン承認/却下エラー:', error);
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
      console.error('❌ 画像承認エラー:', error);
      onError(`処理中にエラーが発生しました: ${(error as Error).message}`);
    }
  };

  const getImageTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      'overview': '施設全景',
      'entrance': '入口',
      'large_dog_area': '大型犬エリア',
      'small_dog_area': '小型犬エリア',
      'private_booth': 'プライベートブース',
      'parking': '駐車場',
      'shower': 'シャワー設備',
      'restroom': 'トイレ',
      'agility': 'アジリティ設備',
      'rest_area': '休憩スペース',
      'water_station': '給水設備',
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

  // 画像拡大表示モーダル
  if (enlargedImage) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4 z-50">
        <div className="relative max-w-6xl w-full max-h-[90vh]">
          <button
            onClick={() => setEnlargedImage(null)}
            className="absolute top-4 right-4 p-2 bg-white bg-opacity-90 shadow-lg rounded-full text-gray-800 hover:bg-opacity-100 transition-all z-10"
          >
            <X className="w-6 h-6" />
          </button>
          <img 
            src={enlargedImage} 
            alt="拡大画像" 
            className="max-w-full max-h-full mx-auto rounded-lg object-contain"
            onError={(e) => {
              e.currentTarget.src = 'https://via.placeholder.com/800x600?text=Image+Not+Available';
            }}
          />
        </div>
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
            <div className="w-full h-96 bg-gray-100 rounded-lg overflow-hidden relative group">
              <img
                src={selectedImage.image_url}
                alt={getImageTypeLabel(selectedImage.image_type)}
                className="w-full h-full object-contain cursor-pointer"
                onClick={() => setEnlargedImage(selectedImage.image_url)}
                onError={(e) => {
                  e.currentTarget.src = 'https://via.placeholder.com/800x600?text=Image+Not+Available';
                }}
              />
              
              {/* 拡大アイコン */}
              <div 
                className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center cursor-pointer"
                onClick={() => setEnlargedImage(selectedImage.image_url)}
              >
                <ZoomIn className="w-12 h-12 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              </div>
              
              {/* クリックで拡大のヒント */}
              <div className="absolute bottom-4 right-4">
                <span className="px-2 py-1 bg-white bg-opacity-90 text-gray-800 text-xs rounded border shadow-sm">
                  クリックで拡大
                </span>
              </div>
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
              onClick={() => void handleImageApproval(false)}
              isLoading={approval.isProcessing}
              className="bg-red-600 hover:bg-red-700"
            >
              <X className="w-4 h-4 mr-2" />
              却下
            </Button>
            <Button
              onClick={() => void handleImageApproval(true)}
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

  // 画像審査モード
  if (imageReviewMode && selectedImage) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">画像審査</h2>
          <Button
            variant="secondary"
            onClick={() => {
              setImageReviewMode(false);
              setSelectedImage(null);
              setRejectionNote('');
            }}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            戻る
          </Button>
        </div>

        <Card className="p-6">
          <div className="mb-6">
            <h3 className="font-semibold mb-2">画像タイプ: {getImageTypeLabel(selectedImage.image_type)}</h3>
            <div className="relative w-full h-96 bg-gray-100 rounded-lg overflow-hidden group">
              <img
                src={selectedImage.image_url}
                alt={getImageTypeLabel(selectedImage.image_type)}
                className="w-full h-full object-contain cursor-pointer"
                onClick={() => setEnlargedImage(selectedImage.image_url)}
                onError={(e) => {
                  e.currentTarget.src = 'https://via.placeholder.com/800x600?text=Image+Not+Available';
                }}
              />
              
              {/* 拡大アイコン */}
              <div 
                className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center cursor-pointer"
                onClick={() => setEnlargedImage(selectedImage.image_url)}
              >
                <ZoomIn className="w-12 h-12 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              </div>
              
              {/* クリックで拡大のヒント */}
              <div className="absolute bottom-4 right-4">
                <span className="px-2 py-1 bg-white bg-opacity-90 text-gray-800 text-xs rounded border shadow-sm">
                  クリックで拡大
                </span>
              </div>
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
              onClick={() => void handleImageApproval(false)}
              isLoading={approval.isProcessing}
              className="bg-red-600 hover:bg-red-700"
            >
              <X className="w-4 h-4 mr-2" />
              却下
            </Button>
            <Button
              onClick={() => void handleImageApproval(true)}
              isLoading={approval.isProcessing}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              承認
            </Button>
          </div>
        </Card>

        {/* 拡大画像表示モーダル */}
        {enlargedImage && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="relative max-w-4xl max-h-full p-4">
              <img
                src={enlargedImage.startsWith('http') ? enlargedImage : `${supabase.storage.from('vaccine-certs').getPublicUrl(enlargedImage).data.publicUrl}`}
                alt="拡大画像"
                className="max-w-full max-h-full object-contain"
              />
              <Button
                onClick={() => setEnlargedImage(null)}
                className="absolute top-2 right-2 bg-white text-black hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
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
          <h3 className="font-semibold mb-4 flex items-center">
            <Building className="w-5 h-5 mr-2" />
            施設情報
          </h3>
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

        {/* 本人確認書類と登録情報 */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4 flex items-center">
            <Shield className="w-5 h-5 mr-2" />
            本人確認書類・登録情報
          </h3>
          
          {identityImageLoading ? (
            <div className="flex justify-center items-center h-32">
              <Loader className="w-8 h-8 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">データを読み込み中...</span>
            </div>
          ) : identityImageError ? (
            <div className="text-center py-8">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600 mb-2">{identityImageError}</p>
              <Button 
                variant="secondary" 
                onClick={() => selectedPark && fetchOwnerIdentityData(selectedPark.owner_id)}
              >
                再読み込み
              </Button>
            </div>
          ) : ownerIdentityData ? (
            <div className="space-y-6">
              
              {/* 登録住所情報（照合用） */}
              <div>
                <h4 className="font-medium mb-3 flex items-center">
                  <User className="w-4 h-4 mr-2" />
                  登録住所情報（照合用）
                </h4>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">氏名</p>
                      <p className="font-medium text-blue-900">{ownerIdentityData.owner_name}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">郵便番号</p>
                      <p className="font-medium text-blue-900">{ownerIdentityData.postal_code}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">住所</p>
                      <p className="font-medium text-blue-900">{ownerIdentityData.address}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">電話番号</p>
                      <p className="font-medium text-blue-900">{ownerIdentityData.phone_number}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 本人確認書類 */}
              {ownerIdentityData.identity_document_url ? (
                <div>
                  <h4 className="font-medium mb-3 flex items-center">
                    <FileText className="w-4 h-4 mr-2" />
                    本人確認書類
                  </h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
                      <div>
                        <p className="text-gray-600">ファイル名</p>
                        <p className="font-medium">{ownerIdentityData.identity_document_filename}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">アップロード日</p>
                        <p className="font-medium">
                          {new Date(ownerIdentityData.identity_created_at).toLocaleDateString('ja-JP')}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">審査状況</p>
                        <p className={`font-medium ${
                          ownerIdentityData.identity_status === 'verified' ? 'text-green-600' :
                          ownerIdentityData.identity_status === 'failed' ? 'text-red-600' : 'text-yellow-600'
                        }`}>
                          {ownerIdentityData.identity_status === 'verified' ? '承認済み' :
                           ownerIdentityData.identity_status === 'failed' ? '却下' : '審査待ち'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">本人確認書類画像</p>
                      <div className="relative inline-block">
                        <img
                          src={`${supabase.storage.from('vaccine-certs').getPublicUrl(ownerIdentityData.identity_document_url).data.publicUrl}`}
                          alt="本人確認書類"
                          className="max-w-full h-auto max-h-96 rounded-lg border shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => setEnlargedImage(ownerIdentityData.identity_document_url)}
                          onError={(e) => {
                            console.error('❌ 画像の読み込みに失敗:', ownerIdentityData.identity_document_url);
                            e.currentTarget.src = 'https://via.placeholder.com/400x300?text=Image+Not+Available';
                          }}
                        />
                        <div className="absolute bottom-2 right-2">
                          <span className="px-2 py-1 bg-white bg-opacity-90 text-gray-800 text-xs rounded border shadow-sm">
                            クリックで拡大
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* 照合チェック用メッセージ */}
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <div className="flex items-start">
                        <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-yellow-800">照合チェック</p>
                          <p className="text-sm text-yellow-700">
                            本人確認書類に記載された住所・氏名と、上記の登録情報が一致するかご確認ください。
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <h4 className="font-medium mb-3 flex items-center">
                    <FileText className="w-4 h-4 mr-2" />
                    本人確認書類
                  </h4>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <AlertTriangle className="w-5 h-5 text-red-600 mr-2 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-red-800">
                          {ownerIdentityData.identity_status === 'not_submitted' ? '本人確認書類が未提出です' : '本人確認書類の取得に失敗しました'}
                        </p>
                        <p className="text-sm text-red-700 mt-1">
                          {ownerIdentityData.identity_status === 'not_submitted' 
                            ? 'このドッグラン申請には本人確認書類が添付されていません。申請者に本人確認書類の提出を依頼してください。'
                            : 'システムエラーまたは画像ファイルの問題が発生している可能性があります。'
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600">データを読み込み中...</p>
            </div>
          )}
        </Card>

        {/* 画像一覧 */}
        {(selectedPark.status === 'second_stage_review' || selectedPark.status === 'first_stage_passed' || selectedPark.total_images > 0) && (
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
            
            {/* デバッグ情報 */}
            <div className="mb-4 p-3 bg-gray-50 rounded text-sm">
              <p><strong>デバッグ情報:</strong></p>
              <p>Park ID: {selectedPark.id}</p>
              <p>Status: {selectedPark.status}</p>
              <p>Images Loading: {parkImages.isLoading ? 'Yes' : 'No'}</p>
              <p>Images Count: {parkImages.parkImages.length}</p>
              <p>Images Error: {parkImages.error || 'None'}</p>
              <p>Expected Total: {selectedPark.total_images}</p>
              <div className="mt-2 flex space-x-2">
                <Button 
                  size="sm"
                  variant="secondary" 
                  onClick={() => {
                    console.log('🔄 Manual refresh triggered for park:', selectedPark.id);
                    void parkImages.fetchParkImages(selectedPark.id);
                  }}
                >
                  画像再取得
                </Button>
                <Button 
                  size="sm"
                  variant="secondary" 
                  onClick={async () => {
                    console.log('🗃️ Direct database query for park:', selectedPark.id);
                    try {
                      const { data, error } = await supabase
                        .from('dog_park_facility_images')
                        .select('*')
                        .eq('park_id', selectedPark.id);
                      
                      if (error) {
                        console.error('❌ Direct query error:', error);
                      } else {
                        console.log('📋 Direct query result:', data);
                        alert('データベース直接クエリ結果をコンソールに出力しました');
                      }
                    } catch (err) {
                      console.error('❌ Direct query failed:', err);
                    }
                  }}
                >
                  DB直接確認
                </Button>
              </div>
              <div className="mt-2">
                <p><strong>Raw Images Data:</strong></p>
                <pre className="text-xs bg-white p-2 rounded border max-h-32 overflow-y-auto">
                  {JSON.stringify(parkImages.parkImages, null, 2)}
                </pre>
              </div>
            </div>
            
            {parkImages.isLoading ? (
              <div className="flex justify-center items-center h-32">
                <Loader className="w-8 h-8 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600">画像を読み込み中...</span>
              </div>
            ) : parkImages.error ? (
              <div className="text-center py-8">
                <p className="text-red-600 mb-2">画像の読み込みに失敗しました</p>
                <p className="text-gray-500 text-sm">{parkImages.error}</p>
                <Button 
                  variant="secondary" 
                  onClick={() => void parkImages.fetchParkImages(selectedPark.id)}
                  className="mt-4"
                >
                  再読み込み
                </Button>
              </div>
            ) : parkImages.parkImages.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600">アップロードされた画像がありません</p>
                <p className="text-gray-500 text-sm">パークステータス: {selectedPark.status}</p>
                <p className="text-gray-500 text-sm">期待される画像数: {selectedPark.total_images}</p>
                <Button 
                  variant="secondary" 
                  onClick={() => {
                    console.log('🔄 Manual refresh triggered for park:', selectedPark.id);
                    void parkImages.fetchParkImages(selectedPark.id);
                  }}
                  className="mt-4"
                >
                  手動でリフレッシュ
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {parkImages.parkImages.map((image, index) => (
                  <div key={image.id} className="relative group">
                    <div className="relative overflow-hidden rounded-lg bg-gray-100">
                      <img
                        src={image.image_url}
                        alt={getImageTypeLabel(image.image_type)}
                        className="w-full h-48 object-cover cursor-pointer hover:scale-105 transition-transform duration-200"
                        onClick={() => handleImageSelect(image)}
                        onLoad={() => console.log(`🖼️ Image ${index + 1} loaded successfully:`, image.image_url)}
                        onError={(e) => {
                          console.error(`❌ Image ${index + 1} failed to load:`, image.image_url);
                          e.currentTarget.src = 'https://via.placeholder.com/400x300?text=Image+Not+Available';
                        }}
                      />
                      
                      {/* 拡大アイコン */}
                      <div 
                        className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEnlargedImage(image.image_url);
                        }}
                      >
                        <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                      </div>
                    </div>
                    
                    {/* ステータスバッジ */}
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
                    
                    {/* 画像タイプラベル */}
                    <div className="absolute bottom-2 left-2">
                      <span className="px-2 py-1 bg-white bg-opacity-90 text-gray-800 text-xs rounded border shadow-sm">
                        {getImageTypeLabel(image.image_type)}
                      </span>
                    </div>
                    
                    {/* 管理者ノート（却下の場合） */}
                    {image.is_approved === false && image.admin_notes && (
                      <div className="mt-2 p-2 bg-red-50 rounded text-sm">
                        <p className="text-red-800 font-medium">却下理由:</p>
                        <p className="text-red-700">{image.admin_notes}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* 審査結果 */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4">審査結果</h3>
          
          {/* 審査判断の支援情報 */}
          <div className="mb-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">審査チェックリスト</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center">
                  <span className={`w-4 h-4 rounded-full mr-2 ${
                    ownerIdentityData?.owner_name && ownerIdentityData.owner_name !== '名前未登録' 
                      ? 'bg-green-500' : 'bg-red-500'
                  }`}></span>
                  <span>登録氏名: {ownerIdentityData?.owner_name || '未登録'}</span>
                </div>
                <div className="flex items-center">
                  <span className={`w-4 h-4 rounded-full mr-2 ${
                    ownerIdentityData?.address && ownerIdentityData.address !== '未登録' 
                      ? 'bg-green-500' : 'bg-red-500'
                  }`}></span>
                  <span>登録住所: {ownerIdentityData?.address || '未登録'}</span>
                </div>
                <div className="flex items-center">
                  <span className={`w-4 h-4 rounded-full mr-2 ${
                    ownerIdentityData?.phone_number && ownerIdentityData.phone_number !== '未登録' 
                      ? 'bg-green-500' : 'bg-red-500'
                  }`}></span>
                  <span>電話番号: {ownerIdentityData?.phone_number || '未登録'}</span>
                </div>
                <div className="flex items-center">
                  <span className={`w-4 h-4 rounded-full mr-2 ${
                    ownerIdentityData?.identity_document_url 
                      ? 'bg-green-500' : 'bg-red-500'
                  }`}></span>
                  <span>本人確認書類: {ownerIdentityData?.identity_document_url ? '提出済み' : '未提出'}</span>
                </div>
                {ownerIdentityData?.identity_document_url && (
                  <div className="flex items-center">
                    <span className={`w-4 h-4 rounded-full mr-2 ${
                      ownerIdentityData.identity_status === 'verified' ? 'bg-green-500' :
                      ownerIdentityData.identity_status === 'failed' ? 'bg-red-500' : 'bg-yellow-500'
                    }`}></span>
                    <span>本人確認状況: {
                      ownerIdentityData.identity_status === 'verified' ? '承認済み' :
                      ownerIdentityData.identity_status === 'failed' ? '却下' : '審査待ち'
                    }</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* 審査判断の推奨事項 */}
          {(!ownerIdentityData?.identity_document_url || ownerIdentityData.identity_status === 'not_submitted') && (
            <div className="mb-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">審査判断の推奨事項</p>
                    <p className="text-sm text-yellow-700 mt-1">
                      本人確認書類が未提出のため、申請を承認する前に申請者に本人確認書類の提出を依頼することを推奨します。
                      または、不備として一時的に却下し、必要書類の提出を求めてください。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              却下理由（却下する場合のみ入力）
            </label>
            <textarea
              value={rejectionNote}
              onChange={(e) => setRejectionNote(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
              placeholder="例: 本人確認書類が未提出のため、身元確認ができません。本人確認書類（運転免許証、パスポート、マイナンバーカードなど）を提出してから再度申請してください。"
            />
          </div>
          
          <div className="flex justify-end space-x-3">
            <Button
              onClick={() => void handleParkApproval(selectedPark.id, false)}
              isLoading={approval.isProcessing}
              className="bg-red-600 hover:bg-red-700"
            >
              <X className="w-4 h-4 mr-2" />
              却下
            </Button>
            <Button
              onClick={() => void handleParkApproval(selectedPark.id, true)}
              isLoading={approval.isProcessing}
              className="bg-green-600 hover:bg-green-700"
              disabled={!ownerIdentityData?.identity_document_url && ownerIdentityData?.identity_status === 'not_submitted'}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              承認
            </Button>
          </div>
        </Card>

        {/* 拡大画像表示モーダル */}
        {enlargedImage && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="relative max-w-4xl max-h-full p-4">
              <img
                src={enlargedImage.startsWith('http') ? enlargedImage : `${supabase.storage.from('vaccine-certs').getPublicUrl(enlargedImage).data.publicUrl}`}
                alt="拡大画像"
                className="max-w-full max-h-full object-contain"
              />
              <Button
                onClick={() => setEnlargedImage(null)}
                className="absolute top-2 right-2 bg-white text-black hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
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
      
      {/* デバッグ情報を追加 */}
      <div className="bg-gray-100 p-4 rounded-lg">
        <h3 className="font-medium mb-2">デバッグ情報</h3>
        <div className="text-sm space-y-1">
          <p>取得したパーク数: {pendingParks.length}</p>
          {pendingParks.length > 0 && (
            <div>
              <p>最初のパークの情報:</p>
              <pre className="bg-white p-2 rounded text-xs overflow-x-auto">
                {JSON.stringify({
                  name: pendingParks[0]?.name,
                  owner_id: pendingParks[0]?.owner_id,
                  identity_document_url: pendingParks[0]?.identity_document_url,
                  identity_document_filename: pendingParks[0]?.identity_document_filename,
                  identity_status: pendingParks[0]?.identity_status,
                  identity_created_at: pendingParks[0]?.identity_created_at
                }, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
      
      {pendingParks.length === 0 ? (
        <Card className="text-center py-12">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <p className="text-gray-600">審査待ちのドッグランはありません</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {pendingParks.map((park) => {
            // 各パークの詳細情報をログ出力
            console.log(`🔍 Processing park: ${park.name}`);
            console.log(`🔍 Owner ID: ${park.owner_id}`);
            console.log(`🔍 Identity document URL: ${park.identity_document_url}`);
            console.log(`🔍 Identity filename: ${park.identity_document_filename}`);
            console.log(`🔍 Identity status: ${park.identity_status}`);
            console.log(`🔍 Identity created at: ${park.identity_created_at}`);
            
            return (
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
                    <p className="text-gray-600 mb-3">{park.address}</p>
                    
                    {/* デバッグ情報 */}
                    <div className="bg-yellow-50 p-4 rounded-lg mb-3">
                      <h4 className="font-medium text-yellow-800 mb-2">デバッグ情報</h4>
                      <div className="text-sm text-yellow-700">
                        <p>Owner ID: {park.owner_id}</p>
                        <p>Owner Name: {park.owner_name}</p>
                        <p>Owner Address: {park.owner_address || '未設定'}</p>
                        <p>Owner Postal Code: {park.owner_postal_code || '未設定'}</p>
                        <p>Owner Phone: {park.owner_phone_number || '未設定'}</p>
                        <p>Owner Email: {park.owner_email || '未設定'}</p>
                      </div>
                    </div>

                    {/* 申請者詳細情報 */}
                    <div className="bg-gray-50 p-4 rounded-lg mb-3">
                      <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                        <User className="w-4 h-4 mr-2" />
                        申請者情報
                      </h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">氏名</p>
                          <p className="font-medium">{park.owner_name}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">電話番号</p>
                          <p className="font-medium">{park.owner_phone_number || '未登録'}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">郵便番号</p>
                          <p className="font-medium">{park.owner_postal_code || '未登録'}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">住所</p>
                          <p className="font-medium">{park.owner_address || '未登録'}</p>
                        </div>
                      </div>
                    </div>

                    {/* 本人確認書類 */}
                    <div className="bg-blue-50 p-4 rounded-lg mb-3">
                      <h4 className="font-medium text-blue-900 mb-2 flex items-center">
                        <FileText className="w-4 h-4 mr-2" />
                        本人確認書類
                      </h4>
                      <div className="text-xs text-gray-600 mb-2">
                        デバッグ: URL={park.identity_document_url || 'なし'}, Status={park.identity_status}
                      </div>
                      {park.identity_document_url && park.identity_document_url !== '' ? (
                        <div className="flex items-center space-x-4">
                          <div className="relative">
                            <img
                              src={`${supabase.storage.from('vaccine-certs').getPublicUrl(park.identity_document_url).data.publicUrl}`}
                              alt="本人確認書類"
                              className="w-20 h-20 object-cover rounded border shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                              onClick={() => {
                                console.log(`🔍 Clicked image: ${park.identity_document_url}`);
                                setEnlargedImage(park.identity_document_url || null);
                              }}
                              onLoad={() => {
                                console.log(`✅ Image loaded successfully: ${park.identity_document_url}`);
                              }}
                              onError={(e) => {
                                console.error('❌ 画像の読み込みに失敗:', park.identity_document_url);
                                console.error('❌ Full URL:', `${supabase.storage.from('vaccine-certs').getPublicUrl(park.identity_document_url || '').data.publicUrl}`);
                                e.currentTarget.src = 'https://via.placeholder.com/80x80?text=No+Image';
                              }}
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-opacity rounded flex items-center justify-center cursor-pointer">
                              <Eye className="w-4 h-4 text-white opacity-0 hover:opacity-100 transition-opacity" />
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="text-sm">
                              <p className="font-medium text-blue-900">{park.identity_document_filename}</p>
                              <p className="text-blue-700">
                                状況: {park.identity_status === 'verified' ? '承認済み' :
                                      park.identity_status === 'failed' ? '却下' : '審査待ち'}
                              </p>
                              {park.identity_created_at && (
                                <p className="text-blue-600">
                                  提出日: {new Date(park.identity_created_at).toLocaleDateString('ja-JP')}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center text-red-600">
                          <AlertTriangle className="w-4 h-4 mr-2" />
                          <span className="text-sm">本人確認書類が未提出です</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="text-sm text-gray-500">
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
                      onClick={() => void handleParkApproval(park.id, true)}
                      className="bg-green-600 hover:bg-green-700"
                      disabled={approval.isProcessing}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      承認
                    </Button>
                    <Button
                      onClick={() => void handleParkApproval(park.id, false)}
                      className="bg-red-600 hover:bg-red-700"
                      disabled={approval.isProcessing}
                    >
                      <X className="w-4 h-4 mr-1" />
                      却下
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      
      {/* 拡大画像表示モーダル（一覧表示用） */}
      {enlargedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="relative max-w-4xl max-h-full p-4">
            <img
              src={enlargedImage.startsWith('http') ? enlargedImage : `${supabase.storage.from('vaccine-certs').getPublicUrl(enlargedImage).data.publicUrl}`}
              alt="拡大画像"
              className="max-w-full max-h-full object-contain"
              onError={(e) => {
                console.error('❌ 拡大画像の読み込みに失敗:', enlargedImage);
                e.currentTarget.src = 'https://via.placeholder.com/400x300?text=Image+Not+Available';
              }}
            />
            <Button
              onClick={() => setEnlargedImage(null)}
              className="absolute top-2 right-2 bg-white text-black hover:bg-gray-100"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}; 