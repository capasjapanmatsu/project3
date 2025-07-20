import { useState, useEffect } from 'react';
import { 
  Settings, 
  CheckCircle, 
  Plus, 
  Edit2, 
  Trash2, 
  Power,
  PowerOff,
  Shield
} from 'lucide-react';
import { supabase } from '../../utils/supabase';
import { useMaintenance } from '../../context/MaintenanceContext';
import Button from '../Button';
import Card from '../Card';
import Input from '../Input';
import AdminIPWhitelistManagement from './AdminIPWhitelistManagement';

interface MaintenanceSchedule {
  id: string;
  title: string;
  message: string;
  start_time: string | null;
  end_time: string | null;
  is_active: boolean;
  is_emergency: boolean;
  created_at: string;
  updated_at: string;
}

interface AdminMaintenanceManagementProps {
  onError: (error: string) => void;
  onSuccess: (message: string) => void;
}

// タイムゾーン変換ユーティリティ関数
const convertLocalDateTimeToUTC = (localDateTime: string): string | null => {
  if (!localDateTime) return null;
  
  // datetime-localの値をローカルタイムゾーンのDateオブジェクトとして作成
  const localDate = new Date(localDateTime);
  
  // UTCのISO文字列として返す
  return localDate.toISOString();
};

const convertUTCToLocalDateTime = (utcDateTime: string): string => {
  if (!utcDateTime) return '';
  
  // UTCの日時をローカルタイムゾーンに変換
  const utcDate = new Date(utcDateTime);
  
  // datetime-local入力フィールド用の形式（YYYY-MM-DDTHH:mm）に変換
  const localDateTime = new Date(utcDate.getTime() - utcDate.getTimezoneOffset() * 60000);
  return localDateTime.toISOString().slice(0, 16);
};

