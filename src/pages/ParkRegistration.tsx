import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import useAuth from '../context/AuthContext';
import type { DogPark } from '../types';
import RejectedParksManager from '../components/park/RejectedParksManager';
import FirstStageForm from '../components/park/FirstStageForm';
import IdentityVerificationForm from '../components/park/IdentityVerificationForm';
import BasicInfoForm from '../components/park/BasicInfoForm';
import ErrorNotification from '../components/ErrorNotification';
import { useErrorHandler } from '../hooks/useErrorHandler';
import { useRetryWithRecovery, retryConfigs } from '../hooks/useRetryWithRecovery';

export function ParkRegistration() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1); // 1: 第一審査, 2: 本人確認, 3: 基本情報入力
  const [rejectedParks, setRejectedParks] = useState<DogPark[]>([]);
  
  // エラーハンドリング
  const { error, clearError, handleError, executeWithErrorHandling } = useErrorHandler();
  const retrySystem = useRetryWithRecovery(retryConfigs.api);

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
    // Fetch rejected parks
    fetchRejectedParks();
  }, [user, navigate]);

  const fetchRejectedParks = async () => {
    await executeWithErrorHandling(async () => {
      const { data, error } = await supabase
        .from('dog_parks')
        .select('*')
        .eq('owner_id', user?.id)
        .eq('status', 'rejected');
      
      if (error) throw error;
      setRejectedParks(data || []);
    }, { operation: 'fetch_rejected_parks' });
  };

  const validateFirstStage = (data: {
    isCurrentlyOperating: string;
    isOwnedLand: string;
    hasOwnerPermission: string;
    hasNeighborConsent: string;
    landArea: string;
    isAntiSocialForces: string;
    canVisitWeekly: string;
    canReachQuickly: string;
  }) => {
    // 第一審査の必須項目チェック
    if (!data.isCurrentlyOperating) {
      throw new Error('現在の運営状況を選択してください。');
    }

    if (data.isCurrentlyOperating === 'no') {
      if (!data.isOwnedLand) {
        throw new Error('予定地の所有状況を選択してください。');
      }
      
      // 借用地の場合の所有者許可チェック
      if (data.isOwnedLand === 'no' && !data.hasOwnerPermission) {
        throw new Error('土地所有者の許可について選択してください。');
      }
      
      // 近隣住民の理解チェック（所有地・借用地両方で必要）
      if (!data.hasNeighborConsent) {
        throw new Error('近隣住民の理解について選択してください。');
      }
    }

    if (!data.landArea || parseInt(data.landArea) <= 0) {
      throw new Error('広さを正しく入力してください。');
    }

    // 反社チェック
    if (!data.isAntiSocialForces) {
      throw new Error('反社会的勢力との関係について選択してください。');
    }

    if (data.isAntiSocialForces === 'yes') {
      throw new Error('反社会的勢力との関係がある場合、ドッグランの登録はできません。');
    }

    // 週1回の訪問チェック
    if (!data.canVisitWeekly) {
      throw new Error('週1回の訪問可否について選択してください。');
    }

    // 緊急時の到着チェック
    if (!data.canReachQuickly) {
      throw new Error('緊急時の到着可否について選択してください。');
    }

    // 第一審査の条件チェック
    if (data.isCurrentlyOperating === 'no') {
      // 借用地で所有者の許可がない場合
      if (data.isOwnedLand === 'no' && data.hasOwnerPermission === 'no') {
        throw new Error('土地所有者の許可を得てからお申し込みください。借用地でのドッグラン運営には所有者の同意が必要です。');
      }
      
      // 近隣住民の理解がない場合
      if (data.hasNeighborConsent === 'no') {
        throw new Error('近隣住民の理解を得てからお申し込みください。地域との良好な関係は運営において重要です。');
      }
    }

    if (parseInt(data.landArea) < 100) {
      throw new Error('ドッグランの運営には最低100㎡以上の広さが必要です。');
    }

    // 週1回の訪問ができない場合
    if (data.canVisitWeekly === 'no') {
      throw new Error('週に1度程度の訪問が必要です。施設の状況確認やメンテナンスのため、定期的な訪問ができる方のみお申し込みください。');
    }

    // 緊急時に1時間以内に到着できない場合
    if (data.canReachQuickly === 'no') {
      throw new Error('緊急時に1時間以内に施設に到着できることが必要です。迅速な対応ができる方のみお申し込みください。');
    }
  };

  const handleFirstStageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await executeWithErrorHandling(async () => {
      validateFirstStage(formData);
      // 第一審査通過 - 本人確認へ
      setCurrentStep(2);
    }, { operation: 'first_stage_validation' });
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await retrySystem.execute(async () => {
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
            private_booth_price: 0, // 追加料金なし（サブスク・1日券に含まれる）
            facilities: formData.facilities,
            facility_details: formData.facilityDetails,
            status: 'pending', // 第一審査待ち状態
          },
        ]);

        if (error) throw error;
        navigate('/owner-dashboard');
      });
    } catch (err) {
      handleError(err, { 
        operation: 'park_registration_submit',
        form_data: {
          name: formData.name,
          address: formData.address,
          max_capacity: formData.maxCapacity,
        }
      });
    } finally {
      setIsLoading(false);
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
    clearError(); // エラーもクリア
  };

  const handleFormDataChange = (updates: Partial<typeof formData>) => {
    setFormData({ ...formData, ...updates });
  };

  const handleUpdateRejectedParks = (parks: DogPark[]) => {
    setRejectedParks(parks);
  };

  // 本人確認資料アップロードUI
  if (currentStep === 2) {
    return (
      <div>
        {/* エラー表示 */}
        <ErrorNotification 
          error={error} 
          onClear={clearError}
          onRetry={retrySystem.state.isRetrying ? undefined : () => retrySystem.execute(() => fetchRejectedParks())}
          className="mb-6"
        />
        
        {/* リトライ状態表示 */}
        {retrySystem.state.isRetrying && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-800 font-medium">自動リトライ中...</p>
                <p className="text-blue-600 text-sm">
                  試行回数: {retrySystem.state.attempts + 1}/{retryConfigs.api.maxAttempts}
                  {retrySystem.state.nextRetryIn > 0 && ` | 次の試行まで: ${retrySystem.state.nextRetryIn}秒`}
                </p>
              </div>
              <button 
                onClick={retrySystem.cancelRetry}
                className="text-blue-600 hover:text-blue-800 text-sm underline"
              >
                キャンセル
              </button>
            </div>
          </div>
        )}

        <IdentityVerificationForm
          onBack={() => setCurrentStep(1)}
          onNext={() => setCurrentStep(3)}
          onError={handleError}
          error={error?.userMessage || ''}
          user={user}
        />
      </div>
    );
  }

  // 第一審査フォーム
  if (currentStep === 1) {
    return (
      <div>
        {/* エラー表示 */}
        <ErrorNotification 
          error={error} 
          onClear={clearError}
          className="mb-6"
        />

        <RejectedParksManager
          rejectedParks={rejectedParks}
          onUpdateRejectedParks={handleUpdateRejectedParks}
          onResubmit={handleResubmitPark}
          onError={handleError}
        />
        <FirstStageForm
          formData={formData}
          onFormDataChange={handleFormDataChange}
          onSubmit={handleFirstStageSubmit}
          error={error?.userMessage || ''}
        />
      </div>
    );
  }

  // 第二審査（基本情報入力）フォーム
  return (
    <div>
      {/* エラー表示 */}
             <ErrorNotification 
         error={error} 
         onClear={clearError}
         onRetry={retrySystem.state.isRetrying ? undefined : () => retrySystem.execute(() => Promise.resolve())}
         className="mb-6"
       />
      
      {/* リトライ状態表示 */}
      {retrySystem.state.isRetrying && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-800 font-medium">自動リトライ中...</p>
              <p className="text-blue-600 text-sm">
                試行回数: {retrySystem.state.attempts + 1}/{retryConfigs.api.maxAttempts}
                {retrySystem.state.nextRetryIn > 0 && ` | 次の試行まで: ${retrySystem.state.nextRetryIn}秒`}
              </p>
            </div>
            <button 
              onClick={retrySystem.cancelRetry}
              className="text-blue-600 hover:text-blue-800 text-sm underline"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      <BasicInfoForm
        formData={formData}
        onFormDataChange={handleFormDataChange}
        onSubmit={handleFinalSubmit}
        error={error?.userMessage || ''}
        isLoading={isLoading || retrySystem.state.isRetrying}
      />
    </div>
  );
}