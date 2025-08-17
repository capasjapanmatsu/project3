import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import useAuth from '../context/AuthContext';
import { supabase } from '../utils/supabase';

interface FacilityReservationRow {
  id: string;
  facility_id: string;
  user_id: string;
  seat_code: string | null;
  reserved_date: string; // YYYY-MM-DD
  start_time: string;    // HH:MM
  end_time: string;      // HH:MM
  guest_count: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  facility?: { name: string } | null;
}

export default function MyReservations() {
  const { user } = useAuth();
  const [rows, setRows] = useState<FacilityReservationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('facility_reservations')
          .select('*, facility:pet_facilities(name, owner_id)')
          .eq('user_id', user?.id)
          .order('reserved_date', { ascending: false });
        if (error) throw error;
        setRows(data as any[]);
      } catch (e: any) {
        setError(e?.message || '取得に失敗しました');
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id]);

  const canCancel = (r: FacilityReservationRow) => {
    // 日付と時刻を安全に合成（タイムゾーンのパース差異を排除）
    const [hh, mm] = String(r.start_time).split(':').map((v) => parseInt(v, 10));
    const base = new Date(`${r.reserved_date}T00:00:00`);
    base.setHours(isNaN(hh) ? 0 : hh, isNaN(mm) ? 0 : mm, 0, 0);
    const threshold = new Date(base.getTime() - 60 * 60 * 1000); // 開始1時間前
    return new Date().getTime() <= threshold.getTime() && r.status !== 'cancelled';
  };

  const handleCancel = async (r: FacilityReservationRow) => {
    if (!window.confirm('この予約をキャンセルしますか？\n開始1時間前までキャンセル可能です。')) return;
    if (!canCancel(r)) {
      alert('開始1時間前を過ぎているためキャンセルできません。');
      return;
    }
    try {
      setSubmitting(true);
      const { error } = await supabase
        .from('facility_reservations')
        .update({ status: 'cancelled' })
        .eq('id', r.id)
        .eq('user_id', user?.id);
      if (error) throw error;

      // 通知（ユーザー・オーナー）
      try {
        const { notifyAppAndLine } = await import('../utils/notify');
        const seatText = r.seat_code ? `座席:${r.seat_code}` : '座席:指定なし';
        const linkUser = `${window.location.origin}/my-reservations`;
        await notifyAppAndLine({ userId: user!.id, title: '予約をキャンセルしました', message: `${r.reserved_date} ${r.start_time}-${r.end_time} / ${r.guest_count}名 / ${seatText}`, linkUrl: linkUser, kind: 'reservation' });
        // オーナーにも通知
        const { data: fac } = await supabase.from('pet_facilities').select('owner_id, name').eq('id', r.facility_id).maybeSingle();
        if (fac?.owner_id) {
          const linkOwner = `${window.location.origin}/facilities/${r.facility_id}/reservations`;
          await notifyAppAndLine({ userId: fac.owner_id, title: '予約がキャンセルされました', message: `${fac.name} / ${r.reserved_date} ${r.start_time}-${r.end_time}`, linkUrl: linkOwner, kind: 'reservation' });
          await supabase.from('notifications').insert({ user_id: fac.owner_id, title: '予約がキャンセルされました', message: `${fac.name} / ${r.reserved_date} ${r.start_time}-${r.end_time}`, link_url: linkOwner, read: false, type: 'reservation_reminder', data: {} });
          // コミュニティのメッセージにも自動投稿（店舗向け）
          await supabase.from('community_messages').insert({ user_id: user!.id, facility_id: r.facility_id, content: `予約をキャンセルしました。(${r.reserved_date} ${r.start_time}-${r.end_time})`, context: 'reservation' });
        }
      } catch {}

      // ローカル更新
      setRows(prev => prev.map(x => x.id === r.id ? { ...x, status: 'cancelled' } : x));
      alert('キャンセルしました');
    } catch (e: any) {
      alert(`キャンセルに失敗しました\n${e?.message || ''}`);
    } finally {
      setSubmitting(false);
    }
  };

  // 予約者からの任意メッセージ送信は廃止（キャンセル時のみ自動メッセージを送る）

  if (loading) return <div className="p-6">読み込み中...</div>;
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-xl font-semibold mb-2">店舗予約一覧</h1>
      {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
      <Card className="p-4">
        {rows.length === 0 ? (
          <div className="text-center py-8 text-gray-600">予約はありません</div>
        ) : (
          <div className="space-y-3">
            {rows.map(r => {
              const start = `${r.reserved_date} ${r.start_time}`;
              return (
                <div key={r.id} className="p-3 border rounded-lg flex items-center justify-between">
                  <div className="text-sm text-gray-800">
                    <div className="font-semibold">{r.facility?.name || '施設'}</div>
                    <div className="text-gray-600">{start} / {r.guest_count}名 / {r.seat_code || '座席:指定なし'} / 状態: {r.status}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white" disabled={submitting} onClick={() => handleCancel(r)}>
                      キャンセル
                    </Button>
                    <Link to={`/facilities/${r.facility_id}`}><Button size="sm">店舗ページ</Button></Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* 予約者からの任意メッセージUIは非表示 */}
    </div>
  );
}


