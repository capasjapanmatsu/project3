/*
  # ペットショップシステムの構築

  1. 新規テーブル
    - `products`: 商品情報
    - `cart_items`: カート商品
    - `orders`: 注文情報
    - `order_items`: 注文商品詳細
    - `payment_cards`: 決済カード情報

  2. セキュリティ
    - 全テーブルでRLSを有効化
    - 適切なポリシーを設定

  3. 機能
    - 商品管理
    - カート機能
    - 注文処理
    - 決済管理
*/

-- 商品テーブル
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  price integer NOT NULL,
  category text NOT NULL,
  image_url text NOT NULL,
  stock_quantity integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  weight integer, -- グラム単位
  size text, -- S, M, L, XL など
  brand text,
  ingredients text,
  age_group text, -- puppy, adult, senior, all
  dog_size text, -- small, medium, large, all
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT products_category_check CHECK (category IN ('food', 'treats', 'toys', 'accessories', 'health', 'sheets')),
  CONSTRAINT products_age_group_check CHECK (age_group IN ('puppy', 'adult', 'senior', 'all')),
  CONSTRAINT products_dog_size_check CHECK (dog_size IN ('small', 'medium', 'large', 'all')),
  CONSTRAINT products_price_check CHECK (price >= 0),
  CONSTRAINT products_stock_check CHECK (stock_quantity >= 0)
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- 商品は誰でも参照可能（管理者のみ更新可能）
CREATE POLICY "商品は誰でも参照可能"
  ON products
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- カートアイテムテーブル
CREATE TABLE IF NOT EXISTS cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id uuid NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT cart_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id),
  CONSTRAINT cart_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id),
  CONSTRAINT cart_items_quantity_check CHECK (quantity > 0)
);

-- ユーザーと商品の組み合わせでユニーク制約
CREATE UNIQUE INDEX IF NOT EXISTS cart_items_user_product_unique 
ON cart_items (user_id, product_id);

ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "カートは本人のみ操作可能"
  ON cart_items
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 注文テーブル
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  order_number text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  total_amount integer NOT NULL,
  discount_amount integer NOT NULL DEFAULT 0,
  shipping_fee integer NOT NULL DEFAULT 0,
  final_amount integer NOT NULL,
  shipping_address text NOT NULL,
  shipping_postal_code text NOT NULL,
  shipping_phone text NOT NULL,
  shipping_name text NOT NULL,
  payment_method text NOT NULL,
  payment_status text NOT NULL DEFAULT 'pending',
  notes text,
  estimated_delivery_date date,
  tracking_number text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id),
  CONSTRAINT orders_status_check CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')),
  CONSTRAINT orders_payment_method_check CHECK (payment_method IN ('credit_card', 'bank_transfer', 'cod')),
  CONSTRAINT orders_payment_status_check CHECK (payment_status IN ('pending', 'completed', 'failed')),
  CONSTRAINT orders_amounts_check CHECK (total_amount >= 0 AND discount_amount >= 0 AND shipping_fee >= 0 AND final_amount >= 0)
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "注文は本人のみ参照可能"
  ON orders
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "注文は本人のみ作成可能"
  ON orders
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 注文商品詳細テーブル
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  product_id uuid NOT NULL,
  quantity integer NOT NULL,
  unit_price integer NOT NULL,
  total_price integer NOT NULL,
  CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id),
  CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id),
  CONSTRAINT order_items_quantity_check CHECK (quantity > 0),
  CONSTRAINT order_items_prices_check CHECK (unit_price >= 0 AND total_price >= 0)
);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "注文商品は注文者のみ参照可能"
  ON order_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_items.order_id 
      AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "注文商品は注文者のみ作成可能"
  ON order_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_items.order_id 
      AND orders.user_id = auth.uid()
    )
  );

-- 決済カード情報テーブル（セキュリティのため実際のカード番号は保存しない）
CREATE TABLE IF NOT EXISTS payment_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  card_number_masked text NOT NULL, -- 下4桁のみ
  card_holder_name text NOT NULL,
  expiry_month integer NOT NULL,
  expiry_year integer NOT NULL,
  card_brand text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT payment_cards_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id),
  CONSTRAINT payment_cards_card_brand_check CHECK (card_brand IN ('visa', 'mastercard', 'jcb', 'amex')),
  CONSTRAINT payment_cards_expiry_month_check CHECK (expiry_month >= 1 AND expiry_month <= 12),
  CONSTRAINT payment_cards_expiry_year_check CHECK (expiry_year >= 0 AND expiry_year <= 99)
);

ALTER TABLE payment_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "決済カードは本人のみ操作可能"
  ON payment_cards
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 通知タイプに新しい種類を追加
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'notifications_type_check'
  ) THEN
    ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;
  END IF;
END $$;

ALTER TABLE notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('friend_request', 'friend_accepted', 'friend_at_park', 'reservation_reminder', 'order_confirmed', 'order_shipped', 'order_delivered'));

