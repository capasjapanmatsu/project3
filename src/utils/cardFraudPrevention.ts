import { supabase } from './supabase';

interface CardInfo {
  fingerprint: string;
  last4: string;
  brand: string;
  country: string;
  customerId: string;
}

/**
 * Stripeカード情報を記録・チェック
 */
export async function checkAndRecordCardInfo(
  userId: string,
  cardInfo: CardInfo
): Promise<{
  canUseTrial: boolean;
  isFirstTimeCard: boolean;
  previousUsage: any[];
  riskScore: number;
}> {
  try {
    // 既存のカード情報をチェック
    const { data: existingCards, error: checkError } = await supabase
      .from('stripe_card_fingerprints')
      .select('*')
      .eq('card_fingerprint', cardInfo.fingerprint);

    if (checkError) {
      console.error('Error checking card fingerprints:', checkError);
      return {
        canUseTrial: true, // エラー時は許可
        isFirstTimeCard: true,
        previousUsage: [],
        riskScore: 0
      };
    }

    const isFirstTimeCard = !existingCards || existingCards.length === 0;
    const hasUsedTrial = existingCards?.some(card => card.trial_used) || false;
    
    // リスクスコア計算
    let riskScore = 0;
    if (!isFirstTimeCard) riskScore += 40;
    if (hasUsedTrial) riskScore += 50;

    // カード情報を記録または更新
    if (isFirstTimeCard) {
      // 新しいカード情報を記録
      const { error: insertError } = await supabase
        .from('stripe_card_fingerprints')
        .insert({
          user_id: userId,
          stripe_customer_id: cardInfo.customerId,
          card_fingerprint: cardInfo.fingerprint,
          card_last4: cardInfo.last4,
          card_brand: cardInfo.brand,
          card_country: cardInfo.country,
          trial_used: true, // トライアル使用をマーク
          trial_used_at: new Date().toISOString()
        });

      if (insertError) {
        console.error('Error inserting card fingerprint:', insertError);
      }
    } else {
      // 既存カード情報を更新
      const { error: updateError } = await supabase
        .from('stripe_card_fingerprints')
        .update({
          trial_used: true,
          trial_used_at: new Date().toISOString()
        })
        .eq('card_fingerprint', cardInfo.fingerprint);

      if (updateError) {
        console.error('Error updating card fingerprint:', updateError);
      }
    }

    return {
      canUseTrial: isFirstTimeCard && !hasUsedTrial,
      isFirstTimeCard,
      previousUsage: existingCards || [],
      riskScore
    };

  } catch (error) {
    console.error('Error in checkAndRecordCardInfo:', error);
    return {
      canUseTrial: true, // エラー時は許可
      isFirstTimeCard: true,
      previousUsage: [],
      riskScore: 0
    };
  }
}

/**
 * カード情報から不正を検知
 */
export async function detectCardFraud(cardFingerprint: string): Promise<{
  isFraudulent: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  details: {
    usageCount: number;
    userCount: number;
    trialUsageCount: number;
    lastUsed: string | null;
  };
}> {
  try {
    const { data: cardUsage, error } = await supabase
      .from('stripe_card_fingerprints')
      .select('user_id, trial_used, trial_used_at, created_at')
      .eq('card_fingerprint', cardFingerprint)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error detecting card fraud:', error);
      return {
        isFraudulent: false,
        riskLevel: 'low',
        details: { usageCount: 0, userCount: 0, trialUsageCount: 0, lastUsed: null }
      };
    }

    const usageCount = cardUsage?.length || 0;
    const uniqueUsers = new Set(cardUsage?.map(record => record.user_id) || []);
    const userCount = uniqueUsers.size;
    const trialUsageCount = cardUsage?.filter(record => record.trial_used).length || 0;
    const lastUsed = cardUsage?.[0]?.trial_used_at || cardUsage?.[0]?.created_at || null;

    // リスクレベル判定
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    let isFraudulent = false;

    if (userCount > 1) {
      riskLevel = 'medium';
      if (userCount > 3 || trialUsageCount > 2) {
        riskLevel = 'high';
        isFraudulent = true;
      }
    }

    return {
      isFraudulent,
      riskLevel,
      details: {
        usageCount,
        userCount,
        trialUsageCount,
        lastUsed
      }
    };

  } catch (error) {
    console.error('Error in detectCardFraud:', error);
    return {
      isFraudulent: false,
      riskLevel: 'low',
      details: { usageCount: 0, userCount: 0, trialUsageCount: 0, lastUsed: null }
    };
  }
}

/**
 * 不正検知ログを記録
 */
export async function logFraudDetection(
  userId: string,
  detectionType: 'duplicate_device' | 'duplicate_ip' | 'duplicate_card' | 'suspicious_pattern',
  riskScore: number,
  details: Record<string, any>,
  actionTaken: 'none' | 'warning' | 'restriction' | 'ban' = 'none'
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('fraud_detection_logs')
      .insert({
        user_id: userId,
        detection_type: detectionType,
        risk_score: riskScore,
        details: details,
        action_taken: actionTaken
      });

    if (error) {
      console.error('Error logging fraud detection:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in logFraudDetection:', error);
    return false;
  }
} 