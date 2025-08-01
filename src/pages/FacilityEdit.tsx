import {
    AlertCircle,
    ArrowLeft,
    Building,
    Calendar,
    CheckCircle,
    ChevronLeft,
    ChevronRight,
    Clock,
    Eye,
    Gift,
    Image as ImageIcon,
    MapPin,
    Plus,
    Save,
    Trash2,
    UploadCloud
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import ImageCropper from '../components/ImageCropper'; // ImageCropperコンポーネントを追加
import Input from '../components/Input';
import { LocationEditMap } from '../components/LocationEditMap';
import { SEO } from '../components/SEO';
import { CouponManager } from '../components/coupons/CouponManager';
import useAuth from '../context/AuthContext';
import { supabase } from '../utils/supabase';

// カテゴリの日本語マッピング
const CATEGORY_LABELS: { [key: string]: string } = {
  'pet_hotel': 'ペットホテル',
  'pet_salon': 'ペットサロン',
  'veterinary': '動物病院',
  'pet_cafe': 'ペットカフェ',
  'pet_restaurant': 'ペット同伴レストラン',
  'pet_shop': 'ペットショップ',
  'pet_accommodation': 'ペット同伴宿泊',
  'dog_training': 'しつけ教室',
  'pet_friendly_other': 'その他ワンちゃん同伴可能施設'
};

// 画像処理ユーティリティ
const processFacilityImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = document.createElement('img');
    
    img.onload = () => {
      const maxWidth = 800;
      const maxHeight = 600;
      
      let width = img.naturalWidth;
      let height = img.naturalHeight;
      
      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      ctx?.drawImage(img, 0, 0, width, height);
      
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    
    img.onerror = () => reject(new Error('画像の読み込みに失敗しました'));
    img.src = URL.createObjectURL(file);
  });
};

// 施設画像の型定義
interface FacilityImage {
  id: string;
  facility_id: string;
  image_url: string;
  image_type: 'main' | 'additional';
  display_order: number;
  alt_text?: string;
  created_at: string;
  updated_at: string;
}

interface PetFacility {
  id: string;
  name: string;
  category_id: string;
  address: string;
  phone?: string;
  website?: string;
  description?: string;
  status: string;
  identity_document_url?: string;
  identity_document_filename?: string;
  identity_status: string;
  created_at: string;
  updated_at: string;
  latitude: number | null;
  longitude: number | null;
}

interface FacilityCategory {
  id: string;
  name: string;
  description: string;
}

