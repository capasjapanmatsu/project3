/*
  # Complete database schema setup

  1. Tables
    - reservations: 予約情報
    - vaccine_certifications: ワクチン接種証明書
    - subscriptions: サブスクリプション情報
    - dog_parks: 追加カラム

  2. Security
    - RLS policies for all tables
    - Storage policies for vaccine certificates

  3. Functions and Triggers
    - Payment calculation
    - QR code generation
    - Occupancy tracking
*/

-- First, check if reservations table exists and what columns it has
DO $$
BEGIN
  -- Add missing columns to reservations table if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reservations' AND column_name = 'park_id'
  ) THEN
    ALTER TABLE reservations ADD COLUMN park_id uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reservations' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE reservations ADD COLUMN user_id uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reservations' AND column_name = 'dog_id'
  ) THEN
    ALTER TABLE reservations ADD COLUMN dog_id uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reservations' AND column_name = 'date'
  ) THEN
    ALTER TABLE reservations ADD COLUMN date date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reservations' AND column_name = 'start_time'
  ) THEN
    ALTER TABLE reservations ADD COLUMN start_time time;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reservations' AND column_name = 'duration'
  ) THEN
    ALTER TABLE reservations ADD COLUMN duration integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reservations' AND column_name = 'status'
  ) THEN
    ALTER TABLE reservations ADD COLUMN status text DEFAULT 'confirmed';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reservations' AND column_name = 'total_amount'
  ) THEN
    ALTER TABLE reservations ADD COLUMN total_amount integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reservations' AND column_name = 'access_code'
  ) THEN
    ALTER TABLE reservations ADD COLUMN access_code text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reservations' AND column_name = 'qr_code'
  ) THEN
    ALTER TABLE reservations ADD COLUMN qr_code text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reservations' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE reservations ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Create reservations table if it doesn't exist at all
CREATE TABLE IF NOT EXISTS reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  park_id uuid NOT NULL,
  user_id uuid NOT NULL,
  dog_id uuid NOT NULL,
  date date NOT NULL,
  start_time time NOT NULL,
  duration integer NOT NULL,
  status text NOT NULL DEFAULT 'confirmed',
  total_amount integer NOT NULL DEFAULT 0,
  access_code text NOT NULL DEFAULT '',
  qr_code text,
  created_at timestamptz DEFAULT now()
);

-- Add foreign key constraints if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'reservations' AND constraint_name = 'reservations_park_id_fkey'
  ) THEN
    ALTER TABLE reservations ADD CONSTRAINT reservations_park_id_fkey FOREIGN KEY (park_id) REFERENCES dog_parks(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'reservations' AND constraint_name = 'reservations_user_id_fkey'
  ) THEN
    ALTER TABLE reservations ADD CONSTRAINT reservations_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'reservations' AND constraint_name = 'reservations_dog_id_fkey'
  ) THEN
    ALTER TABLE reservations ADD CONSTRAINT reservations_dog_id_fkey FOREIGN KEY (dog_id) REFERENCES dogs(id);
  END IF;
END $$;

-- Add check constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'reservations_duration_check'
  ) THEN
    ALTER TABLE reservations ADD CONSTRAINT reservations_duration_check CHECK (duration > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'reservations_status_check'
  ) THEN
    ALTER TABLE reservations ADD CONSTRAINT reservations_status_check CHECK (status IN ('confirmed', 'cancelled'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'reservations_total_amount_check'
  ) THEN
    ALTER TABLE reservations ADD CONSTRAINT reservations_total_amount_check CHECK (total_amount >= 0);
  END IF;
END $$;

-- Enable RLS on reservations
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "ユーザーは自分の予約を参照可能" ON reservations;
DROP POLICY IF EXISTS "ユーザーは予約の作成が可能" ON reservations;
DROP POLICY IF EXISTS "ユーザーは自分の予約のみキャンセル可能" ON reservations;

-- Create policies for reservations
CREATE POLICY "ユーザーは自分の予約を参照可能"
  ON reservations
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM dog_parks
      WHERE dog_parks.id = reservations.park_id
      AND dog_parks.owner_id = auth.uid()
    )
  );

