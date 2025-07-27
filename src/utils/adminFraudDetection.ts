import { supabase } from './supabase';

export interface FraudDetectionResult {
  userId: string;
  userName: string;
  email: string;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  detectionTypes: string[];
  deviceDuplicates: number;
  ipDuplicates: number;
  cardDuplicates: number;
  lastDetection: string;
  trialAbuse: boolean;
  createdAt: string;
}

export interface UserFraudDetails {
  userId: string;
  deviceFingerprints: Array<{
    fingerprint: string;
    ipAddress: string;
    userAgent: string;
    actionType: string;
    createdAt: string;
  }>;
  fraudLogs: Array<{
    detectionType: string;
    riskScore: number;
    details: any;
    actionTaken: string;
    createdAt: string;
  }>;
  cardUsage: Array<{
    cardFingerprint: string;
    trialUsed: boolean;
    trialUsedAt: string | null;
    createdAt: string;
  }>;
  duplicateDeviceUsers: string[];
  duplicateIpUsers: string[];
}

/**
 * 高リスクユーザーを取得（管理者ダッシュボード用）
 */
export async function getHighRiskUsers(): Promise<FraudDetectionResult[]> {
  try {
    // 不正検知ログから高リスクユーザーを取得
    const { data: fraudLogs, error: fraudError } = await supabase
      .from('fraud_detection_logs')
      .select(`
        user_id,
        detection_type,
        risk_score,
        details,
        action_taken,
        created_at
      `)
      .gte('risk_score', 50) // リスクスコア50以上
      .order('created_at', { ascending: false });

    if (fraudError) throw fraudError;

    if (!fraudLogs || fraudLogs.length === 0) {
      return [];
    }

    // ユーザーごとにグループ化
    const userFraudMap = new Map<string, any[]>();
    fraudLogs.forEach(log => {
      if (!userFraudMap.has(log.user_id)) {
        userFraudMap.set(log.user_id, []);
      }
      userFraudMap.get(log.user_id)!.push(log);
    });

    const userIds = Array.from(userFraudMap.keys());

    // ユーザー情報を取得
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, name, created_at')
      .in('id', userIds);

    if (profileError) throw profileError;

    // 認証ユーザー情報を取得
    const { data: authUsers, error: authError } = await supabase
      .from('auth.users')
      .select('id, email, created_at')
      .in('id', userIds);

    if (authError) {
      console.warn('Auth users fetch failed:', authError);
    }

    // 結果をマップ
    const results: FraudDetectionResult[] = [];
    
    for (const userId of userIds) {
      const userLogs = userFraudMap.get(userId) || [];
      const profile = profiles?.find(p => p.id === userId);
      const authUser = authUsers?.find(u => u.id === userId);
      
      const maxRiskScore = Math.max(...userLogs.map(log => log.risk_score));
      const detectionTypes = [...new Set(userLogs.map(log => log.detection_type))];
      const lastDetection = userLogs[0]?.created_at;
      
      // デバイス・IP・カード重複数を計算
      const deviceDuplicates = userLogs.filter(log => log.detection_type === 'duplicate_device').length;
      const ipDuplicates = userLogs.filter(log => log.detection_type === 'duplicate_ip').length;
      const cardDuplicates = userLogs.filter(log => log.detection_type === 'duplicate_card').length;
      
      // トライアル悪用チェック
      const trialAbuse = userLogs.some(log => 
        log.details && (log.details.trialAbuse || log.details.multipleTrials)
      );
      
      let riskLevel: 'low' | 'medium' | 'high' = 'low';
      if (maxRiskScore >= 70) riskLevel = 'high';
      else if (maxRiskScore >= 50) riskLevel = 'medium';

      results.push({
        userId,
        userName: profile?.name || 'Unknown',
        email: authUser?.email || 'Unknown',
        riskScore: maxRiskScore,
        riskLevel,
        detectionTypes,
        deviceDuplicates,
        ipDuplicates,
        cardDuplicates,
        lastDetection,
        trialAbuse,
        createdAt: profile?.created_at || authUser?.created_at || ''
      });
    }

    return results.sort((a, b) => b.riskScore - a.riskScore);

  } catch (error) {
    console.error('Error fetching high risk users:', error);
    return [];
  }
}

