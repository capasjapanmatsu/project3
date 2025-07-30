import React, { useCallback, useEffect, useRef, useState } from 'react';
import { logger } from '../utils/logger';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  loading?: 'lazy' | 'eager';
  priority?: boolean;
  onLoad?: () => void;
  onError?: () => void;
  fallbackSrc?: string;
  sizes?: string;
  srcSet?: string;
  aspectRatio?: number;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  placeholder?: 'blur' | 'empty';
  quality?: number;
}

// WebP対応チェック
const supportsWebP = (() => {
  if (typeof window === 'undefined') return false;
  
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  
  return canvas.toDataURL('image/webp').indexOf('webp') > -1;
})();

// 画像形式を最適化
const optimizeImageUrl = (src: string, quality: number = 85): string => {
  if (!src || src.startsWith('data:') || src.startsWith('blob:')) {
    return src;
  }

  // 外部URLの場合はそのまま返す
  if (src.startsWith('http')) {
    return src;
  }

  // WebP対応の場合、拡張子を変換
  if (supportsWebP && !src.includes('.svg')) {
    const webpSrc = src.replace(/\.(jpg|jpeg|png)$/i, '.webp');
    return webpSrc;
  }

  return src;
};

// プレースホルダー画像生成
const generatePlaceholder = (width: number = 400, height: number = 300): string => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  
  // グラデーション背景
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#f3f4f6');
  gradient.addColorStop(1, '#e5e7eb');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  // 犬のアイコンを描画
  ctx.fillStyle = '#9ca3af';
  ctx.font = `${Math.min(width, height) * 0.2}px system-ui`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🐕', width / 2, height / 2);
  
  return canvas.toDataURL('image/png');
};

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  className = '',
  loading = 'lazy',
  priority = false,
  onLoad,
  onError,
  fallbackSrc,
  sizes,
  srcSet,
  aspectRatio,
  objectFit = 'cover',
  placeholder = 'empty',
  quality = 85
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState('');
  const [placeholderSrc, setPlaceholderSrc] = useState('');
  const imgRef = useRef<HTMLImageElement>(null);
  const [isInView, setIsInView] = useState(priority);

  // プレースホルダー生成
  useEffect(() => {
    if (placeholder === 'blur' && width && height) {
      setPlaceholderSrc(generatePlaceholder(width, height));
    }
  }, [placeholder, width, height]);

  // 画像URL最適化
  useEffect(() => {
    if (src) {
      setCurrentSrc(optimizeImageUrl(src, quality));
    }
  }, [src, quality]);

  // Intersection Observer で遅延読み込み
  useEffect(() => {
    if (priority || loading === 'eager') {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: '50px', // 50px手前で読み込み開始
        threshold: 0.1
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      if (imgRef.current) {
        observer.unobserve(imgRef.current);
      }
    };
  }, [priority, loading]);

  // 画像読み込み処理
  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    setHasError(false);
    onLoad?.();
    
    // Performance API でロード時間を記録
    if (performance && performance.mark) {
      performance.mark(`image-loaded-${alt}`);
    }
  }, [alt, onLoad]);

  const handleError = useCallback(() => {
    setHasError(true);
    setIsLoaded(false);
    
    // フォールバックURLを試行
    if (fallbackSrc && currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc);
      setHasError(false);
      return;
    }
    
    // 最終フォールバック
    if (!currentSrc.includes('placeholder')) {
      setCurrentSrc(generatePlaceholder(width || 400, height || 300));
      setHasError(false);
      return;
    }
    
    onError?.();
    logger.warn(`画像読み込みエラー: ${src}`);
  }, [currentSrc, fallbackSrc, width, height, src, onError]);

  // スタイル計算
  const containerStyle: React.CSSProperties = {
    position: 'relative',
    display: 'inline-block',
    overflow: 'hidden',
    ...(aspectRatio && {
      aspectRatio: aspectRatio.toString(),
      width: '100%',
    }),
    ...(width && { width }),
    ...(height && { height }),
  };

  const imageStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit,
    transition: 'opacity 0.3s ease',
    opacity: isLoaded ? 1 : 0,
  };

  const placeholderStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: '#f3f4f6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#9ca3af',
    fontSize: '24px',
    opacity: isLoaded ? 0 : 1,
    transition: 'opacity 0.3s ease',
    pointerEvents: 'none',
  };

  // srcSet を自動生成
  const generateSrcSet = (baseSrc: string): string => {
    if (srcSet) return srcSet;
    if (!baseSrc || baseSrc.startsWith('data:') || baseSrc.startsWith('blob:')) return '';
    
    const densities = [1, 1.5, 2];
    return densities
      .map(density => {
        const optimizedSrc = optimizeImageUrl(baseSrc, Math.max(60, quality - (density - 1) * 10));
        return `${optimizedSrc} ${density}x`;
      })
      .join(', ');
  };

  // sizes を自動計算
  const calculateSizes = (): string => {
    if (sizes) return sizes;
    if (width) return `${width}px`;
    return '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw';
  };

  return (
    <div style={containerStyle} className={className}>
      {/* プレースホルダー */}
      {!isLoaded && (
        <div style={placeholderStyle}>
          {placeholder === 'blur' && placeholderSrc ? (
            <img
              src={placeholderSrc}
              alt=""
              style={{ width: '100%', height: '100%', objectFit, filter: 'blur(5px)' }}
            />
          ) : (
            <span>🐕</span>
          )}
        </div>
      )}
      
      {/* メイン画像 */}
      {(isInView || priority) && currentSrc && (
        <img
          ref={imgRef}
          src={currentSrc}
          alt={alt}
          width={width}
          height={height}
          style={imageStyle}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
          srcSet={generateSrcSet(currentSrc)}
          sizes={calculateSizes()}
          // Performance hints
          fetchpriority={priority ? 'high' : 'low'}
        />
      )}
      
      {/* 読み込み状態表示 */}
      {!isLoaded && !hasError && isInView && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '20px',
            height: '20px',
            border: '2px solid #e5e7eb',
            borderTop: '2px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        />
      )}
    </div>
  );
};

// Preset configurations for common use cases
export const ProfileImage: React.FC<Omit<OptimizedImageProps, 'aspectRatio' | 'objectFit'>> = (props) => (
  <OptimizedImage {...props} aspectRatio={1} objectFit="cover" />
);

export const CardImage: React.FC<Omit<OptimizedImageProps, 'aspectRatio' | 'objectFit'>> = (props) => (
  <OptimizedImage {...props} aspectRatio={16/9} objectFit="cover" />
);

export const HeroImage: React.FC<Omit<OptimizedImageProps, 'priority' | 'loading'>> = (props) => (
  <OptimizedImage {...props} priority={true} loading="eager" />
); 