const AdminMaintenanceManagement = ({ onError, onSuccess }: AdminMaintenanceManagementProps) => {
  const { refreshMaintenanceStatus, isMaintenanceActive, maintenanceInfo } = useMaintenance();
  const [schedules, setSchedules] = useState<MaintenanceSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<MaintenanceSchedule | null>(null);
  const [activeTab, setActiveTab] = useState<'schedules' | 'whitelist'>('schedules');
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    start_time: '',
    end_time: '',
    is_emergency: false,
  });

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('maintenance_schedules')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        onError(`メンテナンス予定の取得に失敗しました: ${error.message}`);
        return;
      }

      setSchedules(data || []);
    } catch (_err) {
      onError('メンテナンス予定の取得中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.message) {
      onError('タイトルとメッセージは必須です');
      return;
    }

    try {
      const data = {
        title: formData.title,
        message: formData.message,
        start_time: convertLocalDateTimeToUTC(formData.start_time),
        end_time: convertLocalDateTimeToUTC(formData.end_time),
        is_emergency: formData.is_emergency,
      };

      if (editingSchedule) {
        const { error } = await supabase
          .from('maintenance_schedules')
          .update(data)
          .eq('id', editingSchedule.id);

        if (error) {
          onError(`メンテナンス予定の更新に失敗しました: ${error.message}`);
          return;
        }

        onSuccess('メンテナンス予定を更新しました');
      } else {
        const { error } = await supabase
          .from('maintenance_schedules')
          .insert([data]);

        if (error) {
          onError(`メンテナンス予定の作成に失敗しました: ${error.message}`);
          return;
        }

        onSuccess('メンテナンス予定を作成しました');
      }

      setFormData({
        title: '',
        message: '',
        start_time: '',
        end_time: '',
        is_emergency: false,
      });
      setShowCreateForm(false);
      setEditingSchedule(null);
      await fetchSchedules();
    } catch (_err) {
      onError('メンテナンス予定の保存中にエラーが発生しました');
    }
  };

  const handleToggleActive = async (schedule: MaintenanceSchedule) => {
    try {
      const { error } = await supabase
        .from('maintenance_schedules')
        .update({ is_active: !schedule.is_active })
        .eq('id', schedule.id);

      if (error) {
        onError(`メンテナンス状態の変更に失敗しました: ${error.message}`);
        return;
      }

      onSuccess(`メンテナンスを${schedule.is_active ? '無効' : '有効'}にしました`);
      await fetchSchedules();
      await refreshMaintenanceStatus();
    } catch (_err) {
      onError('メンテナンス状態の変更中にエラーが発生しました');
    }
  };

  const handleEdit = (schedule: MaintenanceSchedule) => {
    setEditingSchedule(schedule);
    setFormData({
      title: schedule.title,
      message: schedule.message,
      start_time: convertUTCToLocalDateTime(schedule.start_time || ''),
      end_time: convertUTCToLocalDateTime(schedule.end_time || ''),
      is_emergency: schedule.is_emergency,
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (scheduleId: string) => {
    if (!confirm('このメンテナンス予定を削除しますか？')) return;

    try {
      const { error } = await supabase
        .from('maintenance_schedules')
        .delete()
        .eq('id', scheduleId);

      if (error) {
        onError(`メンテナンス予定の削除に失敗しました: ${error.message}`);
        return;
      }

      onSuccess('メンテナンス予定を削除しました');
      await fetchSchedules();
      await refreshMaintenanceStatus();
    } catch (_err) {
      onError('メンテナンス予定の削除中にエラーが発生しました');
    }
  };

  const formatDateTime = (dateTime: string | null) => {
    if (!dateTime) return '未設定';
    return new Date(dateTime).toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Tokyo'
    });
  };

  return (
    <div className="space-y-6">
      {/* 現在のメンテナンス状態 */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-4 h-4 rounded-full ${isMaintenanceActive ? 'bg-red-500' : 'bg-green-500'}`}></div>
            <div>
              <h3 className="font-semibold">
                {isMaintenanceActive ? 'メンテナンス中' : 'サービス稼働中'}
              </h3>
              {isMaintenanceActive && maintenanceInfo && (
                <p className="text-sm text-gray-600">{maintenanceInfo.title}</p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {isMaintenanceActive ? (
              <CheckCircle className="w-5 h-5 text-red-500" />
            ) : (
              <CheckCircle className="w-5 h-5 text-green-500" />
            )}
          </div>
        </div>
      </Card>

      {/* タブナビゲーション */}
      <div className="flex space-x-4 border-b">
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === 'schedules'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('schedules')}
        >
          <Settings className="w-4 h-4 inline mr-2" />
          メンテナンス予定
        </button>
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === 'whitelist'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('whitelist')}
        >
          <Shield className="w-4 h-4 inline mr-2" />
          IPホワイトリスト
        </button>
      </div>

      {/* タブコンテンツ */}
      {activeTab === 'schedules' ? (
        <div className="space-y-6">
          {/* 新規作成ボタン */}
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">メンテナンス予定管理</h2>
            <Button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>新規作成</span>
            </Button>
          </div>

          {/* 作成・編集フォーム */}
          {showCreateForm && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">
                {editingSchedule ? 'メンテナンス予定編集' : 'メンテナンス予定作成'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    タイトル <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="例: システムメンテナンス"
                    label="タイトル"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    メッセージ <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="メンテナンス中に表示されるメッセージ"
                    className="w-full p-2 border border-gray-300 rounded-lg"
                    rows={3}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">開始時刻（日本時間）</label>
                    <Input
                      type="datetime-local"
                      value={formData.start_time}
                      onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                      label="開始時刻"
                    />
                    <p className="text-xs text-gray-500 mt-1">日本時間で入力してください</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">終了時刻（日本時間）</label>
                    <Input
                      type="datetime-local"
                      value={formData.end_time}
                      onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                      label="終了時刻"
                    />
                    <p className="text-xs text-gray-500 mt-1">日本時間で入力してください</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_emergency"
                    checked={formData.is_emergency}
                    onChange={(e) => setFormData({ ...formData, is_emergency: e.target.checked })}
                    className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                  />
                  <label htmlFor="is_emergency" className="text-sm font-medium">
                    緊急メンテナンス
                  </label>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setShowCreateForm(false);
                      setEditingSchedule(null);
                      setFormData({
                        title: '',
                        message: '',
                        start_time: '',
                        end_time: '',
                        is_emergency: false,
                      });
                    }}
                  >
                    キャンセル
                  </Button>
                  <Button type="submit">
                    {editingSchedule ? '更新' : '作成'}
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* メンテナンス予定一覧 */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">メンテナンス予定一覧</h3>
            
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="text-gray-600">読み込み中...</div>
              </div>
            ) : schedules.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                メンテナンス予定がありません
              </div>
            ) : (
              <div className="space-y-4">
                {schedules.map((schedule) => (
                  <div key={schedule.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium">{schedule.title}</h4>
                          {schedule.is_active && (
                            <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">
                              有効
                            </span>
                          )}
                          {schedule.is_emergency && (
                            <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded">
                              緊急
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{schedule.message}</p>
                        <div className="text-sm text-gray-500 mt-2">
                          <div>開始: {formatDateTime(schedule.start_time)}</div>
                          <div>終了: {formatDateTime(schedule.end_time)}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant={schedule.is_active ? 'danger' : 'success'}
                          size="sm"
                          onClick={() => handleToggleActive(schedule)}
                        >
                          {schedule.is_active ? (
                            <>
                              <PowerOff className="w-4 h-4 mr-1" />
                              無効化
                            </>
                          ) : (
                            <>
                              <Power className="w-4 h-4 mr-1" />
                              有効化
                            </>
                          )}
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleEdit(schedule)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDelete(schedule.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      ) : (
        <AdminIPWhitelistManagement onError={onError} onSuccess={onSuccess} />
      )}
    </div>
  );
};

export default AdminMaintenanceManagement; 
