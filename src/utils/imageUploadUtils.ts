/**
 * 犬の画像アップロード専用ユーティリティ
 * 包括的なエラーハンドリングと安定したアップロード処理を提供
 */

import { supabase } from './supabase';
import { processDogImage, processVaccineImage } from './imageUtils';

// エラータイプの定義
export interface UploadError {
  type: 'validation' | 'processing' | 'upload' | 'network' | 'storage' | 'unknown';
  message: string;
  details?: unknown;
}

// アップロード結果の型定義
export interface UploadResult {
  success: boolean;
  url?: string;
  error?: UploadError;
  fileName?: string;
}

// 犬の画像アップロード設定
export interface DogImageUploadConfig {
  dogId: string;
  imageType: 'profile' | 'rabies' | 'combo';
  replaceExisting?: boolean;
  maxRetries?: number;
}

/**
 * 犬の画像ファイルを検証する
 */
export function validateDogImageFile(file: File): UploadError | null {
  // ファイルサイズチェック（10MB以下）
  if (file.size > 10 * 1024 * 1024) {
    return {
      type: 'validation',
      message: '画像ファイルは10MB以下にしてください。',
      details: { fileSize: file.size }
    };
  }

  // ファイル形式チェック
  if (!file.type.startsWith('image/')) {
    return {
      type: 'validation',
      message: '画像ファイルを選択してください。',
      details: { fileType: file.type }
    };
  }

  // 許可されたファイル形式
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return {
      type: 'validation',
      message: 'JPEG、PNG、GIF、またはWebP形式の画像を選択してください。',
      details: { fileType: file.type }
    };
  }

  return null;
}

/**
 * ファイル名を生成する
 */
export function generateFileName(config: DogImageUploadConfig, extension: string = 'jpg'): string {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  
  switch (config.imageType) {
    case 'profile':
      return `${config.dogId}/profile_${timestamp}_${randomSuffix}.${extension}`;
    case 'rabies':
      return `${config.dogId}/rabies_${timestamp}_${randomSuffix}.${extension}`;
    case 'combo':
      return `${config.dogId}/combo_${timestamp}_${randomSuffix}.${extension}`;
    default:
      return `${config.dogId}/image_${timestamp}_${randomSuffix}.${extension}`;
  }
}

/**
 * 既存の画像を削除する
 */
export async function deleteExistingImage(
  bucketName: string,
  imageUrl: string | null
): Promise<void> {
  if (!imageUrl) return;

  try {
    // URLからファイルパスを抽出
    const url = new URL(imageUrl);
    const pathParts = url.pathname.split('/');
    const fileName = pathParts[pathParts.length - 1];
    const dogId = pathParts[pathParts.length - 2];
    
    if (fileName && dogId) {
      const filePath = `${dogId}/${fileName}`;
      
      console.log(`Deleting existing image: ${filePath}`);
      
      const { error } = await supabase.storage
        .from(bucketName)
        .remove([filePath]);
      
      if (error) {
        console.warn('Failed to delete existing image:', error);
        // 削除エラーは警告として扱い、処理を続行
      }
    }
  } catch (error) {
    console.warn('Error processing image URL for deletion:', error);
    // URL解析エラーは警告として扱い、処理を続行
  }
}

/**
 * 犬のプロフィール画像をアップロードする
 */
