import {
    AlertTriangle,
    ArrowLeft,
    Building,
    Calendar,
    Camera,
    CheckCircle,
    DollarSign,
    Edit,
    Eye,
    FileText,
    Image as ImageIcon,
    Key,
    MapPin,
    ParkingCircle,
    Plus,
    Settings,
    Shield,
    ShowerHead,
    Star,
    Trash2,
    Upload,
    Users,
    Wrench,
    X
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import ImageCropper from '../components/ImageCropper'; // ImageCropperコンポーネントを追加
import { LocationEditMap } from '../components/LocationEditMap';
import { ParkManagementWalkthrough } from '../components/ParkManagementWalkthrough';
import { PinCodeGenerator } from '../components/PinCodeGenerator';
import { SmartLockManager } from '../components/admin/SmartLockManager';
import useAuth from '../context/AuthContext';
import type { DogPark, SmartLock } from '../types';
import { supabase } from '../utils/supabase';
import { uploadAndConvertToWebP } from '../utils/webpConverter';

// 施設画像タイプ定義
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

interface MaintenanceSchedule {
  id: string;
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  is_emergency: boolean;
  notify_users: boolean;
  created_at: string;
}

// タイムゾーン変換ユーティリティ関数
const convertLocalDateTimeToUTC = (localDateTime: string): string | null => {
  if (!localDateTime) return null;
  
  // datetime-localの値をローカルタイムゾーンのDateオブジェクトとして作成
  const localDate = new Date(localDateTime);
  
  // UTCのISO文字列として返す
  return localDate.toISOString();
};

const convertUTCToLocalDateTime = (utcDateTime: string): string => {
  if (!utcDateTime) return '';
  
  // UTCの日時をローカルタイムゾーンに変換
  const utcDate = new Date(utcDateTime);
  
  // datetime-local入力フィールド用の形式（YYYY-MM-DDTHH:mm）に変換
  const localDateTime = new Date(utcDate.getTime() - utcDate.getTimezoneOffset() * 60000);
  return localDateTime.toISOString().slice(0, 16);
};

export function ParkManagement() {
  const { id: parkId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [park, setPark] = useState<DogPark | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'stats' | 'pins' | 'locks' | 'settings' | 'location'>('overview');
  const [smartLocks, setSmartLocks] = useState<SmartLock[]>([]);
  const [selectedLock, setSelectedLock] = useState<SmartLock | null>(null);
  const [pinPurpose, setPinPurpose] = useState<'entry' | 'exit'>('entry');
  // メンテナンス関連のstate
  const [maintenanceSchedules, setMaintenanceSchedules] = useState<MaintenanceSchedule[]>([]);
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);
  const [editingMaintenance, setEditingMaintenance] = useState<MaintenanceSchedule | null>(null);
  const [maintenanceForm, setMaintenanceForm] = useState({
    title: '',
    description: '',
    start_date: '',
    end_date: '',
    is_emergency: false,
    notify_users: true
  });
  const [isMaintenanceLoading, setIsMaintenanceLoading] = useState(false);

  // 編集関連のstate
  const [showEditForm, setShowEditForm] = useState(false);
  const [isEditLoading, setIsEditLoading] = useState(false);
  const [isToggleLoading, setIsToggleLoading] = useState(false);
  
  // 削除関連のstate
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [editForm, setEditForm] = useState({
    max_capacity: 0,
    facilities: {
      parking: false,
      shower: false,
      restroom: false,
      agility: false,
      rest_area: false,
      water_station: false,
    },
    large_dog_area: false,
    small_dog_area: false,
    private_booths: false,
    private_booth_count: 0,
    facility_details: '',
    description: '',
    address: '',
    latitude: null as number | null,
    longitude: null as number | null,
    is_public: false, // 公開・非公開状態
  });

  // 施設画像管理用のstate
  const [facilityImages, setFacilityImages] = useState<FacilityImage[]>([]);
  const [showImageCropper, setShowImageCropper] = useState(false);
  const [currentImageType, setCurrentImageType] = useState<string>('');
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState<string | null>(null);
  const [imageTypeToUpload, setImageTypeToUpload] = useState<string>('');
  const [originalFileName, setOriginalFileName] = useState<string>('');
  const [imageToUpload, setImageToUpload] = useState<{ image_type: string; file: File } | null>(null);

  // ウォークスルー関連state
  const [showWalkthrough, setShowWalkthrough] = useState(false);
  // 統計タブ: 月次統計
  const [monthlyStats, setMonthlyStats] = useState({
    reservations: 0,
    revenue: 0,
    users: 0,
    breakdown: {
      daypass: { count: 0, amount: 0 },
      whole: { count: 0, amount: 0 },
      subscription: { count: 0, amount: 0 }
    }
  });
  // 日次統計（利用統計グラフ用）
  const [dailyStats, setDailyStats] = useState<Array<{ date: string; reservations: number; users: number }>>([]);

  // メンテナンス予定取得関数
  const fetchMaintenanceSchedules = async () => {
    if (!parkId) return;

    try {
      const { data, error } = await supabase
        .from('maintenance_schedules')
        .select('*')
        .eq('dog_park_id', parkId)
        .order('start_date', { ascending: true });

      if (error) throw error;

      setMaintenanceSchedules(data || []);
    } catch (error) {
      console.error('Error fetching maintenance schedules:', error);
    }
  };

  // テスト用: URLパラメータでウォークスルーを強制表示
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('test_walkthrough') === 'true') {
      console.log('🧪 テストモード: ウォークスルーを強制表示');
      setShowWalkthrough(true);
    }
  }, []);

  // ウォークスルー発動条件の判定
  const checkWalkthroughEligibility = useCallback(async () => {
    console.log('🔍 ウォークスルー判定開始:', { parkId, userId: user?.id, parkStatus: park?.status });
    
    if (!parkId || !user || !park) {
      console.log('❌ ウォークスルー判定: 必要なデータが不足', { parkId, user: !!user, park: !!park });
      return;
    }

    try {
      console.log('🔍 プロフィール情報をチェック中...');
      
      // park_management_walkthrough_completedフラグをチェック
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('park_management_walkthrough_completed')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.log('⚠️ プロフィール取得エラー（カラムが存在しない可能性）:', profileError);
        // カラムが存在しない場合は、ウォークスルー未完了として扱う
        if (profileError.message.includes('column') && profileError.message.includes('does not exist')) {
          console.log('🎯 park_management_walkthrough_completedカラムが存在しないため、ウォークスルーを表示');
        } else {
          throw profileError;
        }
      } else {
        console.log('✅ プロフィール取得成功:', profile);
        
        // 既にウォークスルーを完了している場合は表示しない
        if (profile?.park_management_walkthrough_completed) {
          console.log('🎯 ウォークスルー既に完了済み');
          return;
        }
      }

      // ドッグランが承認済みかチェック
      console.log('🔍 ドッグランステータスをチェック中...', park.status);
      if (park.status === 'approved') {
        console.log('🎯 ウォークスルー発動条件を満たしています');
        setShowWalkthrough(true);
      } else {
        console.log('❌ ドッグランが承認済みではありません:', park.status);
      }
    } catch (error) {
      console.error('ウォークスルー判定エラー:', error);
    }
  }, [parkId, user, park]);

  // 月次統計を取得
  const fetchMonthlyStats = useCallback(async () => {
    if (!parkId) return;
    try {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const { data, error } = await supabase
        .from('reservations')
        .select('*')
        .eq('park_id', parkId)
        .gte('created_at', start.toISOString())
        .lt('created_at', end.toISOString());
      if (error) throw error;
      const list = data || [] as any[];
      const reservations = list.length;
      const revenue = list.reduce((s, r) => s + (r.total_amount || 0), 0);
      const users = list.reduce((s, r) => s + (r.guest_count || 0), 0);
      const daypass = list.filter(r => String(r.reservation_type||'').toLowerCase().includes('day')).reduce((acc, r) => ({ count: acc.count + (r.guest_count||1), amount: acc.amount + (r.total_amount||0) }), { count:0, amount:0 });
      const whole = list.filter(r => ['whole_facility','private','rental'].includes(String(r.reservation_type||'').toLowerCase())).reduce((acc, r) => ({ count: acc.count + 1, amount: acc.amount + (r.total_amount||0) }), { count:0, amount:0 });
      const subscription = list.filter(r => String(r.reservation_type||'').toLowerCase()==='subscription').reduce((acc, r) => ({ count: acc.count + 1, amount: acc.amount + (r.total_amount||0) }), { count:0, amount:0 });
      setMonthlyStats({ reservations, revenue, users, breakdown: { daypass, whole, subscription } });
    } catch (e) {
      console.warn('Failed to fetch monthly stats', e);
      setMonthlyStats({ reservations: 0, revenue: 0, users: 0, breakdown: { daypass:{count:0,amount:0}, whole:{count:0,amount:0}, subscription:{count:0,amount:0} } });
    }
  }, [parkId]);

  // 日次統計を取得（当月）
  const fetchDailyStats = useCallback(async () => {
    if (!parkId) return;
    try {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const { data, error } = await supabase
        .from('reservations')
        .select('created_at, guest_count')
        .eq('park_id', parkId)
        .gte('created_at', start.toISOString())
        .lt('created_at', end.toISOString());
      if (error) throw error;
      const totalDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const map: Record<string, { reservations: number; users: number }> = {};
      for (let d = 1; d <= totalDays; d++) {
        const key = new Date(now.getFullYear(), now.getMonth(), d).toISOString().slice(0, 10);
        map[key] = { reservations: 0, users: 0 };
      }
      (data || []).forEach((r: any) => {
        const key = new Date(r.created_at).toISOString().slice(0, 10);
        if (map[key]) {
          map[key].reservations += 1;
          map[key].users += Number(r.guest_count || 0);
        }
      });
      const arr = Object.entries(map).map(([date, v]) => ({ date, reservations: v.reservations, users: v.users }));
      setDailyStats(arr);
    } catch (e) {
      console.warn('Failed to fetch daily stats', e);
      setDailyStats([]);
    }
  }, [parkId]);

  // ウォークスルー完了時の処理
  const handleWalkthroughComplete = useCallback(async () => {
    if (!user) return;

    try {
      await supabase
        .from('profiles')
        .update({ park_management_walkthrough_completed: true })
        .eq('id', user.id);

      setShowWalkthrough(false);
      console.log('🎯 ウォークスルー完了をデータベースに保存');
    } catch (error) {
      console.error('ウォークスルー完了保存エラー:', error);
    }
  }, [user]);

  // ウォークスルーのステップ変更処理
  const handleWalkthroughStepChange = useCallback((stepId: string) => {
    if (stepId === 'location') {
      setActiveTab('location');
    } else if (stepId === 'pins') {
      setActiveTab('pins');
    }
  }, []);

  useEffect(() => {
    if (parkId && user) {
      void fetchParkData();
    }
  }, [parkId, user]);

  // パークデータが取得された後に画像データとメンテナンス予定を取得
  useEffect(() => {
    if (park) {
      void fetchFacilityImages();
      void fetchMaintenanceSchedules();
    }
  }, [park]);

  // ウォークスルーの発動を監視
  useEffect(() => {
    void checkWalkthroughEligibility();
  }, [parkId, user, park]);

  // 統計タブに入ったら読み込み
  useEffect(() => { if (activeTab === 'stats') { void fetchMonthlyStats(); void fetchDailyStats(); } }, [activeTab, fetchMonthlyStats, fetchDailyStats]);

  // パークデータ取得関数
  const fetchParkData = async () => {
    if (!parkId || !user) return;

    try {
      setIsLoading(true);
      setError('');
      
      const { data: parkData, error: parkError } = await supabase
        .from('dog_parks')
        .select('*')
        .eq('id', parkId)
        .eq('owner_id', user?.id)
        .single();
      
      if (parkError) {
        throw new Error('ドッグランが見つかりません');
      }
      
      setPark(parkData);
      
      // editFormに既存データを設定
      setEditForm({
        max_capacity: parkData.max_capacity || 0,
        facilities: {
          parking: parkData.facilities?.parking || false,
          shower: parkData.facilities?.shower || false,
          restroom: parkData.facilities?.restroom || false,
          agility: parkData.facilities?.agility || false,
          rest_area: parkData.facilities?.rest_area || false,
          water_station: parkData.facilities?.water_station || false,
        },
        large_dog_area: parkData.large_dog_area || false,
        small_dog_area: parkData.small_dog_area || false,
        private_booths: parkData.private_booths || false,
        private_booth_count: parkData.private_booth_count || 0,
        facility_details: parkData.facility_details || '',
        description: parkData.description || '',
        address: parkData.address || '',
        latitude: parkData.latitude || null,
        longitude: parkData.longitude || null,
        is_public: parkData.is_public || false,
      });
      
      // スマートロック情報も取得
      const { data: lockData, error: lockError } = await supabase
        .from('smart_locks')
        .select('*')
        .eq('park_id', parkId);
      
      if (!lockError && lockData) {
        setSmartLocks(lockData);
        if (lockData.length > 0) {
          setSelectedLock(lockData[0]);
        }
      }
      
    } catch (error) {
      console.error('Error fetching park data:', error);
      setError((error as Error).message || 'データの取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // 施設画像データの取得
  const fetchFacilityImages = async () => {
    if (!park) return;

    try {
      // 既存の施設画像を取得
      const { data: imageData, error: imageError } = await supabase
        .from('dog_park_facility_images')
        .select('*')
        .eq('park_id', park.id);

      if (imageError && imageError.code !== 'PGRST116') {
        console.error('Error fetching facility images:', imageError);
        return;
      }

      // パークの設備に基づいて必要な画像タイプを決定
      const requiredImageTypes = Object.entries(IMAGE_TYPES)
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

      const images: FacilityImage[] = requiredImageTypes.map(imageType => {
        const existingImage = (imageData || []).find(img => img.image_type === imageType);
        return {
          id: existingImage?.id,
          image_type: imageType,
          image_url: existingImage?.image_url,
          is_approved: existingImage?.is_approved ?? null,
          admin_notes: existingImage?.admin_notes
        };
      });

      setFacilityImages(images);
    } catch (error) {
      console.error('Error in fetchFacilityImages:', error);
    }
  };

  // PINコード成功時の処理
  const handlePinSuccess = (pin: string) => {
    setSuccess(`PINコード「${pin}」を発行しました。有効期限は5分間です。`);
    setTimeout(() => setSuccess(''), 5000);
  };

  // PINコードエラー時の処理
  const handlePinError = (errorMessage: string) => {
    setError(errorMessage);
    setTimeout(() => setError(''), 5000);
  };

  // 画像選択関数
  const handleImageSelect = (imageType: string, file: File) => {
    setImageTypeToUpload(imageType);
    setOriginalFileName(file.name);
    setImageToUpload({ image_type: imageType, file });
    setShowImageCropper(true);
  };

  // 画像クロップ完了関数
  const handleCropComplete = async (croppedFile: File) => {
    if (!parkId || !imageTypeToUpload) return;

    try {
      setImageLoading(true);
      setShowImageCropper(false);
      setError('');

      // ファイル名を元のファイル名に設定
      const fileWithName = new File([croppedFile], originalFileName, { type: croppedFile.type });

      // WebP変換付きアップロード
      const fileName = `${imageTypeToUpload}_${Date.now()}_${originalFileName}`;
      const filePath = `${parkId}/${fileName}`;

      const uploadResult = await uploadAndConvertToWebP(
        'dog-park-images',
        fileWithName,
        filePath,
        {
          quality: 80,
          generateThumbnail: true,
          thumbnailSize: 300,
          keepOriginal: false
        }
      );

      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'アップロードに失敗しました');
      }

      // WebP画像のURLを使用
      const publicUrl = uploadResult.webpUrl || '';

      // 既存の画像レコードをチェック
      const { data: existingImage, error: selectError } = await supabase
        .from('dog_park_facility_images')
        .select('id')
        .eq('park_id', parkId)
        .eq('image_type', imageTypeToUpload)
        .single();

      if (selectError && selectError.code !== 'PGRST116') {
        throw selectError;
      }

      let dbError;
      if (existingImage) {
        // 既存レコードを更新
        const { error } = await supabase
          .from('dog_park_facility_images')
          .update({
            image_url: publicUrl,
            is_approved: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingImage.id);
        dbError = error;
      } else {
        // 新しいレコードを挿入
        const { error } = await supabase
          .from('dog_park_facility_images')
          .insert({
            park_id: parkId,
            image_type: imageTypeToUpload,
            image_url: publicUrl,
            is_approved: null
          });
        dbError = error;
      }

      if (dbError) throw dbError;

      // 画像リストを更新
      await fetchFacilityImages();

      setSuccess('画像をアップロードしました');
      setTimeout(() => setSuccess(''), 3000);

      // 状態をリセット
      setImageTypeToUpload('');
      setOriginalFileName('');
      setImageToUpload(null);

    } catch (error) {
      console.error('Error uploading image:', error);
      setError('画像のアップロードに失敗しました');
      setTimeout(() => setError(''), 3000);
    } finally {
      setImageLoading(false);
    }
  };

  // 画像クロップキャンセル関数
  const handleCropCancel = () => {
    setShowImageCropper(false);
    setImageTypeToUpload('');
    setOriginalFileName('');
    setImageToUpload(null);
  };

  // 画像削除関数
  const handleImageDelete = async (imageId?: string, imageType?: string) => {
    if (!imageId) return;

    try {
      setImageLoading(true);
      setError('');

      const { error } = await supabase
        .from('dog_park_facility_images')
        .delete()
        .eq('id', imageId);

      if (error) throw error;

      // 画像リストを更新
      await fetchFacilityImages();

      setSuccess('画像を削除しました');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error deleting image:', error);
      setError('画像の削除に失敗しました');
      setTimeout(() => setError(''), 3000);
    } finally {
      setImageLoading(false);
    }
  };

  // メンテナンス予定追加関数
  const handleMaintenanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!parkId || !user) return;

    try {
      setIsMaintenanceLoading(true);
      setError('');

      // 日時のバリデーション
      const startDate = new Date(maintenanceForm.start_date);
      const endDate = new Date(maintenanceForm.end_date);
      
      if (endDate <= startDate) {
        setError('終了日時は開始日時より後に設定してください。');
        return;
      }

      // UTC時間に変換
      const startDateUTC = convertLocalDateTimeToUTC(maintenanceForm.start_date);
      const endDateUTC = convertLocalDateTimeToUTC(maintenanceForm.end_date);

      if (!startDateUTC || !endDateUTC) {
        setError('日時の形式が正しくありません。');
        return;
      }

      // データベースにメンテナンス予定を保存
      const { error: insertError } = await supabase
        .from('maintenance_schedules')
        .insert({
          dog_park_id: parkId,
          title: maintenanceForm.title,
          description: maintenanceForm.description || null,
          start_date: startDateUTC,
          end_date: endDateUTC,
          status: 'scheduled',
          is_emergency: maintenanceForm.is_emergency,
          notify_users: maintenanceForm.notify_users
        });

      if (insertError) throw insertError;

      // フォームをリセット
      setMaintenanceForm({
        title: '',
        description: '',
        start_date: '',
        end_date: '',
        is_emergency: false,
        notify_users: true
      });

      setShowMaintenanceForm(false);
      setSuccess('メンテナンス予定を追加しました。');
      setTimeout(() => setSuccess(''), 3000);

      // メンテナンス予定を再取得
      await fetchMaintenanceSchedules();

    } catch (error) {
      console.error('Error adding maintenance schedule:', error);
      setError('メンテナンス予定の追加に失敗しました。');
      setTimeout(() => setError(''), 5000);
    } finally {
      setIsMaintenanceLoading(false);
    }
  };

  // メンテナンス編集開始
  const handleMaintenanceEdit = (maintenance: MaintenanceSchedule) => {
    setEditingMaintenance(maintenance);
    setMaintenanceForm({
      title: maintenance.title,
      description: maintenance.description || '',
      start_date: convertUTCToLocalDateTime(maintenance.start_date),
      end_date: convertUTCToLocalDateTime(maintenance.end_date),
      is_emergency: maintenance.is_emergency,
      notify_users: maintenance.notify_users || true
    });
    setShowMaintenanceForm(true);
  };

  // メンテナンス更新
  const handleMaintenanceUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!parkId || !user || !editingMaintenance) return;

    try {
      setIsMaintenanceLoading(true);
      setError('');

      // 日時のバリデーション
      const startDate = new Date(maintenanceForm.start_date);
      const endDate = new Date(maintenanceForm.end_date);
      
      if (endDate <= startDate) {
        setError('終了日時は開始日時より後に設定してください。');
        return;
      }

      // UTC時間に変換
      const startDateUTC = convertLocalDateTimeToUTC(maintenanceForm.start_date);
      const endDateUTC = convertLocalDateTimeToUTC(maintenanceForm.end_date);

      if (!startDateUTC || !endDateUTC) {
        setError('日時の形式が正しくありません。');
        return;
      }

      // データベースのメンテナンス予定を更新
      const { error: updateError } = await supabase
        .from('maintenance_schedules')
        .update({
          title: maintenanceForm.title,
          description: maintenanceForm.description || null,
          start_date: startDateUTC,
          end_date: endDateUTC,
          is_emergency: maintenanceForm.is_emergency,
          notify_users: maintenanceForm.notify_users
        })
        .eq('id', editingMaintenance.id)
        .eq('dog_park_id', parkId);

      if (updateError) throw updateError;

      // フォームをリセット
      setMaintenanceForm({
        title: '',
        description: '',
        start_date: '',
        end_date: '',
        is_emergency: false,
        notify_users: true
      });

      setShowMaintenanceForm(false);
      setEditingMaintenance(null);
      setSuccess('メンテナンス予定を更新しました。');
      setTimeout(() => setSuccess(''), 3000);

      // メンテナンス予定を再取得
      await fetchMaintenanceSchedules();

    } catch (error) {
      console.error('Error updating maintenance schedule:', error);
      setError('メンテナンス予定の更新に失敗しました。');
      setTimeout(() => setError(''), 5000);
    } finally {
      setIsMaintenanceLoading(false);
    }
  };

  // メンテナンス削除
  const handleMaintenanceDelete = async (maintenanceId: string) => {
    if (!parkId || !user) return;

    if (!window.confirm('このメンテナンス予定を削除しますか？この操作は取り消せません。')) {
      return;
    }

    try {
      setIsMaintenanceLoading(true);
      setError('');

      const { error: deleteError } = await supabase
        .from('maintenance_schedules')
        .delete()
        .eq('id', maintenanceId)
        .eq('dog_park_id', parkId);

      if (deleteError) throw deleteError;

      setSuccess('メンテナンス予定を削除しました。');
      setTimeout(() => setSuccess(''), 3000);

      // メンテナンス予定を再取得
      await fetchMaintenanceSchedules();

    } catch (error) {
      console.error('Error deleting maintenance schedule:', error);
      setError('メンテナンス予定の削除に失敗しました。');
      setTimeout(() => setError(''), 5000);
    } finally {
      setIsMaintenanceLoading(false);
    }
  };

  // メンテナンスフォームキャンセル
  const handleMaintenanceCancel = () => {
    setShowMaintenanceForm(false);
    setEditingMaintenance(null);
    setMaintenanceForm({
      title: '',
      description: '',
      start_date: '',
      end_date: '',
      is_emergency: false,
      notify_users: true
    });
  };

  // 公開・非公開切り替え関数
  const handlePublicToggle = async (isPublic: boolean) => {
    if (!parkId || !user) return;

    try {
      setIsToggleLoading(true);
      setError('');

      const { error: updateError } = await supabase
        .from('dog_parks')
        .update({ 
          is_public: isPublic,
          updated_at: new Date().toISOString()
        })
        .eq('id', parkId)
        .eq('owner_id', user?.id);

      if (updateError) {
        throw updateError;
      }

      // editFormとparkデータを更新
      setEditForm(prev => ({ ...prev, is_public: isPublic }));
      setPark(prev => prev ? { ...prev, is_public: isPublic } : null);

      setSuccess(isPublic ? 'ドッグランを公開しました' : 'ドッグランを非公開にしました');
      setTimeout(() => setSuccess(''), 3000);

    } catch (error: any) {
      console.error('公開設定更新エラー:', error);
      setError('公開設定の更新に失敗しました: ' + error.message);
    } finally {
      setIsToggleLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Back Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link to="/my-parks-management" className="flex items-center text-blue-600 hover:text-blue-800">
          <ArrowLeft className="w-4 h-4 mr-2" />
            管理中ドッグラン一覧に戻る
        </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* Main Content */}
        {!isLoading && park && (
          <>
            {/* Park Header */}
            <div className="bg-white rounded-lg border p-6 mb-6">
              <div className="flex justify-between items-start mb-4">
          <div>
                  <h1 className="text-2xl font-bold text-gray-900">{park.name}</h1>
                  <p className="text-gray-600 mt-1">{park.address}</p>
                  <div className="flex items-center mt-2">
                    <Star className="w-4 h-4 text-yellow-400 fill-current mr-1" />
                    <span className="text-sm font-medium">{park.average_rating.toFixed(1)}</span>
                    <span className="text-sm text-gray-500 ml-1">({park.review_count}件)</span>
                </div>
          </div>

          <div className="flex space-x-3">
            <Link to={`/parks/${park.id}`}>
              <Button variant="secondary" className="min-w-[100px]">
                <Eye className="w-4 h-4 mr-2" />
                公開ページ
              </Button>
            </Link>
            <Button onClick={() => setShowEditForm(true)} className="min-w-[100px]">
              <Edit className="w-4 h-4 mr-2" />
              設定編集
            </Button>
          </div>
        </div>
      </div>

            {/* 既存のコンテンツ */}
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

      {/* タブナビゲーション */}
            <Card className="mb-6 p-4">
              <div className="space-y-2">
                {/* 1段目のタブ */}
                <div className="flex flex-wrap gap-2">
                  <button
                    className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === 'overview'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    onClick={() => setActiveTab('overview')}
                  >
                    <Building className="w-4 h-4 mr-1.5" />
                    <span className="whitespace-nowrap">概要</span>
                  </button>
                  <button
                    className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === 'stats'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    onClick={() => setActiveTab('stats')}
                  >
                    <Star className="w-4 h-4 mr-1.5" />
                    <span className="whitespace-nowrap">統計</span>
                  </button>
                  {/* PINタブはリモート解錠移行のため非表示 */}
                </div>
                
                {/* 2段目のタブ */}
                <div className="flex flex-wrap gap-2">
                  {/* ロックタブは管理者設定へ移行のため非表示 */}
                  <button
                    className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === 'settings'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    onClick={() => setActiveTab('settings')}
                  >
                    <Settings className="w-4 h-4 mr-1.5" />
                    <span className="whitespace-nowrap">設定</span>
                  </button>
                  <button
                    className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === 'location'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    onClick={() => setActiveTab('location')}
                    data-walkthrough="location-tab"
                  >
                    <MapPin className="w-4 h-4 mr-1.5" />
                    <span className="whitespace-nowrap">位置</span>
                  </button>
                </div>
              </div>
            </Card>

      {/* 概要タブ */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* 基本情報 */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-6 flex items-center">
              <FileText className="w-6 h-6 text-blue-600 mr-2" />
              基本情報
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-3">施設情報</h3>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">住所:</span> {park.address}</p>
                  <p><span className="font-medium">ステータス:</span> {park.status === 'approved' ? '運営中' : '審査中'}</p>
                        <p><span className="font-medium">料金:</span> ¥{park.price || '800'}/日</p>
                        <p><span className="font-medium">最大収容人数:</span> {(park as any).max_capacity || '未設定'}人</p>
                        <p><span className="font-medium">現在の利用者数:</span> {park.current_occupancy || 0}人</p>
                        <p><span className="font-medium">評価:</span> ★{park.average_rating?.toFixed(1) || '0.0'} ({park.review_count || 0}件)</p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">設備情報</h3>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries({
                    parking: '駐車場',
                    shower: 'シャワー設備',
                    restroom: 'トイレ',
                    agility: 'アジリティ設備',
                    rest_area: '休憩スペース',
                    water_station: '給水設備',
                  }).map(([key, label]) => (
                    <div key={key} className="flex items-center space-x-2">
                      <div className={`w-4 h-4 rounded ${
                              (park as any).facilities?.[key] 
                          ? 'bg-green-500' 
                          : 'bg-gray-300'
                      }`} />
                      <span className="text-sm">{label}</span>
                    </div>
                  ))}
                </div>
                
                <div className="mt-4 space-y-2">
                        <p><span className="font-medium">大型犬エリア:</span> {(park as any).large_dog_area ? 'あり' : 'なし'}</p>
                        <p><span className="font-medium">小型犬エリア:</span> {(park as any).small_dog_area ? 'あり' : 'なし'}</p>
                        <p><span className="font-medium">プライベートブース:</span> {(park as any).private_booths ? `${(park as any).private_booth_count || 1}室` : 'なし'}</p>
                </div>
              </div>
            </div>
          </Card>

          {/* 公開・非公開設定 */}
          {park?.status === 'approved' && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-6 flex items-center">
                <Eye className="w-6 h-6 text-blue-600 mr-2" />
                公開設定
              </h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">ドッグラン一覧に表示</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {editForm.is_public 
                        ? 'ドッグラン一覧やマップに表示されます。利用者が検索・予約できます。'
                        : 'ドッグラン一覧に表示されません。直接URLを知る人のみアクセス可能です。'
                      }
                    </p>
                  </div>
                  
                  <div className="ml-4">
                    <button
                      type="button"
                      disabled={isToggleLoading}
                      onClick={() => handlePublicToggle(!editForm.is_public)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        editForm.is_public ? 'bg-blue-600' : 'bg-gray-200'
                      } ${isToggleLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          editForm.is_public ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 text-sm">
                  <div className={`w-3 h-3 rounded-full ${editForm.is_public ? 'bg-green-500' : 'bg-yellow-500'}`} />
                  <span className="font-medium">
                    {editForm.is_public ? '公開中' : '非公開'}
                  </span>
                </div>
                
                {!editForm.is_public && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start">
                      <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 mr-2" />
                      <div className="text-sm text-yellow-800">
                        <strong>注意:</strong> 非公開設定中は、ドッグランが一覧に表示されず、新しい利用者からの予約を受け付けできません。
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* 今日の統計 */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-6 flex items-center">
              <Calendar className="w-6 h-6 text-blue-600 mr-2" />
              今日の統計
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <h4 className="font-medium text-blue-900">今日の予約</h4>
                </div>
                <p className="text-2xl font-bold text-blue-600">5件</p>
                <p className="text-xs text-blue-700 mt-1">前日比 +2件</p>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  <h4 className="font-medium text-green-900">今日の収益</h4>
                </div>
                <p className="text-2xl font-bold text-green-600">¥4,000</p>
                <p className="text-xs text-green-700 mt-1">前日比 +¥1,600</p>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Users className="w-5 h-5 text-purple-600" />
                  <h4 className="font-medium text-purple-900">利用者数</h4>
                </div>
                <p className="text-2xl font-bold text-purple-600">{park.current_occupancy}人</p>
                <p className="text-xs text-purple-700 mt-1">最大: {park.max_capacity}人</p>
              </div>
            </div>
          </Card>

                {/* メンテナンス管理 */}
          <Card className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold flex items-center">
                      <Wrench className="w-6 h-6 text-blue-600 mr-2" />
                      メンテナンス管理
              </h2>
                    <Button
                      onClick={() => setShowMaintenanceForm(true)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      メンテナンス予定を追加
                </Button>
            </div>
            
            {/* メンテナンス予定の表示 */}
            {maintenanceSchedules.length > 0 ? (
              <div className="space-y-4">
                {maintenanceSchedules.map((schedule) => (
                  <div key={schedule.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-gray-900">{schedule.title}</h3>
                      <div className="flex items-center space-x-2">
                        {schedule.is_emergency && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            緊急
                          </span>
                        )}
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          schedule.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                          schedule.status === 'active' ? 'bg-green-100 text-green-800' :
                          schedule.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {schedule.status === 'scheduled' ? '予定' :
                           schedule.status === 'active' ? '実行中' :
                           schedule.status === 'completed' ? '完了' : 'キャンセル'}
                        </span>
                      </div>
                    </div>
                    
                    {schedule.description && (
                      <p className="text-sm text-gray-600 mb-3">{schedule.description}</p>
                    )}
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">開始:</span>
                        <span className="ml-2 text-gray-600">
                          {convertUTCToLocalDateTime(schedule.start_date).replace('T', ' ')}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">終了:</span>
                        <span className="ml-2 text-gray-600">
                          {convertUTCToLocalDateTime(schedule.end_date).replace('T', ' ')}
                        </span>
                      </div>
                    </div>
                    
                    {schedule.notify_users && (
                      <div className="mt-2 flex items-center text-xs text-blue-600">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        ユーザー通知有効
                      </div>
                    )}
                    
                    {/* 編集・削除ボタン */}
                    <div className="mt-4 flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleMaintenanceEdit(schedule)}
                        className="text-blue-600 border-blue-600 hover:bg-blue-50"
                        disabled={isMaintenanceLoading}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        編集
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleMaintenanceDelete(schedule.id)}
                        className="text-red-600 border-red-600 hover:bg-red-50"
                        disabled={isMaintenanceLoading}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        削除
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Wrench className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">メンテナンス予定がありません</p>
                <p className="text-gray-400 text-sm">施設のメンテナンス予定を追加してください</p>
              </div>
            )}

                  <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                      <div className="text-sm text-yellow-800">
                        <p className="font-medium mb-1">メンテナンス機能について</p>
                        <ul className="space-y-1">
                          <li>• メンテナンス中は新規予約を受け付けません</li>
                          <li>• 既存の予約がある場合は事前に利用者に連絡してください</li>
                          <li>• 緊急メンテナンスの場合は即座に施設が利用停止になります</li>
                          <li>• ユーザー通知を有効にすると、利用者にメール通知が送信されます</li>
                        </ul>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* 統計・収益タブ */}
      {activeTab === 'stats' && (
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-6 flex items-center">
              <Star className="w-6 h-6 text-blue-600 mr-2" />
              利用統計
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <h4 className="font-medium text-blue-900">今月の予約</h4>
                </div>
                <p className="text-2xl font-bold text-blue-600">{monthlyStats.reservations}件</p>
                <p className="text-xs text-blue-700 mt-1">今月</p>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  <h4 className="font-medium text-green-900">今月の収益</h4>
                </div>
                <p className="text-2xl font-bold text-green-600">¥{monthlyStats.revenue.toLocaleString()}</p>
                <p className="text-xs text-green-700 mt-1">今月</p>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Users className="w-5 h-5 text-purple-600" />
                  <h4 className="font-medium text-purple-900">利用者数</h4>
                </div>
                <p className="text-2xl font-bold text-purple-600">{monthlyStats.users}人</p>
                <p className="text-xs text-purple-700 mt-1">今月</p>
              </div>
            </div>
            
            <div className="h-64 bg-white rounded-lg border border-gray-200 p-3">
              {dailyStats.length === 0 ? (
                <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm">データがありません</div>
              ) : (
                <svg viewBox="0 0 640 240" className="w-full h-full">
                  {/* 軸 */}
                  <line x1="40" y1="10" x2="40" y2="220" stroke="#e5e7eb"/>
                  <line x1="40" y1="220" x2="620" y2="220" stroke="#e5e7eb"/>
                  {/* スケール計算 */}
                  {(() => {
                    const maxVal = Math.max(1, ...dailyStats.map(d => Math.max(d.reservations, d.users)));
                    const toX = (i: number) => 40 + (i / Math.max(1, dailyStats.length - 1)) * 580;
                    const toY = (v: number) => 220 - (v / maxVal) * 180;
                    const resPoints = dailyStats.map((d, i) => `${toX(i)},${toY(d.reservations)}`).join(' ');
                    const userPoints = dailyStats.map((d, i) => `${toX(i)},${toY(d.users)}`).join(' ');
                    return (
                      <>
                        {/* 予約件数（青） */}
                        <polyline fill="none" stroke="#3b82f6" strokeWidth="2" points={resPoints} />
                        {dailyStats.map((d, i) => <circle key={`r-${i}`} cx={toX(i)} cy={toY(d.reservations)} r="2" fill="#3b82f6" />)}
                        {/* 利用者数（紫） */}
                        <polyline fill="none" stroke="#8b5cf6" strokeWidth="2" points={userPoints} />
                        {dailyStats.map((d, i) => <circle key={`u-${i}`} cx={toX(i)} cy={toY(d.users)} r="2" fill="#8b5cf6" />)}
                        {/* 目盛りラベル（5分割） */}
                        {Array.from({ length: 6 }, (_, idx) => {
                          const yVal = Math.round((maxVal / 5) * idx);
                          const y = toY(yVal);
                          return <g key={idx}><line x1="40" y1={y} x2="620" y2={y} stroke="#f3f4f6"/><text x="8" y={y+4} fontSize="10" fill="#6b7280">{yVal}</text></g>
                        })}
                        {/* 凡例 */}
                        <g>
                          <rect x="460" y="16" width="10" height="10" fill="#3b82f6"/>
                          <text x="475" y="25" fontSize="12" fill="#374151">予約件数</text>
                          <rect x="540" y="16" width="10" height="10" fill="#8b5cf6"/>
                          <text x="555" y="25" fontSize="12" fill="#374151">利用者数</text>
                        </g>
                      </>
                    );
                  })()}
                </svg>
              )}
            </div>
          </Card>
          
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-6 flex items-center">
              <DollarSign className="w-6 h-6 text-blue-600 mr-2" />
              収益情報
            </h2>
            
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-3">収益配分</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-blue-800 mb-1">収益（80%）</p>
                    <p className="text-2xl font-bold text-blue-600">¥{Math.round(monthlyStats.revenue * 0.8).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-blue-800 mb-1">プラットフォーム手数料（20%）</p>
                    <p className="text-2xl font-bold text-blue-600">¥{Math.round(monthlyStats.revenue * 0.2).toLocaleString()}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold text-green-900 mb-3">収益内訳</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-green-800 mb-1">1Dayパス</p>
                    <p className="text-xl font-bold text-green-600">¥{monthlyStats.breakdown.daypass.amount.toLocaleString()}</p>
                    <p className="text-xs text-green-700">{monthlyStats.breakdown.daypass.count}人</p>
                  </div>
                  <div>
                    <p className="text-sm text-green-800 mb-1">施設貸し切り</p>
                    <p className="text-xl font-bold text-green-600">¥{monthlyStats.breakdown.whole.amount.toLocaleString()}</p>
                    <p className="text-xs text-green-700">{monthlyStats.breakdown.whole.count}件</p>
                  </div>
                  <div>
                    <p className="text-sm text-green-800 mb-1">サブスク</p>
                    <p className="text-xl font-bold text-green-600">¥{monthlyStats.breakdown.subscription.amount.toLocaleString()}</p>
                    <p className="text-xs text-green-700">{monthlyStats.breakdown.subscription.count}人</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="font-semibold text-purple-900 mb-3">振込情報</h3>
                <p className="text-sm text-purple-800 mb-2">
                  振込は毎月15日に前月分を一括で行います。振込手数料は当社負担です。
                </p>
                <Link to="/owner-payment-system">
                  <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                    <DollarSign className="w-4 h-4 mr-2" />
                    振込情報を確認
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* PINコード管理タブ */}
      {activeTab === 'pins' && (
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-6 flex items-center">
              <Key className="w-6 h-6 text-blue-600 mr-2" />
              オーナー用PINコード発行
            </h2>
            
            <div className="bg-blue-50 p-4 rounded-lg mb-6">
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">オーナー特権</p>
                  <p>オーナーは決済不要でPINコードを発行できます。施設の管理やメンテナンスに使用してください。</p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>PINコードは5分間有効です</li>
                    <li>入場・退場それぞれでPINコードが必要です</li>
                    <li>スタッフと共有することもできます</li>
                    <li>管理用途なので決済は不要です</li>
                  </ul>
                </div>
              </div>
            </div>
            
            {/* 入退場切り替え */}
            <div className="flex justify-center space-x-4 mb-4">
              <button
                className={`px-6 py-3 rounded-lg flex items-center space-x-2 ${
                  pinPurpose === 'entry'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                onClick={() => setPinPurpose('entry')}
              >
                <ArrowLeft className="w-5 h-5" />
                <span>入場</span>
              </button>
              <button
                className={`px-6 py-3 rounded-lg flex items-center space-x-2 ${
                  pinPurpose === 'exit'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                onClick={() => setPinPurpose('exit')}
              >
                <ArrowLeft className="w-5 h-5 rotate-180" />
                <span>退場</span>
              </button>
            </div>
            
            {/* スマートロック選択 */}
            {smartLocks.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  スマートロックを選択
                </label>
                <select
                  value={selectedLock?.id || ''}
                  onChange={(e) => {
                    const lock = smartLocks.find(l => l.id === e.target.value);
                    setSelectedLock(lock || null);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {smartLocks.map(lock => (
                    <option key={lock.id} value={lock.id}>
                      {lock.lock_name}
                    </option>
                  ))}
                </select>
              </div>
            )}


            
            {/* PINコードジェネレーター */}
            {selectedLock ? (
              <div className="mt-6">
                <PinCodeGenerator
                  lockId={selectedLock.lock_id}
                  parkName={park.name}
                  purpose={pinPurpose}
                  onSuccess={handlePinSuccess}
                  onError={handlePinError}
                />
              </div>
            ) : (
              <div className="text-center py-8">
                <Key className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">スマートロックが設定されていません</p>
                <p className="text-sm text-gray-500 mb-4">PINコードを発行するにはスマートロックの登録が必要です</p>
                <Button 
                  onClick={() => setActiveTab('locks')} 
                  data-walkthrough="setup-smartlock-button"
                  className="flex items-center gap-2 mx-auto"
                >
                  <Shield className="w-4 h-4" />
                  スマートロックを設定する
                </Button>
              </div>
            )}
          </Card>
          
          <Card className="p-6 bg-blue-50 border-blue-200">
            <div className="flex items-start space-x-3">
              <Key className="w-6 h-6 text-blue-600 mt-1" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">PINコードについて</h3>
                <div className="text-sm text-blue-800 space-y-2">
                  <p>• 利用者はPINコードを使用して入退場します</p>
                  <p>• PINコードは5分間有効で、利用者が支払い後に発行されます</p>
                  <p>• オーナーは決済不要でPINコードを発行できます</p>
                  <p>• 施設貸し切りの場合、利用者は友達にPINコードを共有できます</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* スマートロック管理タブ */}
      {activeTab === 'locks' && (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-2">スマートロック管理</h2>
              <p className="text-gray-600 text-sm">
                このドッグランのスマートロックを管理します。Sciener等のスマートロックIDを登録してください。
              </p>
            </div>
            
            <SmartLockManager 
              parkId={parkId} 
              parkName={park.name}
            />
          </Card>

          <Card className="p-6 bg-yellow-50 border-yellow-200">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-6 h-6 text-yellow-600 mt-1" />
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-900 mb-2">重要な設定項目</h3>
                <div className="text-sm text-yellow-800 space-y-2">
                  <p>• <strong>ロックID</strong>: ScienerまたはTTLock等のAPIで提供されるスマートロックの一意ID</p>
                  <p>• <strong>ロック名</strong>: 利用者に表示される名前（例：メインゲート、南側入口）</p>
                  <p>• <strong>有効状態</strong>: 無効にすると、そのロックではPINコードを発行できません</p>
                  <p>• 複数のスマートロックを登録して、利用者が選択できるようにすることも可能です</p>
                </div>
                <div className="mt-4 pt-4 border-t border-yellow-300">
                  <Button 
                    onClick={() => setActiveTab('pins')}
                    variant="secondary"
                    className="flex items-center gap-2"
                  >
                    <Key className="w-4 h-4" />
                    PINコード管理に戻る
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* 設定タブ */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
                {/* 基本設定 */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <Wrench className="w-5 h-5 text-blue-600 mr-2" />
                    基本設定
                  </h3>
                  <p className="text-gray-600 mb-4">
                    施設の基本情報や設備情報を編集できます。住所と料金は変更できません。
                  </p>
                  <Link to={`/parks/${park.id}/edit`}>
                    <Button>
                      <Edit className="w-4 h-4 mr-2" />
                      基本情報を編集
                    </Button>
                  </Link>
                </Card>

                {/* 施設画像管理 */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <ImageIcon className="w-5 h-5 text-blue-600 mr-2" />
                    施設画像管理
                  </h3>
                  <p className="text-gray-600 mb-6">
                    各設備の画像を管理できます。画像はすべて1:1でトリミングされ、最適化されます。
                  </p>

                  {/* エラー・成功メッセージ */}
                  {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
                      {error}
                    </div>
                  )}
                  {success && (
                    <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700">
                      {success}
                    </div>
                  )}

                  <div className="space-y-6">
                    {facilityImages.map((image) => {
                      const imageTypeConfig = IMAGE_TYPES[image.image_type as keyof typeof IMAGE_TYPES];
                      const IconComponent = imageTypeConfig?.icon || Building;

                      return (
                        <div key={image.image_type} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-2">
                              <IconComponent className="w-5 h-5 text-blue-600" />
                              <h4 className="font-medium text-gray-900">
                                {imageTypeConfig?.label || image.image_type}
                              </h4>
                  </div>
                            {image.is_approved === true && (
                              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                承認済み
                              </span>
                            )}
                            {image.is_approved === false && (
                              <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                                却下
                              </span>
                            )}
                </div>

                          <p className="text-sm text-gray-600 mb-4">
                            {imageTypeConfig?.description || '画像をアップロードしてください'}
                          </p>

                          {/* 現在の画像表示 */}
                          {image.image_url ? (
                            <div className="space-y-4">
                              <div className="relative">
                                <div
                                  className="aspect-square w-48 bg-gray-100 rounded-lg overflow-hidden cursor-pointer"
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
                                    <Eye className="w-4 h-4 text-blue-600" />
                                  </button>
                                  <button
                                    onClick={() => handleImageDelete(image.id, image.image_type)}
                                    className="p-1 bg-white rounded-full shadow hover:bg-gray-100"
                                    disabled={imageLoading}
                                  >
                                    <Trash2 className="w-4 h-4 text-red-600" />
                                  </button>
                  </div>
                </div>

                              {/* 却下理由の表示 */}
                              {image.is_approved === false && image.admin_notes && (
                                <div className="p-3 bg-red-50 rounded-lg text-sm text-red-800">
                                  <p className="font-medium">却下理由:</p>
                                  <p>{image.admin_notes}</p>
                      </div>
                    )}

                              {/* 画像入れ替えボタン */}
                              <div className="flex space-x-2">
                        <input
                                  type="file"
                                  id={`replace-image-${image.image_type}`}
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
                                  htmlFor={`replace-image-${image.image_type}`}
                                  className="cursor-pointer inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                                >
                                  <Camera className="w-4 h-4 mr-2" />
                                  画像を入れ替える
                      </label>
                  </div>
                </div>
                          ) : (
                            /* 画像がない場合のアップロード */
                            <div className="space-y-3">
                              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
                                <input
                                  type="file"
                                  id={`upload-image-${image.image_type}`}
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
                                  htmlFor={`upload-image-${image.image_type}`}
                                  className="cursor-pointer flex flex-col items-center"
                                >
                                  <Upload className="w-8 h-8 text-gray-400 mb-2" />
                                  <span className="text-sm text-gray-600">
                                    クリックして画像を選択
                                  </span>
                                </label>
                </div>

                              {/* ファイル選択後のアップロードボタン */}
                              {image.file && (
                                <div className="flex items-center justify-between bg-gray-50 p-3 rounded">
                                  <span className="text-sm truncate">{image.file.name}</span>
                  <Button
                                    size="sm"
                                    onClick={() => handleImageUpload(image.image_type)}
                                    disabled={imageLoading}
                                  >
                                    {imageLoading ? 'アップロード中...' : 'アップロード'}
                  </Button>
                </div>
                              )}
              </div>
                          )}
              </div>
                      );
                    })}
              </div>
                </Card>

                {/* 料金設定 */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <DollarSign className="w-5 h-5 text-blue-600 mr-2" />
                    料金設定
                  </h3>
                  <p className="text-gray-600 mb-4">
                    料金体系は全国統一です。変更はできません。
                  </p>
                  <div className="space-y-2">
                <div className="flex items-center space-x-2">
                      <span className="font-medium">• 通常利用:</span>
                      <span>¥800/日 (固定)</span>
                </div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">• 施設貸し切り:</span>
                      <span>¥4,400/時間 (固定)</span>
              </div>
            </div>
          </Card>
            </div>
            )}

            {/* 運営サポート */}
            <Card className="p-6 bg-gray-50">
              <div className="flex items-start space-x-3">
                <FileText className="w-6 h-6 text-gray-600 mt-1" />
                    <div>
                  <h3 className="font-semibold text-gray-900 mb-2">運営サポート</h3>
                  <div className="text-sm text-gray-700 space-y-1">
                    <p>• 設定に関するご質問は運営事務局までお問い合わせください</p>
                    <p>• スマートロックシステムの設置・設定サポートを提供しています</p>
                    <p>• 運営開始後も継続的なサポートを行います</p>
                    <p>• 📧 サポート窓口: info@dogparkjp.com</p>
                    </div>
                    </div>
                    </div>
            </Card>
          </>
        )}

        {/* 位置調整タブ */}
        {activeTab === 'location' && (
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-6 flex items-center">
                <MapPin className="w-6 h-6 text-blue-600 mr-2" />
                ドッグランの位置調整
              </h3>
              
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-blue-800 text-sm">
                    <strong>位置調整について:</strong><br />
                    📍 <strong>住所で検索</strong>: 住所を入力して検索ボタンを押すと、自動的にマップ上の位置が調整されます。<br />
                    🔴 <strong>手動調整</strong>: 赤いマーカーを直接ドラッグして、より正確な位置に調整することも可能です。<br />
                    💾 マーカーを調整した後、「位置を保存」ボタンで座標を保存してください。
                  </p>
                </div>

                {park && (
                  <div data-walkthrough="location-map">
                    <LocationEditMap
                      initialAddress={editForm.address}
                      initialLatitude={editForm.latitude || undefined}
                      initialLongitude={editForm.longitude || undefined}
                      onLocationChange={(lat, lng, address) => {
                        setEditForm(prev => ({
                          ...prev,
                          latitude: lat,
                          longitude: lng
                        }));
                      }}
                    />
                  </div>
                )}
                
                <div className="flex justify-end">
                    <Button
                      type="button"
                      data-walkthrough="save-location-button"
                    onClick={async () => {
                      if (!park || !editForm.latitude || !editForm.longitude) {
                        console.log('Missing required data:', { park: !!park, latitude: editForm.latitude, longitude: editForm.longitude });
                        return;
                      }
                      
                      try {
                        setIsEditLoading(true);
                        setError('');
                        
                        // 施設情報を更新
                        const { error: updateError } = await supabase
                          .from('dog_parks')
                          .update({
                            latitude: editForm.latitude,
                            longitude: editForm.longitude,
                            updated_at: new Date().toISOString()
                          })
                          .eq('id', park.id);
                        
                        if (updateError) throw updateError;
                        
                        setSuccess('位置情報を更新しました。');
                        
                        // パークデータを再取得
                        await fetchParkData();
                        
                        // 3秒後に成功メッセージを消す
                        setTimeout(() => {
                          setSuccess('');
                        }, 3000);
                        
                      } catch (error) {
                        console.error('Error updating location:', error);
                        const errorMessage = error instanceof Error 
                          ? error.message 
                          : typeof error === 'object' && error !== null && 'message' in error
                          ? String((error as any).message)
                          : '不明なエラーが発生しました';
                        setError(`位置情報の更新に失敗しました: ${errorMessage}`);
                      } finally {
                        setIsEditLoading(false);
                      }
                    }}
                    disabled={isEditLoading || !editForm.latitude || !editForm.longitude}
                    className="min-w-[120px]"
                  >
                    {isEditLoading ? (
                      <div className="flex items-center">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        保存中...
                      </div>
                    ) : (
                      '位置を保存'
                    )}
                  </Button>
                        </div>
                      </div>
                    </Card>
          </div>
              )}
            </div>

      {/* Image Cropper Modal */}
      {showImageCropper && imageToUpload?.file && (
        <ImageCropper
          imageFile={imageToUpload.file}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
          aspectRatio={1} // 1:1比率でクロップ
          maxWidth={400}
          maxHeight={400}
        />
      )}

      {/* 画像プレビューモーダル */}
      {showImagePreview && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-4xl w-full">
            <button
              onClick={() => setShowImagePreview(null)}
              className="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-75 z-10"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="flex items-center justify-center h-[80vh]">
              <img
                src={showImagePreview}
                alt="プレビュー"
                className="max-h-full max-w-full object-contain"
              />
                </div>
              </div>
        </div>
      )}

      {/* メンテナンス予定追加モーダル */}
      {showMaintenanceForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">
                  {editingMaintenance ? 'メンテナンス予定を編集' : 'メンテナンス予定を追加'}
                </h2>
                <button
                  onClick={handleMaintenanceCancel}
                  className="text-gray-500 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={editingMaintenance ? handleMaintenanceUpdate : handleMaintenanceSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    メンテナンス名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={maintenanceForm.title}
                    onChange={(e) => setMaintenanceForm(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="例: 設備点検、清掃作業"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    詳細説明
                  </label>
                  <textarea
                    value={maintenanceForm.description}
                    onChange={(e) => setMaintenanceForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    placeholder="メンテナンス内容の詳細を入力してください"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      開始日時 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={maintenanceForm.start_date}
                      onChange={(e) => setMaintenanceForm(prev => ({ ...prev, start_date: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      終了日時 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={maintenanceForm.end_date}
                      onChange={(e) => setMaintenanceForm(prev => ({ ...prev, end_date: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="is_emergency"
                      checked={maintenanceForm.is_emergency}
                      onChange={(e) => setMaintenanceForm(prev => ({ ...prev, is_emergency: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="is_emergency" className="ml-2 block text-sm text-gray-700">
                      緊急メンテナンス（即座に施設利用を停止）
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="notify_users"
                      checked={maintenanceForm.notify_users}
                      onChange={(e) => setMaintenanceForm(prev => ({ ...prev, notify_users: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="notify_users" className="ml-2 block text-sm text-gray-700">
                      利用者にメール通知を送信
                    </label>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowMaintenanceForm(false)}
                  >
                    キャンセル
                  </Button>
                  <Button
                    type="submit"
                    disabled={isMaintenanceLoading}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isMaintenanceLoading ? (
                      <div className="flex items-center">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        {editingMaintenance ? '更新中...' : '追加中...'}
                      </div>
                    ) : (
                      editingMaintenance ? 'メンテナンス予定を更新' : 'メンテナンス予定を追加'
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ウォークスルー */}
      {showWalkthrough && (
        <ParkManagementWalkthrough
          onComplete={handleWalkthroughComplete}
          onClose={() => setShowWalkthrough(false)}
          onStepChange={handleWalkthroughStepChange}
        />
      )}
    </div>
  );
}

