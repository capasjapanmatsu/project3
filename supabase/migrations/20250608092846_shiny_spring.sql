/*
  # コミュニティシステムの実装

  1. 新規テーブル
    - `dog_encounters`: ドッグランで一緒になった犬の記録
    - `friend_requests`: 友達申請
    - `friendships`: 友達関係
    - `notifications`: 通知システム

  2. セキュリティ
    - 全テーブルでRLSを有効化
    - 適切なポリシーを設定

  3. 機能
    - 犬同士の出会い記録
    - 友達申請・承認システム
    - リアルタイム通知
*/

-- 犬の出会い記録テーブル
CREATE TABLE IF NOT EXISTS dog_encounters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dog1_id uuid NOT NULL,
  dog2_id uuid NOT NULL,
  park_id uuid NOT NULL,
  encounter_date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT dog_encounters_dog1_id_fkey FOREIGN KEY (dog1_id) REFERENCES dogs(id),
  CONSTRAINT dog_encounters_dog2_id_fkey FOREIGN KEY (dog2_id) REFERENCES dogs(id),
  CONSTRAINT dog_encounters_park_id_fkey FOREIGN KEY (park_id) REFERENCES dog_parks(id),
  CONSTRAINT different_dogs CHECK (dog1_id != dog2_id)
);

-- 重複防止のためのユニーク制約
CREATE UNIQUE INDEX IF NOT EXISTS dog_encounters_unique 
ON dog_encounters (
  LEAST(dog1_id, dog2_id), 
  GREATEST(dog1_id, dog2_id), 
  park_id, 
  encounter_date
);

ALTER TABLE dog_encounters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "犬の出会い記録は所有者のみ参照可能"
  ON dog_encounters
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dogs 
      WHERE dogs.id = dog_encounters.dog1_id 
      AND dogs.owner_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM dogs 
      WHERE dogs.id = dog_encounters.dog2_id 
      AND dogs.owner_id = auth.uid()
    )
  );

CREATE POLICY "犬の出会い記録は所有者のみ作成可能"
  ON dog_encounters
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM dogs 
      WHERE dogs.id = dog_encounters.dog1_id 
      AND dogs.owner_id = auth.uid()
    )
  );

-- 友達申請テーブル
CREATE TABLE IF NOT EXISTS friend_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL,
  requested_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  message text,
  created_at timestamptz DEFAULT now(),
  responded_at timestamptz,
  CONSTRAINT friend_requests_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES profiles(id),
  CONSTRAINT friend_requests_requested_id_fkey FOREIGN KEY (requested_id) REFERENCES profiles(id),
  CONSTRAINT friend_requests_status_check CHECK (status IN ('pending', 'accepted', 'rejected')),
  CONSTRAINT different_users CHECK (requester_id != requested_id)
);

-- 同じユーザー間の重複申請を防ぐ
CREATE UNIQUE INDEX IF NOT EXISTS friend_requests_unique 
ON friend_requests (
  LEAST(requester_id, requested_id), 
  GREATEST(requester_id, requested_id)
) WHERE status = 'pending';

ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "友達申請は関係者のみ参照可能"
  ON friend_requests
  FOR SELECT
  TO authenticated
  USING (requester_id = auth.uid() OR requested_id = auth.uid());

CREATE POLICY "友達申請は本人のみ作成可能"
  ON friend_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (requester_id = auth.uid());

CREATE POLICY "友達申請は関係者のみ更新可能"
  ON friend_requests
  FOR UPDATE
  TO authenticated
  USING (requester_id = auth.uid() OR requested_id = auth.uid())
  WITH CHECK (requester_id = auth.uid() OR requested_id = auth.uid());

-- 友達関係テーブル
CREATE TABLE IF NOT EXISTS friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id uuid NOT NULL,
  user2_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT friendships_user1_id_fkey FOREIGN KEY (user1_id) REFERENCES profiles(id),
  CONSTRAINT friendships_user2_id_fkey FOREIGN KEY (user2_id) REFERENCES profiles(id),
  CONSTRAINT different_users CHECK (user1_id != user2_id)
);

-- 友達関係の重複を防ぐ
CREATE UNIQUE INDEX IF NOT EXISTS friendships_unique 
ON friendships (
  LEAST(user1_id, user2_id), 
  GREATEST(user1_id, user2_id)
);

ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "友達関係は関係者のみ参照可能"
  ON friendships
  FOR SELECT
  TO authenticated
  USING (user1_id = auth.uid() OR user2_id = auth.uid());

