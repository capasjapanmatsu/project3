-- LINEユーザー用のprofilesエントリー自動作成機能
-- LINEユーザー（usersテーブル）がログインした際に、自動的にprofilesテーブルにエントリーを作成する

-- 1. usersテーブルとprofilesテーブルを同期する関数
CREATE OR REPLACE FUNCTION public.sync_line_user_to_profile()
RETURNS trigger AS $$
BEGIN
  -- LINEユーザー用のprofilesエントリーを作成（既存の場合はスキップ）
  INSERT INTO public.profiles (
    id, 
    user_type, 
    name, 
    email,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    'user',
    COALESCE(NEW.display_name, 'LINEユーザー'),
    CONCAT('line_', NEW.line_user_id, '@line.local'), -- 仮のメールアドレス（ユニーク制約対応）
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    name = COALESCE(EXCLUDED.name, profiles.name),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. usersテーブルへの挿入・更新時にprofilesを同期するトリガー
DROP TRIGGER IF EXISTS sync_line_user_profile_trigger ON public.users;
CREATE TRIGGER sync_line_user_profile_trigger
  AFTER INSERT OR UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_line_user_to_profile();

-- 3. 既存のLINEユーザーのprofilesエントリーを作成
INSERT INTO public.profiles (
  id, 
  user_type, 
  name, 
  email,
  created_at,
  updated_at
)
SELECT 
  u.id,
  'user',
  COALESCE(u.display_name, 'LINEユーザー'),
  CONCAT('line_', u.line_user_id, '@line.local'),
  u.created_at,
  NOW()
FROM public.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- 4. profiles テーブルのemailカラムをNULL可能にする（既存の場合はスキップ）
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'email' 
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.profiles ALTER COLUMN email DROP NOT NULL;
  END IF;
END $$;

-- 5. RLSポリシーの更新（LINEユーザーもアクセス可能にする）
DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
CREATE POLICY "profiles_select_authenticated" ON public.profiles
  FOR SELECT
  USING (true); -- 全ユーザーがプロフィールを閲覧可能

DROP POLICY IF EXISTS "profiles_update_own_or_line" ON public.profiles;
CREATE POLICY "profiles_update_own_or_line" ON public.profiles
  FOR UPDATE
  USING (
    auth.uid() = id 
    OR id IN (SELECT id FROM public.users)
  );

DROP POLICY IF EXISTS "profiles_insert_own_or_line" ON public.profiles;
CREATE POLICY "profiles_insert_own_or_line" ON public.profiles
  FOR INSERT
  WITH CHECK (
    auth.uid() = id 
    OR id IN (SELECT id FROM public.users)
  );

-- 6. profilesテーブルにLINEユーザー識別用カラムを追加
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_line_user BOOLEAN DEFAULT FALSE;

-- 既存のLINEユーザーのフラグを更新
UPDATE public.profiles 
SET is_line_user = TRUE
WHERE id IN (SELECT id FROM public.users);

-- 7. auth_typeカラムを追加（メールかLINEかを識別）
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS auth_type TEXT DEFAULT 'email' CHECK (auth_type IN ('email', 'line', 'both'));

-- 既存のレコードを更新
UPDATE public.profiles p
SET auth_type = CASE 
  WHEN EXISTS (SELECT 1 FROM public.users u WHERE u.id = p.id) THEN 'line'
  WHEN p.email LIKE 'line_%@line.local' THEN 'line'
  ELSE 'email'
END;

-- 8. LINEユーザー向けの便利なビューを作成
CREATE OR REPLACE VIEW public.user_auth_info AS
SELECT 
  p.id,
  p.name,
  p.user_type,
  p.auth_type,
  p.is_line_user,
  u.line_user_id,
  u.display_name AS line_display_name,
  u.picture_url AS line_picture_url,
  CASE 
    WHEN p.email LIKE 'line_%@line.local' THEN NULL
    ELSE p.email
  END AS real_email
FROM public.profiles p
LEFT JOIN public.users u ON u.id = p.id;

-- ビューへのアクセス権限
GRANT SELECT ON public.user_auth_info TO authenticated;
GRANT SELECT ON public.user_auth_info TO anon;

COMMENT ON FUNCTION public.sync_line_user_to_profile() IS 'LINEユーザーとprofilesテーブルを同期する関数';
COMMENT ON VIEW public.user_auth_info IS 'ユーザーの認証情報を統合したビュー';


