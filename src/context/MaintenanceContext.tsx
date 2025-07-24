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
  // 🚨 緊急対応: メンテナンス機能を完全無効化 🚨
  const [isMaintenanceActive] = useState(false); // 常にfalse
  const [maintenanceInfo] = useState<MaintenanceSchedule | null>(null); // 常にnull
  const [loading] = useState(false); // 常にfalse（ローディング無し）
  const [error] = useState<string | null>(null); // 常にnull
  const [clientIP] = useState<string | null>('127.0.0.1'); // ダミーIP
  const [isIPWhitelisted] = useState(true); // 常にtrue

  // すべての処理をスキップして即座に正常状態を返す
  const refreshMaintenanceStatus = useCallback(async () => {
    // console.log('MaintenanceContext: スキップ（無効化中）'); // ログを削除
    return Promise.resolve();
  }, []);

  // メンテナンス機能が無効化されていることをログ出力
  useEffect(() => {
    // console.log('🚨 MaintenanceContext: 緊急対応により完全無効化されています'); // ログを削除
  }, []);

  const value: MaintenanceContextType = {
    isMaintenanceActive, // false
    maintenanceInfo, // null
    loading, // false
    error, // null
    clientIP, // '127.0.0.1'
    isIPWhitelisted, // true
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

