import React from 'react';
import { WifiOff, AlertCircle, RefreshCw } from 'lucide-react';
import Button from '../Button';

interface NetworkErrorBannerProps {
  isOffline: boolean;
  networkError: string | null;
  onRetryConnection: () => void;
}

export const NetworkErrorBanner: React.FC<NetworkErrorBannerProps> = ({
  isOffline,
  networkError,
  onRetryConnection,
}) => {
  if (!networkError) return null;

  return (
    <div className={`border rounded-lg p-4 mb-6 ${isOffline ? 'bg-orange-50 border-orange-200' : 'bg-red-50 border-red-200'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {isOffline ? (
            <WifiOff className="w-6 h-6 text-orange-600" />
          ) : (
            <AlertCircle className="w-6 h-6 text-red-600" />
          )}
          <div>
            <h3 className={`font-medium ${isOffline ? 'text-orange-800' : 'text-red-800'}`}>
              {isOffline ? 'オフラインモード' : '接続エラー'}
            </h3>
            <p className={`text-sm whitespace-pre-line ${isOffline ? 'text-orange-700' : 'text-red-700'}`}>
              {networkError}
            </p>
          </div>
        </div>
        <Button 
          onClick={onRetryConnection}
          size="sm"
          className={`${isOffline ? 'bg-orange-600 hover:bg-orange-700' : 'bg-red-600 hover:bg-red-700'} text-white`}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          再接続
        </Button>
      </div>
    </div>
  );
};

export default NetworkErrorBanner; 