/**
 * 決済状況確認とアクセス権チェックのユーティリティ
 */

import { supabase } from './supabase';

interface StripeSubscription {
  user_id: string;
  status: string;
  [key: string]: unknown;
}

interface EntranceQRCode {
  user_id: string;
  dog_id: string;
  status: string;
  valid_until: string;
  payment_type: string;
  [key: string]: unknown;
}

export interface PaymentStatus {
  hasSubscription: boolean;
  hasDayPass: boolean;
  validUntil?: string;
  needsPayment: boolean;
  paymentType?: 'subscription' | 'day_pass' | 'admin_grant';
}

export interface AccessCheckResult {
  hasAccess: boolean;
  paymentStatus: PaymentStatus;
  reason?: string;
  dogIds?: string[];
}

/**
 * ユーザーの決済状況を確認
 */
export const checkPaymentStatus = async (userId: string): Promise<PaymentStatus> => {
  try {
    // サブスクリプション状況確認
    const { data: subscriptionData, error: subscriptionError } = await supabase
      .from('stripe_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (subscriptionError && subscriptionError.code !== 'PGRST116') {
      console.warn('Subscription check error:', subscriptionError);
    }

    const hasSubscription = !!subscriptionData;

    if (hasSubscription) {
      return {
        hasSubscription: true,
        hasDayPass: false,
        needsPayment: false,
        paymentType: 'subscription'
      };
    }

    // ワンデイパス（entrance_qr_codes）確認
    const { data: dayPassData, error: dayPassError } = await supabase
      .from('entrance_qr_codes')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .gt('valid_until', new Date().toISOString())
      .maybeSingle();

    if (dayPassError) {
      console.warn('Day pass check error:', dayPassError);
    }

    const hasDayPass = !!dayPassData;
    const typedDayPassData = dayPassData as EntranceQRCode | null;

    if (hasDayPass && typedDayPassData) {
      return {
        hasSubscription: false,
        hasDayPass: true,
        validUntil: typedDayPassData.valid_until,
        needsPayment: false,
        paymentType: typedDayPassData.payment_type === 'admin_grant' ? 'admin_grant' : 'day_pass'
      };
    }

    // 決済が必要
    return {
      hasSubscription: false,
      hasDayPass: false,
      needsPayment: true
    };

  } catch (error) {
    console.error('Error checking payment status:', error);
    return {
      hasSubscription: false,
      hasDayPass: false,
      needsPayment: true
    };
  }
};

/**
 * 特定のドッグランへのアクセス権を確認
 */
export const checkParkAccess = async (
  userId: string,
  parkId: string,
  dogIds: string[]
): Promise<AccessCheckResult> => {
  try {
    const paymentStatus = await checkPaymentStatus(userId);

    // サブスクリプション会員は全施設利用可能
    if (paymentStatus.hasSubscription) {
      return {
        hasAccess: true,
        paymentStatus,
        dogIds
      };
    }

    // ワンデイパス確認（管理者権限含む）
    if (paymentStatus.hasDayPass) {
      // 管理者権限の場合は全施設利用可能
      if (paymentStatus.paymentType === 'admin_grant') {
        return {
          hasAccess: true,
          paymentStatus,
          dogIds
        };
      }

      // 通常のワンデイパスの場合、対象の犬がアクセス権を持っているか確認
      const { data: accessData, error: accessError } = await supabase
        .from('entrance_qr_codes')
        .select('dog_id')
        .eq('user_id', userId)
        .eq('status', 'active')
        .gt('valid_until', new Date().toISOString())
        .in('dog_id', dogIds);

      if (accessError) {
        console.warn('Access check error:', accessError);
        return {
          hasAccess: false,
          paymentStatus,
          reason: 'アクセス権の確認中にエラーが発生しました'
        };
      }

      const authorizedDogIds = (accessData as Array<{ dog_id: string }>)?.map(item => item.dog_id) || [];
      const hasAccessForAllDogs = dogIds.every(dogId => authorizedDogIds.includes(dogId));

      if (hasAccessForAllDogs) {
        return {
          hasAccess: true,
          paymentStatus,
          dogIds: authorizedDogIds
        };
      } else {
        return {
          hasAccess: false,
          paymentStatus,
          reason: '選択した犬の一部にアクセス権がありません'
        };
      }
    }

    // 決済が必要
    return {
      hasAccess: false,
      paymentStatus,
      reason: '利用にはサブスクリプションまたはワンデイパスの購入が必要です'
    };

  } catch (error) {
    console.error('Error checking park access:', error);
    return {
      hasAccess: false,
      paymentStatus: {
        hasSubscription: false,
        hasDayPass: false,
        needsPayment: true
      },
      reason: 'アクセス権の確認中にエラーが発生しました'
    };
  }
};

/**
 * 決済ページへのリダイレクトURL生成
 */
export const generatePaymentUrl = (
  dogIds: string[],
  parkId: string,
  paymentType: 'subscription' | 'day_pass' = 'day_pass'
): string => {
  const baseUrl = window.location.origin;
  
  if (paymentType === 'subscription') {
    return `${baseUrl}/subscription?return_to=${encodeURIComponent('/access-control')}`;
  } else {
    // ワンデイパス購入の場合、対象のドッグランを指定
    const params = new URLSearchParams({
      park_id: parkId,
      dog_ids: dogIds.join(','),
      return_to: '/access-control'
    });
    return `${baseUrl}/parks/${parkId}/reserve?${params.toString()}`;
  }
};

/**
 * 決済完了後のアクセス権確認
 */
export const verifyPaymentCompletion = async (
  userId: string,
  dogIds: string[]
): Promise<boolean> => {
  try {
    const paymentStatus = await checkPaymentStatus(userId);
    
    if (paymentStatus.hasSubscription || paymentStatus.hasDayPass) {
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error verifying payment completion:', error);
    return false;
  }
}; 