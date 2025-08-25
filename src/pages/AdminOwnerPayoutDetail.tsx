import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Banknote, Building, DollarSign, User, ChevronDown, ChevronRight } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import { supabase } from '../utils/supabase';
import useAuth from '../context/AuthContext';

interface ParkBreakdown {
  park_id: string;
  park_name: string;
  total_revenue: number;
  platform_fee: number;
  owner_payout: number;
}

export default function AdminOwnerPayoutDetail() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const { ownerId } = useParams();
  const [sp] = useSearchParams();
  const [ownerName, setOwnerName] = useState('');
  const [rows, setRows] = useState<ParkBreakdown[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [openParkId, setOpenParkId] = useState<string | null>(null);
  const [dailyByPark, setDailyByPark] = useState<Record<string, Array<{ date: string; total: number }>>>({});

  const year = Number(sp.get('year')) || new Date().getFullYear();
  const month = Number(sp.get('month')) || new Date().getMonth();

  useEffect(() => {
    if (!isAdmin) { navigate('/'); return; }
    void fetchData();
  }, [isAdmin, ownerId, year, month, navigate]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError('');
      if (!ownerId) return;

      // オーナー名
      const { data: ownerProfile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', ownerId)
        .single();
      setOwnerName(ownerProfile?.name || '');

      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0);
      const { data, error } = await supabase.rpc('get_monthly_revenue_by_park', {
        start_date_param: start.toISOString().split('T')[0],
        end_date_param: end.toISOString().split('T')[0]
      });
      if (error) throw error;

      const filtered = (data || []).filter((r: any) => r.owner_id === ownerId);
      const mapped: ParkBreakdown[] = filtered.map((r: any) => ({
        park_id: r.park_id,
        park_name: r.park_name,
        total_revenue: r.total_revenue,
        platform_fee: Math.round(r.total_revenue * 0.2),
        owner_payout: Math.round(r.total_revenue * 0.8),
      }));
      setRows(mapped);

      // 日毎の売上をまとめて取得（該当オーナーの全ドッグラン）
      const parkIds = mapped.map(m => m.park_id);
      if (parkIds.length > 0) {
        const start = new Date(year, month, 1);
        const end = new Date(year, month + 1, 0);
        const { data: reservations, error: resErr } = await supabase
          .from('reservations')
          .select('park_id,total_amount,created_at')
          .in('park_id', parkIds)
          .gte('created_at', start.toISOString())
          .lt('created_at', new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1).toISOString())
          .not('total_amount', 'is', null);
        if (resErr) throw resErr;

        // 月の日付配列
        const days: string[] = [];
        for (let d = 1; d <= end.getDate(); d++) {
          const dt = new Date(year, month, d).toISOString().slice(0, 10);
          days.push(dt);
        }

        const grouped: Record<string, Record<string, number>> = {};
        parkIds.forEach(pid => { grouped[pid] = {}; days.forEach(day => { grouped[pid][day] = 0; }); });
        (reservations || []).forEach((r: any) => {
          const day = new Date(r.created_at).toISOString().slice(0, 10);
          if (grouped[r.park_id] && grouped[r.park_id][day] !== undefined) {
            grouped[r.park_id][day] += r.total_amount || 0;
          }
        });

        const perPark: Record<string, Array<{ date: string; total: number }>> = {};
        Object.keys(grouped).forEach(pid => {
          perPark[pid] = days.map(day => ({ date: day, total: grouped[pid][day] || 0 }));
        });
        setDailyByPark(perPark);
      }
    } catch (e) {
      console.error(e);
      setError('明細の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const totals = useMemo(() => rows.reduce((acc, r) => {
    acc.revenue += r.total_revenue; acc.fee += r.platform_fee; acc.payout += r.owner_payout; return acc;
  }, { revenue: 0, fee: 0, payout: 0 }), [rows]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center space-x-4 mb-2">
        <Link to="/admin/revenue" className="flex items-center text-gray-600 hover:text-gray-800">
          <ArrowLeft className="w-4 h-4 mr-2" /> 売上レポートに戻る
        </Link>
      </div>

      <h1 className="text-2xl font-bold flex items-center"><User className="w-6 h-6 mr-2"/>オーナー振込明細</h1>
      <div className="text-sm text-gray-600">オーナー: {ownerName}（ID: {ownerId}） / 対象: {year}年{month + 1}月</div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4"><div className="flex items-center justify-between"><div><div className="text-sm text-gray-600">売上合計</div><div className="text-xl font-bold">¥{totals.revenue.toLocaleString()}</div></div><DollarSign className="w-6 h-6 text-green-600"/></div></Card>
        <Card className="p-4"><div className="flex items-center justify-between"><div><div className="text-sm text-gray-600">プラットフォーム手数料（20%）</div><div className="text-xl font-bold">¥{totals.fee.toLocaleString()}</div></div><Banknote className="w-6 h-6 text-blue-600"/></div></Card>
        <Card className="p-4"><div className="flex items-center justify-between"><div><div className="text-sm text-gray-600">振込金額（80%）</div><div className="text-xl font-bold">¥{totals.payout.toLocaleString()}</div></div><Building className="w-6 h-6 text-purple-600"/></div></Card>
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">ドッグラン別内訳</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ドッグラン</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">売上</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">手数料</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">振込金額</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rows.map((r) => (
                <>
                  <tr key={r.park_id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm text-gray-800 flex items-center">
                      <button className="mr-2" onClick={() => setOpenParkId(openParkId === r.park_id ? null : r.park_id)} aria-label="toggle-daily">
                        {openParkId === r.park_id ? <ChevronDown className="w-4 h-4"/> : <ChevronRight className="w-4 h-4"/>}
                      </button>
                      <Link to={`/parks/${r.park_id}`} target="_blank" className="text-blue-600 hover:text-blue-800">
                        {r.park_name}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-sm text-right">¥{r.total_revenue.toLocaleString()}</td>
                    <td className="px-4 py-2 text-sm text-right">¥{r.platform_fee.toLocaleString()}</td>
                    <td className="px-4 py-2 text-sm text-right font-medium">¥{r.owner_payout.toLocaleString()}</td>
                  </tr>
                  {openParkId === r.park_id && (
                    <tr>
                      <td colSpan={4} className="bg-gray-50 p-3">
                        <div className="overflow-x-auto">
                          <table className="min-w-full">
                            <thead>
                              <tr>
                                <th className="px-3 py-1 text-left text-xs text-gray-500">日付</th>
                                <th className="px-3 py-1 text-right text-xs text-gray-500">売上</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(dailyByPark[r.park_id] || []).map((d) => (
                                <tr key={d.date}>
                                  <td className="px-3 py-1 text-xs text-gray-700">{new Date(d.date).getMonth()+1}/{new Date(d.date).getDate()}</td>
                                  <td className="px-3 py-1 text-xs text-right">¥{(d.total || 0).toLocaleString()}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}


