// ワクチン証明書のアップロード機能
import { supabase } from './supabase';

/**
 * ワクチン証明書のアップロード結果の型定義
 */
export interface VaccineUploadResult {
  success: boolean;
  filePath?: string;
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
  config: VaccineUploadConfig
): Promise<VaccineUploadResult> => {
  try {
    // ファイル検証
    const validation = validateVaccineFile(file);
    if (!validation.isValid) {
      return { success: false, error: validation.error };
    }

    // ファイル名の生成
    const timestamp = Date.now();
    const extension = file.name.split('.').pop() || 'jpg';
    const fileName = `${config.dogId}/${config.imageType}_${timestamp}.${extension}`;

    console.log('🧪 Starting vaccine image upload:', {
      dogId: config.dogId,
      imageType: config.imageType,
      fileName,
      fileSize: file.size,
      fileType: file.type
    });

    // Supabase Storageにアップロード（Content-Typeを明示）
    const { data, error } = await supabase.storage
      .from('vaccine-certs')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type  // ← 重要: Content-Typeを明示
      });

    if (error) {
      console.error('❌ Vaccine upload error:', error);
      return { 
        success: false, 
        error: `アップロードに失敗しました: ${error.message}`,
        errorCode: error.message
      };
    }

    console.log('✅ Vaccine image uploaded successfully:', {
      fileName,
      data
    });

    return {
      success: true,
      filePath: fileName
    };

  } catch (error) {
    console.error('❌ Vaccine upload exception:', error);
    return { 
      success: false, 
      error: `アップロード中にエラーが発生しました: ${(error as Error).message}` 
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
    console.log(`🔄 Vaccine upload attempt ${attempt}/${maxRetries}`);
    
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

    console.log('✅ Vaccine certificates uploaded and updated successfully');
    return { success: true };

  } catch (error) {
    console.error('Complete vaccine upload error:', error);
    return { success: false, error: (error as Error).message };
  }
}; 