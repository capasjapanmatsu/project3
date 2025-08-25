import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, DollarSign } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import useAuth from '../context/AuthContext';
import { supabase } from '../utils/supabase';

export default function AdminParkRevenueDetail() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const { parkId } = useParams();
  const [sp, setSp] = useSearchParams();
  const [parkName, setParkName] = useState('');
  const year = Number(sp.get('year')) || new Date().getFullYear();
  const month = Number(sp.get('month')) || new Date().getMonth();
  const [days, setDays] = useState<Array<{ date: string; total: number; daypass_count: number; private_hours: number; subscription_count: number }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAdmin) { navigate('/'); return; }
    void fetchData();
  }, [isAdmin, parkId, year, month, navigate]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError('');
      if (!parkId) return;
      const { data: park } = await supabase.from('dog_parks').select('name').eq('id', parkId).single();
      setParkName(park?.name || '');
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0);
      const { data: res, error } = await supabase
        .from('reservations')
        .select('*')
        .eq('park_id', parkId)
        .gte('created_at', start.toISOString())
        .lt('created_at', new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1).toISOString())
        .not('total_amount', 'is', null);
      if (error) throw error;
      const map: Record<string, { total: number; daypass_count: number; private_hours: number; subscription_count: number }> = {};
      for (let d = 1; d <= end.getDate(); d++) {
        const key = new Date(year, month, d).toISOString().slice(0,10);
        map[key] = { total: 0, daypass_count: 0, private_hours: 0, subscription_count: 0 };
      }
      (res || []).forEach((r: any) => {
        const key = new Date(r.created_at).toISOString().slice(0,10);
        if (map[key] !== undefined) {
          map[key].total += r.total_amount || 0;
          const type = String((r as any).reservation_type || '').toLowerCase();
          if (type === 'daypass' || type === '1day' || type === 'day_pass') {
            map[key].daypass_count += Number((r as any).guest_count || 1);
          } else if (type === 'whole_facility' || type === 'private' || type === 'rental') {
            map[key].private_hours += Number((r as any).duration || 1);
          } else if (type === 'subscription') {
            map[key].subscription_count += 1;
          }
        }
      });
      const arr = Object.entries(map).map(([date,val]) => ({ date, ...val }));
      setDays(arr);
    } catch (e) {
      console.error(e);
      setError('データの取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const total = useMemo(() => days.reduce((s,d)=>s+d.total,0), [days]);
  const totalDaypass = useMemo(() => days.reduce((s,d)=>s+d.daypass_count,0), [days]);
  const totalPrivate = useMemo(() => days.reduce((s,d)=>s+d.private_hours,0), [days]);
  const totalSubs = useMemo(() => days.reduce((s,d)=>s+d.subscription_count,0), [days]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center space-x-4 mb-2">
        <Link to={`/admin/revenue?year=${year}&month=${month}`} className="flex items-center text-gray-600 hover:text-gray-800">
          <ArrowLeft className="w-4 h-4 mr-2"/> 売上レポートに戻る
        </Link>
      </div>
      <h1 className="text-2xl font-bold">ドッグラン売上詳細</h1>
      <div className="text-sm text-gray-600">ドッグラン: {parkName}（ID: {parkId}）</div>

      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-600">対象月</div>
            <div className="text-lg font-semibold">{year}年{month+1}月</div>
          </div>
          <div className="flex items-center gap-2">
            <select value={year} onChange={(e)=> setSp(prev=>{ prev.set('year', e.target.value); return prev;}) as any} className="px-2 py-1 border rounded">
              {[0,1,2,3].map(i=>{ const y=new Date().getFullYear()-i; return <option key={y} value={y}>{y}年</option>; })}
            </select>
            <select value={month} onChange={(e)=> setSp(prev=>{ prev.set('month', e.target.value); return prev;}) as any} className="px-2 py-1 border rounded">
              {Array.from({length:12},(_,i)=>i).map(m=> <option key={m} value={m}>{m+1}月</option>)}
            </select>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold flex items-center"><CalendarDays className="w-5 h-5 mr-2"/>日別売上</h2>
          <div className="text-sm text-gray-600 flex items-center gap-4">
            <span className="flex items-center"><DollarSign className="w-4 h-4 mr-1"/>月合計: ¥{total.toLocaleString()}</span>
            <span>1Dayパス: {totalDaypass}人</span>
            <span>貸し切り: {totalPrivate}時間</span>
            <span>サブスク: {totalSubs}人</span>
          </div>
        </div>
        {error && <div className="text-sm text-red-600 mb-2">{error}</div>}
        {isLoading ? (
          <div className="text-sm text-gray-500">読み込み中...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">日付</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">売上</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">1Day</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">貸切(h)</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">サブスク</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {days.map(d => (
                  <tr key={d.date}>
                    <td className="px-4 py-2 text-sm text-gray-800">{new Date(d.date).getMonth()+1}/{new Date(d.date).getDate()}</td>
                    <td className="px-4 py-2 text-sm text-right">¥{(d.total||0).toLocaleString()}</td>
                    <td className="px-4 py-2 text-sm text-right">{d.daypass_count || 0}</td>
                    <td className="px-4 py-2 text-sm text-right">{d.private_hours || 0}</td>
                    <td className="px-4 py-2 text-sm text-right">{d.subscription_count || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}


