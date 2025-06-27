/*
  # Messaging System Implementation
  
  1. New Tables
    - `messages` - Stores all messages between users
      - `id` (uuid, primary key)
      - `sender_id` (uuid, references profiles)
      - `receiver_id` (uuid, references profiles)
      - `content` (text)
      - `read` (boolean)
      - `created_at` (timestamptz)
  
  2. Security
    - Enable RLS on `messages` table
    - Add policies for viewing, sending, and updating messages
  
  3. Functions
    - Functions to count unread messages
    - Function to mark messages as read
    - Function to get conversation summaries
*/

-- Create messages table for the community messaging feature
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS messages_sender_id_idx ON messages(sender_id);
CREATE INDEX IF NOT EXISTS messages_receiver_id_idx ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON messages(created_at);
CREATE INDEX IF NOT EXISTS messages_read_idx ON messages(read);

-- Enable row level security
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to see messages they sent or received
CREATE POLICY "Users can view their own messages"
  ON messages
  FOR SELECT
  TO authenticated
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

-- Create policy to allow users to send messages
CREATE POLICY "Users can send messages"
  ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = auth.uid());

-- Create policy to allow users to mark messages as read
-- Fixed: Removed the OLD reference in WITH CHECK clause
CREATE POLICY "Users can mark messages as read"
  ON messages
  FOR UPDATE
  TO authenticated
  USING (receiver_id = auth.uid())
  WITH CHECK (
    receiver_id = auth.uid() AND
    read = true
  );

-- Function to get unread message count for a user
CREATE OR REPLACE FUNCTION get_unread_message_count(user_id_param uuid)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*)::integer
  FROM messages
  WHERE receiver_id = user_id_param AND read = false;
$$;

-- Function to get unread message count from a specific sender
CREATE OR REPLACE FUNCTION get_unread_message_count_from_sender(user_id_param uuid, sender_id_param uuid)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*)::integer
  FROM messages
  WHERE receiver_id = user_id_param AND sender_id = sender_id_param AND read = false;
$$;

-- Function to mark all messages from a sender as read
CREATE OR REPLACE FUNCTION mark_messages_as_read(user_id_param uuid, sender_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE messages
  SET read = true
  WHERE receiver_id = user_id_param AND sender_id = sender_id_param AND read = false;
END;
$$;

-- Create a view to get the latest message between two users
CREATE OR REPLACE VIEW latest_messages AS
SELECT DISTINCT ON (
  LEAST(sender_id, receiver_id),
  GREATEST(sender_id, receiver_id)
)
  id,
  sender_id,
  receiver_id,
  content,
  read,
  created_at
FROM messages
ORDER BY 
  LEAST(sender_id, receiver_id),
  GREATEST(sender_id, receiver_id),
  created_at DESC;

-- Create a function to get conversation summary for a user
CREATE OR REPLACE FUNCTION get_conversations(user_id_param uuid)
RETURNS TABLE (
  conversation_id text,
  other_user_id uuid,
  other_user_name text,
  last_message text,
  last_message_time timestamptz,
  unread_count integer
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  WITH conversations AS (
    SELECT
      CONCAT(LEAST(m.sender_id, m.receiver_id), '-', GREATEST(m.sender_id, m.receiver_id)) as conv_id,
      CASE
        WHEN m.sender_id = user_id_param THEN m.receiver_id
        ELSE m.sender_id
      END as other_id,
      m.content as last_msg,
      m.created_at as last_time
    FROM latest_messages m
    WHERE m.sender_id = user_id_param OR m.receiver_id = user_id_param
  )
  SELECT
    c.conv_id,
    c.other_id,
    p.name,
    c.last_msg,
    c.last_time,
    get_unread_message_count_from_sender(user_id_param, c.other_id)
  FROM conversations c
  JOIN profiles p ON c.other_id = p.id
  ORDER BY c.last_time DESC;
END;
$$;

-- Insert sample messages for testing
DO $$
DECLARE
  user1_id uuid;
  user2_id uuid;
  friendship_id uuid;
BEGIN
  -- Get two users who are friends
  SELECT f.id, f.user1_id, f.user2_id 
  INTO friendship_id, user1_id, user2_id
  FROM friendships f
  LIMIT 1;
  
  -- If we found a friendship, create sample messages
  IF friendship_id IS NOT NULL THEN
    -- Insert messages from user1 to user2
    INSERT INTO messages (sender_id, receiver_id, content, read, created_at)
    VALUES
      (user1_id, user2_id, 'こんにちは！ドッグランでまた会いましょう！', true, now() - interval '3 days'),
      (user2_id, user1_id, 'いいですね！今度の週末はどうですか？', true, now() - interval '3 days' + interval '5 minutes'),
      (user1_id, user2_id, '土曜日の午後2時頃はどうですか？', true, now() - interval '2 days'),
      (user2_id, user1_id, '土曜日の2時で大丈夫です！代々木ドッグパークで会いましょう', true, now() - interval '2 days' + interval '10 minutes'),
      (user1_id, user2_id, '了解です！楽しみにしています', true, now() - interval '2 days' + interval '15 minutes'),
      (user2_id, user1_id, 'うちの犬も喜ぶと思います！', false, now() - interval '1 day');
  END IF;
END $$;