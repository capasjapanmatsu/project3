import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  X, 
  Eye, 
  FileCheck, 
  Building,
  MessageSquare,
  ArrowLeft,
  Clock,
  Users,
  Calendar
} from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import { supabase } from '../utils/supabase';
import type { DogPark, VaccineCertification, Dog, Profile } from '../types';

interface TaskStats {
  pendingVaccines: number;
  pendingParks: number;
  unreadMessages: number;
  pendingUsers: number;
}

interface VaccineWithDog extends VaccineCertification {
  dog: Dog & {
    owner: Profile;
  };
}

export function AdminTasks() {
  const [searchParams] = useSearchParams();
  const [stats, setStats] = useState<TaskStats>({
    pendingVaccines: 0,
    pendingParks: 0,
    unreadMessages: 0,
    pendingUsers: 0
  });
  const [pendingVaccines, setPendingVaccines] = useState<VaccineWithDog[]>([]);
  const [pendingParks, setPendingParks] = useState<DogPark[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'vaccines' | 'parks' | 'messages'>('overview');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // URLパラメータからタブを設定
    const tab = searchParams.get('tab');
    if (tab && ['overview', 'vaccines', 'parks', 'messages'].includes(tab)) {
      setActiveTab(tab as 'overview' | 'vaccines' | 'parks' | 'messages');
    }
    
    fetchTaskData();
  }, [searchParams]);

  const fetchTaskData = async () => {
    try {
      setIsLoading(true);
      
      // 承認待ちワクチン証明書を取得
      const { data: vaccineData, error: vaccineError } = await supabase
        .from('vaccine_certifications')
        .select(`
          *,
          dog:dogs(
            *,
            owner:profiles(*)
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (vaccineError) throw vaccineError;

      // 承認待ちドッグランを取得
      const { data: parkData, error: parkError } = await supabase
        .from('dog_parks')
        .select('*')
        .in('status', ['pending', 'second_stage_review'])
        .order('created_at', { ascending: true });

      if (parkError) throw parkError;

      setPendingVaccines(vaccineData || []);
      setPendingParks(parkData || []);

      // 統計を更新
      setStats({
        pendingVaccines: vaccineData?.length || 0,
        pendingParks: parkData?.length || 0,
        unreadMessages: 0, // 今後実装
        pendingUsers: 0 // 今後実装
      });

    } catch (error) {
      console.error('Error fetching task data:', error);
      setError('タスクデータの取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVaccineApproval = async (vaccineId: string, approved: boolean) => {
    setIsProcessing(true);
    setError('');
    setSuccess('');

    try {
      const vaccine = pendingVaccines.find(v => v.id === vaccineId);
      if (!vaccine) throw new Error('ワクチン証明書が見つかりません');

      // ワクチン証明書のステータスを更新
      const { error: updateError } = await supabase
        .from('vaccine_certifications')
        .update({ 
          status: approved ? 'approved' : 'rejected',
          reviewed_at: new Date().toISOString()
        })
        .eq('id', vaccineId);

      if (updateError) throw updateError;

      // 通知を送信
      const { error: notifyError } = await supabase
        .from('notifications')
        .insert([{
          user_id: vaccine.dog.owner.id,
          type: 'vaccine_review',
          title: approved ? 'ワクチン証明書が承認されました' : 'ワクチン証明書について',
          message: approved 
            ? `${vaccine.dog.name}のワクチン証明書が承認されました。ドッグランのご利用が可能になりました。`
            : `${vaccine.dog.name}のワクチン証明書の確認が必要です。マイページから再度アップロードしてください。`,
          data: { vaccine_id: vaccineId, dog_id: vaccine.dog_id }
        }]);

      if (notifyError) throw notifyError;

      setSuccess(`ワクチン証明書を${approved ? '承認' : '却下'}しました`);
      await fetchTaskData();

    } catch (error) {
      console.error('Error processing vaccine:', error);
      setError('ワクチン証明書の処理に失敗しました');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleParkApproval = async (parkId: string, approved: boolean) => {
    setIsProcessing(true);
    setError('');
    setSuccess('');

    try {
      const park = pendingParks.find(p => p.id === parkId);
      if (!park) throw new Error('ドッグランが見つかりません');

      let newStatus = '';
      if (approved) {
        newStatus = park.status === 'pending' ? 'first_stage_passed' : 'qr_testing';
      } else {
        newStatus = 'rejected';
      }

      // ドッグランのステータスを更新
      const { error: updateError } = await supabase
        .from('dog_parks')
        .update({ 
          status: newStatus,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', parkId);

      if (updateError) throw updateError;

      // 通知を送信
      const { error: notifyError } = await supabase
        .from('notifications')
        .insert([{
          user_id: park.owner_id,
          type: 'park_review',
          title: approved ? '審査結果のお知らせ' : '審査結果について',
          message: approved 
            ? `${park.name}の審査が通過しました。${park.status === 'pending' ? '詳細情報の入力にお進みください。' : 'QRコード実証検査の準備に入ります。'}`
            : `${park.name}の審査が不通過となりました。詳細はダッシュボードをご確認ください。`,
          data: { park_id: parkId }
        }]);

      if (notifyError) throw notifyError;

      setSuccess(`ドッグランを${approved ? '承認' : '却下'}しました`);
      await fetchTaskData();

    } catch (error) {
      console.error('Error processing park:', error);
      setError('ドッグランの処理に失敗しました');
    } finally {
      setIsProcessing(false);
    }
  };

  const getTotalTasks = () => {
    return stats.pendingVaccines + stats.pendingParks + stats.unreadMessages + stats.pendingUsers;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

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
        <div>
          <h1 className="text-2xl font-bold flex items-center">
            <AlertTriangle className="w-8 h-8 text-red-600 mr-3" />
            緊急対応タスク
          </h1>
          <p className="text-gray-600">承認待ちの項目を確認・処理してください</p>
        </div>
        <div className="text-sm text-gray-500">
          合計タスク数: {getTotalTasks()}件
        </div>
      </div>

      {/* エラー・成功メッセージ */}
      {error && (
        <div className="bg-red-100 border border-red-300 text-red-800 rounded-lg p-4 flex items-start">
          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}
      
      {success && (
        <div className="bg-green-100 border border-green-300 text-green-800 rounded-lg p-4 flex items-start">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
          <p>{success}</p>
        </div>
      )}

      {/* タスク概要カード */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card 
          className={`p-6 cursor-pointer transition-all ${activeTab === 'vaccines' ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:shadow-lg'}`}
          onClick={() => setActiveTab('vaccines')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">ワクチン証明書</p>
              <p className="text-2xl font-bold text-red-600">{stats.pendingVaccines}</p>
              <p className="text-xs text-gray-500">承認待ち</p>
            </div>
            <FileCheck className="w-8 h-8 text-red-600" />
          </div>
        </Card>

        <Card 
          className={`p-6 cursor-pointer transition-all ${activeTab === 'parks' ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:shadow-lg'}`}
          onClick={() => setActiveTab('parks')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">ドッグラン審査</p>
              <p className="text-2xl font-bold text-orange-600">{stats.pendingParks}</p>
              <p className="text-xs text-gray-500">審査待ち</p>
            </div>
            <Building className="w-8 h-8 text-orange-600" />
          </div>
        </Card>

        <Card 
          className={`p-6 cursor-pointer transition-all ${activeTab === 'messages' ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:shadow-lg'}`}
          onClick={() => setActiveTab('messages')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">お問い合わせ</p>
              <p className="text-2xl font-bold text-purple-600">{stats.unreadMessages}</p>
              <p className="text-xs text-gray-500">未読</p>
            </div>
            <MessageSquare className="w-8 h-8 text-purple-600" />
          </div>
        </Card>

        <Card 
          className={`p-6 cursor-pointer transition-all ${activeTab === 'overview' ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:shadow-lg'}`}
          onClick={() => setActiveTab('overview')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">全体概要</p>
              <p className="text-2xl font-bold text-blue-600">{getTotalTasks()}</p>
              <p className="text-xs text-gray-500">総タスク数</p>
            </div>
            <Shield className="w-8 h-8 text-blue-600" />
          </div>
        </Card>
      </div>

      {/* タスク詳細 */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">タスク概要</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium mb-3">優先度の高いタスク</h3>
                <div className="space-y-2">
                  {stats.pendingVaccines > 0 && (
                    <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <FileCheck className="w-4 h-4 text-red-600" />
                        <span className="text-sm">ワクチン証明書承認</span>
                      </div>
                      <span className="text-sm font-medium text-red-600">{stats.pendingVaccines}件</span>
                    </div>
                  )}
                  {stats.pendingParks > 0 && (
                    <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Building className="w-4 h-4 text-orange-600" />
                        <span className="text-sm">ドッグラン審査</span>
                      </div>
                      <span className="text-sm font-medium text-orange-600">{stats.pendingParks}件</span>
                    </div>
                  )}
                  {stats.unreadMessages > 0 && (
                    <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <MessageSquare className="w-4 h-4 text-purple-600" />
                        <span className="text-sm">お問い合わせ対応</span>
                      </div>
                      <span className="text-sm font-medium text-purple-600">{stats.unreadMessages}件</span>
                    </div>
                  )}
                  {getTotalTasks() === 0 && (
                    <div className="text-center py-8">
                      <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
                      <p className="text-gray-600">すべてのタスクが完了しています</p>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <h3 className="font-medium mb-3">処理時間の目安</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4" />
                    <span>ワクチン証明書: 2-3分/件</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4" />
                    <span>ドッグラン審査: 5-10分/件</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4" />
                    <span>お問い合わせ: 3-5分/件</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'vaccines' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">ワクチン証明書承認待ち</h2>
            <div className="text-sm text-gray-500">
              {stats.pendingVaccines}件の承認待ち
            </div>
          </div>

          {pendingVaccines.length === 0 ? (
            <Card className="text-center py-12">
              <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <p className="text-gray-600">承認待ちのワクチン証明書はありません</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {pendingVaccines.map((vaccine) => (
                <Card key={vaccine.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <h3 className="font-semibold">{vaccine.dog.name}</h3>
                        <span className="text-sm text-gray-500">
                          飼い主: {vaccine.dog.owner.name}
                        </span>
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                          承認待ち
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">犬種: {vaccine.dog.breed}</p>
                          <p className="text-gray-600">性別: {vaccine.dog.gender}</p>
                          <p className="text-gray-600">
                            申請日: {new Date(vaccine.created_at).toLocaleDateString('ja-JP')}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">
                            狂犬病ワクチン期限: {vaccine.rabies_expiry_date ? new Date(vaccine.rabies_expiry_date).toLocaleDateString('ja-JP') : '未設定'}
                          </p>
                          <p className="text-gray-600">
                            混合ワクチン期限: {vaccine.combo_expiry_date ? new Date(vaccine.combo_expiry_date).toLocaleDateString('ja-JP') : '未設定'}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2 ml-4">
                      <Link to={`/admin/management?tab=vaccines&vaccine=${vaccine.id}`}>
                        <Button size="sm" variant="secondary">
                          <Eye className="w-4 h-4 mr-1" />
                          詳細
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        onClick={() => handleVaccineApproval(vaccine.id, true)}
                        className="bg-green-600 hover:bg-green-700"
                        disabled={isProcessing}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        承認
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleVaccineApproval(vaccine.id, false)}
                        className="bg-red-600 hover:bg-red-700"
                        disabled={isProcessing}
                      >
                        <X className="w-4 h-4 mr-1" />
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

      {activeTab === 'parks' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">ドッグラン審査待ち</h2>
            <div className="text-sm text-gray-500">
              {stats.pendingParks}件の審査待ち
            </div>
          </div>

          {pendingParks.length === 0 ? (
            <Card className="text-center py-12">
              <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <p className="text-gray-600">審査待ちのドッグランはありません</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {pendingParks.map((park) => (
                <Card key={park.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <h3 className="font-semibold">{park.name}</h3>
                        <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                          {park.status === 'pending' ? '第一審査待ち' : '第二審査待ち'}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">住所: {park.address}</p>
                          <p className="text-gray-600">料金: ¥{park.price}/時間</p>
                        </div>
                        <div>
                          <p className="text-gray-600">
                            申請日: {new Date(park.created_at).toLocaleDateString('ja-JP')}
                          </p>
                          <p className="text-gray-600">
                            審査段階: {park.status === 'pending' ? '第一審査' : '第二審査'}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2 ml-4">
                      <Link to={`/admin/management?tab=parks&park=${park.id}`}>
                        <Button size="sm" variant="secondary">
                          <Eye className="w-4 h-4 mr-1" />
                          詳細
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        onClick={() => handleParkApproval(park.id, true)}
                        className="bg-green-600 hover:bg-green-700"
                        disabled={isProcessing}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        承認
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleParkApproval(park.id, false)}
                        className="bg-red-600 hover:bg-red-700"
                        disabled={isProcessing}
                      >
                        <X className="w-4 h-4 mr-1" />
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

      {activeTab === 'messages' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">お問い合わせ対応</h2>
            <div className="text-sm text-gray-500">
              {stats.unreadMessages}件の未読
            </div>
          </div>

          <Card className="text-center py-12">
            <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">お問い合わせ機能は準備中です</p>
            <p className="text-sm text-gray-500">
              現在はメールでのお問い合わせ対応となります
            </p>
          </Card>
        </div>
      )}
    </div>
  );
} 