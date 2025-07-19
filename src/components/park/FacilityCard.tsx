import { Image, MapPin } from 'lucide-react';
import { PetFacility } from '../../hooks/useParkData';
import Button from '../Button';
import Card from '../Card';

interface FacilityCardProps {
  facility: PetFacility;
  categoryLabel: string;
}

const CATEGORY_LABELS: { [key: string]: string } = {
  'pet_hotel': 'ペットホテル',
  'pet_salon': 'ペットサロン',
  'veterinary': '動物病院',
  'pet_cafe': 'ペットカフェ',
  'pet_restaurant': 'ペット同伴レストラン',
  'pet_shop': 'ペットショップ',
  'pet_accommodation': 'ペット同伴宿泊'
};

export const FacilityCard: React.FC<FacilityCardProps> = ({ facility, categoryLabel }) => {
  const images = facility.images || [];
  const primaryImage = images.find(img => img.is_primary) || images[0];

  return (
    <Card className="overflow-hidden">
      {/* 施設画像 */}
      {primaryImage ? (
        <div className="relative h-48 bg-gray-200">
          <img
            src={primaryImage.image_data}
            alt={facility.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          {images.length > 1 && (
            <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
              +{images.length - 1}枚
            </div>
          )}
        </div>
      ) : (
        <div className="h-48 bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
          <div className="text-center">
            <Image className="w-12 h-12 text-blue-400 mx-auto mb-2" />
            <p className="text-blue-600 text-sm">画像なし</p>
          </div>
        </div>
      )}
      
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {facility.name}
            </h3>
            <p className="text-sm text-blue-600 font-medium mb-2">
              {categoryLabel}
            </p>
            <div className="flex items-center text-sm text-gray-600 mb-2">
              <MapPin className="w-4 h-4 mr-1" />
              <span className="truncate">{facility.address}</span>
            </div>
          </div>
        </div>

        {facility.phone && (
          <div className="flex items-center text-sm text-gray-600 mb-2">
            <span>📞 {facility.phone}</span>
          </div>
        )}

        {facility.website && (
          <div className="mb-2">
            <a 
              href={facility.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              🌐 ウェブサイト
            </a>
          </div>
        )}

        {facility.description && (
          <div className="mb-4">
            <p className="text-sm text-gray-700 line-clamp-3">
              {facility.description}
            </p>
          </div>
        )}

        {/* 施設アクションボタン */}
        <div className="flex space-x-2">
          {facility.website && (
            <a 
              href={facility.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1"
            >
              <Button 
                variant="secondary"
                className="w-full text-sm"
              >
                🌐 サイト
              </Button>
            </a>
          )}
          {facility.phone && (
            <a 
              href={`tel:${facility.phone}`}
              className="flex-1"
            >
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700 text-sm"
              >
                📞 電話
              </Button>
            </a>
          )}
          {!facility.website && !facility.phone && (
            <Button 
              variant="secondary"
              className="w-full text-sm"
              disabled
            >
              連絡先なし
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}; 