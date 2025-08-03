import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../utils/supabase';
import { Button } from '../Button';
import { Card } from '../Card';
import { Input } from '../Input';

interface SponsorBanner {
  id: string;
  title: string;
  description: string;
  image_url: string;
  website_url: string;
  is_active: boolean;
  display_order: number;
  start_date: string | null;
  end_date: string | null;
  click_count: number;
  impression_count: number;
  created_at: string;
  updated_at: string;
}

interface SponsorFormData {
  title: string;
  description: string;
  image_url: string;
  website_url: string;
  is_active: boolean;
  display_order: number;
  start_date: string;
  end_date: string;
}

const initialFormData: SponsorFormData = {
  title: '',
  description: '',
  image_url: '',
  website_url: '',
  is_active: true,
  display_order: 0,
  start_date: '',
  end_date: ''
};

export const AdminSponsorManagement: React.FC = () => {
  const [banners, setBanners] = useState<SponsorBanner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingBanner, setEditingBanner] = useState<SponsorBanner | null>(null);
  const [formData, setFormData] = useState<SponsorFormData>(initialFormData);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // バナー一覧の取得
  const fetchBanners = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('sponsor_banners')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setBanners(data || []);
    } catch (err) {
      console.error('バナー取得エラー:', err);
      setError('バナーの取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  // フォームデータの更新
  const handleInputChange = (field: keyof SponsorFormData, value: string | boolean | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // バナーの保存
  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const bannerData = {
        ...formData,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null
      };

      if (editingBanner) {
        // 更新
        const { error } = await supabase
          .from('sponsor_banners')
          .update(bannerData)
          .eq('id', editingBanner.id);

        if (error) throw error;
        setSuccessMessage('バナーを更新しました');
      } else {
        // 新規作成
        const { error } = await supabase
          .from('sponsor_banners')
          .insert([bannerData]);

        if (error) throw error;
        setSuccessMessage('バナーを作成しました');
      }

      setShowForm(false);
      setEditingBanner(null);
      setFormData(initialFormData);
      await fetchBanners();
    } catch (err) {
      console.error('バナー保存エラー:', err);
      setError('バナーの保存に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  // バナーの削除
  const handleDeleteBanner = async (id: string) => {
    if (!confirm('このバナーを削除しますか？')) return;

    try {
      const { error } = await supabase
        .from('sponsor_banners')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setSuccessMessage('バナーを削除しました');
      await fetchBanners();
    } catch (err) {
      console.error('バナー削除エラー:', err);
      setError('バナーの削除に失敗しました');
    }
  };

  // 編集開始
  const handleEditBanner = (banner: SponsorBanner) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title,
      description: banner.description,
      image_url: banner.image_url,
      website_url: banner.website_url,
      is_active: banner.is_active,
      display_order: banner.display_order,
      start_date: banner.start_date ? banner.start_date.split('T')[0] : '',
      end_date: banner.end_date ? banner.end_date.split('T')[0] : ''
    });
    setShowForm(true);
  };

  // フォームのリセット
  const handleCancelForm = () => {
    setShowForm(false);
    setEditingBanner(null);
    setFormData(initialFormData);
    setError(null);
  };

  // ステータス切り替え
  const toggleBannerStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('sponsor_banners')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      await fetchBanners();
    } catch (err) {
      console.error('ステータス更新エラー:', err);
      setError('ステータスの更新に失敗しました');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">スポンサーバナー管理</h2>
        <Button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          新規バナー作成
        </Button>
      </div>

      {/* メッセージ表示 */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          {successMessage}
        </div>
      )}

      {/* バナーフォーム */}
      {showForm && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            {editingBanner ? 'バナー編集' : '新規バナー作成'}
          </h3>
          <form onSubmit={handleSaveBanner} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="タイトル"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                required
              />
              <Input
                label="Webサイト URL"
                type="url"
                value={formData.website_url}
                onChange={(e) => handleInputChange('website_url', e.target.value)}
                required
              />
            </div>
            <Input
              label="説明"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              multiline
              rows={3}
            />
            <Input
              label="画像 URL"
              type="url"
              value={formData.image_url}
              onChange={(e) => handleInputChange('image_url', e.target.value)}
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="表示順序"
                type="number"
                value={formData.display_order}
                onChange={(e) => handleInputChange('display_order', parseInt(e.target.value) || 0)}
                min="0"
              />
              <Input
                label="開始日"
                type="date"
                value={formData.start_date}
                onChange={(e) => handleInputChange('start_date', e.target.value)}
              />
              <Input
                label="終了日"
                type="date"
                value={formData.end_date}
                onChange={(e) => handleInputChange('end_date', e.target.value)}
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => handleInputChange('is_active', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200"
              />
              <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                アクティブ（表示する）
              </label>
            </div>
            <div className="flex space-x-4">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSubmitting ? '保存中...' : '保存'}
              </Button>
              <Button
                type="button"
                onClick={handleCancelForm}
                variant="outline"
              >
                キャンセル
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* バナー一覧 */}
      <div className="grid gap-4">
        {banners.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            バナーが登録されていません
          </div>
        ) : (
          banners.map((banner) => (
            <Card key={banner.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="text-lg font-semibold">{banner.title}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      banner.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {banner.is_active ? 'アクティブ' : '非アクティブ'}
                    </span>
                  </div>
                  <p className="text-gray-600 mb-2">{banner.description}</p>
                  <div className="text-sm text-gray-500 space-y-1">
                    <p>URL: <a href={banner.website_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{banner.website_url}</a></p>
                    <p>表示順: {banner.display_order}</p>
                    <p>クリック数: {banner.click_count} | 表示数: {banner.impression_count}</p>
                    {banner.start_date && <p>開始日: {new Date(banner.start_date).toLocaleDateString()}</p>}
                    {banner.end_date && <p>終了日: {new Date(banner.end_date).toLocaleDateString()}</p>}
                  </div>
                </div>
                <div className="flex space-x-2 ml-4">
                  <Button
                    onClick={() => toggleBannerStatus(banner.id, banner.is_active)}
                    variant="outline"
                    size="sm"
                  >
                    {banner.is_active ? '非アクティブ' : 'アクティブ'}
                  </Button>
                  <Button
                    onClick={() => handleEditBanner(banner)}
                    variant="outline"
                    size="sm"
                  >
                    編集
                  </Button>
                  <Button
                    onClick={() => handleDeleteBanner(banner.id)}
                    variant="outline"
                    size="sm"
                    className="text-red-600 border-red-600 hover:bg-red-50"
                  >
                    削除
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminSponsorManagement; 