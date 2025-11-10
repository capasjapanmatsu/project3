import { Plus, Save, Trash2, Upload } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import Button from '../components/Button';
import Card from '../components/Card';
import useAuth from '../context/AuthContext';
import { supabase } from '../utils/supabase';

type Banner = {
  id: string;
  image_url: string | null;
  storage_key: string | null;
  link_url: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at?: string;
};

export default function AdminBanners() {
  const { isAdmin } = useAuth();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [link, setLink] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      try {
        setLoading(true);
        setError('');
        const { data, error } = await supabase
          .from('banners')
          .select('*')
          .order('start_date', { ascending: false });
        if (error) throw error;
        setBanners((data || []) as any);
      } catch (e: any) {
        setError(e?.message || '読み込みに失敗しました（テーブルが未作成の可能性があります）');
      } finally {
        setLoading(false);
      }
    })();
  }, [isAdmin]);

  const activeCount = useMemo(() => {
    const now = Date.now();
    return banners.filter(b => {
      const s = b.start_date ? Date.parse(b.start_date) : NaN;
      const e = b.end_date ? Date.parse(b.end_date) : NaN;
      return isFinite(s) && isFinite(e) && s <= now && now <= e;
    }).length;
  }, [banners]);

  const uploadAndCreate = async () => {
    if (!file) {
      setError('画像ファイルを選択してください');
      return;
    }
    if (!start || !end) {
      setError('掲載期間（開始・終了）を設定してください');
      return;
    }
    try {
      setSaving(true);
      setError('');
      const key = `banners/${Date.now()}_${file.name}`;
      const { data: up, error: upErr } = await supabase.storage.from('banner-images').upload(key, file, {
        cacheControl: '86400',
        upsert: false,
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('banner-images').getPublicUrl(up!.path);
      const { error: insErr } = await supabase.from('banners').insert({
        image_url: pub.publicUrl,
        storage_key: up!.path,
        link_url: link || null,
        start_date: start,
        end_date: end,
      });
      if (insErr) throw insErr;
      // refresh
      const { data } = await supabase.from('banners').select('*').order('start_date', { ascending: false });
      setBanners((data || []) as any);
      // reset
      setFile(null); setLink(''); setStart(''); setEnd('');
    } catch (e: any) {
      setError(e?.message || '保存に失敗しました（ストレージやテーブルを確認してください）');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string, storageKey: string | null) => {
    if (!confirm('このバナーを削除しますか？')) return;
    try {
      await supabase.from('banners').delete().eq('id', id);
      if (storageKey) {
        try { await supabase.storage.from('banner-images').remove([storageKey]); } catch {}
      }
      const { data } = await supabase.from('banners').select('*').order('start_date', { ascending: false });
      setBanners((data || []) as any);
    } catch {}
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-6">管理者のみ利用可能です。</Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">バナー管理</h1>
        <Card className="p-4 mb-6">
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-700">
            <span>登録数: {banners.length}</span>
            <span>掲載中: {activeCount}</span>
          </div>
        </Card>

        <Card className="p-4 mb-6">
          <h2 className="font-semibold mb-3">新規バナーの登録</h2>
          {error && <div className="mb-3 p-2 bg-red-100 text-red-700 rounded">{error}</div>}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
            <div className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              <input type="file" accept="image/*" onChange={(e)=> setFile(e.target.files?.[0] || null)} />
            </div>
            <input value={link} onChange={(e)=>setLink(e.target.value)} className="border rounded px-3 py-2" placeholder="リンク先URL（任意）"/>
            <div className="flex items-center gap-2">
              <input type="datetime-local" value={start} onChange={(e)=>setStart(e.target.value)} className="border rounded px-2 py-1"/>
              <span>〜</span>
              <input type="datetime-local" value={end} onChange={(e)=>setEnd(e.target.value)} className="border rounded px-2 py-1"/>
            </div>
          </div>
          <div className="mt-3">
            <Button onClick={uploadAndCreate} isLoading={saving}><Save className="w-4 h-4 mr-2"/>保存</Button>
          </div>
        </Card>

        <Card className="p-0 overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left">サムネイル</th>
                <th className="px-3 py-2 text-left">ファイル名</th>
                <th className="px-3 py-2 text-left">リンク先</th>
                <th className="px-3 py-2 text-left">掲載期間</th>
                <th className="px-3 py-2 text-left">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr><td className="px-3 py-6" colSpan={5}>読み込み中...</td></tr>
              ) : banners.length === 0 ? (
                <tr><td className="px-3 py-6 text-gray-500" colSpan={5}>バナーがありません</td></tr>
              ) : banners.map(b => {
                const filename = b.storage_key ? b.storage_key.split('/').slice(-1)[0] : '';
                return (
                  <tr key={b.id}>
                    <td className="px-3 py-2">
                      {b.image_url ? <img src={b.image_url} alt="banner" className="w-40 h-16 object-cover rounded border"/> : <div className="w-40 h-16 bg-gray-100 rounded"/>}
                    </td>
                    <td className="px-3 py-2">{filename || '-'}</td>
                    <td className="px-3 py-2">
                      {b.link_url ? <a href={b.link_url} target="_blank" className="text-blue-600 underline" rel="noreferrer">{b.link_url}</a> : <span className="text-gray-500">-</span>}
                    </td>
                    <td className="px-3 py-2">{(b.start_date || '-')} 〜 {(b.end_date || '-')}</td>
                    <td className="px-3 py-2">
                      <button className="text-red-600 hover:text-red-800 inline-flex items-center" onClick={()=>remove(b.id, b.storage_key)}><Trash2 className="w-4 h-4 mr-1"/>削除</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}


