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

      // Check maintenance status and IP whitelist
      const { data, error } = await supabase
        .rpc('should_show_maintenance', { client_ip: ipInfo.ip });

      if (error) {
        console.warn('メンテナンス状態の取得に失敗:', error.message);
        // Fallback to original method
        const { data: fallbackData, error: fallbackError } = await supabase
          .rpc('get_current_maintenance');
        
        if (fallbackError) {
          setError(fallbackError.message);
          return;
        }

        if (fallbackData && fallbackData.length > 0) {
          const maintenance = fallbackData[0];
          setMaintenanceInfo(maintenance);
          setIsMaintenanceActive(true);
          setIsIPWhitelisted(false); // Unknown IP status
        } else {
          setMaintenanceInfo(null);
          setIsMaintenanceActive(false);
          setIsIPWhitelisted(true); // No maintenance, allow access
        }
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
      // エラーが発生した場合は、メンテナンス状態を無効として処理
      setMaintenanceInfo(null);
      setIsMaintenanceActive(false);
      setIsIPWhitelisted(true); // Error state should allow access
      setError(null); // エラーを表示しない
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshMaintenanceStatus = useCallback(async () => {
    await fetchMaintenanceStatus();
  }, [fetchMaintenanceStatus]);

  useEffect(() => {
    fetchMaintenanceStatus();

    // 5分おきにメンテナンス状態をチェック
    const interval = setInterval(fetchMaintenanceStatus, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [fetchMaintenanceStatus]);

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