/*
  # 注文キャンセル機能の実装

  1. 新しいカラム
    - `orders` テーブルに `cancellable_until` カラムを追加
  
  2. 新しい関数
    - `can_cancel_order` - 注文がキャンセル可能かチェックする関数
    - `cancel_order` - 注文をキャンセルする関数
    - `set_order_cancellable_until` - 注文作成時にキャンセル期限を設定する関数
  
  3. 新しいトリガー
    - 注文作成時にキャンセル期限を自動設定するトリガー
*/

-- Add cancellable_until column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancellable_until timestamptz;

-- Create function to check if an order can be cancelled
CREATE OR REPLACE FUNCTION can_cancel_order(order_id uuid)
RETURNS boolean AS $$
DECLARE
  v_order orders;
BEGIN
  -- Get the order
  SELECT * INTO v_order FROM orders WHERE id = order_id;
  
  -- Check if order exists
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Check if order is in a cancellable state
  IF v_order.status NOT IN ('pending', 'confirmed') THEN
    RETURN false;
  END IF;
  
  -- Check if within cancellation window
  IF v_order.cancellable_until IS NULL OR v_order.cancellable_until < now() THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to cancel an order
CREATE OR REPLACE FUNCTION cancel_order(order_id uuid, user_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_order orders;
  v_order_items order_items[];
  v_item order_items;
BEGIN
  -- Get the order
  SELECT * INTO v_order FROM orders WHERE id = order_id;
  
  -- Check if order exists
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Order not found'
    );
  END IF;
  
  -- Check if the user owns the order
  IF v_order.user_id != user_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'You do not have permission to cancel this order'
    );
  END IF;
  
  -- Check if order can be cancelled
  IF NOT can_cancel_order(order_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'This order cannot be cancelled'
    );
  END IF;
  
  -- Get order items to restore stock
  SELECT array_agg(oi) INTO v_order_items
  FROM order_items oi
  WHERE oi.order_id = order_id;
  
  -- Restore stock for each item
  IF v_order_items IS NOT NULL THEN
    FOR i IN 1..array_length(v_order_items, 1) LOOP
      v_item := v_order_items[i];
      
      UPDATE products
      SET stock_quantity = stock_quantity + v_item.quantity
      WHERE id = v_item.product_id;
    END LOOP;
  END IF;
  
  -- Update order status
  UPDATE orders
  SET 
    status = 'cancelled',
    payment_status = 'cancelled',
    updated_at = now()
  WHERE id = order_id;
  
  -- Create notification for user
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    data
  ) VALUES (
    user_id,
    'order_cancelled',
    '注文がキャンセルされました',
    '注文番号: ' || v_order.order_number || ' のご注文がキャンセルされました。',
    jsonb_build_object(
      'order_id', order_id,
      'order_number', v_order.order_number
    )
  );
  
  -- Create notification for admin
  INSERT INTO admin_notifications (
    type,
    title,
    message,
    data
  ) VALUES (
    'order_cancelled',
    '注文がキャンセルされました',
    'ユーザーによって注文番号: ' || v_order.order_number || ' がキャンセルされました。',
    jsonb_build_object(
      'order_id', order_id,
      'order_number', v_order.order_number,
      'user_id', user_id
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Order cancelled successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger function to set cancellable_until on order creation
CREATE OR REPLACE FUNCTION set_order_cancellable_until()
RETURNS TRIGGER AS $$
BEGIN
  -- Set cancellable_until to 15 minutes after creation
  NEW.cancellable_until := NEW.created_at + interval '15 minutes';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to set cancellable_until on order creation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'set_order_cancellable_until_trigger'
  ) THEN
    CREATE TRIGGER set_order_cancellable_until_trigger
    BEFORE INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION set_order_cancellable_until();
  END IF;
END
$$;

-- Update existing orders to set cancellable_until (for demonstration purposes)
UPDATE orders
SET cancellable_until = created_at + interval '15 minutes'
WHERE cancellable_until IS NULL;