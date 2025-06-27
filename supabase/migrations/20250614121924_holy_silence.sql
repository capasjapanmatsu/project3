/*
  # Additional Performance Optimizations

  1. Database Optimizations
    - Add more specific indexes for common queries
    - Add materialized views for complex queries
  
  2. Function Optimizations
    - Add caching for expensive operations
    - Optimize existing functions
*/

-- Add more specific indexes for common queries
CREATE INDEX IF NOT EXISTS idx_dog_parks_location ON dog_parks(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_dog_parks_rating ON dog_parks(average_rating DESC);
CREATE INDEX IF NOT EXISTS idx_reservations_date_time ON reservations(date, start_time);
CREATE INDEX IF NOT EXISTS idx_products_category_price ON products(category, price);
CREATE INDEX IF NOT EXISTS idx_orders_user_id_created_at ON orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender_receiver ON messages(sender_id, receiver_id, created_at DESC);

-- Create materialized view for popular dog parks
CREATE MATERIALIZED VIEW IF NOT EXISTS popular_dog_parks AS
SELECT 
  dp.id,
  dp.name,
  dp.address,
  dp.latitude,
  dp.longitude,
  dp.price,
  dp.image_url,
  dp.average_rating,
  dp.review_count,
  COUNT(r.id) AS reservation_count
FROM 
  dog_parks dp
  LEFT JOIN reservations r ON dp.id = r.park_id AND r.created_at > (NOW() - INTERVAL '30 days')
WHERE 
  dp.status = 'approved'
GROUP BY 
  dp.id
ORDER BY 
  reservation_count DESC, dp.average_rating DESC
LIMIT 50;

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_popular_dog_parks_rating ON popular_dog_parks(average_rating DESC);
CREATE INDEX IF NOT EXISTS idx_popular_dog_parks_reservations ON popular_dog_parks(reservation_count DESC);

-- Create function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_popular_dog_parks()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW popular_dog_parks;
END;
$$ LANGUAGE plpgsql;

-- Create materialized view for product recommendations
CREATE MATERIALIZED VIEW IF NOT EXISTS product_recommendations AS
WITH product_categories AS (
  SELECT 
    p.category,
    COUNT(*) AS category_count
  FROM 
    products p
    JOIN order_items oi ON p.id = oi.product_id
    JOIN orders o ON oi.order_id = o.id
  WHERE 
    o.created_at > (NOW() - INTERVAL '90 days')
    AND p.is_active = true
  GROUP BY 
    p.category
),
popular_products AS (
  SELECT 
    p.id,
    p.name,
    p.description,
    p.price,
    p.category,
    p.image_url,
    p.stock_quantity,
    COUNT(oi.id) AS order_count,
    SUM(oi.quantity) AS total_quantity_sold
  FROM 
    products p
    JOIN order_items oi ON p.id = oi.product_id
    JOIN orders o ON oi.order_id = o.id
  WHERE 
    o.created_at > (NOW() - INTERVAL '90 days')
    AND p.is_active = true
    AND p.stock_quantity > 0
  GROUP BY 
    p.id
)
SELECT 
  pp.id,
  pp.name,
  pp.description,
  pp.price,
  pp.category,
  pp.image_url,
  pp.stock_quantity,
  pp.order_count,
  pp.total_quantity_sold,
  pc.category_count,
  (pp.total_quantity_sold * 0.7 + pp.order_count * 0.3) AS popularity_score
FROM 
  popular_products pp
  JOIN product_categories pc ON pp.category = pc.category
ORDER BY 
  popularity_score DESC
LIMIT 100;

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_product_recommendations_score ON product_recommendations(popularity_score DESC);
CREATE INDEX IF NOT EXISTS idx_product_recommendations_category ON product_recommendations(category, popularity_score DESC);

-- Create function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_product_recommendations()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW product_recommendations;
END;
$$ LANGUAGE plpgsql;

-- Create a function to efficiently get user's friends with their dogs
CREATE OR REPLACE FUNCTION get_user_friends_with_dogs(user_id_param UUID)
RETURNS TABLE (
  friendship_id UUID,
  friend_id UUID,
  friend_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  dog_count INT,
  dogs JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.id AS friendship_id,
    p.id AS friend_id,
    p.name AS friend_name,
    f.created_at,
    COUNT(d.id)::INT AS dog_count,
    COALESCE(
      JSONB_AGG(
        JSONB_BUILD_OBJECT(
          'id', d.id,
          'name', d.name,
          'breed', d.breed,
          'image_url', d.image_url
        )
      ) FILTER (WHERE d.id IS NOT NULL),
      '[]'::JSONB
    ) AS dogs
  FROM 
    friendships f
    JOIN profiles p ON (
      CASE 
        WHEN f.user1_id = user_id_param THEN f.user2_id = p.id
        ELSE f.user1_id = p.id
      END
    )
    LEFT JOIN dogs d ON p.id = d.owner_id
  WHERE 
    (f.user1_id = user_id_param OR f.user2_id = user_id_param)
  GROUP BY 
    f.id, p.id, p.name, f.created_at
  ORDER BY 
    f.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get user's unread notifications count
CREATE OR REPLACE FUNCTION get_user_unread_notifications_count(user_id_param UUID)
RETURNS INT AS $$
DECLARE
  notification_count INT;
BEGIN
  SELECT COUNT(*) INTO notification_count
  FROM notifications
  WHERE user_id = user_id_param AND read = false;
  
  RETURN notification_count;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get user's cart item count
CREATE OR REPLACE FUNCTION get_user_cart_item_count(user_id_param UUID)
RETURNS INT AS $$
DECLARE
  item_count INT;
BEGIN
  SELECT COALESCE(SUM(quantity), 0) INTO item_count
  FROM cart_items
  WHERE user_id = user_id_param;
  
  RETURN item_count;
END;
$$ LANGUAGE plpgsql;

-- Create a function to efficiently check if a dog has valid vaccine certifications
CREATE OR REPLACE FUNCTION has_valid_vaccine_certification(dog_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
  is_valid BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM vaccine_certifications
    WHERE 
      dog_id = dog_id_param
      AND status = 'approved'
      AND (
        rabies_expiry_date > CURRENT_DATE
        OR combo_expiry_date > CURRENT_DATE
      )
  ) INTO is_valid;
  
  RETURN is_valid;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get park availability summary for the next 7 days
CREATE OR REPLACE FUNCTION get_park_availability_summary(park_id_param UUID)
RETURNS TABLE (
  date DATE,
  available_hours INT,
  has_facility_rental BOOLEAN,
  max_occupancy INT,
  current_reservations INT
) AS $$
BEGIN
  RETURN QUERY
  WITH dates AS (
    SELECT generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '6 days', INTERVAL '1 day')::DATE AS date
  ),
  hours AS (
    SELECT generate_series(6, 21) AS hour
  ),
  reservations AS (
    SELECT 
      r.date,
      CAST(SPLIT_PART(r.start_time, ':', 1) AS INT) AS start_hour,
      r.duration,
      r.reservation_type
    FROM 
      reservations r
    WHERE 
      r.park_id = park_id_param
      AND r.date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '6 days'
      AND r.status = 'confirmed'
  ),
  availability AS (
    SELECT 
      d.date,
      h.hour,
      NOT EXISTS (
        SELECT 1 FROM reservations r
        WHERE 
          r.date = d.date
          AND r.start_hour <= h.hour 
          AND r.start_hour + r.duration > h.hour
          AND r.reservation_type = 'whole_facility'
      ) AS is_available,
      EXISTS (
        SELECT 1 FROM reservations r
        WHERE 
          r.date = d.date
          AND r.start_hour <= h.hour 
          AND r.start_hour + r.duration > h.hour
          AND r.reservation_type = 'whole_facility'
      ) AS has_facility_rental,
      (
        SELECT COUNT(*) FROM reservations r
        WHERE 
          r.date = d.date
          AND r.start_hour <= h.hour 
          AND r.start_hour + r.duration > h.hour
          AND r.reservation_type = 'regular'
      ) AS current_reservations
    FROM 
      dates d
      CROSS JOIN hours h
  )
  SELECT 
    d.date,
    COUNT(a.hour) FILTER (WHERE a.is_available)::INT AS available_hours,
    bool_or(a.has_facility_rental) AS has_facility_rental,
    (SELECT max_capacity FROM dog_parks WHERE id = park_id_param)::INT AS max_occupancy,
    MAX(a.current_reservations)::INT AS current_reservations
  FROM 
    dates d
    LEFT JOIN availability a ON d.date = a.date
  GROUP BY 
    d.date
  ORDER BY 
    d.date;
END;
$$ LANGUAGE plpgsql;