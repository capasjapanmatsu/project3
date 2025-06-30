-- reservationsテーブルのRLS有効化とポリシー追加
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- ユーザー本人の予約のみ閲覧・操作
CREATE POLICY "Users can manage their own reservations"
  ON reservations
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 施設オーナーは自分の施設の予約を閲覧
CREATE POLICY "Park owners can view reservations for their parks"
  ON reservations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dog_parks
      WHERE dog_parks.id = reservations.park_id
      AND dog_parks.owner_id = auth.uid()
    )
  ); 