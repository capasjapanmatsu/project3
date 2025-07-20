// デバッグ機能強化版のワクチン証明書アップロード
import { supabase } from './supabase';

/**
 * ストレージバケットの詳細情報を確認
 */
export const debugStorageInfo = async () => {
  
  try {
    // 1. バケット一覧の確認
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    // 2. vaccine-certsバケットの詳細確認
    const vaccineBucket = buckets?.find(b => b.id === 'vaccine-certs');
    
    // 3. 現在のユーザー認証状態の確認
    const { data: authData, error: authError } = await supabase.auth.getUser();
    
    // 4. vaccine-certsバケット内のファイル一覧
    const { data: files, error: filesError } = await supabase.storage
      .from('vaccine-certs')
      .list('', { limit: 10 });
    
    return {
      buckets,
      vaccineBucket,
      currentUser: authData.user?.id,
      files,
      errors: {
        bucketsError,
        authError,
        filesError
      }
    };
  } catch (error) {
    console.error('❌ Storage debug error:', error);
    return { error };
  }
};

/**
 * 詳細なエラー情報付きでワクチン証明書をアップロード
 */
export const uploadVaccineWithDetailedDebug = async (
  file: File,
  dogId: string,
  imageType: 'rabies' | 'combo'
): Promise<{ success: boolean; error?: string; debugInfo?: any }> => {
  console.log('🧪 === VACCINE UPLOAD DEBUG START ===');
  
  try {
    // 0. ストレージ情報をデバッグ
    const storageInfo = await debugStorageInfo();
    
    // 1. ファイル検証
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    });
    
    // 2. ファイル名の生成
    const timestamp = Date.now();
    const extension = file.name.split('.').pop() || 'jpg';
    const fileName = `${dogId}/${imageType}_${timestamp}.${extension}`;
    
    
    // 3. アップロードの実行
    
    const { data, error } = await supabase.storage
      .from('vaccine-certs')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      });
    
    
    if (error) {
      console.error('🚨 Upload failed with error:', {
        message: error.message,
        details: error
      });
      
      return {
        success: false,
        error: error.message,
        debugInfo: {
          storageInfo,
          fileName,
          dogId,
          imageType,
          errorDetails: error
        }
      };
    }
    
    // 4. アップロード成功後の確認
    
    // ファイルが実際に存在するか確認
    const { data: { publicUrl } } = supabase.storage
      .from('vaccine-certs')
      .getPublicUrl(fileName);
    
    
    // ファイル情報を取得
    const { data: fileInfo, error: fileInfoError } = await supabase.storage
      .from('vaccine-certs')
      .list(dogId, { search: `${imageType}_${timestamp}` });
    
    
    return {
      success: true,
      debugInfo: {
        storageInfo,
        fileName,
        publicUrl,
        fileInfo,
        uploadData: data
      }
    };
    
  } catch (error) {
    console.error('❌ Upload exception:', error);
    return {
      success: false,
      error: (error as Error).message,
      debugInfo: { exception: error }
    };
  }
};

/**
 * デバッグ機能付きのワクチン証明書完全アップロード
 */
export const handleVaccineUploadWithDebug = async (
  dogId: string,
  rabiesFile?: File,
  comboFile?: File,
  rabiesExpiryDate?: string,
  comboExpiryDate?: string
): Promise<{ success: boolean; error?: string; debugInfo?: any }> => {
  
  const debugResults: any = {
    dogId,
    rabiesFile: rabiesFile ? { name: rabiesFile.name, size: rabiesFile.size, type: rabiesFile.type } : null,
    comboFile: comboFile ? { name: comboFile.name, size: comboFile.size, type: comboFile.type } : null,
    rabiesExpiryDate,
    comboExpiryDate
  };
  
  try {
    let rabiesPath: string | undefined;
    let comboPath: string | undefined;
    
    // 狂犬病ワクチン証明書のアップロード
    if (rabiesFile) {
      console.log('🦠 Uploading rabies vaccine certificate...');
      const rabiesResult = await uploadVaccineWithDetailedDebug(rabiesFile, dogId, 'rabies');
      
      debugResults.rabiesUpload = rabiesResult;
      
      if (!rabiesResult.success) {
        return {
          success: false,
          error: `狂犬病ワクチン証明書のアップロードに失敗: ${rabiesResult.error}`,
          debugInfo: debugResults
        };
      }
      
      rabiesPath = rabiesResult.debugInfo?.fileName;
    }
    
    // 混合ワクチン証明書のアップロード
    if (comboFile) {
      const comboResult = await uploadVaccineWithDetailedDebug(comboFile, dogId, 'combo');
      
      debugResults.comboUpload = comboResult;
      
      if (!comboResult.success) {
        return {
          success: false,
          error: `混合ワクチン証明書のアップロードに失敗: ${comboResult.error}`,
          debugInfo: debugResults
        };
      }
      
      comboPath = comboResult.debugInfo?.fileName;
    }
    
    // データベースの更新
    const dbResult = await updateVaccineCertificationWithDebug(
      dogId,
      rabiesPath,
      comboPath,
      rabiesExpiryDate,
      comboExpiryDate
    );
    
    debugResults.databaseUpdate = dbResult;
    
    if (!dbResult.success) {
      return {
        success: false,
        error: `データベース更新に失敗: ${dbResult.error}`,
        debugInfo: debugResults
      };
    }
    
    return {
      success: true,
      debugInfo: debugResults
    };
    
  } catch (error) {
    console.error('❌ Complete upload error:', error);
    return {
      success: false,
      error: (error as Error).message,
      debugInfo: debugResults
    };
  }
};

