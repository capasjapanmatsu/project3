-- ペット関連施設システムのデータベース設計
-- 1. 施設カテゴリテーブル
CREATE TABLE facility_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL,
  name_ja VARCHAR(100) NOT NULL,
  description TEXT,
  is_free BOOLEAN DEFAULT FALSE, -- 動物病院は無料
  monthly_fee INTEGER DEFAULT 2200, -- 月額料金（円）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. ペット関連施設テーブル
CREATE TABLE pet_facilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id),
  category_id UUID REFERENCES facility_categories(id),
  name VARCHAR(200) NOT NULL, -- 屋号
  address TEXT NOT NULL, -- 住所
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  phone VARCHAR(20), -- お問合せ先
  website VARCHAR(500), -- ホームページ
  description TEXT, -- 店舗サービス詳細
  status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected, suspended
  payment_status VARCHAR(20) DEFAULT 'unpaid', -- paid, unpaid, overdue
  last_payment_date DATE,
  next_payment_due DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 施設の営業時間テーブル
CREATE TABLE facility_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID REFERENCES pet_facilities(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL, -- 0=Sunday, 1=Monday, ..., 6=Saturday
  open_time TIME,
  close_time TIME,
  is_closed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 施設の画像テーブル
CREATE TABLE facility_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID REFERENCES pet_facilities(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. 施設のサブスクリプションテーブル
CREATE TABLE facility_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID REFERENCES pet_facilities(id) ON DELETE CASCADE,
  stripe_subscription_id VARCHAR(100),
  payment_method VARCHAR(20) NOT NULL, -- 'credit_card', 'bank_transfer'
  amount INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'active', -- active, cancelled, past_due
  current_period_start DATE,
  current_period_end DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. 銀行振込の請求書テーブル
CREATE TABLE facility_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID REFERENCES pet_facilities(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES facility_subscriptions(id),
  invoice_number VARCHAR(20) NOT NULL,
  amount INTEGER NOT NULL,
  due_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- pending, paid, overdue
  pdf_url TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. 施設の評価・レビューテーブル
CREATE TABLE facility_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID REFERENCES pet_facilities(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 初期データ挿入：施設カテゴリ
INSERT INTO facility_categories (name, name_ja, description, is_free, monthly_fee) VALUES
('dog_park', 'ドッグラン', 'ドッグラン施設', true, 0),
('pet_friendly_restaurant', 'ペット同伴可能店舗', 'ペットと一緒に利用できる飲食店', false, 2200),
('pet_friendly_hotel', 'ペット同伴可能宿泊施設', 'ペットと一緒に宿泊できる施設', false, 2200),
('pet_shop', 'ペットショップ', 'ペット用品販売店', false, 2200),
('pet_salon', 'ペットサロン', 'ペットトリミング・美容サロン', false, 2200),
('pet_hotel', 'ペットホテル', 'ペット預かりサービス', false, 2200),
('veterinary_clinic', '動物病院', '獣医療サービス', true, 0);

-- インデックス作成
CREATE INDEX idx_pet_facilities_location ON pet_facilities(latitude, longitude);
CREATE INDEX idx_pet_facilities_category ON pet_facilities(category_id);
CREATE INDEX idx_pet_facilities_status ON pet_facilities(status);
CREATE INDEX idx_pet_facilities_payment_status ON pet_facilities(payment_status);
CREATE INDEX idx_facility_subscriptions_status ON facility_subscriptions(status);
CREATE INDEX idx_facility_invoices_status ON facility_invoices(status);
CREATE INDEX idx_facility_invoices_due_date ON facility_invoices(due_date);

-- RLS (Row Level Security) 設定
ALTER TABLE facility_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE pet_facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE facility_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE facility_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE facility_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE facility_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE facility_reviews ENABLE ROW LEVEL SECURITY;

-- 施設カテゴリは全員閲覧可能
CREATE POLICY "Everyone can view facility categories" ON facility_categories
    FOR SELECT USING (true);

-- 承認された施設は全員閲覧可能
CREATE POLICY "Everyone can view approved facilities" ON pet_facilities
    FOR SELECT USING (status = 'approved' AND payment_status = 'paid');

-- 施設オーナーは自分の施設を編集可能
CREATE POLICY "Owners can manage their facilities" ON pet_facilities
    FOR ALL USING (auth.uid() = owner_id);

-- 管理者は全ての施設を管理可能
CREATE POLICY "Admins can manage all facilities" ON pet_facilities
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.is_admin = true
        )
    );

-- 施設営業時間のポリシー
CREATE POLICY "Everyone can view facility hours" ON facility_hours
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM pet_facilities 
            WHERE pet_facilities.id = facility_hours.facility_id 
            AND pet_facilities.status = 'approved'
            AND pet_facilities.payment_status = 'paid'
        )
    );

