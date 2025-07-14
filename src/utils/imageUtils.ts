/**
 * 画像処理ユーティリティ関数
 * 画像のリサイズ、圧縮、形式変換を行う
 */

// 画像のリサイズと圧縮オプション
export interface ImageProcessingOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 - 1.0
  maxSizeMB?: number;
  outputFormat?: 'jpeg' | 'png' | 'webp';
}

// デフォルトオプション
const DEFAULT_OPTIONS: Required<ImageProcessingOptions> = {
  maxWidth: 800,
  maxHeight: 600,
  quality: 0.8,
  maxSizeMB: 0.5,
  outputFormat: 'jpeg'
};

/**
 * 画像ファイルをリサイズ・圧縮する
 * @param file 元の画像ファイル
 * @param options 処理オプション
 * @returns 処理済みの画像ファイル
 */
export async function processImage(
  file: File, 
  options: ImageProcessingOptions = {}
): Promise<File> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  return new Promise((resolve, reject) => {
    // ファイル形式チェック
    if (!file.type.startsWith('image/')) {
      reject(new Error('画像ファイルを選択してください'));
      return;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      try {
        if (!ctx) {
          reject(new Error('Canvas context を取得できませんでした'));
          return;
        }
        // アスペクト比を保持してリサイズ
        const { width, height } = calculateDimensions(
          img.width, 
          img.height, 
          opts.maxWidth, 
          opts.maxHeight
        );

        canvas.width = width;
        canvas.height = height;

        // 画像を描画
        ctx.drawImage(img, 0, 0, width, height);

        // MIME typeを決定
        const mimeType = opts.outputFormat === 'jpeg' ? 'image/jpeg' : 
                        opts.outputFormat === 'png' ? 'image/png' : 
                        'image/webp';

        // Blobに変換
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('画像の処理に失敗しました'));
              return;
            }

            // ファイル名を生成（拡張子を適切に設定）
            const extension = opts.outputFormat === 'jpeg' ? 'jpg' : opts.outputFormat;
            const originalName = file.name.split('.')[0];
            const newFileName = `${originalName}_compressed.${extension}`;

            // Fileオブジェクトを作成
            const processedFile = new File([blob], newFileName, {
              type: mimeType,
              lastModified: Date.now()
            });

            // ファイルサイズチェック
            const fileSizeMB = processedFile.size / (1024 * 1024);
            if (fileSizeMB > opts.maxSizeMB) {
              // ファイルサイズが大きすぎる場合は品質を下げて再処理
              if (opts.quality > 0.3) {
                processImage(file, { ...opts, quality: opts.quality - 0.1 })
                  .then(resolve)
                  .catch(reject);
                return;
              }
            }

            resolve(processedFile);
          },
          mimeType,
          opts.quality
        );
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('画像の読み込みに失敗しました'));
    };

    // 画像を読み込み
    img.src = URL.createObjectURL(file);
  });
}

/**
 * アスペクト比を保持してサイズを計算
 */
function calculateDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  let { width, height } = { width: originalWidth, height: originalHeight };

  // 最大幅を超える場合
  if (width > maxWidth) {
    height = (height * maxWidth) / width;
    width = maxWidth;
  }

  // 最大高さを超える場合
  if (height > maxHeight) {
    width = (width * maxHeight) / height;
    height = maxHeight;
  }

  return { width: Math.round(width), height: Math.round(height) };
}

/**
 * ワンちゃん画像用の処理設定
 */
export async function processDogImage(file: File): Promise<File> {
  return processImage(file, {
    maxWidth: 800,
    maxHeight: 600,
    quality: 0.8,
    maxSizeMB: 0.5,
    outputFormat: 'jpeg'
  });
}

/**
 * ワクチン証明書画像用の処理設定
 */
export async function processVaccineImage(file: File): Promise<File> {
  return processImage(file, {
    maxWidth: 1200,
    maxHeight: 1600,
    quality: 0.85,
    maxSizeMB: 1.0,
    outputFormat: 'jpeg'
  });
}

/**
 * 画像ファイルのプレビューURLを生成
 */
export function createImagePreview(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        resolve(e.target.result as string);
      } else {
        reject(new Error('プレビューの生成に失敗しました'));
      }
    };
    reader.onerror = () => reject(new Error('ファイルの読み込みに失敗しました'));
    reader.readAsDataURL(file);
  });
}

/**
 * ファイルサイズを人間が読める形式に変換
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
} 