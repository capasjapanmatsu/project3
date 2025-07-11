// シンプルなワクチン証明書アップロード（デバッグ用）
import { supabase } from './supabase';

/**
 * 非常にシンプルなワクチン証明書アップロード
 */
export const simpleVaccineUpload = async (
  file: File,
  dogId: string,
  imageType: 'rabies' | 'combo'
): Promise<{ success: boolean; error?: string; details?: any }> => {
  try {
    console.log('🔍 === SIMPLE VACCINE UPLOAD START ===');
    console.log('File:', { name: file.name, size: file.size, type: file.type });
    console.log('Dog ID:', dogId);
    console.log('Image type:', imageType);

    // 1. バケット確認
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    console.log('Available buckets:', buckets);
    
    if (bucketsError) {
      console.error('Buckets error:', bucketsError);
      return { success: false, error: bucketsError.message };
    }

    const vaccineBucket = buckets?.find(b => b.id === 'vaccine-certs');
    if (!vaccineBucket) {
      return { success: false, error: 'vaccine-certsバケットが見つかりません' };
    }

    console.log('vaccine-certs bucket found:', vaccineBucket);

    // 2. シンプルなファイル名を生成（フォルダなし）
    const timestamp = Date.now();
    const extension = file.name.split('.').pop() || 'jpg';
    const simpleFileName = `${imageType}_${timestamp}.${extension}`;

    console.log('Simple file name:', simpleFileName);

    // 3. ルートにアップロード（フォルダなし）
    console.log('Uploading to vaccine-certs root...');
    const { data, error } = await supabase.storage
      .from('vaccine-certs')
      .upload(simpleFileName, file, {
        cacheControl: '3600',
        upsert: true
      });

    console.log('Upload result:', { data, error });

    if (error) {
      console.error('Upload error details:', error);
      return { 
        success: false, 
        error: error.message,
        details: {
          fileName: simpleFileName,
          errorDetails: error,
          bucketInfo: vaccineBucket
        }
      };
    }

    // 4. 公開URLを取得
    const { data: { publicUrl } } = supabase.storage
      .from('vaccine-certs')
      .getPublicUrl(simpleFileName);

    console.log('Public URL:', publicUrl);

    return {
      success: true,
      details: {
        fileName: simpleFileName,
        publicUrl,
        uploadData: data
      }
    };

  } catch (error) {
    console.error('Simple upload exception:', error);
    return {
      success: false,
      error: (error as Error).message,
      details: { exception: error }
    };
  }
};

/**
 * フォルダ付きファイル名でのアップロード
 */
export const folderVaccineUpload = async (
  file: File,
  dogId: string,
  imageType: 'rabies' | 'combo'
): Promise<{ success: boolean; error?: string; details?: any }> => {
  try {
    console.log('📁 === FOLDER VACCINE UPLOAD START ===');

    const timestamp = Date.now();
    const extension = file.name.split('.').pop() || 'jpg';
    const folderFileName = `${dogId}/${imageType}_${timestamp}.${extension}`;

    console.log('Folder file name:', folderFileName);

    const { data, error } = await supabase.storage
      .from('vaccine-certs')
      .upload(folderFileName, file, {
        cacheControl: '3600',
        upsert: true
      });

    console.log('Folder upload result:', { data, error });

    if (error) {
      return { 
        success: false, 
        error: error.message,
        details: { fileName: folderFileName, errorDetails: error }
      };
    }

    const { data: { publicUrl } } = supabase.storage
      .from('vaccine-certs')
      .getPublicUrl(folderFileName);

    return {
      success: true,
      details: { fileName: folderFileName, publicUrl, uploadData: data }
    };

  } catch (error) {
    console.error('Folder upload exception:', error);
    return {
      success: false,
      error: (error as Error).message,
      details: { exception: error }
    };
  }
};

/**
 * 複数のパターンでテストアップロード
 */
export const testMultiplePatterns = async (
  file: File,
  dogId: string,
  imageType: 'rabies' | 'combo'
): Promise<{ results: any[]; bestResult?: any }> => {
  console.log('🧪 === TESTING MULTIPLE UPLOAD PATTERNS ===');

  const results = [];

  // パターン1: シンプル（ルート）
  console.log('Testing pattern 1: Simple root upload...');
  const simpleResult = await simpleVaccineUpload(file, dogId, imageType);
  results.push({ pattern: 'simple_root', ...simpleResult });

  // パターン2: フォルダ付き
  console.log('Testing pattern 2: Folder upload...');
  const folderResult = await folderVaccineUpload(file, dogId, imageType);
  results.push({ pattern: 'folder', ...folderResult });

  // パターン3: tempフォルダ
  console.log('Testing pattern 3: Temp folder upload...');
  const timestamp = Date.now();
  const extension = file.name.split('.').pop() || 'jpg';
  const tempFileName = `temp/${imageType}_${timestamp}.${extension}`;

  const { data: tempData, error: tempError } = await supabase.storage
    .from('vaccine-certs')
    .upload(tempFileName, file, {
      cacheControl: '3600',
      upsert: true
    });

  results.push({ 
    pattern: 'temp_folder', 
    success: !tempError,
    error: tempError?.message,
    details: { fileName: tempFileName, data: tempData, error: tempError }
  });

  console.log('All test results:', results);

  // 成功したパターンを見つける
  const successfulResult = results.find(r => r.success);

  return {
    results,
    bestResult: successfulResult
  };
}; 