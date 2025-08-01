import { ArrowLeft, Camera, X } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import ImageCropper from '../components/ImageCropper';
import Input from '../components/Input';
import { SEO } from '../components/SEO';
import Select from '../components/Select';
import useAuth from '../context/AuthContext';
import { dogBreeds } from '../data/dogBreeds';
import { logger } from '../utils/logger';
import { notify } from '../utils/notification';
import { supabase } from '../utils/supabase';
import { uploadVaccineImage, validateVaccineFile } from '../utils/vaccineUpload';

export function DogRegistration() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showImageCropper, setShowImageCropper] = useState(false);

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
    if (!formData.birthYear || !formData.birthMonth) return [];
    
    const year = parseInt(formData.birthYear);
    const month = parseInt(formData.birthMonth);
    const daysInMonth = new Date(year, month, 0).getDate();
    
    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      return { value: day.toString().padStart(2, '0'), label: `${day}日` };
    });
  };

  // プロフィール画像のクロップ完了処理
  const handleImageCropComplete = (croppedFile: File) => {
    setImageFile(croppedFile);
    const previewUrl = URL.createObjectURL(croppedFile);
    setImagePreview(previewUrl);
    setShowImageCropper(false);
    setError('');
  };

  // ワクチン画像のアップロード処理
  const handleVaccineImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'rabies' | 'combo'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const validationResult = validateVaccineFile(file);
      if (!validationResult.isValid) {
        setError(validationResult.error || 'ファイルが無効です。');
        return;
      }

      setFormData(prev => ({
        ...prev,
        [`${type}VaccineImage`]: file
      }));
      setError('');
    } catch (error) {
      console.error('Vaccine file validation error:', error);
      setError('ファイルの検証中にエラーが発生しました。');
    }
  };

  // フォームの送信処理
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('ログインが必要です。');
      return;
    }

    // バリデーション
    if (!formData.name.trim()) {
      setError('ワンちゃんの名前を入力してください。');
      return;
    }

    if (!formData.breed) {
      setError('犬種を選択してください。');
      return;
    }

    if (!formData.birthYear || !formData.birthMonth || !formData.birthDay) {
      setError('生年月日を選択してください。');
      return;
    }

    if (!formData.gender) {
      setError('性別を選択してください。');
      return;
    }

    if (!imageFile) {
      setError('プロフィール画像をアップロードしてください。');
      return;
    }

    if (!formData.rabiesVaccineImage) {
      setError('狂犬病ワクチン証明書をアップロードしてください。');
      return;
    }

    if (!formData.comboVaccineImage) {
      setError('混合ワクチン証明書をアップロードしてください。');
      return;
    }

    if (!formData.rabiesExpiryDate) {
      setError('狂犬病ワクチンの有効期限を入力してください。');
      return;
    }

    if (!formData.comboExpiryDate) {
      setError('混合ワクチンの有効期限を入力してください。');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // プロフィール画像のアップロード
      const profileImagePath = `dog-profiles/${user.id}/${Date.now()}_${imageFile.name}`;
      const { data: profileUploadData, error: profileUploadError } = await supabase.storage
        .from('dog-images')
        .upload(profileImagePath, imageFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (profileUploadError) {
        throw new Error(`プロフィール画像のアップロードに失敗しました: ${profileUploadError.message}`);
      }

      // プロフィール画像のURL取得
      const { data: profileImageUrl } = supabase.storage
        .from('dog-images')
        .getPublicUrl(profileImagePath);

      // ワクチン画像のアップロード
      let rabiesImageUrl = '';
      let comboImageUrl = '';

      if (formData.rabiesVaccineImage) {
        const rabiesUploadResult = await uploadVaccineImage(formData.rabiesVaccineImage, user.id, 'rabies');
        rabiesImageUrl = rabiesUploadResult.url;
      }

      if (formData.comboVaccineImage) {
        const comboUploadResult = await uploadVaccineImage(formData.comboVaccineImage, user.id, 'combo');
        comboImageUrl = comboUploadResult.url;
      }

      // 誕生日を日付形式に変換
      const birthDate = `${formData.birthYear}-${formData.birthMonth}-${formData.birthDay}`;

      // ワンちゃんの情報をデータベースに保存
      const { data: dogData, error: dogError } = await supabase
        .from('dogs')
        .insert([
          {
            owner_id: user.id,
            name: formData.name.trim(),
            breed: formData.breed,
            birth_date: birthDate,
            gender: formData.gender,
            profile_image_url: profileImageUrl.publicUrl,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ])
        .select()
        .single();

      if (dogError) {
        throw new Error(`ワンちゃんの登録に失敗しました: ${dogError.message}`);
      }

      // ワクチン証明書の情報を保存
      const vaccineInserts = [];

      if (rabiesImageUrl) {
        vaccineInserts.push({
          dog_id: dogData.id,
          vaccine_type: 'rabies',
          certificate_image_url: rabiesImageUrl,
          expiry_date: formData.rabiesExpiryDate,
          status: 'pending',
          created_at: new Date().toISOString()
        });
      }

      if (comboImageUrl) {
        vaccineInserts.push({
          dog_id: dogData.id,
          vaccine_type: 'combo',
          certificate_image_url: comboImageUrl,
          expiry_date: formData.comboExpiryDate,
          status: 'pending',
          created_at: new Date().toISOString()
        });
      }

      if (vaccineInserts.length > 0) {
        const { error: vaccineError } = await supabase
          .from('vaccine_certifications')
          .insert(vaccineInserts);

        if (vaccineError) {
          console.error('ワクチン証明書の保存エラー:', vaccineError);
          // ワクチン証明書の保存エラーは警告として処理（ワンちゃんの登録は成功）
          logger.warn('ワクチン証明書の保存でエラーが発生しましたが、ワンちゃんの登録は完了しました', { error: vaccineError });
        }
      }

      // 成功通知
      notify.success('ワンちゃんの登録が完了しました！');
      
      // ダッシュボードにリダイレクト
      navigate('/dashboard');

    } catch (error) {
      console.error('Dog registration error:', error);
      logger.error('ワンちゃんの登録でエラーが発生しました', { error });
      setError(error instanceof Error ? error.message : 'ワンちゃんの登録中にエラーが発生しました。');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <SEO 
        title="ワンちゃん登録"
        description="愛犬の情報を登録してドッグランを利用しましょう"
      />
      
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-8">
        <div className="max-w-2xl mx-auto px-4">
          {/* ヘッダー */}
          <div className="mb-8">
            <Link 
              to="/dashboard" 
              className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              戻る
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">ワンちゃん登録</h1>
            <p className="text-gray-600">
              愛犬の基本情報とワクチン証明書を登録してください
            </p>
          </div>

          <Card className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* エラー表示 */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              {/* プロフィール画像 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  プロフィール画像 <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center space-x-4">
                  {imagePreview ? (
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="プロフィール画像プレビュー"
                        className="w-24 h-24 rounded-full object-cover border-2 border-gray-300"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setImageFile(null);
                          setImagePreview(null);
                        }}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
                      <Camera className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                  
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowImageCropper(true)}
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    {imageFile ? '画像を変更' : '画像を選択'}
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  1:1比率で切り取られ、最適化されます
                </p>
              </div>

              {/* 基本情報 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Input
                    label="ワンちゃんの名前"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="例: ポチ"
                    required
                  />
                </div>

                <div>
                  <Select
                    label="犬種"
                    value={formData.breed}
                    onChange={(e) => setFormData(prev => ({ ...prev, breed: e.target.value }))}
                    options={[
                      { value: '', label: '犬種を選択してください' },
                      ...dogBreeds.map(breed => ({ value: breed, label: breed }))
                    ]}
                    required
                  />
                </div>
              </div>

              {/* 生年月日 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  生年月日 <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <Select
                    value={formData.birthYear}
                    onChange={(e) => {
                      setFormData(prev => ({ 
                        ...prev, 
                        birthYear: e.target.value,
                        birthDay: '' // 年が変わったら日をリセット
                      }));
                    }}
                    options={[
                      { value: '', label: '年' },
                      ...yearOptions
                    ]}
                    required
                  />
                  <Select
                    value={formData.birthMonth}
                    onChange={(e) => {
                      setFormData(prev => ({ 
                        ...prev, 
                        birthMonth: e.target.value,
                        birthDay: '' // 月が変わったら日をリセット
                      }));
                    }}
                    options={[
                      { value: '', label: '月' },
                      ...monthOptions
                    ]}
                    required
                  />
                  <Select
                    value={formData.birthDay}
                    onChange={(e) => setFormData(prev => ({ ...prev, birthDay: e.target.value }))}
                    options={[
                      { value: '', label: '日' },
                      ...getDayOptions()
                    ]}
                    required
                    disabled={!formData.birthYear || !formData.birthMonth}
                  />
                </div>
              </div>

              {/* 性別 */}
              <div>
                <Select
                  label="性別"
                  value={formData.gender}
                  onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value }))}
                  options={[
                    { value: '', label: '性別を選択してください' },
                    { value: 'male', label: 'オス' },
                    { value: 'female', label: 'メス' }
                  ]}
                  required
                />
              </div>

              {/* ワクチン証明書 */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">ワクチン証明書</h3>
                
                {/* 狂犬病ワクチン */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    狂犬病ワクチン証明書 <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleVaccineImageUpload(e, 'rabies')}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        required
                      />
                      {formData.rabiesVaccineImage && (
                        <p className="text-xs text-green-600 mt-1">
                          ✓ {formData.rabiesVaccineImage.name}
                        </p>
                      )}
                    </div>
                    <Input
                      label="有効期限"
                      type="date"
                      value={formData.rabiesExpiryDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, rabiesExpiryDate: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                {/* 混合ワクチン */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    混合ワクチン証明書 <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleVaccineImageUpload(e, 'combo')}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        required
                      />
                      {formData.comboVaccineImage && (
                        <p className="text-xs text-green-600 mt-1">
                          ✓ {formData.comboVaccineImage.name}
                        </p>
                      )}
                    </div>
                    <Input
                      label="有効期限"
                      type="date"
                      value={formData.comboExpiryDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, comboExpiryDate: e.target.value }))}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* 提出ボタン */}
              <div className="flex justify-end space-x-4">
                <Link to="/dashboard">
                  <Button type="button" variant="outline">
                    キャンセル
                  </Button>
                </Link>
                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="min-w-[120px]"
                >
                  {isLoading ? '登録中...' : 'ワンちゃんを登録'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>

      {/* Image Cropper Modal */}
      {showImageCropper && (
        <ImageCropper
          onCropComplete={handleImageCropComplete}
          onCancel={() => setShowImageCropper(false)}
          aspectRatio={1}
          maxWidth={400}
          maxHeight={400}
        />
      )}
    </>
  );
}
