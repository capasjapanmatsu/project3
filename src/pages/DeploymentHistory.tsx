import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Globe, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  ExternalLink,
  RefreshCw,
  Calendar
} from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import { DeploymentStatusChecker } from '../components/DeploymentStatusChecker';
import { useAuth } from '../context/AuthContext';
import { safeGetItem, safeSetItem } from '../utils/safeStorage';

interface Deployment {
  id: string;
  site_id: string;
  deploy_url: string;
  status: string;
  created_at: string;
}

export function DeploymentHistory() {
  const { user } = useAuth();
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // ローカルストレージから過去のデプロイ履歴を取得
    const loadDeployments = () => {
      try {
        const savedDeployments = safeGetItem('deploymentHistory');
        if (savedDeployments) {
          setDeployments(JSON.parse(savedDeployments));
        }
      } catch (err) {
        console.error('Error loading deployment history:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadDeployments();
  }, []);

  const handleStatusChange = (deployId: string, newStatus: any) => {
    setDeployments(prev => 
      prev.map(deploy => 
        deploy.id === deployId 
          ? { ...deploy, status: newStatus.status, deploy_url: newStatus.deploy_url } 
          : deploy
      )
    );
    
    // ローカルストレージに保存
    safeSetItem('deploymentHistory', JSON.stringify(
      deployments.map(deploy => 
        deploy.id === deployId 
          ? { ...deploy, status: newStatus.status, deploy_url: newStatus.deploy_url } 
          : deploy
      )
    ));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
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

  const getStatusLabel = (status: string) => {
    switch (status) {
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
        return status;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center space-x-4 mb-6">
        <Link
          to="/deploy"
          className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          デプロイページに戻る
        </Link>
      </div>

      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4 flex items-center justify-center">
          <Globe className="w-8 h-8 text-blue-600 mr-3" />
          デプロイ履歴
        </h1>
        <p className="text-lg text-gray-600">
          過去のデプロイ履歴を確認できます
        </p>
      </div>

      {/* エラーメッセージ */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 rounded-lg flex items-start">
          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {deployments.length === 0 ? (
        <Card className="p-6 text-center">
          <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">デプロイ履歴がありません</h2>
          <p className="text-gray-500 mb-6">まだデプロイを行っていないようです</p>
          <Link to="/deploy">
            <Button>
              <Globe className="w-4 h-4 mr-2" />
              デプロイを開始する
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-4">
          {deployments.map((deployment) => (
            <Card key={deployment.id} className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(deployment.status)}`}>
                      {getStatusLabel(deployment.status)}
                    </span>
                    <span className="text-sm text-gray-500">
                      {new Date(deployment.created_at).toLocaleString('ja-JP')}
                    </span>
                  </div>
                  
                  <h3 className="font-semibold mb-2">デプロイID: {deployment.id}</h3>
                  
                  {deployment.deploy_url && (
                    <a 
                      href={deployment.deploy_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                    >
                      {deployment.deploy_url.replace(/^https?:\/\//, '')}
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </a>
                  )}
                </div>
                
                <DeploymentStatusChecker 
                  id={deployment.id} 
                  onStatusChange={(status) => handleStatusChange(deployment.id, status)} 
                />
              </div>
            </Card>
          ))}
        </div>
      )}

      <Card className="p-6 bg-blue-50 border-blue-200">
        <div className="flex items-start space-x-3">
          <Calendar className="w-6 h-6 text-blue-600 mt-1" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">デプロイ履歴について</h3>
            <div className="text-sm text-blue-800 space-y-1">
              <p>• デプロイ履歴はブラウザのローカルストレージに保存されます</p>
              <p>• 別のブラウザやデバイスでは履歴が共有されません</p>
              <p>• 各デプロイの最新ステータスを確認できます</p>
              <p>• 「更新」ボタンをクリックすると最新の状態を取得します</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}