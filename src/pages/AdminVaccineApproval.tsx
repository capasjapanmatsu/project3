import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileCheck, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Eye,
  Calendar,
  User,
  Dog
} from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import { supabase } from '../utils/supabase';
import useAuth from '../context/AuthContext';

interface VaccineApplication {
  id: string;
  dog_name: string;
  owner_name: string;
  vaccine_type: string;
  vaccine_date: string;
  veterinarian: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  admin_notes?: string;
}

export default function AdminVaccineApproval() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState<VaccineApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [selectedApplication, setSelectedApplication] = useState<VaccineApplication | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }
    fetchApplications();
  }, [isAdmin, navigate]);

  const fetchApplications = async () => {
    try {
      setIsLoading(true);
      setError('');

      // サンプルデータ（実際の実装では、vaccine_certificatesテーブルから取得）
      const sampleApplications: VaccineApplication[] = [
        {
          id: '1',
          dog_name: 'ポチ',
          owner_name: '田中太郎',
          vaccine_type: '狂犬病ワクチン',
          vaccine_date: '2025-07-10',
          veterinarian: '○○動物病院',
          status: 'pending',
          created_at: '2025-07-15T10:30:00Z'
        },
        {
          id: '2',
          dog_name: 'ハナ',
          owner_name: '佐藤花子',
          vaccine_type: '混合ワクチン',
          vaccine_date: '2025-07-12',
          veterinarian: '△△ペットクリニック',
          status: 'pending',
          created_at: '2025-07-15T11:00:00Z'
        }
      ];

      setApplications(sampleApplications);
    } catch (error) {
      console.error('Error fetching applications:', error);
      setError('ワクチン証明書データの取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (applicationId: string) => {
    try {
      setActionLoading(true);
      setError('');

      // 実際の実装では、ここでデータベースを更新
      console.log('Approving vaccine application:', applicationId);

      setApplications(prev => prev.map(app => 
        app.id === applicationId 
          ? { ...app, status: 'approved' as const }
          : app
      ));

      setShowModal(false);
      setSelectedApplication(null);
    } catch (error) {
      console.error('Error approving application:', error);
      setError('ワクチン証明書の承認に失敗しました');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (applicationId: string) => {
    if (!rejectionReason.trim()) {
      setError('却下理由を入力してください');
      return;
    }

    try {
      setActionLoading(true);
      setError('');

      // 実際の実装では、ここでデータベースを更新
      console.log('Rejecting vaccine application:', applicationId, rejectionReason);

      setApplications(prev => prev.map(app => 
        app.id === applicationId 
          ? { ...app, status: 'rejected' as const, admin_notes: rejectionReason }
          : app
      ));

      setShowModal(false);
      setSelectedApplication(null);
      setRejectionReason('');
    } catch (error) {
      console.error('Error rejecting application:', error);
      setError('ワクチン証明書の却下に失敗しました');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredApplications = applications.filter(app => {
    if (filter === 'all') return true;
    return app.status === filter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-50';
      case 'approved': return 'text-green-600 bg-green-50';
      case 'rejected': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return '承認待ち';
      case 'approved': return '承認済み';
      case 'rejected': return '却下';
      default: return '不明';
    }
  };

  if (!isAdmin) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <Card className="p-6">
          <div className="flex items-center justify-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mr-4" />
            <div>
              <h2 className="text-xl font-semibold text-red-700">アクセス権限がありません</h2>
              <p className="text-red-600">このページは管理者のみアクセス可能です。</p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">ワクチン証明書 承認管理</h1>
        <p className="text-gray-600">
          登録されたワクチン証明書の承認・却下を管理します。
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      )}

      {/* フィルター */}
      <div className="mb-6">
        <div className="flex space-x-4">
          {[
            { key: 'all', label: 'すべて', count: applications.length },
            { key: 'pending', label: '承認待ち', count: applications.filter(app => app.status === 'pending').length },
            { key: 'approved', label: '承認済み', count: applications.filter(app => app.status === 'approved').length },
            { key: 'rejected', label: '却下', count: applications.filter(app => app.status === 'rejected').length }
          ].map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setFilter(key as any)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {label} ({count})
            </button>
          ))}
        </div>
      </div>

      {/* 申請一覧 */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredApplications.map((application) => (
            <Card key={application.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Dog className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-lg">{application.dog_name}</h3>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(application.status)}`}>
                  {getStatusLabel(application.status)}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-600">
                  <User className="w-4 h-4 mr-2" />
                  <span>{application.owner_name}</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <FileCheck className="w-4 h-4 mr-2" />
                  <span>{application.vaccine_type}</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Calendar className="w-4 h-4 mr-2" />
                  <span>{new Date(application.vaccine_date).toLocaleDateString('ja-JP')}</span>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <button
                  onClick={() => {
                    setSelectedApplication(application);
                    setShowModal(true);
                  }}
                  className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  詳細
                </button>
                <div className="text-xs text-gray-500">
                  {new Date(application.created_at).toLocaleDateString('ja-JP')}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* 詳細モーダル */}
      {showModal && selectedApplication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">ワクチン証明書詳細</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">基本情報</h3>
                  <div className="space-y-2 text-sm">
                    <div><strong>犬の名前:</strong> {selectedApplication.dog_name}</div>
                    <div><strong>飼い主:</strong> {selectedApplication.owner_name}</div>
                    <div><strong>ワクチン種別:</strong> {selectedApplication.vaccine_type}</div>
                    <div><strong>接種日:</strong> {new Date(selectedApplication.vaccine_date).toLocaleDateString('ja-JP')}</div>
                    <div><strong>動物病院:</strong> {selectedApplication.veterinarian}</div>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-gray-900 mb-2">ステータス</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <strong>現在の状態:</strong> 
                      <span className={`ml-2 px-2 py-1 rounded-full text-xs ${getStatusColor(selectedApplication.status)}`}>
                        {getStatusLabel(selectedApplication.status)}
                      </span>
                    </div>
                    <div><strong>申請日:</strong> {new Date(selectedApplication.created_at).toLocaleDateString('ja-JP')}</div>
                    {selectedApplication.admin_notes && (
                      <div><strong>管理者メモ:</strong> {selectedApplication.admin_notes}</div>
                    )}
                  </div>
                </div>
              </div>

              {selectedApplication.status === 'pending' && (
                <div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      却下理由 (却下する場合のみ)
                    </label>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      rows={3}
                      placeholder="却下する理由を入力してください"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="flex justify-end space-x-3">
                    <Button
                      onClick={() => handleApprove(selectedApplication.id)}
                      disabled={actionLoading}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      承認する
                    </Button>
                    <Button
                      onClick={() => handleReject(selectedApplication.id)}
                      disabled={actionLoading}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      却下する
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 