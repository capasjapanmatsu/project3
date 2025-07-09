/*
  # Restore Original Bolt.new Policies
  
  This restores the exact policies that were working in Bolt.new
  The key missing piece was the profile INSERT policy.
*/

-- Clean up ALL possible policies
DROP POLICY IF EXISTS "allow_all_profiles" ON profiles;
DROP POLICY IF EXISTS "allow_all_dogs" ON dogs;
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "dogs_select_own" ON dogs;
DROP POLICY IF EXISTS "dogs_insert_own" ON dogs;
DROP POLICY IF EXISTS "dogs_update_own" ON dogs;
DROP POLICY IF EXISTS "dogs_delete_own" ON dogs;

-- Drop original policies too
DROP POLICY IF EXISTS "プロフィールは本人のみ参照可能" ON profiles;
DROP POLICY IF EXISTS "プロフィールは本人のみ更新可能" ON profiles;
DROP POLICY IF EXISTS "プロフィールは本人のみ作成可能" ON profiles;
DROP POLICY IF EXISTS "犬情報は所有者のみ参照可能" ON dogs;
DROP POLICY IF EXISTS "犬情報は所有者のみ更新可能" ON dogs;

-- Restore EXACT original policies from Bolt

-- Profiles policies (including the missing INSERT!)
CREATE POLICY "プロフィールは本人のみ参照可能"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "プロフィールは本人のみ更新可能"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- ADD the missing INSERT policy for profiles
CREATE POLICY "プロフィールは本人のみ作成可能"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Dogs policies (these were correct in original)
CREATE POLICY "犬情報は所有者のみ参照可能"
  ON dogs
  FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "犬情報は所有者のみ更新可能"
  ON dogs
  FOR ALL
  TO authenticated
  USING (owner_id = auth.uid());

-- Ensure proper permissions
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON dogs TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Ensure dog-images bucket exists with proper settings
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'dog-images',
  'dog-images', 
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage policy for dog images
DROP POLICY IF EXISTS "dog_images_all_access" ON storage.objects;
DROP POLICY IF EXISTS "犬の画像は認証ユーザーがアップロード可能" ON storage.objects;
CREATE POLICY "犬の画像は認証ユーザーがアップロード可能" ON storage.objects 
FOR ALL TO authenticated 
USING (bucket_id = 'dog-images') 
WITH CHECK (bucket_id = 'dog-images');

-- Success message
SELECT 'Original Bolt.new policies restored successfully' as message;
