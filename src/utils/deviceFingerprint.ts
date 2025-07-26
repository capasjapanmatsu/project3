import FingerprintJS from '@fingerprintjs/fingerprintjs';

interface DeviceInfo {
  fingerprint: string;
  userAgent: string;
  screen: string;
  timezone: string;
  language: string;
  platform: string;
  cookieEnabled: boolean;
  timestamp: string;
}

/**
 * デバイスフィンガープリントを生成
 */
export async function generateDeviceFingerprint(): Promise<DeviceInfo> {
  try {
    // FingerprintJSエージェントを初期化
    const fp = await FingerprintJS.load();
    
    // フィンガープリントを取得
    const result = await fp.get();
    
    // 追加のデバイス情報を収集
    const deviceInfo: DeviceInfo = {
      fingerprint: result.visitorId,
      userAgent: navigator.userAgent,
      screen: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      timestamp: new Date().toISOString()
    };

    return deviceInfo;
  } catch (error) {
    console.error('Error generating device fingerprint:', error);
    
    // フォールバック：基本情報のみ
    return {
      fingerprint: `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userAgent: navigator.userAgent || 'unknown',
      screen: `${screen.width || 0}x${screen.height || 0}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown',
      language: navigator.language || 'unknown',
      platform: navigator.platform || 'unknown',
      cookieEnabled: navigator.cookieEnabled || false,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * デバイス情報をSupabaseに記録
 */
export async function recordDeviceInfo(
  userId: string, 
  deviceInfo: DeviceInfo, 
  action: 'registration' | 'login' | 'subscription'
) {
  try {
    const { supabase } = await import('./supabase');
    
    const { error } = await supabase
      .from('user_device_fingerprints')
      .insert({
        user_id: userId,
        fingerprint: deviceInfo.fingerprint,
        user_agent: deviceInfo.userAgent,
        screen_resolution: deviceInfo.screen,
        timezone: deviceInfo.timezone,
        language: deviceInfo.language,
        platform: deviceInfo.platform,
        cookie_enabled: deviceInfo.cookieEnabled,
        action_type: action,
        ip_address: null, // サーバーサイドで取得
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error recording device fingerprint:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in recordDeviceInfo:', error);
    return false;
  }
}

/**
 * 同一デバイスからの重複登録をチェック
 */
export async function checkDuplicateDevice(fingerprint: string): Promise<{
  isDuplicate: boolean;
  count: number;
  userIds: string[];
}> {
  try {
    const { supabase } = await import('./supabase');
    
    const { data, error } = await supabase
      .from('user_device_fingerprints')
      .select('user_id, created_at')
      .eq('fingerprint', fingerprint)
      .eq('action_type', 'registration')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error checking duplicate device:', error);
      return { isDuplicate: false, count: 0, userIds: [] };
    }

    const uniqueUserIds = [...new Set(data?.map(record => record.user_id) || [])];
    
    return {
      isDuplicate: uniqueUserIds.length > 1,
      count: uniqueUserIds.length,
      userIds: uniqueUserIds
    };
  } catch (error) {
    console.error('Error in checkDuplicateDevice:', error);
    return { isDuplicate: false, count: 0, userIds: [] };
  }
}

/**
 * IPアドレスベースの重複チェック
 */
export async function checkDuplicateIP(ipAddress: string): Promise<{
  isDuplicate: boolean;
  count: number;
  recentRegistrations: number;
}> {
  try {
    const { supabase } = await import('./supabase');
    
    // 24時間以内の登録をチェック
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data, error } = await supabase
      .from('user_device_fingerprints')
      .select('user_id, created_at')
      .eq('ip_address', ipAddress)
      .eq('action_type', 'registration')
      .gte('created_at', twentyFourHoursAgo)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error checking duplicate IP:', error);
      return { isDuplicate: false, count: 0, recentRegistrations: 0 };
    }

    const uniqueUserIds = [...new Set(data?.map(record => record.user_id) || [])];
    
    return {
      isDuplicate: uniqueUserIds.length > 2, // 24時間で3回以上は怪しい
      count: uniqueUserIds.length,
      recentRegistrations: data?.length || 0
    };
  } catch (error) {
    console.error('Error in checkDuplicateIP:', error);
    return { isDuplicate: false, count: 0, recentRegistrations: 0 };
  }
} 