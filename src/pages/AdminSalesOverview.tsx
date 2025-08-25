import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart3, DollarSign, Users, Building } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import useAuth from '../context/AuthContext';
import { supabase } from '../utils/supabase';

type DailyPoint = { date: string; total: number };

export default function AdminSalesOverview() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalParks, setTotalParks] = useState(0);
  const [trend, setTrend] = useState<DailyPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAdmin) { navigate('/'); return; }
    void fetchSummary();
    void fetchRevenueTrend();
  }, [isAdmin, navigate]);

  const fetchSummary = async () => {
    try {
      // users count
      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      setTotalUsers(usersCount || 0);

      const { count: parksCount } = await supabase
        .from('dog_parks')
        .select('*', { count: 'exact', head: true });
      setTotalParks(parksCount || 0);
    } catch (e) {
      setError('サマリーの取得に失敗しました');
    }
  };

  const fetchRevenueTrend = async () => {
    try {
      setIsLoading(true);
      setError('');
      // 直近30日の日別売上（予約の合計金額）
      const since = new Date();
      since.setDate(since.getDate() - 29);
      const { data, error } = await supabase
        .from('reservations')
        .select('created_at,total_amount')
        .gte('created_at', since.toISOString())
        .not('total_amount', 'is', null);
      if (error) throw error;
      const bucket: Record<string, number> = {};
      for (let i = 0; i < 30; i++) {
        const d = new Date(since);
        d.setDate(since.getDate() + i);
        const key = d.toISOString().slice(0,10);
        bucket[key] = 0;
      }
      (data || []).forEach((row: any) => {
        const key = new Date(row.created_at).toISOString().slice(0,10);
        if (bucket[key] !== undefined) bucket[key] += row.total_amount || 0;
      });
      const points: DailyPoint[] = Object.entries(bucket).map(([date,total]) => ({ date, total }));
      setTrend(points);
    } catch (e) {
      console.error(e);
      setError('売上推移の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const maxY = useMemo(() => Math.max(1, ...trend.map(p => p.total)), [trend]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center space-x-4 mb-2">
        <Link to="/admin" className="flex items-center text-gray-600 hover:text-gray-800">
          <ArrowLeft className="w-4 h-4 mr-2" /> 管理者ダッシュボードに戻る
        </Link>
      </div>

      <h1 className="text-2xl font-bold">売り上げ管理</h1>

      {/* サマリー */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">ユーザー数</p>
              <p className="text-2xl font-bold">{totalUsers.toLocaleString()}</p>
            </div>
            <Users className="w-8 h-8 text-blue-600" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">ドッグラン数</p>
              <p className="text-2xl font-bold">{totalParks.toLocaleString()}</p>
            </div>
            <Building className="w-8 h-8 text-green-600" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">直近30日売上合計</p>
              <p className="text-2xl font-bold text-green-700">¥{trend.reduce((a,b)=>a+b.total,0).toLocaleString()}</p>
            </div>
            <DollarSign className="w-8 h-8 text-green-700" />
          </div>
        </Card>
      </div>

      {/* 売上推移グラフ */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center"><BarChart3 className="w-5 h-5 mr-2"/>売上推移（直近30日）</h2>
          <Link to="/admin/sales"><Button size="sm">詳細レポートへ</Button></Link>
        </div>
        {error && <div className="text-red-600 mb-3 text-sm">{error}</div>}
        <div className="w-full h-64 bg-white">
          <svg viewBox="0 0 600 240" className="w-full h-full">
            <polyline
              fill="none"
              stroke="#16a34a"
              strokeWidth="2"
              points={trend.map((p, i) => {
                const x = (i/(Math.max(1,trend.length-1))) * 580 + 10;
                const y = 230 - (p.total / maxY) * 200;
                return `${x},${y}`;
              }).join(' ')}
            />
            {trend.map((p, i) => {
              const x = (i/(Math.max(1,trend.length-1))) * 580 + 10;
              const y = 230 - (p.total / maxY) * 200;
              return <circle key={p.date} cx={x} cy={y} r={2} fill="#16a34a" />
            })}
          </svg>
        </div>
      </Card>
    </div>
  );
}


