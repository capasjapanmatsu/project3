import { usePremiumOwner } from '@/hooks/usePremiumOwner';
import {
    AlertCircle,
    AlertTriangle,
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
  is_public?: boolean;
}

interface FacilityCategory {
  id: string;
  name: string;
  description: string;
}

export default function FacilityEdit() {
  const premium = usePremiumOwner();

  // プレミアム加入（初月無料）を開始する
  const startCheckout = async () => {
    const priceId = import.meta.env.VITE_PREMIUM_OWNER_PRICE_ID as string | undefined;
    if (!priceId) {
      alert('環境変数 VITE_PREMIUM_OWNER_PRICE_ID が未設定です');
      return;
    }
    try {
      const { data: session } = await supabase.auth.getSession();
      const accessToken = session.session?.access_token;
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`;
      const success = `${window.location.origin}/premium/success`;
      const cancel = `${window.location.origin}/premium/cancel`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          mode: 'subscription',
          price_id: priceId,
          trial_period_days: 30,
          success_url: success,
          cancel_url: cancel,
          notes: 'premium_owner_subscription'
        })
      });
      const body = await res.json();
      if (!res.ok || !body?.url) throw new Error(body?.error || 'checkout failed');
      window.location.href = body.url;
    } catch (e: any) {
      alert(`決済開始に失敗しました: ${e?.message || e}`);
    }
  };
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
    longitude: null as number | null,
    is_public: false
  });
  
  // 公開/非公開トグル用のstate
  const [isToggleLoading, setIsToggleLoading] = useState(false);
  
  // タブ管理用のstate
  const [activeTab, setActiveTab] = useState<'info' | 'images' | 'coupons' | 'schedule' | 'location' | 'reservation'>('info');
  // 予約管理 state（簡易UI用）
  const [reservationEnabled, setReservationEnabled] = useState(false);
  const [slotUnit, setSlotUnit] = useState<number>(60);
  const [daysAhead, setDaysAhead] = useState<number>(90);
  const [capacity, setCapacity] = useState<number>(10);
  const [autoConfirm, setAutoConfirm] = useState<boolean>(true);
  const [autoMsgEnabled, setAutoMsgEnabled] = useState<boolean>(false);
  const [autoMsgText, setAutoMsgText] = useState<string>('ご予約を受け付けました。お気をつけてお越しください。');
  const [seats, setSeats] = useState<string[]>([]);
  const [newSeat, setNewSeat] = useState('');
  const addSeat = () => {
    const code = newSeat.trim();
    if (!code) return; if (seats.includes(code)) return;
    setSeats((prev) => [...prev, code]); setNewSeat('');
  };
  const removeSeat = (code: string) => setSeats((prev) => prev.filter((s) => s !== code));

  // 営業日管理用のstate
  const [weeklyClosedDays, setWeeklyClosedDays] = useState<boolean[]>([false, false, false, false, false, false, false]); // 日月火水木金土
  const [openingTime, setOpeningTime] = useState('09:00');
  const [closingTime, setClosingTime] = useState('18:00');
  const [specificClosedDates, setSpecificClosedDates] = useState<string[]>([]);
  const [specificOpenDates, setSpecificOpenDates] = useState<string[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const saveReservationSettings = async () => {
    try {
      if (!facility) return;
      // 1st try: すべての項目を保存
      const upsertAll = await supabase.from('facility_reservation_settings').upsert({
        facility_id: facility.id,
        enabled: reservationEnabled,
        slot_unit_minutes: slotUnit,
        allowed_days_ahead: daysAhead,
        auto_confirm: autoConfirm,
        auto_message_enabled: autoMsgEnabled,
        auto_message_text: autoMsgText,
        capacity_per_slot: capacity,
        updated_at: new Date().toISOString(),
      });
      if (upsertAll.error && /auto_message_(enabled|text)/i.test(String(upsertAll.error.message))) {
        // フォールバック: 自動メッセージ列が未導入の環境では、該当列を除いて保存
        const upsertFallback = await supabase.from('facility_reservation_settings').upsert({
          facility_id: facility.id,
          enabled: reservationEnabled,
          slot_unit_minutes: slotUnit,
          allowed_days_ahead: daysAhead,
          auto_confirm: autoConfirm,
          capacity_per_slot: capacity,
          updated_at: new Date().toISOString(),
        });
        if (upsertFallback.error) throw upsertFallback.error;
        setSuccess('予約設定を保存しました（自動メッセージ列が未適用のため一部設定は保留されました）。管理DBで列を追加後に再保存してください。');
      }
      await supabase.from('facility_seats').delete().eq('facility_id', facility.id);
      if (seats.length > 0) {
        await supabase.from('facility_seats').insert(seats.map((s) => ({ facility_id: facility.id, seat_code: s })));
      }
      if (!/自動メッセージ列が未適用/.test(success)) {
        setSuccess('予約設定を保存しました。');
      }
    } catch (e) {
      console.error(e);
      setError('予約設定の保存に失敗しました。');
    }
  };

  // 予約一覧・絞り込み
  const [filterDate, setFilterDate] = useState<string>(''); // 空=全て
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'confirmed'>('all');
  const [previewReservations, setPreviewReservations] = useState<any[]>([]);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<any | null>(null);
  const [confirmMessage, setConfirmMessage] = useState<string>('');
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (activeTab !== 'reservation' || !facility) return;
      try {
        const buildQuery = (withName: boolean) => {
          let q = supabase
            .from('facility_reservations')
            .select(withName
              ? 'id,user_id,customer_name,seat_code,reserved_date,start_time,end_time,status'
              : 'id,user_id,seat_code,reserved_date,start_time,end_time,status'
            )
            .eq('facility_id', facility.id)
            .order('reserved_date', { ascending: true })
            .order('start_time', { ascending: true });
          if (filterDate) q = q.eq('reserved_date', filterDate);
          if (statusFilter !== 'all') q = q.eq('status', statusFilter);
          return q;
        };

        let { data, error } = await buildQuery(true);
        if (error && /customer_name/i.test(String(error.message))) {
          const fallback = await buildQuery(false);
          const res = await fallback;
          data = res.data as any[];
        }
        setPreviewReservations((data || []) as any[]);
      } catch (e) {
        console.warn('failed to load reservations preview', e);
        setPreviewReservations([]);
      }
    };
    void load();
  }, [activeTab, facility, filterDate, statusFilter]);

  const openConfirmModal = (r: any) => {
    setConfirmTarget(r);
    setConfirmMessage(autoMsgEnabled ? (autoMsgText || 'ご予約を受け付けました。お気をつけてお越しください。') : '');
    setConfirmModalOpen(true);
  };

  const formatTime = (t: any) => {
    if (!t) return '';
    return String(t).slice(0, 5); // HH:MM まで
  };

  const formatStatusJa = (s: string) => {
    switch (s) {
      case 'pending': return '予約申請';
      case 'confirmed': return '予約完了';
      case 'cancelled': return 'キャンセル';
      default: return s;
    }
  };

  const handleConfirmReservation = async () => {
    if (!facility || !confirmTarget) return;
    try {
      setIsConfirming(true);
      // 1. 予約を確定に更新
      let ok = false;
      const upd = await supabase
        .from('facility_reservations')
        .update({ status: 'confirmed' })
        .eq('id', confirmTarget.id)
        .select('id,status')
        .maybeSingle();
      if (!upd.error && upd.data) {
        ok = true;
      } else {
        // RLS等で失敗時はNetlify Functionsでフォールバック
        try {
          const res = await fetch('/.netlify/functions/owner-confirm-reservation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reservationId: confirmTarget.id })
          });
          ok = res.ok;
        } catch {}
      }
      if (!ok) throw new Error('Failed to confirm reservation');
      // 先にローカル表示を更新（即時反映）
      setPreviewReservations(prev => prev.map(r => r.id === confirmTarget.id ? { ...r, status: 'confirmed' } : r));

      // 2. メッセージがあれば送信（オーナー→予約者）
      const messageToSend = (confirmMessage && confirmMessage.trim().length > 0)
        ? confirmMessage.trim()
        : (autoMsgEnabled ? (autoMsgText || 'ご予約を受け付けました。お気をつけてお越しください。') : '');
      if (messageToSend) {
        // チャットに投稿（店舗=オーナーとして）
        await supabase.from('community_messages').insert({
          user_id: user?.id,
          facility_id: facility.id,
          content: messageToSend,
          context: 'reservation',
        });
        // アプリ内通知（コミュニティ通知）: 失敗時は Functions 経由でフォールバック
        try {
          const ins = await supabase.from('notifications').insert({
            user_id: confirmTarget.user_id,
            title: '予約受付が完了しました',
            message: `${facility?.name || '店舗'}: ${messageToSend}`,
            link_url: `${window.location.origin}/my-reservations`,
            read: false,
            type: 'reservation_reminder',
            data: {}
          });
          if (ins.error) {
            await fetch('/.netlify/functions/app-notify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: confirmTarget.user_id,
                title: '予約受付が完了しました',
                message: `${facility?.name || '店舗'}: ${messageToSend}`,
                linkUrl: `${window.location.origin}/my-reservations`,
                kind: 'reservation',
              })
            });
          }
        } catch {}
        // LINE等の外部通知
        try {
          const { notifyAppAndLine } = await import('../utils/notify');
          await notifyAppAndLine({
            userId: confirmTarget.user_id,
            title: '予約受付が完了しました',
            message: `${facility?.name || '店舗'}: ${messageToSend}`,
            linkUrl: `${window.location.origin}/my-reservations`,
            kind: 'reservation',
          });
        } catch {}
      }

      // 3. 一覧を再読込（現在の絞り込み条件を反映）
      const buildReload = (withName: boolean) => {
        let q = supabase
          .from('facility_reservations')
          .select(withName
            ? 'id,user_id,customer_name,seat_code,reserved_date,start_time,end_time,status'
            : 'id,user_id,seat_code,reserved_date,start_time,end_time,status'
          )
          .eq('facility_id', facility.id)
          .order('reserved_date', { ascending: true })
          .order('start_time', { ascending: true });
        if (filterDate) q = q.eq('reserved_date', filterDate);
        if (statusFilter !== 'all') q = q.eq('status', statusFilter);
        return q;
      };
      let reload = await buildReload(true);
      let data = reload.data as any[] | null;
      if (reload.error && /customer_name/i.test(String(reload.error.message))) {
        const fallback = await buildReload(false);
        data = fallback.data as any[] | null;
      }
      setPreviewReservations((data || []) as any[]);

      setConfirmModalOpen(false);
      setConfirmTarget(null);
      setConfirmMessage('');
      setSuccess('予約を確定し、メッセージを送信しました。');
    } catch (e) {
      console.error(e);
      setError('予約確定に失敗しました。');
    } finally {
      setIsConfirming(false);
    }
  };

  const generateTimeSlots = (open: string, close: string, unit: number) => {
    const slots: { start: string; end: string }[] = [];
    const [oh, om] = open.split(':').map(Number);
    const [ch, cm] = close.split(':').map(Number);
    let start = new Date(`1970-01-01T${open}:00`);
    const end = new Date(`1970-01-01T${close}:00`);
    // 安全: close が open より前なら何もしない
    if (end <= start) return slots;
    while (start < end) {
      const sH = start.getHours().toString().padStart(2, '0');
      const sM = start.getMinutes().toString().padStart(2, '0');
      const next = new Date(start.getTime() + unit * 60 * 1000);
      if (next > end) break;
      const eH = next.getHours().toString().padStart(2, '0');
      const eM = next.getMinutes().toString().padStart(2, '0');
      slots.push({ start: `${sH}:${sM}`, end: `${eH}:${eM}` });
      start = next;
    }
    return slots;
  };

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
        longitude: facilityData.longitude || null,
        is_public: facilityData.is_public || false
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

      // 予約設定 読み込み
      try {
        const { data: setting } = await supabase
          .from('facility_reservation_settings')
          .select('*')
          .eq('facility_id', facilityId)
          .maybeSingle();
        if (setting) {
          setReservationEnabled(Boolean(setting.enabled));
          setSlotUnit(setting.slot_unit_minutes || 60);
          setDaysAhead(setting.allowed_days_ahead || 90);
          setCapacity(setting.capacity_per_slot || 10);
          setAutoConfirm(Boolean(setting.auto_confirm));
          setAutoMsgEnabled(Boolean((setting as any).auto_message_enabled));
          if ((setting as any).auto_message_text) setAutoMsgText((setting as any).auto_message_text);
        }
        const { data: seatRows } = await supabase
          .from('facility_seats')
          .select('seat_code')
          .eq('facility_id', facilityId);
        setSeats((seatRows || []).map((r: any) => r.seat_code));
      } catch (e) {
        console.warn('Failed to load reservation settings', e);
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
      if ((facilityData as any).specific_open_dates) {
        try {
          const openDates = JSON.parse((facilityData as any).specific_open_dates);
          if (Array.isArray(openDates)) {
            setSpecificOpenDates(openDates);
          }
        } catch (e) {
          console.warn('Failed to parse specific_open_dates:', e);
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

  // 公開・非公開切り替え関数
  const handlePublicToggle = async (isPublic: boolean) => {
    if (!facilityId || !user) return;

    try {
      setIsToggleLoading(true);
      setError('');

      const { error: updateError } = await supabase
        .from('pet_facilities')
        .update({ 
          is_public: isPublic,
          updated_at: new Date().toISOString()
        })
        .eq('id', facilityId)
        .eq('owner_id', user?.id);

      if (updateError) throw updateError;

      // formDataとfacilityデータを更新
      setFormData(prev => ({ ...prev, is_public: isPublic }));
      setFacility(prev => prev ? { ...prev, is_public: isPublic } : null);

      setSuccess(isPublic ? '施設を公開しました' : '施設を非公開にしました');
      // 通知: 公開/非公開切り替え時にオーナーへ案内（アプリ通知+LINE）
      if (isPublic || (!isPublic)) {
        try {
          const { notifyAppAndLineBoth } = await import('@/lib/supabase/notifyAll');
          await notifyAppAndLineBoth({
            userId: user.id!,
            type: isPublic ? 'facility_public_on' : 'facility_public_off',
            title: isPublic ? '施設を公開しました' : '施設を非公開にしました',
            message: isPublic
              ? `${facility?.name || '施設'}が公開になりました。公開ページを確認してください。`
              : `${facility?.name || '施設'}を非公開にしました。必要に応じて再度公開してください。`,
            linkUrl: `${window.location.origin}/parks?view=facilities&facility=${facilityId}`,
          });
        } catch (e) {
          console.warn('facility publish notify failed', e);
        }
      }
      setTimeout(() => setSuccess(''), 3000);

    } catch (error: any) {
      console.error('公開設定更新エラー:', error);
      setError('公開設定の更新に失敗しました: ' + error.message);
    } finally {
      setIsToggleLoading(false);
    }
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
      
      // データを再取得（カテゴリ反映のため）
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
                      const isOverrideOpen = specificOpenDates.includes(dateString);
                      const isToday = new Date().toDateString() === date.toDateString();
                      const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));
                      
                      return (
                        <button
                          key={dateString}
                          onClick={() => {
                            if (isPast) return;
                            if (isWeeklyClosedDay) {
                              if (isOverrideOpen) {
                                setSpecificOpenDates(prev => prev.filter(d => d !== dateString));
                              } else {
                                setSpecificOpenDates(prev => [...prev, dateString]);
                              }
                            } else {
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
                              : isWeeklyClosedDay && !isOverrideOpen
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

      // 営業時間・休業日をまとめて保存（分割更新でのエラー表示を回避）
      const { error: mergedError } = await supabase
        .from('pet_facilities')
        .update({
          opening_time: openingTime,
          closing_time: closingTime,
          // JSONB カラムにはそのまま配列を渡す
          weekly_closed_days: weeklyClosedDays,
          specific_closed_dates: specificClosedDates,
          specific_open_dates: specificOpenDates,
          updated_at: new Date().toISOString()
        })
        .eq('id', facility.id);

      if (mergedError) throw mergedError;

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
            <div className="mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{facility.name}</h1>
              <p className="text-gray-600 mt-1">{facility.address}</p>
              {facility.status === 'approved' && (
                <div className="mt-3">
                  <Link to={`/parks?view=facilities&facility=${facility.id}`}>
                    <Button variant="secondary" className="w-full">
                      <Eye className="w-4 h-4 mr-2" />
                      公開ページ
                    </Button>
                  </Link>
                </div>
              )}
              <div className="flex items-center gap-2 mt-3">
                {getStatusBadge(facility.status)}
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${formData.is_public ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                  {formData.is_public ? '公開' : '非公開'}
                </span>
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
              <nav className="flex flex-wrap gap-3 sm:gap-6 px-4">
                <button
                  onClick={() => setActiveTab('info')}
                  className={`py-3 px-3 border-b-2 font-medium text-sm whitespace-nowrap w-1/3 sm:w-auto text-center ${
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
                  className={`py-3 px-3 border-b-2 font-medium text-sm whitespace-nowrap w-1/3 sm:w-auto text-center ${
                    activeTab === 'images'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <ImageIcon className="w-4 h-4 inline mr-2" />
                  画像管理
                </button>
                <button
                  onClick={() => setActiveTab('location')}
                  className={`py-3 px-3 border-b-2 font-medium text-sm whitespace-nowrap w-1/3 sm:w-auto text-center ${
                    activeTab === 'location'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <MapPin className="w-4 h-4 inline mr-2" />
                  位置調整
                </button>
                <button
                  onClick={() => setActiveTab('schedule')}
                  className={`py-3 px-3 border-b-2 font-medium text-sm whitespace-nowrap w-1/3 sm:w-auto text-center ${
                    activeTab === 'schedule'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Calendar className="w-4 h-4 inline mr-2" />
                  営業日管理
                </button>
                <button
                  onClick={() => setActiveTab('coupons')}
                  className={`py-3 px-3 border-b-2 font-medium text-sm whitespace-nowrap w-1/3 sm:w-auto text-center ${
                    activeTab === 'coupons'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Gift className="w-4 h-4 inline mr-2" />
                  クーポン管理
                  {premium.state !== 'active' && (
                    <span className="ml-1 text-yellow-600" title="プレミアム限定">🔒</span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('reservation')}
                  className={`py-3 px-3 border-b-2 font-medium text-sm whitespace-nowrap w-1/3 sm:w-auto text-center ${
                    activeTab === 'reservation'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Calendar className="w-4 h-4 inline mr-2" />
                  予約管理
                  {premium.state !== 'active' && (
                    <span className="ml-1 text-yellow-600" title="プレミアム限定">🔒</span>
                  )}
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
                                  id={`basic-image-replace-${index}`}
                                />
                                <label
                                  htmlFor={`basic-image-replace-${index}`}
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
                              id="basic-image-add"
                            />
                            <label
                              htmlFor="basic-image-add"
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
              {activeTab === 'reservation' && (
                <div>
                  <h2 className="text-xl font-semibold mb-6 flex items-center">
                    <Calendar className="w-6 h-6 text-blue-600 mr-2" />
                    予約管理
                  </h2>
                  {premium.state !== 'active' && (
                    <div className="max-w-2xl mb-6">
                      <div className="p-4 border rounded bg-yellow-50">
                        <div className="font-semibold mb-1">この機能はプレミアム会員限定です（初月無料）</div>
                        <div className="text-sm">
                          月額¥500の <strong>プレミアムオーナー会員</strong> には、
                          <strong>予約管理</strong>（受付・カレンダー・上限制御）に加えて
                          <strong>クーポン管理</strong>（発行・配布・使用履歴）も含まれます。
                        </div>
                      </div>
                    </div>
                  )}
                  <p className="text-sm text-gray-600 mb-4">時間単位の予約、客席コード、受付期間を設定します。公開ページからユーザーが予約できます。</p>

                  {/* 基本設定（1行ずつ） */}
                  <div className="bg-white rounded-lg border p-4 mb-6 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center space-x-2">
                        <input type="checkbox" className="h-4 w-4" checked={reservationEnabled} onChange={(e) => setReservationEnabled(e.target.checked)} disabled={premium.state !== 'active'} />
                        <span>予約を受け付ける</span>
                      </label>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">予約単位</span>
                      <select className="border rounded px-2 py-1" value={slotUnit} onChange={(e) => setSlotUnit(Number(e.target.value))} disabled={premium.state !== 'active'}>
                        {[15,30,45,60,90,120].map((m) => (
                          <option key={m} value={m}>{m}分</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">受付可能日数</span>
                      <div className="flex items-center space-x-2">
                        <input type="number" min={1} max={365} className="border rounded px-2 py-1 w-24 text-right" value={daysAhead} onChange={(e) => setDaysAhead(Number(e.target.value))} disabled={premium.state !== 'active'} />
                        <span className="text-sm text-gray-600">日先</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">仮予約の自動承認</span>
                      <label className="flex items-center space-x-2">
                        <input type="checkbox" className="h-4 w-4" checked={autoConfirm} onChange={(e) => setAutoConfirm(e.target.checked)} disabled={premium.state !== 'active'} />
                        <span>自動で予約確定にする</span>
                      </label>
                    </div>
                    <div className="mt-2">
                      <label className="flex items-center space-x-2 mb-2">
                        <input type="checkbox" className="h-4 w-4" checked={autoMsgEnabled} onChange={(e)=>setAutoMsgEnabled(e.target.checked)} disabled={premium.state !== 'active'} />
                        <span className="text-sm text-gray-700">予約確定時にデフォルトメッセージを自動送信</span>
                      </label>
                      <textarea className="w-full border rounded px-2 py-1 text-sm" rows={3} value={autoMsgText} onChange={(e)=>setAutoMsgText(e.target.value)} disabled={premium.state !== 'active'} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">同一時間キャパ</span>
                      <input type="number" min={1} max={1000} className="border rounded px-2 py-1 w-24 text-right" value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} disabled={premium.state !== 'active'} />
                    </div>
                    <div className="flex justify-end pt-2">
                      <Button onClick={saveReservationSettings} disabled={premium.state !== 'active'}>設定を保存</Button>
                    </div>
                  </div>

                  {/* 客席管理 */}
                  <div className="bg-white rounded-lg border p-4 mb-6">
                    <h3 className="font-semibold mb-3">客席（席コード）</h3>
                    <p className="text-sm text-gray-600 mb-3">
                      任意です。登録すると予約時にお客さまが座席を選択して予約できます。未登録の場合は公開ページの座席指定欄は非表示になります。
                    </p>
                    <div className="flex space-x-2 mb-3">
                      <input className="border rounded px-2 py-1 flex-1" placeholder="例: A1,B,4人席,個室 など" value={newSeat} onChange={(e) => setNewSeat(e.target.value)} />
                      <Button onClick={addSeat} variant="secondary">追加</Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {seats.map((s) => (
                        <div key={s} className="px-3 py-1 bg-gray-100 rounded-full flex items-center space-x-2">
                          <span>{s}</span>
                          <button className="text-red-600" onClick={() => removeSeat(s)}>×</button>
                        </div>
                      ))}
                      {seats.length === 0 && <p className="text-sm text-gray-500">まだ客席が登録されていません</p>}
                    </div>
                  </div>

                  {/* 一覧プレビュー */}
                  <div className="bg-white rounded-lg border p-4 mb-6">
                    <h3 className="font-semibold mb-3">予約一覧</h3>
                    <div className="flex flex-wrap items-center gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">対象日</span>
                        <input type="date" className="border rounded px-2 py-1" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
                        {filterDate && (
                          <button className="text-xs text-blue-600 underline" onClick={()=>setFilterDate('')}>クリア</button>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">状態</span>
                        <select className="border rounded px-2 py-1" value={statusFilter} onChange={(e)=>setStatusFilter(e.target.value as any)}>
                          <option value="all">すべて</option>
                          <option value="pending">未確定</option>
                          <option value="confirmed">確定済み</option>
                        </select>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="text-left px-3 py-2 border">日付</th>
                            <th className="text-left px-3 py-2 border">予約者</th>
                            <th className="text-left px-3 py-2 border">席</th>
                            <th className="text-left px-3 py-2 border">予約時間</th>
                            <th className="text-left px-3 py-2 border">状態</th>
                            <th className="text-left px-3 py-2 border">操作</th>
                          </tr>
                        </thead>
                        <tbody>
                          {previewReservations.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="px-3 py-4 border text-center text-gray-500">予約はありません</td>
                            </tr>
                          ) : (
                            previewReservations.map((r, idx) => (
                              <tr key={idx} className="hover:bg-gray-50">
                                <td className="px-3 py-2 border">{r.reserved_date}</td>
                                <td className="px-3 py-2 border">{r.customer_name || '—'}</td>
                                <td className="px-3 py-2 border">{r.seat_code}</td>
                                <td className="px-3 py-2 border">{formatTime(r.start_time)}</td>
                                <td className="px-3 py-2 border">{formatStatusJa(r.status)}</td>
                                <td className="px-3 py-2 border">
                                  {r.status === 'pending' ? (
                                    <Button size="sm" onClick={() => openConfirmModal(r)}>予約確定</Button>
                                  ) : (
                                    <span className="text-gray-400">—</span>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* 注意 */}
                  <div className="text-xs text-gray-500">営業日カレンダーで「営業日」のみ予約受付します。公開ページの施設詳細に予約ボタンを表示します。</div>
                </div>
              )}

              {/* 予約確定モーダル */}
              {confirmModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                  <div className="bg-white rounded-lg w-full max-w-md p-4">
                    <h4 className="font-semibold mb-3">予約を確定してメッセージ送信</h4>
                    <div className="text-sm text-gray-600 mb-2">予約者へ以下のメッセージを送信します。</div>
                    <textarea
                      className="w-full border rounded px-2 py-1 text-sm"
                      rows={4}
                      value={confirmMessage}
                      onChange={(e)=>setConfirmMessage(e.target.value)}
                      placeholder="例: ご予約を受け付けました。お気をつけてお越しください。"
                    />
                    <div className="flex justify-end gap-2 mt-4">
                      <Button variant="secondary" onClick={()=>{setConfirmModalOpen(false); setConfirmMessage('');}}>キャンセル</Button>
                      <Button onClick={handleConfirmReservation} isLoading={isConfirming}>予約確定して送信</Button>
                    </div>
                  </div>
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
                              id={`images-tab-replace-${index}`}
                            />
                            <label
                              htmlFor={`images-tab-replace-${index}`}
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
                          id="images-tab-add"
                        />
                        <label
                          htmlFor="images-tab-add"
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
                  {premium.state !== 'active' ? (
                    <div className="max-w-2xl">
                      <div className="mb-4 text-sm text-gray-700">
                        クーポン管理はプレミアム会員向け機能です（初月無料・月額¥500）。
                        このプランには <strong>予約管理</strong>（受付・カレンダー・上限制御）も含まれます。
                      </div>
                      {/* PremiumPaywall を軽量に内側で再利用 */}
                      <div className="mb-6">
                        <div className="p-4 border rounded bg-yellow-50">
                          <div className="font-semibold mb-1">プレミアムオーナー会員（月額¥500／初月無料）</div>
                          <div className="text-sm mb-3">クーポン発行・配布・使用履歴に加えて、予約管理（受付・カレンダー・上限制御）もご利用いただけます。</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <CouponManager 
                      facilityId={facility.id} 
                      facilityName={facility.name}
                    />
                  )}
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

          {/* 公開・非公開設定（基本情報タブでのみ表示） */}
          {activeTab === 'info' && facility?.status === 'approved' && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-6 flex items-center">
                <Eye className="w-6 h-6 text-blue-600 mr-2" />
                公開設定
              </h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 mb-1">施設の公開状態</h3>
                    <p className="text-sm text-gray-600">
                      公開設定を切り替えることで、施設を一覧に表示するかどうかを制御できます。
                    </p>
                  </div>
                  
                  <div className="ml-4">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.is_public}
                        onChange={(e) => handlePublicToggle(e.target.checked)}
                        disabled={isToggleLoading}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 text-sm">
                  <div className={`w-3 h-3 rounded-full ${formData.is_public ? 'bg-green-500' : 'bg-yellow-500'}`} />
                  <span className="font-medium">
                    {formData.is_public ? '公開中' : '非公開'}
                  </span>
                </div>
                
                {!formData.is_public && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start">
                      <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 mr-2" />
                      <div className="text-sm text-yellow-800">
                        <strong>注意:</strong> 非公開設定中は、施設が一覧に表示されず、新しい利用者からの予約を受け付けできません。
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

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

          {/* 初月無料CTA（ページ最下部） */}
          {premium.state !== 'active' && (
            <div className="max-w-4xl mx-auto px-4 py-6">
              <Button onClick={startCheckout} className="w-full bg-orange-500 hover:bg-orange-600">
                初月無料で試す
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
} 