export async function uploadDogProfileImage(
  file: File,
  config: DogImageUploadConfig
): Promise<UploadResult> {
  try {
    // ファイル検証
    const validationError = validateDogImageFile(file);
    if (validationError) {
      return { success: false, error: validationError };
    }

    console.log('Starting dog profile image upload:', {
      dogId: config.dogId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    });

    // 画像処理
    let processedFile: File;
    try {
      processedFile = await processDogImage(file);
      console.log('Image processed successfully:', {
        originalSize: file.size,
        processedSize: processedFile.size,
        processedType: processedFile.type
      });
    } catch (error) {
      console.error('Image processing failed:', error);
      return {
        success: false,
        error: {
          type: 'processing',
          message: '画像の処理に失敗しました。別の画像をお試しください。',
          details: error
        }
      };
    }

    // ファイル名生成
    const fileName = generateFileName(config, 'jpg');
    
    // 既存画像の削除（設定されている場合）
    if (config.replaceExisting) {
      // 既存画像の削除は個別に実装が必要
      // ここでは処理をスキップ
    }

    // アップロード前の最終検証
    console.log('Final file validation before upload:', {
      fileName,
      fileType: processedFile.type,
      fileSize: processedFile.size,
      fileSizeInMB: (processedFile.size / (1024 * 1024)).toFixed(2),
      isValidImageType: processedFile.type.startsWith('image/'),
      isJpeg: processedFile.type === 'image/jpeg'
    });

    // processedFileは既に適切なMIMEタイプを持っているはず
    console.log('Uploading to Supabase storage:', {
      fileName,
      fileType: processedFile.type,
      fileSize: processedFile.size,
      isFile: processedFile instanceof File,
      isBlob: processedFile instanceof Blob,
      isValidJpeg: processedFile.type === 'image/jpeg'
    });
    
    // 直接HTTPリクエストを使用してアップロード
    const session = await supabase.auth.getSession();
    const authToken = session.data.session?.access_token;
    
    if (!authToken) {
      return {
        success: false,
        error: {
          type: 'storage',
          message: '認証エラーです。ログインし直してください。',
          details: 'No auth token available'
        }
      };
    }
    
    // Supabaseプロジェクトの設定から環境変数を取得
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
    const uploadUrl = `${SUPABASE_URL}/storage/v1/object/dog-images/${fileName}`;
    
    // FormDataを作成
    const formData = new FormData();
    formData.append('file', processedFile, fileName);
    
    console.log('Making direct HTTP request to:', uploadUrl);
    console.log('FormData file:', formData.get('file'));
    
    let data: any;
    let uploadError: any = null;
    
    try {
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'x-upsert': 'true',
          'cache-control': '3600'
        },
        body: formData
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('HTTP Upload failed:', {
          status: response.status,
          statusText: response.statusText,
          errorText
        });
        
        uploadError = {
          message: `HTTP ${response.status}: ${errorText}`
        };
      } else {
        const responseData = await response.json();
        console.log('HTTP Upload successful:', responseData);
        data = { path: fileName };
      }
    } catch (fetchError) {
      console.error('Fetch error during upload:', fetchError);
      uploadError = {
        message: 'ネットワークエラーが発生しました。',
        details: fetchError
      };
    }

    if (uploadError) {
      console.error('Upload failed:', uploadError);
      
      // エラータイプを判定
      let errorType: UploadError['type'] = 'upload';
      let errorMessage = '画像のアップロードに失敗しました。';
      
      if (uploadError.message.includes('row-level security')) {
        errorType = 'storage';
        errorMessage = 'ストレージのアクセス権限がありません。ログインし直してください。';
      } else if (uploadError.message.includes('mime type')) {
        errorType = 'validation';
        errorMessage = '画像形式がサポートされていません。JPEG、PNG、GIF形式の画像を選択してください。';
      } else if (uploadError.message.includes('size')) {
        errorType = 'validation';
        errorMessage = '画像ファイルのサイズが大きすぎます。10MB以下の画像を選択してください。';
      }
      
      return {
        success: false,
        error: {
          type: errorType,
          message: errorMessage,
          details: uploadError
        }
      };
    }

    // 公開URLを取得
    const { data: { publicUrl } } = supabase.storage
      .from('dog-images')
      .getPublicUrl(fileName);

    console.log('Upload successful:', {
      fileName,
      publicUrl,
      uploadData: data
    });

    return {
      success: true,
      url: publicUrl,
      fileName
    };

  } catch (error) {
    console.error('Unexpected error during upload:', error);
    return {
      success: false,
      error: {
        type: 'unknown',
        message: '予期しないエラーが発生しました。しばらく後にお試しください。',
        details: error
      }
    };
  }
}

