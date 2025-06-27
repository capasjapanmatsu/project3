/*
  # 初期スキーマの作成

  1. 新規テーブル
    - `profiles`: ユーザープロフィール情報
      - `id` (uuid): ユーザーID
      - `user_type` (text): ユーザータイプ（user/owner）
      - `created_at` (timestamp): 作成日時
    
    - `dogs`: 犬の情報
      - `id` (uuid): 犬ID
      - `owner_id` (uuid): 飼い主ID
      - `name` (text): 犬の名前
      - `breed` (text): 犬種
      - `birth_date` (date): 生年月日
      - `gender` (text): 性別
      - `created_at` (timestamp): 作成日時
    
    - `dog_parks`: ドッグラン情報
      - `id` (uuid): ドッグランID
      - `owner_id` (uuid): オーナーID
      - `name` (text): 施設名
      - `description` (text): 説明
      - `address` (text): 住所
      - `price` (integer): 利用料金
      - `created_at` (timestamp): 作成日時

  2. セキュリティ
    - 全テーブルでRLSを有効化
    - プロフィールの読み取り/更新ポリシー
    - 犬情報の所有者アクセスポリシー
    - ドッグラン情報の公開/所有者ポリシー
*/

-- プロフィールテーブル
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  user_type text NOT NULL CHECK (user_type IN ('user', 'owner')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "プロフィールは本人のみ参照可能"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "プロフィールは本人のみ更新可能"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- 犬情報テーブル
CREATE TABLE IF NOT EXISTS dogs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES profiles(id) NOT NULL,
  name text NOT NULL,
  breed text NOT NULL,
  birth_date date NOT NULL,
  gender text NOT NULL CHECK (gender IN ('オス', 'メス')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE dogs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "犬情報は所有者のみ参照可能"
  ON dogs
  FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "犬情報は所有者のみ更新可能"
  ON dogs
  FOR ALL
  TO authenticated
  USING (owner_id = auth.uid());

-- ドッグラン情報テーブル
CREATE TABLE IF NOT EXISTS dog_parks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES profiles(id) NOT NULL,
  name text NOT NULL,
  description text,
  address text NOT NULL,
  price integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE dog_parks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ドッグラン情報は誰でも参照可能"
  ON dog_parks
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "ドッグラン情報は所有者のみ更新可能"
  ON dog_parks
  FOR ALL
  TO authenticated
  USING (owner_id = auth.uid());