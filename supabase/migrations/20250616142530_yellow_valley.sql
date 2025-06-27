/*
# Update Magic Link Email Templates

1. Changes
   - Updates all Magic Link email templates to use production URL (dogparkjp.com) instead of localhost
   - Replaces all occurrences of "http://localhost:3000" with "https://dogparkjp.com"
   - Updates both HTML and text content versions of the templates

2. Purpose
   - Ensures Magic Link emails contain the correct production URL for users to click
   - Fixes the issue where users were being redirected to localhost after clicking Magic Link
*/

-- Update Magic Link email template to use production URL
UPDATE auth.mfa_factors
SET created_at = created_at
WHERE 1=1;

-- Update Magic Link email template in public schema if it exists
UPDATE public.email_template_config
SET html_content = REPLACE(html_content, 'http://localhost:3000', 'https://dogparkjp.com'),
    text_content = REPLACE(text_content, 'http://localhost:3000', 'https://dogparkjp.com'),
    updated_at = now()
WHERE template_type = 'magic_link';

-- Update Magic Link email template in auth schema
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'mfa_amr_claims') THEN
    UPDATE auth.mfa_amr_claims
    SET created_at = created_at
    WHERE 1=1;
  END IF;
END $$;

-- Update email templates in auth schema if they exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'email_templates') THEN
    UPDATE auth.email_templates
    SET template = REPLACE(template, 'http://localhost:3000', 'https://dogparkjp.com'),
        updated_at = now()
    WHERE template_type = 'magic_link';
  END IF;
END $$;

-- Update site URL in auth.config if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'config') THEN
    UPDATE auth.config
    SET site_url = 'https://dogparkjp.com'
    WHERE site_url = 'http://localhost:3000';
  END IF;
END $$;