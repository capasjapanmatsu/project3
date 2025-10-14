import React, { useMemo, useState } from 'react';

type Props = {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  sizes?: string;
  width?: number;
  height?: number;
  placeholderSrc?: string; // optional custom LQIP
  fill?: boolean; // use absolute fill layout
  onError?: React.ImgHTMLAttributes<HTMLImageElement>['onError'];
};

// 超軽量のデフォルトLQIP（SVGグラデーション）
const DEFAULT_PLACEHOLDER =
  'data:image/svg+xml;base64,' +
  btoa(
    `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" preserveAspectRatio="none"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#dbeafe"/><stop offset="50%" stop-color="#fff7ed"/><stop offset="100%" stop-color="#dcfce7"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`
  );

export const BlurUpImage: React.FC<Props> = ({
  src,
  alt,
  className,
  style,
  sizes,
  width,
  height,
  placeholderSrc,
  fill,
  onError,
}) => {
  const [loaded, setLoaded] = useState(false);
  const placeholder = useMemo(() => placeholderSrc || DEFAULT_PLACEHOLDER, [placeholderSrc]);

  const baseClasses = fill ? 'absolute inset-0 w-full h-full object-cover' : '';

  return (
    <div className={`relative ${fill ? 'block w-full h-full' : ''}`} style={style}>
      {/* placeholder */}
      <img
        src={placeholder}
        alt=""
        aria-hidden="true"
        className={`${baseClasses} ${className || ''} ${loaded ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300 blur-sm`}
        width={width}
        height={height}
        decoding="async"
      />
      {/* actual */}
      <img
        src={src}
        alt={alt}
        className={`${baseClasses} ${className || ''} ${loaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
        sizes={sizes}
        width={width}
        height={height}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={onError}
      />
    </div>
  );
};

export default BlurUpImage;


