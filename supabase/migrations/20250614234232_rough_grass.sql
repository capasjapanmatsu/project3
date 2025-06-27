/*
  # Fix contact message policies with unique names

  This migration creates policies for the contact_messages table with unique names
  to avoid conflicts with existing policies.
*/

-- Check if the insert policy already exists before creating it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'contact_messages' 
    AND policyname = 'Anyone can submit contact messages'
  ) THEN
    -- Allow public users to insert contact messages
    CREATE POLICY "Anyone can submit contact messages" 
    ON public.contact_messages
    FOR INSERT
    TO public
    WITH CHECK (true);
  END IF;
END $$;

-- Check if the admin access policy already exists before creating it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'contact_messages' 
    AND policyname = 'Only admins can access contact messages'
  ) THEN
    -- Only admins can view, update, or delete contact messages
    CREATE POLICY "Only admins can access contact messages" 
    ON public.contact_messages
    FOR ALL
    TO public
    USING (auth.email() = 'capasjapan@gmail.com');
  END IF;
END $$;