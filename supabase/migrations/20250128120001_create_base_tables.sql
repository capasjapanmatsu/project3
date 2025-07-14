-- Create basic profile table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    user_type TEXT DEFAULT 'user' CHECK (user_type IN ('user', 'owner', 'admin')),
    name TEXT,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "profiles_select_own" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Create a function to handle user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, email, user_type)
    VALUES (new.id, new.email, 
        CASE 
            WHEN new.email = 'capasjapan@gmail.com' THEN 'admin'
            ELSE 'user'
        END
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create admin user if capasjapan@gmail.com exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = 'capasjapan@gmail.com') THEN
        INSERT INTO public.profiles (id, email, user_type, name)
        SELECT id, email, 'admin', 'Administrator'
        FROM auth.users 
        WHERE email = 'capasjapan@gmail.com'
        ON CONFLICT (id) DO UPDATE SET user_type = 'admin';
    END IF;
END;
$$; 