/**
 * ワクチン証明書画像をアップロードする
 */
export async function uploadVaccineImage(
  file: File,
  config: DogImageUploadConfig
): Promise<UploadResult> {
  try {
    // ファイル検証
    const validationError = validateDogImageFile(file);
    if (validationError) {
      return { success: false, error: validationError };
    }

    console.log('Starting vaccine image upload:', {
      dogId: config.dogId,
      imageType: config.imageType,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    });

    // 画像処理
    let processedFile: File;
    try {
      processedFile = await processVaccineImage(file);
      console.log('Vaccine image processed successfully:', {
        originalSize: file.size,
        processedSize: processedFile.size,
        processedType: processedFile.type
      });
    } catch (error) {
      console.error('Vaccine image processing failed:', error);
      return {
        success: false,
        error: {
          type: 'processing',
          message: 'ワクチン証明書の処理に失敗しました。別の画像をお試しください。',
          details: error
        }
      };
    }

    // ファイル名生成
    const fileName = generateFileName(config, 'jpg');
    
    // アップロード前の最終検証
    console.log('Final vaccine file validation before upload:', {
      fileName,
      fileType: processedFile.type,
      fileSize: processedFile.size,
      fileSizeInMB: (processedFile.size / (1024 * 1024)).toFixed(2),
      isValidImageType: processedFile.type.startsWith('image/'),
      isJpeg: processedFile.type === 'image/jpeg'
    });

    // processedFileは既に適切なMIMEタイプを持っているはず
    console.log('Uploading vaccine image to Supabase storage:', {
      fileName,
      fileType: processedFile.type,
      fileSize: processedFile.size,
      isFile: processedFile instanceof File,
      isBlob: processedFile instanceof Blob,
      isValidJpeg: processedFile.type === 'image/jpeg'
    });
    
    // 直接HTTPリクエストを使用してアップロード
    const session = await supabase.auth.getSession();
    const authToken = session.data.session?.access_token;
    
    if (!authToken) {
      return {
        success: false,
        error: {
          type: 'storage',
          message: '認証エラーです。ログインし直してください。',
          details: 'No auth token available'
        }
      };
    }
    
    // Supabaseプロジェクトの設定から環境変数を取得
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
    const uploadUrl = `${SUPABASE_URL}/storage/v1/object/vaccine-certificates/${fileName}`;
    
    // FormDataを作成
    const formData = new FormData();
    formData.append('file', processedFile, fileName);
    
    console.log('Making direct HTTP request to:', uploadUrl);
    console.log('FormData file:', formData.get('file'));
    
    let data: any;
    let uploadError: any = null;
    
    try {
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'x-upsert': 'true',
          'cache-control': '3600'
        },
        body: formData
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Vaccine HTTP Upload failed:', {
          status: response.status,
          statusText: response.statusText,
          errorText
        });
        
        uploadError = {
          message: `HTTP ${response.status}: ${errorText}`
        };
      } else {
        const responseData = await response.json();
        console.log('Vaccine HTTP Upload successful:', responseData);
        data = { path: fileName };
      }
    } catch (fetchError) {
      console.error('Vaccine fetch error during upload:', fetchError);
      uploadError = {
        message: 'ネットワークエラーが発生しました。',
        details: fetchError
      };
    }

    if (uploadError) {
      console.error('Vaccine upload failed:', uploadError);
      
      // エラータイプを判定
      let errorType: UploadError['type'] = 'upload';
      let errorMessage = 'ワクチン証明書のアップロードに失敗しました。';
      
      if (uploadError.message.includes('row-level security')) {
        errorType = 'storage';
        errorMessage = 'ワクチン証明書のストレージアクセス権限がありません。ログインし直してください。';
      } else if (uploadError.message.includes('mime type')) {
        errorType = 'validation';
        errorMessage = 'ワクチン証明書の画像形式がサポートされていません。JPEG、PNG、GIF形式の画像を選択してください。';
      }
      
      return {
        success: false,
        error: {
          type: errorType,
          message: errorMessage,
          details: uploadError
        }
      };
    }

    // 公開URLを取得
    const { data: { publicUrl } } = supabase.storage
      .from('vaccine-certificates')
      .getPublicUrl(fileName);

    console.log('Vaccine upload successful:', {
      fileName,
      publicUrl,
      uploadData: data
    });

    return {
      success: true,
      url: publicUrl,
      fileName
    };

  } catch (error) {
    console.error('Unexpected error during vaccine upload:', error);
    return {
      success: false,
      error: {
        type: 'unknown',
        message: '予期しないエラーが発生しました。しばらく後にお試しください。',
        details: error
      }
    };
  }
}

