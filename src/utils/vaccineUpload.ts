// ワクチン証明書のアップロード機能

import { supabase } from './supabase';

/**
 * ワクチン証明書の種類
 */
export type VaccineType = 'rabies' | 'combo' | 'mixed';

/**
 * ワクチン証明書のアップロード結果の型定義
 */
export interface VaccineUploadResult {
  success: boolean;
  filePath?: string;
  publicUrl?: string;
  fileName?: string;
  error?: string;
  errorCode?: string;
}

/**
 * ワクチン証明書のアップロード設定
 */
export interface VaccineUploadConfig {
  dogId: string;
  imageType: 'rabies' | 'combo';
  maxRetries?: number;
  retryDelay?: number;
}

/**
 * ファイルの基本検証
 */
export const validateVaccineFile = (file: File): { isValid: boolean; error?: string } => {
  // ファイル存在チェック
  if (!file) {
    return { isValid: false, error: 'ファイルが選択されていません' };
  }

  // ファイルサイズチェック（10MB以下）
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return { isValid: false, error: 'ファイルサイズは10MB以下にしてください' };
  }

  // ファイル形式チェック
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return { isValid: false, error: `サポートされていない画像形式です: ${file.type}` };
  }

  return { isValid: true };
};

/**
 * ワクチン証明書をアップロードする
 */
export const uploadVaccineImage = async (
  file: File,
  dogId: string,
  vaccineType: VaccineType = 'mixed'
): Promise<VaccineUploadResult> => {
  try {
    const dogIdTyped = dogId as string;
    const fileValidation = validateVaccineFile(file);
    
    if (!fileValidation.isValid) {
      throw new Error(fileValidation.error);
    }

    const fileName = `${dogIdTyped}_${vaccineType}_${Date.now()}_${file.name}`;
    const filePath = `${dogIdTyped}/${fileName}`;

    const { data, error } = await supabase.storage
      .from('vaccine-certs')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      throw error;
    }

    const publicUrl = supabase.storage.from('vaccine-certs').getPublicUrl(data.path).data.publicUrl;

    return {
      success: true,
      publicUrl,
      fileName,
      filePath: data.path
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'アップロードに失敗しました'
    };
  }
};

/**
 * ワクチン証明書を再試行機能付きでアップロードする
 */
export const uploadVaccineWithRetry = async (
  file: File,
  config: VaccineUploadConfig
): Promise<VaccineUploadResult> => {
  const maxRetries = config.maxRetries || 3;
  const retryDelay = config.retryDelay || 1000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    
    const result = await uploadVaccineImage(file, config);
    
    if (result.success) {
      return result;
    }
    
    // 最後の試行でない場合は再試行
    if (attempt < maxRetries) {
      console.log(`⏳ Retrying vaccine upload in ${retryDelay}ms...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }

  return { 
    success: false, 
    error: `${maxRetries}回の再試行後もアップロードに失敗しました` 
  };
};

/**
 * ワクチン証明書のデータベース情報を更新または作成
 */
export const updateVaccineCertification = async (
  dogId: string,
  rabiesPath?: string,
  comboPath?: string,
  rabiesExpiryDate?: string,
  comboExpiryDate?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // 既存の証明書を確認
    const { data: existingCert, error: certError } = await supabase
      .from('vaccine_certifications')
      .select('id')
      .eq('dog_id', dogId)
      .maybeSingle();

    if (certError && certError.code !== 'PGRST116') {
      console.error('Error checking existing certificate:', certError);
      return { success: false, error: certError.message };
    }

    // 更新データの準備
    const updateData: any = {
      status: 'pending', // 新しい画像がアップロードされたら再審査
    };

    if (rabiesPath) updateData.rabies_vaccine_image = rabiesPath;
    if (comboPath) updateData.combo_vaccine_image = comboPath;
    if (rabiesExpiryDate) updateData.rabies_expiry_date = rabiesExpiryDate;
    if (comboExpiryDate) updateData.combo_expiry_date = comboExpiryDate;

    if (existingCert) {
      // 既存の証明書を更新
      const { error: updateError } = await supabase
        .from('vaccine_certifications')
        .update(updateData)
        .eq('id', existingCert.id);

      if (updateError) {
        console.error('Certificate update error:', updateError);
        return { success: false, error: updateError.message };
      }
    } else {
      // 新しい証明書を作成
      const { error: insertError } = await supabase
        .from('vaccine_certifications')
        .insert([{
          dog_id: dogId,
          ...updateData
        }]);

      if (insertError) {
        console.error('Certificate insert error:', insertError);
        return { success: false, error: insertError.message };
      }
    }

    return { success: true };

  } catch (error) {
    console.error('Database update error:', error);
    return { success: false, error: (error as Error).message };
  }
};

/**
 * ワクチン証明書の完全なアップロード処理
 */
export const handleVaccineUpload = async (
  dogId: string,
  rabiesFile?: File,
  comboFile?: File,
  rabiesExpiryDate?: string,
  comboExpiryDate?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    let rabiesPath: string | undefined;
    let comboPath: string | undefined;

    // 狂犬病ワクチン証明書のアップロード
    if (rabiesFile) {
      const rabiesResult = await uploadVaccineWithRetry(rabiesFile, {
        dogId,
        imageType: 'rabies',
        maxRetries: 3
      });

      if (!rabiesResult.success) {
        return { success: false, error: `狂犬病ワクチン証明書: ${rabiesResult.error}` };
      }

      rabiesPath = rabiesResult.filePath;
    }

    // 混合ワクチン証明書のアップロード
    if (comboFile) {
      const comboResult = await uploadVaccineWithRetry(comboFile, {
        dogId,
        imageType: 'combo',
        maxRetries: 3
      });

      if (!comboResult.success) {
        return { success: false, error: `混合ワクチン証明書: ${comboResult.error}` };
      }

      comboPath = comboResult.filePath;
    }

    // データベースの更新
    const dbResult = await updateVaccineCertification(
      dogId,
      rabiesPath,
      comboPath,
      rabiesExpiryDate,
      comboExpiryDate
    );

    if (!dbResult.success) {
      return { success: false, error: `データベース更新エラー: ${dbResult.error}` };
    }

    return { success: true };

  } catch (error) {
    console.error('Complete vaccine upload error:', error);
    return { success: false, error: (error as Error).message };
  }
}; 
