/*
  # ユーザープロフィールフィールドの追加

  1. 変更内容
    - `profiles`テーブルに以下のカラムを追加:
      - `postal_code` (text): 郵便番号
      - `address` (text): 住所
      - `phone_number` (text): 電話番号
    - `name`カラムは既に存在するため変更なし

  2. セキュリティ
    - 既存のRLSポリシーは維持
    - 個人情報保護のため、本人のみアクセス可能
*/

-- プロフィールテーブルに新しいカラムを追加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'postal_code'
  ) THEN
    ALTER TABLE profiles ADD COLUMN postal_code text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'address'
  ) THEN
    ALTER TABLE profiles ADD COLUMN address text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'phone_number'
  ) THEN
    ALTER TABLE profiles ADD COLUMN phone_number text;
  END IF;
END $$;