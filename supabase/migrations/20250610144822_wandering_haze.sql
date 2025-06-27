/*
  # Fix registration database issues

  1. Database Functions
    - Create function to handle new user profile creation
    - Ensure proper error handling and permissions

  2. Triggers
    - Add trigger to automatically create profile when user signs up
    - Handle edge cases and prevent duplicate entries

  3. Security
    - Update RLS policies to allow profile creation during signup
    - Ensure proper permissions for auth.users operations
*/

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, user_type, name, postal_code, address, phone_number)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'user_type', 'user'),
    COALESCE(new.raw_user_meta_data->>'name', ''),
    COALESCE(new.raw_user_meta_data->>'postal_code', ''),
    COALESCE(new.raw_user_meta_data->>'address', ''),
    COALESCE(new.raw_user_meta_data->>'phone_number', '')
  );
  RETURN new;
EXCEPTION
  WHEN others THEN
    -- Log error but don't fail the user creation
    RAISE WARNING 'Failed to create profile for user %: %', new.id, SQLERRM;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger for new user profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update RLS policy to allow profile creation during signup
DROP POLICY IF EXISTS "プロフィールは本人のみ作成可能" ON public.profiles;

CREATE POLICY "プロフィールは本人のみ作成可能" ON public.profiles
  FOR INSERT WITH CHECK (
    -- Allow if user is authenticated and creating their own profile
    (auth.uid() = id) OR
    -- Allow during signup process (when auth.uid() might be null temporarily)
    (auth.uid() IS NULL AND id IS NOT NULL)
  );

-- Ensure profiles table allows empty strings for optional fields
DO $$
BEGIN
  -- Update name column to allow empty strings
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'name' AND column_default = '''::text'
  ) THEN
    ALTER TABLE profiles ALTER COLUMN name SET DEFAULT '';
  END IF;

  -- Update postal_code column to allow empty strings
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'postal_code' AND column_default = '''::text'
  ) THEN
    ALTER TABLE profiles ALTER COLUMN postal_code SET DEFAULT '';
  END IF;

  -- Update address column to allow empty strings
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'address' AND column_default = '''::text'
  ) THEN
    ALTER TABLE profiles ALTER COLUMN address SET DEFAULT '';
  END IF;

  -- Update phone_number column to allow empty strings
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'phone_number' AND column_default = '''::text'
  ) THEN
    ALTER TABLE profiles ALTER COLUMN phone_number SET DEFAULT '';
  END IF;
END $$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.profiles TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon, authenticated;