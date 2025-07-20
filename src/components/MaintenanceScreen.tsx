import { Settings, Clock, AlertTriangle, RefreshCw } from 'lucide-react';
import { useMaintenance } from '../context/MaintenanceContext';
import Button from './Button';
import Card from './Card';

const MaintenanceScreen = () => {
  const { maintenanceInfo, refreshMaintenanceStatus } = useMaintenance();

  const formatDateTime = (dateTime: string | null) => {
    if (!dateTime) return null;
    return new Date(dateTime).toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center">
        <div className="flex justify-center mb-6">
          {maintenanceInfo?.is_emergency ? (
            <AlertTriangle className="w-16 h-16 text-red-500" />
          ) : (
            <Settings className="w-16 h-16 text-blue-500" />
          )}
        </div>
        
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          {maintenanceInfo?.title || 'システムメンテナンス'}
        </h1>
        
        <p className="text-gray-600 mb-6">
          {maintenanceInfo?.message || 
            'より良いサービス提供のため、システムメンテナンスを実施しています。ご不便をおかけして申し訳ございません。'}
        </p>
        
        {maintenanceInfo?.start_time && (
          <div className="flex items-center justify-center text-sm text-gray-500 mb-2">
            <Clock className="w-4 h-4 mr-2" />
            <span>開始: {formatDateTime(maintenanceInfo.start_time)}</span>
          </div>
        )}
        
        {maintenanceInfo?.end_time && (
          <div className="flex items-center justify-center text-sm text-gray-500 mb-6">
            <Clock className="w-4 h-4 mr-2" />
            <span>終了予定: {formatDateTime(maintenanceInfo.end_time)}</span>
          </div>
        )}
        
        <Button 
          onClick={() => void refreshMaintenanceStatus()}
          className="w-full flex items-center justify-center"
          variant="secondary"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          状態を更新
        </Button>
        
        <div className="mt-6 text-xs text-gray-400">
          <p>メンテナンス完了後、このページは自動的に更新されます。</p>
        </div>
      </Card>
    </div>
  );
};

export default MaintenanceScreen; 
