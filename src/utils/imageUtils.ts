/**
 * 画像処理ユーティリティ
 */

export interface ImageProcessOptions {
  maxWidth: number;
  maxHeight: number;
  quality: number; // 0.1 - 1.0
  aspectRatio?: number; // 1 for square
}

/**
 * 画像ファイルをリサイズ・圧縮・トリミングする
 */
export const processImage = (
  file: File, 
  options: ImageProcessOptions
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    img.onload = () => {
      try {
        // 1:1のアスペクト比でトリミング
        let sourceX = 0;
        let sourceY = 0;
        let sourceWidth = img.width;
        let sourceHeight = img.height;

        if (options.aspectRatio === 1) {
          // 正方形にトリミング
          const minDimension = Math.min(img.width, img.height);
          sourceWidth = minDimension;
          sourceHeight = minDimension;
          sourceX = (img.width - minDimension) / 2;
          sourceY = (img.height - minDimension) / 2;
        }

        // キャンバスサイズを設定
        canvas.width = options.maxWidth;
        canvas.height = options.maxHeight;

        // 画像を描画（リサイズ・トリミング）
        ctx.drawImage(
          img,
          sourceX, sourceY, sourceWidth, sourceHeight,
          0, 0, options.maxWidth, options.maxHeight
        );

        // Blobとして出力（圧縮）
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create blob'));
            }
          },
          'image/jpeg',
          options.quality
        );
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
};

/**
 * レビュー用画像処理（300x300, 1:1, 圧縮率0.8）
 */
export const processReviewImage = (file: File): Promise<Blob> => {
  return processImage(file, {
    maxWidth: 300,
    maxHeight: 300,
    quality: 0.8,
    aspectRatio: 1
  });
};

/**
 * ファイルサイズを人間が読める形式に変換
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}; 
