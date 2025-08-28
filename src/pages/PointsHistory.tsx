import { ArrowLeft, Coins } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/Card';
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
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
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
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-2 whitespace-nowrap">取得日</th>
                <th className="text-left px-4 py-2 whitespace-nowrap">項目</th>
                <th className="text-right px-4 py-2 whitespace-nowrap">取得ポイント数</th>
                <th className="text-right px-4 py-2 whitespace-nowrap">使用ポイント</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="px-4 py-6 text-center text-gray-500" colSpan={4}>読み込み中...</td></tr>
              ) : error ? (
                <tr><td className="px-4 py-6 text-center text-red-600" colSpan={4}>{error}</td></tr>
              ) : rows.length === 0 ? (
                <tr><td className="px-4 py-6 text-center text-gray-500" colSpan={4}>履歴がありません</td></tr>
              ) : (
                rows.map((r) => {
                  const earned = r.points > 0 ? r.points : 0;
                  const used = r.points < 0 ? Math.abs(r.points) : 0;
                  return (
                    <tr key={r.id} className="border-t border-gray-100">
                      <td className="px-4 py-2 whitespace-nowrap">{new Date(r.occurred_at).toLocaleString()}</td>
                      <td className="px-4 py-2 whitespace-nowrap">{r.description}</td>
                      <td className="px-4 py-2 text-right text-green-700">{earned ? `+${earned.toLocaleString()}` : '-'}</td>
                      <td className="px-4 py-2 text-right text-red-700">{used ? `-${used.toLocaleString()}` : '-'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}


