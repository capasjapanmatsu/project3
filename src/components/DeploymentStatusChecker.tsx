import { useState, useEffect, useCallback } from 'react';
import { getDeploymentStatus } from '../utils/deploymentStatus';
import Button from './Button';
import { AlertTriangle, Loader, ExternalLink } from 'lucide-react';

interface DeploymentStatus {
  deploy_url?: string;
  status?: string;
  owner?: string;
  [key: string]: unknown;
}

interface DeploymentStatusCheckerProps {
  id?: string;
  onStatusChange?: (status: DeploymentStatus) => void;
  className?: string;
}

export function DeploymentStatusChecker({ id, onStatusChange, className = '' }: DeploymentStatusCheckerProps) {
  const [status, setStatus] = useState<DeploymentStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = useCallback(async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const result = await getDeploymentStatus({ id });
      
      setStatus(result);
      if (onStatusChange) {
        onStatusChange(result);
      }
    } catch (err) {
      console.error('Error checking deployment status:', err);
      setError((err as Error).message || 'デプロイステータスの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [id, onStatusChange]);

  useEffect(() => {
    if (id) {
      void checkStatus();
    }
  }, [id, checkStatus]);

  const getStatusColor = (statusText: string) => {
    switch (statusText) {
      case 'ready':
        return 'text-green-600 bg-green-100';
      case 'error':
      case 'failed':
        return 'text-red-600 bg-red-100';
      case 'building':
      case 'enqueued':
      case 'processing':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusLabel = (statusText: string) => {
    switch (statusText) {
      case 'ready':
        return '完了';
      case 'error':
      case 'failed':
        return '失敗';
      case 'building':
        return 'ビルド中';
      case 'enqueued':
        return '待機中';
      case 'processing':
        return '処理中';
      default:
        return statusText;
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <Loader className="w-4 h-4 text-blue-600 animate-spin" />
        <span className="text-sm text-gray-600">ステータスを確認中...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <AlertTriangle className="w-4 h-4 text-red-600" />
        <span className="text-sm text-red-600">{error}</span>
        <Button size="sm" variant="secondary" onClick={() => void checkStatus()}>
          再試行
        </Button>
      </div>
    );
  }

  if (!status) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <Button size="sm" onClick={() => void checkStatus()}>
          ステータスを確認
        </Button>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center space-x-2">
        <span className="text-sm text-gray-600">ステータス:</span>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status.status || '')}`}>
          {getStatusLabel(status.status || '')}
        </span>
      </div>
      
      {status.deploy_url && (
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">URL:</span>
          <a 
            href={status.deploy_url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
          >
            {status.deploy_url.replace(/^https?:\/\//, '')}
            <ExternalLink className="w-3 h-3 ml-1" />
          </a>
        </div>
      )}
      
      <Button size="sm" variant="secondary" onClick={() => void checkStatus()}>
        更新
      </Button>
    </div>
  );
}