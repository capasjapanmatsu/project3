// 画像処理のヘルパー関数
import { supabase } from './supabase';

/**
 * 画像URLの検証とフォールバック
 */
export const validateAndGetImageUrl = async (imagePath: string | null): Promise<string> => {
  if (!imagePath) {
    return getPlaceholderImageUrl();
  }

  // 既にhttp/httpsで始まる場合
  if (imagePath.startsWith('http')) {
    const isValid = await testImageUrl(imagePath);
    return isValid ? imagePath : getPlaceholderImageUrl();
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  
  // 複数のパスパターンを試行
  const possiblePaths = [
    `temp/${imagePath}`,
    imagePath,
    `${imagePath}`,
    `temp/${imagePath.replace('pending_upload_', '')}`
  ];

  for (const path of possiblePaths) {
    const fullUrl = `${supabaseUrl}/storage/v1/object/public/vaccine-certs/${path}`;
    const isValid = await testImageUrl(fullUrl);
    
    if (isValid) {
      return fullUrl;
    }
  }

  // 全てのパスで見つからない場合
  console.warn(`❌ No valid image found for: ${imagePath}`);
  return getPlaceholderImageUrl();
};

/**
 * 画像URLのテスト
 */
export const testImageUrl = async (url: string): Promise<boolean> => {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    console.error(`Image test failed for ${url}:`, error);
    return false;
  }
};

/**
 * プレースホルダー画像URL
 */
export const getPlaceholderImageUrl = (): string => {
  return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2IiBzdHJva2U9IiNkMWQ1ZGIiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWRhc2hhcnJheT0iNSw1Ii8+PHRleHQgeD0iNTAlIiB5PSI0MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNiIgZmlsbD0iIzY4NzI4MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPueUu+WDj+OCkuiqreOBv+i+vOOBv+S4re4uLi48L3RleHQ+PHRleHQgeD0iNTAlIiB5PSI2MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZmlsbD0iIzlDQTNBRiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuWGjeOCouODg+ODl+ODreODvOODieOBl+OBpuOBj+OBoOOBleOBhDwvdGV4dD48L3N2Zz4=';
};

/**
 * 画像再アップロード処理
 */
export const reuploadVaccineImage = async (
  vaccineId: string,
  imageFile: File,
  imageType: 'rabies' | 'combo'
): Promise<{ success: boolean; url?: string; error?: string }> => {
  try {
    const timestamp = Date.now();
    const fileName = `${imageType}_${timestamp}_${imageFile.name}`;
    const filePath = `temp/${fileName}`;

    // 既存のファイルを削除（可能であれば）
    const { data: existingFiles } = await supabase.storage
      .from('vaccine-certs')
      .list('temp', { search: imageType });

    if (existingFiles && existingFiles.length > 0) {
      const oldFile = existingFiles.find(f => f.name.includes(vaccineId));
      if (oldFile) {
        await supabase.storage
          .from('vaccine-certs')
          .remove([`temp/${oldFile.name}`]);
      }
    }

    // 新しいファイルをアップロード
    const { data, error } = await supabase.storage
      .from('vaccine-certs')
      .upload(filePath, imageFile, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) {
      console.error('Upload error:', error);
      return { success: false, error: error.message };
    }

    // データベース更新
    const updateData = imageType === 'rabies' 
      ? { rabies_vaccine_image: fileName }
      : { combo_vaccine_image: fileName };

    const { error: updateError } = await supabase
      .from('vaccine_certifications')
      .update(updateData)
      .eq('id', vaccineId);

    if (updateError) {
      console.error('Database update error:', updateError);
      return { success: false, error: updateError.message };
    }

    const publicUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/vaccine-certs/${filePath}`;
    
    return { success: true, url: publicUrl };

  } catch (error) {
    console.error('Reupload error:', error);
    return { success: false, error: (error as Error).message };
  }
};

/**
 * 画像の修復処理
 */
export const repairVaccineImages = async (vaccineId: string): Promise<{
  success: boolean;
  repairedImages: string[];
  error?: string;
}> => {
  try {
    const { data: vaccine, error: fetchError } = await supabase
      .from('vaccine_certifications')
      .select('*')
      .eq('id', vaccineId)
      .single();

    if (fetchError || !vaccine) {
      return { success: false, repairedImages: [], error: 'ワクチン証明書が見つかりません' };
    }

    const repairedImages: string[] = [];

    // 狂犬病ワクチン画像の修復
    if (vaccine.rabies_vaccine_image) {
      const validUrl = await validateAndGetImageUrl(vaccine.rabies_vaccine_image);
      if (validUrl !== getPlaceholderImageUrl()) {
        repairedImages.push('rabies');
      }
    }

    // 混合ワクチン画像の修復
    if (vaccine.combo_vaccine_image) {
      const validUrl = await validateAndGetImageUrl(vaccine.combo_vaccine_image);
      if (validUrl !== getPlaceholderImageUrl()) {
        repairedImages.push('combo');
      }
    }

    return { success: true, repairedImages };

  } catch (error) {
    console.error('Repair error:', error);
    return { success: false, repairedImages: [], error: (error as Error).message };
  }
}; 