/**
 * デバッグ機能付きのデータベース更新
 */
const updateVaccineCertificationWithDebug = async (
  dogId: string,
  rabiesPath?: string,
  comboPath?: string,
  rabiesExpiryDate?: string,
  comboExpiryDate?: string
): Promise<{ success: boolean; error?: string; debugInfo?: any }> => {
  
  const debugInfo: any = {
    dogId,
    rabiesPath,
    comboPath,
    rabiesExpiryDate,
    comboExpiryDate
  };
  
  try {
    // 既存の証明書を確認
    const { data: existingCert, error: certError } = await supabase
      .from('vaccine_certifications')
      .select('id')
      .eq('dog_id', dogId)
      .maybeSingle();
    
    
    debugInfo.existingCert = existingCert;
    debugInfo.certError = certError;
    
    if (certError && certError.code !== 'PGRST116') {
      return {
        success: false,
        error: certError.message,
        debugInfo
      };
    }
    
    // 更新データの準備
    const updateData: any = {
      status: 'pending'
    };
    
    if (rabiesPath) updateData.rabies_vaccine_image = rabiesPath;
    if (comboPath) updateData.combo_vaccine_image = comboPath;
    if (rabiesExpiryDate) updateData.rabies_expiry_date = rabiesExpiryDate;
    if (comboExpiryDate) updateData.combo_expiry_date = comboExpiryDate;
    
    debugInfo.updateData = updateData;
    
    if (existingCert) {
      // 既存の証明書を更新
      const { error: updateError } = await supabase
        .from('vaccine_certifications')
        .update(updateData)
        .eq('id', existingCert.id);
      
      debugInfo.updateError = updateError;
      
      if (updateError) {
        return {
          success: false,
          error: updateError.message,
          debugInfo
        };
      }
    } else {
      // 新しい証明書を作成
      console.log('➕ Creating new certificate...');
      const { error: insertError } = await supabase
        .from('vaccine_certifications')
        .insert([{
          dog_id: dogId,
          ...updateData
        }]);
      
      debugInfo.insertError = insertError;
      
      if (insertError) {
        return {
          success: false,
          error: insertError.message,
          debugInfo
        };
      }
    }
    
    return {
      success: true,
      debugInfo
    };
    
  } catch (error) {
    console.error('❌ Database update exception:', error);
    return {
      success: false,
      error: (error as Error).message,
      debugInfo: { ...debugInfo, exception: error }
    };
  }
};

/**
 * ストレージポリシーのテスト
 */
export const testStoragePolicy = async (dogId: string): Promise<{ success: boolean; details: any }> => {
  
  try {
    // テスト用の小さなファイルを作成
    const testFile = new File(['test'], 'test.txt', { type: 'text/plain' });
    const testFileName = `${dogId}/policy_test_${Date.now()}.txt`;
    
    
    // アップロードテスト
    const { data, error } = await supabase.storage
      .from('vaccine-certs')
      .upload(testFileName, testFile);
    
    
    if (error) {
      return {
        success: false,
        details: {
          uploadError: error,
          testFileName,
          dogId
        }
      };
    }
    
    // ファイルを削除
    await supabase.storage
      .from('vaccine-certs')
      .remove([testFileName]);
    
    return {
      success: true,
      details: {
        uploadSuccess: true,
        testFileName,
        dogId,
        data
      }
    };
    
  } catch (error) {
    console.error('❌ Policy test error:', error);
    return {
      success: false,
      details: { exception: error }
    };
  }
}; 
