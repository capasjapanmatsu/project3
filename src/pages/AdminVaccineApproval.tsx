import {
    AlertTriangle,
    CheckCircle,
    Dog,
    Eye,
    FileText,
    Mail,
    MapPin,
    Phone,
    User,
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
  const [pendingApplications, setPendingApplications] = useState<VaccineApplication[]>([]);
  const [approvedApplications, setApprovedApplications] = useState<VaccineApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'pending' | 'approved'>('pending');
  const [selectedApplication, setSelectedApplication] = useState<VaccineApplication | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }
    fetchApplications();
  }, [isAdmin, navigate]);

  useEffect(() => {
    if (applications.length > 0) {
      separateApplications();
    }
  }, [applications]);

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

  const separateApplications = () => {
    const pending = applications.filter(app => app.status === 'pending');
    const approved = applications.filter(app => app.status === 'approved');
    
    setPendingApplications(pending);
    setApprovedApplications(approved);
  };

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
        rabies_vaccine_image: item.rabies_vaccine_image || '',
        combo_vaccine_image: item.combo_vaccine_image || '',
        rabies_expiry_date: item.rabies_expiry_date || '',
        combo_expiry_date: item.combo_expiry_date || '',
        status: item.status || 'pending',
        created_at: item.created_at,
        admin_notes: item.admin_notes || ''
      }));

      setApplications(formattedApplications);
      
    } catch (error) {
      console.error('❌ ワクチン証明書申請の取得に失敗しました:', error);
      showError('ワクチン証明書申請の取得に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (applicationId: string) => {
    const confirmApprove = window.confirm('このワクチン証明書申請を承認してもよろしいですか？');
    if (!confirmApprove) return;

    try {
      setActionLoading(true);
      setError('');
      setSuccess('');

      // データベースを更新
      const { error: updateError } = await supabase
        .from('vaccine_certifications')
        .update({ 
          status: 'approved',
          approved_at: new Date().toISOString()
        })
        .eq('id', applicationId);

      if (updateError) throw updateError;

      // 承認されたアプリケーションの情報を取得
      const application = applications.find(app => app.id === applicationId);
      if (application) {
        // 通知タイプ制約に合わせて既存タイプを使用
        await supabase.from('notifications').insert([
          {
            user_id: application.owner_id,
            title: 'ワクチン証明書承認',
            message: `${application.dog_name}ちゃんのワクチン証明書が承認されました。`,
            type: 'vaccine_approval_required',
            created_at: new Date().toISOString(),
            read: false,
            link_url: '/dashboard'
          }
        ]);
      }

      showSuccess('ワクチン証明書を承認しました。');
      
      // 承認後にリストを更新
      setApplications(prevApps => 
        prevApps.map(app => 
          app.id === applicationId 
            ? { ...app, status: 'approved' as const }
            : app
        )
      );

    } catch (error) {
      console.error('❌ 承認エラー:', error);
      showError('承認処理に失敗しました。');
    } finally {
      setActionLoading(false);
    }
  };

  // 却下処理（コメント必須・コミュニティメッセージ送信）
  const handleReject = async (application: VaccineApplication) => {
    const note = window.prompt('却下理由を入力してください（ユーザーに送信されます）');
    if (note === null) return; // キャンセル
    const rejectionNote = String(note).trim();
    if (!rejectionNote) { showError('却下理由を入力してください'); return; }

    try {
      setActionLoading(true);
      setError('');
      setSuccess('');

      // ステータスを申請待ち（pending）に戻す（理由はコミュニティメッセージで通知）
      const { error: updErr } = await supabase
        .from('vaccine_certifications')
        .update({ status: 'pending' })
        .eq('id', application.id);
      if (updErr) throw updErr;

      // 管理者 → 飼い主 へコミュニティメッセージ送信
      if (user?.id) {
        let receiverId = application.owner_id;
        if (!receiverId) {
          const { data: rec } = await supabase
            .from('vaccine_certifications')
            .select('dog:dogs(owner_id)')
            .eq('id', application.id)
            .single();
          receiverId = (rec as any)?.dog?.owner_id || '';
        }

        if (!receiverId) {
          showError('飼い主IDの取得に失敗しました');
        } else {
          const content = `【ワクチン証明書 却下のお知らせ】\n${application.dog_name}ちゃんのワクチン証明書は却下されました。\n理由: ${rejectionNote}\nお手数ですが、画像や有効期限をご確認のうえ再提出をお願いいたします。`;
          const { error: msgErr } = await supabase.from('messages').insert({
            sender_id: user.id,
            receiver_id: receiverId,
            content,
          });
          if (msgErr) {
            console.error('message insert error:', msgErr);
            showError('却下は反映しましたが、メッセージ送信に失敗しました');
          }
        }
      }

      // 画面更新
      setApplications(prev => prev.map(a => a.id === application.id ? { ...a, status: 'pending' as const } : a));
      showSuccess('却下（申請待ちに戻しました）し、メッセージを送信しました');
    } catch (e) {
      console.error('❌ 却下エラー:', e);
      showError('却下処理に失敗しました');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">データを読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ヘッダー */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">ワクチン証明書 承認管理</h1>
            <p className="text-gray-600">登録されたワクチン証明書の承認・却下を管理します。</p>
          </div>
          
          {/* エラー・成功メッセージ */}
          {error && (
            <div className="px-6 py-4 bg-red-50 border-l-4 border-red-400">
              <div className="flex">
                <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}
          
          {success && (
            <div className="px-6 py-4 bg-green-50 border-l-4 border-green-400">
              <div className="flex">
                <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
                <p className="text-sm text-green-700">{success}</p>
              </div>
            </div>
          )}
          
          {/* タブナビゲーション */}
          <div className="px-6">
            <nav className="flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('pending')}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'pending'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FileText className="w-5 h-5 inline mr-2" />
                承認待ち
                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  {pendingApplications.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('approved')}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'approved'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Dog className="w-5 h-5 inline mr-2" />
                登録中のワンちゃん
                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {approvedApplications.length}
                </span>
              </button>
            </nav>
          </div>
        </div>

        {/* コンテンツ */}
        {activeTab === 'pending' && (
          <div className="space-y-6">
            {/* 承認待ち申請一覧 */}
            {pendingApplications.length === 0 ? (
              <Card className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">承認待ちのワクチン証明書申請がありません</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {pendingApplications.map((app) => (
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
                          className="bg-red-600 hover:bg-red-700 text-white"
                          onClick={() => handleReject(app)}
                          disabled={actionLoading}
                        >
                          却下
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'approved' && (
          <div className="space-y-6">
            {/* 承認済み申請一覧 */}
            {approvedApplications.length === 0 ? (
              <Card className="text-center py-12">
                <Dog className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">承認済みのワクチン証明書がありません</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {approvedApplications.map((app) => (
                  <Card key={app.id} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <Dog className="w-5 h-5 text-green-600" />
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
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
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
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ×
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">ワンちゃん情報</h3>
                    <div className="space-y-2 text-sm">
                      <div><strong>名前:</strong> {selectedApplication.dog_name}</div>
                      <div><strong>犬種:</strong> {selectedApplication.dog_breed}</div>
                      <div><strong>性別:</strong> {selectedApplication.dog_gender}</div>
                      <div><strong>年齢:</strong> {getAge(selectedApplication.dog_birth_date)}</div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">飼い主情報</h3>
                    <div className="space-y-2 text-sm">
                      <div><strong>名前:</strong> {selectedApplication.owner_name}</div>
                      <div><strong>メール:</strong> {selectedApplication.owner_email}</div>
                      {selectedApplication.owner_phone && (
                        <div><strong>電話:</strong> {selectedApplication.owner_phone}</div>
                      )}
                      {selectedApplication.owner_address && (
                        <div><strong>住所:</strong> 〒{selectedApplication.owner_postal_code} {selectedApplication.owner_address}</div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="mt-6">
                  <h3 className="font-semibold text-gray-900 mb-3">ワクチン証明書画像</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedApplication.rabies_vaccine_image && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">
                          狂犬病ワクチン
                          {selectedApplication.rabies_expiry_date && (
                            <span className="text-xs text-gray-500 ml-2">
                              (有効期限: {formatDate(selectedApplication.rabies_expiry_date)})
                            </span>
                          )}
                        </h4>
                        <div className="relative">
                          <img
                            src={selectedApplication.rabies_vaccine_image}
                            alt="狂犬病ワクチン証明書"
                            className="w-full h-48 object-cover rounded-lg border cursor-pointer"
                            onClick={() => setEnlargedImage(selectedApplication.rabies_vaccine_image!)}
                          />
                          <div className="absolute top-2 right-2">
                            <button
                              onClick={() => setEnlargedImage(selectedApplication.rabies_vaccine_image!)}
                              className="bg-black bg-opacity-50 text-white p-1 rounded-full hover:bg-opacity-70"
                            >
                              <ZoomIn className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {selectedApplication.combo_vaccine_image && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">
                          混合ワクチン
                          {selectedApplication.combo_expiry_date && (
                            <span className="text-xs text-gray-500 ml-2">
                              (有効期限: {formatDate(selectedApplication.combo_expiry_date)})
                            </span>
                          )}
                        </h4>
                        <div className="relative">
                          <img
                            src={selectedApplication.combo_vaccine_image}
                            alt="混合ワクチン証明書"
                            className="w-full h-48 object-cover rounded-lg border cursor-pointer"
                            onClick={() => setEnlargedImage(selectedApplication.combo_vaccine_image!)}
                          />
                          <div className="absolute top-2 right-2">
                            <button
                              onClick={() => setEnlargedImage(selectedApplication.combo_vaccine_image!)}
                              className="bg-black bg-opacity-50 text-white p-1 rounded-full hover:bg-opacity-70"
                            >
                              <ZoomIn className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="mt-6 text-sm text-gray-500">
                  申請日: {formatDate(selectedApplication.created_at)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 画像拡大モーダル */}
        {enlargedImage && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="relative max-w-4xl max-h-full">
              <button
                onClick={() => setEnlargedImage(null)}
                className="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-70"
              >
                ×
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
    </div>
  );
} 
