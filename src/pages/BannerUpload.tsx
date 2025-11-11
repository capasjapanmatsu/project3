import { useEffect, useMemo, useState } from 'react';
import Button from '../components/Button';
import Card from '../components/Card';
import useAuth from '../context/AuthContext';
import { supabase } from '../utils/supabase';
import { useLocation } from 'react-router-dom';

export default function BannerUpload() {
  const { user } = useAuth();
  const location = useLocation();
  const [orders, setOrders] = useState<Array<any>>([]);
  const [selectedOrder, setSelectedOrder] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [link, setLink] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 初期orderIdをクエリから
  useEffect(() => {
    const sp = new URLSearchParams(location.search);
    const id = sp.get('orderId');
    if (id) setSelectedOrder(id);
  }, [location.search]);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data } = await supabase
        .from('banner_orders')
        .select('id, slot, months, status, created_at')
        .eq('user_id', user.id)
        .eq('status', 'paid')
        .order('created_at', { ascending: false });
      setOrders((data as any) || []);
    })();
  }, [user]);

  const handleSubmit = async () => {
    setError(''); setSuccess('');
    if (!user) { setError('ログインしてください'); return; }
    if (!selectedOrder) { setError('注文を選択してください'); return; }
    if (!file) { setError('バナー画像を選択してください'); return; }
    try {
      setSaving(true);
      const key = `banners/${user.id}/${Date.now()}_${file.name}`;
      const { data: up, error: upErr } = await supabase.storage.from('banner-images').upload(key, file, {
        cacheControl: '86400',
        upsert: false,
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('banner-images').getPublicUrl(up!.path);
      const now = new Date();
      const start = now.toISOString();
      const months = orders.find(o => o.id === selectedOrder)?.months || 1;
      const end = new Date(now.getTime());
      end.setMonth(end.getMonth() + months);
      // banners に登録（ホームスライダーはここを参照）
      const order = orders.find(o => o.id === selectedOrder);
      await supabase.from('banners').insert({
        image_url: pub.publicUrl,
        storage_key: up!.path,
        link_url: link || null,
        start_date: start,
        end_date: end.toISOString(),
        slot: order?.slot || 1,
      });
      setSuccess('入稿が完了しました。数分以内に反映されます。');
      setFile(null); setLink('');
    } catch (e: any) {
      setError(e?.message || '入稿に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">バナー入稿</h1>
      <Card className="p-4">
        {error && <div className="mb-3 p-2 bg-red-100 text-red-700 rounded">{error}</div>}
        {success && <div className="mb-3 p-2 bg-green-100 text-green-700 rounded">{success}</div>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">対象の注文</label>
            <select value={selectedOrder} onChange={(e)=>setSelectedOrder(e.target.value)} className="border rounded px-3 py-2 w-full">
              <option value="">選択してください</option>
              {orders.map(o => (
                <option key={o.id} value={o.id}>枠{o.slot} / {o.months}カ月（{new Date(o.created_at).toLocaleDateString()}）</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">リンク先URL（任意）</label>
            <input value={link} onChange={(e)=>setLink(e.target.value)} className="border rounded px-3 py-2 w-full" placeholder="https://..." />
          </div>
        </div>
        <div className="mt-3">
          <label className="block text-sm font-medium mb-1">バナー画像（推奨 1200×400, 1MB以内, WebP推奨）</label>
          <input type="file" accept="image/*" onChange={(e)=>setFile(e.target.files?.[0] || null)} />
        </div>
        <div className="mt-4">
          <Button onClick={handleSubmit} isLoading={saving}>入稿する</Button>
        </div>
      </Card>
    </div>
  );
}


