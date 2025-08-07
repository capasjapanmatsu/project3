/**
 * 画像処理ユーティリティ
 */

export interface ImageProcessOptions {
  maxWidth: number;
  maxHeight: number;
  quality: number; // 0.1 - 1.0
  aspectRatio?: number; // 1 for square
  maxSizeMB?: number; // 最大ファイルサイズ（MB）
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
        // アスペクト比に応じたトリミング
        let sourceX = 0;
        let sourceY = 0;
        let sourceWidth = img.width;
        let sourceHeight = img.height;

        if (options.aspectRatio) {
          const targetRatio = options.aspectRatio;
          const currentRatio = img.width / img.height;

          if (currentRatio > targetRatio) {
            // 画像が目標より横長の場合、左右をトリミング
            sourceWidth = img.height * targetRatio;
            sourceX = (img.width - sourceWidth) / 2;
          } else if (currentRatio < targetRatio) {
            // 画像が目標より縦長の場合、上下をトリミング
            sourceHeight = img.width / targetRatio;
            sourceY = (img.height - sourceHeight) / 2;
          }
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
              // ファイルサイズチェック
              if (options.maxSizeMB && blob.size > options.maxSizeMB * 1024 * 1024) {
                // サイズが大きすぎる場合、品質を下げて再試行
                const lowerQuality = Math.max(0.1, options.quality - 0.2);
                canvas.toBlob(
                  (smallerBlob) => {
                    if (smallerBlob) {
                      resolve(smallerBlob);
                    } else {
                      reject(new Error('Failed to create compressed blob'));
                    }
                  },
                  'image/jpeg',
                  lowerQuality
                );
              } else {
                resolve(blob);
              }
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
 * ファイルサイズを人間が読める形式に変換
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}; 
