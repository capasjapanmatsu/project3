import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Shield, 
  MapPin, 
  FileCheck, 
  AlertTriangle, 
  CheckCircle, 
  X, 
  Eye, 
  Camera,
  ArrowLeft,
  Building,
  Clock
} from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import useAuth from '../context/AuthContext';
import { checkAndSetAdminUser, debugAuthState, testSupabaseConnection, directUpdateUserType } from '../utils/adminUtils';
import { PendingPark, PendingVaccine, FacilityImage } from '../types/admin';
import { useAdminData, useParkImages } from '../hooks/useAdminData';
import { useAdminApproval } from '../hooks/useAdminApproval';
import { 
  getVaccineImageUrl, 
  getImageTypeLabel, 
  getApprovalStatus, 
  testImageUrl 
} from '../utils/storageUtils';
import { 
  debugStorageBuckets, 
  testSpecificImageUrls, 
  forcePublicBucket, 
  debugVaccineData 
} from '../utils/debugStorage';
import { 
  validateAndGetImageUrl, 
  getPlaceholderImageUrl, 
  reuploadVaccineImage, 
  repairVaccineImages 
} from '../utils/imageHelpers';
import { immediateStorageCheck } from '../utils/immediateDebug';
import { SmartVaccineImage } from '../components/SmartVaccineImage';
import { fixStorageCompletely, emergencyStorageRepair } from '../utils/storageFixing';
import { disableRLS, grantAdminAccess, forceFixBucket } from '../utils/supabaseAdmin';
import { repairMissingVaccineFiles, normalizeVaccineImagePaths } from '../utils/fileRepair';

