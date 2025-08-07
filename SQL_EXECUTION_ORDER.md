# SQL実行順序ガイド

## 実行する順番（重要！）

以下の順序でSQLを実行してください：

### 1. まず基本テーブルを作成（ステップ4）
```sql
-- ファイル: supabase/migrations/20250201000001_create_access_logs_table.sql
-- これを最初に実行してください
```

このSQLで以下が作成されます：
- `access_logs` テーブル（user_id, lock_id, pin など基本カラム付き）
- `dog_run_locks` テーブル
- 基本的なRLSポリシー

### 2. 次に拡張機能を追加（ステップ6）
```sql
-- ファイル: supabase/migrations/20250201000002_extend_access_logs_community_fixed.sql
-- 1番目のSQLが成功した後に実行してください
```

このSQLで以下が追加されます：
- `access_logs` に dog_id, dog_run_id, duration カラムを追加
- `dog_park_stats` テーブル
- `shared_access_logs` テーブル
- `friendships` テーブル
- `blacklists` テーブル
- `notifications` テーブル
- コミュニティ機能用の関数

## エラーが出た場合

「column "user_id" does not exist」というエラーが出た場合：
→ 1番目のSQL（20250201000001_create_access_logs_table.sql）を先に実行してください

「syntax error at or near "NOT"」というエラーが出た場合：
→ 修正版のSQL（20250201000002_extend_access_logs_community_fixed.sql）を使用してください

## 確認方法

1番目のSQLが正常に実行されたか確認：
```sql
-- これを実行して結果が返ってくればOK
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'access_logs';
```

user_id, lock_id, pin などのカラムが表示されれば成功です。
