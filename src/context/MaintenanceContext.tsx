import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { supabase } from '../utils/supabase';
import { getCachedClientIP } from '../utils/ipUtils';

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

const MaintenanceProvider = ({ children }: { children: ReactNode }) => {
  const [isMaintenanceActive, setIsMaintenanceActive] = useState(false);
  const [maintenanceInfo, setMaintenanceInfo] = useState<MaintenanceSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clientIP, setClientIP] = useState<string | null>(null);
  const [isIPWhitelisted, setIsIPWhitelisted] = useState(false);

  const fetchMaintenanceStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get client IP address
      const ipInfo = await getCachedClientIP();
      setClientIP(ipInfo.ip);

      // Check maintenance status with IP whitelist
      const { data, error } = await supabase.rpc('should_show_maintenance', {
        client_ip: ipInfo.ip
      });

      if (error) {
        console.warn('メンテナンス状態チェックでエラー:', error);
        // エラーが発生した場合は、メンテナンス状態を無効として処理
        setMaintenanceInfo(null);
        setIsMaintenanceActive(false);
        setIsIPWhitelisted(true);
        setError(null);
        return;
      }

      if (data && data.length > 0) {
        const result = data[0];
        setIsMaintenanceActive(result.is_maintenance_active);
        setIsIPWhitelisted(result.is_ip_allowed);
        
        if (result.is_maintenance_active && result.maintenance_info) {
          setMaintenanceInfo(result.maintenance_info);
        } else {
          setMaintenanceInfo(null);
        }
      } else {
        setMaintenanceInfo(null);
        setIsMaintenanceActive(false);
        setIsIPWhitelisted(true);
      }
    } catch (err) {
      console.warn('メンテナンス状態の取得でエラー:', err);
      setMaintenanceInfo(null);
      setIsMaintenanceActive(false);
      setIsIPWhitelisted(true);
      setError(null);
    } finally {
      setLoading(false);
    }
  }, []); // 空の依存配列を維持

  const refreshMaintenanceStatus = useCallback(async () => {
    await fetchMaintenanceStatus();
  }, [fetchMaintenanceStatus]);

  // 初回実行とインターバル設定
  useEffect(() => {
    let isMounted = true;

    const runFetch = async () => {
      if (isMounted) {
        await fetchMaintenanceStatus();
      }
    };

    // 初回実行
    runFetch();

    // 5分おきにメンテナンス状態をチェック
    const interval = setInterval(() => {
      if (isMounted) {
        runFetch();
      }
    }, 5 * 60 * 1000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []); // 空の依存配列で初回のみ実行

  const value = {
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

const useMaintenance = () => {
  const context = useContext(MaintenanceContext);
  if (!context) {
    throw new Error('useMaintenance must be used within a MaintenanceProvider');
  }
  return context;
};

export { MaintenanceProvider, useMaintenance };
export type { MaintenanceSchedule }; 