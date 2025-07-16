import {
    AlertTriangle,
    ArrowLeft,
    CheckCircle,
    FileCheck,
    MapPin,
    Shield
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AdminParkApproval } from '../components/admin/AdminParkApproval';
import { AdminVaccineApproval } from '../components/admin/AdminVaccineApproval';
import Button from '../components/Button';
import Card from '../components/Card';
import useAuth from '../context/AuthContext';
import { useAdminData } from '../hooks/useAdminData';
import { checkAndSetAdminUser, directUpdateUserType } from '../utils/adminUtils';

export function AdminManagement() {
  const { user, isAdmin, userProfile } = useAuth();
  const navigate = useNavigate();
  
  // 状態管理
  const [activeTab, setActiveTab] = useState<'parks' | 'vaccines'>('vaccines');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // カスタムフック
  const adminData = useAdminData(activeTab);

  // メッセージ管理
  const showSuccess = (message: string) => {
    setSuccess(message);
    setError('');
    setTimeout(() => setSuccess(''), 5000);
  };

  const showError = (message: string) => {
    setError(message);
    setSuccess('');
    setTimeout(() => setError(''), 8000);
  };

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  // 管理者権限の自動設定
  useEffect(() => {
    const setupAdminUser = async () => {
      if (user?.email === 'capasjapan@gmail.com' && !isAdmin) {
        console.log('🔧 Setting up admin user...');
        
        try {
          const result = await checkAndSetAdminUser(user.email);
          if (result.success) {
            showSuccess('管理者権限を設定しました。ページを再読み込みします...');
            setTimeout(() => window.location.reload(), 1500);
          }
        } catch (error) {
          console.error('Admin setup error:', error);
        }
      }
    };

    if (user && !isAdmin) {
      setupAdminUser();
    }
  }, [user, isAdmin]);

  // 管理者権限チェックとデータ取得
  useEffect(() => {
    if (!isAdmin) {
      console.log('❌ Admin access denied - redirecting to home');
      navigate('/');
      return;
    }
    
    console.log('✅ Admin access granted - fetching data');
    adminData.refetch();
  }, [isAdmin, navigate, activeTab]);

  // 承認完了ハンドラー
  const handleApprovalComplete = async (message: string) => {
    showSuccess(message);
    await adminData.refetch(); // データを再取得
  };

  // エラーハンドラー
  const handleError = (errorMessage: string) => {
    showError(errorMessage);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center space-x-4 mb-6">
        <Link to="/admin" className="flex items-center text-blue-600 hover:text-blue-800">
          <ArrowLeft className="w-4 h-4 mr-2" />
          管理者ダッシュボードに戻る
        </Link>
      </div>

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold flex items-center">
          <Shield className="w-8 h-8 text-red-600 mr-3" />
          管理者審査ページ
        </h1>
      </div>

      {/* エラー・成功メッセージ */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 rounded-lg flex items-start">
          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
          <p className="text-red-800">{error}</p>
        </div>
      )}
      
      {success && (
        <div className="mb-6 p-4 bg-green-50 rounded-lg flex items-start">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
          <p className="text-green-800">{success}</p>
        </div>
      )}

      {/* 管理者権限確認セクション */}
      {!isAdmin && (
        <Card className="p-4 bg-red-50 border-l-4 border-red-500">
          <h3 className="font-semibold mb-3 text-red-900">❌ 管理者権限が必要です</h3>
          <div className="text-sm text-red-800 space-y-2">
            <p><strong>ユーザー情報:</strong></p>
            <p>• Email: {user?.email || 'なし'}</p>
            <p>• User Type: {userProfile?.user_type || 'undefined'}</p>
            <p>• Is Admin: {isAdmin ? 'true' : 'false'}</p>
            
            {user?.email === 'capasjapan@gmail.com' && (
              <div className="mt-4 space-x-2">
                <Button
                  size="sm"
                  onClick={async () => {
                    clearMessages();
                    try {
                      const result = await checkAndSetAdminUser(user.email || '');
                      if (result.success) {
                        showSuccess('管理者権限を設定しました。ページを再読み込みします...');
                        setTimeout(() => window.location.reload(), 1500);
                      } else {
                        showError(`管理者権限の設定に失敗: ${result.error}`);
                      }
                    } catch (error) {
                      showError(`エラーが発生しました: ${(error as Error).message}`);
                    }
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  管理者権限を設定
                </Button>
                <Button
                  size="sm"
                  onClick={async () => {
                    clearMessages();
                    if (!user?.id) {
                      showError('ユーザーIDが見つかりません');
                      return;
                    }
                    
                    try {
                      const result = await directUpdateUserType(user.id);
                      if (result.success) {
                        showSuccess('プロファイルを更新しました。ページを再読み込みします...');
                        setTimeout(() => window.location.reload(), 1500);
                      } else {
                        showError(`プロファイル更新に失敗: ${result.error}`);
                      }
                    } catch (error) {
                      showError(`エラーが発生しました: ${(error as Error).message}`);
                    }
                  }}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  直接更新
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* 管理者権限がある場合のメインコンテンツ */}
      {isAdmin && (
        <>
          {/* タブナビゲーション */}
          <div className="flex space-x-4 border-b">
            <button
              className={`px-4 py-2 font-medium ${
                activeTab === 'parks'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('parks')}
            >
              <MapPin className="w-4 h-4 inline mr-2" />
              ドッグラン審査
            </button>
            <button
              className={`px-4 py-2 font-medium ${
                activeTab === 'vaccines'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('vaccines')}
            >
              <FileCheck className="w-4 h-4 inline mr-2" />
              ワクチン証明書審査
            </button>
          </div>

          {/* タブコンテンツ */}
          <div className="mt-6">
            {activeTab === 'parks' && (
              <AdminParkApproval
                pendingParks={adminData.pendingParks}
                isLoading={adminData.isLoading}
                onApprovalComplete={handleApprovalComplete}
                onError={handleError}
              />
            )}

            {activeTab === 'vaccines' && (
              <AdminVaccineApproval
                pendingVaccines={adminData.pendingVaccines}
                isLoading={adminData.isLoading}
                onApprovalComplete={handleApprovalComplete}
                onError={handleError}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}