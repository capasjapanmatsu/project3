# 📊 ペット関連施設データベースセットアップ

## 🚀 Supabase管理画面での設定手順

### 1. Supabase管理画面にアクセス
1. [Supabase Dashboard](https://app.supabase.com/) にログイン
2. プロジェクトを選択
3. 左側メニューから **SQL Editor** をクリック
4. **New query** をクリック

### 2. 以下のSQLを実行

```sql
-- 1. 施設カテゴリテーブル
CREATE TABLE IF NOT EXISTS facility_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  name_ja VARCHAR(100) NOT NULL,
  description TEXT,
  is_free BOOLEAN DEFAULT true,
  monthly_fee INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. ペット関連施設テーブル
CREATE TABLE IF NOT EXISTS pet_facilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id VARCHAR(100) NOT NULL REFERENCES facility_categories(name) ON DELETE RESTRICT,
  name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  phone VARCHAR(20),
  website TEXT,
  description TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
  payment_status VARCHAR(20) DEFAULT 'paid' CHECK (payment_status IN ('paid', 'unpaid', 'overdue')),
  last_payment_date DATE,
  next_payment_due DATE,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 施設画像テーブル
CREATE TABLE IF NOT EXISTS facility_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES pet_facilities(id) ON DELETE CASCADE,
  image_data BYTEA NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(50) NOT NULL,
  file_size INTEGER NOT NULL,
  original_name VARCHAR(255),
  is_compressed BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. インデックス作成
CREATE INDEX IF NOT EXISTS idx_pet_facilities_owner_id ON pet_facilities(owner_id);
CREATE INDEX IF NOT EXISTS idx_pet_facilities_category_id ON pet_facilities(category_id);
CREATE INDEX IF NOT EXISTS idx_pet_facilities_status ON pet_facilities(status);
CREATE INDEX IF NOT EXISTS idx_facility_images_facility_id ON facility_images(facility_id);

-- 5. RLS（Row Level Security）設定
ALTER TABLE facility_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE pet_facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE facility_images ENABLE ROW LEVEL SECURITY;

-- 6. RLSポリシー
CREATE POLICY "Anyone can view facility categories"
  ON facility_categories FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own facilities"
  ON pet_facilities FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can view their own facilities"
  ON pet_facilities FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Users can update their own facilities"
  ON pet_facilities FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Admins can view all facilities"
  ON pet_facilities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND user_type = 'admin'
    )
  );

CREATE POLICY "Admins can update all facilities"
  ON pet_facilities FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND user_type = 'admin'
    )
  );

CREATE POLICY "Users can insert their own facility images"
  ON facility_images FOR INSERT
  WITH CHECK (
    facility_id IN (
      SELECT id FROM pet_facilities 
      WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their own facility images"
  ON facility_images FOR SELECT
  USING (
    facility_id IN (
      SELECT id FROM pet_facilities 
      WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all facility images"
  ON facility_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND user_type = 'admin'
    )
  );

-- 7. 初期データ挿入
INSERT INTO facility_categories (name, name_ja, description, is_free, monthly_fee) VALUES
('pet_hotel', 'ペットホテル', 'ペットの宿泊サービス', true, 0),
('pet_salon', 'ペットサロン', 'ペットの美容・グルーミングサービス', true, 0),
('veterinary', '動物病院', '獣医療サービス', true, 0),
('pet_restaurant', 'ペット同伴レストラン', 'ペットと一緒に食事ができるレストラン', true, 0),
('pet_accommodation', 'ペット同伴宿泊施設', 'ペットと一緒に宿泊できる施設', true, 0)
ON CONFLICT (name) DO UPDATE SET
  name_ja = EXCLUDED.name_ja,
  description = EXCLUDED.description,
  is_free = EXCLUDED.is_free,
  monthly_fee = EXCLUDED.monthly_fee,
  updated_at = NOW();
```

### 3. 実行確認

SQLを実行後、以下のクエリでテーブルが正しく作成されているか確認してください：

```sql
-- テーブル確認
SELECT 'facility_categories' as table_name, count(*) as count FROM facility_categories
UNION ALL
SELECT 'pet_facilities' as table_name, count(*) as count FROM pet_facilities
UNION ALL
SELECT 'facility_images' as table_name, count(*) as count FROM facility_images;
```

期待される結果：
```
table_name         | count
-------------------+-------
facility_categories|   5
pet_facilities     |   0
facility_images    |   0
```

## ✅ 設定完了後

データベースセットアップが完了したら、施設登録ページ (`/facility-registration`) で正常に施設登録できるようになります。

## 🛠️ トラブルシューティング

### エラー: `relation "pet_facilities" does not exist`
→ 上記のSQLを実行してテーブルを作成してください

### エラー: `violates foreign key constraint`
→ `facility_categories` テーブルに初期データが挿入されているか確認してください

### エラー: `permission denied`
→ RLSポリシーが正しく設定されているか確認してください

## 📝 機能説明

- **facility_categories**: 施設カテゴリ（ペットホテル、動物病院など）
- **pet_facilities**: 施設情報（名前、住所、連絡先など）
- **facility_images**: 施設の画像データ（圧縮済み、BYTEA形式）

管理者は `/admin/facility-approval` で施設の承認・却下を管理できます。 