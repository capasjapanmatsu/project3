import { useState, useEffect } from 'react';
import Input from '../components/Input';
import Select from '../components/Select';
import Button from '../components/Button';
import Card from '../components/Card';
import { X, PawPrint, Edit, AlertTriangle, Camera } from 'lucide-react';
import { dogBreeds } from '../data/dogBreeds';
import { supabase } from '../utils/supabase';
import { useAuth } from '../context/AuthContext';
import type { Dog } from '../types';
import imageCompression from 'browser-image-compression';

export function DogRegistration() {

  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [registeredDogs, setRegisteredDogs] = useState<Dog[]>([]);
  const [isLoadingDogs, setIsLoadingDogs] = useState(true);
  const [selectedDog, setSelectedDog] = useState<Dog | null>(null);
  const [isEditing, setIsEditing] = useState(false);
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

  useEffect(() => {
    if (user) {
      fetchRegisteredDogs();
    }
  }, [user]);

  const fetchRegisteredDogs = async () => {
    try {
      setIsLoadingDogs(true);
      const { data, error } = await supabase
        .from('dogs')
        .select(`
          *,
          vaccine_certifications(*)
        `)
        .eq('owner_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRegisteredDogs(data || []);
    } catch (err) {
      console.error('Error fetching registered dogs:', err);
    } finally {
      setIsLoadingDogs(false);
    }
  };

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
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      // 画像圧縮・リサイズ処理
      try {
        const options = {
          maxSizeMB: 0.3, // 最大0.3MB
          maxWidthOrHeight: 800, // 最大幅・高さ800px
          useWebWorker: true,
        };
        const compressedFile = await imageCompression(file, options);
        setImageFile(compressedFile);
        // プレビュー画像を作成
        const reader = new FileReader();
        reader.onload = (e) => {
          setImagePreview(e.target?.result as string);
          console.log('Image preview created (compressed)');
        };
        reader.readAsDataURL(compressedFile);
        setError('');
      } catch (err) {
        setError('画像の圧縮・リサイズに失敗しました');
        return;
      }
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
      // データベースの制約では 'オス' と 'メス' のみが許可されている
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
        console.error('Dog registration error:', dogError);
        throw dogError;
      }

      console.log('Dog registered successfully:', dog);

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
          
          // Supabaseストレージにアップロード
          const { error: uploadError } = await supabase.storage
            .from('dog-images')
            .upload(fileName, imageFile, {
              cacheControl: '3600',
              upsert: true
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

      // ワクチン証明書の画像をアップロード
      if (formData.rabiesVaccineImage && formData.comboVaccineImage) {
        console.log('Uploading vaccine certificates');
        
        try {
          const rabiesExt = formData.rabiesVaccineImage.name.split('.').pop() || 'jpg';
          const comboExt = formData.comboVaccineImage.name.split('.').pop() || 'jpg';
          const timestamp = Date.now();
          
          const rabiesPath = `${dog.id}/rabies_${timestamp}.${rabiesExt}`;
          const comboPath = `${dog.id}/combo_${timestamp}.${comboExt}`;

          const [rabiesUpload, comboUpload] = await Promise.all([
            supabase.storage
              .from('vaccine-certs')
              .upload(rabiesPath, formData.rabiesVaccineImage, {
                cacheControl: '3600',
                upsert: true
              }),
            supabase.storage
              .from('vaccine-certs')
              .upload(comboPath, formData.comboVaccineImage, {
                cacheControl: '3600',
                upsert: true
              }),
          ]);

          if (rabiesUpload.error) {
            console.error('Rabies upload error:', rabiesUpload.error);
            throw rabiesUpload.error;
          }
          if (comboUpload.error) {
            console.error('Combo upload error:', comboUpload.error);
            throw comboUpload.error;
          }

          // 証明書情報をデータベースに登録（有効期限付き）
          const { error: certError } = await supabase
            .from('vaccine_certifications')
            .insert([
              {
                dog_id: dog.id,
                rabies_vaccine_image: rabiesPath,
                combo_vaccine_image: comboPath,
                rabies_expiry_date: formData.rabiesExpiryDate,
                combo_expiry_date: formData.comboExpiryDate,
              },
            ]);

          if (certError) {
            console.error('Certificate registration error:', certError);
            throw certError;
          }
          console.log('Vaccine certificates uploaded successfully');
        } catch (certError) {
          console.error('Vaccine certificate error:', certError);
          setError('ワクチン証明書のアップロードに失敗しました。後でマイページから追加してください。');
        }
      }

      console.log('Dog registration completed successfully');
      
      // 登録完了後、登録済みの犬を再取得
      await fetchRegisteredDogs();
      
      // フォームをリセットする
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
      setIsEditing(false);
      
      // 成功メッセージを表示
      alert('ワンちゃんの登録が完了しました！');
    } catch (err) {
      console.error('Registration error:', err);
      setError('ワンちゃんの登録に失敗しました。もう一度お試しください。');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditDog = (dog: Dog) => {
    setSelectedDog(dog);
    
    // 生年月日を分解
    const birthDate = new Date(dog.birth_date);
    const year = birthDate.getFullYear().toString();
    const month = (birthDate.getMonth() + 1).toString().padStart(2, '0');
    const day = birthDate.getDate().toString().padStart(2, '0');
    
    setFormData({
      name: dog.name,
      breed: dog.breed,
      birthYear: year,
      birthMonth: month,
      birthDay: day,
      gender: dog.gender,
      rabiesVaccineImage: null,
      comboVaccineImage: null,
      rabiesExpiryDate: dog.vaccine_certifications?.[0]?.rabies_expiry_date || '',
      comboExpiryDate: dog.vaccine_certifications?.[0]?.combo_expiry_date || '',
    });
    
    setImagePreview(dog.image_url || null);
    setIsEditing(true);
  };

  const handleUpdateDog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDog) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      // 生年月日の妥当性チェック
      if (!isValidBirthDate()) {
        setError('正しい生年月日を選択してください。');
        setIsLoading(false);
        return;
      }
      
      // 生年月日を文字列に変換
      const birthDate = `${formData.birthYear}-${formData.birthMonth}-${formData.birthDay}`;
      
      // 性別の値を正規化
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
      
      // 犬の画像をアップロード
      let imageUrl = selectedDog.image_url;
      if (imageFile) {
        try {
          // ファイル名を生成
          const fileExt = imageFile.name.split('.').pop() || 'jpg';
          const timestamp = Date.now();
          const fileName = `${selectedDog.id}/profile_${timestamp}.${fileExt}`;
          
          // Supabaseストレージにアップロード
          const { error: uploadError } = await supabase.storage
            .from('dog-images')
            .upload(fileName, imageFile, {
              cacheControl: '3600',
              upsert: true
            });

          if (uploadError) {
            console.error('Image upload error:', uploadError);
            throw new Error(`画像のアップロードに失敗しました: ${uploadError.message}`);
          }

          // 公開URLを取得
          const { data: { publicUrl } } = supabase.storage
            .from('dog-images')
            .getPublicUrl(fileName);
          
          imageUrl = publicUrl;
        } catch (imageError) {
          console.error('Image processing error:', imageError);
          // 画像エラーは警告として扱い、更新は続行
          setError('画像のアップロードに失敗しましたが、ワンちゃんの情報は更新されました。');
        }
      }
      
      // 犬の情報を更新
      const { error: dogError } = await supabase
        .from('dogs')
        .update({
          name: formData.name,
          breed: formData.breed,
          birth_date: birthDate,
          gender: normalizedGender,
          image_url: imageUrl,
        })
        .eq('id', selectedDog.id);

      if (dogError) {
        console.error('Dog update error:', dogError);
        throw dogError;
      }
      
      // ワクチン証明書の更新（新しい画像がある場合）
      if (formData.rabiesVaccineImage || formData.comboVaccineImage) {
        try {
          // 既存の証明書を確認
          const { data: existingCert, error: certError } = await supabase
            .from('vaccine_certifications')
            .select('id')
            .eq('dog_id', selectedDog.id)
            .maybeSingle();
            
          if (certError && certError.code !== 'PGRST116') {
            console.error('Error checking existing certificate:', certError);
            throw certError;
          }
          
          // 新しい画像のアップロード
          let rabiesPath = selectedDog.vaccine_certifications?.[0]?.rabies_vaccine_image || null;
          let comboPath = selectedDog.vaccine_certifications?.[0]?.combo_vaccine_image || null;
          
          if (formData.rabiesVaccineImage) {
            const rabiesExt = formData.rabiesVaccineImage.name.split('.').pop() || 'jpg';
            const timestamp = Date.now();
            rabiesPath = `${selectedDog.id}/rabies_${timestamp}.${rabiesExt}`;
            console.log('rabiesPath:', rabiesPath);
            console.log('rabiesVaccineImage:', formData.rabiesVaccineImage);
            const { error: rabiesError } = await supabase.storage
              .from('vaccine-certs')
              .upload(rabiesPath, formData.rabiesVaccineImage, {
                cacheControl: '3600',
                upsert: true
              });
            if (rabiesError) {
              console.error('Rabies upload error:', rabiesError);
              throw rabiesError;
            }
          }
          
          if (formData.comboVaccineImage) {
            const comboExt = formData.comboVaccineImage.name.split('.').pop() || 'jpg';
            const timestamp = Date.now();
            comboPath = `${selectedDog.id}/combo_${timestamp}.${comboExt}`;
            console.log('comboPath:', comboPath);
            console.log('comboVaccineImage:', formData.comboVaccineImage);
            const { error: comboError } = await supabase.storage
              .from('vaccine-certs')
              .upload(comboPath, formData.comboVaccineImage, {
                cacheControl: '3600',
                upsert: true
              });
            if (comboError) {
              console.error('Combo upload error:', comboError);
              throw comboError;
            }
          }
          
          // 証明書情報の更新または作成
          const updateData: Record<string, unknown> = {
            status: 'pending', // 新しい画像がアップロードされたら再審査
          };
          
          if (rabiesPath) updateData.rabies_vaccine_image = rabiesPath;
          if (comboPath) updateData.combo_vaccine_image = comboPath;
          if (formData.rabiesExpiryDate) updateData.rabies_expiry_date = formData.rabiesExpiryDate;
          if (formData.comboExpiryDate) updateData.combo_expiry_date = formData.comboExpiryDate;
          
          if (existingCert) {
            // 既存の証明書を更新
            const { error: updateError } = await supabase
              .from('vaccine_certifications')
              .update(updateData)
              .eq('id', existingCert.id);
              
            if (updateError) {
              console.error('Certificate update error:', updateError);
              throw updateError;
            }
          }
        } catch (vaccineError) {
          console.error('Vaccine certificate error:', vaccineError);
          setError('ワクチン証明書の更新に失敗しました。後でマイページから再試行してください。');
        }
      }
      
      // 登録済みの犬を再取得
      await fetchRegisteredDogs();
      
      // フォームをリセットする
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
      setSelectedDog(null);
      setIsEditing(false);
      
      // 成功メッセージを表示
      alert('ワンちゃんの情報を更新しました！');
    } catch (err) {
      console.error('Update error:', err);
      setError('ワンちゃんの情報更新に失敗しました。もう一度お試しください。');
    } finally {
      setIsLoading(false);
    }
  };

  const getVaccineStatus = (dog: Dog) => {
    const cert = dog.vaccine_certifications?.[0];
    if (!cert) return { status: 'none', label: '未提出', color: 'text-red-600 bg-red-100' };
    
    switch (cert.status) {
      case 'approved':
        return { status: 'approved', label: '承認済み', color: 'text-green-600 bg-green-100' };
      case 'pending':
        return { status: 'pending', label: '承認待ち', color: 'text-yellow-600 bg-yellow-100' };
      case 'rejected':
        return { status: 'rejected', label: '却下', color: 'text-red-600 bg-red-100' };
      default:
        return { status: 'none', label: '未提出', color: 'text-red-600 bg-red-100' };
    }
  };

  // 犬の性別に応じた敬称を取得する関数
  const getDogHonorific = (gender: string) => {
    return gender === 'オス' ? 'くん' : 'ちゃん';
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
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-center mb-8">ワンちゃん登録</h1>
      
      {/* 登録済みのワンちゃん一覧 */}
      {isLoadingDogs ? (
        <div className="flex justify-center items-center h-16 mb-6">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
        </div>
      ) : registeredDogs.length > 0 && (
        <Card className="mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <PawPrint className="w-5 h-5 text-blue-600 mr-2" />
            登録済みのワンちゃん
          </h2>
          <div className="space-y-4">
            {registeredDogs.map((dog) => {
              const vaccineStatus = getVaccineStatus(dog);
              const honorific = getDogHonorific(dog.gender);
              return (
                <div key={dog.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                      {dog.image_url ? (
                        <img 
                          src={dog.image_url} 
                          alt={dog.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <PawPrint className="w-6 h-6 text-gray-500" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold">{dog.name}{honorific}</h3>
                      <p className="text-sm text-gray-600">{dog.breed} • {dog.gender}</p>
                      <div className="flex items-center mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${vaccineStatus.color}`}>
                          ワクチン: {vaccineStatus.label}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    variant="secondary"
                    onClick={() => handleEditDog(dog)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        </Card>
      )}
      
      <Card>
        <form onSubmit={isEditing ? handleUpdateDog : handleSubmit}>
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {/* 犬の画像アップロード */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ワンちゃんの写真{isEditing ? '' : '（任意）'}
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
                      // 年が変更されたら日をリセット（月末日が変わる可能性があるため）
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
                      // 月が変更されたら日をリセット（月末日が変わる可能性があるため）
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
          
          {!isEditing ? (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  狂犬病ワクチン接種証明書
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFormData({ ...formData, rabiesVaccineImage: e.target.files?.[0] || null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  混合ワクチン接種証明書
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFormData({ ...formData, comboVaccineImage: e.target.files?.[0] || null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
            </>
          ) : (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  狂犬病ワクチン接種証明書（更新する場合のみ）
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFormData({ ...formData, rabiesVaccineImage: e.target.files?.[0] || null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  混合ワクチン接種証明書（更新する場合のみ）
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFormData({ ...formData, comboVaccineImage: e.target.files?.[0] || null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="p-4 bg-yellow-50 rounded-lg mb-4">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium mb-1">ワクチン証明書の更新について</p>
                    <p>新しいワクチン証明書をアップロードすると、再度審査が必要になります。審査完了までドッグランの利用ができなくなる場合があります。</p>
                  </div>
                </div>
              </div>
            </>
          )}
          
          {!isEditing && (
            <>
              <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                <p className="text-sm text-yellow-800">
                  ※ ワクチン接種証明書は運営による確認後に承認されます。承認されるまでドッグランの利用はできません。
                </p>
              </div>
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <span className="font-medium">生年月日について:</span><br />
                  • 年、月、日をそれぞれ選択してください<br />
                  • 未来の日付は選択できません<br />
                  • 20年以上前の日付は選択できません<br />
                  • 月を変更すると、その月の日数に応じて日の選択肢が更新されます
                </p>
              </div>
              <div className="mt-4 p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-green-800">
                  <span className="font-medium">写真について:</span><br />
                  • ワンちゃんの写真は任意ですが、コミュニティで他の飼い主さんに見てもらえます<br />
                  • JPG、PNG、GIF形式で最大10MBまでアップロード可能<br />
                  • 後からマイページで変更することもできます
                </p>
              </div>
              <div className="mt-4 p-3 bg-orange-50 rounded-lg">
                <p className="text-sm text-orange-800">
                  <span className="font-medium">ワクチン有効期限について:</span><br />
                  • 狂犬病ワクチンと混合ワクチンの有効期限を正確に入力してください<br />
                  • 有効期限が切れると自動的に再承認待ちになります<br />
                  • 期限切れ30日前に通知をお送りします<br />
                  • 新しいワクチン証明書は期限切れ前にアップロードしてください
                </p>
              </div>
            </>
          )}
          
          <div className="flex justify-between mt-4">
            {isEditing && (
              <Button 
                type="button" 
                variant="secondary"
                onClick={() => {
                  setIsEditing(false);
                  setSelectedDog(null);
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
                }}
              >
                キャンセル
              </Button>
            )}
            <Button 
              type="submit" 
              isLoading={isLoading} 
              className={isEditing ? '' : 'w-full'}
            >
              {isEditing ? '更新する' : '登録する'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}