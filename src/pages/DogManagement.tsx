import { ArrowLeft, PawPrint, Plus } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Area } from 'react-easy-crop';
import { Link } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import { DogCard, DogEditModal } from '../components/dashboard/DogCard';
import useAuth from '../context/AuthContext';
import type { Dog } from '../types';
import { log } from '../utils/helpers';
import { supabase } from '../utils/supabase';
import { safeSupabaseQuery } from '../utils/supabaseHelpers';

export function DogManagement() {
  const { user } = useAuth();
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // 犬の編集モーダル関連
  const [showDogEditModal, setShowDogEditModal] = useState(false);
  const [selectedDog, setSelectedDog] = useState<Dog | null>(null);
  const [isUpdatingDog, setIsUpdatingDog] = useState(false);
  const [dogUpdateError, setDogUpdateError] = useState('');
  const [dogUpdateSuccess, setDogUpdateSuccess] = useState('');
  
  // 削除関連の状態
  const [isDeleting, setIsDeleting] = useState(false);
  
  // 犬のフォームデータ
  const [dogFormData, setDogFormData] = useState({
    name: '',
    breed: '',
    gender: '',
    birthDate: '',
    microchipNumber: '', // マイクロチップNO追加
  });
  
  // 犬の画像関連
  const [dogImageFile, setDogImageFile] = useState<File | null>(null);
  const [dogImagePreview, setDogImagePreview] = useState<string | null>(null);
  // クロップ用State（1:1）
  const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  
  // ワクチン証明書関連
  const [rabiesVaccineFile, setRabiesVaccineFile] = useState<File | null>(null);
  const [comboVaccineFile, setComboVaccineFile] = useState<File | null>(null);
  const [rabiesExpiryDate, setRabiesExpiryDate] = useState('');
  const [comboExpiryDate, setComboExpiryDate] = useState('');

  const fetchDogs = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const result = await safeSupabaseQuery(() =>
        supabase
          .from('dogs')
          .select('*, vaccine_certifications(*)')
          .eq('owner_id', user?.id)
          .order('created_at', { ascending: false })
      );

      if (result.error) {
        log('error', 'Error fetching dogs', { error: result.error, userId: user?.id });
        setError('ワンちゃんの情報を取得できませんでした。');
        return;
      }

      setDogs((result.data as Dog[]) || []);
    } catch (err) {
      log('error', 'Exception in fetchDogs', { error: err, userId: user?.id });
      setError('ワンちゃんの情報を取得できませんでした。');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user) {
      void fetchDogs();
    }
  }, [user, fetchDogs]);

  const handleDogSelect = (dog: Dog) => {
    setSelectedDog(dog);
    
    // フォームデータを設定
    setDogFormData({
      name: dog.name,
      breed: dog.breed,
      gender: dog.gender,
      birthDate: dog.birth_date,
      microchipNumber: dog.microchip_number || '', // マイクロチップNO設定
    });
    
    // 画像プレビューを設定
    setDogImagePreview(dog.image_url || null);
    
    // ワクチン証明書の有効期限を設定
    const cert = dog.vaccine_certifications?.[0];
    if (cert) {
      setRabiesExpiryDate(cert.rabies_expiry_date || '');
      setComboExpiryDate(cert.combo_expiry_date || '');
    }
    
    setShowDogEditModal(true);
  };

  const handleDogImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    log('info', '🔍 File selected:', file ? {
      name: file.name,
      type: file.type,
      size: file.size,
      lastModified: file.lastModified,
      isFileObject: file instanceof File
    } : { message: 'No file selected' });
    
    if (file) {
      try {
        // より厳密なファイル検証
        if (!(file instanceof File)) {
          setDogUpdateError('有効なファイルを選択してください。');
          return;
        }
        
        // ファイルサイズチェック（10MB以下）
        if (file.size > 10 * 1024 * 1024) {
          setDogUpdateError('画像ファイルは10MB以下にしてください。');
          return;
        }
        
        // ファイル形式チェック
        if (!file.type || !file.type.startsWith('image/')) {
          setDogUpdateError(`画像ファイルを選択してください。選択されたファイルタイプ: ${file.type}`);
          return;
        }
        
        // 許可されている画像形式を確認
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
          setDogUpdateError(`サポートされていない画像形式です: ${file.type}`);
          return;
        }
        
        setDogImageFile(file);
        log('info', '✅ Dog image file set successfully:', {
          name: file.name,
          type: file.type,
          size: file.size
        });
        
        // プレビューを作成
        const reader = new FileReader();
        reader.onload = (e) => {
          setDogImagePreview(e.target?.result as string);
          setCrop({ x: 0, y: 0 });
          setZoom(1);
          setCroppedAreaPixels(null);
        };
        reader.readAsDataURL(file);
      } catch (_err) {
        setDogUpdateError('画像の処理に失敗しました。');
      }
    }
  };

  // ImageCropper からの結果を受け取って差し替える（dog-registration と同じ流れ）
  const handleImageCropped = (file: File) => {
    setDogImageFile(file);
    const previewUrl = URL.createObjectURL(file);
    setDogImagePreview(previewUrl);
  };

  const handleDogImageRemove = async () => {
    if (!selectedDog) return;
    console.log('[DogManagement] onImageRemove called');
    
    // 楽観的にUIを先に更新（即時プレビュー非表示）
    setDogImageFile(null);
    setDogImagePreview(null);
    setSelectedDog({ ...selectedDog, image_url: null as any });
    
    try {
      setIsUpdatingDog(true);
      setDogUpdateError('');
      
      // 1. Supabase Storageから画像ファイルを削除（存在チェック）
      try {
        if (selectedDog.image_url && selectedDog.image_url.includes('dog-images/')) {
          const imagePath = selectedDog.image_url.split('dog-images/')[1];
          if (imagePath) {
            await supabase.storage.from('dog-images').remove([imagePath]);
          }
        }
      } catch (_) { /* ストレージ削除失敗は無視 */ }
      
      // 2. データベースのimage_urlを空文字に更新（更新行を必ず取得して検証）
      const { data: updatedRows, error: updateErr } = await supabase
        .from('dogs')
        .update({ image_url: '' })
        .eq('id', selectedDog.id)
        .eq('owner_id', user?.id)
        .select('id,image_url');
      
      if (updateErr) {
        log('error', 'Error updating dog image_url', { error: updateErr, dogId: selectedDog.id });
        setDogUpdateError('画像の削除に失敗しました。');
        return;
      }
      if (!updatedRows || updatedRows.length === 0) {
        log('warn', 'Image delete update affected 0 rows', { dogId: selectedDog.id, userId: user?.id });
        setDogUpdateError('画像の削除が反映されませんでした。（権限または対象なし）');
      }
      
      // 3. データを再取得
      await fetchDogs();
      
      log('info', '✅ Dog image removed successfully', { dogId: selectedDog.id });
      setDogUpdateSuccess('画像を削除しました。');
      
      // 成功メッセージをクリア
      setTimeout(() => {
        setDogUpdateSuccess('');
      }, 3000);
      
    } catch (error) {
      log('error', 'Error removing dog image', { error, dogId: selectedDog?.id });
      setDogUpdateError('画像の削除に失敗しました。');
    } finally {
      setIsUpdatingDog(false);
    }
  };

  const handleRabiesVaccineSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // ファイルサイズチェック（10MB以下）
      if (file.size > 10 * 1024 * 1024) {
        setDogUpdateError('ワクチン証明書ファイルは10MB以下にしてください。');
        return;
      }
      
      // ファイル形式チェック
      if (!file.type.startsWith('image/')) {
        setDogUpdateError('画像ファイルを選択してください。');
        return;
      }
      
      setRabiesVaccineFile(file);
    } else {
      setRabiesVaccineFile(null);
    }
  };

  const handleComboVaccineSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // ファイルサイズチェック（10MB以下）
      if (file.size > 10 * 1024 * 1024) {
        setDogUpdateError('ワクチン証明書ファイルは10MB以下にしてください。');
        return;
      }
      
      // ファイル形式チェック
      if (!file.type.startsWith('image/')) {
        setDogUpdateError('画像ファイルを選択してください。');
        return;
      }
      
      setComboVaccineFile(file);
    } else {
      setComboVaccineFile(null);
    }
  };

  const handleUpdateDog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDog) return;

    setIsUpdatingDog(true);
    setDogUpdateError('');
    setDogUpdateSuccess('');

    try {
      // 基本情報の更新
      const updateData: Partial<Dog> = {
        name: dogFormData.name,
        breed: dogFormData.breed,
        gender: dogFormData.gender as 'オス' | 'メス',
        birth_date: dogFormData.birthDate,
        ...(dogFormData.microchipNumber && { microchip_number: dogFormData.microchipNumber }),
      };

      // 画像が削除されており、新規画像も選択されていない場合はDB側も確実にクリア
      if (!dogImageFile && !dogImagePreview) {
        (updateData as any).image_url = '';
      }

      // 画像が変更された場合はアップロード（1:1トリミング → 最大1200pxへリサイズ → WebP変換保存）
      if (dogImageFile) {
        // 1:1にトリミング（オフスクリーンcanvas）
        const imgBitmap = await createImageBitmap(dogImageFile);
        // ユーザーがクロップ指定した領域を優先（なければ中央スクエア）
        const sourceSquare = Math.min(imgBitmap.width, imgBitmap.height);
        const targetSize = Math.min(1200, sourceSquare);
        const canvas = document.createElement('canvas');
        canvas.width = targetSize;
        canvas.height = targetSize;
        const ctx = canvas.getContext('2d')!;
        const hasCrop = !!croppedAreaPixels;
        const sx = hasCrop ? croppedAreaPixels!.x : (imgBitmap.width - sourceSquare) / 2;
        const sy = hasCrop ? croppedAreaPixels!.y : (imgBitmap.height - sourceSquare) / 2;
        const sWidth = hasCrop ? croppedAreaPixels!.width : sourceSquare;
        const sHeight = hasCrop ? croppedAreaPixels!.height : sourceSquare;
        ctx.drawImage(imgBitmap, sx, sy, sWidth, sHeight, 0, 0, targetSize, targetSize);
        // WebP Blob生成（toBlobがnullを返す環境へのフォールバック付き）
        const dataURLtoBlob = (dataUrl: string) => {
          const arr = dataUrl.split(',');
          const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/webp';
          const bstr = atob(arr[1]);
          let n = bstr.length;
          const u8arr = new Uint8Array(n);
          while (n--) u8arr[n] = bstr.charCodeAt(n);
          return new Blob([u8arr], { type: mime });
        };

        const blob: Blob = await new Promise((resolve) =>
          canvas.toBlob((b) => {
            if (b) return resolve(b);
            // フォールバック: dataURL経由でWebP作成
            const alt = canvas.toDataURL('image/webp', 0.9);
            resolve(dataURLtoBlob(alt));
          }, 'image/webp', 0.9)
        );
        const squaredFile = new File([blob], 'dog-square.webp', { type: 'image/webp' });

        // 直接StorageにWebPで保存（公開URLを使用）
        const fileName = `${selectedDog.id}/${crypto.randomUUID()}.webp`;
        const { error: upErr } = await supabase.storage
          .from('dog-images')
          .upload(fileName, squaredFile, { upsert: true, contentType: 'image/webp' });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from('dog-images').getPublicUrl(fileName);
        const url = pub?.publicUrl;
        if (!url) throw new Error('画像の保存に失敗しました');
        updateData.image_url = url;
      }

      // 犬の情報を更新
      const { data: updatedDogRows, error: updateError } = await supabase
        .from('dogs')
        .update(updateData)
        .eq('id', selectedDog.id)
        .eq('owner_id', user?.id)
        .select('id,image_url');

      if (updateError) {
        throw updateError;
      }
      if (!updatedDogRows || updatedDogRows.length === 0) {
        throw new Error('更新対象が見つからない、または権限により更新できませんでした。');
      }
      console.log('[DogManagement] Update result:', updatedDogRows[0]);

      // ワクチン証明書の更新（片方でも可）。保存ボタンでも提出まで完了させる
      if ((rabiesVaccineFile || comboVaccineFile) || (rabiesExpiryDate || comboExpiryDate)) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          throw new Error('ログインが必要です（提出）');
        }

        const ensureJpeg = async (file: File): Promise<File> => {
          if (file.type === 'image/jpeg') return file;
          const bmp = await createImageBitmap(file);
          const c = document.createElement('canvas');
          c.width = bmp.width; c.height = bmp.height;
          c.getContext('2d')!.drawImage(bmp, 0, 0);
          const blob: Blob = await new Promise((res) => c.toBlob((b) => res(b!), 'image/jpeg', 0.92));
          return new File([blob], file.name.replace(/\.[^/.]+$/, '.jpg'), { type: 'image/jpeg' });
        };

        const uploadDirect = async (file: File, kind: 'rabies' | 'combo') => {
          const jpeg = await ensureJpeg(file);
          const key = `${session.user.id}/${kind}/${Date.now()}-${crypto.randomUUID()}.jpg`;
          const { error: upErr } = await supabase.storage
            .from('vaccine-certs')
            .upload(key, jpeg, { upsert: false, cacheControl: '0', contentType: 'image/jpeg' });
          if (upErr) {
            const projectUrl = import.meta.env.VITE_SUPABASE_URL as string;
            const anonKey    = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
            const resp = await fetch(`${projectUrl}/storage/v1/object/vaccine-certs/${key}`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${session.access_token}`,
                apikey: anonKey,
                'Content-Type': 'image/jpeg',
                'x-upsert': 'false',
                'Cache-Control': '0',
              },
              body: jpeg,
            });
            const txt = await resp.text();
            if (!resp.ok) throw new Error(`upload ${kind} failed: ${resp.status} ${txt}`);
          }
          const { data: pub } = supabase.storage.from('vaccine-certs').getPublicUrl(key);
          return pub.publicUrl;
        };

        let rabiesUrl: string | undefined;
        let comboUrl: string | undefined;
        if (rabiesVaccineFile) rabiesUrl = await uploadDirect(rabiesVaccineFile, 'rabies');
        if (comboVaccineFile)  comboUrl  = await uploadDirect(comboVaccineFile,  'combo');

        // Edge Functionで pending 行を作成（RLSを確実に回避）
        const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/submit-vaccine`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
            apikey: (import.meta.env.VITE_SUPABASE_ANON_KEY as string)
          },
          body: JSON.stringify({
            dog_id: selectedDog.id,
            rabies_url: rabiesUrl,
            combo_url: comboUrl,
            rabies_expiry: rabiesExpiryDate || undefined,
            combo_expiry: comboExpiryDate || undefined,
          })
        });
        const json = await resp.json().catch(() => ({} as any));
        if (!resp.ok || !(json as any)?.success) {
          throw new Error(`提出に失敗しました: ${resp.status} ${JSON.stringify(json)}`);
        }
        log('info', 'Vaccine submit via Edge Function completed');
      }
      
      setDogUpdateSuccess('ワンちゃん情報を更新しました');
      
      // データを再取得
      await fetchDogs();
      
      // モーダルを閉じる
      setTimeout(() => {
        setShowDogEditModal(false);
        setDogUpdateSuccess('');
        setDogImageFile(null);
        setDogImagePreview(null);
        setRabiesVaccineFile(null);
        setComboVaccineFile(null);
        setRabiesExpiryDate('');
        setComboExpiryDate('');
      }, 2000);
      
    } catch (error) {
      log('error', 'Error updating dog', { error, dogId: selectedDog?.id });
      
      // エラーの詳細情報を提供
      let errorMessage = 'ワンちゃん情報の更新に失敗しました';
      
      if (error instanceof Error) {
        if (error.message.includes('520') || error.message.includes('Cloudflare')) {
          errorMessage = 'ワクチン証明書のアップロードは成功しましたが、一時的なサーバーエラーが発生しました。しばらく待ってから再度お試しください。';
        } else if (error.message.includes('アップロードに失敗しました')) {
          errorMessage = error.message;
        } else {
          errorMessage = `エラーが発生しました: ${error.message}`;
        }
      }
      
      setDogUpdateError(errorMessage);
    } finally {
      setIsUpdatingDog(false);
    }
  };

  const handleDeleteDog = async (dog: Dog) => {
    setIsDeleting(true);
    setDogUpdateError('');
    
    try {
      log('info', 'Deleting dog:', { name: dog.name, id: dog.id });
      
      // 1. ワクチン証明書を削除
      const { error: certError } = await supabase
        .from('vaccine_certifications')
        .delete()
        .eq('dog_id', dog.id);
      
      if (certError) {
        log('warn', 'Error deleting vaccine certifications', { error: certError, dogId: dog.id });
        // ワクチン証明書の削除エラーは警告として扱い、犬の削除は続行
      }
      
      // 2. 犬の画像を削除（dog-imagesバケットから）
      if (dog.image_url) {
        try {
          // URLからファイルパスを抽出
          const url = new URL(dog.image_url);
          const pathParts = url.pathname.split('/');
          const fileName = pathParts[pathParts.length - 1];
          const filePath = `${dog.id}/${fileName}`;
          
          const { error: imageError } = await supabase.storage
            .from('dog-images')
            .remove([filePath]);
          
          if (imageError) {
            console.warn('Warning: Could not delete dog image:', imageError);
            // 画像削除エラーは警告として扱い、犬の削除は続行
          }
        } catch (imageErr) {
          console.warn('Warning: Error processing dog image deletion:', imageErr);
        }
      }
      
      // 3. ワクチン証明書画像を削除（vaccine-certsバケットから）
      const cert = dog.vaccine_certifications?.[0];
      if (cert) {
        const imagesToDelete = [];
        if (cert.rabies_vaccine_image) imagesToDelete.push(cert.rabies_vaccine_image);
        if (cert.combo_vaccine_image) imagesToDelete.push(cert.combo_vaccine_image);
        
        if (imagesToDelete.length > 0) {
          const { error: vaccineImageError } = await supabase.storage
            .from('vaccine-certs')
            .remove(imagesToDelete);
          
          if (vaccineImageError) {
            console.warn('Warning: Could not delete vaccine images:', vaccineImageError);
            // ワクチン画像削除エラーは警告として扱い、犬の削除は続行
          }
        }
      }
      
      // 4. 犬の情報を削除
      const { error: dogError } = await supabase
        .from('dogs')
        .delete()
        .eq('id', dog.id);
      
      if (dogError) {
        log('error', 'Error deleting dog', { error: dogError, dogId: dog.id });
        throw dogError;
      }
      
      log('info', 'Dog deleted successfully', { dogName: dog.name });
      
      // データを再取得
      await fetchDogs();
      
      // モーダルを閉じる
      setShowDogEditModal(false);
      
      // 成功メッセージ
      setDogUpdateSuccess(`${dog.name}の情報を削除しました。`);
      
      // 3秒後に成功メッセージをクリア
      setTimeout(() => {
        setDogUpdateSuccess('');
      }, 3000);
      
    } catch (error) {
      log('error', 'Error deleting dog', { error, dogId: dog?.id });
      const errorMessage = (error as Error).message || 'ワンちゃんの削除に失敗しました';
      setDogUpdateError(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        <p className="ml-3 text-gray-600">ワンちゃんの情報を読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex justify-between items-center">
        <div>
          <Link to="/dashboard" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            マイページに戻る
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">ワンちゃん管理</h1>
          <p className="text-gray-600">登録済みのワンちゃんの情報を管理できます</p>
        </div>
        <Link to="/dog-registration">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            新しいワンちゃんを登録
          </Button>
        </Link>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      
      {/* 成功メッセージ表示 */}
      {dogUpdateSuccess && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          {dogUpdateSuccess}
        </div>
      )}

      {/* 犬の一覧 */}
      <Card>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold flex items-center">
            <PawPrint className="w-6 h-6 text-blue-600 mr-2" />
            登録済みワンちゃん ({dogs.length}匹)
          </h2>
        </div>
        
        {dogs.length === 0 ? (
          <div className="text-center py-12">
            <PawPrint className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">まだワンちゃんが登録されていません</p>
            <Link to="/dog-registration">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                ワンちゃんを登録する
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {dogs.map((dog) => (
              <DogCard 
                key={dog.id} 
                dog={dog} 
                onEdit={handleDogSelect} 
              />
            ))}
          </div>
        )}
      </Card>

      {/* 犬の編集モーダル */}
      {showDogEditModal && selectedDog && (
        <DogEditModal
          dog={selectedDog}
          isUpdating={isUpdatingDog || isDeleting}
          error={dogUpdateError}
          success={dogUpdateSuccess}
          dogFormData={dogFormData}
          dogImagePreview={dogImagePreview}
          onClose={() => setShowDogEditModal(false)}
          onSubmit={(data) => void handleUpdateDog(data)}
          onDelete={(dog) => void handleDeleteDog(dog)}
          onFormChange={setDogFormData}
          onImageSelect={handleDogImageSelect}
          onImageRemove={() => void handleDogImageRemove()}
          onImageCropped={(file) => handleImageCropped(file)}
          // クロップ制御
          crop={crop}
          zoom={zoom}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={(_, areaPixels) => setCroppedAreaPixels(areaPixels)}
          // ワクチン証明書関連の props
          rabiesVaccineFile={rabiesVaccineFile}
          comboVaccineFile={comboVaccineFile}
          rabiesExpiryDate={rabiesExpiryDate}
          comboExpiryDate={comboExpiryDate}
          onRabiesVaccineSelect={handleRabiesVaccineSelect}
          onComboVaccineSelect={handleComboVaccineSelect}
          onRabiesExpiryDateChange={setRabiesExpiryDate}
          onComboExpiryDateChange={setComboExpiryDate}
          // 提出ボタン（Edge Function）
          onSubmitVaccine={async () => {
            try {
              const { data: { session } } = await supabase.auth.getSession();
              if (!session?.access_token) throw new Error('ログインが必要です');

              // 直近でファイルが選ばれている場合はここでアップロードしてURLを差し替える（REST直叩きで確実に保存）
              const ensureJpeg = async (file: File): Promise<File> => {
                if (file.type === 'image/jpeg') return file;
                const bmp = await createImageBitmap(file);
                const c = document.createElement('canvas');
                c.width = bmp.width;
                c.height = bmp.height;
                c.getContext('2d')!.drawImage(bmp, 0, 0);
                const blob: Blob = await new Promise((res) => c.toBlob((b) => res(b!), 'image/jpeg', 0.92));
                return new File([blob], file.name.replace(/\.[^/.]+$/, '.jpg'), { type: 'image/jpeg' });
              };

              const uploadDirect = async (file: File, kind: 'rabies' | 'combo') => {
                const jpeg = await ensureJpeg(file);
                const key = `${session.user.id}/${kind}/${Date.now()}-${crypto.randomUUID()}.jpg`;
                // 1) SDKでアップロード（標準経路）
                const { error: upErr } = await supabase.storage
                  .from('vaccine-certs')
                  .upload(key, jpeg, {
                    upsert: false,
                    cacheControl: '0',
                    contentType: 'image/jpeg',
                  });
                if (upErr) {
                  // 2) フォールバック: REST直叩き（CORS回避はSDKが良いが、エッジなケースで救済）
                  try {
                    const projectUrl = import.meta.env.VITE_SUPABASE_URL as string;
                    const anonKey    = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
                    const resp = await fetch(`${projectUrl}/storage/v1/object/vaccine-certs/${key}`, {
                      method: 'POST',
                      headers: {
                        Authorization: `Bearer ${session.access_token}`,
                        apikey: anonKey,
                        'Content-Type': 'image/jpeg',
                        'x-upsert': 'false',
                        'Cache-Control': '0',
                      },
                      body: jpeg,
                    });
                    const txt = await resp.text();
                    if (!resp.ok) throw new Error(`fallback upload ${kind} failed: ${resp.status} ${txt}`);
                  } catch (e) {
                    // どちらも失敗 → UIに詳細を出す
                    const message = e instanceof Error ? e.message : String(e);
                    setDogUpdateError(`アップロードに失敗しました: ${message}`);
                    throw e;
                  }
                }
                const { data: pub } = supabase.storage.from('vaccine-certs').getPublicUrl(key);
                return pub.publicUrl;
              };

              let rabiesUrl: string | undefined;
              let comboUrl: string | undefined;
              if (rabiesVaccineFile) rabiesUrl = await uploadDirect(rabiesVaccineFile, 'rabies');
              if (comboVaccineFile)  comboUrl  = await uploadDirect(comboVaccineFile,  'combo');

              // 画像が一切ない状態での提出はエラーにする（ストレージ削除後の再申請など）
              if (!rabiesUrl && !comboUrl) {
                setDogUpdateError('ワクチン画像が選択されていません。画像を選び直してから提出してください。');
                return;
              }

              const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/submit-vaccine`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${session.access_token}`,
                  apikey: (import.meta.env.VITE_SUPABASE_ANON_KEY as string)
                },
                body: JSON.stringify({
                  dog_id: selectedDog.id,
                  rabies_url: rabiesUrl, // 新規選択がある場合のみ反映
                  combo_url: comboUrl,
                  rabies_expiry: rabiesExpiryDate || undefined,
                  combo_expiry: comboExpiryDate || undefined,
                })
              });
              const json = await resp.json();
              if (!resp.ok || !json?.success) throw new Error(json?.error || '提出に失敗しました');

              // 提出成功後はローカルの選択状態をクリア
              setRabiesVaccineFile(null);
              setComboVaccineFile(null);

              setDogUpdateSuccess('ワクチン提出を受け付けました（審査待ち）');
              await fetchDogs();
            } catch (e) {
              setDogUpdateError(e instanceof Error ? e.message : '提出に失敗しました');
            }
          }}
        />
      )}
    </div>
  );
} 

export default DogManagement; 
