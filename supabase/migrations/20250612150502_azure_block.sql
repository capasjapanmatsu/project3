-- Add shipping_carrier field to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_carrier text;

-- Create a function to send notification when order is shipped
CREATE OR REPLACE FUNCTION notify_order_shipped()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insert notification for the order owner
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    data,
    read
  )
  VALUES (
    NEW.user_id,
    'order_shipped',
    '注文が発送されました',
    '注文番号: ' || NEW.order_number || ' の商品が発送されました。' || 
    CASE 
      WHEN NEW.shipping_carrier IS NOT NULL AND NEW.tracking_number IS NOT NULL THEN
        '運送会社: ' || NEW.shipping_carrier || '、お問い合わせ番号: ' || NEW.tracking_number
      ELSE ''
    END,
    jsonb_build_object(
      'order_id', NEW.id,
      'order_number', NEW.order_number,
      'tracking_number', NEW.tracking_number,
      'carrier', NEW.shipping_carrier
    ),
    false
  );
  
  RETURN NEW;
END;
$$;

-- Create a trigger to send notification when order status changes to shipped
DROP TRIGGER IF EXISTS order_shipped_notification_trigger ON orders;
CREATE TRIGGER order_shipped_notification_trigger
AFTER UPDATE ON orders
FOR EACH ROW
WHEN (OLD.status != 'shipped' AND NEW.status = 'shipped')
EXECUTE FUNCTION notify_order_shipped();

-- Create a function to get order statistics for admin dashboard
CREATE OR REPLACE FUNCTION get_order_stats()
RETURNS TABLE (
  total_orders bigint,
  pending_orders bigint,
  processing_orders bigint,
  shipped_orders bigint,
  delivered_orders bigint,
  cancelled_orders bigint,
  monthly_revenue bigint,
  last_month_revenue bigint,
  total_products bigint,
  low_stock_products bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM orders) as total_orders,
    (SELECT COUNT(*) FROM orders WHERE status = 'pending') as pending_orders,
    (SELECT COUNT(*) FROM orders WHERE status = 'processing') as processing_orders,
    (SELECT COUNT(*) FROM orders WHERE status = 'shipped') as shipped_orders,
    (SELECT COUNT(*) FROM orders WHERE status = 'delivered') as delivered_orders,
    (SELECT COUNT(*) FROM orders WHERE status = 'cancelled') as cancelled_orders,
    (SELECT COALESCE(SUM(final_amount), 0) FROM orders WHERE created_at >= date_trunc('month', now())) as monthly_revenue,
    (SELECT COALESCE(SUM(final_amount), 0) FROM orders WHERE created_at >= date_trunc('month', now() - interval '1 month') AND created_at < date_trunc('month', now())) as last_month_revenue,
    (SELECT COUNT(*) FROM products) as total_products,
    (SELECT COUNT(*) FROM products WHERE stock_quantity <= 5 AND is_active = true) as low_stock_products;
END;
$$;

-- Create a function to bulk update order status
CREATE OR REPLACE FUNCTION bulk_update_order_status(order_ids uuid[], new_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the current user is an admin
  IF NOT (SELECT (jwt() ->> 'email'::text) = 'capasjapan@gmail.com'::text) THEN
    RAISE EXCEPTION 'Admin permission required';
  END IF;
  
  -- Update order status
  UPDATE orders
  SET 
    status = new_status,
    updated_at = now()
  WHERE id = ANY(order_ids);
  
  -- If status is shipped, also send notifications
  IF new_status = 'shipped' THEN
    -- For each order, insert a notification
    FOR i IN 1..array_length(order_ids, 1) LOOP
      PERFORM notify_order_shipped_by_id(order_ids[i]);
    END LOOP;
  END IF;
END;
$$;

-- Helper function to send notification for a specific order
CREATE OR REPLACE FUNCTION notify_order_shipped_by_id(order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order orders;
BEGIN
  -- Get order details
  SELECT * INTO v_order
  FROM orders
  WHERE id = order_id;
  
  -- Insert notification
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    data,
    read
  )
  VALUES (
    v_order.user_id,
    'order_shipped',
    '注文が発送されました',
    '注文番号: ' || v_order.order_number || ' の商品が発送されました。' || 
    CASE 
      WHEN v_order.shipping_carrier IS NOT NULL AND v_order.tracking_number IS NOT NULL THEN
        '運送会社: ' || v_order.shipping_carrier || '、お問い合わせ番号: ' || v_order.tracking_number
      ELSE ''
    END,
    jsonb_build_object(
      'order_id', v_order.id,
      'order_number', v_order.order_number,
      'tracking_number', v_order.tracking_number,
      'carrier', v_order.shipping_carrier
    ),
    false
  );
END;
$$;

-- Create a function to export orders as CSV
CREATE OR REPLACE FUNCTION export_orders_csv(filter_status text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  csv_content text;
  header text;
  row_data text;
  order_record record;
BEGIN
  -- Check if the current user is an admin
  IF NOT (SELECT (jwt() ->> 'email'::text) = 'capasjapan@gmail.com'::text) THEN
    RAISE EXCEPTION 'Admin permission required';
  END IF;
  
  -- Create CSV header
  header := '注文番号,注文日,ステータス,顧客名,配送先住所,配送先電話番号,商品小計,割引額,送料,合計金額,支払い方法,支払い状況,運送会社,お問い合わせ番号';
  
  -- Initialize CSV content with header
  csv_content := header || E'\n';
  
  -- Query orders
  FOR order_record IN 
    SELECT 
      order_number,
      created_at,
      status,
      shipping_name,
      shipping_address,
      shipping_phone,
      total_amount,
      discount_amount,
      shipping_fee,
      final_amount,
      payment_method,
      payment_status,
      shipping_carrier,
      tracking_number
    FROM orders
    WHERE filter_status IS NULL OR status = filter_status
    ORDER BY created_at DESC
  LOOP
    -- Format row data
    row_data := 
      order_record.order_number || ',' ||
      to_char(order_record.created_at, 'YYYY-MM-DD') || ',' ||
      order_record.status || ',' ||
      '"' || order_record.shipping_name || '"' || ',' ||
      '"' || order_record.shipping_address || '"' || ',' ||
      order_record.shipping_phone || ',' ||
      order_record.total_amount::text || ',' ||
      order_record.discount_amount::text || ',' ||
      order_record.shipping_fee::text || ',' ||
      order_record.final_amount::text || ',' ||
      order_record.payment_method || ',' ||
      order_record.payment_status || ',' ||
      COALESCE(order_record.shipping_carrier, '') || ',' ||
      COALESCE(order_record.tracking_number, '');
    
    -- Append row to CSV content
    csv_content := csv_content || row_data || E'\n';
  END LOOP;
  
  RETURN csv_content;
END;
$$;