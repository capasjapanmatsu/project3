-- ドッグランの公開フローに新しいステータスを追加
-- 既存の制約を削除
ALTER TABLE dog_parks DROP CONSTRAINT IF EXISTS dog_parks_status_check;

-- 新しい制約を追加（公開準備のステータスを含む）
ALTER TABLE dog_parks ADD CONSTRAINT dog_parks_status_check 
  CHECK (status = ANY (ARRAY[
    'pending'::text, 
    'first_stage_passed'::text, 
    'second_stage_review'::text, 
    'qr_testing_ready'::text,
    'editing'::text,
    'ready_to_publish'::text,
    'qr_testing'::text, 
    'approved'::text, 
    'rejected'::text
  ]));

-- 新しいステータスの説明
COMMENT ON CONSTRAINT dog_parks_status_check ON dog_parks IS 
'ドッグランのステータス制約: 
- pending: 一次審査中
- first_stage_passed: 二次審査提出待ち
- second_stage_review: 二次審査中
- qr_testing_ready: 二次審査完了、テスト準備完了
- editing: 公開準備中（編集中）
- ready_to_publish: 公開準備完了
- qr_testing: QRテスト中
- approved: 承認済み（一般公開中）
- rejected: 却下';
