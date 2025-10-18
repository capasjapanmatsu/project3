import { ArrowLeft, ChevronLeft, ChevronRight, Coins, PawPrint } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/Card';
import Button from '../components/Button';
import useAuth from '../context/AuthContext';
import { supabase } from '../utils/supabase';

interface LedgerRow {
  id: string;
  occurred_at: string;
  entry_type: 'earn' | 'use' | 'adjust';
  source: string;
  description: string;
  points: number;
  reference: string | null;
  reference_id: string | null;
}

export default function PointsHistory() {
  const { user, lineUser, isLineAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [monthOffset, setMonthOffset] = useState(0); // 0: 今月, -1: 先月, +1: 来月
  const [showCalendar, setShowCalendar] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const uid = user?.id || lineUser?.id;
        if (!uid) {
          setError('ログインが必要です');
          setLoading(false);
          return;
        }

        // 当日ログインボーナスを先に付与（既に付与済みなら無視されます）
        try {
          await supabase.rpc('rpc_daily_login_bonus', { p_user: uid });
        } catch {}

        const [{ data: bal }, { data: ledger, error: ledgerError }] = await Promise.all([
          supabase
            .from('points_balances')
            .select('balance')
            .eq('user_id', uid)
            .maybeSingle(),
          supabase
            .from('points_ledger')
            .select('*')
            .eq('user_id', uid)
            .order('occurred_at', { ascending: false })
        ]);

        setBalance(bal?.balance || 0);
        if (ledgerError) throw ledgerError;
        setRows((ledger as LedgerRow[]) || []);
      } catch (e) {
        setError((e as Error).message || '読み込みに失敗しました');
      } finally {
        setLoading(false);
      }
    };
    void fetchData();
  }, [user?.id, lineUser?.id, isLineAuthenticated]);

  return (
    <div className="max-w-4xl mx-auto px-4 pt-6 md:pt-8 pb-6 space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/dashboard" className="inline-flex items-center text-gray-600 hover:text-gray-800">
          <ArrowLeft className="w-4 h-4 mr-2" />
          マイページへ戻る
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 flex items-center">
        <Coins className="w-6 h-6 text-amber-600 mr-2" />
        ポイント履歴
      </h1>

      <Card className="p-4">
        <div className="text-gray-700">保有ポイント</div>
        <div className="text-3xl font-bold text-amber-600">{balance.toLocaleString()} P</div>
        <div className="mt-3">
          <Link to="/petshop">
            <Button className="bg-purple-600 hover:bg-purple-700 text-white">ペットショップへ</Button>
          </Link>
        </div>
      </Card>

      {/* ログインスタンプカレンダー（折りたたみ） */}
      <Card className="p-4">
        <button
          className="w-full text-left flex items-center justify-between"
          onClick={() => setShowCalendar((v) => !v)}
          aria-expanded={showCalendar}
          aria-controls="login-stamp-calendar"
        >
          <span className="font-semibold">ログインカレンダー（+3P）</span>
          <span className="text-sm text-gray-500">{showCalendar ? '閉じる' : '開く'}</span>
        </button>
        {showCalendar && (
          <div id="login-stamp-calendar" className="mt-3">
            <LoginStampCalendar
              rows={rows}
              monthOffset={monthOffset}
              onPrevMonth={() => setMonthOffset((v) => v - 1)}
              onNextMonth={() => setMonthOffset((v) => v + 1)}
            />
          </div>
        )}
      </Card>

      {/* スマホ対応：カード形式の履歴表示 */}
      <div className="space-y-3">
        {loading ? (
          <Card className="p-4 text-center text-gray-500">読み込み中...</Card>
        ) : error ? (
          <Card className="p-4 text-center text-red-600">{error}</Card>
        ) : rows.length === 0 ? (
          <Card className="p-4 text-center text-gray-500">履歴がありません</Card>
        ) : (
          rows.map((r) => {
            const earned = r.points > 0 ? r.points : 0;
            const used = r.points < 0 ? Math.abs(r.points) : 0;
            const isEarn = r.entry_type === 'earn';
            return (
              <Card key={r.id} className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">{r.description}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {new Date(r.occurred_at).toLocaleDateString('ja-JP')} {new Date(r.occurred_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="ml-4 text-right">
                    <div className={`text-lg font-bold ${isEarn ? 'text-green-600' : 'text-red-600'}`}>
                      {isEarn ? `+${earned}` : `-${used}`}P
                    </div>
                    <div className="text-xs text-gray-400">
                      {isEarn ? '獲得' : '使用'}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

// ログインスタンプカレンダー
function LoginStampCalendar({ rows, monthOffset, onPrevMonth, onNextMonth }: {
  rows: LedgerRow[];
  monthOffset: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}) {
  // ログイン履歴の抽出（sourceやdescriptionにloginを含む、もしくは+3P）
  const loginDates = new Set(
    rows
      .filter((r) => {
        const s = (r.source || '').toLowerCase();
        const desc = (r.description || '').toLowerCase();
        return (
          (r.entry_type === 'earn' && r.points >= 3 && (s.includes('login') || desc.includes('login') || desc.includes('ログイン'))) ||
          (r.entry_type === 'earn' && s.includes('daily_login'))
        );
      })
      .map((r) => r.occurred_at.slice(0, 10))
  );

  const base = new Date();
  const view = new Date(base.getFullYear(), base.getMonth() + monthOffset, 1);
  const year = view.getFullYear();
  const month = view.getMonth();
  const monthLabel = `${year}年${month + 1}月`;
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startIndex = firstDay.getDay(); // 0(日)〜6(土)
  const daysInMonth = lastDay.getDate();
  const todayStr = new Date().toISOString().slice(0, 10);

  const cells: Array<{ dateStr: string; inMonth: boolean } | null> = [];
  // 前方の空白
  for (let i = 0; i < startIndex; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const dateStr = date.toISOString().slice(0, 10);
    cells.push({ dateStr, inMonth: true });
  }
  // 後方の空白で6行に揃える
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <Card className="p-4">
      <style>
        {`
          @keyframes stampPop { 0% { transform: scale(0) rotate(-20deg); opacity: 0; } 60% { transform: scale(1.2) rotate(8deg); opacity: 1; } 100% { transform: scale(1) rotate(0deg); opacity: 1; } }
        `}
      </style>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">ログインカレンダー（+3P）</h2>
        <div className="flex items-center gap-1">
          <button aria-label="前の月" onClick={onPrevMonth} className="p-1 rounded hover:bg-gray-100">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-sm font-medium w-28 text-center">{monthLabel}</div>
          <button aria-label="次の月" onClick={onNextMonth} className="p-1 rounded hover:bg-gray-100">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-2 text-xs text-gray-600 mb-1">
        {['日','月','火','水','木','金','土'].map((w) => (
          <div key={w} className="text-center">{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {cells.map((c, idx) => {
          if (!c) return <div key={idx} className="h-16 bg-transparent" />;
          const stamped = loginDates.has(c.dateStr);
          const isToday = c.dateStr === todayStr;
          const d = Number(c.dateStr.slice(8, 10));
          return (
            <div key={idx} className={`h-16 rounded border ${isToday ? 'border-blue-400' : 'border-gray-200'} relative flex items-center justify-center bg-white`}>
              <span className="absolute top-1 left-1 text-[10px] text-gray-500">{d}</span>
              {stamped ? (
                <PawPrint className={`w-7 h-7 text-blue-600 opacity-90 ${isToday ? 'animate-[stampPop_400ms_ease]' : ''}`} />
              ) : (
                <PawPrint className="w-7 h-7 text-gray-200" />
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}


