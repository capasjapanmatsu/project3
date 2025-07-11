// デバッグ機能強化版のワクチン証明書アップロード
import { supabase } from './supabase';

/**
 * ストレージバケットの詳細情報を確認
 */
export const debugStorageInfo = async () => {
  console.log('🔍 === STORAGE DEBUG INFO START ===');
  
  try {
    // 1. バケット一覧の確認
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    console.log('📦 Available buckets:', buckets);
    console.log('📦 Bucket errors:', bucketsError);
    
    // 2. vaccine-certsバケットの詳細確認
    const vaccineBucket = buckets?.find(b => b.id === 'vaccine-certs');
    console.log('💉 vaccine-certs bucket details:', vaccineBucket);
    
    // 3. 現在のユーザー認証状態の確認
    const { data: authData, error: authError } = await supabase.auth.getUser();
    console.log('👤 Current user:', authData.user?.id);
    console.log('👤 Auth error:', authError);
    
    // 4. vaccine-certsバケット内のファイル一覧
    const { data: files, error: filesError } = await supabase.storage
      .from('vaccine-certs')
      .list('', { limit: 10 });
    console.log('📁 vaccine-certs files:', files);
    console.log('📁 Files error:', filesError);
    
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
    console.log('📊 Storage info:', storageInfo);
    
    // 1. ファイル検証
    console.log('📄 File info:', {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    });
    
    // 2. ファイル名の生成
    const timestamp = Date.now();
    const extension = file.name.split('.').pop() || 'jpg';
    const fileName = `${dogId}/${imageType}_${timestamp}.${extension}`;
    
    console.log('📝 Generated file path:', fileName);
    console.log('📝 Dog ID:', dogId);
    console.log('📝 Image type:', imageType);
    
    // 3. アップロードの実行
    console.log('🚀 Starting upload to vaccine-certs bucket...');
    
    const { data, error } = await supabase.storage
      .from('vaccine-certs')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      });
    
    console.log('📡 Upload response data:', data);
    console.log('❌ Upload response error:', error);
    
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
    console.log('✅ Upload successful, verifying...');
    
    // ファイルが実際に存在するか確認
    const { data: { publicUrl } } = supabase.storage
      .from('vaccine-certs')
      .getPublicUrl(fileName);
    
    console.log('🔗 Generated public URL:', publicUrl);
    
    // ファイル情報を取得
    const { data: fileInfo, error: fileInfoError } = await supabase.storage
      .from('vaccine-certs')
      .list(dogId, { search: `${imageType}_${timestamp}` });
    
    console.log('📋 File info after upload:', fileInfo);
    console.log('📋 File info error:', fileInfoError);
    
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
  console.log('🔬 === COMPLETE VACCINE UPLOAD DEBUG ===');
  
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
      console.log('💉 Uploading combo vaccine certificate...');
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
    console.log('💾 Updating database...');
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
    
    console.log('✅ Complete vaccine upload successful');
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
  console.log('💾 === DATABASE UPDATE DEBUG ===');
  
  const debugInfo: any = {
    dogId,
    rabiesPath,
    comboPath,
    rabiesExpiryDate,
    comboExpiryDate
  };
  
  try {
    // 既存の証明書を確認
    console.log('🔍 Checking existing certificate...');
    const { data: existingCert, error: certError } = await supabase
      .from('vaccine_certifications')
      .select('id')
      .eq('dog_id', dogId)
      .maybeSingle();
    
    console.log('📋 Existing certificate:', existingCert);
    console.log('❌ Certificate check error:', certError);
    
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
    
    console.log('📝 Update data:', updateData);
    debugInfo.updateData = updateData;
    
    if (existingCert) {
      // 既存の証明書を更新
      console.log('🔄 Updating existing certificate...');
      const { error: updateError } = await supabase
        .from('vaccine_certifications')
        .update(updateData)
        .eq('id', existingCert.id);
      
      console.log('❌ Update error:', updateError);
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
      
      console.log('❌ Insert error:', insertError);
      debugInfo.insertError = insertError;
      
      if (insertError) {
        return {
          success: false,
          error: insertError.message,
          debugInfo
        };
      }
    }
    
    console.log('✅ Database update successful');
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
  console.log('🔒 === STORAGE POLICY TEST ===');
  
  try {
    // テスト用の小さなファイルを作成
    const testFile = new File(['test'], 'test.txt', { type: 'text/plain' });
    const testFileName = `${dogId}/policy_test_${Date.now()}.txt`;
    
    console.log('📝 Testing file upload with path:', testFileName);
    
    // アップロードテスト
    const { data, error } = await supabase.storage
      .from('vaccine-certs')
      .upload(testFileName, testFile);
    
    console.log('📡 Test upload result:', { data, error });
    
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