CREATE POLICY "ユーザーは予約の作成が可能"
  ON reservations
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "ユーザーは自分の予約のみ更新可能"
  ON reservations
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ワクチン接種証明書テーブル
CREATE TABLE IF NOT EXISTS vaccine_certifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dog_id uuid NOT NULL,
  rabies_vaccine_image text,
  combo_vaccine_image text,
  status text NOT NULL DEFAULT 'pending',
  approved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Add foreign key constraint for vaccine_certifications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'vaccine_certifications' AND constraint_name = 'vaccine_certifications_dog_id_fkey'
  ) THEN
    ALTER TABLE vaccine_certifications ADD CONSTRAINT vaccine_certifications_dog_id_fkey FOREIGN KEY (dog_id) REFERENCES dogs(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'vaccine_certifications_status_check'
  ) THEN
    ALTER TABLE vaccine_certifications ADD CONSTRAINT vaccine_certifications_status_check CHECK (status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

ALTER TABLE vaccine_certifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "ワクチン証明書は所有者のみ参照可能" ON vaccine_certifications;
DROP POLICY IF EXISTS "ワクチン証明書は所有者のみ作成可能" ON vaccine_certifications;

CREATE POLICY "ワクチン証明書は所有者のみ参照可能"
  ON vaccine_certifications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dogs
      WHERE dogs.id = vaccine_certifications.dog_id
      AND dogs.owner_id = auth.uid()
    )
  );

CREATE POLICY "ワクチン証明書は所有者のみ作成可能"
  ON vaccine_certifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM dogs
      WHERE dogs.id = vaccine_certifications.dog_id
      AND dogs.owner_id = auth.uid()
    )
  );

-- サブスクリプションテーブル
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_type text NOT NULL DEFAULT 'monthly',
  status text NOT NULL DEFAULT 'active',
  start_date date NOT NULL,
  end_date date NOT NULL,
  price integer NOT NULL DEFAULT 3800,
  created_at timestamptz DEFAULT now()
);

-- Add foreign key constraint for subscriptions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'subscriptions' AND constraint_name = 'subscriptions_user_id_fkey'
  ) THEN
    ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'subscriptions_status_check'
  ) THEN
    ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_status_check CHECK (status IN ('active', 'cancelled', 'expired'));
  END IF;
END $$;

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "サブスクリプションは本人のみ参照可能" ON subscriptions;
DROP POLICY IF EXISTS "サブスクリプションは本人のみ作成可能" ON subscriptions;

CREATE POLICY "サブスクリプションは本人のみ参照可能"
  ON subscriptions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "サブスクリプションは本人のみ作成可能"
  ON subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- dog_parksテーブルに位置情報カラムを追加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dog_parks' AND column_name = 'latitude'
  ) THEN
    ALTER TABLE dog_parks ADD COLUMN latitude decimal(10,8) DEFAULT 35.6812;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dog_parks' AND column_name = 'longitude'
  ) THEN
    ALTER TABLE dog_parks ADD COLUMN longitude decimal(11,8) DEFAULT 139.7671;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dog_parks' AND column_name = 'current_occupancy'
  ) THEN
    ALTER TABLE dog_parks ADD COLUMN current_occupancy integer DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dog_parks' AND column_name = 'max_capacity'
  ) THEN
    ALTER TABLE dog_parks ADD COLUMN max_capacity integer DEFAULT 10;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dog_parks' AND column_name = 'qr_code'
  ) THEN
    ALTER TABLE dog_parks ADD COLUMN qr_code text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dog_parks' AND column_name = 'status'
  ) THEN
    ALTER TABLE dog_parks ADD COLUMN status text DEFAULT 'pending';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dog_parks' AND column_name = 'facilities'
  ) THEN
    ALTER TABLE dog_parks ADD COLUMN facilities jsonb DEFAULT '{
      "parking": false,
      "shower": false,
      "restroom": false,
      "agility": false,
      "rest_area": false,
      "water_station": false
    }'::jsonb;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dog_parks' AND column_name = 'facility_details'
  ) THEN
    ALTER TABLE dog_parks ADD COLUMN facility_details text;
  END IF;
