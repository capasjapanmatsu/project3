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
  v_item record;
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
  
  -- Restore stock for each item using a cursor instead of FOREACH
  FOR v_item IN 
    SELECT * FROM order_items WHERE order_id = order_id
  LOOP
    UPDATE products
    SET stock_quantity = stock_quantity + v_item.quantity
    WHERE id = v_item.product_id;
  END LOOP;
  
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