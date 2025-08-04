// ペット関連施設の型定義

export interface FacilityCategory {
  id: string;
  name: string;
  name_ja: string;
  description?: string;
  is_free: boolean;
  monthly_fee: number;
  created_at: string;
  updated_at: string;
}

export interface PetFacility {
  id: string;
  name: string;
  description?: string;
  category: string; // category_idの値
  address: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  website?: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  created_at: string;
  category_name?: string; // JOINしたカテゴリーの日本語名
  // 画像関連フィールド（MapViewで使用）
  main_image_url?: string;
  image_url?: string;
  thumbnail_url?: string;
  images?: FacilityImage[];
}

export interface FacilityHour {
  id: string;
  facility_id: string;
  day_of_week: number; // 0=Sunday, 1=Monday, ..., 6=Saturday
  open_time?: string;
  close_time?: string;
  is_closed: boolean;
  created_at: string;
}

export interface FacilityImage {
  id: string;
  facility_id: string;
  image_url?: string; // 旧式（facility_imagesテーブル用、互換性のため残す）
  image_data?: string; // 新式（pet_facility_imagesテーブル用、base64データ）
  image_type?: string;
  display_order?: number;
  alt_text?: string;
  description?: string;
  created_at: string;
  updated_at?: string;
}

/**
 * 管理ダッシュボードで使う施設申請の型
 * PetFacility型を拡張し、所有者の情報を含む
 */
export type FacilityApplication = PetFacility & {
  owner_name: string;
  owner_email: string;
};

export interface FacilitySubscription {
  id: string;
  facility_id: string;
  stripe_subscription_id?: string;
  payment_method: 'credit_card' | 'bank_transfer';
  amount: number;
  status: 'active' | 'cancelled' | 'past_due';
  current_period_start?: string;
  current_period_end?: string;
  created_at: string;
  updated_at: string;
}

export interface FacilityInvoice {
  id: string;
  facility_id: string;
  subscription_id: string;
  invoice_number: string;
  amount: number;
  due_date: string;
  status: 'pending' | 'paid' | 'overdue';
  pdf_url?: string;
  sent_at?: string;
  paid_at?: string;
  created_at: string;
}

export interface FacilityReview {
  id: string;
  facility_id: string;
  user_id: string;
  dog_name: string;
  rating: number;
  comment?: string;
  visit_date: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
}

// 施設フィルター設定
export interface FacilityFilter {
  categories: string[];
  showDogParks: boolean;
  showPetFriendlyRestaurants: boolean;
  showPetFriendlyHotels: boolean;
  showPetShops: boolean;
  showPetSalons: boolean;
  showPetHotels: boolean;
  showVeterinaryClinics: boolean;
}

// 施設検索パラメータ
export interface FacilitySearchParams {
  location?: {
    lat: number;
    lng: number;
    radius?: number; // km
  };
  categories?: string[];
  status?: string;
  payment_status?: string;
}

// 施設登録フォーム
export interface FacilityRegistrationForm {
  name: string;
  category_id: string;
  address: string;
  phone?: string;
  website?: string;
  description?: string;
  payment_method: 'credit_card' | 'bank_transfer';
  hours: {
    [key: number]: {
      is_closed: boolean;
      open_time?: string;
      close_time?: string;
    };
  };
  images: File[];
}

// 地図表示用の統合型
export interface MapDisplayItem {
  id: string;
  type: 'dog_park' | 'pet_facility';
  name: string;
  latitude: number;
  longitude: number;
  category: string;
  category_ja: string;
  address: string;
  status: string;
  payment_status?: string;
  phone?: string;
  website?: string;
  description?: string;
  images?: string[];
  rating?: number;
  is_free?: boolean;
}

export const FACILITY_CATEGORIES = {
  DOG_PARK: 'dog_park',
  PET_FRIENDLY_RESTAURANT: 'pet_friendly_restaurant',
  PET_FRIENDLY_HOTEL: 'pet_friendly_hotel',
  PET_SHOP: 'pet_shop',
  PET_SALON: 'pet_salon',
  PET_HOTEL: 'pet_hotel',
  VETERINARY_CLINIC: 'veterinary_clinic',
} as const;

export const FACILITY_CATEGORY_LABELS = {
  [FACILITY_CATEGORIES.DOG_PARK]: 'ドッグラン',
  [FACILITY_CATEGORIES.PET_FRIENDLY_RESTAURANT]: 'ペット同伴可能店舗',
  [FACILITY_CATEGORIES.PET_FRIENDLY_HOTEL]: 'ペット同伴可能宿泊施設',
  [FACILITY_CATEGORIES.PET_SHOP]: 'ペットショップ',
  [FACILITY_CATEGORIES.PET_SALON]: 'ペットサロン',
  [FACILITY_CATEGORIES.PET_HOTEL]: 'ペットホテル',
  [FACILITY_CATEGORIES.VETERINARY_CLINIC]: '動物病院',
} as const;

export const FACILITY_ICONS = {
  [FACILITY_CATEGORIES.DOG_PARK]: '🐕',
  [FACILITY_CATEGORIES.PET_FRIENDLY_RESTAURANT]: '🍽️',
  [FACILITY_CATEGORIES.PET_FRIENDLY_HOTEL]: '🏨',
  [FACILITY_CATEGORIES.PET_SHOP]: '🛍️',
  [FACILITY_CATEGORIES.PET_SALON]: '✂️',
  [FACILITY_CATEGORIES.PET_HOTEL]: '🏠',
  [FACILITY_CATEGORIES.VETERINARY_CLINIC]: '🏥',
} as const;

export const PAYMENT_METHODS = {
  CREDIT_CARD: 'credit_card',
  BANK_TRANSFER: 'bank_transfer',
} as const;

export const PAYMENT_METHOD_LABELS = {
  [PAYMENT_METHODS.CREDIT_CARD]: 'クレジットカード',
  [PAYMENT_METHODS.BANK_TRANSFER]: '銀行振込',
} as const;

export const DAYS_OF_WEEK = [
  '日曜日',
  '月曜日',
  '火曜日',
  '水曜日',
  '木曜日',
  '金曜日',
  '土曜日',
] as const;