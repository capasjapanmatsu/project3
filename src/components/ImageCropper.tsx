import { Check, RotateCcw, Upload, X } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { processImage } from '../utils/imageUtils';
import Button from './Button';

interface ImageCropperProps {
  imageFile?: File; // 初期画像ファイル
  onCropComplete: (croppedFile: File) => void;
  onCancel: () => void;
  aspectRatio?: number;
  maxWidth?: number;
  maxHeight?: number;
}

const ImageCropper: React.FC<ImageCropperProps> = ({
  imageFile,
  onCropComplete,
  onCancel,
  aspectRatio = 1, // デフォルト1:1比率
  maxWidth = 400,
  maxHeight = 400
}) => {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [isProcessing, setIsProcessing] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 初期ファイルがある場合の処理
  useEffect(() => {
    if (imageFile) {
      // ファイル形式チェック
      if (!imageFile.type.startsWith('image/')) {
        alert('画像ファイルを選択してください。');
        onCancel();
        return;
      }

      // ファイルサイズチェック（10MB未満）
      if (imageFile.size > 10 * 1024 * 1024) {
        alert('ファイルサイズは10MB未満にしてください。');
        onCancel();
        return;
      }

      setCrop(undefined);
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        const result = reader.result;
        if (result && typeof result === 'string') {
          setImageSrc(result);
        }
      });
      
      reader.addEventListener('error', (error) => {
        console.error('FileReader error:', error);
      });
      
      reader.readAsDataURL(imageFile);
    }
  }, [imageFile, onCancel]);

  // ファイル選択時の処理
  const onSelectFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      
      // ファイル形式チェック
      if (!file.type.startsWith('image/')) {
        alert('画像ファイルを選択してください。');
        return;
      }

      // ファイルサイズチェック（10MB未満）
      if (file.size > 10 * 1024 * 1024) {
        alert('ファイルサイズは10MB未満にしてください。');
        return;
      }

      setCrop(undefined); // Makes crop preview update between images.
      const reader = new FileReader();
      reader.addEventListener('load', () =>
        setImageSrc(reader.result?.toString() || ''),
      );
      reader.readAsDataURL(file);
    }
  }, []);

  // 画像ロード時の処理
  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    
    // 中央配置で1:1のクロップエリアを設定
    const crop = centerCrop(
      makeAspectCrop(
        {
          unit: '%',
          width: 90,
        },
        aspectRatio,
        width,
        height,
      ),
      width,
      height,
    );
    setCrop(crop);
  }, [aspectRatio]);

  // クロップ完了処理
  const onCropConfirm = useCallback(async () => {
    if (!completedCrop || !imgRef.current || !canvasRef.current) {
      alert('クロップエリアを選択してください。');
      return;
    }

    setIsProcessing(true);

    try {
      const image = imgRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Canvas context を取得できませんでした。');
      }

      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;

      // Canvas サイズを設定（1:1 比率を維持）
      const size = Math.min(maxWidth, maxHeight);
      canvas.width = size;
      canvas.height = size;

      // 高品質レンダリング設定
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // クロップされた画像を描画
      ctx.drawImage(
        image,
        completedCrop.x * scaleX,
        completedCrop.y * scaleY,
        completedCrop.width * scaleX,
        completedCrop.height * scaleY,
        0,
        0,
        size,
        size,
      );

      // Canvas を Blob に変換
      canvas.toBlob(
        async (blob) => {
          if (!blob) {
            throw new Error('画像の処理に失敗しました。');
          }

          // File オブジェクトを作成
          const file = new File([blob], 'cropped-image.jpg', {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });

          // 追加の圧縮処理
          const optimizedFile = await processImage(file, {
            maxWidth: size,
            maxHeight: size,
            quality: 0.85,
            maxSizeMB: 0.3, // 300KB未満
            outputFormat: 'jpeg'
          });

          onCropComplete(optimizedFile);
        },
        'image/jpeg',
        0.9
      );
    } catch (error) {
      console.error('Image processing error:', error);
      alert('画像の処理中にエラーが発生しました。');
    } finally {
      setIsProcessing(false);
    }
  }, [completedCrop, maxWidth, maxHeight, onCropComplete]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">画像をトリミング</h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-4">
          {!imageSrc ? (
            <div className="text-center py-12">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <label className="cursor-pointer">
                <span className="text-blue-600 hover:text-blue-500 font-medium">
                  画像を選択してください
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={onSelectFile}
                  className="hidden"
                />
              </label>
              <p className="text-sm text-gray-500 mt-2">
                JPG、PNG、WEBP形式対応（10MB未満）
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">
                  ドラッグして切り取り範囲を選択してください（1:1比率で切り取られます）
                </p>
              </div>
              
              <div className="flex justify-center max-h-96 overflow-hidden">
                <ReactCrop
                  crop={crop}
                  onChange={(_, percentCrop) => setCrop(percentCrop)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={aspectRatio}
                  minWidth={100}
                  minHeight={100}
                >
                  <img
                    ref={imgRef}
                    alt="Crop me"
                    src={imageSrc}
                    style={{ maxHeight: '400px', maxWidth: '100%' }}
                    onLoad={onImageLoad}
                  />
                </ReactCrop>
              </div>

              <div className="flex gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={() => setImageSrc('')}
                  disabled={isProcessing}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  画像を変更
                </Button>
                <Button
                  onClick={onCropConfirm}
                  disabled={!completedCrop || isProcessing}
                >
                  <Check className="w-4 h-4 mr-2" />
                  {isProcessing ? '処理中...' : 'トリミング完了'}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Hidden canvas for cropping */}
        <canvas
          ref={canvasRef}
          style={{ display: 'none' }}
        />
      </div>
    </div>
  );
};

export default ImageCropper; 