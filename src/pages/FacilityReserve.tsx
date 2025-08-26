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
  const [customerName, setCustomerName] = useState<string>('');
  const [openTime, setOpenTime] = useState<string>('09:00');
  const [closeTime, setCloseTime] = useState<string>('18:00');
  const [submitting, setSubmitting] = useState<boolean>(false);
  // 営業日・定休日情報
  const [weeklyClosed, setWeeklyClosed] = useState<boolean[]>([false,false,false,false,false,false,false]);
  const [specificClosed, setSpecificClosed] = useState<Set<string>>(new Set());
  const [specificOpen, setSpecificOpen] = useState<Set<string>>(new Set());

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

        // 営業時間
        const { data: facility } = await supabase
          .from('pet_facilities')
          .select('opening_time, closing_time, weekly_closed_days, specific_closed_dates, specific_open_dates')
          .eq('id', facilityId)
          .maybeSingle();
        if (facility?.opening_time) setOpenTime(String(facility.opening_time).slice(0,5));
        if (facility?.closing_time) setCloseTime(String(facility.closing_time).slice(0,5));
        // 定休日情報
        try {
          if (facility?.weekly_closed_days) {
            const parsed = JSON.parse(String(facility.weekly_closed_days));
            if (Array.isArray(parsed) && parsed.length === 7) setWeeklyClosed(parsed.map(Boolean));
          }
        } catch {}
        try {
          if (facility?.specific_closed_dates) {
            const arr = JSON.parse(String(facility.specific_closed_dates));
            if (Array.isArray(arr)) setSpecificClosed(new Set(arr as string[]));
          }
        } catch {}
        try {
          if (facility?.specific_open_dates) {
            const arr = JSON.parse(String(facility.specific_open_dates));
            if (Array.isArray(arr)) setSpecificOpen(new Set(arr as string[]));
          }
        } catch {}
      } finally {
        setLoading(false);
      }
    })();
  }, [facilityId]);

  const slots = useMemo(() => generateTimeSlots(openTime, closeTime, unit), [openTime, closeTime, unit]);

  const isClosedDay = useMemo(() => {
    // specific_open が優先で営業、次に specific_closed で休業、それ以外は weeklyClosed
    const d = date;
    if (!d) return false;
    if (specificOpen.has(d)) return false;
    if (specificClosed.has(d)) return true;
    const dow = new Date(`${d}T00:00:00`).getDay(); // 0=Sun
    return Boolean(weeklyClosed[dow]);
  }, [date, weeklyClosed, specificClosed, specificOpen]);
  // 現在時刻より1時間以降のみ（本日選択時）
  const availableSlots = useMemo(() => {
    if (isClosedDay) return [];
    const todayStr = new Date().toISOString().split('T')[0];
    if (date !== todayStr) return slots;
    const threshold = new Date(Date.now() + 60 * 60 * 1000); // 現在+1時間
    return slots.filter(({ start }) => {
      const startDt = new Date(`${date}T${start}:00`);
      return startDt >= threshold;
    });
  }, [slots, date, isClosedDay]);

  const handleReserve = async () => {
    if (!user) { navigate('/liff/login'); return; }
    if (isClosedDay) { alert('本日は定休日のため予約できません'); return; }
    if (!slot) { alert('時間を選択してください'); return; }
    if (!customerName.trim()) { alert('予約者名を入力してください'); return; }
    if (seats.length > 0 && !seat) { alert('座席を選択してください'); return; }
    try {
      setSubmitting(true);
      const [start, end] = slot.split('-');
      // 予約の確定/仮予約判定（設定のauto_confirmを参照）
      const { data: setting } = await supabase
        .from('facility_reservation_settings')
        .select('auto_confirm')
        .eq('facility_id', facilityId)
        .maybeSingle();
      const isAuto = Boolean(setting?.auto_confirm ?? true);
      const status = isAuto ? 'confirmed' : 'pending';

      // 挿入（schema cache が更新前の環境でも失敗しないようフォールバック）
      let insertError: any = null;
      const insertRes = await supabase.from('facility_reservations').insert({
        facility_id: facilityId,
        user_id: user.id,
        customer_name: customerName.trim(),
        seat_code: seat || '未指定',
        reserved_date: date,
        start_time: start,
        end_time: end,
        guest_count: guestCount,
        status,
      });
      if (insertRes.error && String(insertRes.error.message || '').includes('customer_name')) {
        const retry = await supabase.from('facility_reservations').insert({
          facility_id: facilityId,
          user_id: user.id,
          seat_code: seat || '未指定',
          reserved_date: date,
          start_time: start,
          end_time: end,
          guest_count: guestCount,
          status,
        });
        insertError = retry.error;
      } else if (insertRes.error && /uq_facility_resv_slot/i.test(String(insertRes.error.message))) {
        // 重複時はキャンセル済み重複か、未指定座席の多重を許容するためのメッセージ
        alert('選択した時間帯は満席の可能性があります。別の時間または座席を選択してください。');
        throw insertRes.error;
      } else {
        insertError = insertRes.error;
      }
      if (insertError) throw insertError;

      // 予約チャット用の初回メッセージを作成（簡易）
      try {
        // 施設設定のデフォルトメッセージがオンなら送信
        const { data: settingMsg } = await supabase
          .from('facility_reservation_settings')
          .select('auto_message_enabled, auto_message_text')
          .eq('facility_id', facilityId)
          .maybeSingle();
        const enabledMsg = Boolean(settingMsg?.auto_message_enabled);
        const initialMessage = (settingMsg?.auto_message_text as string) || 'ご予約を受け付けました。お気をつけてお越しください。';
        await supabase.from('community_messages').insert({
          user_id: user.id,
          facility_id: facilityId,
          content: initialMessage,
          context: 'reservation',
        }).select().maybeSingle();
        // オーナーにも通知
        if (enabledMsg) {
          // LINE重複を避けるため予約チャットの個別通知は送らない
        }
      } catch {}
      // 通知（アプリ内＋LINE）
      try {
        const { notifyAppAndLine } = await import('../utils/notify');
        const linkUrlUser = `${window.location.origin}/my-reservations`;
        const seatText = seat ? `席:${seat}` : '座席:指定なし';
        await notifyAppAndLine({ userId: user.id!, title: 'ご予約を受け付けました。', message: `${date} ${start}-${end} / ${guestCount}名`, linkUrl: linkUrlUser, kind: 'alert', sendApp: false, sendLine: true });
        // オーナーにも通知
        const { data: facility } = await supabase.from('pet_facilities').select('id, owner_id, name').eq('id', facilityId).maybeSingle();
        if (facility?.owner_id) {
          const linkUrlOwner = `${window.location.origin}/facilities/${facilityId}/reservations`;
          await notifyAppAndLine({ userId: facility.owner_id, title: '新規予約が入りました', message: `${customerName} 様 / ${facility.name} / ${date} ${start}-${end}`, linkUrl: linkUrlOwner, kind: 'alert', sendApp: false, sendLine: true });
          // オーナーにもアプリ内通知（コミュニティ通知）
          const ins = await supabase.from('notifications').insert({
            user_id: facility.owner_id,
            title: '新規予約が入りました',
            message: `${customerName} 様 / ${facility.name} / ${date} ${start}-${end} / ${guestCount}名 / ${seatText}`,
            link_url: linkUrlOwner,
            read: false,
            type: 'reservation_reminder',
            data: {}
          });
          if (ins.error) {
            await fetch('/.netlify/functions/app-notify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: facility.owner_id, title: '新規予約が入りました', message: `${customerName} 様 / ${facility.name} / ${date} ${start}-${end}`, linkUrl: linkUrlOwner, kind: 'alert' })
            });
          }
        }
        // コミュニティ通知（アプリ内の通知リストに残す）
        // アプリ内の控え通知は残さない
      } catch {}
      alert('予約が完了しました');
      navigate(`/facilities/${facilityId}`);
    } catch (e: any) {
      console.error('Reserve error:', e);
      const msg = typeof e?.message === 'string' ? e.message : JSON.stringify(e);
      alert(`予約に失敗しました\n${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-6">読み込み中...</div>;
  if (!enabled) return <div className="p-6">この施設では現在予約を受け付けていません。</div>;

  // 予約可能な日付の範囲
  const minDate = new Date();
  const maxDate = new Date();
  maxDate.setDate(minDate.getDate() + daysAhead);
  const fmt = (dt: Date) => dt.toISOString().split('T')[0];

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card className="p-6">
        <h1 className="text-xl font-semibold mb-4">予約</h1>
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">予約者名</span>
            <input type="text" className="border rounded px-2 py-1 flex-1" placeholder="予約者名" value={customerName} onChange={(e)=>setCustomerName(e.target.value)} />
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">日付</span>
            <input type="date" className="border rounded px-2 py-1" value={date} onChange={(e) => setDate(e.target.value)} min={fmt(minDate)} max={fmt(maxDate)} />
            {isClosedDay && (
              <span className="ml-2 text-xs text-red-600">定休日のため予約不可</span>
            )}
          </div>
          {seats.length > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">座席</span>
              <select className="border rounded px-2 py-1" value={seat} onChange={(e) => setSeat(e.target.value)}>
                <option value="">選択</option>
                {seats.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">時間</span>
            <select className="border rounded px-2 py-1" value={slot} onChange={(e) => setSlot(e.target.value)} disabled={isClosedDay}>
              <option value="">選択</option>
              {availableSlots.map((t) => <option key={`${t.start}-${t.end}`} value={`${t.start}-${t.end}`}>{t.start} - {t.end}</option>)}
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">人数</span>
            <input type="number" min={1} max={20} className="border rounded px-2 py-1 w-24" value={guestCount} onChange={(e) => setGuestCount(Number(e.target.value))} />
          </div>
          <Button onClick={handleReserve} className="w-full" disabled={submitting || isClosedDay}>{submitting ? '処理中...' : '予約を確定'}</Button>
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