/**
 * 再試行機能付きアップロード
 */
export async function uploadWithRetry(
  file: File,
  config: DogImageUploadConfig,
  maxRetries: number = 3
): Promise<UploadResult> {
  let lastError: UploadError | undefined;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`Upload attempt ${attempt}/${maxRetries}`);
    
    try {
      let result: UploadResult;
      
      if (config.imageType === 'profile') {
        result = await uploadDogProfileImage(file, config);
      } else {
        result = await uploadVaccineImage(file, config);
      }
      
      if (result.success) {
        return result;
      }
      
      lastError = result.error;
      
      // 再試行不可能なエラーの場合はすぐに終了
      if (lastError && ['validation', 'processing'].includes(lastError.type)) {
        break;
      }
      
      // 再試行前に少し待つ
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    } catch (error) {
      lastError = {
        type: 'unknown',
        message: '予期しないエラーが発生しました。',
        details: error
      };
    }
  }
  
  return {
    success: false,
    error: lastError || {
      type: 'unknown',
      message: '最大試行回数を超えました。しばらく後にお試しください。'
    }
  };
}

/**
 * バッチアップロード（複数ファイル）
 */
export async function uploadMultipleImages(
  uploads: Array<{ file: File; config: DogImageUploadConfig }>
): Promise<Array<UploadResult>> {
  const results: Array<UploadResult> = [];
  
  // 並列処理でアップロード
  const promises = uploads.map(async (upload) => {
    return uploadWithRetry(upload.file, upload.config);
  });
  
  const batchResults = await Promise.allSettled(promises);
  
  for (const result of batchResults) {
    if (result.status === 'fulfilled') {
      results.push(result.value);
    } else {
      results.push({
        success: false,
        error: {
          type: 'unknown',
          message: 'バッチアップロード中にエラーが発生しました。',
          details: result.reason
        }
      });
    }
  }
  
  return results;
}

/**
 * アップロード進捗を監視する
 */
export interface UploadProgress {
  fileName: string;
  status: 'pending' | 'processing' | 'uploading' | 'completed' | 'failed';
  progress: number; // 0-100
  error?: UploadError;
}

export class UploadProgressTracker {
  private progress = new Map<string, UploadProgress>();
  private callbacks: Array<(progress: Map<string, UploadProgress>) => void> = [];

  addCallback(callback: (progress: Map<string, UploadProgress>) => void) {
    this.callbacks.push(callback);
  }

  removeCallback(callback: (progress: Map<string, UploadProgress>) => void) {
    this.callbacks = this.callbacks.filter(cb => cb !== callback);
  }

  updateProgress(fileName: string, update: Partial<UploadProgress>) {
    const current = this.progress.get(fileName) || {
      fileName,
      status: 'pending',
      progress: 0
    };
    
    this.progress.set(fileName, { ...current, ...update });
    this.notifyCallbacks();
  }

  private notifyCallbacks() {
    this.callbacks.forEach(callback => {
      callback(new Map(this.progress));
    });
  }

  getProgress(fileName: string): UploadProgress | undefined {
    return this.progress.get(fileName);
  }

  getAllProgress(): Map<string, UploadProgress> {
    return new Map(this.progress);
  }

  clear() {
    this.progress.clear();
    this.notifyCallbacks();
  }
} 