export function AdminManagement() {
  const { user, isAdmin, userProfile, session } = useAuth();
  const navigate = useNavigate();
  
  // 状態管理
  const [activeTab, setActiveTab] = useState<'parks' | 'vaccines'>('parks');
  const [selectedPark, setSelectedPark] = useState<PendingPark | null>(null);
  const [selectedVaccine, setSelectedVaccine] = useState<PendingVaccine | null>(null);
  const [selectedImage, setSelectedImage] = useState<FacilityImage | null>(null);
  const [imageReviewMode, setImageReviewMode] = useState(false);
  const [rejectionNote, setRejectionNote] = useState('');

  // カスタムフック
  const adminData = useAdminData(activeTab);
  const parkImages = useParkImages(selectedPark?.id || null);
  const approval = useAdminApproval();

  // デバッグ情報をログ出力
  useEffect(() => {
    console.log('👔 AdminManagement - User Authentication Status:', {
      user_id: user?.id,
      user_email: user?.email,
      user_type: userProfile?.user_type,
      isAdmin: isAdmin,
      hasSession: !!session,
      sessionExpiry: session?.expires_at,
      accessToken: session?.access_token ? 'Present' : 'Missing',
      refreshToken: session?.refresh_token ? 'Present' : 'Missing'
    });
  }, [user, userProfile, isAdmin, session]);

  // 管理者権限の自動設定
  useEffect(() => {
    const setupAdminUser = async () => {
      if (user?.email === 'capasjapan@gmail.com' && !isAdmin) {
        console.log('🔧 Attempting to set up admin user...');
        
        await debugAuthState();
        const connectionResult = await testSupabaseConnection();
        console.log('Connection test result:', connectionResult);
        
        const result = await checkAndSetAdminUser(user.email);
        console.log('Admin setup result:', result);
        
        if (result.success) {
          console.log('✅ Admin setup successful, reloading page...');
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        }
      }
    };

    if (user && !isAdmin) {
      setupAdminUser();
    }
  }, [user, isAdmin]);

  // 管理者権限チェックとデータ取得
  useEffect(() => {
    if (!isAdmin) {
      console.log('❌ Admin access denied - redirecting to home');
      navigate('/');
      return;
    }
    
    console.log('✅ Admin access granted');
    adminData.fetchData();
  }, [isAdmin, navigate, activeTab]);

  // ハンドラー関数
  const handleParkSelect = (park: PendingPark) => {
    setSelectedPark(park);
  };

  const handleImageSelect = (image: FacilityImage) => {
    setSelectedImage(image);
    setImageReviewMode(true);
    setRejectionNote(image.admin_notes || '');
  };

  const handleVaccineApproval = async (vaccineId: string, approved: boolean) => {
    const result = await approval.handleVaccineApproval(vaccineId, approved, rejectionNote);
    if (result.success) {
      adminData.showSuccess(result.message);
      await adminData.fetchData();
      setSelectedVaccine(null);
      setRejectionNote('');
    } else {
      adminData.showError(result.message);
    }
  };

  const handleParkApproval = async (parkId: string, approved: boolean) => {
    // 承認の場合は全画像が承認されているかチェック
    if (approved) {
      const pendingImages = parkImages.parkImages.filter(img => 
        img.is_approved === null || img.is_approved === false
      );
      if (pendingImages.length > 0) {
        adminData.showError('すべての画像を承認してから施設を承認してください');
        return;
      }
    }

    const result = await approval.handleParkApproval(parkId, approved, rejectionNote);
    if (result.success) {
      adminData.showSuccess(result.message);
      await adminData.fetchData();
      setSelectedPark(null);
      setRejectionNote('');
    } else {
      adminData.showError(result.message);
    }
  };

  const handleImageApproval = async (approved: boolean) => {
    if (!selectedImage) return;

    const result = await approval.handleImageApproval(selectedImage, approved, rejectionNote);
    if (result.success) {
      adminData.showSuccess(result.message);
      await parkImages.fetchParkImages(selectedPark!.id);
      setImageReviewMode(false);
      setSelectedImage(null);
      setRejectionNote('');
    } else {
      adminData.showError(result.message);
    }
  };

  // ローディング状態
  if (adminData.isLoading && !selectedPark && !selectedVaccine) {
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

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center space-x-4 mb-6">
        <Link to="/admin" className="flex items-center text-blue-600 hover:text-blue-800">
          <ArrowLeft className="w-4 h-4 mr-2" />
          管理者ダッシュボードに戻る
        </Link>
      </div>

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold flex items-center">
          <Shield className="w-8 h-8 text-red-600 mr-3" />
          管理者審査ページ
        </h1>
      </div>

      {/* エラー・成功メッセージ */}
      {adminData.error && (
        <div className="mb-6 p-4 bg-red-50 rounded-lg flex items-start">
          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
          <p className="text-red-800">{adminData.error}</p>
        </div>
      )}
      
      {adminData.success && (
        <div className="mb-6 p-4 bg-green-50 rounded-lg flex items-start">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
          <p className="text-green-800">{adminData.success}</p>
        </div>
      )}

      {/* 認証デバッグ情報 */}
      <Card className="p-4 bg-gray-50 border-l-4 border-blue-500">
        <h3 className="font-semibold mb-3 text-blue-900">🔍 システムデバッグ情報</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-medium text-gray-700">ユーザー情報</p>
            <div className="mt-1 space-y-1 text-gray-600">
              <p>ID: {user?.id || 'なし'}</p>
              <p>Email: {user?.email || 'なし'}</p>
              <p>User Type: <span className={`font-medium ${userProfile?.user_type === 'admin' ? 'text-green-600' : 'text-red-600'}`}>
                {userProfile?.user_type || 'undefined'}
              </span></p>
              <p>Is Admin: <span className={`font-medium ${isAdmin ? 'text-green-600' : 'text-red-600'}`}>
                {isAdmin ? 'true' : 'false'}
              </span></p>
            </div>
          </div>
          <div>
            <p className="font-medium text-gray-700">セッション情報</p>
            <div className="mt-1 space-y-1 text-gray-600">
              <p>Has Session: <span className={`font-medium ${session ? 'text-green-600' : 'text-red-600'}`}>
                {session ? 'true' : 'false'}
              </span></p>
              <p>Session Expiry: {session?.expires_at ? new Date(session.expires_at * 1000).toLocaleString('ja-JP') : 'なし'}</p>
              <p>Access Token: <span className={`font-medium ${session?.access_token ? 'text-green-600' : 'text-red-600'}`}>
                {session?.access_token ? 'Present' : 'Missing'}
              </span></p>
              <p>Profile Fetched: <span className={`font-medium ${userProfile ? 'text-green-600' : 'text-red-600'}`}>
                {userProfile ? 'true' : 'false'}
              </span></p>
            </div>
          </div>
        </div>
        {!isAdmin && (
          <div className="mt-4 p-3 bg-red-50 rounded-lg">
            <p className="text-red-800 font-medium">❌ 管理者権限がありません</p>
            <p className="text-sm text-red-600 mt-1">
              管理者権限を取得するには、user_type を 'admin' に設定するか、
              capasjapan@gmail.com でログインしてください。
            </p>
            {user?.email === 'capasjapan@gmail.com' && (
              <div className="mt-3 space-x-2">
                <Button
                  size="sm"
                  onClick={async () => {
                    console.log('🔧 Manual admin setup triggered');
                    adminData.clearMessages();
                    
                    try {
                      const result = await checkAndSetAdminUser(user.email || '');
                      if (result.success) {
                        adminData.showSuccess('管理者権限を設定しました。ページを再読み込みします...');
                        setTimeout(() => {
                          window.location.reload();
                        }, 1500);
                      } else {
                        adminData.showError(`管理者権限の設定に失敗しました: ${result.error}`);
                      }
                    } catch (error) {
                      adminData.showError(`エラーが発生しました: ${(error as Error).message}`);
                    }
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  管理者権限を設定
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={async () => {
                    console.log('🔍 Debug info triggered');
                    await debugAuthState();
                    const connectionResult = await testSupabaseConnection();
                    console.log('Connection test result:', connectionResult);
                  }}
                >
                  デバッグ実行
                </Button>
                <Button
                  size="sm"
                  onClick={async () => {
                    console.log('🔧 Direct profile update triggered');
                    adminData.clearMessages();
                    
                    if (!user?.id) {
                      adminData.showError('ユーザーIDが見つかりません');
                      return;
                    }
                    
                    try {
                      const result = await directUpdateUserType(user.id);
                      if (result.success) {
                        adminData.showSuccess('管理者権限を設定しました。ページを再読み込みします...');
                        setTimeout(() => {
                          window.location.reload();
                        }, 1500);
                      } else {
                        adminData.showError(`プロファイル更新に失敗: ${result.error}`);
                      }
                    } catch (error) {
                      adminData.showError(`エラーが発生しました: ${(error as Error).message}`);
                    }
                  }}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  直接更新
                </Button>
              </div>
            )}
          </div>
        )}
        
        {/* ストレージデバッグセクション */}
        <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
          <h4 className="font-medium text-yellow-800 mb-3">🔧 ストレージデバッグツール</h4>
          <div className="space-y-3">
            {/* 第1行: 基本デバッグツール */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={async () => {
                console.log('🔍 Starting storage bucket debug...');
                await debugStorageBuckets();
              }}
            >
              バケット確認
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={async () => {
                console.log('🔍 Starting vaccine data debug...');
                await debugVaccineData();
              }}
            >
              証明書データ確認
            </Button>
            <Button
              size="sm"
              onClick={async () => {
                console.log('🔧 Force setting bucket to public...');
                const result = await forcePublicBucket();
                if (result.success) {
                  adminData.showSuccess('バケットをパブリックに設定しました');
                } else {
                  adminData.showError('バケット設定に失敗しました');
                }
              }}
              className="bg-orange-600 hover:bg-orange-700"
            >
              強制パブリック化
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={async () => {
                if (adminData.pendingVaccines.length > 0) {
                  const vaccine = adminData.pendingVaccines[0];
                  const urls = [
                    getVaccineImageUrl(vaccine.rabies_vaccine_image),
                    getVaccineImageUrl(vaccine.combo_vaccine_image)
                  ].filter(url => url !== null) as string[];
                  
                  await testSpecificImageUrls(urls);
                } else {
                  console.log('No pending vaccines to test');
                }
              }}
            >
              画像URL確認
            </Button>
            <Button
              size="sm"
              onClick={async () => {
                console.log('🔍 Immediate storage check starting...');
                await immediateStorageCheck();
              }}
              className="bg-purple-600 hover:bg-purple-700"
            >
              即座診断
            </Button>
            <Button
              size="sm"
              onClick={async () => {
                console.log('🔧 Complete storage fixing starting...');
                const result = await fixStorageCompletely();
                if (result.success) {
                  adminData.showSuccess(`ストレージを修復しました！バケット修復: ${result.bucketFixed}`);
                } else {
                  adminData.showError(`ストレージ修復に失敗: ${result.error}`);
                }
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              完全修復
            </Button>
                        <Button
              size="sm"
              onClick={async () => {
                console.log('🚨 Emergency storage repair starting...');
                const result = await emergencyStorageRepair();
                if (result.success) {
                  adminData.showSuccess('緊急修復が完了しました！ページを再読み込みしてください。');
                } else {
                  adminData.showError(`緊急修復に失敗: ${result.error}`);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              🚨 緊急修復
            </Button>
            </div>
            
            {/* 第2行: 超強力修復ツール */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <Button
                size="sm"
                onClick={async () => {
                  console.log('🔒 Disabling RLS policies...');
                  const result = await disableRLS();
                  if (result.success) {
                    adminData.showSuccess('RLSポリシーを無効化しました！');
                  } else {
                    adminData.showError(`RLS無効化に失敗: ${result.error}`);
                  }
                }}
                className="bg-purple-600 hover:bg-purple-700"
              >
                🔒 RLS無効化
              </Button>
              <Button
                size="sm"
                onClick={async () => {
                  console.log('👑 Granting admin access...');
                  const result = await grantAdminAccess();
                  if (result.success) {
                    adminData.showSuccess('管理者権限を付与しました！');
                  } else {
                    adminData.showError(`権限付与に失敗: ${result.error}`);
                  }
                }}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                👑 権限付与
              </Button>
              <Button
                size="sm"
                onClick={async () => {
                  console.log('📦 Force fixing bucket...');
                  const result = await forceFixBucket();
                  if (result.success) {
                    adminData.showSuccess('バケットを強制修復しました！');
                  } else {
                    adminData.showError(`バケット修復に失敗: ${result.error}`);
                  }
                }}
                className="bg-cyan-600 hover:bg-cyan-700"
              >
                📦 バケット強制修復
              </Button>
            </div>
            
            {/* 第3行: ファイル修復ツール */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <Button
                size="sm"
                onClick={async () => {
                  console.log('🔧 Repairing missing vaccine files...');
                  const result = await repairMissingVaccineFiles();
                  if (result.success) {
                    adminData.showSuccess(`ファイル修復完了！${result.repairedCount}個のファイルを修復しました。`);
                    await adminData.fetchData();
                  } else {
                    adminData.showError(`ファイル修復に失敗: ${result.error}`);
                  }
                }}
                className="bg-green-600 hover:bg-green-700"
              >
                🔧 不足ファイル修復
              </Button>
              <Button
                size="sm"
                onClick={async () => {
                  console.log('🔧 Normalizing vaccine image paths...');
                  const result = await normalizeVaccineImagePaths();
                  if (result.success) {
                    adminData.showSuccess(`パス正規化完了！${result.updatedCount}個のレコードを更新しました。`);
                    await adminData.fetchData();
                  } else {
                    adminData.showError(`パス正規化に失敗: ${result.error}`);
                  }
                }}
                className="bg-teal-600 hover:bg-teal-700"
              >
                🔧 パス正規化
              </Button>
            </div>
          </div>
                      <p className="text-xs text-yellow-700 mt-2">
              ※ ブラウザのデベロッパーツール（F12）→ Consoleタブで結果を確認してください<br/>
              <strong>🎯 画像表示修復の推奨順序:</strong><br/>
              1️⃣ 即座診断 → 2️⃣ RLS無効化 → 3️⃣ バケット強制修復 → 4️⃣ 不足ファイル修復 → 5️⃣ パス正規化<br/>
              <strong>🚨 最後の手段:</strong> 緊急修復 → 完全修復 → 権限付与
            </p>
        </div>
      </Card>

      {/* タブナビゲーション */}
      <div className="flex space-x-4 border-b">
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === 'parks'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('parks')}
        >
          <MapPin className="w-4 h-4 inline mr-2" />
          ドッグラン審査
        </button>
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === 'vaccines'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('vaccines')}
        >
          <FileCheck className="w-4 h-4 inline mr-2" />
          ワクチン証明書審査
        </button>
      </div>

      {/* ドッグラン審査タブ */}
      {activeTab === 'parks' && !selectedPark && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">審査待ちドッグラン</h2>
          
          {adminData.pendingParks.length === 0 ? (
            <Card className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <p className="text-gray-600">審査待ちのドッグランはありません</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {adminData.pendingParks.map((park) => (
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
                        onClick={() => handleParkSelect(park)}
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
      )}

      {/* ワクチン証明書審査タブ */}
      {activeTab === 'vaccines' && !selectedVaccine && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">審査待ちワクチン証明書</h2>
          
          {adminData.pendingVaccines.length === 0 ? (
            <Card className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <p className="text-gray-600">審査待ちのワクチン証明書はありません</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {adminData.pendingVaccines.map((vaccine) => (
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
                        onClick={() => handleVaccineApproval(vaccine.id, false)}
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
      )}

      {/* ワクチン証明書詳細表示 */}
      {activeTab === 'vaccines' && selectedVaccine && (
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
          
          {/* デバッグ情報 */}
          <Card className="p-4 bg-gray-50">
            <h4 className="font-medium mb-2">デバッグ情報</h4>
            <div className="text-xs font-mono space-y-1">
              <p>Supabase URL: {import.meta.env.VITE_SUPABASE_URL}</p>
              <p>Certificate ID: {selectedVaccine.id}</p>
              <p>Dog ID: {selectedVaccine.dog_id}</p>
              <p>Status: {selectedVaccine.status}</p>
              <p>Temp Storage: {selectedVaccine.temp_storage?.toString()}</p>
              <p>Rabies Image Raw: {selectedVaccine.rabies_vaccine_image}</p>
              <p>Combo Image Raw: {selectedVaccine.combo_vaccine_image}</p>
              <p>Generated Rabies URL: {getVaccineImageUrl(selectedVaccine.rabies_vaccine_image)}</p>
              <p>Generated Combo URL: {getVaccineImageUrl(selectedVaccine.combo_vaccine_image)}</p>
              <p>Created at: {selectedVaccine.created_at}</p>
            </div>
          </Card>

          {/* ワクチン証明書画像 */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">ワクチン証明書</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 狂犬病ワクチン */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">狂犬病ワクチン</h4>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={async () => {
                        console.log('🔄 Repairing rabies vaccine image...');
                        const validUrl = await validateAndGetImageUrl(selectedVaccine.rabies_vaccine_image);
                        if (validUrl !== getPlaceholderImageUrl()) {
                          adminData.showSuccess('狂犬病ワクチン画像を修復しました！');
                        } else {
                          adminData.showError('狂犬病ワクチン画像の修復に失敗しました');
                        }
                      }}
                    >
                      🔄 修復
                    </Button>
                  </div>
                </div>
                {selectedVaccine.rabies_vaccine_image ? (
                  <div className="border rounded-lg overflow-hidden">
                    <img
                      src={getVaccineImageUrl(selectedVaccine.rabies_vaccine_image) || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzM3NDE1MSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPueUu+WDj+OCquOCiumFjeWginvoqLc6PC90ZXh0Pjwvc3ZnPg=='}
                      alt="狂犬病ワクチン証明書"
                      className="w-full h-64 object-contain"
                      onError={async (e) => {
                        const originalUrl = getVaccineImageUrl(selectedVaccine.rabies_vaccine_image);
                        console.error('❌ Failed to load rabies vaccine image:', {
                          original_path: selectedVaccine.rabies_vaccine_image,
                          generated_url: originalUrl,
                          temp_storage: selectedVaccine.temp_storage
                        });
                        
                        // URLの存在をテスト
                        if (originalUrl) {
                          await testImageUrl(originalUrl);
                        }
                        
                        e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzM3NDE1MSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPueUu+WDj+OBjOaip+OBv+OBpOOBi+OCiuOBvuOBm+OCk+OBp+OBl+OBn+OCPTwvdGV4dD48L3N2Zz4=';
                      }}
                    />
                  </div>
                ) : (
                  <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                    <p className="text-gray-500">画像なし</p>
                  </div>
                )}
              </div>
              
              {/* 混合ワクチン */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">混合ワクチン</h4>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={async () => {
                        console.log('🔄 Repairing combo vaccine image...');
                        const validUrl = await validateAndGetImageUrl(selectedVaccine.combo_vaccine_image);
                        if (validUrl !== getPlaceholderImageUrl()) {
                          adminData.showSuccess('混合ワクチン画像を修復しました！');
                        } else {
                          adminData.showError('混合ワクチン画像の修復に失敗しました');
                        }
                      }}
                    >
                      🔄 修復
                    </Button>
                  </div>
                </div>
                {selectedVaccine.combo_vaccine_image ? (
                  <div className="border rounded-lg overflow-hidden">
                    <img
                      src={getVaccineImageUrl(selectedVaccine.combo_vaccine_image) || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzM3NDE1MSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPueUu+WDj+OCquOCiumFjeWginvoqLc6PC90ZXh0Pjwvc3ZnPg=='}
                      alt="混合ワクチン証明書"
                      className="w-full h-64 object-contain"
                      onError={(e) => {
                        console.error('Failed to load combo vaccine image:', selectedVaccine.combo_vaccine_image);
                        console.error('Generated URL:', getVaccineImageUrl(selectedVaccine.combo_vaccine_image));
                        e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzM3NDE1MSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPueUu+WDj+OBjOaip+OBv+OBpOOBi+OCiuOBvuOBm+OCk+OBp+OBl+OBn+OCPTwvdGV4dD48L3N2Zz4=';
                      }}
                    />
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
      )}
    </div>
  );
}