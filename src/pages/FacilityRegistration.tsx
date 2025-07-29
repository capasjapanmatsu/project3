import {
    AlertCircle,
    Building,
    CheckCircle,
    Image as ImageIcon
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import Input from '../components/Input';
import useAuth from '../context/AuthContext';
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
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  
  // ユーザー情報（自動取得・編集可能）
  const [userInfo, setUserInfo] = useState({
    name: '',
    address: '',
    isEditing: false
  });

  const [formData, setFormData] = useState<FacilityForm>({
    name: '',
    category_id: '',
    address: '',
    phone: '',
    website: '',
    description: ''
  });

  // 認証チェック
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  // userProfileが変更された時にuserInfoを自動設定
  useEffect(() => {
    console.log('📋 ユーザープロファイル確認:', userProfile);
    console.log('👤 認証ユーザー確認:', user);
    
    const fetchUserProfile = async () => {
      if (userProfile) {
        // userProfileの全プロパティをログ出力
        console.log('👤 利用可能なプロフィールフィールド:', Object.keys(userProfile));
        
        const userName = userProfile.name || userProfile.display_name || userProfile.full_name || '';
        const userAddress = userProfile.address || userProfile.location || userProfile.postal_address || '';
        
        console.log('✅ プロファイルから取得した情報:', {
          name: userName,
          address: userAddress,
          originalProfile: userProfile
        });
        
        setUserInfo({
          name: userName,
          address: userAddress,
          isEditing: false
        });
      } else if (user) {
        console.log('🔄 userProfileがnullのため、Supabaseから直接取得を試行');
        
        try {
          // Supabaseから直接プロフィール情報を取得
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
          
          console.log('📋 Supabaseから取得したプロフィール:', { profile, error });
          
          if (profile && !error) {
            const userName = profile.name || profile.display_name || profile.full_name || '';
            const userAddress = profile.address || profile.location || profile.postal_address || '';
            
            console.log('✅ Supabaseから取得した情報:', {
              name: userName,
              address: userAddress,
              profileData: profile
            });
            
            setUserInfo({
              name: userName,
              address: userAddress,
              isEditing: !userName || !userAddress
            });
          } else {
            // Supabaseにプロフィールがない場合、user_metadataを確認
            console.log('📧 認証ユーザーから情報取得:', {
              email: user.email,
              user_metadata: user.user_metadata,
              app_metadata: user.app_metadata
            });
            
            const userMetadata = user.user_metadata || {};
            console.log('🔍 user_metadata詳細分析:', {
              全キー: Object.keys(userMetadata),
              全データ: userMetadata,
              name候補: {
                name: userMetadata.name,
                full_name: userMetadata.full_name,
                display_name: userMetadata.display_name,
                given_name: userMetadata.given_name,
                family_name: userMetadata.family_name,
                nickname: userMetadata.nickname
              },
              address候補: {
                address: userMetadata.address,
                location: userMetadata.location,
                postal_address: userMetadata.postal_address,
                street_address: userMetadata.street_address,
                formatted_address: userMetadata.formatted_address
              }
            });
            
            // より多くのフィールドから名前を取得
            const userName = userMetadata.name || 
                            userMetadata.full_name || 
                            userMetadata.display_name || 
                            userMetadata.given_name ||
                            userMetadata.nickname ||
                            (userMetadata.given_name && userMetadata.family_name ? 
                              `${userMetadata.family_name} ${userMetadata.given_name}` : '') ||
                            '';
                            
            // より多くのフィールドから住所を取得
            const userAddress = userMetadata.address || 
                               userMetadata.location || 
                               userMetadata.postal_address ||
                               userMetadata.street_address ||
                               userMetadata.formatted_address ||
                               '';
            
            console.log('✅ 認証ユーザーから取得した情報:', {
              name: userName,
              address: userAddress,
              emailFallback: user.email // 最終手段としてemailを表示
            });
            
            setUserInfo({
              name: userName,
              address: userAddress,
              isEditing: !userName || !userAddress // 情報が不完全な場合は編集モードにする
            });
          }
        } catch (error) {
          console.error('❌ プロフィール取得エラー:', error);
          setUserInfo({
            name: '',
            address: '',
            isEditing: true
          });
        }
      } else {
        console.log('❌ userProfileと認証ユーザーが未定義');
        // デフォルト値を設定（手動入力可能）
        setUserInfo({
          name: '',
          address: '',
          isEditing: true // 自動入力できない場合は編集モードにする
        });
      }
    };
    
    fetchUserProfile();
  }, [userProfile, user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
          address: userInfo.address
        })
        .eq('id', user.id);

      if (error) throw error;

      setUserInfo(prev => ({ ...prev, isEditing: false }));
      setSuccessMessage('ユーザー情報を更新しました');
    } catch (err) {
      console.error('Error updating user info:', err);
      setError('ユーザー情報の更新に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // 編集キャンセルハンドラー  
  const cancelUserInfoEdit = () => {
    // 元の値に戻す（ここでは簡単に編集モードを終了）
    setUserInfo(prev => ({ ...prev, isEditing: false }));
  };

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

      // 施設情報を登録
      const { data: facilityData, error: facilityError } = await supabase
        .from('pet_facilities')
        .insert({
          name: formData.name,
          category_id: formData.category_id,
          address: formData.address,
          phone: formData.phone || null,
          website: formData.website || null,
          description: formData.description || null,
          owner_id: user.id,
          status: 'pending'
        })
        .select()
        .single();

      if (facilityError) throw facilityError;

      setSuccessMessage('施設の申請が正常に送信されました。承認をお待ちください。');
      
      // フォームをリセット
      setFormData({
        name: '',
        category_id: '',
        address: '',
        phone: '',
        website: '',
        description: ''
      });

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
                  施設説明
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="施設の特徴やサービス内容を説明してください"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* 施設画像に関する案内 */}
        <Card>
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <ImageIcon className="w-6 h-6 mr-2" />
              施設画像について
            </h2>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-1 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-medium text-blue-800 mb-1">画像のアップロードについて</h3>
                  <p className="text-sm text-blue-700">
                    掲載画像は承認後にマイページ内で添付することができます。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* ユーザー情報セクション */}
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
                  <p className="text-xs mb-2">
                    アカウント情報から自動取得されました。変更が必要な場合は編集できます。
                  </p>
                  <p className="text-xs font-medium text-blue-600">
                    ⚠️ この情報は公開されません
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  氏名
                </label>
                {userInfo.isEditing ? (
                  <Input
                    label=""
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  住所
                </label>
                {userInfo.isEditing ? (
                  <Input
                    name="address"
                    value={userInfo.address}
                    onChange={handleUserInfoChange}
                    placeholder="住所を入力してください"
                  />
                ) : (
                  <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md">
                    <p className="text-gray-900">{userInfo.address || '未設定'}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end mt-4">
              {userInfo.isEditing ? (
                <div className="space-x-2">
                  <Button
                    type="button"
                    onClick={() => void saveUserInfo()}
                    disabled={isLoading}
                  >
                    {isLoading ? '保存中...' : '保存'}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={cancelUserInfoEdit}
                    disabled={isLoading}
                  >
                    キャンセル
                  </Button>
                </div>
              ) : (
                <Button 
                  type="button"
                  variant="secondary"
                  onClick={() => setUserInfo(prev => ({ ...prev, isEditing: true }))}
                >
                  編集
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* 申請ボタン */}
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isLoading}
            className="px-8 py-3 text-lg"
          >
            {isLoading ? '申請中...' : '申請を送信'}
          </Button>
        </div>
      </form>
    </div>
  );
}
