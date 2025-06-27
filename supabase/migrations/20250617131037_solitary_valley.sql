/*
# Add PayPay Payment Support

1. New Tables
  - `paypay_payments` - Stores PayPay payment information

2. Changes
  - Update `orders` table payment_method constraint to include 'paypay'
  - Add RLS policies for paypay_payments table
  - Create function to update payment status

3. Security
  - Enable RLS on paypay_payments table
  - Add policies for user access
*/

-- PayPay支払い方法をサポートするための更新

-- orders テーブルの payment_method 制約を更新
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;
ALTER TABLE orders ADD CONSTRAINT orders_payment_method_check 
  CHECK (payment_method = ANY (ARRAY['credit_card'::text, 'bank_transfer'::text, 'cod'::text, 'paypay'::text]));

-- PayPay決済情報を保存するテーブル
CREATE TABLE IF NOT EXISTS paypay_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  merchant_payment_id TEXT NOT NULL UNIQUE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'JPY',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'authorized', 'completed', 'cancelled', 'failed')),
  payment_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS paypay_payments_user_id_idx ON paypay_payments(user_id);
CREATE INDEX IF NOT EXISTS paypay_payments_merchant_payment_id_idx ON paypay_payments(merchant_payment_id);
CREATE INDEX IF NOT EXISTS paypay_payments_order_id_idx ON paypay_payments(order_id);
CREATE INDEX IF NOT EXISTS paypay_payments_status_idx ON paypay_payments(status);

-- RLSの有効化
ALTER TABLE paypay_payments ENABLE ROW LEVEL SECURITY;

-- RLSポリシーの設定
CREATE POLICY "Users can view their own payments"
  ON paypay_payments
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all payments"
  ON paypay_payments
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() ->> 'email'::text) = 'capasjapan@gmail.com'::text);

-- 更新日時を自動更新するトリガー関数
CREATE OR REPLACE FUNCTION update_paypay_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガーの作成
CREATE TRIGGER update_paypay_payments_updated_at
BEFORE UPDATE ON paypay_payments
FOR EACH ROW
EXECUTE FUNCTION update_paypay_payments_updated_at();

-- PayPay決済ステータスを更新する関数
CREATE OR REPLACE FUNCTION update_paypay_payment_status(
  p_merchant_payment_id TEXT,
  p_status TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_order_id UUID;
  v_user_id UUID;
BEGIN
  -- PayPay決済情報を更新
  UPDATE paypay_payments
  SET 
    status = p_status,
    updated_at = now()
  WHERE merchant_payment_id = p_merchant_payment_id
  RETURNING order_id, user_id INTO v_order_id, v_user_id;
  
  -- 注文ステータスも更新
  IF v_order_id IS NOT NULL THEN
    UPDATE orders
    SET 
      payment_status = CASE 
        WHEN p_status = 'authorized' OR p_status = 'completed' THEN 'completed'
        WHEN p_status = 'cancelled' OR p_status = 'failed' THEN 'failed'
        ELSE 'pending'
      END,
      status = CASE 
        WHEN p_status = 'authorized' OR p_status = 'completed' THEN 'confirmed'
        WHEN p_status = 'cancelled' OR p_status = 'failed' THEN 'cancelled'
        ELSE 'pending'
      END,
      updated_at = now()
    WHERE id = v_order_id;
    
    -- 支払い完了の場合は通知を送信
    IF p_status = 'authorized' OR p_status = 'completed' THEN
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        data,
        read
      ) VALUES (
        v_user_id,
        'order_confirmed',
        'ご注文ありがとうございます',
        'PayPayでのお支払いが完了しました。',
        jsonb_build_object('order_id', v_order_id),
        false
      );
      
      -- カートを空にする
      DELETE FROM cart_items
      WHERE user_id = v_user_id;
    END IF;
  END IF;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;