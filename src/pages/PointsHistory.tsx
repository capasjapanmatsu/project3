import { ArrowLeft, Coins } from 'lucide-react';
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
        <div className="mt-3">
          <Link to="/petshop">
            <Button className="bg-purple-600 hover:bg-purple-700 text-white">ペットショップへ</Button>
          </Link>
        </div>
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


