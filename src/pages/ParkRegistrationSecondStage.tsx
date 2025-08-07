import { AlertTriangle, ArrowLeft, Building, Camera, CheckCircle, Clock, CreditCard, FileText, Image as ImageIcon, MapPin, ParkingCircle, Shield, ShowerHead, Trash2, Upload, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import ImageCropper from '../components/ImageCropper'; // Added import for ImageCropper
import Input from '../components/Input';
import useAuth from '../context/AuthContext';

import { supabase } from '../utils/supabase';

interface FacilityImage {
  id?: string;
  image_type: string;
  image_url?: string;
  is_approved?: boolean | null;
  admin_notes?: string | null;
  file?: File;
  uploading?: boolean;
  error?: string | undefined;
}

interface DogPark {
  id: string;
  name: string;
  address: string;
  status: string;
  facilities: {
    parking: boolean;
    shower: boolean;
    restroom: boolean;
    agility: boolean;
    rest_area: boolean;
    water_station: boolean;
  };
  large_dog_area: boolean;
  small_dog_area: boolean;
  private_booths: boolean;
}

interface BankAccount {
  id?: string;
  bank_name: string;
  bank_code: string;
  branch_name: string;
  branch_code: string;
  account_type: 'ordinary' | 'checking';
  account_number: string;
  account_holder_name: string;
}

const IMAGE_TYPES = {
  overview: {
    label: '施設全景',
    description: 'ドッグランの全体が見渡せる写真',
    icon: Building,
    required: true
  },
  entrance: {
    label: '入口',
    description: '入口の様子がわかる写真',
    icon: MapPin,
    required: true
  },
  gate: {
    label: 'スマートロック',
    description: 'ドッグランのスマートロック（入退場管理）の写真',
    icon: Shield,
    required: true
  },
  large_dog_area: {
    label: '大型犬エリア',
    description: '大型犬用のエリアの写真',
    icon: Building,
    required: false,
    conditionalOn: 'large_dog_area'
  },
  small_dog_area: {
    label: '小型犬エリア',
    description: '小型犬用のエリアの写真',
    icon: Building,
    required: false,
    conditionalOn: 'small_dog_area'
  },
  private_booth: {
    label: 'プライベートブース',
    description: 'プライベートブースの内部と外観',
    icon: Building,
    required: false,
    conditionalOn: 'private_booths'
  },
  parking: {
    label: '駐車場',
    description: '駐車場の様子がわかる写真',
    icon: ParkingCircle,
    required: false,
    conditionalOn: 'facilities.parking'
  },
  shower: {
    label: 'シャワー設備',
    description: 'シャワー設備の写真',
    icon: ShowerHead,
    required: false,
    conditionalOn: 'facilities.shower'
  },
  restroom: {
    label: 'トイレ',
    description: 'トイレ設備の写真',
    icon: FileText,
    required: false,
    conditionalOn: 'facilities.restroom'
  },
  agility: {
    label: 'アジリティ設備',
    description: 'アジリティ設備の写真',
    icon: Building,
    required: false,
    conditionalOn: 'facilities.agility'
  },
  rest_area: {
    label: '休憩スペース',
    description: '休憩スペースの写真',
    icon: Building,
    required: false,
    conditionalOn: 'facilities.rest_area'
  },
  water_station: {
    label: '給水設備',
    description: '給水設備の写真',
    icon: Building,
    required: false,
    conditionalOn: 'facilities.water_station'
  }
} as const;

export function ParkRegistrationSecondStage() {
  const { id: parkId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [park, setPark] = useState<DogPark | null>(null);
  const [images, setImages] = useState<FacilityImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showImagePreview, setShowImagePreview] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'images' | 'bank'>('images');
  const [bankAccount, setBankAccount] = useState<BankAccount>({
    bank_name: '',
    bank_code: '',
    branch_name: '',
    branch_code: '',
    account_type: 'ordinary',
    account_number: '',
    account_holder_name: ''
  });
  const [isSavingBank, setIsSavingBank] = useState(false);
  const [bankError, setBankError] = useState('');
  const [bankSuccess, setBankSuccess] = useState('');
  const [smartLockPurchased, setSmartLockPurchased] = useState(false);
  const [smartLockError, setSmartLockError] = useState('');
  
  // Image Cropper用のstate
  const [showImageCropper, setShowImageCropper] = useState(false);
  const [currentImageType, setCurrentImageType] = useState<string>('');
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);

  useEffect(() => {
    console.log('🔍 ParkRegistrationSecondStage - parkId:', parkId);
    console.log('🔍 ParkRegistrationSecondStage - user:', user?.id);
    
    if (!user || !parkId) {
      console.log('❌ Missing user or parkId, redirecting...');
      navigate('/owner-dashboard');
      return;
    }

    void fetchParkData();
  }, [user, parkId, navigate]);

  const fetchParkData = async () => {
    try {
      setIsLoading(true);
      console.log('📡 Fetching park data for parkId:', parkId);

      // Fetch park data
      const { data: parkData, error: parkError } = await supabase
        .from('dog_parks')
        .select('*')
        .eq('id', parkId)
        .eq('owner_id', user?.id)
        .single();

      console.log('📋 Park data response:', { parkData, parkError });

      if (parkError) throw parkError;
      if (!parkData) {
        console.log('❌ No park data found, redirecting...');
        navigate('/owner-dashboard');
        return;
      }

      setPark(parkData);
      console.log('✅ Park data loaded successfully');

      // Fetch existing facility images
      const { data: imageData, error: imageError } = await supabase
        .from('dog_park_facility_images')
        .select('*')
        .eq('park_id', parkId);

      if (imageError) {
        console.error('Error fetching images:', imageError);
      }

      // Initialize images array based on park facilities and existing images
      const requiredImageTypes = Object.entries(IMAGE_TYPES)
        .filter(([, config]) => {
          if (config.required) return true;
          if (config.conditionalOn && parkData) {
            const path = config.conditionalOn.split('.');
            if (path.length === 1) {
              return ((parkData as any)[path[0]]) ?? false;
            } else if (path.length === 2) {
              const parent = (parkData as any)[path[0]];
              if (parent && typeof parent === 'object') {
                return (parent as any)[path[1]] ?? false;
              }
            }
          }
          return false;
        })
        .map(([key]) => key);

      const facilityImages: FacilityImage[] = requiredImageTypes.map(imageType => {
        const existingImage = (imageData || []).find(img => img.image_type === imageType);
        return {
          id: existingImage?.id,
          image_type: imageType,
          image_url: existingImage?.image_url,
          is_approved: existingImage?.is_approved ?? null,
          admin_notes: existingImage?.admin_notes
        };
      });

      setImages(facilityImages);

      // Fetch bank account information
      const { data: bankData, error: bankError } = await supabase
        .rpc('get_owner_bank_account');

      if (!bankError && bankData && bankData.length > 0) {
        setBankAccount({
          id: bankData[0].id,
          bank_name: bankData[0].bank_name,
          bank_code: bankData[0].bank_code,
          branch_name: bankData[0].branch_name,
          branch_code: bankData[0].branch_code,
          account_type: bankData[0].account_type as 'ordinary' | 'checking',
          account_number: bankData[0].account_number,
          account_holder_name: bankData[0].account_holder_name
        });
      }
    } catch (error) {
      setError((error as Error).message || 'エラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageSelect = (imageType: string, file: File) => {
    // Image Cropperを表示するために、選択されたファイルとタイプを保存
    setCurrentImageType(imageType);
    setSelectedImageFile(file);
    setShowImageCropper(true);
  };

  // Image Cropper完了時の処理
  const handleCropComplete = async (croppedFile: File) => {
    // 元のファイル名を保持してcroppedFileに設定
    const originalFileName = selectedImageFile?.name || 'image.jpg';
    const fileWithName = new File([croppedFile], originalFileName, { type: croppedFile.type });
    
    // 現在の画像タイプを保存（状態をクリアする前に）
    const imageTypeToUpload = currentImageType;
    
    // Image Cropperを閉じる
    setShowImageCropper(false);
    setCurrentImageType('');
    setSelectedImageFile(null);
    
    // 即座にアップロード処理を開始
    if (imageTypeToUpload) {
      try {
        // アップロード中状態に設定
        setImages(prev => prev.map(img =>
          img.image_type === imageTypeToUpload
            ? { ...img, file: fileWithName, uploading: true, error: undefined }
            : img
        ));

        // ファイルを直接アップロード
        const fileName = fileWithName.name || 'image.jpg';
        const fileExt = fileName.includes('.') ? fileName.split('.').pop() : 'jpg';
        const uploadFileName = `${parkId}/${imageTypeToUpload}_${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('dog-park-images')
          .upload(uploadFileName, fileWithName);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('dog-park-images')
          .getPublicUrl(uploadFileName);

              // データベースに保存
      const imageToUpdate = images.find(img => img.image_type === imageTypeToUpload);
      if (imageToUpdate?.id) {
        // Update existing image
        const { error: updateError } = await supabase
          .from('dog_park_facility_images')
          .update({
            image_url: publicUrl,
            is_approved: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', imageToUpdate.id);

        if (updateError) throw updateError;
      } else {
        // Insert new image
        const { error: insertError } = await supabase
          .from('dog_park_facility_images')
          .insert({
            park_id: parkId,
            image_type: imageTypeToUpload,
            image_url: publicUrl
          });

        if (insertError) throw insertError;
      }

        // データを再取得
        await fetchParkData();

        // 成功メッセージ
        const typeConfig = IMAGE_TYPES[imageTypeToUpload as keyof typeof IMAGE_TYPES];
        const label = typeConfig?.label || imageTypeToUpload;
        setSuccess(`${label}の画像をアップロードしました`);
        setTimeout(() => setSuccess(''), 3000);

      } catch (error) {
        console.error('自動アップロードエラー:', error);
        // エラー状態に設定
        setImages(prev => prev.map(img =>
          img.image_type === imageTypeToUpload
            ? { ...img, file: fileWithName, uploading: false, error: 'アップロードに失敗しました。再度お試しください。' }
            : img
        ));
      }
    }
  };

  // Image Cropperキャンセル時の処理
  const handleCropCancel = () => {
    setShowImageCropper(false);
    setCurrentImageType('');
    setSelectedImageFile(null);
  };

  const handleImageUpload = async (imageType: string) => {
    const imageToUpload = images.find(img => img.image_type === imageType);
    if (!imageToUpload || !imageToUpload.file) {
      console.error('Image to upload not found or file is missing');
      return;
    }

    try {
      // Mark as uploading
      setImages(prev => prev.map(img =>
        img.image_type === imageType
          ? { ...img, uploading: true, error: undefined }
          : img
      ));

      // Upload to storage
      const fileName = imageToUpload.file.name || 'image.jpg';
      const fileExt = fileName.includes('.') ? fileName.split('.').pop() : 'jpg';
      const uploadFileName = `${parkId}/${imageType}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('dog-park-images')
        .upload(uploadFileName, imageToUpload.file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('dog-park-images')
        .getPublicUrl(uploadFileName);

      // Save to database
      if (imageToUpload.id) {
        // Update existing image - 承認状態は変更しない
        const updateData: any = {
          image_url: publicUrl,
          updated_at: new Date().toISOString()
        };
        
        // 既存の承認状態を確認
        const { data: existingImage } = await supabase
          .from('dog_park_facility_images')
          .select('is_approved')
          .eq('id', imageToUpload.id)
          .single();
        
        // 承認済みでない場合のみnullにリセット
        if (existingImage && existingImage.is_approved !== true) {
          updateData.is_approved = null;
        }
        
        const { error: updateError } = await supabase
          .from('dog_park_facility_images')
          .update(updateData)
          .eq('id', imageToUpload.id);

        if (updateError) throw updateError;
      } else {
        // Insert new image
        const { error: insertError } = await supabase
          .from('dog_park_facility_images')
          .insert({
            park_id: parkId,
            image_type: imageType,
            image_url: publicUrl
          });

        if (insertError) throw insertError;
      }

      // Refresh images
      await fetchParkData();

      const typeConfig = IMAGE_TYPES[imageType as keyof typeof IMAGE_TYPES];
      const label = typeConfig?.label || imageType;
      setSuccess(`${label}の画像をアップロードしました`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error(`Error uploading ${imageType} image:`, error);

      // Mark upload as failed
      setImages(prev => prev.map(img =>
        img.image_type === imageType
          ? { ...img, uploading: false, error: 'アップロードに失敗しました' }
          : img
      ));
    }
  };

  const handleDeleteImage = async (imageId?: string) => {
    if (!imageId) return;

    try {
      const { error } = await supabase
        .from('dog_park_facility_images')
        .delete()
        .eq('id', imageId);

      if (error) throw error;

      // Refresh images
      await fetchParkData();

      setSuccess('画像を削除しました');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error deleting image:', error);
      setError('画像の削除に失敗しました');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleSaveBankAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingBank(true);
    setBankError('');
    setBankSuccess('');

    try {
      // Validate bank account information
      if (!bankAccount.bank_name) throw new Error('銀行名を入力してください');
      if (!bankAccount.bank_code) throw new Error('銀行コードを入力してください');
      if (!bankAccount.branch_name) throw new Error('支店名を入力してください');
      if (!bankAccount.branch_code) throw new Error('支店コードを入力してください');
      if (!bankAccount.account_number) throw new Error('口座番号を入力してください');
      if (!bankAccount.account_holder_name) throw new Error('口座名義を入力してください');

      // Validate bank code (4 digits)
      if (!/^\d{4}$/.test(bankAccount.bank_code)) {
        throw new Error('銀行コードは4桁の数字で入力してください');
      }

      // Validate branch code (3 digits)
      if (!/^\d{3}$/.test(bankAccount.branch_code)) {
        throw new Error('支店コードは3桁の数字で入力してください');
      }

      // Validate account number (7 digits)
      if (!/^\d{7}$/.test(bankAccount.account_number)) {
        throw new Error('口座番号は7桁の数字で入力してください');
      }

      // Save bank account information
      const { error } = await supabase.rpc('update_owner_bank_account', {
        bank_name_param: bankAccount.bank_name,
        bank_code_param: bankAccount.bank_code,
        branch_name_param: bankAccount.branch_name,
        branch_code_param: bankAccount.branch_code,
        account_type_param: bankAccount.account_type,
        account_number_param: bankAccount.account_number,
        account_holder_name_param: bankAccount.account_holder_name
      });

      if (error) throw error;

      setBankSuccess('振込先情報を保存しました');

      // 3秒後に成功メッセージを消す
      setTimeout(() => {
        setBankSuccess('');
      }, 3000);
    } catch (error: unknown) {
      console.error('Error saving bank account:', error);
      setBankError((error as Error).message || '振込先情報の保存に失敗しました');
    } finally {
      setIsSavingBank(false);
    }
  };

  const handleSubmitReview = async () => {
    try {
      setIsSubmitting(true);
      setError('');

      // 承認済みドッグランの場合は画像更新処理
      if (park?.status === 'approved') {
        // 承認済みドッグランの画像更新処理
        setSuccess('画像とコメントの更新が完了しました。');
        setTimeout(() => {
          setSuccess('');
        }, 3000);
        return;
      }

      // 以下は審査中ドッグランの処理
      // Check if smart lock is purchased
      if (!smartLockPurchased) {
        setSmartLockError('スマートロックの購入・設置完了をご確認ください');
        setIsSubmitting(false);
        return;
      }

      // Check if all required images are uploaded
      const requiredTypes = Object.entries(IMAGE_TYPES)
        .filter(([, config]) => {
          if (config.required) return true;
          if (config.conditionalOn && park) {
            const path = config.conditionalOn.split('.');
            if (path.length === 1) {
              return ((park as any)[path[0]]) ?? false;
            } else if (path.length === 2) {
              const parent = (park as any)[path[0]];
              if (parent && typeof parent === 'object') {
                return (parent as any)[path[1]] ?? false;
              }
            }
          }
          return false;
        })
        .map(([key]) => key);

      const missingTypes = requiredTypes.filter(type =>
        !images.some(img => img.image_type === type && img.image_url)
      );

      if (missingTypes.length > 0) {
        const missingLabels = missingTypes.map(type => {
          const typeConfig = IMAGE_TYPES[type as keyof typeof IMAGE_TYPES];
          return typeConfig?.label || type;
        }).join('、');

        setError(`以下の必要な画像がアップロードされていません: ${missingLabels}`);
        setIsSubmitting(false);
        return;
      }

      // Check if bank account information is set
      if (!bankAccount.bank_name || !bankAccount.bank_code || !bankAccount.branch_name ||
        !bankAccount.branch_code || !bankAccount.account_number || !bankAccount.account_holder_name) {
        setError('振込先情報を入力してください');
        setActiveTab('bank');
        setIsSubmitting(false);
        return;
      }

      // Record the second stage review submission in the review stages table
      try {
        // First, check if a review stage record already exists
        const { data: existingStage, error: checkError } = await supabase
          .from('dog_park_review_stages')
          .select('id')
          .eq('park_id', parkId)
          .single();

        if (checkError && checkError.code !== 'PGRST116') {
          // PGRST116 is "not found" error, which is expected if no record exists
          console.error('Error checking existing review stage:', checkError);
        }

        if (existingStage) {
          // Update existing record
          const { error: updateError } = await supabase
            .from('dog_park_review_stages')
            .update({
              second_stage_submitted_at: new Date().toISOString()
            })
            .eq('park_id', parkId);

          if (updateError) {
            console.error('Error updating review stage:', updateError);
          }
        } else {
          // Insert new record
          const { error: insertError } = await supabase
            .from('dog_park_review_stages')
            .insert({
              park_id: parkId,
              second_stage_submitted_at: new Date().toISOString()
            });

          if (insertError) {
            console.error('Error inserting review stage:', insertError);
          }
        }
      } catch (reviewError) {
        console.error('Error recording review stage:', reviewError);
        // Don't throw error, continue with submission
      }

      // Update park status to second_stage_review
      try {
        const { error: statusError } = await supabase
          .from('dog_parks')
          .update({ status: 'second_stage_review' })
          .eq('id', parkId);

        if (statusError) {
          console.error('Error updating park status:', statusError);
        }
      } catch (statusError) {
        console.error('Error updating park status:', statusError);
        // Don't throw error, continue with submission
      }

      // Save bank account information if not already saved
      try {
        const { error: bankError } = await supabase.rpc('update_owner_bank_account', {
          bank_name_param: bankAccount.bank_name,
          bank_code_param: bankAccount.bank_code,
          branch_name_param: bankAccount.branch_name,
          branch_code_param: bankAccount.branch_code,
          account_type_param: bankAccount.account_type,
          account_number_param: bankAccount.account_number,
          account_holder_name_param: bankAccount.account_holder_name
        });

        if (bankError) {
          console.error('Error saving bank account:', bankError);
          // Continue even if bank account save fails
        }
      } catch (bankError) {
        console.error('Error with bank account RPC:', bankError);
        // Continue even if bank account save fails
      }

      // Create notification for admin
      try {
        const { error: notifyError } = await supabase
          .from('admin_notifications')
          .insert([{
            type: 'park_approval',
            title: '新しいドッグラン第二審査申請',
            message: `${park?.name}の第二審査が申請されました。確認してください。`,
            data: { park_id: parkId },
            created_at: new Date().toISOString()
          }]);

        if (notifyError) {
          console.error('Error creating admin notification:', notifyError);
          // Continue even if notification fails
        }
      } catch (notifyError) {
        console.error('Error with notification:', notifyError);
        // Continue even if notification fails
      }

      setSuccess('第二審査の申請が完了しました。審査結果をお待ちください。');

      // Refresh data
      await fetchParkData();

      // Redirect to dashboard after 3 seconds
      setTimeout(() => {
        navigate('/dashboard');
      }, 3000);
    } catch (error: unknown) {
      console.error('Error submitting review:', error);
      setError('審査申請に失敗しました: ' + (error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getApprovalStatus = (isApproved: boolean | null) => {
    if (isApproved === true) {
      return { icon: CheckCircle, color: 'text-green-600', label: '承認済み' };
    } else if (isApproved === false) {
      return { icon: X, color: 'text-red-600', label: '却下' };
    } else {
      return { icon: Clock, color: 'text-yellow-600', label: '審査中' };
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  // 画像レビューモーダル
  if (showImagePreview) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
        <div className="relative max-w-4xl w-full">
          <button
            onClick={() => setShowImagePreview(null)}
            className="absolute top-2 right-2 p-2 bg-white bg-opacity-90 shadow-lg rounded-full text-gray-800 hover:bg-opacity-100 transition-all"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={showImagePreview}
            alt="画像プレビュー"
            className="max-h-[80vh] max-w-full mx-auto rounded-lg"
            onError={(e) => {
              e.currentTarget.src = 'https://via.placeholder.com/800x600?text=Image+Not+Available';
            }}
          />
        </div>
      </div>
    );
  }

  if (!park) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">ドッグランが見つかりません</h2>
        <p className="text-gray-600 mb-6">指定されたドッグランが見つからないか、アクセス権限がありません。</p>
        <Link to="/owner-dashboard">
          <Button>ダッシュボードに戻る</Button>
        </Link>
      </div>
    );
  }

  // Check if park is in the correct stage
  if (park.status !== 'first_stage_passed' && 
      park.status !== 'second_stage_waiting' && 
      park.status !== 'second_stage_review' && 
      park.status !== 'approved') {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link to="/owner-dashboard" className="flex items-center text-blue-600 hover:text-blue-800">
            <ArrowLeft className="w-4 h-4 mr-2" />
            ダッシュボードに戻る
          </Link>
        </div>

        <Card className="text-center py-8">
          <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">このドッグランは現在編集できません</h2>
          <p className="text-gray-600 mb-4">
            {park.status === 'pending' && '第一審査が完了するまでお待ちください。'}
            {park.status === 'smart_lock_testing' && 'スマートロック実証検査中です。管理者からの連絡をお待ちください。'}
            {park.status === 'rejected' && '審査が却下されました。詳細はダッシュボードでご確認ください。'}
          </p>
          <Link to="/owner-dashboard">
            <Button>ダッシュボードに戻る</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center space-x-4 mb-6">
        <Link to="/owner-dashboard" className="flex items-center text-blue-600 hover:text-blue-800">
          <ArrowLeft className="w-4 h-4 mr-2" />
          ダッシュボードに戻る
        </Link>
      </div>

      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4 flex items-center justify-center">
          <Building className="w-8 h-8 text-blue-600 mr-3" />
          {park.status === 'approved' ? `${park.name}の施設情報編集` : `${park.name}の第二審査`}
        </h1>
        <p className="text-lg text-gray-600">
          {park.status === 'approved' 
            ? '承認済みの施設でも画像の差し替えやコメントの編集が可能です' 
            : '施設の詳細画像と振込先情報を登録して審査を完了させましょう'
          }
        </p>
      </div>

      {/* 審査ステータス */}
      {park.status !== 'approved' && (
        <Card className="bg-blue-50 border-blue-200">
          <div className="flex items-start space-x-3">
            <FileText className="w-6 h-6 text-blue-600 mt-1" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">審査ステータス</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-blue-800">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</div>
                  <div>
                    <span className="font-medium">第一審査</span>
                    <p className="text-xs text-green-600">完了</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`w-6 h-6 ${park.status === 'second_stage_review' ? 'bg-green-600' : 'bg-blue-600'} text-white rounded-full flex items-center justify-center text-xs font-bold`}>2</div>
                  <div>
                    <span className="font-medium">第二審査</span>
                    <p className="text-xs text-blue-600">
                      {park.status === 'first_stage_passed' && '画像アップロード中'}
                      {park.status === 'second_stage_waiting' && '申請準備中'}
                      {park.status === 'second_stage_review' && '審査中'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-gray-400 text-white rounded-full flex items-center justify-center text-xs font-bold">3</div>
                  <div>
                    <span className="font-medium">QR実証検査</span>
                    <p className="text-xs text-gray-600">未実施</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-gray-400 text-white rounded-full flex items-center justify-center text-xs font-bold">4</div>
                  <div>
                    <span className="font-medium">運営開始</span>
                    <p className="text-xs text-gray-600">未完了</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* エラー・成功メッセージ */}
      {error && (
        <div className="bg-red-100 border border-red-300 text-red-800 rounded-lg p-4 flex items-start">
          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-300 text-green-800 rounded-lg p-4 flex items-start">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
          <p>{success}</p>
        </div>
      )}

      {/* スマートロック購入確認 */}
      {park.status !== 'approved' && (
        <Card className="bg-orange-50 border-orange-200">
          <div className="flex items-start space-x-3">
            <Shield className="w-6 h-6 text-orange-600 mt-1" />
            <div className="flex-1">
              <h3 className="font-semibold text-orange-900 mb-2">
                スマートロック購入確認 <span className="text-red-600">*必須</span>
              </h3>
              <p className="text-sm text-orange-800 mb-4">
                第二審査に進む前に、スマートロックの購入と設置が完了していることを確認してください。
              </p>

              <div className="space-y-3">
                <div className={`p-3 rounded-lg border-2 ${
                  !smartLockPurchased 
                    ? 'border-red-300 bg-red-50' 
                    : 'border-green-300 bg-green-50'
                }`}>
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="smartLockPurchased"
                      checked={smartLockPurchased}
                      onChange={(e) => {
                        setSmartLockPurchased(e.target.checked);
                        setSmartLockError('');
                      }}
                      className="w-5 h-5 text-orange-600 rounded border-gray-300 focus:ring-orange-500"
                    />
                    <label htmlFor="smartLockPurchased" className="text-sm font-medium text-orange-900">
                      スマートロックを購入し、設置を完了しました
                    </label>
                  </div>
                  
                  {!smartLockPurchased && (
                    <div className="mt-2 text-sm text-red-700 font-medium">
                      ⚠️ この項目をチェックしないと申請できません
                    </div>
                  )}
                  
                  {smartLockPurchased && (
                    <div className="mt-2 text-sm text-green-700 font-medium">
                      ✅ 確認完了
                    </div>
                  )}
                </div>

                {smartLockError && (
                  <div className="text-sm text-red-600 bg-red-100 border border-red-300 p-3 rounded-lg">
                    <strong>⚠️ 申請エラー:</strong> {smartLockError}
                  </div>
                )}

                <div className="text-xs text-orange-700 space-y-1 bg-orange-100 p-3 rounded">
                  <p><strong>スマートロック購入・設置について:</strong></p>
                  <p>• スマートロックは<Link to="/petshop" className="text-blue-600 hover:text-blue-800 underline font-medium">ペットショップ</Link>で購入できます</p>
                  <p>• 設置完了後、動作確認を行ってください</p>
                  <p>• 第二審査では実際の設置状況を確認します</p>
                  <p>• 設置に関するサポートが必要な場合はお問い合わせください</p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* タブナビゲーション */}
      <div className="flex space-x-4 border-b">
        <button
          className={`px-4 py-2 font-medium ${activeTab === 'images'
            ? 'text-blue-600 border-b-2 border-blue-600'
            : 'text-gray-500 hover:text-gray-700'
            }`}
          onClick={() => setActiveTab('images')}
        >
          <Camera className="w-4 h-4 inline mr-2" />
          施設画像
        </button>
        <button
          className={`px-4 py-2 font-medium ${activeTab === 'bank'
            ? 'text-blue-600 border-b-2 border-blue-600'
            : 'text-gray-500 hover:text-gray-700'
            }`}
          onClick={() => setActiveTab('bank')}
        >
          <BankAccountIcon className="w-4 h-4 inline mr-2" />
          振込先情報
        </button>
      </div>

      {/* 施設画像アップロード */}
      {activeTab === 'images' && (
        <Card>
          <h2 className="text-xl font-semibold mb-6 flex items-center">
            <Camera className="w-6 h-6 text-blue-600 mr-2" />
            施設画像のアップロード
          </h2>

          <div className="space-y-6">
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium mb-1">画像アップロードのガイドライン</p>
                  <ul className="space-y-1">
                    <li>• 鮮明で明るい画像を選んでください</li>
                    <li>• 施設の特徴がよくわかる角度から撮影してください</li>
                    <li>• 画像サイズは10MB以下にしてください</li>
                    <li>• JPG、PNG、GIF形式のみ対応しています</li>
                    <li>• 必須項目（*）は必ずアップロードしてください</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {images.map((image) => {
                const imageTypeConfig = IMAGE_TYPES[image.image_type as keyof typeof IMAGE_TYPES];
                const IconComponent = imageTypeConfig?.icon || Building;
                const isRequired = imageTypeConfig?.required || false;

                let approvalStatus = null;
                if ((image.is_approved ?? null) !== null && image.image_url) {
                  const status = getApprovalStatus(image.is_approved ?? null);
                  const StatusIcon = status.icon;
                  approvalStatus = (
                    <div className={`flex items-center space-x-1 ${status.color}`}>
                      <StatusIcon className="w-4 h-4" />
                      <span className="text-xs">{status.label}</span>
                    </div>
                  );
                }

                return (
                  <div key={image.image_type} className="border rounded-lg p-4 relative">
                    {/* Image type header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <IconComponent className="w-5 h-5 text-blue-600" />
                        <h3 className="font-medium">
                          {imageTypeConfig?.label || image.image_type}
                          {isRequired && <span className="text-red-600 ml-1">*</span>}
                        </h3>
                      </div>
                      {approvalStatus}
                    </div>

                    {/* Description */}
                    <p className="text-sm text-gray-600 mb-3">{imageTypeConfig?.description || '画像をアップロードしてください'}</p>

                    {/* Image preview or upload button */}
                    {image.image_url ? (
                      <div className="relative">
                        <div
                          className="aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer"
                          onClick={() => setShowImagePreview(image.image_url || null)}
                        >
                          <img
                            src={image.image_url}
                            alt={imageTypeConfig?.label || image.image_type}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = 'https://via.placeholder.com/400x400?text=Image+Not+Available';
                            }}
                          />
                        </div>
                        <div className="absolute top-2 right-2 flex space-x-2">
                          <button
                            onClick={() => setShowImagePreview(image.image_url || null)}
                            className="p-1 bg-white rounded-full shadow hover:bg-gray-100"
                          >
                            <ImageIcon className="w-4 h-4 text-blue-600" />
                          </button>
                          <button
                            onClick={() => handleDeleteImage(image.id)}
                            className="p-1 bg-white rounded-full shadow hover:bg-gray-100"
                            disabled={(image.is_approved ?? null) === true}
                          >
                            <Trash2 className={`w-4 h-4 ${(image.is_approved ?? null) === true ? 'text-gray-400' : 'text-red-600'}`} />
                          </button>
                        </div>

                        {/* Admin notes if rejected */}
                        {image.is_approved === false && image.admin_notes && (
                          <div className="mt-2 p-2 bg-red-50 rounded text-sm text-red-800">
                            <p className="font-medium">却下理由:</p>
                            <p>{image.admin_notes}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-500 transition-colors">
                          <input
                            type="file"
                            id={`image-${image.image_type}`}
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleImageSelect(image.image_type, file);
                              }
                            }}
                          />
                          <label
                            htmlFor={`image-${image.image_type}`}
                            className="cursor-pointer flex flex-col items-center"
                          >
                            <Upload className="w-8 h-8 text-gray-400 mb-2" />
                            <span className="text-sm text-gray-600">
                              クリックして画像を選択・自動アップロード
                            </span>
                          </label>
                        </div>

                        {image.file && (
                          <div className="bg-gray-50 p-2 rounded">
                            <div className="flex items-center justify-between">
                              <span className="text-sm truncate">{image.file.name}</span>
                              {image.uploading && (
                                <div className="flex items-center text-blue-600">
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                                  <span className="text-sm">アップロード中...</span>
                                </div>
                              )}
                            </div>
                            {!image.uploading && !image.error && image.file && (
                              <div className="text-sm text-green-600 mt-1">
                                ✓ 選択完了（自動アップロード中）
                              </div>
                            )}
                          </div>
                        )}

                        {image.error && (
                          <p className="text-sm text-red-600">{image.error}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      {/* 振込先情報 */}
      {activeTab === 'bank' && (
        <Card>
          <h2 className="text-xl font-semibold mb-6 flex items-center">
            <BankAccountIcon className="w-6 h-6 text-blue-600 mr-2" />
            振込先情報
          </h2>

          {bankError && (
            <div className="mb-6 p-4 bg-red-50 rounded-lg flex items-start">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
              <p className="text-red-800">{bankError}</p>
            </div>
          )}

          {bankSuccess && (
            <div className="mb-6 p-4 bg-green-50 rounded-lg flex items-start">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
              <p className="text-green-800">{bankSuccess}</p>
            </div>
          )}

          <form onSubmit={handleSaveBankAccount}>
            <div className="space-y-6">
              <div className="bg-yellow-50 p-4 rounded-lg mb-6">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium mb-1">振込先情報について</p>
                    <ul className="space-y-1">
                      <li>• 売上金の振込先となる銀行口座情報を入力してください</li>
                      <li>• 振込は毎月15日に前月分を一括で行います</li>
                      <li>• 振込手数料は当社負担です</li>
                      <li>• 振込金額が5,000円未満の場合は翌月に繰り越されます</li>
                      <li>• 口座名義は正確に入力してください（例：ヤマダ タロウ）</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="銀行名 *"
                  value={bankAccount.bank_name}
                  onChange={(e) => setBankAccount({ ...bankAccount, bank_name: e.target.value })}
                  placeholder="例：三菱UFJ銀行"
                  required
                  icon={<BankAccountIcon className="w-4 h-4 text-gray-500" />}
                />

                <Input
                  label="銀行コード（4桁） *"
                  value={bankAccount.bank_code}
                  onChange={(e) => {
                    // 数字のみ許可
                    const value = e.target.value.replace(/\D/g, '');
                    setBankAccount({ ...bankAccount, bank_code: value });
                  }}
                  placeholder="例：0005"
                  maxLength={4}
                  required
                  helperText="4桁の数字で入力してください"
                />

                <Input
                  label="支店名 *"
                  value={bankAccount.branch_name}
                  onChange={(e) => setBankAccount({ ...bankAccount, branch_name: e.target.value })}
                  placeholder="例：渋谷支店"
                  required
                />

                <Input
                  label="支店コード（3桁） *"
                  value={bankAccount.branch_code}
                  onChange={(e) => {
                    // 数字のみ許可
                    const value = e.target.value.replace(/\D/g, '');
                    setBankAccount({ ...bankAccount, branch_code: value });
                  }}
                  placeholder="例：135"
                  maxLength={3}
                  required
                  helperText="3桁の数字で入力してください"
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    口座種別 *
                  </label>
                  <div className="flex space-x-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        checked={bankAccount.account_type === 'ordinary'}
                        onChange={() => setBankAccount({ ...bankAccount, account_type: 'ordinary' })}
                        className="form-radio text-blue-600"
                      />
                      <span>普通</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        checked={bankAccount.account_type === 'checking'}
                        onChange={() => setBankAccount({ ...bankAccount, account_type: 'checking' })}
                        className="form-radio text-blue-600"
                      />
                      <span>当座</span>
                    </label>
                  </div>
                </div>

                <Input
                  label="口座番号（7桁） *"
                  value={bankAccount.account_number}
                  onChange={(e) => {
                    // 数字のみ許可
                    const value = e.target.value.replace(/\D/g, '');
                    setBankAccount({ ...bankAccount, account_number: value });
                  }}
                  placeholder="例：1234567"
                  maxLength={7}
                  required
                  helperText="7桁の数字で入力してください"
                  icon={<CreditCard className="w-4 h-4 text-gray-500" />}
                />

                <div className="md:col-span-2">
                  <Input
                    label="口座名義（カタカナ） *"
                    value={bankAccount.account_holder_name}
                    onChange={(e) => setBankAccount({ ...bankAccount, account_holder_name: e.target.value })}
                    placeholder="例：ヤマダ タロウ"
                    required
                    helperText="カタカナで入力してください（姓と名の間にスペース）"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  isLoading={isSavingBank}
                >
                  振込先情報を保存
                </Button>
              </div>
            </div>
          </form>
        </Card>
      )}

      {/* Submit button */}
      <div className="mt-8 space-y-4">
        {/* スマートロック購入確認が未完了の場合の警告 */}
        {park?.status !== 'approved' && !smartLockPurchased && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <span className="text-sm font-medium text-red-800">
                申請するには「スマートロック購入確認」のチェックが必要です
              </span>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <Button
            onClick={handleSubmitReview}
            isLoading={isSubmitting}
            disabled={
              park?.status === 'second_stage_review' || 
              (park?.status !== 'approved' && !smartLockPurchased)
            }
            className={`${
              park?.status !== 'approved' && !smartLockPurchased
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isSubmitting 
              ? '申請中...'
              : park?.status === 'second_stage_review'
              ? '審査中です'
              : park?.status === 'approved'
              ? '編集する'
              : !smartLockPurchased
              ? 'スマートロック確認が必要です'
              : '第二審査を申請する'}
          </Button>
        </div>

        {/* 申請可能状態の表示 */}
        {park?.status !== 'approved' && park?.status !== 'second_stage_review' && (
          <div className="text-center">
            <div className={`inline-flex items-center space-x-2 px-3 py-2 rounded-lg text-sm ${
              smartLockPurchased 
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
            }`}>
              {smartLockPurchased ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>申請準備完了</span>
                </>
              ) : (
                <>
                  <Clock className="w-4 h-4" />
                  <span>スマートロック購入確認が必要です</span>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 審査プロセスの説明 */}
      <Card className="bg-gray-50">
        <div className="flex items-start space-x-3">
          <FileText className="w-6 h-6 text-gray-600 mt-1" />
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">審査プロセスについて</h3>
            <div className="text-sm text-gray-700 space-y-1">
              <p>• 第二審査では、施設の詳細画像と振込先情報を確認します</p>
              <p>• 審査期間は通常3-5営業日です</p>
              <p>• 画像に問題がある場合は再提出を求められることがあります</p>
              <p>• 審査通過後、QRコード実証検査の日程調整を行います</p>
              <p>• 実証検査完了後、一般公開となります</p>
            </div>
          </div>
        </div>
      </Card>
      
      {/* Image Cropper Modal */}
      {showImageCropper && selectedImageFile && (
        <ImageCropper
          imageFile={selectedImageFile}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
          aspectRatio={1} // 1:1比率でクロップ
          maxWidth={400}
          maxHeight={400}
        />
      )}
    </div>
  );
}

// BankAccountIcon component for bank account information
function BankAccountIcon({ className }: { className?: string }) {
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
      <path d="M3 21h18"></path>
      <path d="M3 10h18"></path>
      <path d="M5 6l7-3 7 3"></path>
      <path d="M4 10v11"></path>
      <path d="M20 10v11"></path>
      <path d="M8 14v3"></path>
      <path d="M12 14v3"></path>
      <path d="M16 14v3"></path>
    </svg>
  );
}
