/*
  # プロフィールテーブルにnameカラムを追加

  1. 変更内容
    - `profiles`テーブルに`name`カラムを追加
    - ユーザー名を保存するためのカラム

  2. セキュリティ
    - 既存のRLSポリシーは維持
*/

-- プロフィールテーブルにnameカラムを追加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'name'
  ) THEN
    ALTER TABLE profiles ADD COLUMN name text;
  END IF;
END $$;