CREATE POLICY "Owners can manage their facility hours" ON facility_hours
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM pet_facilities 
            WHERE pet_facilities.id = facility_hours.facility_id 
            AND pet_facilities.owner_id = auth.uid()
        )
    );

-- 施設画像のポリシー
CREATE POLICY "Everyone can view facility images" ON facility_images
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM pet_facilities 
            WHERE pet_facilities.id = facility_images.facility_id 
            AND pet_facilities.status = 'approved'
            AND pet_facilities.payment_status = 'paid'
        )
    );

CREATE POLICY "Owners can manage their facility images" ON facility_images
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM pet_facilities 
            WHERE pet_facilities.id = facility_images.facility_id 
            AND pet_facilities.owner_id = auth.uid()
        )
    );

-- レビューのポリシー
CREATE POLICY "Everyone can view reviews" ON facility_reviews
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM pet_facilities 
            WHERE pet_facilities.id = facility_reviews.facility_id 
            AND pet_facilities.status = 'approved'
            AND pet_facilities.payment_status = 'paid'
        )
    );

CREATE POLICY "Authenticated users can create reviews" ON facility_reviews
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews" ON facility_reviews
    FOR UPDATE USING (auth.uid() = user_id);

-- 自動支払い状況更新関数
CREATE OR REPLACE FUNCTION update_facility_payment_status()
RETURNS void AS $$
BEGIN
    -- 支払い期限を過ぎた施設の支払い状況を更新
    UPDATE pet_facilities 
    SET payment_status = 'overdue',
        status = 'suspended'
    WHERE payment_status = 'unpaid' 
    AND next_payment_due < CURRENT_DATE
    AND EXISTS (
        SELECT 1 FROM facility_categories 
        WHERE facility_categories.id = pet_facilities.category_id 
        AND facility_categories.is_free = false
    );
END;
$$ LANGUAGE plpgsql;

-- 自動請求書生成関数
CREATE OR REPLACE FUNCTION generate_monthly_invoices()
RETURNS void AS $$
DECLARE
    facility_record RECORD;
    invoice_number VARCHAR(20);
BEGIN
    FOR facility_record IN 
        SELECT pf.*, fc.monthly_fee
        FROM pet_facilities pf
        JOIN facility_categories fc ON pf.category_id = fc.id
        JOIN facility_subscriptions fs ON pf.id = fs.facility_id
        WHERE fc.is_free = false
        AND fs.payment_method = 'bank_transfer'
        AND fs.status = 'active'
        AND pf.next_payment_due <= CURRENT_DATE + INTERVAL '7 days'
        AND NOT EXISTS (
            SELECT 1 FROM facility_invoices fi
            WHERE fi.facility_id = pf.id
            AND fi.due_date = pf.next_payment_due
        )
    LOOP
        -- 請求書番号生成
        invoice_number := 'INV-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || LPAD(facility_record.id::text, 6, '0');
        
        -- 請求書作成
        INSERT INTO facility_invoices (
            facility_id,
            subscription_id,
            invoice_number,
            amount,
            due_date,
            status
        ) VALUES (
            facility_record.id,
            (SELECT id FROM facility_subscriptions WHERE facility_id = facility_record.id LIMIT 1),
            invoice_number,
            facility_record.monthly_fee,
            facility_record.next_payment_due,
            'pending'
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 月次処理用のcron設定（Supabase Edge Functionsで実行）
-- SELECT cron.schedule('update-facility-payments', '0 0 * * *', 'SELECT update_facility_payment_status();');
-- SELECT cron.schedule('generate-monthly-invoices', '0 0 25 * *', 'SELECT generate_monthly_invoices();'); 