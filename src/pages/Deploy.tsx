import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Globe, 
  CheckCircle, 
  AlertTriangle, 
  Loader, 
  ExternalLink,
  Copy,
  RefreshCw,
  Clock,
  Calendar,
  History
} from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { deployToNetlify, getDeploymentStatus } from '../utils/deployUtils';
import { getDeploymentStatus as getDeployStatus } from '../utils/deploymentStatus';
import { safeGetItem, safeSetItem } from '../utils/safeStorage';

interface DeploymentStatus {
  site_id: string;
  deploy_id: string;
  deploy_url: string;
  status: string;
  claimed: boolean;
  claim_url: string | null;
}

export function Deploy() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isDeploying, setIsDeploying] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [deploymentStatus, setDeploymentStatus] = useState<DeploymentStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // ローカルストレージから前回のデプロイ情報を取得
  useEffect(() => {
    const savedDeployment = safeGetItem('lastDeployment');
    if (savedDeployment) {
      try {
        const parsedDeployment = JSON.parse(savedDeployment);
        setDeploymentStatus(parsedDeployment);
        
        // デプロイステータスを自動的に確認
        if (parsedDeployment.site_id && parsedDeployment.deploy_id) {
          checkDeploymentStatus(parsedDeployment.site_id, parsedDeployment.deploy_id);
        }
      } catch (err) {
        console.error('Error parsing saved deployment:', err);
        safeRemoveItem('lastDeployment');
      }
    }
  }, []);

  const handleDeploy = async () => {
    try {
      setIsDeploying(true);
      setError(null);
      setSuccess(null);

      const result = await deployToNetlify();
      
      setDeploymentStatus(result);
      setSuccess('デプロイが開始されました！ステータスを確認してください。');
      
      // ローカルストレージに保存
      safeSetItem('lastDeployment', JSON.stringify(result));
      
      // デプロイ履歴に追加
      addToDeploymentHistory(result);
      
      // 定期的にステータスを確認
      const intervalId = setInterval(async () => {
        try {
          const status = await getDeploymentStatus(result.site_id, result.deploy_id);
          setDeploymentStatus(status);
          
          // デプロイが完了またはエラーの場合はインターバルを停止
          if (['ready', 'error', 'failed'].includes(status.status)) {
            clearInterval(intervalId);
            
            if (status.status === 'ready') {
              setSuccess('デプロイが完了しました！以下のURLでサイトを確認できます。');
            } else {
              setError('デプロイに失敗しました。詳細はNetlifyダッシュボードで確認してください。');
            }
          }
          
          // 最新の状態を保存
          safeSetItem('lastDeployment', JSON.stringify(status));
          
          // デプロイ履歴も更新
          updateDeploymentHistory(status);
        } catch (err) {
          console.error('Error checking deployment status:', err);
        }
      }, 5000); // 5秒ごとに確認
      
      // コンポーネントのアンマウント時にインターバルをクリア
      return () => clearInterval(intervalId);
    } catch (err: any) {
      console.error('Deploy error:', err);
      setError(err.message || 'デプロイに失敗しました。');
    } finally {
      setIsDeploying(false);
    }
  };

  const checkDeploymentStatus = async (siteId: string, deployId: string) => {
    try {
      setIsCheckingStatus(true);
      setError(null);
      
      const status = await getDeploymentStatus(siteId, deployId);
      setDeploymentStatus(status);
      
      // ローカルストレージに保存
      safeSetItem('lastDeployment', JSON.stringify(status));
      
      // デプロイ履歴も更新
      updateDeploymentHistory(status);
      
      if (status.status === 'ready') {
        setSuccess('デプロイが完了しています！以下のURLでサイトを確認できます。');
      } else if (['error', 'failed'].includes(status.status)) {
        setError('デプロイに失敗しました。詳細はNetlifyダッシュボードで確認してください。');
      } else {
        setSuccess('デプロイは進行中です。ステータスを確認してください。');
      }
    } catch (err: any) {
      console.error('Error checking deployment status:', err);
      setError(err.message || 'デプロイステータスの確認に失敗しました。');
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const addToDeploymentHistory = (deployment: DeploymentStatus) => {
    try {
      // 既存の履歴を取得
      const savedHistory = safeGetItem('deploymentHistory');
      let history = savedHistory ? JSON.parse(savedHistory) : [];
      
      // 新しいデプロイを追加
      history.unshift({
        ...deployment,
        created_at: new Date().toISOString()
      });
      
      // 最大10件まで保存
      if (history.length > 10) {
        history = history.slice(0, 10);
      }
      
      // 保存
      safeSetItem('deploymentHistory', JSON.stringify(history));
    } catch (err) {
      console.error('Error adding to deployment history:', err);
    }
  };

  const updateDeploymentHistory = (deployment: DeploymentStatus) => {
    try {
      // 既存の履歴を取得
      const savedHistory = safeGetItem('deploymentHistory');
      if (!savedHistory) return;
      
      let history = JSON.parse(savedHistory);
      
      // デプロイIDに一致する履歴を更新
      history = history.map((item: any) => 
        item.deploy_id === deployment.deploy_id 
          ? { ...item, status: deployment.status, deploy_url: deployment.deploy_url } 
          : item
      );
      
      // 保存
      safeSetItem('deploymentHistory', JSON.stringify(history));
    } catch (err) {
      console.error('Error updating deployment history:', err);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
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

  const refreshStatus = () => {
    if (deploymentStatus?.site_id && deploymentStatus?.deploy_id) {
      checkDeploymentStatus(deploymentStatus.site_id, deploymentStatus.deploy_id);
    }
  };

  const checkDeployStatus = async () => {
    try {
      setIsCheckingStatus(true);
      setError(null);
      
      const status = await getDeployStatus({});
      console.log('Deployment status:', status);
      
      if (status.status === 'ready') {
        setSuccess('デプロイが完了しています！以下のURLでサイトを確認できます。');
      }
    } catch (err: any) {
      console.error('Error checking deployment status:', err);
      setError(err.message || 'デプロイステータスの確認に失敗しました。');
    } finally {
      setIsCheckingStatus(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center space-x-4 mb-6">
        <Link
          to="/dashboard"
          className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          ダッシュボードに戻る
        </Link>
      </div>

      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4 flex items-center justify-center">
          <Globe className="w-8 h-8 text-blue-600 mr-3" />
          サイトをデプロイ
        </h1>
        <p className="text-lg text-gray-600">
          あなたのアプリケーションをNetlifyにデプロイします
        </p>
      </div>

      {/* エラーメッセージ */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 rounded-lg flex items-start">
          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* 成功メッセージ */}
      {success && (
        <div className="mb-6 p-4 bg-green-50 rounded-lg flex items-start">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
          <p className="text-green-800">{success}</p>
        </div>
      )}

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-6">デプロイ設定</h2>
        
        <div className="space-y-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-start space-x-3">
              <Globe className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Netlifyデプロイについて</p>
                <p>このツールを使用すると、現在のプロジェクトをNetlifyに自動的にデプロイできます。デプロイが完了すると、公開URLが提供されます。</p>
              </div>
            </div>
          </div>
          
          {deploymentStatus ? (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">最新のデプロイ情報</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">ステータス:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(deploymentStatus.status)}`}>
                      {getStatusLabel(deploymentStatus.status)}
                    </span>
                  </div>
                  
                  {deploymentStatus.deploy_url && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">公開URL:</span>
                      <div className="flex items-center space-x-2">
                        <a 
                          href={deploymentStatus.deploy_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                        >
                          {deploymentStatus.deploy_url.replace(/^https?:\/\//, '')}
                          <ExternalLink className="w-3 h-3 ml-1" />
                        </a>
                        <button
                          onClick={() => copyToClipboard(deploymentStatus.deploy_url)}
                          className="text-gray-500 hover:text-gray-700"
                          title="URLをコピー"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {deploymentStatus.claim_url && !deploymentStatus.claimed && (
                    <div className="mt-2">
                      <a 
                        href={deploymentStatus.claim_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                      >
                        Netlifyでサイトを管理する
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex space-x-3">
                <Button
                  onClick={refreshStatus}
                  variant="secondary"
                  isLoading={isCheckingStatus}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  ステータスを更新
                </Button>
                
                <Button
                  onClick={handleDeploy}
                  isLoading={isDeploying}
                  disabled={['building', 'enqueued', 'processing'].includes(deploymentStatus.status)}
                >
                  <Globe className="w-4 h-4 mr-2" />
                  再デプロイ
                </Button>
                
                <Button
                  onClick={() => navigate('/deployment-history')}
                  variant="secondary"
                >
                  <History className="w-4 h-4 mr-2" />
                  デプロイ履歴
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Button
                onClick={handleDeploy}
                isLoading={isDeploying}
                className="w-full"
              >
                <Globe className="w-4 h-4 mr-2" />
                Netlifyにデプロイ
              </Button>
              
              <Button
                onClick={checkDeployStatus}
                variant="secondary"
                isLoading={isCheckingStatus}
                className="w-full"
              >
                <Clock className="w-4 h-4 mr-2" />
                デプロイステータスを確認
              </Button>
            </div>
          )}
          
          {copied && (
            <div className="text-center text-sm text-green-600">
              URLをコピーしました！
            </div>
          )}
        </div>
      </Card>

      <Card className="p-6 bg-gray-50">
        <h3 className="font-semibold mb-4">デプロイについての注意事項</h3>
        <div className="text-sm text-gray-700 space-y-2">
          <p>• デプロイには数分かかる場合があります</p>
          <p>• デプロイが完了すると、公開URLが提供されます</p>
          <p>• Netlifyアカウントをお持ちの場合は、サイトを自分のアカウントに移行できます</p>
          <p>• 環境変数は自動的に設定されます</p>
          <p>• 問題が発生した場合は、Netlifyダッシュボードで詳細を確認してください</p>
        </div>
      </Card>
    </div>
  );
}

function safeRemoveItem(key: string) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
    }
  } catch (e) {
    console.warn('Error removing item from localStorage:', e);
  }
}