export default function FacilityEdit() {
  const { id: facilityId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [facility, setFacility] = useState<PetFacility | null>(null);
  const [categories, setCategories] = useState<FacilityCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // 削除関連のstate
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  
  // 画像アップロード関連のstate
  const [facilityImages, setFacilityImages] = useState<FacilityImage[]>([]);
  const [showImageCropper, setShowImageCropper] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState<number | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  
  // フォームデータ
  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
    address: '',
    phone: '',
    website: '',
    description: '',
    latitude: null as number | null,
    longitude: null as number | null
  });
  
  // タブ管理用のstate
  const [activeTab, setActiveTab] = useState<'info' | 'images' | 'coupons' | 'schedule' | 'location'>('info');

  // 営業日管理用のstate
  const [weeklyClosedDays, setWeeklyClosedDays] = useState<boolean[]>([false, false, false, false, false, false, false]); // 日月火水木金土
  const [openingTime, setOpeningTime] = useState('09:00');
  const [closingTime, setClosingTime] = useState('18:00');
  const [specificClosedDates, setSpecificClosedDates] = useState<string[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    if (!user || !facilityId) {
      navigate('/my-facilities-management');
      return;
    }
    
    fetchData();
  }, [user, facilityId, navigate]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // 施設データを取得
      const { data: facilityData, error: facilityError } = await supabase
        .from('pet_facilities')
        .select('*')
        .eq('id', facilityId)
        .eq('owner_id', user?.id)
        .single();
      
      if (facilityError) throw facilityError;
      if (!facilityData) {
        navigate('/my-facilities-management');
        return;
      }
      
      setFacility(facilityData);
      setFormData({
        name: facilityData.name || '',
        category_id: facilityData.category_id || '',
        address: facilityData.address || '',
        phone: facilityData.phone || '',
        website: facilityData.website || '',
        description: facilityData.description || '',
        latitude: facilityData.latitude || null,
        longitude: facilityData.longitude || null
      });
      
      // 営業日データの初期化
      if (facilityData.opening_time) setOpeningTime(facilityData.opening_time);
      if (facilityData.closing_time) setClosingTime(facilityData.closing_time);
      if (facilityData.weekly_closed_days) {
        try {
          const closedDays = JSON.parse(facilityData.weekly_closed_days);
          if (Array.isArray(closedDays) && closedDays.length === 7) {
            setWeeklyClosedDays(closedDays);
          }
        } catch (e) {
          console.warn('Failed to parse weekly_closed_days:', e);
        }
      }
      if (facilityData.specific_closed_dates) {
        try {
          const closedDates = JSON.parse(facilityData.specific_closed_dates);
          if (Array.isArray(closedDates)) {
            setSpecificClosedDates(closedDates);
          }
        } catch (e) {
          console.warn('Failed to parse specific_closed_dates:', e);
        }
      }
      
      if (facilityData.identity_document_url) {
        // 身分証明書プレビューは削除されました
      }
      
      // 施設画像を取得
      const { data: imagesData, error: imagesError } = await supabase
        .from('pet_facility_images')
        .select('*')
        .eq('facility_id', facilityId)
        .order('display_order', { ascending: true });
      
      if (imagesError) throw imagesError;
      setFacilityImages(imagesData || []);
      
      // カテゴリデータを取得
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('facility_categories')
        .select('*')
        .order('name');
      
      if (categoriesError) throw categoriesError;
      setCategories(categoriesData || []);
      
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load facility data:', error);
      setError('施設データの読み込みに失敗しました。');
      setIsLoading(false);
    }
  };

  // 画像選択処理
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>, index?: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // ファイル形式チェック
    if (!file.type.startsWith('image/')) {
      setError('画像ファイルを選択してください。');
      return;
    }

    // ファイルサイズチェック（10MB未満）
    if (file.size > 10 * 1024 * 1024) {
      setError('ファイルサイズは10MB未満にしてください。');
      return;
    }

    setSelectedImageFile(file);
    setCurrentImageIndex(index ?? null);
    setShowImageCropper(true);
  };

  // ImageCropper完了処理
  const handleCropComplete = async (croppedFile: File) => {
    if (!facility) return;

    try {
      setIsUploadingImage(true);
      setError('');

      // 画像をSupabase Storageにアップロード（vaccine-certsバケットを使用）
      const timestamp = Date.now();
      const filename = `facility_${facility.id}_${timestamp}.jpg`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('vaccine-certs')
        .upload(filename, croppedFile, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('vaccine-certs')
        .getPublicUrl(filename);

      const imageUrl = urlData.publicUrl;

      // 新しい画像の場合
      if (currentImageIndex === null) {
        // 最新の画像データを取得して正確なdisplay_orderを計算
        const { data: currentImages, error: fetchError } = await supabase
          .from('pet_facility_images')
          .select('display_order')
          .eq('facility_id', facility.id)
          .order('display_order', { ascending: false })
          .limit(1);

        if (fetchError) throw fetchError;

        const newDisplayOrder = currentImages.length > 0 ? currentImages[0].display_order + 1 : 0;
        const imageType = newDisplayOrder === 0 ? 'main' : 'additional';

        const { data: imageData, error: imageError } = await supabase
          .from('pet_facility_images')
          .insert({
            facility_id: facility.id,
            image_url: imageUrl,
            image_type: imageType,
            display_order: newDisplayOrder
          })
          .select()
          .single();

        if (imageError) throw imageError;

        setFacilityImages(prev => [...prev, imageData].sort((a, b) => a.display_order - b.display_order));
      } else {
        // 既存画像の更新
        const imageToUpdate = facilityImages[currentImageIndex];
        
        const { data: imageData, error: imageError } = await supabase
          .from('pet_facility_images')
          .update({
            image_url: imageUrl,
            updated_at: new Date().toISOString()
          })
          .eq('id', imageToUpdate.id)
          .select()
          .single();

        if (imageError) throw imageError;

        setFacilityImages(prev => 
          prev.map(img => img.id === imageData.id ? imageData : img)
        );
      }

      setSuccess('画像がアップロードされました。');
      setTimeout(() => setSuccess(''), 3000);

    } catch (error) {
      console.error('Image upload error:', error);
      setError('画像のアップロードに失敗しました。');
    } finally {
      setIsUploadingImage(false);
      setShowImageCropper(false);
      setSelectedImageFile(null);
      setCurrentImageIndex(null);
    }
  };

  // ImageCropperキャンセル処理
  const handleCropCancel = () => {
    setShowImageCropper(false);
    setSelectedImageFile(null);
    setCurrentImageIndex(null);
  };

  // 画像削除処理
  const handleImageDelete = async (imageId: string) => {
    if (!window.confirm('この画像を削除しますか？')) return;

    try {
      setError('');

      const { error: deleteError } = await supabase
        .from('pet_facility_images')
        .delete()
        .eq('id', imageId);

      if (deleteError) throw deleteError;

      setFacilityImages(prev => prev.filter(img => img.id !== imageId));
      
      // display_orderを再調整
      const updatedImages = facilityImages.filter(img => img.id !== imageId);
      for (let i = 0; i < updatedImages.length; i++) {
        const newImageType = i === 0 ? 'main' : 'additional';
        if (updatedImages[i].display_order !== i || updatedImages[i].image_type !== newImageType) {
          await supabase
            .from('pet_facility_images')
            .update({ 
              display_order: i, 
              image_type: newImageType 
            })
            .eq('id', updatedImages[i].id);
        }
      }

      setSuccess('画像が削除されました。');
      fetchData(); // 画像削除後にデータを再取得
      setTimeout(() => setSuccess(''), 3000);

    } catch (error) {
      setError('画像の削除に失敗しました。');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facility || !user) return;

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      // バリデーション
      if (!formData.name.trim()) {
        throw new Error('施設名を入力してください。');
      }
      if (!formData.category_id) {
        throw new Error('カテゴリを選択してください。');
      }
      if (!formData.address.trim()) {
        throw new Error('住所を入力してください。');
      }
      if (!formData.phone.trim()) {
        throw new Error('電話番号を入力してください。');
      }

      // 施設情報を更新
      const { error: updateError } = await supabase
        .from('pet_facilities')
        .update({
          name: formData.name.trim(),
          category_id: formData.category_id,
          address: formData.address.trim(),
          phone: formData.phone.trim(),
          website: formData.website.trim() || null,
          description: formData.description.trim() || null,
          latitude: formData.latitude,
          longitude: formData.longitude,
          updated_at: new Date().toISOString()
        })
        .eq('id', facility.id);

      if (updateError) throw updateError;

      setSuccess('施設情報を更新しました。');
      
      // データを再取得
      await fetchData();
      
      // 3秒後に成功メッセージを消す
      setTimeout(() => {
        setSuccess('');
      }, 3000);

    } catch (error) {
      setError(error instanceof Error ? error.message : '更新に失敗しました。');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 施設削除処理
  const handleDeleteFacility = async () => {
    if (!facility || deleteConfirmText !== facility.name) {
      setError('施設名が正しく入力されていません。');
      return;
    }

    if (!window.confirm('本当にこの施設を完全に削除しますか？\nこの操作は取り消せません。')) {
      return;
    }

    try {
      setIsDeleting(true);
      setError('');

      // 管理者権限の確認
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user?.id)
        .single();

      // 関連する施設画像を削除
      try {
        await supabase
          .from('pet_facility_images')
          .delete()
          .eq('facility_id', facility.id);
      } catch (imageError) {
        // 画像削除エラーは継続して施設削除を試行
      }

      // 施設本体を削除
      let deleteQuery = supabase.from('pet_facilities').delete();
      
      if (profileData?.role === 'admin') {
        deleteQuery = deleteQuery.eq('id', facility.id);
      } else {
        deleteQuery = deleteQuery.eq('id', facility.id).eq('owner_id', user?.id);
      }

      const { error: deleteError } = await deleteQuery;

      if (deleteError) {
        if (deleteError.message?.includes('RLS')) {
          throw new Error('権限エラー: この施設を削除する権限がありません。管理者にお問い合わせください。');
        }
        throw new Error(`削除処理エラー: ${deleteError.message}`);
      }

      // 削除検証
      const { data: verifyData, error: verifyError } = await supabase
        .from('pet_facilities')
        .select('id')
        .eq('id', facility.id)
        .single();

      if (verifyData) {
        // 管理者の場合、RPC強制削除を試行
        if (profileData?.role === 'admin') {
          const { error: rpcError } = await supabase.rpc('force_delete_facility', {
            target_facility_id: facility.id
          });
          
          if (rpcError) {
            throw new Error(`削除に失敗しました。データベース管理者にお問い合わせください。エラー: ${rpcError.message}`);
          }
          
          // RPC削除後の再検証
          const { data: finalCheck } = await supabase
            .from('pet_facilities')
            .select('id')
            .eq('id', facility.id)
            .single();
            
          if (finalCheck) {
            throw new Error('施設の削除に失敗しました。データベース管理者にお問い合わせください。');
          }
        } else {
          throw new Error('削除する施設が見つからない、または削除権限がありません。');
        }
      } else if (verifyError && verifyError.code !== 'PGRST116') {
        throw new Error(`削除検証でエラーが発生しました: ${verifyError.message}`);
      }

      setSuccess('施設が正常に削除されました。');
      
      setTimeout(() => {
        navigate('/my-facilities-management');
      }, 3000);

    } catch (error: any) {
      setError(`削除処理でエラーが発生しました: ${error.message}`);
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
      setDeleteConfirmText('');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!facility) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">施設が見つかりません</h1>
          <Link to="/my-facilities-management">
            <Button>管理画面に戻る</Button>
          </Link>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded-full">承認済み</span>;
      case 'pending':
        return <span className="px-2 py-1 text-xs font-semibold bg-yellow-100 text-yellow-800 rounded-full">審査中</span>;
      case 'rejected':
        return <span className="px-2 py-1 text-xs font-semibold bg-red-100 text-red-800 rounded-full">却下</span>;
      default:
        return <span className="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-800 rounded-full">不明</span>;
    }
  };

  // 営業日カレンダーの日付をレンダリングする関数
  const renderCalendar = () => {
    const monthsToShow = 3; // 3か月分表示
    const calendarMonths = [];
    
    for (let monthOffset = 0; monthOffset < monthsToShow; monthOffset++) {
      const targetMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + monthOffset, 1);
      const firstDayOfMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1);
      const daysInMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0).getDate();
      const startDayOfWeek = firstDayOfMonth.getDay(); // 0: 日曜日, 6: 土曜日
      
      const calendarDays: (Date | null)[] = [];
      for (let i = 0; i < startDayOfWeek; i++) {
        calendarDays.push(null); // 先月の日付を埋める
      }
      for (let i = 1; i <= daysInMonth; i++) {
        calendarDays.push(new Date(targetMonth.getFullYear(), targetMonth.getMonth(), i));
      }
      
      const rows: (Date | null)[][] = [];
      for (let i = 0; i < calendarDays.length; i += 7) {
        rows.push(calendarDays.slice(i, i + 7));
      }
      
      calendarMonths.push({
        month: targetMonth,
        rows: rows
      });
    }

    return (
      <div className="space-y-6">
        {/* 月切り替えボタン */}
        <div className="flex items-center justify-between">
          <Button
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
            variant="outline"
            size="sm"
          >
            <ChevronLeft className="w-4 h-4" />
            前月
          </Button>
          <span className="text-lg font-semibold">
            {currentMonth.getFullYear()}年{currentMonth.getMonth() + 1}月から{monthsToShow}か月分
          </span>
          <Button
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
            variant="outline"
            size="sm"
          >
            次月
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* 3か月分のカレンダー */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {calendarMonths.map((monthData, monthIndex) => (
            <div key={monthIndex} className="border border-gray-200 rounded-lg p-4">
              <h4 className="text-center font-semibold mb-4">
                {monthData.month.getFullYear()}年{monthData.month.getMonth() + 1}月
              </h4>
              
              {/* 曜日ヘッダー */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['日', '月', '火', '水', '木', '金', '土'].map((day, index) => (
                  <div key={day} className={`text-center text-xs font-medium py-1 ${
                    index === 0 ? 'text-red-500' : index === 6 ? 'text-blue-500' : 'text-gray-600'
                  }`}>
                    {day}
                  </div>
                ))}
              </div>
              
              {/* カレンダー日付 */}
              <div className="space-y-1">
                {monthData.rows.map((row, rowIndex) => (
                  <div key={rowIndex} className="grid grid-cols-7 gap-1">
                    {row.map((date, dayIndex) => {
                      if (!date) {
                        return <div key={`empty-${monthIndex}-${rowIndex}-${dayIndex}`} className="h-8"></div>;
                      }
                      
                      const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                      const dayOfWeek = date.getDay();
                      const isWeeklyClosedDay = weeklyClosedDays[dayOfWeek];
                      const isSpecificClosedDay = specificClosedDates.includes(dateString);
                      const isToday = new Date().toDateString() === date.toDateString();
                      const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));
                      
                      return (
                        <button
                          key={dateString}
                          onClick={() => {
                            if (!isPast) {
                              if (isSpecificClosedDay) {
                                setSpecificClosedDates(prev => prev.filter(d => d !== dateString));
                              } else {
                                setSpecificClosedDates(prev => [...prev, dateString]);
                              }
                            }
                          }}
                          disabled={isPast}
                          className={`h-8 text-xs rounded transition-colors ${
                            isPast
                              ? 'text-gray-300 cursor-not-allowed'
                              : isWeeklyClosedDay && isSpecificClosedDay
                              ? 'bg-purple-100 border-purple-300 text-purple-700 border' // 定休日かつ特定休業日
                              : isWeeklyClosedDay
                              ? 'bg-red-100 border-red-300 text-red-700 border' // 定休日
                              : isSpecificClosedDay
                              ? 'bg-orange-100 border-orange-300 text-orange-700 border' // 特定休業日
                              : isToday
                              ? 'bg-blue-100 border-blue-300 text-blue-700 border font-bold' // 今日
                              : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 border'
                          }`}
                        >
                          {date.getDate()}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        {/* 凡例 */}
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
            <span>定休日</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-100 border border-orange-300 rounded"></div>
            <span>特定休業日</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-purple-100 border border-purple-300 rounded"></div>
            <span>定休日+特定休業日</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded"></div>
            <span>今日</span>
          </div>
        </div>
      </div>
    );
  };

  // 営業日設定を保存する関数
  const handleScheduleSave = async () => {
    if (!facility) return;

    try {
      setIsSubmitting(true);
      setError('');
      setSuccess('');

      // 営業時間を保存
      const { error: openingHoursError } = await supabase
        .from('pet_facilities')
        .update({
          opening_time: openingTime,
          closing_time: closingTime,
          updated_at: new Date().toISOString()
        })
        .eq('id', facility.id);

      if (openingHoursError) throw openingHoursError;

      // 定休日を保存
      const { error: closedDaysError } = await supabase
        .from('pet_facilities')
        .update({
          weekly_closed_days: JSON.stringify(weeklyClosedDays),
          specific_closed_dates: JSON.stringify(specificClosedDates),
          updated_at: new Date().toISOString()
        })
        .eq('id', facility.id);

      if (closedDaysError) throw closedDaysError;

      setSuccess('営業日設定が保存されました。');
      setTimeout(() => setSuccess(''), 3000);

    } catch (error) {
      setError(error instanceof Error ? error.message : '営業日設定の保存に失敗しました。');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <SEO 
        title={`${facility.name} - 施設編集`}
        description="ペット関連施設の情報を編集・管理します。"
      />
      
      <div className="min-h-screen bg-gray-50">
        {/* Back Navigation */}
        <div className="bg-white border-b">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <Link to="/my-facilities-management" className="flex items-center text-blue-600 hover:text-blue-800">
              <ArrowLeft className="w-4 h-4 mr-2" />
              施設管理一覧に戻る
            </Link>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* ヘッダー */}
          <div className="bg-white rounded-lg border p-6 mb-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{facility.name}</h1>
                <p className="text-gray-600 mt-1">{facility.address}</p>
                <div className="flex items-center mt-2">
                  {getStatusBadge(facility.status)}
                </div>
              </div>

              <div className="flex space-x-3">
                {facility.status === 'approved' && (
                  <Link to={`/parks?view=facilities&facility=${facility.id}`}>
                    <Button variant="secondary" className="min-w-[100px]">
                      <Eye className="w-4 h-4 mr-2" />
                      公開ページ
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* エラー・成功メッセージ */}
          {error && (
            <div className="bg-red-100 border border-red-300 text-red-800 rounded-lg p-4 mb-6">
              <AlertCircle className="w-5 h-5 inline mr-2" />
              {error}
            </div>
          )}
          
          {success && (
            <div className="bg-green-100 border border-green-300 text-green-800 rounded-lg p-4 mb-6">
              <CheckCircle className="w-5 h-5 inline mr-2" />
              {success}
            </div>
          )}

          {/* タブナビゲーション */}
          <div className="bg-white rounded-lg border mb-6">
            <div className="border-b">
              <nav className="flex space-x-8 px-6">
                <button
                  onClick={() => setActiveTab('info')}
                  className={`py-4 px-2 border-b-2 font-medium text-sm ${
                    activeTab === 'info'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Building className="w-4 h-4 inline mr-2" />
                  基本情報
                </button>
                <button
                  onClick={() => setActiveTab('images')}
                  className={`py-4 px-2 border-b-2 font-medium text-sm ${
                    activeTab === 'images'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <ImageIcon className="w-4 h-4 inline mr-2" />
                  画像管理
                </button>
                <button
                  onClick={() => setActiveTab('coupons')}
                  className={`py-4 px-2 border-b-2 font-medium text-sm ${
                    activeTab === 'coupons'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Gift className="w-4 h-4 inline mr-2" />
                  クーポン管理
                </button>
                <button
                  onClick={() => setActiveTab('schedule')}
                  className={`py-4 px-2 border-b-2 font-medium text-sm ${
                    activeTab === 'schedule'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Calendar className="w-4 h-4 inline mr-2" />
                  営業日管理
                </button>
                <button
                  onClick={() => setActiveTab('location')}
                  className={`py-4 px-2 border-b-2 font-medium text-sm ${
                    activeTab === 'location'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <MapPin className="w-4 h-4 inline mr-2" />
                  位置調整
                </button>
              </nav>
            </div>

            {/* タブコンテンツ */}
            <div className="p-6">
              {activeTab === 'info' && (
                <div>
                  <h2 className="text-xl font-semibold mb-6 flex items-center">
                    <Building className="w-6 h-6 text-blue-600 mr-2" />
                    施設情報の編集
                  </h2>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* 基本情報 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          施設名 *
                        </label>
                        <Input
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          placeholder="施設名を入力"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          カテゴリ *
                        </label>
                        <select
                          name="category_id"
                          value={formData.category_id}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        >
                          <option value="">カテゴリを選択</option>
                          {categories.map(category => (
                            <option key={category.id} value={category.id}>
                              {CATEGORY_LABELS[category.name] || category.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        住所 *
                      </label>
                      <Input
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        placeholder="住所を入力"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          電話番号
                        </label>
                        <Input
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          placeholder="電話番号を入力"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          ウェブサイト
                        </label>
                        <Input
                          name="website"
                          value={formData.website}
                          onChange={handleInputChange}
                          placeholder="https://example.com"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        施設説明
                      </label>
                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="施設の特徴やサービス内容を入力"
                      />
                    </div>

                    {/* 施設画像 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        施設画像 (最大5枚)
                      </label>
                      <p className="text-sm text-gray-500 mb-4">
                        1枚目がメイン画像として使用されます。施設の雰囲気がわかる画像をアップロードしてください。
                      </p>
                      
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                        {facilityImages.map((image, index) => (
                          <div key={image.id} className="relative group">
                            <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200">
                              <img
                                src={image.image_url}
                                alt={`施設画像 ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            
                            {/* 画像の順序表示 */}
                            <div className="absolute top-2 left-2">
                              <span className="bg-blue-600 text-white text-xs font-medium px-2 py-1 rounded">
                                {index === 0 ? 'メイン' : index + 1}
                              </span>
                            </div>
                            
                            {/* 画像操作ボタン */}
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="flex space-x-1">
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => handleImageSelect(e, index)}
                                  className="hidden"
                                  id={`image-replace-${index}`}
                                />
                                <label
                                  htmlFor={`image-replace-${index}`}
                                  className="bg-white text-gray-600 p-1 rounded shadow hover:bg-gray-50 cursor-pointer"
                                  title="画像を変更"
                                >
                                  <ImageIcon className="w-4 h-4" />
                                </label>
                                
                                <button
                                  type="button"
                                  onClick={() => handleImageDelete(image.id)}
                                  className="bg-red-500 text-white p-1 rounded shadow hover:bg-red-600"
                                  title="画像を削除"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        {/* 新しい画像追加ボタン */}
                        {facilityImages.length < 5 && (
                          <div className="aspect-square bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center hover:border-blue-400 hover:bg-blue-50 transition-colors">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleImageSelect(e)}
                              className="hidden"
                              id="image-add"
                            />
                            <label
                              htmlFor="image-add"
                              className="flex flex-col items-center cursor-pointer text-gray-500 hover:text-blue-600"
                            >
                              <Plus className="w-8 h-8 mb-2" />
                              <span className="text-sm font-medium">画像を追加</span>
                            </label>
                          </div>
                        )}
                      </div>
                      
                      {facilityImages.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <UploadCloud className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                          <p className="text-sm">まだ画像がアップロードされていません</p>
                          <p className="text-xs mt-1">最初の画像がメイン画像として使用されます</p>
                        </div>
                      )}
                    </div>

                    {/* 保存ボタン */}
                    <div className="flex justify-end">
                      <Button type="submit" isLoading={isSubmitting}>
                        <Save className="w-4 h-4 mr-2" />
                        更新
                      </Button>
                    </div>
                  </form>
                </div>
              )}

              {activeTab === 'images' && (
                <div>
                  <h2 className="text-xl font-semibold mb-6 flex items-center">
                    <ImageIcon className="w-6 h-6 text-blue-600 mr-2" />
                    施設画像の管理
                  </h2>
                  <p className="text-sm text-gray-500 mb-4">
                    施設の画像を管理します。最大5枚まで登録でき、最初の画像がメイン画像として使用されます。
                  </p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                    {facilityImages.map((image, index) => (
                      <div key={image.id} className="relative group">
                        <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200">
                          <img
                            src={image.image_url}
                            alt={`施設画像 ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        
                        {/* 画像の順序表示 */}
                        <div className="absolute top-2 left-2">
                          <span className="bg-blue-600 text-white text-xs font-medium px-2 py-1 rounded">
                            {index === 0 ? 'メイン' : index + 1}
                          </span>
                        </div>
                        
                        {/* 画像操作ボタン */}
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="flex space-x-1">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleImageSelect(e, index)}
                              className="hidden"
                              id={`image-replace-${index}`}
                            />
                            <label
                              htmlFor={`image-replace-${index}`}
                              className="bg-white text-gray-600 p-1 rounded shadow hover:bg-gray-50 cursor-pointer"
                              title="画像を変更"
                            >
                              <ImageIcon className="w-4 h-4" />
                            </label>
                            
                            <button
                              type="button"
                              onClick={() => handleImageDelete(image.id)}
                              className="bg-red-500 text-white p-1 rounded shadow hover:bg-red-600"
                              title="画像を削除"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {/* 新しい画像追加ボタン */}
                    {facilityImages.length < 5 && (
                      <div className="aspect-square bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center hover:border-blue-400 hover:bg-blue-50 transition-colors">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageSelect(e)}
                          className="hidden"
                          id="image-add"
                        />
                        <label
                          htmlFor="image-add"
                          className="flex flex-col items-center cursor-pointer text-gray-500 hover:text-blue-600"
                        >
                          <Plus className="w-8 h-8 mb-2" />
                          <span className="text-sm font-medium">画像を追加</span>
                        </label>
                      </div>
                    )}
                  </div>
                  
                  {facilityImages.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <UploadCloud className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                      <p className="text-sm">まだ画像がアップロードされていません</p>
                      <p className="text-xs mt-1">最初の画像がメイン画像として使用されます</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'coupons' && facility && (
                <div>
                  <CouponManager 
                    facilityId={facility.id} 
                    facilityName={facility.name}
                  />
                </div>
              )}
              
              {/* 営業日管理タブ */}
              {activeTab === 'schedule' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold mb-6 flex items-center">
                      <Calendar className="w-6 h-6 text-blue-600 mr-2" />
                      営業日管理
                    </h2>
                    <p className="text-sm text-gray-500 mb-6">
                      施設の営業時間と休業日を設定できます。
                    </p>
                  </div>

                  {/* 営業時間設定 */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <Clock className="w-5 h-5 text-green-600 mr-2" />
                      営業時間
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          開店時間
                        </label>
                        <input
                          type="time"
                          value={openingTime}
                          onChange={(e) => setOpeningTime(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          閉店時間
                        </label>
                        <input
                          type="time"
                          value={closingTime}
                          onChange={(e) => setClosingTime(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </Card>

                  {/* 定休日設定 */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <Calendar className="w-5 h-5 text-red-600 mr-2" />
                      定休日設定
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">
                      毎週の定休日を設定してください。選択した曜日は自動的にカレンダーでも休業日として表示されます。
                    </p>
                    <div className="grid grid-cols-7 gap-2">
                      {['日', '月', '火', '水', '木', '金', '土'].map((day, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            const newClosedDays = [...weeklyClosedDays];
                            newClosedDays[index] = !newClosedDays[index];
                            setWeeklyClosedDays(newClosedDays);
                          }}
                          className={`py-3 px-2 text-sm font-medium rounded-lg border-2 transition-colors ${
                            weeklyClosedDays[index]
                              ? 'bg-red-100 border-red-300 text-red-700'
                              : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          {day}
                          {weeklyClosedDays[index] && (
                            <div className="text-xs mt-1">定休日</div>
                          )}
                        </button>
                      ))}
                    </div>
                  </Card>

                  {/* カレンダー */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <Calendar className="w-5 h-5 text-blue-600 mr-2" />
                      休業日カレンダー
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">
                      特定の日付をクリックして臨時休業日を設定できます。定休日設定で選択した曜日は自動的に表示されます。
                    </p>
                    {renderCalendar()}
                  </Card>

                  {/* 保存ボタン */}
                  <div className="flex justify-end space-x-3">
                    <Button
                      onClick={handleScheduleSave}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      営業日設定を保存
                    </Button>
                  </div>
                </div>
              )}

              {activeTab === 'location' && (
                <div>
                  <h2 className="text-xl font-semibold mb-6 flex items-center">
                    <MapPin className="w-6 h-6 text-blue-600 mr-2" />
                    施設の位置調整
                  </h2>
                  
                  <div className="space-y-6">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-blue-800 text-sm">
                        <strong>位置調整について:</strong><br />
                        住所から自動的にマップ上の位置を特定しますが、正確でない場合があります。<br />
                        赤いマーカーをドラッグして、実際の施設位置に調整してください。
                      </p>
                    </div>
                    
                    <LocationEditMap
                      initialAddress={formData.address}
                      initialLatitude={formData.latitude || undefined}
                      initialLongitude={formData.longitude || undefined}
                      onLocationChange={(lat, lng, address) => {
                        setFormData(prev => ({
                          ...prev,
                          latitude: lat,
                          longitude: lng,
                          ...(address && address !== prev.address ? { address } : {})
                        }));
                      }}
                    />
                    
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isSubmitting || !formData.latitude || !formData.longitude}
                        className="min-w-[120px]"
                      >
                        {isSubmitting ? (
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
                </div>
              )}
            </div>
          </div>

          {/* 削除セクション - ページの一番下（基本情報タブでのみ表示） */}
          {activeTab === 'info' && (
            <Card className="p-6 border-red-200 bg-red-50">
              <div className="flex items-start space-x-3">
                <Trash2 className="w-6 h-6 text-red-600 mt-1" />
                <div className="flex-1">
                  <h3 className="font-semibold text-red-900 mb-2">危険な操作</h3>
                  <p className="text-sm text-red-800 mb-4">
                    この施設を完全に削除します。削除後はデータの復旧はできません。
                    {facility.status === 'approved' && (
                      <span className="block mt-1 font-medium">
                        ※ 承認済みの施設を削除すると、公開ページからも削除されます。
                      </span>
                    )}
                  </p>
                  
                  <Button
                    onClick={() => setShowDeleteDialog(true)}
                    className="bg-red-600 hover:bg-red-700 text-white"
                    size="sm"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    施設を削除
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* 削除確認ダイアログ */}
          {showDeleteDialog && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <div className="flex items-center mb-4">
                  <Trash2 className="w-6 h-6 text-red-600 mr-3" />
                  <h3 className="text-lg font-semibold text-gray-900">施設の削除確認</h3>
                </div>
                
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">
                    <span className="font-medium text-red-600">警告:</span> この操作は取り消せません。
                  </p>
                  <p className="text-sm text-gray-600 mb-4">
                    削除を実行するには、施設名「<span className="font-medium">{facility.name}</span>」を入力してください。
                  </p>
                  
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="施設名を入力"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                
                <div className="flex justify-end space-x-3">
                  <Button
                    onClick={() => {
                      setShowDeleteDialog(false);
                      setDeleteConfirmText('');
                    }}
                    variant="secondary"
                    disabled={isDeleting}
                  >
                    キャンセル
                  </Button>
                  <Button
                    onClick={handleDeleteFacility}
                    className="bg-red-600 hover:bg-red-700 text-white"
                    disabled={isDeleting || deleteConfirmText !== facility.name}
                    isLoading={isDeleting}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    削除実行
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ImageCropper Modal */}
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
      </div>
    </>
  );
} 