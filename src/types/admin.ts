// 管理者画面関連の型定義

export interface PendingPark {
  id: string;
  name: string;
  address: string;
  status: string;
  created_at: string;
  owner_name: string;
  owner_id: string;
  second_stage_submitted_at: string | null;
  total_images: number;
  pending_images: number;
  approved_images: number;
  rejected_images: number;
  // 申請者の詳細情報
  owner_postal_code?: string;
  owner_address?: string;
  owner_phone_number?: string;
  owner_email?: string;
  // 本人確認書類情報
  identity_document_url?: string;
  identity_document_filename?: string;
  identity_status?: string;
  identity_created_at?: string;
  // 追加のパークデータ
  description?: string;
  price?: number;
  max_capacity?: number;
  large_dog_area?: boolean;
  small_dog_area?: boolean;
  private_booths?: boolean;
  private_booth_count?: number;
  facilities?: {
    parking: boolean;
    shower: boolean;
    restroom: boolean;
    agility: boolean;
    rest_area: boolean;
    water_station: boolean;
  };
  facility_details?: string;
  image_url?: string;
  cover_image_url?: string;
  average_rating?: number;
  review_count?: number;
  // 設備画像の詳細データ
  facility_images?: FacilityImage[];
}

export interface PendingVaccine {
  id: string;
  dog_id: string;
  rabies_vaccine_image: string | null;
  combo_vaccine_image: string | null;
  status: string;
  rabies_expiry_date: string | null;
  combo_expiry_date: string | null;
  created_at: string;
  temp_storage?: boolean;
  dog: {
    id: string;
    name: string;
    breed: string;
    gender: string;
    birth_date: string;
    owner: {
      id: string;
      name: string;
    }
  }
}

export interface FacilityImage {
  id: string;
  park_id: string;
  image_type: string;
  image_url: string;
  is_approved: boolean | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApprovalStatus {
  icon: React.ComponentType;
  color: string;
  label: string;
}

export interface AdminState {
  activeTab: 'parks' | 'vaccines';
  pendingParks: PendingPark[];
  pendingVaccines: PendingVaccine[];
  isLoading: boolean;
  error: string;
  success: string;
  selectedPark: PendingPark | null;
  selectedVaccine: PendingVaccine | null;
  parkImages: FacilityImage[];
  selectedImage: FacilityImage | null;
  imageReviewMode: boolean;
  rejectionNote: string;
  isProcessing: boolean;
  allImagesApproved: boolean;
} 