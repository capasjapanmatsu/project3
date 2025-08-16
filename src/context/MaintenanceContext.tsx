import { ReactNode, createContext, useCallback, useContext, useEffect, useState } from 'react';

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
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/maintenance_schedules?select=*&is_active=eq.true&order=start_time.desc`, {
        headers: { 'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY as string }
      });
      if (!res.ok) throw new Error('fetch_failed');
      const rows = await res.json() as any[];
      if (rows && rows.length > 0) {
        setIsMaintenanceActive(true);
        const row = rows[0];
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