-- サンプル商品データの挿入
INSERT INTO products (name, description, price, category, image_url, stock_quantity, weight, brand, age_group, dog_size) VALUES
-- ドッグフード
('プレミアムドッグフード 成犬用', '厳選された国産素材を使用した栄養バランス抜群のドッグフード。愛犬の健康をサポートします。', 3980, 'food', 'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg', 50, 2000, 'ドッグパークJP', 'adult', 'all'),
('子犬用ドッグフード', '成長期の子犬に必要な栄養素をバランスよく配合。消化しやすい小粒タイプ。', 2980, 'food', 'https://images.pexels.com/photos/1254140/pexels-photo-1254140.jpeg', 30, 1000, 'パピーケア', 'puppy', 'all'),
('シニア犬用ドッグフード', '7歳以上のシニア犬の健康維持をサポート。関節ケア成分配合。', 4280, 'food', 'https://images.pexels.com/photos/1805164/pexels-photo-1805164.jpeg', 25, 1500, 'シニアケア', 'senior', 'all'),

-- おやつ
('無添加ささみジャーキー', '国産鶏ささみを使用した無添加ジャーキー。トレーニングのご褒美にも最適。', 1280, 'treats', 'https://images.pexels.com/photos/1851164/pexels-photo-1851164.jpeg', 100, 100, 'ナチュラル', 'all', 'all'),
('デンタルケアガム', '歯垢除去効果のあるデンタルケアガム。お口の健康をサポート。', 980, 'treats', 'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg', 80, 200, 'デンタルケア', 'adult', 'all'),
('野菜チップス', '愛犬も喜ぶヘルシーな野菜チップス。食物繊維たっぷり。', 780, 'treats', 'https://images.pexels.com/photos/1254140/pexels-photo-1254140.jpeg', 60, 80, 'ベジタブル', 'all', 'all'),

-- おもちゃ
('ロープトイ', '天然コットン100%のロープトイ。引っ張り遊びや一人遊びに。', 1580, 'toys', 'https://images.pexels.com/photos/1805164/pexels-photo-1805164.jpeg', 40, 150, 'プレイタイム', 'all', 'all'),
('知育玩具パズル', '愛犬の知能を刺激する知育玩具。おやつを隠して遊べます。', 2380, 'toys', 'https://images.pexels.com/photos/1851164/pexels-photo-1851164.jpeg', 20, 300, 'ブレインゲーム', 'adult', 'all'),
('ぬいぐるみ', 'ふわふわで可愛いぬいぐるみ。愛犬の癒しのお友達。', 1880, 'toys', 'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg', 35, 200, 'コンフォート', 'all', 'small'),

-- アクセサリー
('レザーカラー', '本革製の高級カラー。名前の刻印サービス付き。', 3980, 'accessories', 'https://images.pexels.com/photos/1254140/pexels-photo-1254140.jpeg', 25, 100, 'レザークラフト', 'all', 'all'),
('リード', '丈夫で軽量なナイロン製リード。夜間の散歩に安心な反射材付き。', 2280, 'accessories', 'https://images.pexels.com/photos/1805164/pexels-photo-1805164.jpeg', 45, 200, 'セーフティ', 'all', 'all'),
('ドッグウェア', '可愛いデザインのドッグウェア。寒い日のお散歩に。', 2980, 'accessories', 'https://images.pexels.com/photos/1851164/pexels-photo-1851164.jpeg', 30, 150, 'ファッション', 'all', 'small'),

-- ヘルスケア
('マルチビタミン', '愛犬の健康維持に必要なビタミン・ミネラルを配合したサプリメント。', 2680, 'health', 'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg', 40, 60, 'ヘルスサポート', 'all', 'all'),
('関節ケアサプリ', 'グルコサミン・コンドロイチン配合。シニア犬の関節をサポート。', 3480, 'health', 'https://images.pexels.com/photos/1254140/pexels-photo-1254140.jpeg', 25, 90, 'ジョイントケア', 'senior', 'all'),
('皮膚ケアシャンプー', '敏感肌の愛犬にも安心な低刺激シャンプー。', 1980, 'health', 'https://images.pexels.com/photos/1805164/pexels-photo-1805164.jpeg', 35, 500, 'スキンケア', 'all', 'all'),

-- ペットシーツ
('超吸収ペットシーツ レギュラー', '12時間しっかり吸収。消臭効果も抜群のペットシーツ。', 1480, 'sheets', 'https://images.pexels.com/photos/1851164/pexels-photo-1851164.jpeg', 100, 800, 'クリーンライフ', 'all', 'small'),
('超吸収ペットシーツ ワイド', '大型犬にも対応のワイドサイズ。長時間の外出時も安心。', 2180, 'sheets', 'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg', 80, 1200, 'クリーンライフ', 'all', 'large'),
('厚型ペットシーツ', '3層構造で漏れを防ぐ厚型タイプ。夜間使用にも最適。', 1980, 'sheets', 'https://images.pexels.com/photos/1254140/pexels-photo-1254140.jpeg', 60, 1000, 'プロテクト', 'all', 'all')

ON CONFLICT DO NOTHING;

-- 更新日時を自動更新するトリガー関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 商品テーブルの更新日時自動更新トリガー
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 注文テーブルの更新日時自動更新トリガー
DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();