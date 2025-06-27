/*
  # Performance Optimizations

  1. Database Indexes
    - Add indexes for frequently queried columns
    - Optimize existing indexes
  
  2. Query Optimizations
    - Add function for efficient data retrieval
    - Optimize existing functions
*/

-- Add indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_reservations_date_park_id ON reservations(date, park_id);
CREATE INDEX IF NOT EXISTS idx_reservations_user_id_date ON reservations(user_id, date);
CREATE INDEX IF NOT EXISTS idx_dogs_owner_id ON dogs(owner_id);
CREATE INDEX IF NOT EXISTS idx_dog_parks_status ON dog_parks(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_vaccine_certifications_status ON vaccine_certifications(status);
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id_product_id ON cart_items(user_id, product_id);

-- Add function for efficient retrieval of user's active subscriptions
CREATE OR REPLACE FUNCTION get_user_active_subscription(user_id_param UUID)
RETURNS TABLE (
  subscription_id TEXT,
  status TEXT,
  current_period_end BIGINT,
  cancel_at_period_end BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ss.subscription_id,
    ss.status::TEXT,
    ss.current_period_end,
    ss.cancel_at_period_end
  FROM 
    stripe_customers sc
    JOIN stripe_subscriptions ss ON sc.customer_id = ss.customer_id
  WHERE 
    sc.user_id = user_id_param
    AND sc.deleted_at IS NULL
    AND ss.deleted_at IS NULL
    AND ss.status IN ('active', 'trialing')
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Add function to get user's dogs with vaccine status
CREATE OR REPLACE FUNCTION get_user_dogs_with_vaccine_status(user_id_param UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  breed TEXT,
  birth_date DATE,
  gender TEXT,
  image_url TEXT,
  vaccine_status TEXT,
  vaccine_expiry_date DATE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.name,
    d.breed,
    d.birth_date,
    d.gender,
    d.image_url,
    vc.status AS vaccine_status,
    GREATEST(vc.rabies_expiry_date, vc.combo_expiry_date) AS vaccine_expiry_date
  FROM 
    dogs d
    LEFT JOIN vaccine_certifications vc ON d.id = vc.dog_id
  WHERE 
    d.owner_id = user_id_param
  ORDER BY 
    d.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Add function to get park availability for a specific date
CREATE OR REPLACE FUNCTION get_park_availability(park_id_param UUID, date_param DATE)
RETURNS TABLE (
  hour INT,
  available BOOLEAN,
  current_occupancy INT,
  is_facility_rental BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  WITH hours AS (
    SELECT generate_series(6, 21) AS hour
  ),
  reservations AS (
    SELECT 
      r.start_time,
      r.duration,
      r.reservation_type
    FROM 
      reservations r
    WHERE 
      r.park_id = park_id_param
      AND r.date = date_param
      AND r.status = 'confirmed'
  )
  SELECT 
    h.hour,
    NOT EXISTS (
      SELECT 1 FROM reservations r
      WHERE 
        (CAST(SPLIT_PART(r.start_time, ':', 1) AS INT) <= h.hour 
         AND CAST(SPLIT_PART(r.start_time, ':', 1) AS INT) + r.duration > h.hour
         AND r.reservation_type = 'whole_facility')
    ) AS available,
    (
      SELECT COUNT(*) FROM reservations r
      WHERE 
        CAST(SPLIT_PART(r.start_time, ':', 1) AS INT) <= h.hour 
        AND CAST(SPLIT_PART(r.start_time, ':', 1) AS INT) + r.duration > h.hour
        AND r.reservation_type = 'regular'
    )::INT AS current_occupancy,
    EXISTS (
      SELECT 1 FROM reservations r
      WHERE 
        CAST(SPLIT_PART(r.start_time, ':', 1) AS INT) <= h.hour 
        AND CAST(SPLIT_PART(r.start_time, ':', 1) AS INT) + r.duration > h.hour
        AND r.reservation_type = 'whole_facility'
    ) AS is_facility_rental
  FROM 
    hours h
  ORDER BY 
    h.hour;
END;
$$ LANGUAGE plpgsql;

-- Add function to get user's cart with product details
CREATE OR REPLACE FUNCTION get_user_cart_with_products(user_id_param UUID)
RETURNS TABLE (
  id UUID,
  product_id UUID,
  quantity INT,
  product_name TEXT,
  product_price INT,
  product_image_url TEXT,
  subtotal INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ci.id,
    ci.product_id,
    ci.quantity,
    p.name AS product_name,
    p.price AS product_price,
    p.image_url AS product_image_url,
    (p.price * ci.quantity) AS subtotal
  FROM 
    cart_items ci
    JOIN products p ON ci.product_id = p.id
  WHERE 
    ci.user_id = user_id_param;
END;
$$ LANGUAGE plpgsql;

-- Add function to efficiently check if a user has an active subscription
CREATE OR REPLACE FUNCTION user_has_active_subscription(user_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
  has_subscription BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM stripe_customers sc
    JOIN stripe_subscriptions ss ON sc.customer_id = ss.customer_id
    WHERE 
      sc.user_id = user_id_param
      AND sc.deleted_at IS NULL
      AND ss.deleted_at IS NULL
      AND ss.status IN ('active', 'trialing')
  ) INTO has_subscription;
  
  RETURN has_subscription;
END;
$$ LANGUAGE plpgsql;

-- Add function to get nearby parks with distance calculation
CREATE OR REPLACE FUNCTION get_nearby_parks(lat_param NUMERIC, lng_param NUMERIC, radius_km INT DEFAULT 50)
RETURNS TABLE (
  id UUID,
  name TEXT,
  address TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  price INT,
  current_occupancy INT,
  max_capacity INT,
  distance_km NUMERIC,
  average_rating NUMERIC,
  review_count INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dp.id,
    dp.name,
    dp.address,
    dp.latitude,
    dp.longitude,
    dp.price,
    dp.current_occupancy,
    dp.max_capacity,
    (6371 * acos(cos(radians(lat_param)) * cos(radians(dp.latitude)) * 
     cos(radians(dp.longitude) - radians(lng_param)) + 
     sin(radians(lat_param)) * sin(radians(dp.latitude)))) AS distance_km,
    dp.average_rating,
    dp.review_count
  FROM 
    dog_parks dp
  WHERE 
    dp.status = 'approved'
  ORDER BY 
    distance_km
  LIMIT 50;
END;
$$ LANGUAGE plpgsql;

-- Add function to get user's recent activity
CREATE OR REPLACE FUNCTION get_user_recent_activity(user_id_param UUID)
RETURNS TABLE (
  activity_type TEXT,
  activity_date TIMESTAMP WITH TIME ZONE,
  title TEXT,
  description TEXT,
  related_id UUID,
  related_type TEXT
) AS $$
BEGIN
  RETURN QUERY
  (
    -- Recent reservations
    SELECT 
      'reservation'::TEXT AS activity_type,
      r.created_at AS activity_date,
      dp.name AS title,
      'ドッグラン予約' AS description,
      r.id AS related_id,
      'reservation'::TEXT AS related_type
    FROM 
      reservations r
      JOIN dog_parks dp ON r.park_id = dp.id
    WHERE 
      r.user_id = user_id_param
    ORDER BY 
      r.created_at DESC
    LIMIT 5
  )
  UNION ALL
  (
    -- Recent orders
    SELECT 
      'order'::TEXT AS activity_type,
      o.created_at AS activity_date,
      'ショッピング注文 #' || o.order_number AS title,
      '注文金額: ¥' || o.final_amount::TEXT AS description,
      o.id AS related_id,
      'order'::TEXT AS related_type
    FROM 
      orders o
    WHERE 
      o.user_id = user_id_param
    ORDER BY 
      o.created_at DESC
    LIMIT 5
  )
  UNION ALL
  (
    -- Recent dog registrations
    SELECT 
      'dog_registration'::TEXT AS activity_type,
      d.created_at AS activity_date,
      d.name || 'ちゃんを登録' AS title,
      d.breed AS description,
      d.id AS related_id,
      'dog'::TEXT AS related_type
    FROM 
      dogs d
    WHERE 
      d.owner_id = user_id_param
    ORDER BY 
      d.created_at DESC
    LIMIT 5
  )
  ORDER BY 
    activity_date DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- Add function to get user's subscription status with all details
CREATE OR REPLACE FUNCTION get_user_subscription_details(user_id_param UUID)
RETURNS TABLE (
  subscription_id TEXT,
  status TEXT,
  current_period_start BIGINT,
  current_period_end BIGINT,
  cancel_at_period_end BOOLEAN,
  payment_method_brand TEXT,
  payment_method_last4 TEXT,
  price_id TEXT,
  is_active BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ss.subscription_id,
    ss.status::TEXT,
    ss.current_period_start,
    ss.current_period_end,
    ss.cancel_at_period_end,
    ss.payment_method_brand,
    ss.payment_method_last4,
    ss.price_id,
    (ss.status IN ('active', 'trialing'))::BOOLEAN AS is_active
  FROM 
    stripe_customers sc
    JOIN stripe_subscriptions ss ON sc.customer_id = ss.customer_id
  WHERE 
    sc.user_id = user_id_param
    AND sc.deleted_at IS NULL
    AND ss.deleted_at IS NULL
  ORDER BY 
    ss.current_period_end DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;