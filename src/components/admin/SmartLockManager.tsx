import { useState, useEffect } from 'react';
import { Lock, Plus, Trash2, Edit2, Save, X, Key } from 'lucide-react';
import { supabase } from '../../utils/supabase';
import Button from '../Button';
import Card from '../Card';

interface DogRunLock {
  id: string;
  park_id: string;
  lock_id: string;
  lock_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  park_name?: string;
}

interface SmartLockManagerProps {
  parkId?: string;
  parkName?: string;
}

export function SmartLockManager({ parkId, parkName }: SmartLockManagerProps) {
  const [locks, setLocks] = useState<DogRunLock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    lock_id: '',
    lock_name: '',
    is_active: true
  });

  useEffect(() => {
    fetchLocks();
  }, [parkId]);

  const fetchLocks = async () => {
    try {
      setIsLoading(true);
      setError('');

      let query = supabase
        .from('dog_run_locks')
        .select(`
          *,
          dog_parks!park_id (
            name
          )
        `);

      if (parkId) {
        query = query.eq('park_id', parkId);
      }

      const { data, error: fetchError } = await query
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const formattedData = data?.map(lock => ({
        ...lock,
        park_name: lock.dog_parks?.name || 'Unknown'
      })) || [];

      setLocks(formattedData);
    } catch (err) {
      console.error('Error fetching locks:', err);
      setError('スマートロックの取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!parkId) {
      setError('ドッグランを選択してください');
      return;
    }

    if (!formData.lock_id || !formData.lock_name) {
      setError('すべての必須項目を入力してください');
      return;
    }

    try {
      setError('');
      const { error: insertError } = await supabase
        .from('dog_run_locks')
        .insert({
          park_id: parkId,
          lock_id: formData.lock_id,
          lock_name: formData.lock_name,
          is_active: formData.is_active
        });

      if (insertError) throw insertError;

      setSuccess('スマートロックを追加しました');
      setFormData({ lock_id: '', lock_name: '', is_active: true });
      setIsAdding(false);
      await fetchLocks();

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error adding lock:', err);
      setError('スマートロックの追加に失敗しました');
    }
  };

  const handleUpdate = async (id: string) => {
    const lock = locks.find(l => l.id === id);
    if (!lock) return;

    try {
      setError('');
      const { error: updateError } = await supabase
        .from('dog_run_locks')
        .update({
          lock_id: lock.lock_id,
          lock_name: lock.lock_name,
          is_active: lock.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (updateError) throw updateError;

      setSuccess('スマートロックを更新しました');
      setEditingId(null);
      await fetchLocks();

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error updating lock:', err);
      setError('スマートロックの更新に失敗しました');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('このスマートロックを削除してもよろしいですか？')) {
      return;
    }

    try {
      setError('');
      const { error: deleteError } = await supabase
        .from('dog_run_locks')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setSuccess('スマートロックを削除しました');
      await fetchLocks();

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error deleting lock:', err);
      setError('スマートロックの削除に失敗しました');
    }
  };

  const handleEditChange = (id: string, field: string, value: any) => {
    setLocks(prev => prev.map(lock => 
      lock.id === id ? { ...lock, [field]: value } : lock
    ));
  };

  if (isLoading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-indigo-600" />
            <h3 className="text-lg font-medium text-gray-900">
              スマートロック管理
              {parkName && <span className="text-sm text-gray-500 ml-2">- {parkName}</span>}
            </h3>
          </div>
          {parkId && !isAdding && (
            <Button
              onClick={() => setIsAdding(true)}
              size="sm"
              variant="primary"
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              ロック追加
            </Button>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
            {success}
          </div>
        )}

        {/* Add new lock form */}
        {isAdding && (
          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            <h4 className="font-medium text-gray-900">新しいスマートロックを追加</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ロックID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.lock_id}
                  onChange={(e) => setFormData({ ...formData, lock_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Sciener Lock ID"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ロック名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.lock_name}
                  onChange={(e) => setFormData({ ...formData, lock_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="例：正面入口"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">有効にする</span>
              </label>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleAdd}
                size="sm"
                variant="primary"
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                保存
              </Button>
              <Button
                onClick={() => {
                  setIsAdding(false);
                  setFormData({ lock_id: '', lock_name: '', is_active: true });
                }}
                size="sm"
                variant="secondary"
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                キャンセル
              </Button>
            </div>
          </div>
        )}

        {/* Locks list */}
        {!parkId ? (
          <div className="text-center py-8 text-gray-500">
            ドッグランを選択してスマートロックを管理してください
          </div>
        ) : locks.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Key className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p>スマートロックが登録されていません</p>
            <p className="text-sm mt-1">「ロック追加」ボタンから登録してください</p>
          </div>
        ) : (
          <div className="space-y-2">
            {locks.map((lock) => (
              <div
                key={lock.id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
              >
                {editingId === lock.id ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={lock.lock_id}
                        onChange={(e) => handleEditChange(lock.id, 'lock_id', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Lock ID"
                      />
                      <input
                        type="text"
                        value={lock.lock_name}
                        onChange={(e) => handleEditChange(lock.id, 'lock_name', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Lock Name"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={lock.is_active}
                          onChange={(e) => handleEditChange(lock.id, 'is_active', e.target.checked)}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-sm text-gray-700">有効</span>
                      </label>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleUpdate(lock.id)}
                          size="sm"
                          variant="primary"
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => setEditingId(null)}
                          size="sm"
                          variant="secondary"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Lock className={`h-4 w-4 ${lock.is_active ? 'text-green-600' : 'text-gray-400'}`} />
                        <span className="font-medium text-gray-900">{lock.lock_name}</span>
                        {!lock.is_active && (
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">無効</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        ID: {lock.lock_id}
                        {!parkId && <span className="ml-3">場所: {lock.park_name}</span>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setEditingId(lock.id)}
                        size="sm"
                        variant="secondary"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => handleDelete(lock.id)}
                        size="sm"
                        variant="danger"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
