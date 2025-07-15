import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building, 
  MapPin, 
  Phone, 
  Globe, 
  Clock, 
  Upload,
  Image,
  X,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react';
import Button from '../components/Button';
import Input from '../components/Input';
import Card from '../components/Card';
import { supabase } from '../utils/supabase';
import useAuth from '../context/AuthContext';

// 画像処理ユーティリティ
const processFacilityImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new (window as any).Image();
    
    img.onload = () => {
      // 最大サイズ設定
      const maxWidth = 800;
      const maxHeight = 600;
      
      let { width, height } = img;
      
      // アスペクト比を維持しながらリサイズ
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
      
      // 画像を描画
      ctx?.drawImage(img, 0, 0, width, height);
      
      // 圧縮してBase64として返す
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      resolve(dataUrl);
    };
    
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
};

interface FacilityForm {
  name: string;
  category_id: string;
  address: string;
  phone: string;
  website: string;
  description: string;
  images: string[];
}

const FACILITY_CATEGORIES = [
  { id: 'pet_hotel', name: 'ペットホテル', monthly_fee: 5000, is_free: true },
  { id: 'pet_salon', name: 'ペットサロン', monthly_fee: 3000, is_free: true },
  { id: 'veterinary', name: '動物病院', monthly_fee: 8000, is_free: true },
  { id: 'pet_cafe', name: 'ペットカフェ', monthly_fee: 4000, is_free: true },
  { id: 'pet_restaurant', name: 'ペット同伴レストラン', monthly_fee: 6000, is_free: true },
  { id: 'pet_shop', name: 'ペットショップ', monthly_fee: 7000, is_free: true },
  { id: 'pet_accommodation', name: 'ペット同伴宿泊', monthly_fee: 10000, is_free: true }
];

export default function FacilityRegistration() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  
  const [formData, setFormData] = useState<FacilityForm>({
    name: '',
    category_id: '',
    address: '',
    phone: '',
    website: '',
    description: '',
    images: []
  });

  // 認証チェック
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length === 0) return;
    if (imageFiles.length + files.length > 5) {
      setError('画像は最大5枚までアップロードできます');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // 各ファイルのサイズをチェック
      const oversizedFiles = files.filter(file => file.size > 10 * 1024 * 1024); // 10MB
      if (oversizedFiles.length > 0) {
        setError('画像ファイルのサイズは10MB以下にしてください');
        setIsLoading(false);
        return;
      }

      // 画像処理
      const processedImages = await Promise.all(
        files.map(file => processFacilityImage(file))
      );

      // 新しいファイルを追加
      const newFiles = files.slice(0, 5 - imageFiles.length);
      
      setImageFiles(prev => [...prev, ...newFiles]);
      setImagePreviews(prev => [...prev, ...processedImages]);
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...processedImages]
      }));

    } catch (error) {
      setError(error instanceof Error ? error.message : '画像の処理に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('ログインが必要です');
      return;
    }

    if (!formData.name || !formData.category_id || !formData.address) {
      setError('必須項目を入力してください');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const facilityData = {
        owner_id: user.id,
        name: formData.name,
        category_id: formData.category_id,
        address: formData.address,
        phone: formData.phone,
        website: formData.website,
        description: formData.description,
        status: 'pending',
        created_at: new Date().toISOString()
      };

      console.log('Submitting facility data:', facilityData);

      // 1. 施設情報をDBに保存
      const { data: facility, error: facilityError } = await supabase
        .from('pet_facilities')
        .insert(facilityData)
        .select()
        .single();

      if (facilityError) {
        console.error('Facility insertion error:', facilityError);
        throw facilityError;
      }

      // 2. 画像をDBに保存
      if (formData.images.length > 0 && facility) {
        const imageInserts = formData.images.map((imageData, index) => ({
          facility_id: facility.id,
          image_data: imageData,
          is_primary: index === 0,
          created_at: new Date().toISOString()
        }));

        const { error: imageError } = await supabase
          .from('facility_images')
          .insert(imageInserts);

        if (imageError) {
          console.error('Image insertion error:', imageError);
          console.warn('画像の保存に失敗しましたが、施設登録は完了しました');
        }
      }

      setSuccessMessage('施設の掲載申請が完了しました！管理者の承認後、地図に掲載されます。');
      
      // 2秒後にダッシュボードに戻る
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);

    } catch (error) {
      console.error('Submission error:', error);
      setError(error instanceof Error ? error.message : '申請に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const getCategoryName = (categoryId: string): string => {
    const category = FACILITY_CATEGORIES.find(cat => cat.id === categoryId);
    return category ? category.name : categoryId;
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">ペット関連施設登録</h1>
        <p className="text-gray-600">
          ペット関連施設の掲載申請を行います。管理者の承認後、地図に表示されます。
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
        {/* 基本情報 */}
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
                  label="施設名"
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
                  label="住所"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="住所を入力してください"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  電話番号
                </label>
                <Input
                  label="電話番号"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="電話番号を入力してください"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ウェブサイト
                </label>
                <Input
                  label="ウェブサイト"
                  name="website"
                  value={formData.website}
                  onChange={handleInputChange}
                  placeholder="https://example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  施設の説明
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                  placeholder="施設の特徴やサービス内容を入力してください"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* 画像アップロード */}
        <Card className="mb-6">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Image className="w-6 h-6 mr-2" />
              施設画像 (最大5枚)
            </h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                画像をアップロード
              </label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isLoading || imageFiles.length >= 5}
              />
              <p className="text-sm text-gray-500 mt-1">
                JPG, PNG, GIF対応。1ファイル10MB以下。画像は自動的にリサイズ・圧縮されます。
              </p>
            </div>

            {/* 画像プレビュー */}
            {imagePreviews.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="relative">
                    <img
                      src={preview}
                      alt={`施設画像 ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg border border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    {index === 0 && (
                      <div className="absolute bottom-1 left-1 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                        メイン
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* 無料掲載キャンペーン */}
        <Card className="mb-6">
          <div className="p-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                <span className="font-medium text-green-800">無料掲載キャンペーン実施中！</span>
              </div>
              <p className="text-green-700">
                現在、すべてのペット関連施設が<strong className="text-lg">無料</strong>で掲載できます。
              </p>
              <p className="text-sm text-green-600 mt-2">
                申請後、管理者の承認を経て掲載開始となります。
              </p>
            </div>
          </div>
        </Card>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? '申請中...' : '申請を送信する'}
          </Button>
        </div>
      </form>
    </div>
  );
} 