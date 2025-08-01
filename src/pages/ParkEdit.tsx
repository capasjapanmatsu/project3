import { ArrowLeft, Save } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import useAuth from '../context/AuthContext';
import type { DogPark } from '../types';
import { supabase } from '../utils/supabase';

const ParkEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [park, setPark] = useState<DogPark | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    features: '',
    rules: '',
    operating_hours: '',
    contact_info: '',
    max_capacity: 0,
    facilities: {
      parking: false,
      restroom: false,
      water_supply: false,
      lighting: false,
      shade: false,
      agility_equipment: false,
      small_dog_area: false,
      large_dog_area: false
    }
  });

  // パークデータを取得
  const fetchParkData = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('dog_parks')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data.owner_id !== user?.id) {
        setError('このドッグランを編集する権限がありません。');
        return;
      }

      setPark(data);
      setFormData({
        name: data.name || '',
        description: data.description || '',
        features: data.features || '',
        rules: data.rules || '',
        operating_hours: data.operating_hours || '',
        contact_info: data.contact_info || '',
        max_capacity: data.max_capacity || 0,
        facilities: data.facilities || {
          parking: false,
          restroom: false,
          water_supply: false,
          lighting: false,
          shade: false,
          agility_equipment: false,
          small_dog_area: false,
          large_dog_area: false
        }
      });
    } catch (error) {
      console.error('Error fetching park data:', error);
      setError('ドッグラン情報の取得に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  // フォーム送信処理
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!id) return;

    try {
      setSaving(true);
      setError('');

      const { error } = await supabase
        .from('dog_parks')
        .update({
          name: formData.name,
          description: formData.description,
          features: formData.features,
          rules: formData.rules,
          operating_hours: formData.operating_hours,
          contact_info: formData.contact_info,
          max_capacity: formData.max_capacity,
          facilities: formData.facilities,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      setSuccess('ドッグラン情報を更新しました。');
      
      // 3秒後に管理ページに戻る
      setTimeout(() => {
        navigate(`/parks/${id}/manage`);
      }, 2000);

    } catch (error) {
      console.error('Error updating park:', error);
      setError('更新に失敗しました。もう一度お試しください。');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchParkData();
  }, [id, user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error && !park) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            戻る
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <Button
            variant="secondary"
            onClick={() => navigate(`/parks/${id}/manage`)}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            管理画面に戻る
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">ドッグラン編集</h1>
          <p className="text-gray-600 mt-2">基本情報や設備情報を編集できます。</p>
        </div>

        {/* メッセージ表示 */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800">{success}</p>
          </div>
        )}

        {/* 編集フォーム */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 基本情報 */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-6">基本情報</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ドッグラン名 *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  説明
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  営業時間
                </label>
                <input
                  type="text"
                  value={formData.operating_hours}
                  onChange={(e) => setFormData(prev => ({ ...prev, operating_hours: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例：9:00-18:00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  最大収容数
                </label>
                <input
                  type="number"
                  value={formData.max_capacity}
                  onChange={(e) => setFormData(prev => ({ ...prev, max_capacity: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                />
              </div>
            </div>
          </Card>

          {/* 設備情報 */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-6">設備情報</h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries({
                parking: '駐車場',
                restroom: 'トイレ',
                water_supply: '給水設備',
                lighting: '照明',
                shade: '日陰',
                agility_equipment: 'アジリティ',
                small_dog_area: '小型犬エリア',
                large_dog_area: '大型犬エリア'
              }).map(([key, label]) => (
                <label key={key} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.facilities[key as keyof typeof formData.facilities]}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      facilities: {
                        ...prev.facilities,
                        [key]: e.target.checked
                      }
                    }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              ))}
            </div>
          </Card>

          {/* 保存ボタン */}
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={saving}
              className="min-w-[120px]"
            >
              {saving ? (
                <div className="flex items-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  保存中...
                </div>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  保存
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ParkEdit; 