import { Loader } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';

interface LazyImageProps {
    src: string;
    alt: string;
    className?: string;
    width?: number;
    height?: number;
    priority?: boolean; // LCP改善のための優先読み込み
    placeholderSrc?: string;
    onLoad?: () => void;
    onError?: () => void;
    sizes?: string;
    loading?: 'lazy' | 'eager';
    decoding?: 'async' | 'sync' | 'auto';
    fetchPriority?: 'high' | 'low' | 'auto';
}

const LazyImage: React.FC<LazyImageProps> = ({
    src,
    alt,
    className = '',
    width,
    height,
    priority = false,
    placeholderSrc,
    onLoad,
    onError,
    sizes,
    loading = 'lazy',
    decoding = 'async',
    fetchPriority = 'auto',
}) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [isInView, setIsInView] = useState(priority); // 優先画像は即座に読み込み
    const [hasError, setHasError] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);
    const observerRef = useRef<IntersectionObserver | null>(null);

    // Intersection Observer設定
    useEffect(() => {
        if (priority) return; // 優先画像はスキップ

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsInView(true);
                    observer.disconnect();
                }
            },
            {
                rootMargin: '50px', // 50px前から読み込み開始
                threshold: 0.1,
            }
        );

        observerRef.current = observer;

        if (imgRef.current) {
            observer.observe(imgRef.current);
        }

        return () => observer.disconnect();
    }, [priority]);

    // 画像読み込み処理
    const handleLoad = useCallback(() => {
        setIsLoaded(true);
        onLoad?.();
    }, [onLoad]);

    const handleError = useCallback(() => {
        setHasError(true);
        onError?.();
    }, [onError]);

    // プレースホルダー画像のStyle
    const placeholderStyle: React.CSSProperties = {
        backgroundColor: '#f3f4f6',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: height || '200px',
        minWidth: width || '100%',
    };

    // エラー時のフォールバック
    if (hasError) {
        return (
            <div
                className={`${className} bg-gray-200 flex items-center justify-center text-gray-500`}
                style={placeholderStyle}
            >
                <span className="text-sm">画像を読み込めませんでした</span>
            </div>
        );
    }

    return (
        <div className={`relative ${className}`} ref={imgRef}>
            {/* プレースホルダー */}
            {!isLoaded && (
                <div
                    className="absolute inset-0 flex items-center justify-center bg-gray-100 animate-pulse"
                    style={placeholderStyle}
                >
                    {placeholderSrc ? (
                        <img
                            src={placeholderSrc}
                            alt=""
                            className="w-full h-full object-cover opacity-50"
                        />
                    ) : (
                        <Loader className="w-8 h-8 text-gray-400 animate-spin" />
                    )}
                </div>
            )}

            {/* 実際の画像 */}
            {isInView && (
                <img
                    src={src}
                    alt={alt}
                    width={width}
                    height={height}
                    sizes={sizes}
                    loading={priority ? 'eager' : loading}
                    decoding={decoding}
                    fetchPriority={priority ? 'high' : fetchPriority}
                    onLoad={handleLoad}
                    onError={handleError}
                    className={`
            ${isLoaded ? 'opacity-100' : 'opacity-0'}
            transition-opacity duration-300 ease-in-out
            ${className}
          `}
                    style={{
                        aspectRatio: width && height ? `${width}/${height}` : 'auto',
                    }}
                />
            )}
        </div>
    );
};

export default LazyImage; 