/*
  # Community Features Implementation

  1. New Functions
    - `get_user_friends`: Returns a user's friends with profile information
    - `handle_friend_request_acceptance`: Trigger function for friend request acceptance
    - `search_users_by_name`: Search for users by name with friendship status

  2. Security
    - Enable RLS on messages, friend_requests, and friendships tables
    - Add policies for proper access control

  3. Changes
    - Add trigger for friend request acceptance
    - Create policies for messages, friend requests, and friendships
*/

-- Create or replace the function to get a user's friends
CREATE OR REPLACE FUNCTION get_user_friends(p_user_id uuid)
RETURNS TABLE (
  id uuid,
  user1_id uuid,
  user2_id uuid,
  created_at timestamptz,
  friend_id uuid,
  friend json,
  dog_count bigint
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH user_friendships AS (
    SELECT 
      f.id,
      f.user1_id,
      f.user2_id,
      f.created_at,
      CASE 
        WHEN f.user1_id = p_user_id THEN f.user2_id
        ELSE f.user1_id
      END AS friend_id
    FROM friendships f
    WHERE f.user1_id = p_user_id OR f.user2_id = p_user_id
  ),
  friend_dogs AS (
    SELECT 
      uf.friend_id,
      COUNT(d.id) AS dog_count
    FROM user_friendships uf
    LEFT JOIN dogs d ON d.owner_id = uf.friend_id
    GROUP BY uf.friend_id
  )
  SELECT 
    uf.id,
    uf.user1_id,
    uf.user2_id,
    uf.created_at,
    uf.friend_id,
    row_to_json(p.*) AS friend,
    COALESCE(fd.dog_count, 0) AS dog_count
  FROM user_friendships uf
  JOIN profiles p ON p.id = uf.friend_id
  LEFT JOIN friend_dogs fd ON fd.friend_id = uf.friend_id
  ORDER BY p.name;
END;
$$;

-- Create or replace the function to handle friend request acceptance
CREATE OR REPLACE FUNCTION handle_friend_request_acceptance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only proceed if the status was changed to 'accepted'
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    -- Create friendship record
    INSERT INTO friendships (user1_id, user2_id)
    VALUES (
      LEAST(NEW.requester_id, NEW.requested_id),
      GREATEST(NEW.requester_id, NEW.requested_id)
    )
    ON CONFLICT DO NOTHING;
    
    -- Create notification for requester
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      data,
      read
    )
    VALUES (
      NEW.requester_id,
      'friend_accepted',
      '友達リクエスト承認',
      (SELECT name FROM profiles WHERE id = NEW.requested_id) || 'さんがあなたの友達リクエストを承認しました',
      jsonb_build_object('user_id', NEW.requested_id),
      false
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for friend request acceptance if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'friend_request_acceptance_trigger'
  ) THEN
    CREATE TRIGGER friend_request_acceptance_trigger
    AFTER UPDATE ON friend_requests
    FOR EACH ROW
    EXECUTE FUNCTION handle_friend_request_acceptance();
  END IF;
END
$$;

-- Ensure RLS is enabled on messages table
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can view their own messages' AND polrelid = 'messages'::regclass) THEN
    DROP POLICY "Users can view their own messages" ON messages;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can send messages' AND polrelid = 'messages'::regclass) THEN
    DROP POLICY "Users can send messages" ON messages;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can mark messages as read' AND polrelid = 'messages'::regclass) THEN
    DROP POLICY "Users can mark messages as read" ON messages;
  END IF;
END
$$;

-- Create policies for messages table
CREATE POLICY "Users can view their own messages"
  ON messages
  FOR SELECT
  TO authenticated
  USING ((sender_id = auth.uid()) OR (receiver_id = auth.uid()));

CREATE POLICY "Users can send messages"
  ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can mark messages as read"
  ON messages
  FOR UPDATE
  TO authenticated
  USING (receiver_id = auth.uid())
  WITH CHECK ((receiver_id = auth.uid()) AND (read = true));

-- Ensure RLS is enabled on friend_requests table
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can view their own friend requests' AND polrelid = 'friend_requests'::regclass) THEN
    DROP POLICY "Users can view their own friend requests" ON friend_requests;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can send friend requests' AND polrelid = 'friend_requests'::regclass) THEN
    DROP POLICY "Users can send friend requests" ON friend_requests;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can respond to friend requests' AND polrelid = 'friend_requests'::regclass) THEN
    DROP POLICY "Users can respond to friend requests" ON friend_requests;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can cancel their own friend requests' AND polrelid = 'friend_requests'::regclass) THEN
    DROP POLICY "Users can cancel their own friend requests" ON friend_requests;
  END IF;
END
$$;

-- Create policies for friend_requests table
CREATE POLICY "Users can view their own friend requests"
  ON friend_requests
  FOR SELECT
  TO authenticated
  USING ((requester_id = auth.uid()) OR (requested_id = auth.uid()));

CREATE POLICY "Users can send friend requests"
  ON friend_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (requester_id = auth.uid());

CREATE POLICY "Users can respond to friend requests"
  ON friend_requests
  FOR UPDATE
  TO authenticated
  USING (requested_id = auth.uid())
  WITH CHECK (requested_id = auth.uid());

CREATE POLICY "Users can cancel their own friend requests"
  ON friend_requests
  FOR DELETE
  TO authenticated
  USING (requester_id = auth.uid());

-- Ensure RLS is enabled on friendships table
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can view their own friendships' AND polrelid = 'friendships'::regclass) THEN
    DROP POLICY "Users can view their own friendships" ON friendships;
  END IF;
END
$$;

-- Create policies for friendships table
CREATE POLICY "Users can view their own friendships"
  ON friendships
  FOR SELECT
  TO authenticated
  USING ((user1_id = auth.uid()) OR (user2_id = auth.uid()));

-- Create function to search for users by name
CREATE OR REPLACE FUNCTION search_users_by_name(search_term text, current_user_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  user_type text,
  is_friend boolean,
  has_pending_request boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH user_friends AS (
    SELECT 
      CASE 
        WHEN f.user1_id = current_user_id THEN f.user2_id
        ELSE f.user1_id
      END AS friend_id
    FROM friendships f
    WHERE f.user1_id = current_user_id OR f.user2_id = current_user_id
  ),
  pending_requests AS (
    SELECT 
      CASE 
        WHEN fr.requester_id = current_user_id THEN fr.requested_id
        ELSE fr.requester_id
      END AS request_user_id
    FROM friend_requests fr
    WHERE (fr.requester_id = current_user_id OR fr.requested_id = current_user_id)
    AND fr.status = 'pending'
  )
  SELECT 
    p.id,
    p.name,
    p.user_type,
    CASE WHEN uf.friend_id IS NOT NULL THEN true ELSE false END AS is_friend,
    CASE WHEN pr.request_user_id IS NOT NULL THEN true ELSE false END AS has_pending_request
  FROM profiles p
  LEFT JOIN user_friends uf ON p.id = uf.friend_id
  LEFT JOIN pending_requests pr ON p.id = pr.request_user_id
  WHERE p.id != current_user_id
  AND p.name ILIKE '%' || search_term || '%'
  ORDER BY p.name;
END;
$$;

-- Add comment to the function
COMMENT ON FUNCTION search_users_by_name IS 'Search for users by name, excluding the current user and showing friendship status';