export interface Profile {
  id: string;
  user_type: 'user' | 'owner' | 'admin';
  name: string;
  nickname?: string;
  postal_code?: string;
  address?: string;
  phone_number?: string;
  created_at: string;
}

export interface Dog {
  id: string;
  owner_id: string;
  name: string;
  breed: string;
  birth_date: string;
  gender: 'オス' | 'メス';
  microchip_number?: string; // マイクロチップNO追加
  image_url?: string;
  created_at: string;
  owner?: Profile;
  vaccine_certifications?: VaccineCertification[];
}

export interface DogPark {
  id: string;
  name: string;
  description?: string;
  address: string;
  latitude: number;
  longitude: number;
  price: number;
  current_occupancy: number;
  max_capacity: number;
  status: 'pending' | 'approved' | 'rejected';
  facilities?: string;
  image_url?: string;
  average_rating: number;
  review_count: number;
  created_at: string;
  currentMaintenance?: {
    id: string;
    title: string;
    description?: string;
    start_date: string;
    end_date: string;
    is_emergency: boolean;
  };
}

export interface DogParkImage {
  id: string;
  park_id: string;
  image_url: string;
  caption?: string;
  display_order: number;
  created_at: string;
}

export interface Reservation {
  id: string;
  park_id: string;
  user_id: string;
  dog_id: string;
  date: string;
  start_time: string;
  duration: number;
  status: 'confirmed' | 'cancelled';
  total_amount: number;
  access_code: string;
  reservation_type?: 'regular' | 'private_booth' | 'whole_facility';
  created_at: string;
  dog_park?: DogPark;
  dog?: Dog;
}

export interface QRShare {
  id: string;
  reservation_id: string;
  shared_by_user_id: string;
  shared_to_user_id: string;
  status: 'active' | 'expired' | 'revoked';
  created_at: string;
  expires_at: string;
  shared_by?: Profile;
  shared_to?: Profile;
  reservation?: Reservation;
}

export interface VaccineCertification {
  id: string;
  dog_id: string;
  rabies_vaccine_image: string | null;
  combo_vaccine_image: string | null;
  status: 'pending' | 'approved' | 'rejected';
  approved_at: string | null;
  created_at: string;
  rabies_expiry_date?: string | null;
  combo_expiry_date?: string | null;
  last_checked_at?: string | null;
  expiry_notification_sent?: boolean;
  temp_storage?: boolean;
}

export interface DogEncounter {
  id: string;
  dog1_id: string;
  dog2_id: string;
  park_id: string;
  encounter_date: string;
  created_at: string;
  dog1: Dog;
  dog2: Dog;
  park: DogPark;
}

export interface FriendRequest {
  id: string;
  requester_id: string;
  requested_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  message?: string;
  created_at: string;
  responded_at?: string;
  requester: Profile;
  requested: Profile;
  requester_dogs?: Dog[];
}

export interface Friendship {
  id: string;
  user1_id?: string;
  user2_id?: string;
  created_at: string;
  user1?: Profile;
  user2?: Profile;
  friend: Profile;
  friend_id?: string;
  dog_count?: number;
  friend_dogs?: {
    id: string;
    name: string;
    breed: string;
    gender?: string;
    image_url?: string;
  }[];
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read: boolean;
  created_at: string;
  sender?: Profile;
  receiver?: Profile;
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'friend_request' | 'friend_accepted' | 'friend_at_park' | 'reservation_reminder' | 'order_confirmed' | 'order_shipped' | 'order_delivered' | 'qr_shared' | 'qr_revoked' | 'vaccine_expiry_warning' | 'vaccine_expired' | 'vaccine_reapproval_required' | 'blacklisted_dog_nearby' | 'new_message' | 'order_cancelled';
  title: string;
  message: string;
  data: Record<string, unknown>;
  read: boolean;
  created_at: string;
}

export interface BlacklistedDog {
  id: string;
  user_id: string;
  dog_id: string;
  reason: string;
  created_at: string;
  notify_when_nearby: boolean;
  blacklisted_dog?: Dog;
}

