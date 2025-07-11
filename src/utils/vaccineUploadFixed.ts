// 元のBoltパターンに合わせたワクチン証明書アップロード
import { supabase } from './supabase';

/**
 * 元のBoltの犬画像アップロードパターンに合わせたワクチン証明書アップロード
 */
export const uploadVaccineImageFixed = async (
  file: File,
  dogId: string,
  imageType: 'rabies' | 'combo'
): Promise<{ success: boolean; filePath?: string; error?: string }> => {
  try {
    console.log('🔧 Fixed vaccine upload - starting...', {
      dogId,
      imageType,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    });

    // 元のBoltパターンと同じファイル名生成
    const fileExt = file.name.split('.').pop() || 'jpg';
    const timestamp = Date.now();
    const fileName = `${dogId}/${imageType}_${timestamp}.${fileExt}`;

    console.log('Generated file name:', fileName);

    // Fileオブジェクトの検証を強化
    if (!(file instanceof File)) {
      console.error('❌ File validation failed:', {
        isFile: false,
        actualType: typeof file,
        hasName: 'name' in file,
        hasType: 'type' in file
      });
      throw new Error(`Invalid file object: expected File, got ${typeof file}`);
    }

    console.log('✅ File validation passed:', {
      isFile: true,
      name: file.name,
      type: file.type,
      size: file.size
    });

    // 📋 デバッグ: アップロード前の状況確認
    console.log('🔍 === UPLOAD DEBUG INFO ===');
    console.log('📁 Bucket: vaccine-certs');
    console.log('📄 File name:', fileName);
    console.log('📋 File details:', {
      name: file.name,
      type: file.type,
      size: file.size,
      lastModified: file.lastModified,
      instanceof_File: file instanceof File
    });
    console.log('⚙️ Upload options:', {
      cacheControl: '3600',
      upsert: true,
      contentType: file.type
    });

    // Content-Typeを明示的に指定したアップロード方式
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('vaccine-certs')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type  // ← 重要: Content-Typeを明示
      });

    if (uploadError) {
      console.error('🚨 === UPLOAD ERROR DETAILS ===');
      console.error('❌ Error message:', uploadError.message);
      console.error('❌ Error details:', uploadError);
      console.error('❌ Error code:', uploadError.name || 'N/A');
      console.error('❌ File type:', file.type);
      console.error('❌ Content-Type sent:', file.type);
      console.error('❌ File size:', file.size);
      console.error('❌ Bucket:', 'vaccine-certs');
      console.error('❌ File path:', fileName);
      
      return {
        success: false,
        error: `アップロードに失敗しました: ${uploadError.message}`
      };
    }

    console.log('Fixed upload successful:', uploadData);

    // 元のBoltパターンと同じ公開URL取得
    const { data: { publicUrl } } = supabase.storage
      .from('vaccine-certs')
      .getPublicUrl(fileName);

    console.log('Generated public URL:', publicUrl);

    return {
      success: true,
      filePath: fileName
    };

  } catch (error) {
    console.error('Fixed upload exception:', error);
    return {
      success: false,
      error: (error as Error).message
    };
  }
};

/**
 * 元のBoltパターンに合わせた完全なワクチン証明書処理
 */
export const handleVaccineUploadFixed = async (
  dogId: string,
  rabiesFile?: File,
  comboFile?: File,
  rabiesExpiryDate?: string,
  comboExpiryDate?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('🔧 Fixed complete vaccine upload starting...');

    let rabiesPath: string | undefined;
    let comboPath: string | undefined;

    // 狂犬病ワクチン証明書のアップロード（元のBoltパターン）
    if (rabiesFile) {
      console.log('Uploading rabies vaccine...');
      const rabiesResult = await uploadVaccineImageFixed(rabiesFile, dogId, 'rabies');
      
      if (!rabiesResult.success) {
        return {
          success: false,
          error: `狂犬病ワクチン証明書: ${rabiesResult.error}`
        };
      }
      
      rabiesPath = rabiesResult.filePath;
      console.log('Rabies upload successful:', rabiesPath);
    }

    // 混合ワクチン証明書のアップロード（元のBoltパターン）
    if (comboFile) {
      console.log('Uploading combo vaccine...');
      const comboResult = await uploadVaccineImageFixed(comboFile, dogId, 'combo');
      
      if (!comboResult.success) {
        return {
          success: false,
          error: `混合ワクチン証明書: ${comboResult.error}`
        };
      }
      
      comboPath = comboResult.filePath;
      console.log('Combo upload successful:', comboPath);
    }

    // データベース更新（元のBoltパターン）
    console.log('Updating database...');
    
    // 既存の証明書を確認
    const { data: existingCert, error: certError } = await supabase
      .from('vaccine_certifications')
      .select('id')
      .eq('dog_id', dogId)
      .maybeSingle();

    if (certError && certError.code !== 'PGRST116') {
      return {
        success: false,
        error: `データベース確認エラー: ${certError.message}`
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

    if (existingCert) {
      // 既存の証明書を更新
      const { error: updateError } = await supabase
        .from('vaccine_certifications')
        .update(updateData)
        .eq('id', existingCert.id);

      if (updateError) {
        return {
          success: false,
          error: `証明書更新エラー: ${updateError.message}`
        };
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
        return {
          success: false,
          error: `証明書作成エラー: ${insertError.message}`
        };
      }
    }

    console.log('✅ Fixed vaccine upload completed successfully');
    return { success: true };

  } catch (error) {
    console.error('Fixed complete upload error:', error);
    return {
      success: false,
      error: (error as Error).message
    };
  }
}; 