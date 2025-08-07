import { supabase } from './supabase';

export interface WebPConvertOptions {
  quality?: number; // WebP品質 (0-100, デフォルト: 80)
  generateThumbnail?: boolean; // サムネイル生成 (デフォルト: true)
  thumbnailSize?: number; // サムネイルサイズ (デフォルト: 300)
  keepOriginal?: boolean; // オリジナル画像を保持 (デフォルト: false)
}

export interface WebPConvertResult {
  success: boolean;
  webpUrl?: string;
  thumbnailUrl?: string;
  originalUrl?: string;
  webpPath?: string;
  thumbnailPath?: string;
  originalPath?: string;
  error?: string;
}

/**
 * 画像をWebP形式に変換し、アップロードする
 * @param bucket Supabase Storageのバケット名
 * @param file アップロードするファイル
 * @param path 保存先パス（ファイル名を含む）
 * @param options 変換オプション
 * @returns 変換結果
 */
export async function uploadAndConvertToWebP(
  bucket: string,
  file: File,
  path: string,
  options: WebPConvertOptions = {}
): Promise<WebPConvertResult> {
  try {
    // まず元画像をアップロード
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, file, { upsert: true });

    if (uploadError) {
      throw new Error(`ファイルのアップロードに失敗しました: ${uploadError.message}`);
    }

    // Edge FunctionでWebP変換
    const { data, error } = await supabase.functions.invoke('convert-to-webp', {
      body: {
        bucket,
        path,
        quality: options.quality ?? 80,
        generateThumbnail: options.generateThumbnail ?? true,
        thumbnailSize: options.thumbnailSize ?? 300,
        keepOriginal: options.keepOriginal ?? false,
      },
    });

    if (error) {
      throw new Error(`WebP変換に失敗しました: ${error.message}`);
    }

    if (!data.success) {
      throw new Error(data.error || 'WebP変換に失敗しました');
    }

    return {
      success: true,
      webpUrl: data.webpUrl,
      thumbnailUrl: data.thumbnailUrl,
      originalUrl: data.originalUrl,
      webpPath: data.webpPath,
      thumbnailPath: data.thumbnailPath,
      originalPath: data.originalPath,
    };
  } catch (error) {
    console.error('WebP conversion error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '画像の変換に失敗しました',
    };
  }
}

/**
 * 既存の画像をWebP形式に変換する（バッチ処理用）
 * @param bucket Supabase Storageのバケット名
 * @param path 既存画像のパス
 * @param options 変換オプション
 * @returns 変換結果
 */
export async function convertExistingImageToWebP(
  bucket: string,
  path: string,
  options: WebPConvertOptions = {}
): Promise<WebPConvertResult> {
  try {
    // Edge FunctionでWebP変換
    const { data, error } = await supabase.functions.invoke('convert-to-webp', {
      body: {
        bucket,
        path,
        quality: options.quality ?? 80,
        generateThumbnail: options.generateThumbnail ?? true,
        thumbnailSize: options.thumbnailSize ?? 300,
        keepOriginal: options.keepOriginal ?? true, // 既存画像変換時はデフォルトで保持
      },
    });

    if (error) {
      throw new Error(`WebP変換に失敗しました: ${error.message}`);
    }

    if (!data.success) {
      throw new Error(data.error || 'WebP変換に失敗しました');
    }

    return {
      success: true,
      webpUrl: data.webpUrl,
      thumbnailUrl: data.thumbnailUrl,
      originalUrl: data.originalUrl,
      webpPath: data.webpPath,
      thumbnailPath: data.thumbnailPath,
      originalPath: data.originalPath,
    };
  } catch (error) {
    console.error('WebP conversion error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '画像の変換に失敗しました',
    };
  }
}

/**
 * 画像URLを最適化された形式で取得する
 * WebP対応ブラウザではWebP画像を、非対応ブラウザでは元画像を返す
 * @param originalUrl 元画像のURL
 * @param webpUrl WebP画像のURL
 * @returns 最適化された画像URL
 */
export function getOptimizedImageUrl(originalUrl?: string, webpUrl?: string): string {
  // WebP対応チェック（簡易版）
  const supportsWebP = typeof window !== 'undefined' && 
    window.document?.createElement('canvas')?.toDataURL('image/webp')?.indexOf('image/webp') === 5;

  if (supportsWebP && webpUrl) {
    return webpUrl;
  }

  return originalUrl || '';
}

/**
 * <picture>要素用のソースセットを生成する
 * @param webpUrl WebP画像のURL
 * @param originalUrl 元画像のURL
 * @param thumbnailUrl サムネイルURL（オプション）
 * @returns picture要素で使用するソースセット
 */
export function generatePictureSources(
  webpUrl?: string,
  originalUrl?: string,
  thumbnailUrl?: string
): {
  webp?: string;
  original?: string;
  thumbnail?: string;
} {
  return {
    webp: webpUrl,
    original: originalUrl,
    thumbnail: thumbnailUrl,
  };
}
