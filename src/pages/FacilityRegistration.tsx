import {
    AlertCircle,
    Building,
    CheckCircle,
    Image as ImageIcon,
    X
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import Input from '../components/Input';
import useAuth from '../context/AuthContext';
import { supabase } from '../utils/supabase';

// 画像処理ユーティリティ
const processFacilityImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = document.createElement('img');
    
    img.onload = () => {
      // 最大サイズ設定
      const maxWidth = 800;
      const maxHeight = 600;
      
      let width = img.naturalWidth;
      let height = img.naturalHeight;
      
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
  const { user, isAuthenticated, userProfile } = useAuth();
  const navigate = useNavigate();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  
  // ユーザー情報編集用の状態
  const [userInfo, setUserInfo] = useState({
    name: userProfile?.name || '',
    address: (userProfile?.address as string) || '',
    isEditing: false
  });
  
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

  // userProfileが変更された時にuserInfoを更新
  useEffect(() => {
    if (userProfile) {
      setUserInfo({
        name: userProfile.name || '',
        address: (userProfile.address as string) || '',
        isEditing: false
      });
    }
  }, [userProfile]);

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

  // フォーム送信処理
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void handleSubmit();
  };

  // 画像アップロード処理
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    void handleImageUpload(e);
  };

  const handleSubmit = async () => {
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

      // データ送信をログに記録（開発環境のみ）
      if (import.meta.env.DEV) {
        console.warn('Submitting facility data:', facilityData);
      }

      // 1. 施設情報をDBに保存
      const response = await supabase
        .from('pet_facilities')
        .insert(facilityData)
        .select()
        .single();

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const { data: facility, error: facilityError } = response;

      if (facilityError) {
        console.error('Facility insertion error:', facilityError);
        throw facilityError;
      }

      // 2. 画像をDBに保存
      if (formData.images.length > 0 && facility && typeof facility === 'object' && 'id' in facility) {
        const imageInserts = formData.images.map((imageData, index) => ({
          facility_id: (facility as { id: string }).id,
          image_data: imageData,
          image_type: 'image/jpeg',
          display_order: index,
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
      console.error('❌ Submission error:', error);
      const errorMessage = error instanceof Error ? error.message : '申請に失敗しました';
      setError(errorMessage);
      
      // より詳細なエラー情報をコンソールに出力
      if (error instanceof Error && error.message.includes('アップロード')) {
        console.error('📋 Storage upload troubleshooting:');
        console.error('- Check if vaccine-certs bucket exists');
        console.error('- Check storage policies');
        console.error('- Check file size and format');
        console.error('- User ID:', user?.id);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ユーザー情報の編集ハンドラー
  const handleUserInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUserInfo(prev => ({ ...prev, [name]: value }));
  };

  // ユーザー情報の保存
  const saveUserInfo = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      
      const { error } = await supabase
        .from('profiles')
        .update({
          name: userInfo.name,
          address: userInfo.address,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) {
        console.error('User info update error:', error);
        throw new Error('ユーザー情報の更新に失敗しました');
      }

      setUserInfo(prev => ({ ...prev, isEditing: false }));
      setSuccessMessage('ユーザー情報を更新しました');
      
      // 成功メッセージを3秒後にクリア
      setTimeout(() => setSuccessMessage(''), 3000);

    } catch (error) {
      console.error('Save user info error:', error);
      setError(error instanceof Error ? error.message : 'ユーザー情報の更新に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // ユーザー情報の保存（非同期ハンドラー）
  const handleSaveUserInfo = () => {
    void saveUserInfo();
  };
  const cancelUserInfoEdit = () => {
    setUserInfo({
      name: userProfile?.name || '',
      address: (userProfile?.address as string) || '',
      isEditing: false
    });
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

      <form onSubmit={handleFormSubmit} className="space-y-6">
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

        {/* ユーザー情報 */}
        <Card>
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Building className="w-6 h-6 mr-2" />
              ユーザー情報
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  名前
                </label>
                {userInfo.isEditing ? (
                  <Input
                    label="名前"
                    name="name"
                    value={userInfo.name}
                    onChange={handleUserInfoChange}
                    placeholder="名前を入力してください"
                  />
                ) : (
                  <p className="text-gray-900">{userInfo.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  住所
                </label>
                {userInfo.isEditing ? (
                  <Input
                    label="住所"
                    name="address"
                    value={userInfo.address}
                    onChange={handleUserInfoChange}
                    placeholder="住所を入力してください"
                  />
                ) : (
                  <p className="text-gray-900">{userInfo.address}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end mt-4">
              {userInfo.isEditing ? (
                <>
                  <Button
                    onClick={handleSaveUserInfo}
                    className="mr-2"
                    disabled={isLoading}
                  >
                    {isLoading ? '保存中...' : '保存'}
                  </Button>
                  <Button
                    onClick={cancelUserInfoEdit}
                    disabled={isLoading}
                  >
                    キャンセル
                  </Button>
                </>
              ) : (
                <Button onClick={() => setUserInfo(prev => ({ ...prev, isEditing: true }))}>
                  編集
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* 現在のアカウント情報確認 */}
        <Card>
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <CheckCircle className="w-6 h-6 mr-2" />
              登録者情報の確認
            </h2>
            
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-blue-500 mr-2 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">登録者情報の確認</p>
                  <p className="text-xs">
                    以下の情報をご確認ください。変更が必要な場合は編集できます。
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {/* 氏名 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  氏名
                </label>
                {userInfo.isEditing ? (
                  <Input
                    label="氏名"
                    name="name"
                    value={userInfo.name}
                    onChange={handleUserInfoChange}
                    placeholder="氏名を入力してください"
                    required
                  />
                ) : (
                  <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md">
                    <p className="text-gray-900">{userInfo.name || '未設定'}</p>
                  </div>
                )}
              </div>

              {/* 住所 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  住所
                </label>
                {userInfo.isEditing ? (
                  <Input
                    label="住所"
                    name="address"
                    value={userInfo.address}
                    onChange={handleUserInfoChange}
                    placeholder="住所を入力してください"
                    required
                  />
                ) : (
                  <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md">
                    <p className="text-gray-900">{userInfo.address || '未設定'}</p>
                  </div>
                )}
              </div>

              {/* 編集ボタン */}
              <div className="flex gap-2">
                {userInfo.isEditing ? (
                  <>
                    <Button
                      type="button"
                      onClick={handleSaveUserInfo}
                      disabled={isLoading}
                    >
                      {isLoading ? '保存中...' : '保存'}
                    </Button>
                    <Button
                      type="button"
                      onClick={cancelUserInfoEdit}
                    >
                      キャンセル
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    onClick={() => setUserInfo(prev => ({ ...prev, isEditing: true }))}
                  >
                    編集
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* 画像アップロード */}
        <Card className="mb-6">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <ImageIcon className="w-6 h-6 mr-2" />
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
                onChange={handleImageChange}
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

        {/* 本人確認書類アップロード */}
        {/* 無料掲載キャンペーン */}
        <Card className="mb-6">
          <div className="p-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                <span className="font-medium text-green-800">無料掲載期間実施中！</span>
              </div>
              <p className="text-green-700 mb-2">
                現在、すべてのペット関連施設が<strong className="text-lg">無料</strong>で掲載できます。
              </p>
              <ul className="text-sm text-green-600 space-y-1">
                <li>• 本人確認手続きは不要です</li>
                <li>• 月額料金は発生しません</li>
                <li>• 申請後、管理者の承認を経て掲載開始となります</li>
                <li>• 将来的に有料化する場合は事前にお知らせいたします</li>
              </ul>
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
