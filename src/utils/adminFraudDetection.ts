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
 * 高リスクユーザーのリストを取得
 */
export async function getHighRiskUsers(): Promise<FraudDetectionResult[]> {
  try {
    // まず、必要なテーブルが存在するかチェック
    const { data: tablesCheck, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['fraud_detection_logs', 'user_device_fingerprints', 'stripe_card_fingerprints']);

    if (tablesError) {
      console.warn('Could not check table existence:', tablesError);
      return [];
    }

    const existingTables = tablesCheck?.map(t => t.table_name) || [];
    
    // 必要なテーブルが存在しない場合は空の結果を返す
    if (!existingTables.includes('fraud_detection_logs') || 
        !existingTables.includes('user_device_fingerprints') || 
        !existingTables.includes('stripe_card_fingerprints')) {
      console.warn('Fraud detection tables not found. Please run create_blacklist_schema.sql');
      return [];
    }

    // プロファイル情報を取得
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, name, email, created_at, user_type');

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return [];
    }

    if (!profiles || profiles.length === 0) {
      return [];
    }

    // 不正検知ログを取得
    const { data: fraudLogs, error: fraudError } = await supabase
      .from('fraud_detection_logs')
      .select('user_id, detection_type, risk_score, action_taken, created_at')
      .order('created_at', { ascending: false });

    if (fraudError) {
      console.error('Error fetching fraud logs:', fraudError);
      return [];
    }

    const results: FraudDetectionResult[] = [];

    for (const profile of profiles) {
      const userFraudLogs = fraudLogs?.filter(log => log.user_id === profile.id) || [];
      
      if (userFraudLogs.length === 0) continue;

      const maxRiskScore = Math.max(...userFraudLogs.map(log => log.risk_score));
      const riskLevel = maxRiskScore >= 70 ? 'high' : maxRiskScore >= 50 ? 'medium' : 'low';

      // 高リスクまたは中リスクのユーザーのみを含める
      if (riskLevel === 'low') continue;

      const detectionTypes = Array.from(new Set(userFraudLogs.map(log => log.detection_type)));
      const lastDetection = userFraudLogs[0]?.created_at || '';

      // デバイス重複数を取得
      let deviceDuplicates = 0;
      try {
        const { data: deviceData } = await supabase
          .from('user_device_fingerprints')
          .select('fingerprint')
          .eq('user_id', profile.id);
        
        if (deviceData && deviceData.length > 0) {
          const { count } = await supabase
            .from('user_device_fingerprints')
            .select('user_id', { count: 'exact' })
            .in('fingerprint', deviceData.map(d => d.fingerprint))
            .neq('user_id', profile.id);
          deviceDuplicates = count || 0;
        }
      } catch (error) {
        console.warn('Error fetching device duplicates:', error);
      }

      // IP重複数を取得
      let ipDuplicates = 0;
      try {
        const { data: ipData } = await supabase
          .from('user_device_fingerprints')
          .select('ip_address')
          .eq('user_id', profile.id)
          .not('ip_address', 'is', null);
        
        if (ipData && ipData.length > 0) {
          const { count } = await supabase
            .from('user_device_fingerprints')
            .select('user_id', { count: 'exact' })
            .in('ip_address', ipData.map(d => d.ip_address))
            .neq('user_id', profile.id);
          ipDuplicates = count || 0;
        }
      } catch (error) {
        console.warn('Error fetching IP duplicates:', error);
      }

      // カード重複数を取得
      let cardDuplicates = 0;
      try {
        const { data: cardData } = await supabase
          .from('stripe_card_fingerprints')
          .select('card_fingerprint')
          .eq('user_id', profile.id);
        
        if (cardData && cardData.length > 0) {
          const { count } = await supabase
            .from('stripe_card_fingerprints')
            .select('user_id', { count: 'exact' })
            .in('card_fingerprint', cardData.map(c => c.card_fingerprint))
            .neq('user_id', profile.id);
          cardDuplicates = count || 0;
        }
      } catch (error) {
        console.warn('Error fetching card duplicates:', error);
      }

      // トライアル悪用チェック
      let trialAbuse = false;
      try {
        const { data: trialData } = await supabase
          .from('stripe_card_fingerprints')
          .select('trial_used')
          .eq('user_id', profile.id)
          .eq('trial_used', true);
        trialAbuse = (trialData?.length || 0) > 1;
      } catch (error) {
        console.warn('Error checking trial abuse:', error);
      }

      // auth.usersからメール情報を取得
      let userEmail = profile.email || '';
      try {
        const { data: authUser } = await supabase.auth.admin.getUserById(profile.id);
        if (authUser.user?.email) {
          userEmail = authUser.user.email;
        }
      } catch (error) {
        console.warn('Error fetching auth user email:', error);
      }

      results.push({
        userId: profile.id,
        userName: profile.name || 'Unknown',
        email: userEmail,
        riskScore: maxRiskScore,
        riskLevel,
        detectionTypes,
        deviceDuplicates,
        ipDuplicates,
        cardDuplicates,
        lastDetection,
        trialAbuse,
        createdAt: profile?.created_at || ''
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
 * 不正検知統計情報を取得
 */
export async function getFraudDetectionStats(): Promise<{
  totalHighRiskUsers: number;
  totalMediumRiskUsers: number;
  totalLowRiskUsers: number;
  recentDetections: number;
  blockedAttempts: number;
  trialAbuseCount: number;
} | null> {
  try {
    // テーブルの存在確認
    const { data: tablesCheck, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['fraud_detection_logs', 'user_device_fingerprints', 'stripe_card_fingerprints']);

    if (tablesError) {
      console.warn('Could not check table existence:', tablesError);
      return null;
    }

    const existingTables = tablesCheck?.map(t => t.table_name) || [];
    
    // 必要なテーブルが存在しない場合はnullを返す
    if (!existingTables.includes('fraud_detection_logs')) {
      console.warn('Fraud detection tables not found. Please run create_blacklist_schema.sql');
      return null;
    }

    // 過去30日間の統計
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: fraudLogs, error: fraudError } = await supabase
      .from('fraud_detection_logs')
      .select('user_id, risk_score, detection_type, created_at')
      .order('created_at', { ascending: false });

    if (fraudError) {
      console.error('Error fetching fraud logs:', fraudError);
      return {
        totalHighRiskUsers: 0,
        totalMediumRiskUsers: 0,
        totalLowRiskUsers: 0,
        recentDetections: 0,
        blockedAttempts: 0,
        trialAbuseCount: 0
      };
    }

    if (!fraudLogs || fraudLogs.length === 0) {
      return {
        totalHighRiskUsers: 0,
        totalMediumRiskUsers: 0,
        totalLowRiskUsers: 0,
        recentDetections: 0,
        blockedAttempts: 0,
        trialAbuseCount: 0
      };
    }

    // ユーザーごとの最高リスクスコアを計算
    const userRiskScores = new Map<string, number>();
    fraudLogs.forEach(log => {
      const currentMax = userRiskScores.get(log.user_id) || 0;
      if (log.risk_score > currentMax) {
        userRiskScores.set(log.user_id, log.risk_score);
      }
    });

    let totalHighRiskUsers = 0;
    let totalMediumRiskUsers = 0;
    let totalLowRiskUsers = 0;

    userRiskScores.forEach(score => {
      if (score >= 70) totalHighRiskUsers++;
      else if (score >= 50) totalMediumRiskUsers++;
      else totalLowRiskUsers++;
    });

    const recentDetections = fraudLogs.filter(log => 
      new Date(log.created_at) >= new Date(thirtyDaysAgo)
    ).length;

    const blockedAttempts = fraudLogs.filter(log => 
      log.detection_type === 'duplicate_device' || 
      log.detection_type === 'duplicate_ip' || 
      log.detection_type === 'duplicate_card'
    ).length;

    const trialAbuseCount = fraudLogs.filter(log => 
      log.detection_type === 'subscription_abuse' ||
      (log.detection_type === 'duplicate_card' && log.risk_score >= 60)
    ).length;

    return {
      totalHighRiskUsers,
      totalMediumRiskUsers,
      totalLowRiskUsers,
      recentDetections,
      blockedAttempts,
      trialAbuseCount
    };

  } catch (error) {
    console.error('Error fetching fraud detection stats:', error);
    return {
      totalHighRiskUsers: 0,
      totalMediumRiskUsers: 0,
      totalLowRiskUsers: 0,
      recentDetections: 0,
      blockedAttempts: 0,
      trialAbuseCount: 0
    };
  }
} 