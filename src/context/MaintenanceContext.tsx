import { ReactNode, createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';

interface MaintenanceSchedule {
  id: string;
  title: string;
  message: string;
  start_time: string | null;
  end_time: string | null;
  is_emergency: boolean;
}

interface MaintenanceContextType {
  isMaintenanceActive: boolean;
  maintenanceInfo: MaintenanceSchedule | null;
  loading: boolean;
  error: string | null;
  clientIP: string | null;
  isIPWhitelisted: boolean;
  refreshMaintenanceStatus: () => Promise<void>;
}

const MaintenanceContext = createContext<MaintenanceContextType>({
  isMaintenanceActive: false,
  maintenanceInfo: null,
  loading: true,
  error: null,
  clientIP: null,
  isIPWhitelisted: false,
  refreshMaintenanceStatus: async () => {},
});

export const MaintenanceProvider = ({ children }: { children: ReactNode }) => {
  const [isMaintenanceActive, setIsMaintenanceActive] = useState(false);
  const [maintenanceInfo, setMaintenanceInfo] = useState<MaintenanceSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clientIP, setClientIP] = useState<string | null>(null);
  const [isIPWhitelisted, setIsIPWhitelisted] = useState(false);

  // クライアントIPを取得
  const fetchClientIP = useCallback(async () => {
    try {
      // シンプルなローカルホスト環境での処理
      setClientIP('127.0.0.1');
      setIsIPWhitelisted(true); // 開発環境では常にホワイトリスト
    } catch (error) {
      console.error('Error fetching client IP:', error);
      setClientIP('127.0.0.1');
      setIsIPWhitelisted(true);
    }
  }, []);

  // メンテナンス状態を確認（DBから取得）
  const checkMaintenanceStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('maintenance_schedules')
        .select('*')
        .eq('is_active', true)
        .order('start_time', { ascending: false })
        .limit(1);
      if (error) throw error;
      if (data && data.length > 0) {
        const row = data[0] as any;
        setIsMaintenanceActive(true);
        setMaintenanceInfo({
          id: row.id,
          title: row.title,
          message: row.message,
          start_time: row.start_time,
          end_time: row.end_time,
          is_emergency: !!row.is_emergency
        });
      } else {
        setIsMaintenanceActive(false);
        setMaintenanceInfo(null);
      }
    } catch (error) {
      console.error('Error checking maintenance status:', error);
      setIsMaintenanceActive(false);
      setMaintenanceInfo(null);
    }
  };

  const refreshMaintenanceStatus = useCallback(async () => {
    await checkMaintenanceStatus();
  }, [checkMaintenanceStatus]);

  // 初期化処理
  useEffect(() => {
    const initialize = async () => {
      await fetchClientIP();
      await checkMaintenanceStatus();
    };

    initialize();
  }, [fetchClientIP, checkMaintenanceStatus]);

  const value: MaintenanceContextType = {
    isMaintenanceActive,
    maintenanceInfo,
    loading,
    error,
    clientIP,
    isIPWhitelisted,
    refreshMaintenanceStatus,
  };

  return (
    <MaintenanceContext.Provider value={value}>
      {children}
    </MaintenanceContext.Provider>
  );
};

// useMaintenance hookを個別にエクスポート
export const useMaintenance = () => {
  const context = useContext(MaintenanceContext);
  if (!context) {
    throw new Error('useMaintenance must be used within a MaintenanceProvider');
  }
  return context;
};

// 型定義をエクスポート
export type { MaintenanceSchedule };

