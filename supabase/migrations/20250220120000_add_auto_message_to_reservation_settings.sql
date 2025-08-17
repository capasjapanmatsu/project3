-- 予約確定時の自動メッセージ設定を追加
ALTER TABLE public.facility_reservation_settings
  ADD COLUMN IF NOT EXISTS auto_message_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_message_text text DEFAULT 'ご予約を受け付けました。お気をつけてお越しください。';

COMMENT ON COLUMN public.facility_reservation_settings.auto_message_enabled IS '予約確定時にデフォルトメッセージを自動送信するか';
COMMENT ON COLUMN public.facility_reservation_settings.auto_message_text IS '予約確定時に自動送信するメッセージ本文';

