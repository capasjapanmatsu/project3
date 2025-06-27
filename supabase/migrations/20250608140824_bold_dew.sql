/*
  # ワンちゃん削除機能の修正

  1. RLSポリシーの修正
    - dogsテーブルのDELETEポリシーを追加
    - vaccine_certificationsテーブルのDELETEポリシーを追加
    - dog_encountersテーブルのDELETEポリシーを追加

  2. 外部キー制約の確認と修正
    - CASCADE削除の設定

  3. セキュリティ
    - 所有者のみが削除可能
*/

-- dogsテーブルのDELETEポリシーを追加
DROP POLICY IF EXISTS "犬情報は所有者のみ削除可能" ON dogs;
CREATE POLICY "犬情報は所有者のみ削除可能"
  ON dogs
  FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- vaccine_certificationsテーブルのDELETEポリシーを追加
DROP POLICY IF EXISTS "ワクチン証明書は所有者のみ削除可能" ON vaccine_certifications;
CREATE POLICY "ワクチン証明書は所有者のみ削除可能"
  ON vaccine_certifications
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dogs 
      WHERE dogs.id = vaccine_certifications.dog_id 
      AND dogs.owner_id = auth.uid()
    )
  );

-- dog_encountersテーブルのDELETEポリシーを追加
DROP POLICY IF EXISTS "犬の出会い記録は所有者のみ削除可能" ON dog_encounters;
CREATE POLICY "犬の出会い記録は所有者のみ削除可能"
  ON dog_encounters
  FOR DELETE
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

-- 外部キー制約をCASCADE削除に変更
-- vaccine_certificationsの外部キー制約を更新
ALTER TABLE vaccine_certifications 
DROP CONSTRAINT IF EXISTS vaccine_certifications_dog_id_fkey;

ALTER TABLE vaccine_certifications 
ADD CONSTRAINT vaccine_certifications_dog_id_fkey 
FOREIGN KEY (dog_id) REFERENCES dogs(id) ON DELETE CASCADE;

-- dog_encountersの外部キー制約を更新
ALTER TABLE dog_encounters 
DROP CONSTRAINT IF EXISTS dog_encounters_dog1_id_fkey;

ALTER TABLE dog_encounters 
ADD CONSTRAINT dog_encounters_dog1_id_fkey 
FOREIGN KEY (dog1_id) REFERENCES dogs(id) ON DELETE CASCADE;

ALTER TABLE dog_encounters 
DROP CONSTRAINT IF EXISTS dog_encounters_dog2_id_fkey;

ALTER TABLE dog_encounters 
ADD CONSTRAINT dog_encounters_dog2_id_fkey 
FOREIGN KEY (dog2_id) REFERENCES dogs(id) ON DELETE CASCADE;

-- reservationsテーブルの外部キー制約も確認（SET NULLに変更）
ALTER TABLE reservations 
DROP CONSTRAINT IF EXISTS reservations_dog_id_fkey;

ALTER TABLE reservations 
ADD CONSTRAINT reservations_dog_id_fkey 
FOREIGN KEY (dog_id) REFERENCES dogs(id) ON DELETE SET NULL;