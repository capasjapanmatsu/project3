-- デバッグ用の関数を追加
-- 現在のユーザーIDを取得する関数
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT auth.uid();
$$;

-- 現在のユーザーのauth情報を取得する関数
CREATE OR REPLACE FUNCTION get_current_user_info()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT jsonb_build_object(
    'user_id', auth.uid(),
    'user_id_type', pg_typeof(auth.uid()),
    'role', auth.role(),
    'email', auth.email(),
    'jwt_claims', auth.jwt()
  );
$$;

-- 犬のデータとowner_idを確認する関数
CREATE OR REPLACE FUNCTION debug_dogs_access()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT jsonb_build_object(
    'current_user_id', auth.uid(),
    'dogs_for_user', (
      SELECT jsonb_agg(jsonb_build_object(
        'id', id,
        'name', name,
        'owner_id', owner_id,
        'owner_id_matches', (owner_id = auth.uid())
      ))
      FROM dogs
      WHERE owner_id = auth.uid()
    ),
    'all_dogs', (
      SELECT jsonb_agg(jsonb_build_object(
        'id', id,
        'name', name,
        'owner_id', owner_id,
        'owner_id_matches', (owner_id = auth.uid())
      ))
      FROM dogs
      LIMIT 10
    )
  );
$$; 