END $$;

-- Add constraints if they don't exist
DO $$
BEGIN
  -- Check constraints for dog_parks
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'dog_parks_current_occupancy_check'
  ) THEN
    ALTER TABLE dog_parks ADD CONSTRAINT dog_parks_current_occupancy_check CHECK (current_occupancy >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'dog_parks_max_capacity_check'
  ) THEN
    ALTER TABLE dog_parks ADD CONSTRAINT dog_parks_max_capacity_check CHECK (max_capacity > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'dog_parks_status_check'
  ) THEN
    ALTER TABLE dog_parks ADD CONSTRAINT dog_parks_status_check CHECK (status IN ('pending', 'approved', 'rejected'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'check_occupancy_limit'
  ) THEN
    ALTER TABLE dog_parks ADD CONSTRAINT check_occupancy_limit CHECK (current_occupancy <= max_capacity);
  END IF;
END $$;

-- ストレージバケットの作成（ワクチン証明書用）
INSERT INTO storage.buckets (id, name, public)
VALUES ('vaccine-certs', 'vaccine-certs', false)
ON CONFLICT (id) DO NOTHING;

-- ストレージポリシーの設定
DROP POLICY IF EXISTS "ワクチン証明書は所有者のみアップロード可能" ON storage.objects;
DROP POLICY IF EXISTS "ワクチン証明書は所有者のみ参照可能" ON storage.objects;

CREATE POLICY "ワクチン証明書は所有者のみアップロード可能"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'vaccine-certs' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "ワクチン証明書は所有者のみ参照可能"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'vaccine-certs' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- 支払い計算関数
CREATE OR REPLACE FUNCTION calculate_payment(
  p_reservation_id uuid,
  p_payment_type text,
  p_subscription_usage integer DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_park_price integer;
  v_duration integer;
  v_total_amount integer;
BEGIN
  -- 予約情報から料金と時間を取得
  SELECT dp.price, r.duration
  INTO v_park_price, v_duration
  FROM reservations r
  JOIN dog_parks dp ON r.park_id = dp.id
  WHERE r.id = p_reservation_id;

  -- 支払い方法に応じて金額を計算
  IF p_payment_type = 'subscription' THEN
    v_total_amount := 0; -- サブスクリプションの場合は0円
  ELSE
    v_total_amount := 800 * v_duration; -- 単発利用は1時間800円
  END IF;

  -- 予約テーブルの金額を更新
  UPDATE reservations
  SET total_amount = v_total_amount
  WHERE id = p_reservation_id;
END;
$$;

-- QRコード生成関数
CREATE OR REPLACE FUNCTION generate_reservation_qr()
RETURNS TRIGGER AS $$
BEGIN
  -- QRコードとアクセスコードの生成
  NEW.qr_code = encode(
    digest(
      NEW.access_code || NEW.id::text || NEW.created_at::text,
      'sha256'
    ),
    'hex'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 予約作成時のトリガー
DROP TRIGGER IF EXISTS reservation_qr_trigger ON reservations;
CREATE TRIGGER reservation_qr_trigger
  BEFORE INSERT ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION generate_reservation_qr();

-- 現在の利用者数を更新する関数
CREATE OR REPLACE FUNCTION update_park_occupancy()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'confirmed' THEN
    UPDATE dog_parks
    SET current_occupancy = current_occupancy + 1
    WHERE id = NEW.park_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'cancelled' AND OLD.status = 'confirmed' THEN
    UPDATE dog_parks
    SET current_occupancy = current_occupancy - 1
    WHERE id = NEW.park_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 予約状態変更時のトリガー
DROP TRIGGER IF EXISTS update_occupancy_trigger ON reservations;
CREATE TRIGGER update_occupancy_trigger
  AFTER INSERT OR UPDATE ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION update_park_occupancy();