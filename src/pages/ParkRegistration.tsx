import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ErrorNotification from '../components/ErrorNotification';
import BasicInfoForm from '../components/park/BasicInfoForm';
import FirstStageForm from '../components/park/FirstStageForm';
import RejectedParksManager from '../components/park/RejectedParksManager';
import useAuth from '../context/AuthContext';
import { useErrorHandler } from '../hooks/useErrorHandler';
import { retryConfigs, useRetryWithRecovery } from '../hooks/useRetryWithRecovery';
import type { DogPark } from '../types';
import { formatAddressForGeocoding, geocodeAddress } from '../utils/geocoding';
import { supabase } from '../utils/supabase';

export default function ParkRegistration() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1); // 1: 第一審査・本人確認, 2: 基本情報入力
  const [rejectedParks, setRejectedParks] = useState<DogPark[]>([]);
  const [identityVerificationStatus, setIdentityVerificationStatus] = useState<'pending' | 'verified' | 'failed' | null>(null);

  // プロフィール情報の状態管理
  const [profileData, setProfileData] = useState({
    name: '',
    postal_code: '',
    address: '',
    phone_number: '',
    email: ''
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [showProfileEditModal, setShowProfileEditModal] = useState(false);

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
    // 本人確認書類
    applicantType: '' as 'individual' | 'corporate' | '',
    identityDocumentType: '' as 'license' | 'mynumber' | 'passport' | 'registration' | '',
    identityDocumentFront: null as File | null,
    identityDocumentBack: null as File | null,
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
    // Check identity verification status
    checkIdentityVerificationStatus();
    // Fetch profile data
    fetchProfileData();
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

  const checkIdentityVerificationStatus = async () => {
    await executeWithErrorHandling(async () => {
      const { data, error } = await supabase
        .from('owner_verifications')
        .select('status')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setIdentityVerificationStatus(data?.status || null);
    }, { operation: 'check_identity_verification' });
  };

  // プロフィール情報を取得
  const fetchProfileData = async () => {
    await executeWithErrorHandling(async () => {
      setProfileLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('name, postal_code, address, phone_number, email')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      setProfileData(data || {
        name: '',
        postal_code: '',
        address: '',
        phone_number: '',
        email: ''
      });
    }, { operation: 'fetch_profile_data' });
    setProfileLoading(false);
  };

  // プロフィール情報を更新
  const updateProfileData = async (updatedData: typeof profileData) => {
    await executeWithErrorHandling(async () => {
      setProfileLoading(true);
      const { error } = await supabase
        .from('profiles')
        .update(updatedData)
        .eq('id', user?.id);

      if (error) throw error;
      setProfileData(updatedData);
      setShowProfileEditModal(false);
    }, { operation: 'update_profile_data' });
    setProfileLoading(false);
  };

  const handleFormDataChange = (updates: Partial<typeof formData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleUpdateRejectedParks = (parks: DogPark[]) => {
    setRejectedParks(parks);
  };

  const handleResubmitPark = (parkData: DogPark) => {
    // 却下されたパークの情報を使って基本情報を再入力
    setFormData(prev => ({
      ...prev,
      name: parkData.name,
      description: parkData.description || '',
      address: parkData.address,
      maxCapacity: parkData.max_capacity?.toString() || '10',
      largeDogArea: parkData.large_dog_area || true,
      smallDogArea: parkData.small_dog_area || true,
      privateBooths: parkData.private_booths || false,
      privateBoothCount: parkData.private_booth_count?.toString() || '0',
      facilities: parkData.facilities || {
        parking: false,
        shower: false,
        restroom: false,
        agility: false,
        rest_area: false,
        water_station: false,
      },
      facilityDetails: parkData.facility_details || '',
    }));
    setCurrentStep(2); // 基本情報入力ステップに移動
  };

  const validateFirstStage = (data: typeof formData) => {
    // 基本バリデーション
    if (!data.isCurrentlyOperating || data.isCurrentlyOperating === '') {
      throw new Error('現在のドッグラン運営状況について選択してください。');
    }

    // 現在運営していない場合の追加バリデーション
    if (data.isCurrentlyOperating === 'no') {
      if (!data.isOwnedLand || data.isOwnedLand === '') {
        throw new Error('土地の所有状況について選択してください。');
      }

      // 借用地の場合は所有者の許可が必要
      if (data.isOwnedLand === 'no' && (!data.hasOwnerPermission || data.hasOwnerPermission === '')) {
        throw new Error('土地所有者の許可について選択してください。');
      }

      // 近隣住民の理解チェック（所有地・借用地両方で必要）
      if (!data.hasNeighborConsent || data.hasNeighborConsent === '') {
        throw new Error('近隣住民の理解について選択してください。');
      }
    }

    if (!data.landArea || parseInt(data.landArea) <= 0) {
      throw new Error('広さを正しく入力してください。');
    }

    // 反社チェック
    if (!data.isAntiSocialForces || data.isAntiSocialForces === '') {
      throw new Error('反社会勢力との関係について選択してください。');
    }

    if (data.isAntiSocialForces === 'yes') {
      throw new Error('反社会勢力との関係がある場合、ドッグランの登録はできません。');
    }

    // 週1回の訪問チェック
    if (!data.canVisitWeekly || data.canVisitWeekly === '') {
      throw new Error('週1回の訪問可否について選択してください。');
    }

    // 緊急時の到着チェック
    if (!data.canReachQuickly || data.canReachQuickly === '') {
      throw new Error('緊急時の到着可否について選択してください。');
    }

    // 本人確認書類のチェック
    if (!data.identityDocumentFront) {
      throw new Error('本人確認書類をアップロードしてください。');
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
      // デバッグ: フォームデータの値を確認
      console.log('Form data before validation:', {
        isAntiSocialForces: formData.isAntiSocialForces,
        canVisitWeekly: formData.canVisitWeekly,
        canReachQuickly: formData.canReachQuickly,
        isCurrentlyOperating: formData.isCurrentlyOperating,
        identityDocumentFront: formData.identityDocumentFront?.name || 'null'
      });

      validateFirstStage(formData);

      if (!user) {
        throw new Error('ユーザー情報が取得できません。再度ログインしてください。');
      }

      setIsLoading(true);

      try {
        console.log('Starting identity document upload...');
        
        // 本人確認書類をアップロード
        if (formData.identityDocumentFront) {
          const uploads = [];
          
          // 表面のアップロード
          const frontFileName = `identity_front_${user.id}_${Date.now()}_${formData.identityDocumentFront.name}`;
          console.log('Uploading front file:', frontFileName);

          const frontUpload = supabase.storage
            .from('vaccine-certs')
            .upload(frontFileName, formData.identityDocumentFront, { upsert: true });

          uploads.push(frontUpload);

          // 裏面のアップロード（運転免許証の場合）
          let backUpload = null;
          if (formData.identityDocumentType === 'license' && formData.identityDocumentBack) {
            const backFileName = `identity_back_${user.id}_${Date.now()}_${formData.identityDocumentBack.name}`;
            console.log('Uploading back file:', backFileName);

            backUpload = supabase.storage
              .from('vaccine-certs')
              .upload(backFileName, formData.identityDocumentBack, { upsert: true });

            uploads.push(backUpload);
          }

          // 並行アップロード実行
          const results = await Promise.all(uploads);
          const [frontResult, backResult] = results;

          if (!frontResult || frontResult.error) {
            console.error('Front upload error:', frontResult?.error);
            throw new Error(`表面のアップロードに失敗しました: ${frontResult?.error?.message || 'アップロードエラー'}`);
          }

          if (backResult && backResult.error) {
            console.error('Back upload error:', backResult.error);
            throw new Error(`裏面のアップロードに失敗しました: ${backResult.error.message}`);
          }

          console.log('Upload successful:', { front: frontResult.data, back: backResult?.data });

          // owner_verificationsテーブルに本人確認書類を保存（両面情報を含む）
          const verificationData = {
            document_url_front: frontResult.data.path,
            file_name_front: formData.identityDocumentFront.name,
            file_size_front: formData.identityDocumentFront.size,
            file_type_front: formData.identityDocumentFront.type,
            document_type: formData.identityDocumentType,
            uploaded_at: new Date().toISOString(),
            application_stage: 'first_stage'
          };

          // 裏面が存在する場合は追加
          if (backResult?.data && formData.identityDocumentBack) {
            Object.assign(verificationData, {
              document_url_back: backResult.data.path,
              file_name_back: formData.identityDocumentBack.name,
              file_size_back: formData.identityDocumentBack.size,
              file_type_back: formData.identityDocumentBack.type,
            });
          }

          const dbData = {
            user_id: user.id,
            verification_id: frontResult.data.path, // 表面のパスをverification_idとして使用
            status: 'pending', // 管理者承認待ち
            verification_data: verificationData
          };

          console.log('Saving to database:', dbData);

          const { error: dbError } = await supabase
            .from('owner_verifications')
            .upsert(dbData, { onConflict: 'user_id' });

          if (dbError) {
            console.error('Database error:', dbError);
            throw new Error(`データベース保存に失敗しました: ${dbError.message}`);
          }

          console.log('Database save successful');
        }

        console.log('Moving to step 2...');
        // 基本情報入力ステップに移動
        setCurrentStep(2);

        // ページの最上部にスクロール
        window.scrollTo({ top: 0, behavior: 'smooth' });
        console.log('First stage completed successfully');
      } catch (err) {
        console.error('Error in handleFirstStageSubmit:', err);
        const errorMessage = err instanceof Error ? err.message : '申込みに失敗しました。';
        throw new Error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    });
  };

  const handleBasicInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    clearError();

    try {
      await executeWithErrorHandling(async () => {
        // Get the current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
          throw new Error('ユーザー認証に失敗しました。再度ログインしてください。');
        }

        // 住所から緯度・経度を取得
        console.log(`📍 住所をジオコーディング中: ${formData.address}`);
        const formattedAddress = formatAddressForGeocoding(formData.address);
        const geocodeResult = await geocodeAddress(formattedAddress);
        
        let latitude = null;
        let longitude = null;
        
        if (geocodeResult) {
          latitude = geocodeResult.latitude;
          longitude = geocodeResult.longitude;
          console.log(`✅ ジオコーディング成功: ${latitude}, ${longitude}`);
        } else {
          console.warn('⚠️ ジオコーディングに失敗しました。住所のみで登録を続行します。');
          // ジオコーディング失敗でも登録は続行（住所のみ保存）
        }

        // プロフィールのuser_typeを'owner'に更新
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ user_type: 'owner' })
          .eq('id', user.id);

        if (profileError) {
          throw new Error('プロフィールの更新に失敗しました。');
        }

        const parkData = {
          owner_id: user.id,
          name: formData.name,
          description: formData.description,
          address: formData.address,
          latitude: latitude,
          longitude: longitude,
          price: 800,
          max_capacity: parseInt(formData.maxCapacity, 10),
          large_dog_area: formData.largeDogArea,
          small_dog_area: formData.smallDogArea,
          private_booths: formData.privateBooths,
          private_booth_count: parseInt(formData.privateBoothCount, 10),
          private_booth_price: 0,
          facilities: formData.facilities,
          facility_details: formData.facilityDetails,
          status: 'pending',
        };


        const { error: insertError } = await supabase.from('dog_parks').insert([parkData]);

        if (insertError) {
          throw insertError;
        }


        // 少し待機してから画面遷移
        setTimeout(() => {
          navigate('/dashboard');
        }, 100);
      });
    } catch (error) {
      handleError(error instanceof Error ? error : new Error('不明なエラーが発生しました。'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleIdentityNext = () => {
    setCurrentStep(3);
  };

  const handleIdentityBack = () => {
    setCurrentStep(1);
  };

  const handleIdentityError = (error: string) => {
    handleError(new Error(error));
  };

  // 第一審査・本人確認フォーム
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
          profileData={profileData}
          profileLoading={profileLoading}
          onProfileUpdate={updateProfileData}
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
        {...(retrySystem.state.isRetrying ? {} : { onRetry: () => retrySystem.execute(() => Promise.resolve()) })}
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

      {currentStep === 2 && (
        <BasicInfoForm
          formData={formData}
          onFormDataChange={handleFormDataChange}
          onSubmit={handleBasicInfoSubmit}
          error={error?.userMessage || ''}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
