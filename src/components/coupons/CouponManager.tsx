import {
    Calendar,
    Eye,
    Gift,
    Image as ImageIcon,
    Info,
    Plus,
    Save,
    Trash2,
    Users
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { CouponFormData, CouponStats, FacilityCoupon } from '../../types/coupons';
import { supabase } from '../../utils/supabase';
import Button from '../Button';
import Card from '../Card';
import ImageCropper from '../ImageCropper';

interface CouponManagerProps {  
  facilityId: string;
  facilityName: string;
}

export function CouponManager({ facilityId, facilityName }: CouponManagerProps) {
  const [coupons, setCoupons] = useState<FacilityCoupon[]>([]);
  const [couponStats, setCouponStats] = useState<Record<string, CouponStats>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<FacilityCoupon | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // フォーム関連state
  const [formData, setFormData] = useState<CouponFormData>({
    title: '',
    description: '',
    service_content: '',
    discount_type: 'amount',
    start_date: '',
    end_date: '',
    usage_limit_type: 'once'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [couponImageFile, setCouponImageFile] = useState<File | null>(null);
  const [showImageCropper, setShowImageCropper] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>('');

  useEffect(() => {
    fetchCoupons();
  }, [facilityId]);

  const fetchCoupons = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('facility_coupons')
        .select('*')
        .eq('facility_id', facilityId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setCoupons(data || []);

      // 各クーポンの統計情報を取得
      if (data?.length) {
        const statsPromises = data.map(async (coupon) => {
          const { data: stats } = await supabase
            .rpc('get_coupon_stats', { coupon_uuid: coupon.id });
          return { couponId: coupon.id, stats };
        });

        const statsResults = await Promise.all(statsPromises);
        const statsMap = statsResults.reduce((acc, { couponId, stats }) => {
          acc[couponId] = stats;
          return acc;
        }, {} as Record<string, CouponStats>);

        setCouponStats(statsMap);
      }
    } catch (error) {
      setError('クーポン情報の取得に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      service_content: '',
      discount_type: 'amount',
      start_date: '',
      end_date: '',
      usage_limit_type: 'once'
    });
    setCouponImageFile(null);
    setImagePreview('');
    setEditingCoupon(null);
    setShowCreateForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      // バリデーション
      if (!formData.title.trim()) throw new Error('クーポンタイトルを入力してください。');
      if (!formData.service_content.trim()) throw new Error('サービス内容を入力してください。');
      if (!formData.start_date) throw new Error('開始日を入力してください。');
      if (!formData.end_date) throw new Error('終了日を入力してください。');
      
      const startDate = new Date(formData.start_date);
      const endDate = new Date(formData.end_date);
      if (endDate <= startDate) throw new Error('終了日は開始日より後である必要があります。');

      let couponImageUrl = editingCoupon?.coupon_image_url || '';

      // 画像のアップロード処理
      if (couponImageFile) {
        const timestamp = Date.now();
        const filename = `coupon_${facilityId}_${timestamp}.jpg`;
        const filePath = `${facilityId}/${filename}`;
        
        const { error: uploadError } = await supabase.storage
          .from('pet-facility-images')
          .upload(filePath, couponImageFile, {
            contentType: 'image/jpeg',
            upsert: true
          });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('pet-facility-images')
          .getPublicUrl(filePath);

        couponImageUrl = urlData.publicUrl;
      }

      const couponData = {
        facility_id: facilityId,
        title: formData.title.trim(),
        description: formData.description.trim(),
        service_content: formData.service_content.trim(),
        coupon_image_url: couponImageUrl || null,
        discount_value: formData.discount_value || null,
        discount_type: formData.discount_type,
        start_date: formData.start_date,
        end_date: formData.end_date,
        usage_limit_type: formData.usage_limit_type,
        max_uses: formData.usage_limit_type === 'once' ? 1 : null,
        updated_at: new Date().toISOString()
      };

      if (editingCoupon) {
        // 更新
        const { error } = await supabase
          .from('facility_coupons')
          .update(couponData)
          .eq('id', editingCoupon.id);

        if (error) throw error;
        setSuccess('クーポンが更新されました！');
      } else {
        // 新規作成
        const { error } = await supabase
          .from('facility_coupons')
          .insert(couponData);

        if (error) throw error;
        setSuccess('クーポンが作成されました！');
      }

      resetForm();
      fetchCoupons();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'クーポンの保存に失敗しました。');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (coupon: FacilityCoupon) => {
    setEditingCoupon(coupon);
    setFormData({
      title: coupon.title || '',
      description: coupon.description || '',
      service_content: coupon.service_content || '',
      discount_value: coupon.discount_value || 0,
      discount_type: coupon.discount_type || 'percentage',
      start_date: coupon.start_date ? coupon.start_date.split('T')[0] : '',
      end_date: coupon.end_date ? coupon.end_date.split('T')[0] : '',
      usage_limit_type: coupon.usage_limit_type || 'unlimited'
    });
    setImagePreview(coupon.coupon_image_url || '');
    setShowCreateForm(true);
  };

  const handleDelete = async (couponId: string) => {
    if (!window.confirm('このクーポンを削除しますか？この操作は取り消せません。')) return;

    try {
      const { error } = await supabase
        .from('facility_coupons')
        .delete()
        .eq('id', couponId);

      if (error) throw error;

      setSuccess('クーポンが削除されました。');
      fetchCoupons();
    } catch (error) {
      setError('クーポンの削除に失敗しました。');
    }
  };

  const handleToggleActive = async (coupon: FacilityCoupon) => {
    try {
      const { error } = await supabase
        .from('facility_coupons')
        .update({ is_active: !coupon.is_active })
        .eq('id', coupon.id);

      if (error) throw error;

      setSuccess(coupon.is_active ? 'クーポンを無効化しました。' : 'クーポンを有効化しました。');
      fetchCoupons();
    } catch (error) {
      setError('クーポンの状態変更に失敗しました。');
    }
  };

  const handleImageSelect = (file: File) => {
    setCouponImageFile(file);
    setShowImageCropper(true);
  };

  const handleCropComplete = (croppedFile: File) => {
    const imageUrl = URL.createObjectURL(croppedFile);
    setImagePreview(imageUrl);
    setFormData({...formData, coupon_image: croppedFile});
    setCouponImageFile(croppedFile);
    setShowImageCropper(false);
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <Gift className="w-5 h-5 mr-2 text-pink-500" />
            クーポン管理
          </h2>
          <p className="text-sm text-gray-600 mt-1">お客様向けのクーポンを作成・管理できます</p>
        </div>
        <Button 
          onClick={() => setShowCreateForm(true)}
          className="flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          クーポン作成
        </Button>
      </div>

      {/* エラー・成功メッセージ */}
      {error && (
        <div className="bg-red-100 border border-red-300 text-red-800 rounded-lg p-4">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-100 border border-green-300 text-green-800 rounded-lg p-4">
          {success}
        </div>
      )}

      {/* クーポン作成・編集フォーム */}
      {showCreateForm && (
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">
              {editingCoupon ? 'クーポン編集' : 'クーポン作成'}
            </h3>
            <Button 
              variant="secondary" 
              onClick={resetForm}
              className="text-sm"
            >
              キャンセル
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* 左側：フォーム入力エリア */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      クーポンタイトル *
                    </label>
                    <input
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      placeholder="例：初回利用10%OFF"
                      maxLength={100}
                      required
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      割引設定
                    </label>
                    <div className="flex space-x-2 items-center">
                      <select
                        value={formData.discount_type}
                        onChange={(e) => setFormData({...formData, discount_type: e.target.value as 'amount' | 'percentage'})}
                        className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                      >
                        <option value="amount">金額</option>
                        <option value="percentage">割引率</option>
                      </select>
                      <input
                        type="number"
                        value={formData.discount_value || ''}
                        onChange={(e) => setFormData({...formData, discount_value: e.target.value ? parseInt(e.target.value) : undefined})}
                        placeholder={formData.discount_type === 'amount' ? '500' : '10'}
                        className="w-24 text-lg font-medium text-center border border-gray-300 rounded-md px-3 py-2"
                      />
                      <span className="flex items-center text-lg text-gray-700 font-medium">
                        {formData.discount_type === 'amount' ? '円' : '%'}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    サービス内容 *
                  </label>
                  <textarea
                    value={formData.service_content}
                    onChange={(e) => setFormData({...formData, service_content: e.target.value})}
                    placeholder="トリミング10%OFF"
                    rows={3}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    詳細説明
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="おひとり様初回1回限定です"
                    rows={3}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      開始日時 *
                    </label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                      required
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      終了日時 *
                    </label>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                      required
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    使用制限
                  </label>
                  <select
                    value={formData.usage_limit_type}
                    onChange={(e) => setFormData({...formData, usage_limit_type: e.target.value as 'once' | 'unlimited'})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value="unlimited">何回でも</option>
                    <option value="once">1回限り</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ご用意頂いた画像にする場合は画像アップロードしてください。
                  </label>
                  <div className="flex items-center space-x-4">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => document.getElementById('coupon-image-input')?.click()}
                      className="flex items-center"
                    >
                      <ImageIcon className="w-4 h-4 mr-2" />
                      画像を選択
                    </Button>
                    {imagePreview && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setImagePreview('');
                          setCouponImageFile(null);
                          const newFormData = {...formData};
                          delete newFormData.coupon_image;
                          setFormData(newFormData);
                        }}
                        className="text-red-600 hover:text-red-700"
                      >
                        画像を削除
                      </Button>
                    )}
                  </div>
                  <input
                    id="coupon-image-input"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageSelect(file);
                    }}
                    className="hidden"
                  />
                </div>
              </div>

              {/* 右側：プレビューエリア */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    クーポンプレビュー
                  </label>
                  <div className="w-full max-w-sm mx-auto">
                    {imagePreview ? (
                      // 画像クーポンの表示
                      <div className="aspect-square w-full border-2 border-gray-300 rounded-lg overflow-hidden">
                        <img
                          src={imagePreview}
                          alt="クーポン画像"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      // 文字クーポンの表示
                      <div className="aspect-square w-full border-2 border-gray-300 rounded-lg relative overflow-hidden">
                        {/* チケット風の背景 */}
                        <div className="w-full h-full bg-gradient-to-br from-red-500 to-red-600 relative">
                          {/* チケットの切り込み装飾 */}
                          <div className="absolute top-1/2 -left-3 w-6 h-6 bg-white rounded-full transform -translate-y-1/2"></div>
                          <div className="absolute top-1/2 -right-3 w-6 h-6 bg-white rounded-full transform -translate-y-1/2"></div>
                          
                          {/* 背景の薄い「COUPON」テキスト */}
                          <div className="absolute inset-0 flex items-center justify-center opacity-10">
                            <span className="text-6xl font-bold text-white transform rotate-12">
                              COUPON
                            </span>
                          </div>
                          
                          {/* メインコンテンツ */}
                          <div className="relative z-10 flex flex-col items-center justify-center h-full p-4 text-center space-y-3">
                            {/* ドッグパークJPクーポン（一番上） */}
                            <div className="bg-white/95 px-3 py-1 rounded-full shadow-sm">
                              <span className="text-xs font-medium text-red-600">
                                ドッグパークJPクーポン
                              </span>
                            </div>
                            
                            {/* 店舗名（2番目） */}
                            <div className="text-white">
                              <h2 className="text-lg font-bold leading-tight">
                                {facilityName}
                              </h2>
                            </div>
                            
                            {/* クーポンタイトル */}
                            <div className="text-white">
                              <h3 className="text-xl font-bold leading-tight">
                                {formData.title || 'クーポンタイトル'}
                              </h3>
                            </div>
                            
                            {/* サービス内容 */}
                            <div className="text-white/90">
                              <p className="text-base leading-tight">
                                {formData.service_content || 'サービス内容'}
                              </p>
                            </div>
                            
                            {/* 割引表示 */}
                            {(formData.discount_value && formData.discount_type) && (
                              <div className="bg-white text-red-600 px-6 py-3 rounded-lg shadow-md">
                                <span className="text-4xl font-bold">
                                  {formData.discount_value}{formData.discount_type === 'amount' ? '円' : '%'}
                                </span>
                                <span className="text-lg ml-2 font-medium">
                                  OFF
                                </span>
                              </div>
                            )}
                            
                            {/* 詳細説明 */}
                            <div className="border-t border-white/30 pt-2">
                              <p className="text-sm text-white/80">
                                {formData.description || '詳細説明'}
                              </p>
                            </div>
                            
                            {/* 有効期限 */}
                            {(formData.start_date && formData.end_date) && (
                              <div className="border-t border-white/30 pt-2 mt-2">
                                <p className="text-xs text-white/90 font-medium">
                                  有効期限: {new Date(formData.start_date).toLocaleDateString()} 〜 {new Date(formData.end_date).toLocaleDateString()}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-2 text-xs text-gray-500 text-center">
                    {imagePreview ? '画像クーポン' : 'クーポン'}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={resetForm}
                disabled={isSubmitting}
              >
                キャンセル
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center"
              >
                <Save className="w-4 h-4 mr-2" />
                {editingCoupon ? '更新' : '作成'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* 既存クーポン一覧 */}
      <div className="space-y-4">
        {coupons.length === 0 ? (
          <Card className="p-8 text-center">
            <Gift className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">クーポンがありません</h3>
            <p className="text-gray-600 mb-4">最初のクーポンを作成してお客様にお得なサービスを提供しましょう</p>
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              クーポン作成
            </Button>
          </Card>
        ) : (
          coupons.map((coupon) => (
            <Card key={coupon.id} className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 左側：チケット風クーポンデザイン */}
                <div className="w-full max-w-sm mx-auto">
                  {coupon.coupon_image_url ? (
                    // 画像クーポンの表示
                    <div className="aspect-square w-full border-2 border-gray-300 rounded-lg overflow-hidden">
                      <img
                        src={coupon.coupon_image_url}
                        alt="クーポン画像"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    // 文字クーポンの表示
                    <div className="aspect-square w-full border-2 border-gray-300 rounded-lg relative overflow-hidden">
                      {/* チケット風の背景 */}
                      <div className="w-full h-full bg-gradient-to-br from-red-500 to-red-600 relative">
                        {/* チケットの切り込み装飾 */}
                        <div className="absolute top-1/2 -left-3 w-6 h-6 bg-white rounded-full transform -translate-y-1/2"></div>
                        <div className="absolute top-1/2 -right-3 w-6 h-6 bg-white rounded-full transform -translate-y-1/2"></div>
                        
                        {/* 背景の薄い「COUPON」テキスト */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-10">
                          <span className="text-6xl font-bold text-white transform rotate-12">
                            COUPON
                          </span>
                        </div>
                        
                        {/* メインコンテンツ */}
                        <div className="relative z-10 flex flex-col items-center justify-center h-full p-4 text-center space-y-3">
                          {/* ドッグパークJPクーポン（一番上） */}
                          <div className="bg-white/95 px-3 py-1 rounded-full shadow-sm">
                            <span className="text-xs font-medium text-red-600">
                              ドッグパークJPクーポン
                            </span>
                          </div>
                          
                          {/* 店舗名（2番目） */}
                          <div className="text-white">
                            <h2 className="text-lg font-bold leading-tight">
                              {facilityName}
                            </h2>
                          </div>
                          
                          {/* クーポンタイトル */}
                          <div className="text-white">
                            <h3 className="text-xl font-bold leading-tight">
                              {coupon.title}
                            </h3>
                          </div>
                          
                          {/* サービス内容 */}
                          <div className="text-white/90">
                            <p className="text-base leading-tight">
                              {coupon.service_content}
                            </p>
                          </div>
                          
                          {/* 割引表示 */}
                          {(coupon.discount_value && coupon.discount_type) && (
                            <div className="bg-white text-red-600 px-6 py-3 rounded-lg shadow-md">
                              <span className="text-4xl font-bold">
                                {coupon.discount_value}{coupon.discount_type === 'amount' ? '円' : '%'}
                              </span>
                              <span className="text-lg ml-2 font-medium">
                                OFF
                              </span>
                            </div>
                          )}
                          
                          {/* 詳細説明 */}
                          {coupon.description && (
                            <div className="border-t border-white/30 pt-2">
                              <p className="text-sm text-white/80">
                                {coupon.description}
                              </p>
                            </div>
                          )}
                          
                          {/* 有効期限 */}
                          {(coupon.start_date && coupon.end_date) && (
                            <div className="border-t border-white/30 pt-2 mt-2">
                              <p className="text-xs text-white/90 font-medium">
                                有効期限: {new Date(coupon.start_date).toLocaleDateString()} 〜 {new Date(coupon.end_date).toLocaleDateString()}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-2 text-xs text-gray-500 text-center">
                    {coupon.coupon_image_url ? '画像クーポン' : 'クーポン'}
                  </div>
                </div>

                {/* 右側：統計情報と操作ボタン */}
                <div className="space-y-4">
                  {/* ステータス表示 */}
                  <div className="flex items-center space-x-3">
                    <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                      coupon.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {coupon.is_active ? '有効' : '無効'}
                    </span>
                    <span className="px-3 py-1 text-sm font-medium rounded-full bg-blue-100 text-blue-800">
                      {(() => {
                        console.log('Coupon usage_limit_type debug:', {
                          id: coupon.id,
                          usage_limit_type: coupon.usage_limit_type,
                          typeof: typeof coupon.usage_limit_type,
                          comparison: coupon.usage_limit_type === 'once'
                        });
                        return coupon.usage_limit_type === 'once' ? '1回限り' : '何回でも';
                      })()}
                    </span>
                  </div>

                  {/* 統計情報 */}
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">期間：</span>
                      <div className="flex items-center text-sm">
                        <Calendar className="w-4 h-4 mr-1 text-gray-400" />
                        {new Date(coupon.start_date).toLocaleDateString()} 〜 
                        {new Date(coupon.end_date).toLocaleDateString()}
                      </div>
                    </div>

                    {couponStats[coupon.id] && (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">取得数：</span>
                          <div className="flex items-center text-sm">
                            <Users className="w-4 h-4 mr-1 text-gray-400" />
                            {couponStats[coupon.id].total_obtained}人
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">使用数：</span>
                          <div className="flex items-center text-sm">
                            <Gift className="w-4 h-4 mr-1 text-gray-400" />
                            {couponStats[coupon.id].total_used}回
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">使用率：</span>
                          <div className="font-medium text-sm">
                            {couponStats[coupon.id].usage_rate}%
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* 操作ボタン */}
                  <div className="flex flex-col space-y-2">
                    <Button
                      variant="secondary"
                      onClick={() => handleEdit(coupon)}
                      className="w-full"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      編集
                    </Button>
                    <Button
                      variant={coupon.is_active ? "secondary" : "primary"}
                      onClick={() => handleToggleActive(coupon)}
                      className="w-full"
                    >
                      {coupon.is_active ? '無効化' : '有効化'}
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => handleDelete(coupon.id)}
                      className="w-full"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      削除
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* クーポンについての説明 */}
      <Card className="mt-6">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Info className="w-5 h-5 mr-2 text-blue-600" />
            クーポンについて
          </h3>
          <div className="space-y-3 text-sm text-gray-700">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-800 mb-2">📱 クーポンの表示方法</h4>
              <p className="text-blue-700">
                クーポンはスマートフォンの画面に表示され、お客様が店舗で提示します。
              </p>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-semibold text-yellow-800 mb-2">🔒 1回限りクーポンの仕組み</h4>
              <p className="text-yellow-700 mb-2">
                「おひとり様1回限り」のクーポンは、1ユーザーにつき1回のみ取得可能です。
              </p>
              <p className="text-yellow-700 mb-2">
                • お客様がクーポンを表示した段階で自動削除されます
              </p>
              <p className="text-yellow-700">
                • 2回目以降は使用できなくなり、再表示もできません
              </p>
            </div>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-semibold text-green-800 mb-2">♻️ 何回でもクーポンの仕組み</h4>
              <p className="text-green-700 mb-2">
                「何回でも」のクーポンは、有効期限内であれば何度でも使用可能です。
              </p>
              <p className="text-green-700">
                • 同じお客様が複数回利用できます（期限内）
              </p>
            </div>
            
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-800 mb-2">⏰ 有効期限について</h4>
              <p className="text-gray-700">
                設定した有効期限を過ぎると、クーポンは自動的に無効になります。
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* 画像クロッパー */}
      {showImageCropper && couponImageFile && (
        <ImageCropper
          imageFile={couponImageFile}
          onCropComplete={handleCropComplete}
          onCancel={() => setShowImageCropper(false)}
          aspectRatio={1}
        />
      )}
    </div>
  );
} 