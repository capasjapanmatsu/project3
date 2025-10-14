import { PARK_PLACEHOLDER_SVG } from '../../utils/placeholders';
// 安定表示のためサムネイルは通常のimgを使用

interface ParkImageGalleryProps {
  parkImages: { id: string; url: string; caption?: string }[];
  onImageClick: (index: number) => void;
}

export function ParkImageGallery({ parkImages, onImageClick }: ParkImageGalleryProps) {
  if (parkImages.length <= 1) {
    return null;
  }
  
  return (
    <div className="grid grid-cols-5 gap-2">
      {parkImages.slice(1, 6).map((image, index) => (
        <div 
          key={image.id} 
          className="relative h-20 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => onImageClick(index + 1)}
        >
          <img
            src={image.url || PARK_PLACEHOLDER_SVG}
            alt={image.caption || `画像 ${index + 2}`}
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = PARK_PLACEHOLDER_SVG; }}
          />
        </div>
      ))}
      {parkImages.length > 6 && (
        <div 
          className="relative h-20 rounded-lg overflow-hidden cursor-pointer bg-gray-200 flex items-center justify-center"
          onClick={() => onImageClick(6)}
        >
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <span className="text-white font-medium">+{parkImages.length - 6}</span>
          </div>
          <img
            src={parkImages[6].url || PARK_PLACEHOLDER_SVG}
            alt="その他の画像"
            className="w-full h-full object-cover opacity-60"
            loading="lazy"
            decoding="async"
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = PARK_PLACEHOLDER_SVG; }}
          />
        </div>
      )}
    </div>
  );
}
