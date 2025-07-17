# データベース制約修正手順

## 問題
`dog_parks` テーブルの `status` フィールドに制約がかかっており、新しいステータス値 `second_stage_waiting` などが許可されていません。

## 解決方法
Supabaseダッシュボードで以下のSQLを実行してください：

### 1. Supabaseダッシュボードにアクセス
- https://app.supabase.com にアクセス
- プロジェクトを選択
- 左側メニューから「SQL Editor」を選択

### 2. 以下のSQLを実行

```sql
-- 既存の制約を削除
ALTER TABLE dog_parks DROP CONSTRAINT IF EXISTS dog_parks_status_check;

-- 新しい制約を追加（新しいワークフローのステータス値を許可）
ALTER TABLE dog_parks ADD CONSTRAINT dog_parks_status_check 
CHECK (status IN (
  'pending',
  'first_stage_passed',
  'second_stage_waiting',
  'second_stage_review', 
  'smart_lock_testing',
  'approved',
  'rejected'
));
```

### 3. 実行確認
以下のSQLで制約が正しく追加されたかを確認：

```sql
SELECT conname, consrc FROM pg_constraint 
WHERE conrelid = 'dog_parks'::regclass 
AND conname = 'dog_parks_status_check';
```

## 新しいワークフローのステータス
- `pending`: 第一審査中
- `first_stage_passed`: 第一審査通過（旧）
- `second_stage_waiting`: 第二審査提出待ち
- `second_stage_review`: 第二審査中
- `smart_lock_testing`: スマートロック認証待ち
- `approved`: 承認済み・公開可能
- `rejected`: 却下

## 実行後の確認
1. アプリケーションを再起動
2. `admin/parks` ページで承認ボタンをテスト
3. 承認が正常に動作することを確認 