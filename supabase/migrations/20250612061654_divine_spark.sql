-- Create sample users and dogs with encounters
-- This migration creates sample data for the community section

-- Create a function to generate sample data that works with existing users
CREATE OR REPLACE FUNCTION create_sample_community_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  capasjapan_id uuid;
  capasjapan_dog_id uuid;
  sample_park_id uuid := gen_random_uuid();
BEGIN
  -- Get the user ID for capasjapan@gmail.com
  SELECT id INTO capasjapan_id FROM auth.users WHERE email = 'capasjapan@gmail.com';
  
  -- If we found the user, create a dog for them if they don't have one
  IF capasjapan_id IS NOT NULL THEN
    -- Check if they already have a dog
    SELECT id INTO capasjapan_dog_id FROM dogs WHERE owner_id = capasjapan_id LIMIT 1;
    
    -- If they don't have a dog, create one
    IF capasjapan_dog_id IS NULL THEN
      -- Create a dog for capasjapan@gmail.com
      INSERT INTO dogs (owner_id, name, breed, birth_date, gender, created_at, image_url)
      VALUES
        (capasjapan_id, 'ポチ', 'サモエド', '2021-06-15', 'オス', now() - interval '10 days', 'https://images.pexels.com/photos/3726314/pexels-photo-3726314.jpeg')
      RETURNING id INTO capasjapan_dog_id;
      
      -- Create vaccine certification for the dog
      INSERT INTO vaccine_certifications (dog_id, status, approved_at, created_at, rabies_expiry_date, combo_expiry_date)
      VALUES
        (capasjapan_dog_id, 'approved', now() - interval '9 days', now() - interval '10 days', now() + interval '1 year', now() + interval '1 year');
    END IF;
    
    -- Create a sample dog park for encounters if it doesn't exist
    INSERT INTO dog_parks (id, owner_id, name, description, address, price, status, facilities, max_capacity)
    VALUES
      (sample_park_id, capasjapan_id, '代々木ドッグパーク', '緑豊かな環境で愛犬と楽しい時間を過ごせます', '東京都渋谷区代々木2-1-1', 800, 'approved', 
       '{"parking": true, "shower": true, "restroom": true, "agility": true, "rest_area": true, "water_station": true}', 20)
    ON CONFLICT DO NOTHING;
    
    -- Create sample encounters with existing users' dogs
    -- We'll find existing users and their dogs instead of creating new ones
    DECLARE
      existing_dogs CURSOR FOR 
        SELECT d.id, d.owner_id, d.name, p.name as owner_name
        FROM dogs d
        JOIN profiles p ON d.owner_id = p.id
        WHERE d.owner_id != capasjapan_id
        LIMIT 5;
      
      dog_record RECORD;
      encounter_count INTEGER := 0;
    BEGIN
      OPEN existing_dogs;
      
      LOOP
        FETCH existing_dogs INTO dog_record;
        EXIT WHEN NOT FOUND OR encounter_count >= 3;
        
        -- Create encounter with this dog
        -- Use the unique index instead of primary key constraint
        INSERT INTO dog_encounters (dog1_id, dog2_id, park_id, encounter_date, created_at)
        VALUES
          (LEAST(capasjapan_dog_id, dog_record.id), GREATEST(capasjapan_dog_id, dog_record.id), sample_park_id, 
           current_date - interval '5 days' + (encounter_count * interval '2 days'), 
           now() - interval '5 days' + (encounter_count * interval '2 days'))
        ON CONFLICT ON CONSTRAINT dog_encounters_pkey DO NOTHING;
        
        -- Create friendship with owner if this is the first or second dog
        IF encounter_count < 2 THEN
          -- Fix: Use ON CONFLICT (user1_id, user2_id) instead of the named constraint
          INSERT INTO friendships (user1_id, user2_id, created_at)
          VALUES
            (LEAST(capasjapan_id, dog_record.owner_id), GREATEST(capasjapan_id, dog_record.owner_id), 
             now() - interval '15 days' + (encounter_count * interval '5 days'))
          ON CONFLICT (LEAST(user1_id, user2_id), GREATEST(user1_id, user2_id)) DO NOTHING;
          
          -- Create notification about this friend
          INSERT INTO notifications (user_id, type, title, message, data, read, created_at)
          VALUES
            (capasjapan_id, 'friend_at_park', '友達がドッグランにいます', 
             dog_record.owner_name || 'さんが代々木ドッグパークにいます', 
             jsonb_build_object('friend_id', dog_record.owner_id, 'park_id', sample_park_id), 
             false, now() - interval '1 day' - (encounter_count * interval '1 day'))
          ON CONFLICT DO NOTHING;
        ELSE
          -- Fix: Use the correct unique constraint for friend_requests
          -- First check if a friend request already exists between these users
          IF NOT EXISTS (
            SELECT 1 FROM friend_requests 
            WHERE 
              (LEAST(requester_id, requested_id) = LEAST(dog_record.owner_id, capasjapan_id) AND
               GREATEST(requester_id, requested_id) = GREATEST(dog_record.owner_id, capasjapan_id))
              AND status = 'pending'
          ) THEN
            -- Create friend request from the third dog's owner
            INSERT INTO friend_requests (requester_id, requested_id, status, message, created_at)
            VALUES
              (dog_record.owner_id, capasjapan_id, 'pending', 
               'ドッグランで会いましたね！友達になりましょう', now() - interval '5 days')
            ON CONFLICT DO NOTHING;
            
            -- Create notification about this friend request
            INSERT INTO notifications (user_id, type, title, message, data, read, created_at)
            VALUES
              (capasjapan_id, 'friend_request', '新しい友達申請', 
               dog_record.owner_name || 'さんから友達申請が届きました', 
               jsonb_build_object('requester_id', dog_record.owner_id), 
               false, now() - interval '2 days')
            ON CONFLICT DO NOTHING;
          END IF;
        END IF;
        
        encounter_count := encounter_count + 1;
      END LOOP;
      
      CLOSE existing_dogs;
      
      -- If we didn't find any existing dogs, create a reservation notification
      IF encounter_count = 0 THEN
        INSERT INTO notifications (user_id, type, title, message, data, read, created_at)
        VALUES
          (capasjapan_id, 'reservation_reminder', '予約リマインダー', 
           '明日の代々木ドッグパークの予約があります', 
           jsonb_build_object('park_id', sample_park_id), 
           true, now() - interval '3 days')
        ON CONFLICT DO NOTHING;
      END IF;
    END;
  END IF;
END $$;

-- Execute the function to create sample data
SELECT create_sample_community_data();

-- Drop the function after use
DROP FUNCTION create_sample_community_data();