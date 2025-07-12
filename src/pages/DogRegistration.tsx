import { useState } from 'react';
import { Link } from 'react-router-dom';
import Input from '../components/Input';
import Select from '../components/Select';
import Button from '../components/Button';
import Card from '../components/Card';
import { X, Camera, Upload, Loader, ArrowLeft } from 'lucide-react';
import { dogBreeds } from '../data/dogBreeds';
import { supabase } from '../utils/supabase';
import useAuth from '../context/AuthContext';
import { validateVaccineFile } from '../utils/vaccineUpload';
import { handleVaccineUploadFixed } from '../utils/vaccineUploadFixed';


export function DogRegistration() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    breed: '',
    birthYear: '',
    birthMonth: '',
    birthDay: '',
    gender: '',
    rabiesVaccineImage: null as File | null,
    comboVaccineImage: null as File | null,
    rabiesExpiryDate: '',
    comboExpiryDate: '',
  });

  // 年のオプション（現在年から20年前まで）
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 21 }, (_, i) => {
    const year = currentYear - i;
    return { value: year.toString(), label: `${year}年` };
  });

  // 月のオプション
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    return { value: month.toString().padStart(2, '0'), label: `${month}月` };
  });

  // 日のオプション（選択された年月に応じて動的に変更）
  const getDayOptions = () => {
    if (!formData.birthYear || !formData.birthMonth) {
      return Array.from({ length: 31 }, (_, i) => {
        const day = i + 1;
        return { value: day.toString().padStart(2, '0'), label: `${day}日` };
      });
    }

    const year = parseInt(formData.birthYear);
    const month = parseInt(formData.birthMonth);
    const daysInMonth = new Date(year, month, 0).getDate();

    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      return { value: day.toString().padStart(2, '0'), label: `${day}日` };
    });
  };

  // 生年月日の妥当性チェック
  const isValidBirthDate = () => {
    if (!formData.birthYear || !formData.birthMonth || !formData.birthDay) {
      return false;
    }

    const year = parseInt(formData.birthYear);
    const month = parseInt(formData.birthMonth);
    const day = parseInt(formData.birthDay);
    
    const birthDate = new Date(year, month - 1, day);
    const today = new Date();
    
    // 未来の日付でないかチェック
    if (birthDate > today) {
      return false;
    }

    // 20年以上前でないかチェック
    const twentyYearsAgo = new Date();
    twentyYearsAgo.setFullYear(twentyYearsAgo.getFullYear() - 20);
    
    if (birthDate < twentyYearsAgo) {
      return false;
    }

    return true;
  };

  // 画像ファイルの選択処理
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log('Selected file:', file.name, file.size, file.type);
      
      // ファイルサイズチェック（10MB以下）
      if (file.size > 10 * 1024 * 1024) {
        setError('画像ファイルは10MB以下にしてください。');
        return;
      }

      // ファイル形式チェック
      if (!file.type.startsWith('image/')) {
        setError('画像ファイルを選択してください。');
        return;
      }

      setImageFile(file);
      
      // プレビュー画像を作成
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
        console.log('Image preview created');
      };
      reader.readAsDataURL(file);
      setError('');
    }
  };

  // 画像を削除
  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      console.log('=== DOG REGISTRATION START ===');
      console.log('Starting dog registration for user:', user?.id);

      // 生年月日の妥当性チェック
      if (!isValidBirthDate()) {
        setError('正しい生年月日を選択してください。');
        setIsLoading(false);
        return;
      }

      // ワクチン有効期限の妥当性チェック
      if (!formData.rabiesExpiryDate || !formData.comboExpiryDate) {
        setError('ワクチンの有効期限を入力してください。');
        setIsLoading(false);
        return;
      }

      const today = new Date();
      const rabiesExpiry = new Date(formData.rabiesExpiryDate);
      const comboExpiry = new Date(formData.comboExpiryDate);

      if (rabiesExpiry <= today || comboExpiry <= today) {
        setError('ワクチンの有効期限は今日より後の日付を入力してください。');
        setIsLoading(false);
        return;
      }

      // 生年月日を文字列に変換
      const birthDate = `${formData.birthYear}-${formData.birthMonth}-${formData.birthDay}`;
      
      // 性別の値を正規化（データベース制約に合わせる）
      let normalizedGender: string;
      if (formData.gender === 'オス' || formData.gender === 'male' || formData.gender.toLowerCase() === 'male') {
        normalizedGender = 'オス';
      } else if (formData.gender === 'メス' || formData.gender === 'female' || formData.gender.toLowerCase() === 'female') {
        normalizedGender = 'メス';
      } else {
        setError('性別を正しく選択してください。');
        setIsLoading(false);
        return;
      }
      
      console.log('Original gender:', formData.gender, 'Normalized gender:', normalizedGender);
      
      // プロフィールが存在するかチェック
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, name, user_type')
        .eq('id', user?.id)
        .maybeSingle();

      console.log('Profile check result:', profile, profileError);

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Profile error:', profileError);
        throw profileError;
      }

      // プロフィールが存在しない場合は作成（upsertを使用）
      if (!profile) {
        console.log('Creating profile for dog registration using upsert');
        const defaultName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'ユーザー';
        
        const { data: newProfile, error: createProfileError } = await supabase
          .from('profiles')
          .upsert([{
            id: user?.id,
            user_type: 'user',
            name: defaultName,
            postal_code: '',
            address: '',
            phone_number: '',
          }], { onConflict: 'id' })
          .select()
          .single();

        if (createProfileError) {
          console.error('Profile upsert error:', createProfileError);
          throw createProfileError;
        }
        console.log('Profile upserted successfully:', newProfile);
      } else {
        console.log('Profile exists:', profile);
      }

      // 犬の情報を登録
      console.log('Registering dog with data:', { 
        name: formData.name,
        breed: formData.breed,
        birth_date: birthDate,
        gender: normalizedGender,
        owner_id: user?.id,
      });
      
      const { data: dog, error: dogError } = await supabase.from('dogs').insert([
        {
          name: formData.name,
          breed: formData.breed,
          birth_date: birthDate,
          gender: normalizedGender,
          owner_id: user?.id,
        },
      ]).select().single();

      if (dogError) {
        console.error('🚨 Dog registration error:', dogError);
        console.error('🚨 Error details:', {
          message: dogError.message,
          code: dogError.code,
          details: dogError.details,
          hint: dogError.hint
        });
        throw dogError;
      }

      console.log('✅ Dog registered successfully:', dog);
      console.log('✅ Dog ID generated:', dog.id);

      // 犬の画像をアップロード
      let imageUrl = null;
      if (imageFile) {
        console.log('Uploading dog image...');
        
        try {
          // ファイル名を生成（タイムスタンプ付きで重複を避ける）
          const fileExt = imageFile.name.split('.').pop() || 'jpg';
          const timestamp = Date.now();
          const fileName = `${dog.id}/profile_${timestamp}.${fileExt}`;
          
          console.log('Uploading to path:', fileName);
          
          // Supabaseストレージにアップロード（Content-Type明示）
          console.log('🔧 Uploading dog image with Content-Type:', imageFile.type);
          
          const { error: uploadError } = await supabase.storage
            .from('dog-images')
            .upload(fileName, imageFile, {
              cacheControl: '3600',
              upsert: true,
              contentType: imageFile.type  // ← 重要: Content-Typeを明示
            });

          if (uploadError) {
            console.error('Image upload error:', uploadError);
            throw new Error(`画像のアップロードに失敗しました: ${uploadError.message}`);
          }

          console.log('Upload successful');

          // 公開URLを取得
          const { data: { publicUrl } } = supabase.storage
            .from('dog-images')
            .getPublicUrl(fileName);
          
          imageUrl = publicUrl;
          console.log('Public URL generated:', imageUrl);

          // 犬の情報に画像URLを更新
          const { error: updateError } = await supabase
            .from('dogs')
            .update({ image_url: imageUrl })
            .eq('id', dog.id);

          if (updateError) {
            console.error('Error updating dog image URL:', updateError);
            throw new Error('画像URLの更新に失敗しました');
          }

          console.log('Dog image URL updated successfully');
        } catch (imageError) {
          console.error('Image processing error:', imageError);
          // 画像エラーは警告として扱い、登録は続行
          setError('画像のアップロードに失敗しましたが、ワンちゃんの登録は完了しました。後でマイページから画像を追加できます。');
        }
      }

      // ワクチン証明書の画像をアップロード（新しいユーティリティを使用）
      if (formData.rabiesVaccineImage && formData.comboVaccineImage) {
        console.log('🧪 Starting vaccine certificates upload using utility...');
        
        const uploadResult = await handleVaccineUploadFixed(
          dog.id,
          formData.rabiesVaccineImage,
          formData.comboVaccineImage,
          formData.rabiesExpiryDate,
          formData.comboExpiryDate
        );

        if (!uploadResult.success) {
          console.error('Vaccine upload failed:', uploadResult.error);
          setError(`ワクチン証明書のアップロードに失敗しました: ${uploadResult.error}`);
          // エラーの場合でも登録は続行し、後でマイページから追加可能
        } else {
          console.log('✅ Vaccine certificates uploaded successfully');
        }
      }

      console.log('Dog registration completed successfully');
      
      // 成功メッセージを表示
      alert('ワンちゃんの登録が完了しました！');
      
      // フォームをリセット
      setFormData({
        name: '',
        breed: '',
        birthYear: '',
        birthMonth: '',
        birthDay: '',
        gender: '',
        rabiesVaccineImage: null,
        comboVaccineImage: null,
        rabiesExpiryDate: '',
        comboExpiryDate: '',
      });
      setImageFile(null);
      setImagePreview(null);
      
    } catch (err) {
      console.error('Registration error:', err);
      setError('ワンちゃんの登録に失敗しました。もう一度お試しください。');
    } finally {
      setIsLoading(false);
    }
  };

  const breedOptions = dogBreeds.map((breed) => ({
    value: breed,
    label: breed,
  }));

  const genderOptions = [
    { value: '', label: '性別を選択してください' },
    { value: 'オス', label: 'オス' },
    { value: 'メス', label: 'メス' },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* ヘッダー */}
      <div>
        <Link to="/dashboard" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-2">
          <ArrowLeft className="w-4 h-4 mr-1" />
          ダッシュボードに戻る
        </Link>
        <h1 className="text-2xl font-bold">ワンちゃん登録</h1>
        <p className="text-gray-600">新しいワンちゃんを登録して、ドッグランを利用しましょう</p>
      </div>

      {/* 既存のワンちゃん管理へのリンク */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-blue-900">既に登録済みのワンちゃんがいますか？</h3>
            <p className="text-sm text-blue-700">登録済みのワンちゃんの情報を確認・編集できます</p>
          </div>
          <Link to="/dog-management">
            <Button variant="secondary" size="sm">
              ワンちゃん管理
            </Button>
          </Link>
        </div>
      </div>
      
      <Card>
        <form onSubmit={handleSubmit}>
          {/* エラーメッセージ */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
              {error}
            </div>
          )}





          {/* 犬の画像アップロード */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ワンちゃんの写真（任意）
            </label>
            

            
            {imagePreview ? (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="ワンちゃんのプレビュー"
                  className="w-full h-64 object-cover rounded-lg border-2 border-gray-300"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                {imageFile && (
                  <div className="absolute bottom-2 left-2 bg-white bg-opacity-90 text-gray-800 text-xs px-2 py-1 rounded border shadow-sm">
                    {imageFile.name}
                  </div>
                )}
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                  id="dog-image"

                />
                <label
                  htmlFor="dog-image"
                                      className="cursor-pointer flex flex-col items-center"
                >
                  <Camera className="w-12 h-12 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-600">
                    クリックして画像を選択
                  </span>
                  <span className="text-xs text-gray-500 mt-1">
                    JPG, PNG, GIF (最大10MB)
                  </span>

                </label>
              </div>
            )}
          </div>

          {/* 基本情報 */}
          <Input
            label="名前"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          
          <Select
            label="犬種"
            options={breedOptions}
            value={formData.breed}
            onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
            required
          />
          
          {/* 生年月日の選択 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              生年月日 *
            </label>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <select
                  value={formData.birthYear}
                  onChange={(e) => {
                    setFormData({ 
                      ...formData, 
                      birthYear: e.target.value,
                      birthDay: ''
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">年</option>
                  {yearOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <select
                  value={formData.birthMonth}
                  onChange={(e) => {
                    setFormData({ 
                      ...formData, 
                      birthMonth: e.target.value,
                      birthDay: ''
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">月</option>
                  {monthOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <select
                  value={formData.birthDay}
                  onChange={(e) => setFormData({ ...formData, birthDay: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={!formData.birthYear || !formData.birthMonth}
                >
                  <option value="">日</option>
                  {getDayOptions().map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {formData.birthYear && formData.birthMonth && !formData.birthDay && (
              <p className="mt-1 text-sm text-gray-500">
                日を選択してください
              </p>
            )}
            {formData.birthYear && formData.birthMonth && formData.birthDay && !isValidBirthDate() && (
              <p className="mt-1 text-sm text-red-500">
                正しい生年月日を選択してください（未来の日付や20年以上前の日付は選択できません）
              </p>
            )}
          </div>

          <Select
            label="性別"
            options={genderOptions}
            value={formData.gender}
            onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
            required
          />

          {/* ワクチン証明書 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">ワクチン証明書</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                狂犬病ワクチン接種証明書 *
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const validation = validateVaccineFile(file);
                    if (!validation.isValid) {
                      setError(validation.error || 'ファイルの検証に失敗しました');
                      return;
                    }
                    setError(''); // 成功時にエラーをクリア
                  }
                  setFormData({ ...formData, rabiesVaccineImage: file || null });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                狂犬病ワクチン有効期限 *
              </label>
              <input
                type="date"
                value={formData.rabiesExpiryDate}
                onChange={(e) => setFormData({ ...formData, rabiesExpiryDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                混合ワクチン接種証明書 *
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const validation = validateVaccineFile(file);
                    if (!validation.isValid) {
                      setError(validation.error || 'ファイルの検証に失敗しました');
                      return;
                    }
                    setError(''); // 成功時にエラーをクリア
                  }
                  setFormData({ ...formData, comboVaccineImage: file || null });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                混合ワクチン有効期限 *
              </label>
              <input
                type="date"
                value={formData.comboExpiryDate}
                onChange={(e) => setFormData({ ...formData, comboExpiryDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>
          </div>

          {/* 注意事項 */}
          <div className="space-y-3">
            <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
              <p className="text-sm text-yellow-800">
                ※ ワクチン接種証明書は運営による確認後に承認されます。承認されるまでドッグランの利用はできません。
              </p>
            </div>
            
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <span className="font-medium">ワクチン証明書について:</span><br />
                • 管理者が確認しやすい形で保存されます<br />
                • 承認されると正式にワクチン情報として登録されます<br />
                • 承認後、全国のドッグランをご利用いただけます
              </p>
            </div>
          </div>
          
          <Button 
            type="submit" 
            isLoading={isLoading} 
            className="w-full"

          >
            ワンちゃんを登録する
          </Button>
        </form>
      </Card>
    </div>
  );
}