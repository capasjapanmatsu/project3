import { useEffect, useMemo, useState } from 'react';
import Button from '../components/Button';
import Card from '../components/Card';
import useAuth from '../context/AuthContext';
import { supabase } from '../utils/supabase';

export default function SponsorPurchase() {
  const { user } = useAuth();
  const [months, setMonths] = useState(1);
  const [slot, setSlot] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [disabledMonths, setDisabledMonths] = useState<Set<number>>(new Set());
  const [selectedMonths, setSelectedMonths] = useState<Set<number>>(new Set());
  const [pricePreview, setPricePreview] = useState<{ monthly?: number; discountRate?: number; subtotal?: number; total?: number }>({});

  const discountRate = useMemo(() => {
    if (months >= 12) return 0.2;
    if (months >= 6) return 0.1;
    if (months >= 3) return 0.05;
    return 0;
  }, [months]);

  useEffect(() => {
    setError('');
  }, [months, slot]);

  // 月グリッドのラベル（今月から12カ月）
  const monthLabels = useMemo(() => {
    const arr: { label: string; start: Date; end: Date }[] = [];
    const base = new Date();
    base.setDate(1);
    for (let i = 0; i < 12; i++) {
      const start = new Date(base.getFullYear(), base.getMonth() + i, 1);
      const end = new Date(base.getFullYear(), base.getMonth() + i + 1, 0, 23, 59, 59, 999);
      const label = `${start.getMonth() + 1}月`;
      arr.push({ label, start, end });
    }
    return arr;
  }, []);

  // 指定スロットの埋まり状況を取得してチェック不可にする
  useEffect(() => {
    (async () => {
      try {
        setDisabledMonths(new Set());
        const { data, error } = await supabase
          .from('banners')
          .select('start_date,end_date,slot')
          .eq('slot', slot);
        if (error) throw error;
        const dis = new Set<number>();
        (data || []).forEach((b: any) => {
          const s = new Date(b.start_date);
          const e = new Date(b.end_date);
          monthLabels.forEach((m, idx) => {
            if (s <= m.end && e >= m.start) dis.add(idx);
          });
        });
        setDisabledMonths(dis);
        // 既存選択が埋まりと競合したら外す
        setSelectedMonths(prev => {
          const next = new Set<number>();
          prev.forEach(i => { if (!dis.has(i)) next.add(i); });
          return next;
        });
      } catch {}
    })();
  }, [slot, monthLabels]);

  // プレビュー価格（サーバー計算）を取得
  useEffect(() => {
    (async () => {
      try {
        const count = Math.max(1, selectedMonths.size || months);
        const resp = await fetch('/functions/v1/banner-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ months: count, slot, preview: true }),
          credentials: 'include',
        });
        const json = await resp.json();
        if (resp.ok) setPricePreview(json || {});
      } catch {
        setPricePreview({});
      }
    })();
  }, [selectedMonths, months, slot]);

  const startCheckout = async () => {
    setError('');
    setLoading(true);
    try {
      const count = Math.max(1, selectedMonths.size || months);
      const resp = await fetch('/functions/v1/banner-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ months: count, slot }),
        credentials: 'include',
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.error || '決済の開始に失敗しました');
      if (json?.url) {
        window.location.assign(json.url);
      } else {
        throw new Error('決済URLの生成に失敗しました');
      }
    } catch (e: any) {
      setError(e?.message || '決済の開始に失敗しました');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">スライドバナー購入</h1>
      <Card className="p-4">
        {error && <div className="mb-3 p-2 bg-red-100 text-red-700 rounded">{error}</div>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">枠（1〜5）</label>
            <select value={slot} onChange={(e)=>setSlot(Number(e.target.value))} className="border rounded px-3 py-2 w-full">
              {[1,2,3,4,5].map(n=>(<option key={n} value={n}>バナー {n}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">掲載期間（月）</label>
            <select value={months} onChange={(e)=>setMonths(Number(e.target.value))} className="border rounded px-3 py-2 w-full">
              {[1,3,6,12].map(n=>(<option key={n} value={n}>{n}カ月</option>))}
            </select>
            <p className="text-xs text-gray-500 mt-1">長期割引: 3カ月 5% / 6カ月 10% / 12カ月 20%</p>
          </div>
        </div>
        {/* 月ボックス（最大12カ月） */}
        <div className="mt-4">
          <label className="block text-sm font-medium mb-1">月を選択（最大12カ月・埋まっている月は選択不可）</label>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {monthLabels.map((m, idx) => {
              const disabled = disabledMonths.has(idx);
              const checked = selectedMonths.has(idx);
              return (
                <label key={idx} className={`border rounded px-3 py-2 text-sm cursor-pointer ${disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : checked ? 'bg-blue-600 text-white' : 'bg-white hover:bg-blue-50'}`}>
                  <input
                    type="checkbox"
                    className="mr-2 align-middle"
                    disabled={disabled}
                    checked={checked}
                    onChange={(e) => {
                      setSelectedMonths(prev => {
                        const next = new Set(prev);
                        if (e.target.checked) next.add(idx); else next.delete(idx);
                        return next;
                      });
                    }}
                  />
                  {m.label}
                </label>
              );
            })}
          </div>
          <p className="text-xs text-gray-500 mt-1">チェックした月数が購入カ月数になります（未選択時は上のプルダウンの値を使用）。</p>
        </div>
        {/* 価格プレビュー */}
        <div className="mt-4 text-sm text-gray-700">
          {pricePreview?.monthly ? (
            <>
              <div>現在の1枠の価格（目安）: {pricePreview.monthly.toLocaleString()} 円 / 月</div>
              {selectedMonths.size > 0 && (
                <div className="mt-1">選択{selectedMonths.size}カ月の概算: {pricePreview.total?.toLocaleString()} 円（割引率 {Math.round((pricePreview.discountRate || 0)*100)}%）</div>
              )}
            </>
          ) : (
            <div>現在の1枠の価格: サーバー計算時に表示されます</div>
          )}
        </div>
        <div className="mt-4">
          <Button onClick={startCheckout} isLoading={loading}>お支払いへ進む</Button>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          料金はサーバー側で計算されます（ユーザー数に応じた加算を含む）。次の画面で最終金額を確認できます。
        </p>
      </Card>
    </div>
  );
}


