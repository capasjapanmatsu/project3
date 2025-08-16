import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import useAuth from '../context/AuthContext';
import { supabase } from '../utils/supabase';

export default function FacilityReserve() {
  const { id: facilityId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [unit, setUnit] = useState(60);
  const [daysAhead, setDaysAhead] = useState(30);
  const [seats, setSeats] = useState<string[]>([]);
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [seat, setSeat] = useState('');
  const [slot, setSlot] = useState('');
  const [guestCount, setGuestCount] = useState<number>(1);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const { data: setting } = await supabase
          .from('facility_reservation_settings')
          .select('*')
          .eq('facility_id', facilityId)
          .maybeSingle();
        setEnabled(Boolean(setting?.enabled));
        setUnit(setting?.slot_unit_minutes || 60);
        setDaysAhead(setting?.allowed_days_ahead || 30);
        const { data: seatRows } = await supabase
          .from('facility_seats')
          .select('seat_code')
          .eq('facility_id', facilityId);
        setSeats((seatRows || []).map((r: any) => r.seat_code));
      } finally {
        setLoading(false);
      }
    })();
  }, [facilityId]);

  const slots = useMemo(() => generateTimeSlots('09:00', '18:00', unit), [unit]);

  const handleReserve = async () => {
    if (!user) { navigate('/liff/login'); return; }
    if (!seat || !slot) return;
    try {
      const [start, end] = slot.split('-');
      // 予約の確定/仮予約判定（設定のauto_confirmを参照）
      const { data: setting } = await supabase
        .from('facility_reservation_settings')
        .select('auto_confirm')
        .eq('facility_id', facilityId)
        .maybeSingle();
      const isAuto = Boolean(setting?.auto_confirm ?? true);
      const status = isAuto ? 'confirmed' : 'pending';

      const { error } = await supabase.from('facility_reservations').insert({
        facility_id: facilityId,
        user_id: user.id,
        seat_code: seat,
        reserved_date: date,
        start_time: start,
        end_time: end,
        guest_count: guestCount,
        status,
      });
      if (error) throw error;
      // LINE通知（任意: ユーザー自身に送る）
      try {
        const { notifyAppAndLine } = await import('../utils/notify');
        const linkUrlUser = `${window.location.origin}/my-reservations`;
        await notifyAppAndLine({ userId: user.id!, title: isAuto ? '予約確定' : '仮予約', message: `${date} ${start}-${end} / ${guestCount}名 / 席:${seat}`, linkUrl: linkUrlUser, kind: 'reservation' });
        // オーナーにも通知
        const { data: facility } = await supabase.from('pet_facilities').select('id, owner_id, name').eq('id', facilityId).maybeSingle();
        if (facility?.owner_id) {
          const linkUrlOwner = `${window.location.origin}/facilities/${facilityId}/reservations`;
          await notifyAppAndLine({ userId: facility.owner_id, title: '予約が入りました', message: `${facility.name} / ${date} ${start}-${end} / ${guestCount}名 / 席:${seat}`, linkUrl: linkUrlOwner, kind: 'reservation' });
        }
      } catch {}
      alert('予約が完了しました');
      navigate(`/facilities/${facilityId}`);
    } catch (e: any) {
      console.error('Reserve error:', e);
      const msg = typeof e?.message === 'string' ? e.message : JSON.stringify(e);
      alert(`予約に失敗しました\n${msg}`);
    }
  };

  if (loading) return <div className="p-6">読み込み中...</div>;
  if (!enabled) return <div className="p-6">この施設では現在予約を受け付けていません。</div>;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card className="p-6">
        <h1 className="text-xl font-semibold mb-4">予約</h1>
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">日付</span>
            <input type="date" className="border rounded px-2 py-1" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">座席</span>
            <select className="border rounded px-2 py-1" value={seat} onChange={(e) => setSeat(e.target.value)}>
              <option value="">選択</option>
              {seats.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">時間</span>
            <select className="border rounded px-2 py-1" value={slot} onChange={(e) => setSlot(e.target.value)}>
              <option value="">選択</option>
              {slots.map((t) => <option key={`${t.start}-${t.end}`} value={`${t.start}-${t.end}`}>{t.start} - {t.end}</option>)}
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">人数</span>
            <input type="number" min={1} max={20} className="border rounded px-2 py-1 w-24" value={guestCount} onChange={(e) => setGuestCount(Number(e.target.value))} />
          </div>
          <Button onClick={handleReserve} className="w-full">予約を確定</Button>
        </div>
      </Card>
    </div>
  );
}

function generateTimeSlots(open: string, close: string, unit: number) {
  const slots: { start: string; end: string }[] = [];
  const start = new Date(`1970-01-01T${open}:00`);
  const end = new Date(`1970-01-01T${close}:00`);
  if (end <= start) return slots;
  let cur = start;
  while (cur < end) {
    const sH = cur.getHours().toString().padStart(2, '0');
    const sM = cur.getMinutes().toString().padStart(2, '0');
    const next = new Date(cur.getTime() + unit * 60 * 1000);
    if (next > end) break;
    const eH = next.getHours().toString().padStart(2, '0');
    const eM = next.getMinutes().toString().padStart(2, '0');
    slots.push({ start: `${sH}:${sM}`, end: `${eH}:${eM}` });
    cur = next;
  }
  return slots;
}


