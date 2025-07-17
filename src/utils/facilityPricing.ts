// 施設掲載の料金設定とモード管理
// 管理者が有料/無料モードを切り替えできるようにする設定

export interface FacilityPricingConfig {
  // 基本設定
  isPaidMode: boolean; // 有料モードかどうか
  requiresIdentityVerification: boolean; // 本人確認が必要かどうか
  requiresPayment: boolean; // 支払いが必要かどうか
  
  // 料金設定
  monthlyFee: number; // 月額料金（円）
  currency: string; // 通貨
  
  // 支払い方法
  paymentMethods: {
    creditCard: boolean; // クレジットカード（サブスクリプション）
    bankTransfer: boolean; // 銀行振込
  };
  
  // 支払い期限とペナルティ
  paymentGracePeriodDays: number; // 支払い猶予期間（日）
  listingSuspensionOnNonPayment: boolean; // 未払い時の掲載停止
  
  // メッセージ
  freeMessage: string; // 無料期間のメッセージ
  paidMessage: string; // 有料期間のメッセージ
  
  // 更新情報
  lastUpdated: string;
  updatedBy: string; // 更新者のユーザーID
}

// デフォルト設定（現在の無料期間）
export const defaultPricingConfig: FacilityPricingConfig = {
  isPaidMode: false,
  requiresIdentityVerification: false,
  requiresPayment: false,
  
  monthlyFee: 2200, // 将来の予定料金
  currency: 'JPY',
  
  paymentMethods: {
    creditCard: true,
    bankTransfer: true
  },
  
  paymentGracePeriodDays: 7, // 7日間の猶予期間
  listingSuspensionOnNonPayment: true,
  
  freeMessage: '現在、すべてのペット関連施設が無料で掲載できます。',
  paidMessage: '月額2,200円（税込）でペット関連施設を掲載できます。',
  
  lastUpdated: new Date().toISOString(),
  updatedBy: 'system'
};

// 料金カテゴリ別の設定（将来的な拡張用）
export interface FacilityCategoryPricing {
  categoryId: string;
  categoryName: string;
  monthlyFee: number;
  isActive: boolean;
}

export const defaultCategoryPricing: FacilityCategoryPricing[] = [
  { categoryId: 'pet_hotel', categoryName: 'ペットホテル', monthlyFee: 2200, isActive: true },
  { categoryId: 'pet_salon', categoryName: 'ペットサロン', monthlyFee: 2200, isActive: true },
  { categoryId: 'veterinary', categoryName: '動物病院', monthlyFee: 2200, isActive: true },
  { categoryId: 'pet_cafe', categoryName: 'ペットカフェ', monthlyFee: 2200, isActive: true },
  { categoryId: 'pet_restaurant', categoryName: 'ペット同伴レストラン', monthlyFee: 2200, isActive: true },
  { categoryId: 'pet_shop', categoryName: 'ペットショップ', monthlyFee: 2200, isActive: true },
  { categoryId: 'pet_accommodation', categoryName: 'ペット同伴宿泊', monthlyFee: 2200, isActive: true }
];

// 設定を取得する関数（Supabaseから読み込み）
export const getFacilityPricingConfig = async (): Promise<FacilityPricingConfig> => {
  try {
    // TODO: Supabaseのsettingsテーブルから設定を取得
    // 現在は仮実装でdefaultPricingConfigを返す
    return defaultPricingConfig;
  } catch (error) {
    console.error('Failed to fetch pricing config:', error);
    return defaultPricingConfig;
  }
};

// 設定を更新する関数（管理者専用）
export const updateFacilityPricingConfig = async (
  config: Partial<FacilityPricingConfig>,
  adminUserId: string
): Promise<boolean> => {
  try {
    // TODO: Supabaseのsettingsテーブルに設定を保存
    // TODO: 管理者権限チェック
    console.warn('Updating pricing config for admin:', adminUserId);
    return true;
  } catch (error) {
    console.error('Failed to update pricing config:', error);
    return false;
  }
};

// 有料モードに切り替える関数
export const enablePaidMode = async (adminUserId: string): Promise<boolean> => {
  const config: Partial<FacilityPricingConfig> = {
    isPaidMode: true,
    requiresIdentityVerification: true,
    requiresPayment: true,
    lastUpdated: new Date().toISOString(),
    updatedBy: adminUserId
  };
  
  return await updateFacilityPricingConfig(config, adminUserId);
};

// 無料モードに切り替える関数
export const enableFreeMode = async (adminUserId: string): Promise<boolean> => {
  const config: Partial<FacilityPricingConfig> = {
    isPaidMode: false,
    requiresIdentityVerification: false,
    requiresPayment: false,
    lastUpdated: new Date().toISOString(),
    updatedBy: adminUserId
  };
  
  return await updateFacilityPricingConfig(config, adminUserId);
};
