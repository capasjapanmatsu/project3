import {
    AlertTriangle,
    CheckCircle,
    Clock,
    Globe,
    Plus,
    Power,
    Shield
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useMaintenance } from '../../context/MaintenanceContext';
import { supabase } from '../../utils/supabase';
import Button from '../Button';
import Card from '../Card';
import Input from '../Input';

interface MaintenanceSchedule {
  id: string;
  title: string;
  message: string;
  start_time: string | null;
  end_time: string | null;
  is_emergency: boolean;
  is_active: boolean;
  created_at: string;
}

interface WhitelistedIP {
  id: string;
  ip_address: string;
  description: string;
  created_at: string;
}

interface AdminMaintenanceManagementProps {
  onError: (error: string) => void;
  onSuccess: (message: string) => void;
}

const AdminMaintenanceManagement = ({ onError, onSuccess }: AdminMaintenanceManagementProps) => {
  const { 
    isMaintenanceActive, 
    maintenanceInfo, 
    loading: contextLoading, 
    refreshMaintenanceStatus,
    clientIP,
    isIPWhitelisted 
  } = useMaintenance();

  const [schedules, setSchedules] = useState<MaintenanceSchedule[]>([]);
  const [whitelistedIPs, setWhitelistedIPs] = useState<WhitelistedIP[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewScheduleForm, setShowNewScheduleForm] = useState(false);
  const [showNewIPForm, setShowNewIPForm] = useState(false);

  // フォーム状態
  const [newSchedule, setNewSchedule] = useState({
    title: '',
    message: '',
    start_time: '',
    end_time: '',
    is_emergency: false
  });

  const [newIP, setNewIP] = useState({
    ip_address: '',
    description: ''
  });

  // データを取得
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // メンテナンススケジュール取得
      const { data: scheduleData, error: scheduleError } = await supabase
        .from('maintenance_schedules')
        .select('*')
        .order('created_at', { ascending: false });

      if (scheduleError && scheduleError.code !== 'PGRST116') {
        console.error('Error fetching schedules:', scheduleError);
      } else {
        setSchedules(scheduleData || []);
      }

      // ホワイトリストIP取得
      const { data: ipData, error: ipError } = await supabase
        .from('ip_whitelist')
        .select('*')
        .order('created_at', { ascending: false });

      if (ipError && ipError.code !== 'PGRST116') {
        console.error('Error fetching IPs:', ipError);
      } else {
        setWhitelistedIPs(ipData || []);
      }

    } catch (error) {
      console.error('Error fetching maintenance data:', error);
      onError('メンテナンスデータの取得でエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  // 新しいメンテナンススケジュールを作成
  const createSchedule = async () => {
    try {
      if (!newSchedule.title || !newSchedule.message) {
        onError('タイトルとメッセージは必須です');
        return;
      }

      const { error } = await supabase
        .from('maintenance_schedules')
        .insert([{
          ...newSchedule,
          start_time: newSchedule.start_time || new Date().toISOString(),
          end_time: newSchedule.end_time || null,
          is_active: true
        }]);

      if (error) throw error;

      onSuccess('メンテナンススケジュールを作成しました');
      setShowNewScheduleForm(false);
      setNewSchedule({ title: '', message: '', start_time: '', end_time: '', is_emergency: false });
      await fetchData();
      await refreshMaintenanceStatus();
    } catch (error) {
      console.error('Error creating schedule:', error);
      onError('スケジュール作成でエラーが発生しました');
    }
  };

  // IPをホワイトリストに追加
  const addIPToWhitelist = async () => {
    try {
      if (!newIP.ip_address) {
        onError('IPアドレスは必須です');
        return;
      }

      const { error } = await supabase
        .from('ip_whitelist')
        .insert([newIP]);

      if (error) throw error;

      onSuccess('IPをホワイトリストに追加しました');
      setShowNewIPForm(false);
      setNewIP({ ip_address: '', description: '' });
      await fetchData();
    } catch (error) {
      console.error('Error adding IP:', error);
      onError('IP追加でエラーが発生しました');
    }
  };

  // メンテナンスを終了
  const endMaintenance = async (id: string) => {
    try {
      const { error } = await supabase
        .from('maintenance_schedules')
        .update({ 
          is_active: false,
          end_time: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      onSuccess('メンテナンスを終了しました');
      await fetchData();
      await refreshMaintenanceStatus();
    } catch (error) {
      console.error('Error ending maintenance:', error);
      onError('メンテナンス終了でエラーが発生しました');
    }
  };

  if (contextLoading || loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">メンテナンス設定を読み込み中...</span>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* 現在の状態 */}
      <Card className="p-6">
        <div className="flex items-center mb-4">
          <Power className="w-5 h-5 mr-2" />
          <h3 className="text-lg font-semibold">現在の状態</h3>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className={`flex items-center px-3 py-2 rounded-lg ${
            isMaintenanceActive ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
          }`}>
            {isMaintenanceActive ? (
              <>
                <AlertTriangle className="w-4 h-4 mr-2" />
                <span>メンテナンス中</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                <span>正常稼働中</span>
              </>
            )}
          </div>
          
          {clientIP && (
            <div className={`flex items-center px-3 py-2 rounded-lg ${
              isIPWhitelisted ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
            }`}>
              <Globe className="w-4 h-4 mr-2" />
              <span>IP: {clientIP}</span>
              {isIPWhitelisted && <span className="ml-1">(ホワイトリスト)</span>}
            </div>
          )}
        </div>

        {maintenanceInfo && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="font-semibold text-yellow-800">{maintenanceInfo.title}</h4>
            <p className="text-yellow-700 mt-1">{maintenanceInfo.message}</p>
            <div className="flex justify-end mt-3">
              <Button
                size="sm"
                onClick={() => void endMaintenance(maintenanceInfo.id)}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                メンテナンス終了
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* メンテナンススケジュール管理 */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Clock className="w-5 h-5 mr-2" />
            <h3 className="text-lg font-semibold">メンテナンススケジュール</h3>
          </div>
          <Button
            onClick={() => setShowNewScheduleForm(!showNewScheduleForm)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            新規作成
          </Button>
        </div>

        {showNewScheduleForm && (
          <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
            <h4 className="font-semibold mb-3">新しいメンテナンススケジュール</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="タイトル"
                value={newSchedule.title}
                onChange={(e) => setNewSchedule({ ...newSchedule, title: e.target.value })}
                placeholder="メンテナンスのタイトル"
              />
              <Input
                label="開始時刻"
                type="datetime-local"
                value={newSchedule.start_time}
                onChange={(e) => setNewSchedule({ ...newSchedule, start_time: e.target.value })}
              />
            </div>
            <div className="mt-4">
              <Input
                label="メッセージ"
                value={newSchedule.message}
                onChange={(e) => setNewSchedule({ ...newSchedule, message: e.target.value })}
                placeholder="メンテナンス内容の説明"
              />
            </div>
            <div className="mt-4">
              <Input
                label="終了時刻（オプション）"
                type="datetime-local"
                value={newSchedule.end_time}
                onChange={(e) => setNewSchedule({ ...newSchedule, end_time: e.target.value })}
              />
            </div>
            <div className="mt-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={newSchedule.is_emergency}
                  onChange={(e) => setNewSchedule({ ...newSchedule, is_emergency: e.target.checked })}
                  className="mr-2"
                />
                緊急メンテナンス
              </label>
            </div>
            <div className="flex space-x-2 mt-4">
              <Button onClick={() => void createSchedule()} className="bg-green-600 hover:bg-green-700">
                作成
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowNewScheduleForm(false)}
              >
                キャンセル
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {schedules.length === 0 ? (
            <p className="text-gray-500 text-center py-4">スケジュールがありません</p>
          ) : (
            schedules.map((schedule) => (
              <div key={schedule.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div>
                  <h4 className="font-semibold">{schedule.title}</h4>
                  <p className="text-sm text-gray-600">{schedule.message}</p>
                  <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                    <span>開始: {schedule.start_time ? new Date(schedule.start_time).toLocaleString() : '未設定'}</span>
                    {schedule.end_time && (
                      <span>終了: {new Date(schedule.end_time).toLocaleString()}</span>
                    )}
                    {schedule.is_emergency && (
                      <span className="text-red-600 font-semibold">緊急</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    schedule.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {schedule.is_active ? 'アクティブ' : '終了'}
                  </span>
                  {schedule.is_active && (
                    <Button
                      size="sm"
                      onClick={() => void endMaintenance(schedule.id)}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      終了
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* IPホワイトリスト管理 */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Shield className="w-5 h-5 mr-2" />
            <h3 className="text-lg font-semibold">IPホワイトリスト管理</h3>
          </div>
          <Button
            onClick={() => setShowNewIPForm(!showNewIPForm)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            IP追加
          </Button>
        </div>

        {showNewIPForm && (
          <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
            <h4 className="font-semibold mb-3">新しいIP追加</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="IPアドレス"
                value={newIP.ip_address}
                onChange={(e) => setNewIP({ ...newIP, ip_address: e.target.value })}
                placeholder="例: 192.168.1.1"
              />
              <Input
                label="説明"
                value={newIP.description}
                onChange={(e) => setNewIP({ ...newIP, description: e.target.value })}
                placeholder="このIPの説明"
              />
            </div>
            <div className="flex space-x-2 mt-4">
              <Button onClick={() => void addIPToWhitelist()} className="bg-green-600 hover:bg-green-700">
                追加
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowNewIPForm(false)}
              >
                キャンセル
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {whitelistedIPs.length === 0 ? (
            <p className="text-gray-500 text-center py-4">ホワイトリストにIPがありません</p>
          ) : (
            whitelistedIPs.map((ip) => (
              <div key={ip.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div>
                  <h4 className="font-semibold">{ip.ip_address}</h4>
                  <p className="text-sm text-gray-600">{ip.description}</p>
                  <p className="text-xs text-gray-500">
                    追加日: {new Date(ip.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
};

export default AdminMaintenanceManagement; 
