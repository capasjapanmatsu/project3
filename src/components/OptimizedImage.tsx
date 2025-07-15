import React, { useState, useEffect, useRef } from 'react';
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
}

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
  fallbackSrc = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik04NS4zMzMzIDY2LjY2NjdDODUuMzMzMyA3NC4xIDc5LjQzMzMgODAuMTY2NyA3MS44MzMzIDgwLjE2NjdDNjQuMjMzMyA4MC4xNjY3IDU4LjMzMzMgNzQuMSA1OC4zMzMzIDY2LjY2NjdDNTguMzMzMyA1OS4yMzMzIDY0LjIzMzMgNTMuMTY2NyA3MS44MzMzIDUzLjE2NjdDNzkuNDMzMyA1My4xNjY3IDg1LjMzMzMgNTkuMjMzMyA4NS4zMzMzIDY2LjY2NjdaIiBmaWxsPSIjOUNBM0FGIi8+CjxwYXRoIGQ9Ik0xNjYuNjY3IDEzMy4zMzNIMzMuMzMzM1YxNjZIMTY2LjY2N1YxMzMuMzMzWiIgZmlsbD0iIzlDQTNBRiIvPgo8L3N2Zz4K',
  sizes,
  srcSet,
  aspectRatio,
  objectFit = 'cover',
  placeholder = 'empty'
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);
  const imgRef = useRef<HTMLImageElement>(null);
  const [isInView, setIsInView] = useState(priority);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority || loading === 'eager') return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      { 
        rootMargin: '50px',
        threshold: 0.1
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [priority, loading]);

  // Handle image load
  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
    logger.debug(`Image loaded: ${currentSrc}`);
  };

  // Handle image error with fallback
  const handleError = () => {
    if (currentSrc !== fallbackSrc) {
      logger.warn(`Image failed to load, using fallback: ${src}`);
      setCurrentSrc(fallbackSrc);
    } else {
      setHasError(true);
      logger.error(`Fallback image also failed: ${fallbackSrc}`);
    }
    onError?.();
  };

  // Calculate container style for aspect ratio
  const containerStyle: React.CSSProperties = {
    position: 'relative',
    overflow: 'hidden',
    ...(aspectRatio && {
      aspectRatio: aspectRatio.toString(),
    }),
    ...(width && height && !aspectRatio && {
      aspectRatio: `${width} / ${height}`,
    }),
  };

  // Image style
  const imageStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit,
    transition: 'opacity 0.3s ease-in-out',
    opacity: isLoaded ? 1 : 0,
  };

  // Placeholder style
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
    opacity: isLoaded ? 0 : 1,
    transition: 'opacity 0.3s ease-in-out',
    ...(placeholder === 'blur' && {
      filter: 'blur(10px)',
      backgroundImage: `url(${src})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }),
  };

  // Generate optimized srcSet if not provided
  const generateSrcSet = (baseSrc: string): string => {
    if (srcSet) return srcSet;
    
    const widths = [320, 640, 768, 1024, 1280, 1536];
    return widths
      .map(w => `${baseSrc}?w=${w}&q=75 ${w}w`)
      .join(', ');
  };

  // Don't render image until it's in view (for lazy loading)
  const shouldRender = isInView || priority || loading === 'eager';

  return (
    <div 
      ref={imgRef}
      className={`${className} prevent-layout-shift`}
      style={containerStyle}
    >
      {/* Placeholder */}
      {!isLoaded && (
        <div style={placeholderStyle}>
          {placeholder === 'empty' && !hasError && (
            <svg
              width="40"
              height="40"
              viewBox="0 0 40 40"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-gray-400"
            >
              <rect width="40" height="40" fill="currentColor" opacity="0.1" />
              <path
                d="M8 8L32 32M32 8L8 32"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          )}
          {hasError && (
            <div className="text-gray-400 text-center text-sm">
              <svg
                width="40"
                height="40"
                viewBox="0 0 40 40"
                fill="none"
                className="mx-auto mb-2"
              >
                <rect width="40" height="40" fill="currentColor" opacity="0.1" />
                <path
                  d="M20 12V20M20 28H20.01"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              画像を読み込めません
            </div>
          )}
        </div>
      )}

      {/* Main image */}
      {shouldRender && (
        <img
          src={currentSrc}
          alt={alt}
          width={width}
          height={height}
          loading={priority ? 'eager' : loading}
          decoding={priority ? 'sync' : 'async'}
          srcSet={generateSrcSet(currentSrc)}
          sizes={sizes || '100vw'}
          style={imageStyle}
          onLoad={handleLoad}
          onError={handleError}
          draggable={false}
          // SEO and accessibility attributes
          {...(priority && { fetchPriority: 'high' as const })}
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