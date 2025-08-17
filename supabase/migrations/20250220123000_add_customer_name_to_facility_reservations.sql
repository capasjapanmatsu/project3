-- 予約者名の保存用カラムを追加
ALTER TABLE public.facility_reservations
  ADD COLUMN IF NOT EXISTS customer_name text;

COMMENT ON COLUMN public.facility_reservations.customer_name IS '予約者名（任意）';

-- PostgREST のスキーマキャッシュを更新
NOTIFY pgrst, 'reload schema';

