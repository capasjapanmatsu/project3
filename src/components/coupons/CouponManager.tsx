import {
    Calendar,
    Eye,
    Gift,
    Image as ImageIcon,
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
import Input from '../Input';

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
    usage_limit_type: 'unlimited'
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
      usage_limit_type: 'unlimited'
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
      title: coupon.title,
      description: coupon.description,
      service_content: coupon.service_content,
      discount_value: coupon.discount_value,
      discount_type: coupon.discount_type,
      start_date: coupon.start_date.split('T')[0],
      end_date: coupon.end_date.split('T')[0],
      usage_limit_type: coupon.usage_limit_type
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  クーポンタイトル *
                </label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="例：初回利用10%OFF"
                  maxLength={100}
                  required
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
                  <Input
                    type="number"
                    value={formData.discount_value || ''}
                    onChange={(e) => setFormData({...formData, discount_value: parseInt(e.target.value) || undefined})}
                    placeholder={formData.discount_type === 'amount' ? '500' : '10'}
                    className="w-24 text-lg font-medium text-center"
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
                placeholder="例：トリミング料金10%OFF（初回利用限定）"
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
                placeholder="クーポンの詳細な利用条件や注意事項を記載してください"
                rows={2}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  開始日 *
                </label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  終了日 *
                </label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                  required
                />
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
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                クーポン画像（オプション）
              </label>
              <div className="flex items-center space-x-4">
                {imagePreview && (
                  <img
                    src={imagePreview}
                    alt="クーポン画像プレビュー"
                    className="w-32 h-20 object-cover border rounded-lg"
                  />
                )}
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => document.getElementById('coupon-image-input')?.click()}
                  className="flex items-center"
                >
                  <ImageIcon className="w-4 h-4 mr-2" />
                  画像を選択
                </Button>
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
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{coupon.title}</h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      coupon.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {coupon.is_active ? '有効' : '無効'}
                    </span>
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                      {coupon.usage_limit_type === 'once' ? '1回限り' : '何回でも'}
                    </span>
                  </div>

                  <p className="text-gray-600 mb-3">{coupon.service_content}</p>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">期間：</span>
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1 text-gray-400" />
                        {new Date(coupon.start_date).toLocaleDateString()} 〜 
                        {new Date(coupon.end_date).toLocaleDateString()}
                      </div>
                    </div>

                    {couponStats[coupon.id] && (
                      <div>
                        <span className="text-gray-500">取得数：</span>
                        <div className="flex items-center">
                          <Users className="w-4 h-4 mr-1 text-gray-400" />
                          {couponStats[coupon.id].total_obtained}人
                        </div>
                      </div>
                    )}

                    {couponStats[coupon.id] && (
                      <div>
                        <span className="text-gray-500">使用数：</span>
                        <div className="flex items-center">
                          <Gift className="w-4 h-4 mr-1 text-gray-400" />
                          {couponStats[coupon.id].total_used}回
                        </div>
                      </div>
                    )}

                    {couponStats[coupon.id] && (
                      <div>
                        <span className="text-gray-500">使用率：</span>
                        <div className="font-medium">
                          {couponStats[coupon.id].usage_rate}%
                        </div>
                      </div>
                    )}
                  </div>

                  {coupon.description && (
                    <p className="text-sm text-gray-500 mt-2">{coupon.description}</p>
                  )}
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleEdit(coupon)}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    編集
                  </Button>
                  <Button
                    variant={coupon.is_active ? "secondary" : "primary"}
                    size="sm"
                    onClick={() => handleToggleActive(coupon)}
                  >
                    {coupon.is_active ? '無効化' : '有効化'}
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(coupon.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {coupon.coupon_image_url && (
                <div className="mt-4">
                  <img
                    src={coupon.coupon_image_url}
                    alt="クーポン画像"
                    className="max-w-md h-auto border rounded-lg"
                  />
                </div>
              )}
            </Card>
          ))
        )}
      </div>

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