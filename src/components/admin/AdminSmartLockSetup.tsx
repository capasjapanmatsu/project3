import { useEffect, useState } from 'react';
import useAuth from '../../context/AuthContext';
import { supabase } from '../../utils/supabase';
import Button from '../Button';
import Card from '../Card';

type LockRow = {
  id?: string;
  park_id: string;
  lock_id: string;
  purpose: 'entry' | 'exit';
  ttlock_lock_id?: string | null;
  pin_enabled?: boolean;
};

export default function AdminSmartLockSetup({ parkId, parkName }: { parkId: string; parkName: string }) {
  const { user } = useAuth();
  const [locks, setLocks] = useState<LockRow[]>([
    { park_id: parkId, lock_id: `${parkId}-entry`, purpose: 'entry', ttlock_lock_id: '', pin_enabled: true },
    { park_id: parkId, lock_id: `${parkId}-exit`, purpose: 'exit', ttlock_lock_id: '', pin_enabled: true },
  ]);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<'entry' | 'exit' | null>(null);
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('smart_locks')
        .select('*')
        .eq('park_id', parkId)
        .order('purpose', { ascending: true });
      if (error) {
        console.warn('smart_locks load error', error);
        return;
      }
      if (Array.isArray(data) && data.length) {
        setLocks((prev) => prev.map(row => data.find(d => d.purpose === row.purpose) ? {
          ...row,
          ...data.find(d => d.purpose === row.purpose) as any,
        } : row));
      }
    };
    void load();
  }, [parkId]);

  const handleChange = (purpose: 'entry' | 'exit', field: 'lock_id' | 'ttlock_lock_id', value: string) => {
    setLocks(prev => prev.map(row => row.purpose === purpose ? { ...row, [field]: value } : row));
  };

  const ensureSupabaseSession = async () => {
    const { data } = await supabase.auth.getUser();
    if (data?.user?.id) return true;
    try {
      const resp = await fetch('/line/exchange-supabase-session', { method: 'POST', credentials: 'include' });
      if (!resp.ok) return false;
      const { access_token, refresh_token } = await resp.json();
      const set = await supabase.auth.setSession({ access_token, refresh_token });
      return Boolean(set?.data?.session?.user?.id);
    } catch {
      return false;
    }
  };

  const save = async () => {
    setSaving(true);
    setMessage('');
    try {
      const ok = await ensureSupabaseSession();
      if (!ok) throw new Error('認証セッションを確立できませんでした');
      // upsert by (park_id, purpose) 近似: 既存レコードを取得して update/insert を分岐
      for (const row of locks) {
        const lockName = `${parkName} - ${row.purpose === 'entry' ? '入場ゲート' : '退場ゲート'}`;
        // まず既存を確認して update、それ以外は insert（onConflict不要で安全）
        const { data: existing, error: findErr } = await supabase
          .from('smart_locks')
          .select('id')
          .eq('park_id', parkId)
          .eq('purpose', row.purpose)
          .maybeSingle();
        if (findErr) throw findErr;
        if (existing?.id) {
          const { error: updErr } = await supabase
            .from('smart_locks')
            .update({ lock_id: row.lock_id, ttlock_lock_id: row.ttlock_lock_id, pin_enabled: true, lock_name: lockName })
            .eq('id', existing.id as any);
          if (updErr) throw updErr;
        } else {
          const { error: insErr } = await supabase
            .from('smart_locks')
            .insert({ park_id: parkId, purpose: row.purpose, lock_id: row.lock_id, ttlock_lock_id: row.ttlock_lock_id, pin_enabled: true, lock_name: lockName });
          if (insErr) throw insErr;
        }
      }
      // 再取得してUIに反映
      const { data: refreshed, error: reloadErr } = await supabase
        .from('smart_locks')
        .select('*')
        .eq('park_id', parkId)
        .order('purpose', { ascending: true });
      if (reloadErr) throw reloadErr;
      if (refreshed && refreshed.length) {
        setLocks((prev) => prev.map(row => refreshed.find(d => d.purpose === row.purpose) ? {
          ...row,
          ...refreshed.find(d => d.purpose === row.purpose) as any,
        } : row));
      }
      setMessage('保存しました');
    } catch (e) {
      setMessage(`保存に失敗しました: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  const testUnlock = async (purpose: 'entry' | 'exit') => {
    setTesting(purpose);
    setMessage('');
    try {
      const lock = locks.find(r => r.purpose === purpose);
      if (!lock) throw new Error('ロック設定が見つかりません');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('認証が必要です');
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ttlock-unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({
          lockId: lock.lock_id,
          ttlockLockId: lock.ttlock_lock_id || undefined,
          userId: user?.id,
          purpose
        })
      });
      const body = await resp.json();
      if (!resp.ok || !body?.success) throw new Error(body?.error || '解錠に失敗しました');
      setMessage('解錠コマンドを送信しました');
    } catch (e) {
      setMessage(`テスト失敗: ${(e as Error).message}`);
    } finally {
      setTesting(null);
    }
  };

  return (
    <Card className="p-4 mt-4 border-indigo-200 bg-indigo-50">
      <h4 className="font-medium text-indigo-900 mb-3">スマートロック設定（{parkName}）</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {locks.map(row => (
          <div key={row.purpose} className="p-3 bg-white rounded border">
            <div className="text-sm text-gray-700 mb-2 font-semibold">{row.purpose === 'entry' ? '入場用' : '退場用'}</div>
            <label className="block text-xs text-gray-500 mb-1">アプリ内ロックID（任意・英数字）</label>
            <input
              className="w-full border rounded px-2 py-1 mb-2"
              value={row.lock_id}
              onChange={(e) => handleChange(row.purpose, 'lock_id', e.target.value)}
            />
            <label className="block text-xs text-gray-500 mb-1">TTLock ロックID（数値）</label>
            <input
              className="w-full border rounded px-2 py-1 mb-3"
              value={row.ttlock_lock_id ?? ''}
              onChange={(e) => handleChange(row.purpose, 'ttlock_lock_id', e.target.value)}
              placeholder="例: 163377"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => testUnlock(row.purpose)} isLoading={testing === row.purpose}>
                テスト解錠
              </Button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Button onClick={save} isLoading={saving}>保存</Button>
        {message && <span className="text-sm text-gray-700">{message}</span>}
      </div>
    </Card>
  );
}


