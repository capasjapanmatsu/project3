// クーポンシステム用の型定義

export interface FacilityCoupon {
  id: string;
  facility_id: string;
  title: string;
  description: string;
  service_content: string;
  coupon_image_url?: string;
  discount_value?: number;
  discount_type: 'amount' | 'percentage' | 'free_gift';
  start_date: string;
  end_date: string;
  usage_limit_type: 'once' | 'unlimited';
  max_uses?: number;
  current_uses: number;
  is_active: boolean;
  original_id?: string;  // バージョン管理用
  version?: number;      // バージョン番号
  is_superseded?: boolean; // 古いバージョンかどうか
  superseded_by?: string;  // 新しいバージョンのID
  created_at: string;
  updated_at: string;
}

export interface UserCoupon {
  id: string;
  user_id: string;
  coupon_id: string;
  obtained_at: string;
  used_at?: string;
  is_used: boolean;
  qr_code_token: string;
  coupon?: FacilityCoupon; // JOIN時の情報
}

export interface CouponStats {
  total_obtained: number;
  total_used: number;
  usage_rate: number;
}

export interface CouponFormData {
  title: string;
  description: string;
  service_content: string;
  coupon_image?: File;
  discount_value?: number;
  discount_type: 'amount' | 'percentage' | 'free_gift';
  start_date: string;
  end_date: string;
  usage_limit_type: 'once' | 'unlimited';
}

export interface ObtainCouponResponse {
  success: boolean;
  error?: string;
  message?: string;
  qr_token?: string;
}

export interface UseCouponResponse {
  success: boolean;
  error?: string;
  message?: string;
  coupon_title?: string;
  service_content?: string;
} 