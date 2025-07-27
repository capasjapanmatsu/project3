import { supabase } from './supabase';

export interface BanUserParams {
  userId: string;
  reason: string;
  banType: 'fraud_abuse' | 'subscription_abuse' | 'policy_violation' | 'other';
  evidence?: Record<string, any>;
}

export interface BanResult {
  success: boolean;
  message: string;
  error?: string;
  bannedEmail?: string;
  actionsTaken?: Record<string, any>;
}

export interface BlacklistCheck {
  isBlocked: boolean;
  restrictions: {
    emailBlocked?: boolean;
    ipBlocked?: boolean;
    deviceBlocked?: boolean;
    cardBlocked?: boolean;
  };
}

/**
 * 悪質ユーザーを強制退会させる
 */
export async function forceBanUser(params: BanUserParams): Promise<BanResult> {
  try {
    const { data, error } = await supabase.rpc('force_ban_user', {
      p_user_id: params.userId,
      p_admin_id: (await supabase.auth.getUser()).data.user?.id,
      p_reason: params.reason,
      p_ban_type: params.banType
    });

    if (error) {
      console.error('Force ban error:', error);
      return {
        success: false,
        message: '強制退会の処理中にエラーが発生しました',
        error: error.message
      };
    }

    if (data && data.success) {
      return {
        success: true,
        message: data.message || '悪質ユーザーを強制退会させました',
        bannedEmail: data.banned_email,
        actionsTaken: data.actions_taken
      };
    } else {
      return {
        success: false,
        message: data?.error || '強制退会の処理に失敗しました',
        error: data?.error
      };
    }

  } catch (error) {
    console.error('Force ban user error:', error);
    return {
      success: false,
      message: '予期しないエラーが発生しました',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * ブラックリスト制限をチェック
 */
export async function checkBlacklistRestrictions(params: {
  email?: string;
  ipAddress?: string;
  deviceFingerprint?: string;
  cardFingerprint?: string;
}): Promise<BlacklistCheck> {
  try {
    const { data, error } = await supabase.rpc('check_blacklist_restrictions', {
      p_email: params.email || null,
      p_ip_address: params.ipAddress || null,
      p_device_fingerprint: params.deviceFingerprint || null,
      p_card_fingerprint: params.cardFingerprint || null
    });

    if (error) {
      console.error('Blacklist check error:', error);
      return {
        isBlocked: false,
        restrictions: {}
      };
    }

    return {
      isBlocked: data?.is_blocked || false,
      restrictions: {
        emailBlocked: data?.restrictions?.email_blocked || false,
        ipBlocked: data?.restrictions?.ip_blocked || false,
        deviceBlocked: data?.restrictions?.device_blocked || false,
        cardBlocked: data?.restrictions?.card_blocked || false
      }
    };

  } catch (error) {
    console.error('Blacklist restrictions check error:', error);
    return {
      isBlocked: false,
      restrictions: {}
    };
  }
}

/**
 * ブラックリスト統計を取得
 */
export async function getBlacklistStats(): Promise<{
  totalBannedUsers: number;
  totalBlacklistedIPs: number;
  totalBlacklistedDevices: number;
  totalBlacklistedEmails: number;
  totalBlacklistedCards: number;
  recentBans: number;
}> {
  try {
    // 過去30日間の統計を取得
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [
      bannedUsers,
      blacklistedIPs,
      blacklistedDevices,
      blacklistedEmails,
      blacklistedCards,
      recentBans
    ] = await Promise.all([
      supabase.from('blacklisted_users').select('id', { count: 'exact' }),
      supabase.from('blacklisted_ips').select('id', { count: 'exact' }),
      supabase.from('blacklisted_devices').select('id', { count: 'exact' }),
      supabase.from('blacklisted_emails').select('id', { count: 'exact' }),
      supabase.from('blacklisted_cards').select('id', { count: 'exact' }),
      supabase
        .from('forced_bans_log')
        .select('id', { count: 'exact' })
        .gte('created_at', thirtyDaysAgo)
    ]);

    return {
      totalBannedUsers: bannedUsers.count || 0,
      totalBlacklistedIPs: blacklistedIPs.count || 0,
      totalBlacklistedDevices: blacklistedDevices.count || 0,
      totalBlacklistedEmails: blacklistedEmails.count || 0,
      totalBlacklistedCards: blacklistedCards.count || 0,
      recentBans: recentBans.count || 0
    };

  } catch (error) {
    console.error('Error fetching blacklist stats:', error);
    return {
      totalBannedUsers: 0,
      totalBlacklistedIPs: 0,
      totalBlacklistedDevices: 0,
      totalBlacklistedEmails: 0,
      totalBlacklistedCards: 0,
      recentBans: 0
    };
  }
}

/**
 * 強制退会ログを取得
 */
export async function getForcedBansLog(limit: number = 50): Promise<Array<{
  id: string;
  bannedEmail: string;
  reason: string;
  banType: string;
  bannedBy: string;
  createdAt: string;
  actionsTaken: Record<string, any>;
}>> {
  try {
    const { data, error } = await supabase
      .from('forced_bans_log')
      .select(`
        id,
        banned_email,
        reason,
        ban_type,
        actions_taken,
        created_at,
        banned_by,
        profiles!forced_bans_log_banned_by_fkey(name)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching forced bans log:', error);
      return [];
    }

    return (data || []).map(item => ({
      id: item.id,
      bannedEmail: item.banned_email,
      reason: item.reason,
      banType: item.ban_type,
      bannedBy: item.profiles?.name || 'Unknown',
      createdAt: item.created_at,
      actionsTaken: item.actions_taken || {}
    }));

  } catch (error) {
    console.error('Error in getForcedBansLog:', error);
    return [];
  }
}

/**
 * ブラックリストエントリを削除（解除）
 */
export async function removeFromBlacklist(params: {
  type: 'user' | 'ip' | 'device' | 'email' | 'card';
  value: string;
}): Promise<{ success: boolean; message: string }> {
  try {
    let tableName: string;
    let columnName: string;

    switch (params.type) {
      case 'user':
        tableName = 'blacklisted_users';
        columnName = 'user_id';
        break;
      case 'ip':
        tableName = 'blacklisted_ips';
        columnName = 'ip_address';
        break;
      case 'device':
        tableName = 'blacklisted_devices';
        columnName = 'device_fingerprint';
        break;
      case 'email':
        tableName = 'blacklisted_emails';
        columnName = 'email';
        break;
      case 'card':
        tableName = 'blacklisted_cards';
        columnName = 'card_fingerprint';
        break;
      default:
        return {
          success: false,
          message: '無効なブラックリストタイプです'
        };
    }

    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq(columnName, params.value);

    if (error) {
      console.error('Remove from blacklist error:', error);
      return {
        success: false,
        message: 'ブラックリストからの削除に失敗しました'
      };
    }

    return {
      success: true,
      message: 'ブラックリストから削除しました'
    };

  } catch (error) {
    console.error('Error in removeFromBlacklist:', error);
    return {
      success: false,
      message: '予期しないエラーが発生しました'
    };
  }
} 