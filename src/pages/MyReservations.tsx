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
  const [messageTarget, setMessageTarget] = useState<FacilityReservationRow | null>(null);
  const [messageContent, setMessageContent] = useState('');
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
    const start = new Date(`${r.reserved_date}T${r.start_time}:00`);
    const threshold = new Date(start.getTime() - 60 * 60 * 1000); // 開始1時間前
    return new Date() < threshold && r.status !== 'cancelled';
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
          await supabase.from('notifications').insert({ user_id: fac.owner_id, title: '予約がキャンセルされました', message: `${fac.name} / ${r.reserved_date} ${r.start_time}-${r.end_time}`, link_url: linkOwner, read: false });
        }
        // チャットにも自動投稿
        await supabase.from('community_messages').insert({ user_id: user!.id, facility_id: r.facility_id, content: '予約をキャンセルしました。', context: 'reservation' });
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

  const handleSendMessage = async () => {
    if (!messageTarget || !messageContent.trim()) return;
    try {
      setSubmitting(true);
      await supabase.from('community_messages').insert({
        user_id: user!.id,
        facility_id: messageTarget.facility_id,
        content: messageContent.trim(),
        context: 'reservation'
      });
      // オーナーに通知
      try {
        const { notifyAppAndLine } = await import('../utils/notify');
        const { data: fac } = await supabase.from('pet_facilities').select('owner_id, name').eq('id', messageTarget.facility_id).maybeSingle();
        if (fac?.owner_id) {
          const linkOwner = `${window.location.origin}/community`;
          await notifyAppAndLine({ userId: fac.owner_id, title: '予約チャットに新着メッセージ', message: messageContent.slice(0, 50), linkUrl: linkOwner, kind: 'alert' });
        }
      } catch {}
      setMessageContent('');
      setMessageTarget(null);
      alert('メッセージを送信しました');
    } catch (e: any) {
      alert(`送信に失敗しました\n${e?.message || ''}`);
    } finally {
      setSubmitting(false);
    }
  };

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
                    <Button size="sm" variant="secondary" onClick={() => setMessageTarget(r)}>メッセージ</Button>
                    <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white" disabled={!canCancel(r) || submitting} onClick={() => handleCancel(r)}>
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

      {messageTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md p-4">
            <h3 className="font-semibold mb-2">{messageTarget.facility?.name || '施設'} へのメッセージ</h3>
            <textarea className="w-full border rounded p-2" rows={4} value={messageContent} onChange={(e) => setMessageContent(e.target.value)} placeholder="メッセージを入力" />
            <div className="mt-3 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setMessageTarget(null)}>閉じる</Button>
              <Button onClick={handleSendMessage} disabled={submitting || !messageContent.trim()} className="bg-blue-600 hover:bg-blue-700 text-white">送信</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


