// CategoryLegend.tsx - ペット施設カテゴリの凡例コンポーネント
import {
    Building2,
    Coffee,
    Home,
    ShoppingBag,
    Stethoscope,
    UtensilsCrossed,
} from 'lucide-react';
import { type FacilityCategory } from '../../types/facilities';

interface CategoryLegendProps {
  selectedCategories?: FacilityCategory[];
  onCategoryToggle?: (category: FacilityCategory) => void;
}

// 施設カテゴリのアイコンと色の定義
const CATEGORY_CONFIG = {
  veterinary_clinic: {
    icon: Stethoscope,
    label: '動物病院',
    color: 'text-red-600 bg-red-50 border-red-200',
  },
  pet_friendly_restaurant: {
    icon: UtensilsCrossed,
    label: 'ペット同伴レストラン',
    color: 'text-orange-600 bg-orange-50 border-orange-200',
  },
  pet_shop: {
    icon: ShoppingBag,
    label: 'ペットショップ',
    color: 'text-blue-600 bg-blue-50 border-blue-200',
  },
  pet_friendly_hotel: {
    icon: Home,
    label: 'ペット同伴宿泊',
    color: 'text-green-600 bg-green-50 border-green-200',
  },
  pet_salon: {
    icon: Building2,
    label: 'ペットサロン',
    color: 'text-purple-600 bg-purple-50 border-purple-200',
  },
  pet_hotel: {
    icon: Coffee,
    label: 'ペットホテル',
    color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
  },
  other: {
    icon: Building2,
    label: 'その他',
    color: 'text-gray-600 bg-gray-50 border-gray-200',
  },
} as const;

export function CategoryLegend({ selectedCategories, onCategoryToggle }: CategoryLegendProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <h3 className="text-sm font-medium text-gray-900 mb-3">施設カテゴリ</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {Object.entries(CATEGORY_CONFIG).map(([category, config]) => {
          const Icon = config.icon;
          const isSelected = selectedCategories?.includes(category as FacilityCategory) ?? true;
          
          return (
            <button
              key={category}
              type="button"
              onClick={() => onCategoryToggle?.(category as FacilityCategory)}
              className={`
                flex items-center space-x-2 px-3 py-2 rounded-lg border text-xs font-medium
                transition-all duration-200 text-left
                ${isSelected 
                  ? config.color 
                  : 'text-gray-400 bg-gray-50 border-gray-200 hover:bg-gray-100'
                }
                ${onCategoryToggle ? 'cursor-pointer hover:scale-105' : 'cursor-default'}
              `}
              disabled={!onCategoryToggle}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{config.label}</span>
            </button>
          );
        })}
      </div>
      {onCategoryToggle && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            カテゴリをクリックして表示を切り替えられます
          </p>
        </div>
      )}
    </div>
  );
}

export default CategoryLegend;