/**
 * 特定ユーザーの詳細な不正検知情報を取得
 */
export async function getUserFraudDetails(userId: string): Promise<UserFraudDetails | null> {
  try {
    // デバイスフィンガープリント情報
    const { data: deviceData, error: deviceError } = await supabase
      .from('user_device_fingerprints')
      .select('fingerprint, ip_address, user_agent, action_type, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (deviceError) throw deviceError;

    // 不正検知ログ
    const { data: fraudLogs, error: fraudError } = await supabase
      .from('fraud_detection_logs')
      .select('detection_type, risk_score, details, action_taken, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (fraudError) throw fraudError;

    // カード使用履歴
    const { data: cardData, error: cardError } = await supabase
      .from('stripe_card_fingerprints')
      .select('card_fingerprint, trial_used, trial_used_at, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (cardError) throw cardError;

    // 同一デバイス使用者を取得
    const deviceFingerprints = deviceData?.map(d => d.fingerprint) || [];
    let duplicateDeviceUsers: string[] = [];
    
    if (deviceFingerprints.length > 0) {
      const { data: duplicateDeviceData, error: duplicateDeviceError } = await supabase
        .from('user_device_fingerprints')
        .select('user_id')
        .in('fingerprint', deviceFingerprints)
        .neq('user_id', userId);

      if (!duplicateDeviceError && duplicateDeviceData) {
        duplicateDeviceUsers = [...new Set(duplicateDeviceData.map(d => d.user_id))];
      }
    }

    // 同一IP使用者を取得
    const ipAddresses = [...new Set(deviceData?.map(d => d.ip_address).filter(Boolean) || [])];
    let duplicateIpUsers: string[] = [];
    
    if (ipAddresses.length > 0) {
      const { data: duplicateIpData, error: duplicateIpError } = await supabase
        .from('user_device_fingerprints')
        .select('user_id')
        .in('ip_address', ipAddresses)
        .neq('user_id', userId);

      if (!duplicateIpError && duplicateIpData) {
        duplicateIpUsers = [...new Set(duplicateIpData.map(d => d.user_id))];
      }
    }

    return {
      userId,
      deviceFingerprints: deviceData || [],
      fraudLogs: fraudLogs || [],
      cardUsage: cardData || [],
      duplicateDeviceUsers,
      duplicateIpUsers
    };

  } catch (error) {
    console.error('Error fetching user fraud details:', error);
    return null;
  }
}

/**
 * 不正検知統計情報を取得（管理者ダッシュボード用）
 */
export async function getFraudDetectionStats(): Promise<{
  totalHighRiskUsers: number;
  totalMediumRiskUsers: number;
  recentDetections: number;
  blockedAttempts: number;
  trialAbuseCount: number;
}> {
  try {
    // 過去30日間の不正検知ログを取得
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: recentLogs, error: logsError } = await supabase
      .from('fraud_detection_logs')
      .select('risk_score, detection_type, action_taken, details')
      .gte('created_at', thirtyDaysAgo);

    if (logsError) throw logsError;

    const logs = recentLogs || [];
    
    const highRiskUsers = new Set(
      logs.filter(log => log.risk_score >= 70).map(log => log.user_id)
    ).size;
    
    const mediumRiskUsers = new Set(
      logs.filter(log => log.risk_score >= 50 && log.risk_score < 70).map(log => log.user_id)
    ).size;
    
    const recentDetections = logs.length;
    
    const blockedAttempts = logs.filter(log => 
      log.action_taken === 'restriction' || log.action_taken === 'ban'
    ).length;
    
    const trialAbuseCount = logs.filter(log =>
      log.details && (log.details.trialAbuse || log.details.multipleTrials)
    ).length;

    return {
      totalHighRiskUsers: highRiskUsers,
      totalMediumRiskUsers: mediumRiskUsers,
      recentDetections,
      blockedAttempts,
      trialAbuseCount
    };

  } catch (error) {
    console.error('Error fetching fraud detection stats:', error);
    return {
      totalHighRiskUsers: 0,
      totalMediumRiskUsers: 0,
      recentDetections: 0,
      blockedAttempts: 0,
      trialAbuseCount: 0
    };
  }
} 