// ペットショップ関連の型定義
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: 'food' | 'treats' | 'toys' | 'accessories' | 'health' | 'sheets';
  image_url: string;
  stock_quantity: number;
  is_active: boolean;
  weight?: number; // グラム単位
  size?: string; // S, M, L, XL など
  brand?: string;
  ingredients?: string;
  age_group?: 'puppy' | 'adult' | 'senior' | 'all';
  dog_size?: 'small' | 'medium' | 'large' | 'all';
  sku?: string; // Stock Keeping Unit
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  created_at: string;
  product: Product;
}

export interface Order {
  id: string;
  user_id: string;
  order_number: string;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  total_amount: number;
  discount_amount: number;
  shipping_fee: number;
  final_amount: number;
  shipping_address: string;
  shipping_postal_code: string;
  shipping_phone: string;
  shipping_name: string;
  payment_method: 'credit_card' | 'bank_transfer' | 'cod';
  payment_status: 'pending' | 'completed' | 'failed' | 'cancelled';
  notes?: string;
  estimated_delivery_date?: string;
  tracking_number?: string;
  shipping_carrier?: string;
  created_at: string;
  updated_at: string;
  cancellable_until?: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  product: Product;
}

export interface PaymentCard {
  id: string;
  user_id: string;
  card_number_masked: string; // 下4桁のみ表示用
  card_holder_name: string;
  expiry_month: number;
  expiry_year: number;
  card_brand: 'visa' | 'mastercard' | 'jcb' | 'amex';
  is_default: boolean;
  created_at: string;
}

// 入場QRシステム関連の型定義
export interface EntranceQRCode {
  id: string;
  user_id: string;
  dog_id: string;
  access_code: string;
  payment_type: 'single' | 'subscription';
  amount_charged: number;
  valid_until: string;
  status: 'active' | 'used' | 'expired';
  used_at?: string;
  park_id?: string;
  created_at: string;
}

// レビューシステム関連の型定義
export interface DogParkReview {
  id: string;
  park_id: string;
  user_id: string;
  dog_id: string;
  rating: number; // 1-5 stars
  review_text?: string;
  visit_date: string;
  created_at: string;
  updated_at: string;
  user_name: string;
  dog_name: string;
  dog_image_url?: string;
  dog_breed: string;
  main_image_url?: string;
  review_images?: ReviewImage[];
  image_count?: number;
}

export interface ReviewImage {
  url: string;
  caption?: string;
}

export interface UserParkReview {
  id: string;
  rating: number;
  review_text?: string;
  visit_date: string;
  dog_id: string;
  dog_name: string;
  created_at: string;
  updated_at: string;
}

// スマートロック関連の型定義
export interface SmartLock {
  id: string;
  park_id: string;
  lock_id: string;
  lock_name: string;
  lock_type?: string;
  location?: string;
  status: 'active' | 'inactive' | 'maintenance';
  last_online_at?: string;
  created_at: string;
  updated_at: string;
  pin_enabled?: boolean;
  sciener_lock_id?: string;
}

export interface SmartLockPin {
  id: string;
  lock_id: string;
  user_id: string;
  pin_code: string;
  pin_hash: string;
  purpose: 'entry' | 'exit';
  created_at: string;
  expires_at: string;
  used_at?: string;
  is_used: boolean;
}

export interface UserEntryStatus {
  id: string;
  user_id: string;
  park_id: string;
  entry_time: string;
  exit_time?: string;
  dog_ids: string[];
  is_inside?: boolean;
}

export interface UserEntryExitLog {
  id: string;
  user_id: string;
  park_id: string;
  dog_ids: string[];
  action: 'entry' | 'exit';
  timestamp: string;
  pin_code?: string;
  lock_id?: string;
}

// 新着情報関連の型定義
export interface NewsAnnouncement {
  id: string;
  title: string;
  content: string;
  category: 'news' | 'announcement' | 'sale';
  is_important?: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
  image_url?: string;
  link_url?: string;
  park_id?: string;
}

export interface NewParkOpening {
  id: string;
  name: string;
  address: string;
  image_url: string;
  opening_date: string;
  created_at: string;
  updated_at: string;
  park_id?: string;
}

// PINコード管理システム関連の型定義をエクスポート
export * from './pinCode';
