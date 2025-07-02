import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import Input from '../components/Input';
import { CheckCircle, AlertTriangle, FileText, Building, DollarSign, ShieldAlert, Shield, Fingerprint, Trash2, RefreshCw } from 'lucide-react';
import { supabase } from '../utils/supabase';
import { useAuth } from '../context/AuthContext';
import type { DogPark } from '../types';

export function ParkRegistration() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState(1); // 1: 第一審査, 2: 本人確認, 3: 基本情報入力
  const [verificationSessionUrl, setVerificationSessionUrl] = useState('');
  const [isCreatingVerification, setIsCreatingVerification] = useState(false);
  const [rejectedParks, setRejectedParks] = useState<DogPark[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    // 第一審査の質問
    isCurrentlyOperating: '', // 'yes' or 'no'
    isOwnedLand: '', // 'yes' or 'no' (現在運営していない場合のみ)
    hasOwnerPermission: '', // 'yes' or 'no' (借用地の場合のみ)
    hasNeighborConsent: '', // 'yes' or 'no' (所有地または借用地の場合)
    landArea: '', // 広さ（㎡）
    isAntiSocialForces: '', // 'yes' or 'no' (反社チェック)
    canVisitWeekly: '', // 'yes' or 'no' (週1回の訪問が可能か)
    canReachQuickly: '', // 'yes' or 'no' (緊急時に1時間以内に到着可能か)
    
    // 基本情報
    name: '',
    description: '',
    address: '',
    maxCapacity: '10',
    largeDogArea: true,
    smallDogArea: true,
    privateBooths: false,
    privateBoothCount: '0',
    facilities: {
      parking: false,
      shower: false,
      restroom: false,
      agility: false,
      rest_area: false,
      water_station: false,
    },
    facilityDetails: '',
  });

  useEffect(() => {
    // Check if user is logged in
    if (!user) {
      navigate('/login');
      return;
    }
    
    // Check if identity verification is already completed
    checkIdentityVerification();
    
    // Fetch rejected parks
    fetchRejectedParks();
  }, [user, navigate]);

  const fetchRejectedParks = async () => {
    try {
      const { data, error } = await supabase
        .from('dog_parks')
        .select('*')
        .eq('owner_id', user?.id)
        .eq('status', 'rejected');
      
      if (error) throw error;
      setRejectedParks(data || []);
    } catch (err) {
      console.error('Error fetching rejected parks:', err);
    }
  };

  const checkIdentityVerification = async () => {
    try {
      // Check if the user has already completed identity verification
      const { data, error } = await supabase
        .from('owner_verifications')
        .select('status, verification_id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) throw error;

      if (data && data.status === 'verified') {
        // User has already been verified
        setCurrentStep(3);
      } else if (data && data.verification_id) {
        // Verification is in progress, check status
        await checkVerificationStatus(data.verification_id);
      }
    } catch (err) {
      console.error('Error checking identity verification:', err);
    }
  };

  const checkVerificationStatus = async (verificationId: string) => {
    try {
      setIsLoading(true);
      setError('');

      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('認証が必要です');
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-identity-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          verificationId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '本人確認ステータスの取得に失敗しました');
      }

      const result = await response.json();
      
      if (result.status === 'verified') {
        // Move to next step
        setCurrentStep(3);
      } else if (result.status === 'processing') {
        // Still processing
        setError('本人確認は処理中です。しばらく経ってから再度お試しください。');
      } else {
        // Failed or requires action
        setError('本人確認に問題があります。もう一度お試しください。');
      }
    } catch (err: unknown) {
      console.error('Error checking verification status:', err);
      setError((err as Error).message || '本人確認ステータスの取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const createIdentityVerificationSession = async () => {
    try {
      setIsCreatingVerification(true);
      setError('');

      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('認証が必要です');
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-identity-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          returnUrl: `${window.location.origin}/register-park`
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '本人確認セッションの作成に失敗しました');
      }

      const { url, id } = await response.json();
      
      if (!url || !id) {
        throw new Error('本人確認セッションの作成に失敗しました');
      }

      // Save verification session ID to database
      const { error: saveError } = await supabase
        .from('owner_verifications')
        .upsert({
          user_id: user?.id,
          verification_id: id,
          status: 'pending',
          created_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

      if (saveError) {
        throw saveError;
      }

      setVerificationSessionUrl(url);
    } catch (err: unknown) {
      console.error('Error creating verification session:', err);
      setError((err as Error).message || '本人確認セッションの作成に失敗しました');
      // Go back to first step
      setCurrentStep(1);
    } finally {
      setIsCreatingVerification(false);
    }
  };

  const handleFirstStageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 第一審査の必須項目チェック
    if (!formData.isCurrentlyOperating) {
      setError('現在の運営状況を選択してください。');
      return;
    }

    if (formData.isCurrentlyOperating === 'no') {
      if (!formData.isOwnedLand) {
        setError('予定地の所有状況を選択してください。');
        return;
      }
      
      // 借用地の場合の所有者許可チェック
      if (formData.isOwnedLand === 'no' && !formData.hasOwnerPermission) {
        setError('土地所有者の許可について選択してください。');
        return;
      }
      
      // 近隣住民の理解チェック（所有地・借用地両方で必要）
      if (!formData.hasNeighborConsent) {
        setError('近隣住民の理解について選択してください。');
        return;
      }
    }

    if (!formData.landArea || parseInt(formData.landArea) <= 0) {
      setError('広さを正しく入力してください。');
      return;
    }

    // 反社チェック
    if (!formData.isAntiSocialForces) {
      setError('反社会的勢力との関係について選択してください。');
      return;
    }

    if (formData.isAntiSocialForces === 'yes') {
      setError('反社会的勢力との関係がある場合、ドッグランの登録はできません。');
      return;
    }

    // 週1回の訪問チェック
    if (!formData.canVisitWeekly) {
      setError('週1回の訪問可否について選択してください。');
      return;
    }

    // 緊急時の到着チェック
    if (!formData.canReachQuickly) {
      setError('緊急時の到着可否について選択してください。');
      return;
    }

    // 第一審査の条件チェック
    if (formData.isCurrentlyOperating === 'no') {
      // 借用地で所有者の許可がない場合
      if (formData.isOwnedLand === 'no' && formData.hasOwnerPermission === 'no') {
        setError('土地所有者の許可を得てからお申し込みください。借用地でのドッグラン運営には所有者の同意が必要です。');
        return;
      }
      
      // 近隣住民の理解がない場合
      if (formData.hasNeighborConsent === 'no') {
        setError('近隣住民の理解を得てからお申し込みください。地域との良好な関係は運営において重要です。');
        return;
      }
    }

    if (parseInt(formData.landArea) < 100) {
      setError('ドッグランの運営には最低100㎡以上の広さが必要です。');
      return;
    }

    // 週1回の訪問ができない場合
    if (formData.canVisitWeekly === 'no') {
      setError('週に1度程度の訪問が必要です。施設の状況確認やメンテナンスのため、定期的な訪問ができる方のみお申し込みください。');
      return;
    }

    // 緊急時に1時間以内に到着できない場合
    if (formData.canReachQuickly === 'no') {
      setError('緊急時に1時間以内に施設に到着できることが必要です。迅速な対応ができる方のみお申し込みください。');
      return;
    }

    // 第一審査通過 - 本人確認へ
    setCurrentStep(2);
    // 本人確認セッションを作成
    createIdentityVerificationSession();
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Get the current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('ユーザー認証に失敗しました。再度ログインしてください。');
      }

      // プロフィールのuser_typeを'owner'に更新
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ user_type: 'owner' })
        .eq('id', user.id);

      if (profileError) {
        console.error('Error updating profile:', profileError);
        throw new Error('プロフィールの更新に失敗しました。');
      }

      const { error } = await supabase.from('dog_parks').insert([
        {
          owner_id: user.id, // Add the owner_id field to satisfy RLS policy
          name: formData.name,
          description: formData.description,
          address: formData.address,
          price: 800, // 固定料金
          max_capacity: parseInt(formData.maxCapacity, 10),
          large_dog_area: formData.largeDogArea,
          small_dog_area: formData.smallDogArea,
          private_booths: formData.privateBooths,
          private_booth_count: parseInt(formData.privateBoothCount, 10),
          private_booth_price: 5000, // 固定料金
          facilities: formData.facilities,
          facility_details: formData.facilityDetails,
          status: 'pending', // 第一審査待ち状態
        },
      ]);

      if (error) throw error;
      navigate('/owner-dashboard');
    } catch (err) {
      console.error('Registration error:', err);
      setError(err instanceof Error ? err.message : 'ドッグランの登録に失敗しました。もう一度お試しください。');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePark = async (parkId: string) => {
    try {
      setIsDeleting(true);
      
      // Delete the park
      const { error } = await supabase
        .from('dog_parks')
        .delete()
        .eq('id', parkId);
      
      if (error) throw error;
      
      // Update the rejected parks list
      setRejectedParks(prev => prev.filter(park => park.id !== parkId));
      setShowConfirmDelete(null);
      
    } catch (err: unknown) {
      console.error('Error deleting park:', err);
      setError((err as Error).message || 'ドッグランの削除に失敗しました');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleResubmitPark = () => {
    // Reset the form and start a new application
    setFormData({
      isCurrentlyOperating: '',
      isOwnedLand: '',
      hasOwnerPermission: '',
      hasNeighborConsent: '',
      landArea: '',
      isAntiSocialForces: '',
      canVisitWeekly: '',
      canReachQuickly: '',
      name: '',
      description: '',
      address: '',
      maxCapacity: '10',
      largeDogArea: true,
      smallDogArea: true,
      privateBooths: false,
      privateBoothCount: '0',
      facilities: {
        parking: false,
        shower: false,
        restroom: false,
        agility: false,
        rest_area: false,
        water_station: false,
      },
      facilityDetails: '',
    });
    // Go to first step
    setCurrentStep(1);
  };

  // 本人確認ステップ
  if (currentStep === 2) {
    return (
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-center mb-8">ドッグラン登録 - 本人確認</h1>
        
        <Card className="mb-6 bg-blue-50 border-blue-200">
          <div className="flex items-start space-x-3">
            <Shield className="w-6 h-6 text-blue-600 mt-1" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">本人確認について</h3>
              <div className="text-sm text-blue-800 space-y-1">
                <p>安全なプラットフォーム運営のため、ドッグランオーナーには本人確認が必要です。</p>
                <p>以下の手順で本人確認を完了してください：</p>
                <ol className="list-decimal ml-5 space-y-1 mt-2">
                  <li>「本人確認を開始」ボタンをクリックする</li>
                  <li>Stripeの本人確認ページが開きます</li>
                  <li>身分証明書（運転免許証、パスポートなど）をアップロード</li>
                  <li>顔写真を撮影して本人確認を完了</li>
                  <li>確認完了後、自動的にこのページに戻ります</li>
                </ol>
              </div>
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
          <div className="text-center mb-6">
            <Fingerprint className="w-16 h-16 text-blue-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold">本人確認</h2>
            <p className="text-gray-600 mt-2">
              安全なプラットフォーム運営のため、ドッグランオーナーには本人確認が必要です。
              Stripeの安全な本人確認サービスを使用して、身分証明書と顔写真による本人確認を行います。
            </p>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg mb-6">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium mb-1">必要な書類</p>
                <ul className="space-y-1">
                  <li>• 運転免許証、パスポート、マイナンバーカードのいずれか</li>
                  <li>• ウェブカメラまたはスマートフォンのカメラ（顔写真撮影用）</li>
                  <li>• 本人確認は通常5分程度で完了します</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <Button
              variant="secondary"
              onClick={() => setCurrentStep(1)}
            >
              前のステップに戻る
            </Button>
            
            {verificationSessionUrl ? (
              <Button
                onClick={() => window.location.href = verificationSessionUrl}
                isLoading={isLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Shield className="w-4 h-4 mr-2" />
                本人確認を開始
              </Button>
            ) : (
              <Button
                onClick={createIdentityVerificationSession}
                isLoading={isCreatingVerification}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Shield className="w-4 h-4 mr-2" />
                本人確認セッションを作成
              </Button>
            )}
          </div>
        </Card>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-start space-x-3">
            <Lock className="w-5 h-5 text-gray-600 mt-1" />
            <div className="text-sm text-gray-700">
              <p className="font-medium mb-1">プライバシーと安全性</p>
              <p>
                本人確認情報は暗号化され、Stripeのセキュアなサーバーで安全に保管されます。
                当サービスでは、本人確認が完了したかどうかの情報のみを保持し、身分証明書や顔写真などの個人情報は保存しません。
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 第一審査フォーム
  if (currentStep === 1) {
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

        {/* 却下された申請一覧 */}
        {rejectedParks.length > 0 && (
          <Card className="mb-6 bg-red-50 border-red-200">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-6 h-6 text-red-600 mt-1" />
              <div>
                <h3 className="font-semibold text-red-900 mb-2">却下された申請</h3>
                <p className="text-sm text-red-800 mb-4">
                  以下の申請は審査の結果、却下されました。申請内容を見直して再提出するか、削除することができます。
                </p>
                <div className="space-y-4">
                  {rejectedParks.map(park => (
                    <div key={park.id} className="bg-white p-4 rounded-lg border border-red-200">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{park.name}</h4>
                          <p className="text-sm text-gray-600">{park.address}</p>
                          <p className="text-sm text-gray-500 mt-1">申請日: {new Date(park.created_at).toLocaleDateString('ja-JP')}</p>
                        </div>
                        <div className="flex space-x-2">
                          <Button 
                            size="sm" 
                            variant="secondary"
                            onClick={handleResubmitPark}
                          >
                            <RefreshCw className="w-4 h-4 mr-1" />
                            再申請
                          </Button>
                          <Button 
                            size="sm" 
                            variant="secondary"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => setShowConfirmDelete(park.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            削除
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        )}

        <Card>
          <form onSubmit={handleFirstStageSubmit}>
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
                    onChange={(e) => setFormData({ 
                      ...formData, 
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
                    onChange={(e) => setFormData({ 
                      ...formData, 
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
                        onChange={(e) => setFormData({ 
                          ...formData, 
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
                        onChange={(e) => setFormData({ 
                          ...formData, 
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
                          onChange={(e) => setFormData({ 
                            ...formData, 
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
                          onChange={(e) => setFormData({ 
                            ...formData, 
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
                          onChange={(e) => setFormData({ 
                            ...formData, 
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
                          onChange={(e) => setFormData({ 
                            ...formData, 
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
                onChange={(e) => setFormData({ ...formData, landArea: e.target.value })}
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
                    onChange={(e) => setFormData({ 
                      ...formData, 
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
                    onChange={(e) => setFormData({ 
                      ...formData, 
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
                    onChange={(e) => setFormData({ 
                      ...formData, 
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
                    onChange={(e) => setFormData({ 
                      ...formData, 
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
                    onChange={(e) => setFormData({ 
                      ...formData, 
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
                    onChange={(e) => setFormData({ 
                      ...formData, 
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
                      onChange={(e) => setFormData({
                        ...formData,
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

        {/* 削除確認モーダル */}
        {showConfirmDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">申請を削除しますか？</h3>
              <p className="text-gray-600 mb-6">
                この操作は取り消せません。申請を削除してもよろしいですか？
              </p>
              <div className="flex justify-end space-x-3">
                <Button
                  variant="secondary"
                  onClick={() => setShowConfirmDelete(null)}
                >
                  キャンセル
                </Button>
                <Button
                  className="bg-red-600 hover:bg-red-700"
                  isLoading={isDeleting}
                  onClick={() => handleDeletePark(showConfirmDelete)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  削除する
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 第二審査（基本情報入力）フォーム
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
        <form onSubmit={handleFinalSubmit}>
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          <Input
            label="施設名 *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              説明 *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
              required
            />
          </div>
          
          <Input
            label="住所 *"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
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
            onChange={(e) => setFormData({ ...formData, maxCapacity: e.target.value })}
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
                  onChange={(e) => setFormData({
                    ...formData,
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
                  onChange={(e) => setFormData({
                    ...formData,
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
                onChange={(e) => setFormData({
                  ...formData,
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
                  onChange={(e) => setFormData({ ...formData, privateBoothCount: e.target.value })}
                />
                <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <span className="font-medium">プライベートブース料金:</span> ¥5,000/2時間（固定）
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
                    onChange={(e) => setFormData({
                      ...formData,
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
              onChange={(e) => setFormData({ ...formData, facilityDetails: e.target.value })}
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
            <div className="flex space-x-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setCurrentStep(1)}
              >
                第一審査に戻る
              </Button>
              <Button 
                type="submit" 
                isLoading={isLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                第二審査に申し込む
              </Button>
            </div>
          </div>
        </form>
      </Card>
    </div>
  );
}

// Lock component for privacy section
function Lock({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
    </svg>
  );
}