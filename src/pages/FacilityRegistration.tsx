import {
    AlertCircle,
    Building,
    CheckCircle,
    Image as ImageIcon
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import ImageCropper from '../components/ImageCropper';
import Input from '../components/Input';
import { LocationEditMap } from '../components/LocationEditMap';
import useAuth from '../context/AuthContext';
import { usePremiumOwner } from '../hooks/usePremiumOwner';
import { geocodeAddress } from '../utils/geocoding';
import { supabase } from '../utils/supabase';

interface FacilityForm {
  name: string;
  category_id: string;
  address: string;
  phone: string;
  website: string;
  description: string;
}

const FACILITY_CATEGORIES = [
  { id: 'pet_hotel', name: 'ペットホテル', monthly_fee: 5000, is_free: true },
  { id: 'pet_salon', name: 'ペットサロン', monthly_fee: 3000, is_free: true },
  { id: 'veterinary', name: '動物病院', monthly_fee: 8000, is_free: true },
  { id: 'pet_cafe', name: 'ペットカフェ', monthly_fee: 4000, is_free: true },
  { id: 'pet_restaurant', name: 'ペット同伴レストラン', monthly_fee: 6000, is_free: true },
  { id: 'pet_shop', name: 'ペットショップ', monthly_fee: 7000, is_free: true },
  { id: 'pet_accommodation', name: 'ペット同伴宿泊', monthly_fee: 10000, is_free: true },
  { id: 'dog_training', name: 'しつけ教室', monthly_fee: 4500, is_free: true },
  { id: 'pet_friendly_other', name: 'その他ワンちゃん同伴可能施設', monthly_fee: 3500, is_free: true }
];

export default function FacilityRegistration() {
  const { user, isAuthenticated, userProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const premium = usePremiumOwner();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  
  // ユーザー情報の収集UIは廃止（登録者情報確認のカードを削除）

  const [formData, setFormData] = useState<FacilityForm>({
    name: '',
    category_id: '',
    address: '',
    phone: '',
    website: '',
    description: ''
  });
  const [isUserSubmission, setIsUserSubmission] = useState<boolean>(true); // 一般投稿モード（初期有効）
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [showImageCropper, setShowImageCropper] = useState(false);
  const [rawImageFile, setRawImageFile] = useState<File | null>(null);
  const [selectedLat, setSelectedLat] = useState<number | null>(null);
  const [selectedLng, setSelectedLng] = useState<number | null>(null);
  const startCheckout = async () => {
    const priceId = import.meta.env.VITE_PREMIUM_OWNER_PRICE_ID as string | undefined;
    if (!priceId) { alert('環境変数 VITE_PREMIUM_OWNER_PRICE_ID が未設定です'); return; }
    try {
      const { data: session } = await supabase.auth.getSession();
      const accessToken = session.session?.access_token;
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`;
      const success = `${window.location.origin}/payment-return?success=true`;
      const cancel = `${window.location.origin}/payment-return?canceled=true`;
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${accessToken}` }, body: JSON.stringify({ mode: 'subscription', price_id: priceId, trial_period_days: 30, success_url: success, cancel_url: cancel, notes: 'premium_owner_subscription_from_facility_registration' }) });
      const body = await res.json();
      if (!res.ok || !body?.url) throw new Error(body?.error || 'checkout failed');
      window.location.href = body.url;
    } catch (e:any) { alert(`決済開始に失敗しました: ${e?.message || e}`); }
  };

  // 認証チェック
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  // クエリ ?mode=user|owner で初期選択を切り替え
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search);
      const mode = params.get('mode');
      if (mode === 'owner') setIsUserSubmission(false);
      if (mode === 'user') setIsUserSubmission(true);
    } catch {}
  }, [location.search]);

  // 登録者情報確認のUIは削除したため、関連処理は行いません

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // （削除）ユーザー情報編集関連のハンドラーは不要

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAuthenticated || !user) {
      setError('認証が必要です');
      return;
    }

    // 基本情報の必須チェック
    if (!formData.name || !formData.category_id || !formData.address) {
      setError('施設名、カテゴリ、住所は必須項目です');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      // 住所から緯度・経度を取得（地図で選択が優先）
      console.log(`📍 住所をジオコーディング中: ${formData.address}`);
      const geocodeResult = await geocodeAddress(formData.address);
      let latitude = selectedLat ?? null;
      let longitude = selectedLng ?? null;
      if (latitude === null || longitude === null) {
        if (geocodeResult) {
          latitude = geocodeResult.latitude;
          longitude = geocodeResult.longitude;
          console.log(`✅ ジオコーディング成功: ${latitude}, ${longitude}`);
        } else {
          console.warn('⚠️ ジオコーディングに失敗しました。住所のみで登録を続行します。');
        }
      }

      // 施設情報を登録（段階的フォールバック付き）
      const selectedCategoryName = (FACILITY_CATEGORIES.find(c => c.id === formData.category_id)?.name) || formData.category_id;
      const basePayload: any = {
        name: formData.name,
        // まずは新スキーマの category_id を使用
        category_id: formData.category_id,
        address: formData.address,
        latitude: latitude,
        longitude: longitude,
        phone: formData.phone || null,
        website: formData.website || null,
        description: formData.description || null,
        owner_id: isUserSubmission ? null : user.id,
        status: 'pending',
        is_public: true
      };
      const newFlags: any = {
        is_user_submitted: isUserSubmission,
        submitted_by: isUserSubmission ? user.id : null,
        verified: isUserSubmission ? false : true,
        official_badge: isUserSubmission ? false : true
      };

      const attemptInsert = async (payload: any) => {
        return await supabase
          .from('pet_facilities')
          .insert(payload)
          .select()
          .single();
      };

      let facilityData: any | null = null;
      let facilityError: any | null = null;

      // 1) 新スキーマ（新フラグ含む）
      ({ data: facilityData, error: facilityError } = await attemptInsert({ ...basePayload, ...newFlags }));

      // 2) is_user_submitted 等が無い場合 → これらを外して再試行
      if (facilityError) {
        const msg = `${facilityError?.message || ''} ${facilityError?.details || ''}`;
        if (msg.includes('is_user_submitted')) {
          ({ data: facilityData, error: facilityError } = await attemptInsert({ ...basePayload }));
        }
      }

      // 3) category_id が無い旧スキーマの場合 → category に名称で再試行
      if (facilityError) {
        const msg = `${facilityError?.message || ''} ${facilityError?.details || ''}`;
        if (msg.includes('category_id')) {
          const legacyPayload = { ...basePayload } as any;
          delete legacyPayload.category_id;
          legacyPayload.category = selectedCategoryName;
          ({ data: facilityData, error: facilityError } = await attemptInsert(legacyPayload));
        }
      }

      // 4) owner_id が無い環境の場合 → owner_id を外して再試行
      if (facilityError) {
        const msg = `${facilityError?.message || ''} ${facilityError?.details || ''}`;
        if (msg.includes('owner_id')) {
          const payload = { ...basePayload } as any;
          delete payload.owner_id;
          ({ data: facilityData, error: facilityError } = await attemptInsert(payload));
        }
      }

      if (facilityError) throw facilityError;

      // 画像1枚（任意）を一般投稿時に保存
      try {
        if (isUserSubmission && imageFile && facilityData?.id) {
          const key = `${facilityData.id}/${Date.now()}_${imageFile.name}`;
          const up = await supabase.storage.from('pet-facility-images').upload(key, imageFile, { cacheControl: '31536000' });
          if (!up.error) {
            const { data: pub } = supabase.storage.from('pet-facility-images').getPublicUrl(key);
            await supabase.from('pet_facility_images').insert({
              facility_id: facilityData.id,
              image_url: pub.publicUrl,
              image_type: 'main',
              display_order: 0
            });
          }
        }
      } catch {}

      const successMsg = isUserSubmission
        ? '一般投稿として仮掲載されました。オーナーが管理すると公式表示になります。'
        : (geocodeResult 
            ? '施設の申請が正常に送信されました。地図上での正確な位置も設定されています。承認をお待ちください。'
            : '施設の申請が正常に送信されました。（位置情報は後ほど設定されます）承認をお待ちください。');
      
      setSuccessMessage(successMsg);
      try {
        const linkUrl = `${window.location.origin}/my-facilities-management`;
        const { notifyAppAndLine } = await import('../utils/notify');
        await notifyAppAndLine({
          userId: user.id,
          title: '施設申請を受け付けました',
          message: '審査結果はアプリ内で通知します。',
          linkUrl,
          kind: 'alert'
        });
      } catch {}
      
      // フォームをリセット
      setFormData({
        name: '',
        category_id: '',
        address: '',
        phone: '',
        website: '',
        description: ''
      });
      setImageFile(null);

    } catch (err) {
      console.error('Error submitting facility:', err);
      setError('申請の送信に失敗しました。再度お試しください。');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 pt-6 md:pt-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">ペット関連施設登録</h1>
        <p className="text-gray-600">
          あなたが知ってるワンちゃん同伴可能なお店などを投稿しましょう
        </p>
      </div>

      {/* エラーメッセージ */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      )}

      {/* 成功メッセージ */}
      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
            <span className="text-green-700">{successMessage}</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 投稿モードのカードは削除 */}
        {/* 位置の指定（あいまい検索 + 地図で決定） */}
        {(isUserSubmission || premium.state === 'active') && (
        <Card>
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              位置の指定（地図で決定）
            </h2>
            <div className="mb-3 text-sm text-gray-600">
              住所をあいまい検索して、地図上のマーカーをドラッグまたは地図をクリックして確定できます。
            </div>
            <LocationEditMap
              initialAddress={formData.address}
              onLocationChange={(lat, lng, addr) => {
                setSelectedLat(lat);
                setSelectedLng(lng);
                if (addr && addr !== formData.address) {
                  setFormData(prev => ({ ...prev, address: addr }));
                } else {
                  // 住所が未提供の場合のフォールバック（REST Geocoding）
                  const key = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY_MOBILE || import.meta.env.VITE_GOOGLE_MAPS_API_KEY);
                  if (key) {
                    void (async () => {
                      try {
                        const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&language=ja&region=JP&key=${key}`;
                        const res = await fetch(url, { credentials: 'omit' });
                        const json = await res.json();
                        const formatted = json?.status === 'OK' ? (json.results?.[0]?.formatted_address as string | undefined) : undefined;
                        if (formatted) {
                          setFormData(prev => ({ ...prev, address: formatted }));
                        }
                      } catch {}
                    })();
                  }
                }
              }}
            />
            {selectedLat !== null && selectedLng !== null && (
              <div className="mt-2 text-xs text-gray-600">現在位置: {selectedLat.toFixed(6)}, {selectedLng.toFixed(6)}</div>
            )}
          </div>
        </Card>
        )}
        {/* 基本情報（プレミアム未加入のオーナー申請では非表示） */}
        {(isUserSubmission || premium.state === 'active') && (
        <Card>
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Building className="w-6 h-6 mr-2" />
              基本情報
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  施設名 <span className="text-red-500">*</span>
                </label>
                <Input
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="施設名を入力してください"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  施設カテゴリ <span className="text-red-500">*</span>
                </label>
                <select
                  name="category_id"
                  value={formData.category_id}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">カテゴリを選択してください</option>
                  {FACILITY_CATEGORIES.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  住所 <span className="text-red-500">*</span>
                </label>
                <Input
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="住所を入力してください"
                  required
                />
              </div>

              {isUserSubmission ? (
                <div className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded p-3">
                  一般投稿では、登録時に必要なのは「施設名」と「住所」のみです。<br/>
                  電話番号・ウェブサイト・詳細説明などの設定は、オーナー権限（プレミアム会員）に切り替えてから編集できます。
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">電話番号</label>
                    <Input name="phone" value={formData.phone} onChange={handleInputChange} placeholder="電話番号を入力してください" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">ウェブサイト</label>
                    <Input name="website" value={formData.website} onChange={handleInputChange} placeholder="https://example.com" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">施設説明</label>
                    <textarea name="description" value={formData.description} onChange={handleInputChange} rows={4} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="施設の特徴やサービス内容を説明してください" />
                  </div>
                </>
              )}
            </div>
          </div>
        </Card>
        )}

        {/* 画像アップロード（一般投稿時は1枚まで） */}
        {(isUserSubmission || premium.state === 'active') && (
        <Card>
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <ImageIcon className="w-6 h-6 mr-2" />
              画像アップロード
            </h2>
            {isUserSubmission ? (
              <div className="space-y-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e)=>{
                    const f = e.target.files?.[0] || null;
                    if (f) { setRawImageFile(f); setShowImageCropper(true); }
                  }}
                />
                {imageFile && (
                  <div className="mt-2 text-xs text-gray-600">選択済み: {imageFile.name}</div>
                )}
                <p className="text-xs text-gray-500">一般投稿では画像は1枚までです。1:1でトリミングされ、サムネイルとして使用されます。</p>
              </div>
            ) : (
              <p className="text-sm text-gray-600">オーナー申請では登録後に施設編集から複数画像を管理できます。</p>
            )}
          </div>
        </Card>
        )}

        {showImageCropper && rawImageFile && (
          <ImageCropper
            imageFile={rawImageFile}
            onCropComplete={(blob)=>{
              const f = new File([blob], 'facility_main.webp', { type: 'image/webp' });
              setImageFile(f);
              setShowImageCropper(false);
              setRawImageFile(null);
            }}
            onCancel={()=>{ setShowImageCropper(false); setRawImageFile(null); }}
            aspectRatio={1}
            maxWidth={1024}
            maxHeight={1024}
          />
        )}

        {/* 登録者情報確認カードは削除 */}

        {/* 申請ボタン（オーナー無料登録も可能） */}
        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading} className="px-8 py-3 text-lg">
            {isLoading ? '申請中...' : '申請を送信'}
          </Button>
        </div>

        {/* オーナー申請かつ未加入時のペイウォール */}
        {!isUserSubmission && premium.state !== 'active' && (
          <Card>
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-3">お店のオーナー様ですか？</h2>
              <p className="text-sm text-gray-700 leading-relaxed">
                お店単位での登録と契約が必要です。プレミアム会員（月額500円）にご加入いただくと、
                お店情報の編集（電話番号・ウェブサイト・説明）、定休日/営業時間設定、予約管理、クーポン配布の機能が使用可能となります。
              </p>
              <div className="mt-4">
                <Button onClick={startCheckout} className="w-full sm:w-auto bg-black hover:bg-gray-900 text-white">
                  プレミアム会員に申し込む
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-3">決済完了後に基本情報の入力項目が表示されます。</p>
            </div>
          </Card>
        )}
      </form>
    </div>
  );
}
