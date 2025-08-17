-- 予約重複エラー対策: 未指定座席やキャンセル済みを許容するためユニーク制約を緩和

-- 既存のユニークインデックスを削除
DROP INDEX IF EXISTS uq_facility_resv_slot;

-- 未指定席は同時刻に複数可、またキャンセル済みは重複可
CREATE UNIQUE INDEX IF NOT EXISTS uq_facility_resv_slot_active
ON public.facility_reservations(facility_id, seat_code, reserved_date, start_time)
WHERE seat_code <> '未指定' AND status <> 'cancelled';

-- PostgRESTへスキーマ更新通知
NOTIFY pgrst, 'reload schema';

