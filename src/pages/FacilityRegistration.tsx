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
  mainImage: string;
  additionalImages: string[];
  mainImageFile?: File;
  additionalImageFiles?: (File | undefined)[];
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
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [imageUploading, setImageUploading] = useState({
    main: false,
    additional: [false, false, false]
  });
  
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
    images: [],
    mainImage: '',
    additionalImages: [],
    additionalImageFiles: []
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

  // 画像をSupabase Storageにアップロード
  const uploadImageToStorage = async (file: File, facilityId: string, imageType: 'main' | 'additional', index?: number): Promise<string> => {
    try {
      // ファイル名を生成（重複を避けるためタイムスタンプを追加）
      const timestamp = Date.now();
      const fileExtension = file.name.split('.').pop();
      const fileName = imageType === 'main' 
        ? `main_${timestamp}.${fileExtension}`
        : `additional_${index}_${timestamp}.${fileExtension}`;
      
      const filePath = `${facilityId}/${fileName}`;

      // Supabase Storageにアップロード
      const { data, error } = await supabase.storage
        .from('pet-facility-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        throw error;
      }

      // 公開URLを取得
      const { data: { publicUrl } } = supabase.storage
        .from('pet-facility-images')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Image upload error:', error);
      throw new Error('画像のアップロードに失敗しました');
    }
  };

  // 画像ファイル処理（Storageアップロード版）
  const handleMainImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // ファイルサイズチェック（5MB制限）
    if (file.size > 5 * 1024 * 1024) {
      setError('画像ファイルのサイズは5MB以下にしてください');
      return;
    }

    // ファイル形式チェック
    if (!file.type.startsWith('image/')) {
      setError('画像ファイルを選択してください');
      return;
    }

    try {
      // ローディング開始
      setImageUploading(prev => ({ ...prev, main: true }));
      setError('');
      
      // プレビュー用にBase64を生成
      const processedImage = await processFacilityImage(file);
      setFormData(prev => ({ 
        ...prev, 
        mainImage: processedImage,
        mainImageFile: file // ファイルも保存
      }));
    } catch (err) {
      setError('画像の処理に失敗しました');
      console.error('Image processing error:', err);
    } finally {
      // ローディング終了
      setImageUploading(prev => ({ ...prev, main: false }));
    }
  };

  const handleAdditionalImageChange = async (event: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // ファイルサイズチェック（5MB制限）
    if (file.size > 5 * 1024 * 1024) {
      setError('画像ファイルのサイズは5MB以下にしてください');
      return;
    }

    // ファイル形式チェック
    if (!file.type.startsWith('image/')) {
      setError('画像ファイルを選択してください');
      return;
    }

    try {
      // ローディング開始
      setImageUploading(prev => {
        const newAdditional = [...prev.additional];
        newAdditional[index] = true;
        return { ...prev, additional: newAdditional };
      });
      setError('');
      
      // プレビュー用にBase64を生成
      const processedImage = await processFacilityImage(file);
      setFormData(prev => {
        const newAdditionalImages = [...prev.additionalImages];
        const newAdditionalImageFiles = prev.additionalImageFiles ? [...prev.additionalImageFiles] : [];
        
        newAdditionalImages[index] = processedImage;
        newAdditionalImageFiles[index] = file;
        
        return { 
          ...prev, 
          additionalImages: newAdditionalImages,
          additionalImageFiles: newAdditionalImageFiles
        };
      });
    } catch (err) {
      setError('画像の処理に失敗しました');
      console.error('Image processing error:', err);
    } finally {
      // ローディング終了
      setImageUploading(prev => {
        const newAdditional = [...prev.additional];
        newAdditional[index] = false;
        return { ...prev, additional: newAdditional };
      });
    }
  };

  const removeAdditionalImage = (index: number) => {
    setFormData(prev => {
      const newAdditionalImages = [...prev.additionalImages];
      const newAdditionalImageFiles = prev.additionalImageFiles ? [...prev.additionalImageFiles] : [];
      
      newAdditionalImages[index] = '';
      newAdditionalImageFiles[index] = undefined;
      
      return { 
        ...prev, 
        additionalImages: newAdditionalImages,
        additionalImageFiles: newAdditionalImageFiles
      };
    });
  };

  const removeMainImage = () => {
    setFormData(prev => ({ 
      ...prev, 
      mainImage: '',
      mainImageFile: undefined
    }));
  };

  // フォーム送信処理
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('=== 申請開始 ===');
    
    // バリデーション
    if (!formData.name || !formData.category_id || !formData.address) {
      setError('必須項目を入力してください');
      return;
    }

    // メイン画像の必須チェック
    if (!formData.mainImage || !formData.mainImageFile) {
      setError('メイン画像は必須です');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      
      console.log('1. バリデーション完了');

      // 1. 施設データを先に挿入（画像URL無しで）
      const facilityData = {
        owner_id: user?.id, // 現在のユーザーIDを設定
        name: formData.name,
        category_id: formData.category_id,
        address: formData.address,
        phone: formData.phone || null,
        website: formData.website || null,
        description: formData.description || null,
        status: 'pending'
      };

      console.log('2. 施設データ準備完了:', facilityData);

      const { data: facilityResponse, error: insertError } = await supabase
        .from('pet_facilities')
        .insert([facilityData])
        .select()
        .single();

      console.log('3. 施設登録レスポンス:', { facilityResponse, insertError });

      if (insertError || !facilityResponse) {
        console.error('施設登録エラー:', insertError);
        throw insertError || new Error('施設の登録に失敗しました');
      }

      const facilityId = facilityResponse.id;
      console.log('4. 施設ID取得:', facilityId);

      // 2. 画像をStorageにアップロード
      console.log('5. 画像アップロード開始');
      const imageUploads: Promise<{ url: string; type: 'main' | 'additional'; order: number }>[] = [];

      // メイン画像をアップロード
      if (formData.mainImageFile) {
        console.log('6. メイン画像アップロード準備');
        imageUploads.push(
          uploadImageToStorage(formData.mainImageFile, facilityId, 'main').then(url => {
            console.log('7. メイン画像アップロード完了:', url);
            return {
              url,
              type: 'main' as const,
              order: 0
            };
          })
        );
      }

      // 追加画像をアップロード
      if (formData.additionalImageFiles) {
        formData.additionalImageFiles.forEach((file, index) => {
          if (file) {
            console.log(`8. 追加画像${index + 1}アップロード準備`);
            imageUploads.push(
              uploadImageToStorage(file, facilityId, 'additional', index).then(url => {
                console.log(`9. 追加画像${index + 1}アップロード完了:`, url);
                return {
                  url,
                  type: 'additional' as const,
                  order: index + 1
                };
              })
            );
          }
        });
      }

      console.log('10. 全画像アップロード実行中...');
      // 全ての画像アップロードを並行実行
      const uploadedImages = await Promise.all(imageUploads);
      console.log('11. 全画像アップロード完了:', uploadedImages);

      // 3. 画像情報をDBに保存
      if (uploadedImages.length > 0) {
        console.log('12. 画像情報DB保存開始');
        const imageRecords = uploadedImages.map(img => ({
          facility_id: facilityId,
          image_url: img.url,
          image_type: img.type,
          display_order: img.order,
          alt_text: `${formData.name} - ${img.type === 'main' ? 'メイン画像' : `追加画像${img.order}`}`
        }));

        console.log('13. 画像レコード準備完了:', imageRecords);

        const { error: imageInsertError } = await supabase
          .from('pet_facility_images')
          .insert(imageRecords);

        console.log('14. 画像DB保存結果:', { imageInsertError });

        if (imageInsertError) {
          console.error('Image records insert error:', imageInsertError);
          // 画像レコードの挿入に失敗しても施設登録は継続
        }
      }

      console.log('15. 申請完了処理開始');
      setSuccessMessage('施設の申請が完了しました。審査完了までお待ちください。');
      
      // フォームリセット
      setFormData({
        name: '',
        category_id: '',
        address: '',
        phone: '',
        website: '',
        description: '',
        images: [],
        mainImage: '',
        additionalImages: [],
        additionalImageFiles: []
      });

      console.log('16. フォームリセット完了');

      // 3秒後にリダイレクト
      setTimeout(() => {
        console.log('17. リダイレクト実行');
        navigate('/dashboard');
      }, 3000);

      console.log('=== 申請処理完了 ===');

    } catch (err) {
      console.error('=== 申請エラー ===', err);
      
      // より詳細なエラーメッセージを表示
      let errorMessage = '申請の送信に失敗しました';
      
      if (err && typeof err === 'object' && 'message' in err) {
        errorMessage = (err as Error).message;
      } else if (err && typeof err === 'object' && 'error' in err) {
        const supabaseError = err as any;
        if (supabaseError.error?.message) {
          errorMessage = `データベースエラー: ${supabaseError.error.message}`;
        }
      }
      
      // RLSエラーの場合の特別な処理
      if (errorMessage.includes('row-level security policy') || errorMessage.includes('RLS')) {
        errorMessage = 'データベースのアクセス権限に問題があります。管理者にお問い合わせください。';
      }
      
      setError(errorMessage);
    } finally {
      console.log('=== finally ブロック実行 ===');
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

              <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
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

              {/* 画像アップロードセクション */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">施設画像</h3>
                
                {/* メイン画像（必須） */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    メイン画像 <span className="text-red-500">*</span>
                  </label>
                  <p className="text-sm text-gray-500 mb-3">
                    施設の代表的な画像をアップロードしてください（最大5MB、JPG/PNG形式）
                  </p>
                  
                  {formData.mainImage ? (
                    <div className="relative inline-block">
                      <img
                        src={formData.mainImage}
                        alt="メイン画像プレビュー"
                        className="w-48 h-36 object-cover rounded-lg border border-gray-300"
                      />
                      <button
                        type="button"
                        onClick={removeMainImage}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      {imageUploading.main ? (
                        <div className="flex flex-col items-center">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                          <p className="mt-2 text-sm text-gray-600">画像を処理中...</p>
                        </div>
                      ) : (
                        <>
                          <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                          <div className="mt-4">
                            <label htmlFor="mainImage" className="cursor-pointer">
                              <span className="mt-2 block text-sm font-medium text-gray-900 hover:text-blue-600">
                                メイン画像をアップロード
                              </span>
                              <input
                                id="mainImage"
                                name="mainImage"
                                type="file"
                                accept="image/*"
                                onChange={(e) => void handleMainImageChange(e)}
                                className="sr-only"
                                disabled={imageUploading.main}
                              />
                            </label>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* 追加画像（任意） */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    追加画像（任意）
                  </label>
                  <p className="text-sm text-gray-500 mb-3">
                    最大3枚まで追加できます
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[0, 1, 2].map((index) => (
                      <div key={index}>
                        {formData.additionalImages[index] ? (
                          <div className="relative">
                            <img
                              src={formData.additionalImages[index]}
                              alt={`追加画像${index + 1}プレビュー`}
                              className="w-full h-32 object-cover rounded-lg border border-gray-300"
                            />
                            <button
                              type="button"
                              onClick={() => removeAdditionalImage(index)}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                            {imageUploading.additional[index] ? (
                              <div className="flex flex-col items-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                                <p className="mt-2 text-xs text-gray-600">処理中...</p>
                              </div>
                            ) : (
                              <>
                                <ImageIcon className="mx-auto h-8 w-8 text-gray-400" />
                                <div className="mt-2">
                                  <label htmlFor={`additionalImage${index}`} className="cursor-pointer">
                                    <span className="text-sm text-gray-600 hover:text-blue-600">
                                      画像{index + 1}
                                    </span>
                                    <input
                                      id={`additionalImage${index}`}
                                      name={`additionalImage${index}`}
                                      type="file"
                                      accept="image/*"
                                      onChange={(e) => void handleAdditionalImageChange(e, index)}
                                      className="sr-only"
                                      disabled={imageUploading.additional[index]}
                                    />
                                  </label>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
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

        {/* 無料掲載キャンペーン */}
        <Card className="mb-6">
          <div className="p-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                <span className="font-medium text-green-800">無料掲載期間実施中！</span>
              </div>
              <p className="text-green-700 mb-2">
                すべてのペット関連施設が<strong className="text-lg">無料</strong>で掲載できます。
              </p>
              <ul className="text-sm text-green-600 space-y-1">
                <li>• 本人確認手続きは不要です</li>
                <li>• 申請後、管理者の承認を経て掲載開始となります</li>
                <li>• 無料掲載となりますので、お店などの施設、ホームページなどに当アプリのご紹介をお願いします。</li>
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
