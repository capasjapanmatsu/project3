import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { AccessLog } from '../types/pinCode';
import useAuth from '../context/AuthContext';

interface UseAccessLogReturn {
  currentLog: AccessLog | null;
  recentLogs: AccessLog[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * ユーザーのAccessLogを取得・管理するフック
 * @param lockId 特定のロックIDでフィルタリング（オプション）
 * @returns 現在のログ、最近のログ、ローディング状態、エラー
 */
export function useAccessLog(lockId?: string): UseAccessLogReturn {
  const { user } = useAuth();
  const [currentLog, setCurrentLog] = useState<AccessLog | null>(null);
  const [recentLogs, setRecentLogs] = useState<AccessLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAccessLogs = async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // 基本クエリ
      let query = supabase
        .from('access_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('issued_at', { ascending: false });

      // lockIdが指定されている場合はフィルタリング
      if (lockId) {
        query = query.eq('lock_id', lockId);
      }

      const { data, error: fetchError } = await query.limit(10);

      if (fetchError) {
        throw fetchError;
      }

      const logs = (data || []) as AccessLog[];
      setRecentLogs(logs);

      // 現在のログを判定（最も適切なものを選択）
      const current = findCurrentLog(logs);
      setCurrentLog(current);

    } catch (err) {
      console.error('AccessLog fetch error:', err);
      setError(err instanceof Error ? err.message : 'ログの取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 最も適切な「現在のログ」を判定
   * 優先順位：
   * 1. 入場中（entered）のログ
   * 2. 未使用の入場PIN（issued & pin_type=entry）
   * 3. 退場PIN発行済み（exit_requested）
   * 4. 最新のログ
   */
  const findCurrentLog = (logs: AccessLog[]): AccessLog | null => {
    if (logs.length === 0) return null;

    // 入場中のログを探す
    const enteredLog = logs.find(log => log.status === 'entered');
    if (enteredLog) return enteredLog;

    // 未使用の入場PINを探す
    const unusedEntryLog = logs.find(
      log => log.status === 'issued' && log.pin_type === 'entry'
    );
    if (unusedEntryLog) return unusedEntryLog;

    // 退場PIN発行済みを探す
    const exitRequestedLog = logs.find(
      log => log.status === 'exit_requested'
    );
    if (exitRequestedLog) return exitRequestedLog;

    // それ以外は最新のログを返す
    return logs[0];
  };

  // 初回読み込み
  useEffect(() => {
    fetchAccessLogs();
  }, [user?.id, lockId]);

  // リアルタイム更新の設定
  useEffect(() => {
    if (!user?.id) return;

    // リアルタイムサブスクリプションの設定
    const subscription = supabase
      .channel('access_logs_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'access_logs',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('AccessLog update received:', payload);
          // データを再取得
          fetchAccessLogs();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id, lockId]);

  return {
    currentLog,
    recentLogs,
    isLoading,
    error,
    refetch: fetchAccessLogs
  };
}

/**
 * 特定のPINコードのAccessLogを取得
 * @param pin PINコード
 * @param lockId ロックID
 * @returns AccessLogまたはnull
 */
export async function getAccessLogByPin(
  pin: string,
  lockId: string
): Promise<AccessLog | null> {
  try {
    const { data, error } = await supabase
      .from('access_logs')
      .select('*')
      .eq('pin', pin)
      .eq('lock_id', lockId)
      .single();

    if (error) {
      console.error('Failed to fetch AccessLog by PIN:', error);
      return null;
    }

    return data as AccessLog;
  } catch (err) {
    console.error('Error fetching AccessLog:', err);
    return null;
  }
}

/**
 * AccessLogを作成（PIN発行時）
 * @param logData AccessLogのデータ
 * @returns 作成されたAccessLog
 */
export async function createAccessLog(
  logData: Omit<AccessLog, 'id' | 'created_at' | 'updated_at'>
): Promise<AccessLog | null> {
  try {
    const { data, error } = await supabase
      .from('access_logs')
      .insert(logData)
      .select()
      .single();

    if (error) {
      console.error('Failed to create AccessLog:', error);
      return null;
    }

    return data as AccessLog;
  } catch (err) {
    console.error('Error creating AccessLog:', err);
    return null;
  }
}

export default useAccessLog;
