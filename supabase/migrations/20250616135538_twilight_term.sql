/*
# Update Magic Link redirect URL

1. Changes
   - Updates the Magic Link email template to use the production URL instead of localhost
   - Ensures the redirect URL points to dogparkjp.com instead of localhost:3000
*/

-- Update Magic Link email template to use production URL
UPDATE email_template_config
SET html_content = REPLACE(html_content, 'http://localhost:3000', 'https://dogparkjp.com'),
    text_content = REPLACE(text_content, 'http://localhost:3000', 'https://dogparkjp.com'),
    updated_at = now()
WHERE template_type = 'magic_link';

-- Also update any existing templates in the auth schema if they exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'email_templates') THEN
    UPDATE auth.email_templates
    SET content_html = REPLACE(content_html, 'http://localhost:3000', 'https://dogparkjp.com'),
        content_text = REPLACE(content_text, 'http://localhost:3000', 'https://dogparkjp.com'),
        updated_at = now()
    WHERE template_type = 'magic_link';
  END IF;
END $$;