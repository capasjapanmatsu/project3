import { useState, useEffect } from 'react';
import { 
  Shield, 
  Plus, 
  Edit2, 
  Trash2, 
  Eye,
  EyeOff,
  Globe,
  Home
} from 'lucide-react';
import { supabase } from '../../utils/supabase';
import { useMaintenance } from '../../context/MaintenanceContext';
import Button from '../Button';
import Card from '../Card';
import Input from '../Input';

interface IPWhitelistEntry {
  id: string;
  ip_address: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface AdminIPWhitelistManagementProps {
  onError: (error: string) => void;
  onSuccess: (message: string) => void;
}

const AdminIPWhitelistManagement = ({ onError, onSuccess }: AdminIPWhitelistManagementProps) => {
  const { clientIP } = useMaintenance();
  const [entries, setEntries] = useState<IPWhitelistEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<IPWhitelistEntry | null>(null);
  const [formData, setFormData] = useState({
    ip_address: '',
    description: '',
    is_active: true,
  });

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('ip_whitelist')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        onError(`IPホワイトリストの取得に失敗しました: ${error.message}`);
        return;
      }

      setEntries(data || []);
    } catch (err) {
      onError('IPホワイトリストの取得中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.ip_address || !formData.description) {
      onError('IPアドレスと説明は必須です');
      return;
    }

    try {
      const data = {
        ip_address: formData.ip_address,
        description: formData.description,
        is_active: formData.is_active,
      };

      if (editingEntry) {
        const { error } = await supabase
          .from('ip_whitelist')
          .update(data)
          .eq('id', editingEntry.id);

        if (error) {
          onError(`IPホワイトリストの更新に失敗しました: ${error.message}`);
          return;
        }

        onSuccess('IPホワイトリストを更新しました');
      } else {
        const { error } = await supabase
          .from('ip_whitelist')
          .insert([data]);

        if (error) {
          onError(`IPホワイトリストの作成に失敗しました: ${error.message}`);
          return;
        }

        onSuccess('IPホワイトリストを作成しました');
      }

      setFormData({
        ip_address: '',
        description: '',
        is_active: true,
      });
      setShowCreateForm(false);
      setEditingEntry(null);
      await fetchEntries();
    } catch (err) {
      onError('IPホワイトリストの保存中にエラーが発生しました');
    }
  };

  const handleToggleActive = async (entry: IPWhitelistEntry) => {
    try {
      const { error } = await supabase
        .from('ip_whitelist')
        .update({ is_active: !entry.is_active })
        .eq('id', entry.id);

      if (error) {
        onError(`IPホワイトリストの状態変更に失敗しました: ${error.message}`);
        return;
      }

      onSuccess(`IPホワイトリストを${entry.is_active ? '無効' : '有効'}にしました`);
      await fetchEntries();
    } catch (err) {
      onError('IPホワイトリストの状態変更中にエラーが発生しました');
    }
  };

  const handleEdit = (entry: IPWhitelistEntry) => {
    setEditingEntry(entry);
    setFormData({
      ip_address: entry.ip_address,
      description: entry.description,
      is_active: entry.is_active,
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (entryId: string) => {
    if (!confirm('このIPホワイトリストエントリを削除しますか？')) return;

    try {
      const { error } = await supabase
        .from('ip_whitelist')
        .delete()
        .eq('id', entryId);

      if (error) {
        onError(`IPホワイトリストの削除に失敗しました: ${error.message}`);
        return;
      }

      onSuccess('IPホワイトリストを削除しました');
      await fetchEntries();
    } catch (err) {
      onError('IPホワイトリストの削除中にエラーが発生しました');
    }
  };

  const addCurrentIP = () => {
    if (clientIP) {
      setFormData({
        ip_address: `${clientIP}/32`,
        description: '現在のIPアドレス',
        is_active: true,
      });
      setShowCreateForm(true);
    }
  };

  const formatDateTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getIPTypeIcon = (ipAddress: string) => {
    if (ipAddress.includes('127.0.0.1') || ipAddress.includes('::1')) {
      return <Home className="w-4 h-4 text-blue-500" />;
    } else if (ipAddress.includes('192.168.') || ipAddress.includes('10.') || ipAddress.includes('172.')) {
      return <Shield className="w-4 h-4 text-green-500" />;
    } else {
      return <Globe className="w-4 h-4 text-orange-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* 現在のIPアドレス情報 */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Globe className="w-5 h-5 text-blue-500" />
            <div>
              <h3 className="font-semibold">現在のIPアドレス</h3>
              <p className="text-sm text-gray-600">{clientIP || '取得中...'}</p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={addCurrentIP}
            disabled={!clientIP}
          >
            <Plus className="w-4 h-4 mr-1" />
            ホワイトリストに追加
          </Button>
        </div>
      </Card>

      {/* 新規作成ボタン */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">IPホワイトリスト管理</h2>
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
            {editingEntry ? 'IPホワイトリスト編集' : 'IPホワイトリスト作成'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                IPアドレス/CIDR <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={formData.ip_address}
                onChange={(e) => setFormData({ ...formData, ip_address: e.target.value })}
                placeholder="例: 192.168.1.0/24 または 192.168.1.100/32"
                label="IPアドレス/CIDR"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                CIDR形式で入力してください。単一IPの場合は /32 を付けてください。
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                説明 <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="例: 本社オフィス"
                label="説明"
                required
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="is_active" className="text-sm font-medium">
                有効
              </label>
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingEntry(null);
                  setFormData({
                    ip_address: '',
                    description: '',
                    is_active: true,
                  });
                }}
              >
                キャンセル
              </Button>
              <Button type="submit">
                {editingEntry ? '更新' : '作成'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* IPホワイトリスト一覧 */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">IPホワイトリスト一覧</h3>
        
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="text-gray-600">読み込み中...</div>
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            IPホワイトリストエントリがありません
          </div>
        ) : (
          <div className="space-y-4">
            {entries.map((entry) => (
              <div key={entry.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      {getIPTypeIcon(entry.ip_address)}
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium">{entry.ip_address}</h4>
                          {entry.is_active && (
                            <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                              有効
                            </span>
                          )}
                          {!entry.is_active && (
                            <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">
                              無効
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{entry.description}</p>
                        <p className="text-xs text-gray-500">
                          作成: {formatDateTime(entry.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant={entry.is_active ? 'warning' : 'success'}
                      size="sm"
                      onClick={() => handleToggleActive(entry)}
                    >
                      {entry.is_active ? (
                        <>
                          <EyeOff className="w-4 h-4 mr-1" />
                          無効化
                        </>
                      ) : (
                        <>
                          <Eye className="w-4 h-4 mr-1" />
                          有効化
                        </>
                      )}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleEdit(entry)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDelete(entry.id)}
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
  );
};

export default AdminIPWhitelistManagement; 
