import {
    AlertTriangle,
    CheckCircle,
    Dog,
    Eye,
    FileCheck,
    Mail,
    MapPin,
    Phone,
    User,
    XCircle,
    ZoomIn
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import useAuth from '../context/AuthContext';
import { supabase } from '../utils/supabase';

interface VaccineApplication {
  id: string;
  dog_id: string;
  dog_name: string;
  dog_breed: string;
  dog_gender: string;
  dog_birth_date: string;
  owner_id: string;
  owner_name: string;
  owner_email: string;
  owner_phone?: string;
  owner_address?: string;
  owner_postal_code?: string;
  rabies_vaccine_image?: string;
  combo_vaccine_image?: string;
  rabies_expiry_date?: string;
  combo_expiry_date?: string;
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
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);

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

      // vaccine_certifications テーブルから実際のデータを取得
      const { data: vaccineData, error: vaccineError } = await supabase
        .from('vaccine_certifications')
        .select(`
          *,
          dog:dogs (
            id,
            name,
            breed,
            gender,
            birth_date,
            owner:profiles (
              id,
              name,
              email,
              phone_number,
              address,
              postal_code
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (vaccineError) throw vaccineError;

      // データを整形
      const formattedApplications: VaccineApplication[] = (vaccineData || []).map((item: any) => ({
        id: item.id,
        dog_id: item.dog_id,
        dog_name: item.dog?.name || '不明',
        dog_breed: item.dog?.breed || '不明',
        dog_gender: item.dog?.gender || '不明',
        dog_birth_date: item.dog?.birth_date || '',
        owner_id: item.dog?.owner?.id || '',
        owner_name: item.dog?.owner?.name || '不明',
        owner_email: item.dog?.owner?.email || '不明',
        owner_phone: item.dog?.owner?.phone_number || '',
        owner_address: item.dog?.owner?.address || '',
        owner_postal_code: item.dog?.owner?.postal_code || '',
        rabies_vaccine_image: item.rabies_vaccine_image,
        combo_vaccine_image: item.combo_vaccine_image,
        rabies_expiry_date: item.rabies_expiry_date,
        combo_expiry_date: item.combo_expiry_date,
        status: item.status,
        created_at: item.created_at,
        admin_notes: item.admin_notes
      }));

      setApplications(formattedApplications);
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

      // データベースを更新
      const { error: updateError } = await supabase
        .from('vaccine_certifications')
        .update({ 
          status: 'approved',
          reviewed_at: new Date().toISOString()
        })
        .eq('id', applicationId);

      if (updateError) throw updateError;

      // 通知を送信
      const application = applications.find(app => app.id === applicationId);
      if (application) {
        const { error: notifyError } = await supabase
          .from('notifications')
          .insert([{
            user_id: application.owner_id,
            type: 'vaccine_approval',
            title: 'ワクチン証明書が承認されました',
            message: `${application.dog_name}のワクチン証明書が承認されました。ドッグランのご利用が可能になりました。`,
            data: { vaccine_id: applicationId, dog_id: application.dog_id }
          }]);

        if (notifyError) console.error('通知送信エラー:', notifyError);
      }

      // ローカル状態を更新
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

      // データベースを更新
      const { error: updateError } = await supabase
        .from('vaccine_certifications')
        .update({ 
          status: 'rejected',
          admin_notes: rejectionReason,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', applicationId);

      if (updateError) throw updateError;

      // 通知を送信
      const application = applications.find(app => app.id === applicationId);
      if (application) {
        const { error: notifyError } = await supabase
          .from('notifications')
          .insert([{
            user_id: application.owner_id,
            type: 'vaccine_rejection',
            title: 'ワクチン証明書について',
            message: `${application.dog_name}のワクチン証明書の確認が必要です。理由: ${rejectionReason}`,
            data: { vaccine_id: applicationId, dog_id: application.dog_id }
          }]);

        if (notifyError) console.error('通知送信エラー:', notifyError);
      }

      // ローカル状態を更新
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP');
  };

  const getAge = (birthDate: string) => {
    if (!birthDate) return '不明';
    const today = new Date();
    const birth = new Date(birthDate);
    const age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      return `${age - 1}歳`;
    }
    return `${age}歳`;
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
      ) : filteredApplications.length === 0 ? (
        <Card className="text-center py-12">
          <FileCheck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">
            {filter === 'all' 
              ? 'ワクチン証明書申請がありません' 
              : `${getStatusLabel(filter)}のワクチン証明書申請がありません`}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredApplications.map((app) => (
            <Card key={app.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <Dog className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-900">{app.dog_name}</h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(app.status)}`}>
                      {getStatusLabel(app.status)}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">ワンちゃん情報</h4>
                      <div className="space-y-1 text-sm text-gray-600">
                        <div>犬種: {app.dog_breed}</div>
                        <div>性別: {app.dog_gender}</div>
                        <div>年齢: {getAge(app.dog_birth_date)}</div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">飼い主情報</h4>
                      <div className="space-y-1 text-sm text-gray-600">
                        <div className="flex items-center">
                          <User className="w-4 h-4 mr-1" />
                          {app.owner_name}
                        </div>
                        <div className="flex items-center">
                          <Mail className="w-4 h-4 mr-1" />
                          {app.owner_email}
                        </div>
                        {app.owner_phone && (
                          <div className="flex items-center">
                            <Phone className="w-4 h-4 mr-1" />
                            {app.owner_phone}
                          </div>
                        )}
                        {app.owner_address && (
                          <div className="flex items-center">
                            <MapPin className="w-4 h-4 mr-1" />
                            〒{app.owner_postal_code} {app.owner_address}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-500">
                    申請日: {formatDate(app.created_at)}
                  </div>
                </div>
                
                <div className="flex space-x-2 ml-4">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setSelectedApplication(app);
                      setShowModal(true);
                    }}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    詳細
                  </Button>
                  {app.status === 'pending' && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleApprove(app.id)}
                        className="bg-green-600 hover:bg-green-700"
                        disabled={actionLoading}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        承認
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedApplication(app);
                          setShowModal(true);
                        }}
                        className="bg-red-600 hover:bg-red-700"
                        disabled={actionLoading}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        却下
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* 詳細モーダル */}
      {showModal && selectedApplication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">ワクチン証明書詳細</h2>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSelectedApplication(null);
                    setRejectionReason('');
                    setError('');
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* ワンちゃん情報 */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <Dog className="w-5 h-5 mr-2" />
                    ワンちゃん情報
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div><strong>名前:</strong> {selectedApplication.dog_name}</div>
                    <div><strong>犬種:</strong> {selectedApplication.dog_breed}</div>
                    <div><strong>性別:</strong> {selectedApplication.dog_gender}</div>
                    <div><strong>年齢:</strong> {getAge(selectedApplication.dog_birth_date)}</div>
                    <div><strong>生年月日:</strong> {selectedApplication.dog_birth_date ? formatDate(selectedApplication.dog_birth_date) : '不明'}</div>
                  </div>
                </div>

                {/* 飼い主情報 */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <User className="w-5 h-5 mr-2" />
                    飼い主情報
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div><strong>名前:</strong> {selectedApplication.owner_name}</div>
                    <div><strong>メールアドレス:</strong> {selectedApplication.owner_email}</div>
                    {selectedApplication.owner_phone && (
                      <div><strong>電話番号:</strong> {selectedApplication.owner_phone}</div>
                    )}
                    {selectedApplication.owner_address && (
                      <div><strong>住所:</strong> 〒{selectedApplication.owner_postal_code} {selectedApplication.owner_address}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* ワクチン証明書画像 */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4">ワクチン証明書</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedApplication.rabies_vaccine_image && (
                    <div>
                      <h4 className="font-medium mb-2">狂犬病ワクチン</h4>
                      <div className="relative">
                        <img
                          src={selectedApplication.rabies_vaccine_image}
                          alt="狂犬病ワクチン証明書"
                          className="w-full h-48 object-cover rounded-lg border cursor-pointer hover:opacity-80"
                          onClick={() => setEnlargedImage(selectedApplication.rabies_vaccine_image!)}
                        />
                        <button
                          onClick={() => setEnlargedImage(selectedApplication.rabies_vaccine_image!)}
                          className="absolute top-2 right-2 bg-white bg-opacity-80 p-1 rounded-full hover:bg-opacity-100"
                        >
                          <ZoomIn className="w-4 h-4" />
                        </button>
                      </div>
                      {selectedApplication.rabies_expiry_date && (
                        <p className="text-sm text-gray-600 mt-2">
                          有効期限: {formatDate(selectedApplication.rabies_expiry_date)}
                        </p>
                      )}
                    </div>
                  )}
                  
                  {selectedApplication.combo_vaccine_image && (
                    <div>
                      <h4 className="font-medium mb-2">混合ワクチン</h4>
                      <div className="relative">
                        <img
                          src={selectedApplication.combo_vaccine_image}
                          alt="混合ワクチン証明書"
                          className="w-full h-48 object-cover rounded-lg border cursor-pointer hover:opacity-80"
                          onClick={() => setEnlargedImage(selectedApplication.combo_vaccine_image!)}
                        />
                        <button
                          onClick={() => setEnlargedImage(selectedApplication.combo_vaccine_image!)}
                          className="absolute top-2 right-2 bg-white bg-opacity-80 p-1 rounded-full hover:bg-opacity-100"
                        >
                          <ZoomIn className="w-4 h-4" />
                        </button>
                      </div>
                      {selectedApplication.combo_expiry_date && (
                        <p className="text-sm text-gray-600 mt-2">
                          有効期限: {formatDate(selectedApplication.combo_expiry_date)}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* 却下理由入力（承認待ちの場合のみ） */}
              {selectedApplication.status === 'pending' && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    却下理由（却下する場合のみ入力）
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="却下理由を入力してください"
                  />
                </div>
              )}

              {/* 管理者メモ（既に却下済みの場合） */}
              {selectedApplication.status === 'rejected' && selectedApplication.admin_notes && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    却下理由
                  </label>
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-800">{selectedApplication.admin_notes}</p>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowModal(false);
                    setSelectedApplication(null);
                    setRejectionReason('');
                    setError('');
                  }}
                >
                  閉じる
                </Button>
                {selectedApplication.status === 'pending' && (
                  <>
                    <Button
                      onClick={() => handleReject(selectedApplication.id)}
                      className="bg-red-600 hover:bg-red-700"
                      disabled={actionLoading}
                    >
                      却下
                    </Button>
                    <Button
                      onClick={() => handleApprove(selectedApplication.id)}
                      className="bg-green-600 hover:bg-green-700"
                      disabled={actionLoading}
                    >
                      承認
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 画像拡大モーダル */}
      {enlargedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4 z-50">
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={() => setEnlargedImage(null)}
              className="absolute top-4 right-4 text-white hover:text-gray-300"
            >
              <XCircle className="w-8 h-8" />
            </button>
            <img
              src={enlargedImage}
              alt="拡大画像"
              className="max-w-full max-h-full object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
} 