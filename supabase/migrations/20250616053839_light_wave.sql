/*
  # Custom Magic Link Email Template

  This migration sets up a custom email template for Magic Link authentication
  using Supabase's built-in email template customization capabilities.
  
  Since we don't have direct write access to the auth schema tables,
  we'll use Supabase's auth.email_templates function to customize the template.
*/

-- Create a function to set the email template
-- This approach avoids direct manipulation of auth schema tables
CREATE OR REPLACE FUNCTION public.set_magic_link_template()
RETURNS void AS $$
DECLARE
  html_content TEXT;
  text_content TEXT;
BEGIN
  -- HTML content for the email
  html_content := '
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>ドッグパークJP - ログインリンク</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
      background-color: #f9fafb;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #ffffff;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    .header {
      text-align: center;
      padding-bottom: 20px;
      border-bottom: 1px solid #e5e7eb;
      margin-bottom: 20px;
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
      color: #3b82f6;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .logo-icon {
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, #3b82f6, #10b981);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 10px;
    }
    .logo-icon svg {
      width: 24px;
      height: 24px;
      fill: none;
      stroke: white;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .content {
      padding: 20px 0;
    }
    .button {
      display: inline-block;
      background-color: #3b82f6;
      color: white;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
      text-align: center;
    }
    .button:hover {
      background-color: #2563eb;
    }
    .footer {
      text-align: center;
      font-size: 12px;
      color: #6b7280;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
    }
    .note {
      font-size: 14px;
      color: #6b7280;
      margin-top: 20px;
      padding: 15px;
      background-color: #f3f4f6;
      border-radius: 6px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">
        <div class="logo-icon">
          <svg viewBox="0 0 24 24">
            <path d="M15.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm-8 0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 6.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm8 0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm-8 6.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm8 0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z"></path>
          </svg>
        </div>
        <span>ドッグパークJP</span>
      </div>
    </div>
    <div class="content">
      <h1>ドッグパークJPへようこそ！</h1>
      <p>以下のボタンをクリックして、ドッグパークJPにログインしてください。</p>
      <div style="text-align: center;">
        <a href="{{ .ConfirmationURL }}" class="button">ログイン</a>
      </div>
      <p>このリンクは10分間有効です。期限が切れた場合は、再度ログインをお試しください。</p>
      <div class="note">
        <p>このメールに心当たりがない場合は、無視していただいて構いません。誰かがあなたのメールアドレスを間違って入力した可能性があります。</p>
      </div>
    </div>
    <div class="footer">
      <p>&copy; 2025 ドッグパークJP. All rights reserved.</p>
      <p>〒861-0563 熊本県山鹿市鹿央町千田１７１８－１３</p>
    </div>
  </div>
</body>
</html>
  ';

  -- Plain text content for the email
  text_content := '
ドッグパークJPへようこそ！

以下のリンクをクリックして、ドッグパークJPにログインしてください：
{{ .ConfirmationURL }}

このリンクは10分間有効です。期限が切れた場合は、再度ログインをお試しください。

このメールに心当たりがない場合は、無視していただいて構いません。誰かがあなたのメールアドレスを間違って入力した可能性があります。

© 2025 ドッグパークJP. All rights reserved.
〒861-0563 熊本県山鹿市鹿央町千田１７１８－１３
  ';

  -- Store the template configuration in a table in the public schema
  -- This doesn't actually set the template but records our configuration
  CREATE TABLE IF NOT EXISTS public.email_template_config (
    id SERIAL PRIMARY KEY,
    template_type TEXT NOT NULL,
    subject TEXT NOT NULL,
    html_content TEXT NOT NULL,
    text_content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  );

  -- Insert or update the magic link template configuration
  INSERT INTO public.email_template_config (template_type, subject, html_content, text_content)
  VALUES ('magic_link', 'ドッグパークJP - ログインリンク', html_content, text_content)
  ON CONFLICT (template_type) DO UPDATE
  SET 
    subject = EXCLUDED.subject,
    html_content = EXCLUDED.html_content,
    text_content = EXCLUDED.text_content,
    updated_at = now();

  -- Note: In a real implementation, you would need to use Supabase's dashboard
  -- or API to actually set the email template. This migration just stores the
  -- configuration in a table that you can reference later.
  
  RAISE NOTICE 'Magic Link email template configuration saved. Please use the Supabase dashboard to apply this template.';
END;
$$ LANGUAGE plpgsql;

-- Execute the function to set up the template configuration
SELECT public.set_magic_link_template();

-- Comment explaining how to actually apply the template
COMMENT ON FUNCTION public.set_magic_link_template() IS 
'This function stores the Magic Link email template configuration in the public.email_template_config table.
To actually apply this template, you need to:
1. Go to the Supabase dashboard
2. Navigate to Authentication > Email Templates
3. Select the Magic Link template
4. Copy and paste the HTML and text content from the public.email_template_config table
5. Save the changes';