CREATE POLICY "友達関係は関係者のみ作成可能"
  ON friendships
  FOR INSERT
  TO authenticated
  WITH CHECK (user1_id = auth.uid() OR user2_id = auth.uid());

CREATE POLICY "友達関係は関係者のみ削除可能"
  ON friendships
  FOR DELETE
  TO authenticated
  USING (user1_id = auth.uid() OR user2_id = auth.uid());

-- 通知テーブル
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  data jsonb DEFAULT '{}',
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id),
  CONSTRAINT notifications_type_check CHECK (type IN ('friend_request', 'friend_accepted', 'friend_at_park', 'reservation_reminder'))
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "通知は本人のみ参照可能"
  ON notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "通知は本人のみ更新可能"
  ON notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "通知は本人のみ削除可能"
  ON notifications
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- 犬の画像URLカラムを追加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dogs' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE dogs ADD COLUMN image_url text;
  END IF;
END $$;

-- 友達申請承認時に友達関係を作成し、通知を送信する関数
CREATE OR REPLACE FUNCTION handle_friend_request_acceptance()
RETURNS TRIGGER AS $$
BEGIN
  -- 友達申請が承認された場合
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    -- 友達関係を作成
    INSERT INTO friendships (user1_id, user2_id)
    VALUES (NEW.requester_id, NEW.requested_id)
    ON CONFLICT DO NOTHING;
    
    -- 申請者に通知を送信
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
      NEW.requester_id,
      'friend_accepted',
      '友達申請が承認されました',
      'あなたの友達申請が承認されました。',
      jsonb_build_object('friend_id', NEW.requested_id)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 友達申請承認時のトリガー
DROP TRIGGER IF EXISTS friend_request_acceptance_trigger ON friend_requests;
CREATE TRIGGER friend_request_acceptance_trigger
  AFTER UPDATE ON friend_requests
  FOR EACH ROW
  EXECUTE FUNCTION handle_friend_request_acceptance();

-- 予約作成時に犬の出会いを記録する関数
CREATE OR REPLACE FUNCTION record_dog_encounters()
RETURNS TRIGGER AS $$
DECLARE
  other_reservation RECORD;
BEGIN
  -- 同じ日、同じパークの他の予約を検索
  FOR other_reservation IN
    SELECT r.dog_id, r.user_id
    FROM reservations r
    WHERE r.park_id = NEW.park_id
    AND r.date = NEW.date
    AND r.status = 'confirmed'
    AND r.id != NEW.id
    AND r.user_id != NEW.user_id
  LOOP
    -- 犬の出会いを記録
    INSERT INTO dog_encounters (dog1_id, dog2_id, park_id, encounter_date)
    VALUES (NEW.dog_id, other_reservation.dog_id, NEW.park_id, NEW.date)
    ON CONFLICT DO NOTHING;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 予約作成時の犬の出会い記録トリガー
DROP TRIGGER IF EXISTS record_encounters_trigger ON reservations;
CREATE TRIGGER record_encounters_trigger
  AFTER INSERT ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION record_dog_encounters();

-- 友達がドッグランに入った時の通知関数
CREATE OR REPLACE FUNCTION notify_friends_at_park()
RETURNS TRIGGER AS $$
DECLARE
  friend_record RECORD;
BEGIN
  -- 友達リストを取得して通知
  FOR friend_record IN
    SELECT 
      CASE 
        WHEN f.user1_id = NEW.user_id THEN f.user2_id
        ELSE f.user1_id
      END as friend_id,
      p.name as friend_name
    FROM friendships f
    JOIN profiles p ON (
      CASE 
        WHEN f.user1_id = NEW.user_id THEN f.user2_id = p.id
        ELSE f.user1_id = p.id
      END
    )
    WHERE f.user1_id = NEW.user_id OR f.user2_id = NEW.user_id
  LOOP
    -- 友達に通知を送信
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
      friend_record.friend_id,
      'friend_at_park',
      '友達がドッグランにいます',
      friend_record.friend_name || 'さんがドッグランに入場しました。',
      jsonb_build_object(
        'friend_id', NEW.user_id,
        'park_id', NEW.park_id,
        'reservation_id', NEW.id
      )
    );
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 友達のドッグラン入場通知トリガー
DROP TRIGGER IF EXISTS notify_friends_trigger ON reservations;
CREATE TRIGGER notify_friends_trigger
  AFTER INSERT ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION notify_friends_at_park();