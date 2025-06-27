/*
  # Add Blacklist Feature

  1. New Tables
    - `dog_blacklist` - Stores blacklisted dogs with reasons and notification preferences
  
  2. Changes
    - Add new notification type for blacklisted dogs
  
  3. Security
    - Enable RLS on new table
    - Add policies for authenticated users to manage their blacklist
*/

-- Create dog blacklist table
CREATE TABLE IF NOT EXISTS dog_blacklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  dog_id uuid NOT NULL REFERENCES dogs(id) ON DELETE CASCADE,
  reason text NOT NULL,
  notify_when_nearby boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  
  -- Ensure a user can't blacklist the same dog twice
  CONSTRAINT unique_user_dog_blacklist UNIQUE (user_id, dog_id)
);

-- Enable RLS
ALTER TABLE dog_blacklist ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Users can manage their own blacklist"
  ON dog_blacklist
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create function to check for blacklisted dogs nearby
CREATE OR REPLACE FUNCTION check_blacklisted_dogs_nearby()
RETURNS TRIGGER AS $$
DECLARE
  blacklisted_record RECORD;
  dog_owner_id uuid;
  blacklist_owner_id uuid;
  dog_name text;
  park_name text;
BEGIN
  -- Get the park name
  SELECT name INTO park_name FROM dog_parks WHERE id = NEW.park_id;
  
  -- For each dog in the reservation, check if it's blacklisted by anyone
  -- First, get the dog owner
  SELECT owner_id INTO dog_owner_id FROM dogs WHERE id = NEW.dog_id;
  
  -- Check if this dog is blacklisted by anyone
  FOR blacklisted_record IN 
    SELECT bl.*, d.name as dog_name
    FROM dog_blacklist bl
    JOIN dogs d ON bl.dog_id = d.id
    WHERE bl.dog_id = NEW.dog_id
      AND bl.notify_when_nearby = true
  LOOP
    -- Get the blacklist owner ID
    blacklist_owner_id := blacklisted_record.user_id;
    dog_name := blacklisted_record.dog_name;
    
    -- Create notification for the blacklist owner
    INSERT INTO notifications (
      user_id, 
      type, 
      title, 
      message, 
      data, 
      read
    ) VALUES (
      blacklist_owner_id,
      'blacklisted_dog_nearby',
      'ブラックリストのワンちゃんが近くにいます',
      dog_name || 'が' || park_name || 'にいます',
      jsonb_build_object(
        'dog_id', NEW.dog_id,
        'park_id', NEW.park_id,
        'blacklist_id', blacklisted_record.id
      ),
      false
    );
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for blacklisted dog notifications
CREATE TRIGGER blacklisted_dog_notification_trigger
AFTER INSERT ON reservations
FOR EACH ROW
EXECUTE FUNCTION check_blacklisted_dogs_nearby();

-- Insert sample blacklist data for testing
DO $$
DECLARE
  sample_user_id uuid;
  sample_dog_id uuid;
BEGIN
  -- Get a sample user ID
  SELECT id INTO sample_user_id FROM profiles LIMIT 1;
  
  -- Get a dog ID that doesn't belong to this user
  SELECT d.id INTO sample_dog_id 
  FROM dogs d
  WHERE d.owner_id != sample_user_id
  LIMIT 1;
  
  -- If we found both a user and a dog, create a sample blacklist entry
  IF sample_user_id IS NOT NULL AND sample_dog_id IS NOT NULL THEN
    INSERT INTO dog_blacklist (user_id, dog_id, reason, notify_when_nearby)
    VALUES (
      sample_user_id,
      sample_dog_id,
      '以前ドッグランで噛みつかれたため',
      true
    )
    ON CONFLICT DO NOTHING;
  END IF;
END $$;