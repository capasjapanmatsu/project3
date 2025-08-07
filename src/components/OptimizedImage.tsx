import React from 'react';

interface OptimizedImageProps {
  src?: string; // オリジナル画像URL
  webpSrc?: string; // WebP画像URL
  thumbnailSrc?: string; // サムネイルURL
  alt: string; // alt属性（必須）
  className?: string;
  loading?: 'lazy' | 'eager';
  onClick?: () => void;
  useThumbnail?: boolean; // サムネイルを使用するか
  fallbackSrc?: string; // エラー時のフォールバック画像
}

/**
 * WebP対応の最適化された画像コンポーネント
 * ブラウザのWebP対応状況に応じて適切な形式を表示
 */
export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  webpSrc,
  thumbnailSrc,
  alt,
  className = '',
  loading = 'lazy',
  onClick,
  useThumbnail = false,
  fallbackSrc = '/images/placeholder.png',
}) => {
  const [imageError, setImageError] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);

  // 表示する画像URLを決定
  const displaySrc = useThumbnail && thumbnailSrc ? thumbnailSrc : (webpSrc || src);

  const handleImageError = () => {
    setImageError(true);
    setIsLoading(false);
  };

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  // WebP対応ブラウザかどうかをチェック
  const supportsWebP = React.useMemo(() => {
    if (typeof window === 'undefined') return false;
    
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('image/webp') === 5;
  }, []);

  // picture要素を使用してブラウザに最適な形式を選択させる
  if (webpSrc && src) {
    return (
      <picture className={className} onClick={onClick}>
        {/* WebP対応ブラウザ用 */}
        <source 
          srcSet={useThumbnail && thumbnailSrc ? thumbnailSrc : webpSrc} 
          type="image/webp" 
        />
        {/* フォールバック（非WebP対応ブラウザ用） */}
        <img
          src={imageError ? fallbackSrc : src}
          alt={alt}
          className={className}
          loading={loading}
          onError={handleImageError}
          onLoad={handleImageLoad}
          style={{ 
            opacity: isLoading ? 0 : 1,
            transition: 'opacity 0.3s ease-in-out'
          }}
        />
      </picture>
    );
  }

  // 単一の画像ソースの場合
  return (
    <img
      src={imageError ? fallbackSrc : (displaySrc || fallbackSrc)}
      alt={alt}
      className={className}
      loading={loading}
      onClick={onClick}
      onError={handleImageError}
      onLoad={handleImageLoad}
      style={{ 
        opacity: isLoading ? 0 : 1,
        transition: 'opacity 0.3s ease-in-out'
      }}
    />
  );
};

interface ImageGalleryProps {
  images: Array<{
    id: string;
    originalUrl?: string;
    webpUrl?: string;
    thumbnailUrl?: string;
    alt: string;
  }>;
  className?: string;
  onImageClick?: (image: any) => void;
  columns?: number;
}

/**
 * 最適化された画像ギャラリーコンポーネント
 */
export const OptimizedImageGallery: React.FC<ImageGalleryProps> = ({
  images,
  className = '',
  onImageClick,
  columns = 3,
}) => {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
    6: 'grid-cols-6',
  }[columns] || 'grid-cols-3';

  return (
    <div className={`grid ${gridCols} gap-4 ${className}`}>
      {images.map((image) => (
        <div
          key={image.id}
          className="relative aspect-square overflow-hidden rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => onImageClick?.(image)}
        >
          <OptimizedImage
            src={image.originalUrl}
            webpSrc={image.webpUrl}
            thumbnailSrc={image.thumbnailUrl}
            alt={image.alt}
            className="w-full h-full object-cover"
            useThumbnail={true}
          />
        </div>
      ))}
    </div>
  );
};

export default OptimizedImage;