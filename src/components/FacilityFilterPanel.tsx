import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Filter, MapPin, Store, Hotel, ShoppingBag, Scissors, Home, Plus } from 'lucide-react';
import { FACILITY_CATEGORIES, FACILITY_CATEGORY_LABELS, FACILITY_ICONS, FacilityFilter } from '../types/facilities';

interface FacilityFilterPanelProps {
  filters: FacilityFilter;
  onFiltersChange: (filters: FacilityFilter) => void;
  facilityCount: {
    dogParks: number;
    petFriendlyRestaurants: number;
    petFriendlyHotels: number;
    petShops: number;
    petSalons: number;
    petHotels: number;
    veterinaryClinics: number;
  };
}

const FacilityFilterPanel: React.FC<FacilityFilterPanelProps> = ({
  filters,
  onFiltersChange,
  facilityCount,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleCategoryToggle = (category: keyof Omit<FacilityFilter, 'categories'>) => {
    const newFilters = { ...filters, [category]: !filters[category] };
    
    // カテゴリ配列も更新
    const categories = [];
    if (newFilters.showDogParks) categories.push(FACILITY_CATEGORIES.DOG_PARK);
    if (newFilters.showPetFriendlyRestaurants) categories.push(FACILITY_CATEGORIES.PET_FRIENDLY_RESTAURANT);
    if (newFilters.showPetFriendlyHotels) categories.push(FACILITY_CATEGORIES.PET_FRIENDLY_HOTEL);
    if (newFilters.showPetShops) categories.push(FACILITY_CATEGORIES.PET_SHOP);
    if (newFilters.showPetSalons) categories.push(FACILITY_CATEGORIES.PET_SALON);
    if (newFilters.showPetHotels) categories.push(FACILITY_CATEGORIES.PET_HOTEL);
    if (newFilters.showVeterinaryClinics) categories.push(FACILITY_CATEGORIES.VETERINARY_CLINIC);
    
    newFilters.categories = categories;
    onFiltersChange(newFilters);
  };

  const getActiveFilterCount = () => {
    return Object.values(filters).filter(value => typeof value === 'boolean' && value).length;
  };

  const filterOptions = [
    {
      key: 'showDogParks' as const,
      label: FACILITY_CATEGORY_LABELS[FACILITY_CATEGORIES.DOG_PARK],
      icon: <MapPin className="w-4 h-4" />,
      count: facilityCount.dogParks,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
    },
    {
      key: 'showPetFriendlyRestaurants' as const,
      label: FACILITY_CATEGORY_LABELS[FACILITY_CATEGORIES.PET_FRIENDLY_RESTAURANT],
      icon: <Store className="w-4 h-4" />,
      count: facilityCount.petFriendlyRestaurants,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
    },
    {
      key: 'showPetFriendlyHotels' as const,
      label: FACILITY_CATEGORY_LABELS[FACILITY_CATEGORIES.PET_FRIENDLY_HOTEL],
      icon: <Hotel className="w-4 h-4" />,
      count: facilityCount.petFriendlyHotels,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
    },
    {
      key: 'showPetShops' as const,
      label: FACILITY_CATEGORY_LABELS[FACILITY_CATEGORIES.PET_SHOP],
      icon: <ShoppingBag className="w-4 h-4" />,
      count: facilityCount.petShops,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
    },
    {
      key: 'showPetSalons' as const,
      label: FACILITY_CATEGORY_LABELS[FACILITY_CATEGORIES.PET_SALON],
      icon: <Scissors className="w-4 h-4" />,
      count: facilityCount.petSalons,
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
      borderColor: 'border-pink-200',
    },
    {
      key: 'showPetHotels' as const,
      label: FACILITY_CATEGORY_LABELS[FACILITY_CATEGORIES.PET_HOTEL],
      icon: <Home className="w-4 h-4" />,
      count: facilityCount.petHotels,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-200',
    },
    {
      key: 'showVeterinaryClinics' as const,
      label: FACILITY_CATEGORY_LABELS[FACILITY_CATEGORIES.VETERINARY_CLINIC],
      icon: <Plus className="w-4 h-4" />,
      count: facilityCount.veterinaryClinics,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-800">施設フィルター</h3>
          {getActiveFilterCount() > 0 && (
            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
              {getActiveFilterCount()}個選択中
            </span>
          )}
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
        >
          {isExpanded ? (
            <>
              <span className="mr-1">閉じる</span>
              <ChevronUp className="w-4 h-4" />
            </>
          ) : (
            <>
              <span className="mr-1">詳細</span>
              <ChevronDown className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      {/* 常に表示される主要フィルター */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        <button
          onClick={() => handleCategoryToggle('showDogParks')}
          className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
            filters.showDogParks
              ? 'border-blue-500 bg-blue-50 text-blue-700'
              : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center space-x-2">
            <MapPin className="w-4 h-4" />
            <span className="text-sm font-medium">ドッグラン</span>
          </div>
          <span className="text-xs bg-white px-2 py-1 rounded-full">
            {facilityCount.dogParks}
          </span>
        </button>

        <button
          onClick={() => handleCategoryToggle('showVeterinaryClinics')}
          className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
            filters.showVeterinaryClinics
              ? 'border-red-500 bg-red-50 text-red-700'
              : 'border-gray-200 hover:border-red-300 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">動物病院</span>
          </div>
          <span className="text-xs bg-white px-2 py-1 rounded-full">
            {facilityCount.veterinaryClinics}
          </span>
        </button>
      </div>

      {/* 展開時に表示される追加フィルター */}
      {isExpanded && (
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">ペット関連施設</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {filterOptions.slice(1, -1).map((option) => (
              <button
                key={option.key}
                onClick={() => handleCategoryToggle(option.key)}
                className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                  filters[option.key]
                    ? `border-gray-400 ${option.bgColor} ${option.color}`
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center space-x-2">
                  {option.icon}
                  <span className="text-sm font-medium">{option.label}</span>
                </div>
                <span className="text-xs bg-white px-2 py-1 rounded-full">
                  {option.count}
                </span>
              </button>
            ))}
          </div>
          
          <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <p className="text-sm text-yellow-800">
              <strong>💡 掲載について:</strong> 動物病院以外の施設は有料掲載となります（月額2,200円）。
              <br />
              施設オーナーの方は掲載申し込みページから登録できます。
            </p>
          </div>
        </div>
      )}

      {/* 掲載申し込みへのリンク */}
      <div className="mt-4 pt-4 border-t">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">
            施設を運営されている方へ
          </span>
          <a
            href="/facility-registration"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            掲載申し込み
          </a>
        </div>
      </div>
    </div>
  );
};

export default FacilityFilterPanel; 
