/*
  Fix Sample Data Ownership
  This migration updates all sample data to use capasjapan@gmail.com as the owner/admin
  for consistency in production and development environments.
*/

-- Function to fix sample data ownership
CREATE OR REPLACE FUNCTION fix_sample_data_ownership()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_user_id uuid;
  sample_park_record RECORD;
  sample_user_record RECORD;
  sample_dog_record RECORD;
  sample_reservation_record RECORD;
  sample_review_record RECORD;
BEGIN
  -- Get the admin user ID for capasjapan@gmail.com
  SELECT id INTO admin_user_id 
  FROM auth.users 
  WHERE email = 'capasjapan@gmail.com';
  
  IF admin_user_id IS NULL THEN
    RAISE NOTICE 'Admin user capasjapan@gmail.com not found. Skipping sample data fix.';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Found admin user ID: %', admin_user_id;
  
  -- Update admin user profile to be owner type
  UPDATE profiles 
  SET user_type = 'owner'
  WHERE id = admin_user_id;
  
  RAISE NOTICE 'Updated admin user profile to owner type';
  
  -- 1. Update all sample dog parks to be owned by admin
  UPDATE dog_parks 
  SET owner_id = admin_user_id
  WHERE owner_id IS NULL 
     OR owner_id IN (
       SELECT id FROM profiles 
       WHERE name IN ('サンプルオーナー', '山田太郎', '佐藤花子', '鈴木一郎')
     );
  
  GET DIAGNOSTICS sample_park_record = ROW_COUNT;
  RAISE NOTICE 'Updated % dog parks to admin ownership', sample_park_record;
  
  -- 2. Update sample dogs to be owned by admin
  UPDATE dogs 
  SET owner_id = admin_user_id
  WHERE owner_id IN (
    SELECT id FROM profiles 
    WHERE name IN ('山田花子', '佐藤健太', '鈴木一郎', '高橋美咲', '田中花子', '佐藤太郎', '田中一郎')
       OR email LIKE '%@example.com'
  );
  
  GET DIAGNOSTICS sample_dog_record = ROW_COUNT;
  RAISE NOTICE 'Updated % dogs to admin ownership', sample_dog_record;
  
  -- 3. Update sample reservations to be made by admin
  UPDATE reservations 
  SET user_id = admin_user_id
  WHERE user_id IN (
    SELECT id FROM profiles 
    WHERE name IN ('山田花子', '佐藤健太', '鈴木一郎', '高橋美咲', '田中花子', '佐藤太郎', '田中一郎')
       OR email LIKE '%@example.com'
  );
  
  GET DIAGNOSTICS sample_reservation_record = ROW_COUNT;
  RAISE NOTICE 'Updated % reservations to admin user', sample_reservation_record;
  
  -- 4. Update sample reviews to be made by admin
  UPDATE dog_park_reviews 
  SET user_id = admin_user_id
  WHERE user_id IN (
    SELECT id FROM profiles 
    WHERE name IN ('山田花子', '佐藤健太', '鈴木一郎', '高橋美咲', '田中花子', '佐藤太郎', '田中一郎')
       OR email LIKE '%@example.com'
  );
  
  GET DIAGNOSTICS sample_review_record = ROW_COUNT;
  RAISE NOTICE 'Updated % reviews to admin user', sample_review_record;
  
  -- 5. Update sample dog encounters to be for admin's dogs
  UPDATE dog_encounters 
  SET user_id = admin_user_id
  WHERE user_id IN (
    SELECT id FROM profiles 
    WHERE name IN ('山田花子', '佐藤健太', '鈴木一郎', '高橋美咲', '田中花子', '佐藤太郎', '田中一郎')
       OR email LIKE '%@example.com'
  );
  
  -- 6. Update sample subscriptions to be for admin user
  UPDATE subscriptions 
  SET user_id = admin_user_id
  WHERE user_id IN (
    SELECT id FROM profiles 
    WHERE name IN ('山田花子', '佐藤健太', '鈴木一郎', '高橋美咲', '田中花子', '佐藤太郎', '田中一郎')
       OR email LIKE '%@example.com'
  );
  
  -- 7. Update stripe subscriptions to be for admin user
  UPDATE stripe_subscriptions 
  SET customer_id = (
    SELECT customer_id FROM stripe_customers WHERE user_id = admin_user_id LIMIT 1
  )
  WHERE customer_id IN (
    SELECT sc.customer_id FROM stripe_customers sc
    JOIN profiles p ON sc.user_id = p.id
    WHERE p.name IN ('山田花子', '佐藤健太', '鈴木一郎', '高橋美咲', '田中花子', '佐藤太郎', '田中一郎')
       OR p.email LIKE '%@example.com'
  );
  
  -- 8. Update monthly payouts to be for admin user
  UPDATE monthly_payouts 
  SET owner_id = admin_user_id
  WHERE owner_id IN (
    SELECT id FROM profiles 
    WHERE name IN ('サンプルオーナー', '山田太郎', '佐藤花子', '鈴木一郎')
       OR email LIKE '%@example.com'
  );
  
  -- 9. Update bank accounts to be for admin user
  UPDATE owner_bank_accounts 
  SET owner_id = admin_user_id
  WHERE owner_id IN (
    SELECT id FROM profiles 
    WHERE name IN ('サンプルオーナー', '山田太郎', '佐藤花子', '鈴木一郎')
       OR email LIKE '%@example.com'
  );
  
  -- 10. Delete sample user profiles (but keep admin profile)
  DELETE FROM profiles 
  WHERE id != admin_user_id 
    AND (
      name IN ('山田花子', '佐藤健太', '鈴木一郎', '高橋美咲', '田中花子', '佐藤太郎', '田中一郎', 'サンプルオーナー', '山田太郎', '佐藤花子')
      OR email LIKE '%@example.com'
    );
  
  GET DIAGNOSTICS sample_user_record = ROW_COUNT;
  RAISE NOTICE 'Deleted % sample user profiles', sample_user_record;
  
  -- 11. Update news announcements to be created by admin
  UPDATE news_announcements 
  SET created_by = admin_user_id
  WHERE created_by IS NOT NULL;
  
  -- 12. Update vaccine certifications status to approved for admin's dogs
  UPDATE vaccine_certifications 
  SET status = 'approved', 
      approved_at = NOW(),
      approved_by = admin_user_id
  WHERE dog_id IN (
    SELECT id FROM dogs WHERE owner_id = admin_user_id
  );
  
  -- 13. Update contact messages to be from admin
  UPDATE contact_messages 
  SET user_id = admin_user_id
  WHERE user_id IN (
    SELECT id FROM profiles 
    WHERE name IN ('山田花子', '佐藤健太', '鈴木一郎', '高橋美咲', '田中花子', '佐藤太郎', '田中一郎')
       OR email LIKE '%@example.com'
  );
  
  RAISE NOTICE 'Sample data ownership fix completed successfully!';
  RAISE NOTICE 'All sample data is now owned by admin user: %', admin_user_id;
END;
$$;

-- Execute the function
SELECT fix_sample_data_ownership();

-- Drop the function after use
DROP FUNCTION IF EXISTS fix_sample_data_ownership();

-- Add a comment to track this migration
COMMENT ON SCHEMA public IS 'Sample data ownership fixed to use capasjapan@gmail.com as owner/admin - 2025-07-13'; 