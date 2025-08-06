import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Resend APIを使用したメール送信関数
async function sendEmailWithResend(to: string, subject: string, html: string) {
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  
  if (!RESEND_API_KEY) {
    console.log('RESEND_API_KEY not found, skipping email send');
    return { success: false, message: 'Email service not configured' };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'ドッグパークJP <noreply@dogparkjp.com>',
        to: [to],
        subject: subject,
        html: html,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to send email');
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error sending email with Resend:', error);
    return { success: false, error: error.message };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create Supabase client with service role key for admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get request body
    const { email, company_name, contact_person, inquiry_id } = await req.json();

    if (!email || !company_name || !contact_person) {
      throw new Error('必須項目が不足しています');
    }

    console.log('Processing sponsor inquiry for:', email);

    // 既にデータベースに保存されている場合はinquiry_idが渡される
    let inquiryId = inquiry_id;
    
    // inquiry_idがない場合は新規作成（念のため）
    if (!inquiryId) {
      const { data: inquiryData, error: inquiryError } = await supabaseAdmin
        .from('sponsor_inquiries')
        .insert([{
          company_name,
          contact_person,
          email,
          status: 'pending'
        }])
        .select()
        .single();

      if (inquiryError) {
        console.error('Error saving inquiry:', inquiryError);
        throw new Error('問い合わせ情報の保存に失敗しました');
      }
      
      inquiryId = inquiryData.id;
    }

    // メール本文を作成
    const emailSubject = 'ドッグパークJP - スポンサー広告のお問い合わせありがとうございます';
    const emailHtml = `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #333; font-size: 24px;">ドッグパークJP</h1>
        </div>
        
        <div style="background: #f8f9fa; border-radius: 8px; padding: 30px; margin-bottom: 30px;">
          <h2 style="color: #333; font-size: 20px; margin-bottom: 20px;">スポンサー広告のお問い合わせありがとうございます</h2>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 15px;">
            ${contact_person}様
          </p>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 15px;">
            この度は、ドッグパークJPのスポンサー広告にご興味をお持ちいただき、誠にありがとうございます。
          </p>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 15px;">
            お問い合わせを承りました。担当者より2営業日以内にご連絡させていただきます。
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${req.headers.get('origin')}/sponsor-application" 
               style="display: inline-block; padding: 15px 30px; background: #3b82f6; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
              スポンサー広告申し込みページへ
            </a>
          </div>
          
          <div style="background: white; border-radius: 4px; padding: 20px; margin-top: 20px;">
            <h3 style="color: #333; font-size: 16px; margin-bottom: 15px;">お問い合わせ内容</h3>
            <p style="color: #666; margin: 5px 0;"><strong>会社名：</strong>${company_name}</p>
            <p style="color: #666; margin: 5px 0;"><strong>ご担当者名：</strong>${contact_person}様</p>
            <p style="color: #666; margin: 5px 0;"><strong>メールアドレス：</strong>${email}</p>
            <p style="color: #666; margin: 5px 0;"><strong>お問い合わせ番号：</strong>${inquiryId}</p>
          </div>
        </div>
        
        <div style="text-align: center; color: #999; font-size: 12px; margin-top: 30px;">
          <p>このメールは自動送信されています。</p>
          <p>ご不明な点がございましたら、info@dogparkjp.com までお問い合わせください。</p>
          <p style="margin-top: 20px;">© 2024 ドッグパークJP. All rights reserved.</p>
        </div>
      </div>
    `;

    // メール送信を試みる（Resend API）
    const emailResult = await sendEmailWithResend(email, emailSubject, emailHtml);
    
    if (!emailResult.success) {
      console.log('Email send failed, but inquiry was saved:', emailResult);
      // メール送信に失敗してもエラーにはしない（データは保存済み）
    }

    // 管理者への通知メールも送信
    const adminEmail = 'capasjapan@gmail.com';
    const adminSubject = '【管理者通知】新規スポンサー広告お問い合わせ';
    const adminHtml = `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">新規スポンサー広告お問い合わせ</h2>
        <p>以下の内容でお問い合わせがありました：</p>
        <ul style="color: #666;">
          <li>会社名: ${company_name}</li>
          <li>担当者: ${contact_person}</li>
          <li>メール: ${email}</li>
          <li>問い合わせID: ${inquiryId}</li>
        </ul>
        <p>
          <a href="${req.headers.get('origin')}/admin/sponsor-inquiries" 
             style="display: inline-block; padding: 10px 20px; background: #3b82f6; color: white; text-decoration: none; border-radius: 4px;">
            管理画面で確認
          </a>
        </p>
      </div>
    `;
    
    await sendEmailWithResend(adminEmail, adminSubject, adminHtml);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'お問い合わせを受け付けました',
        inquiry_id: inquiryId
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in send-sponsor-invitation:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'お問い合わせの送信に失敗しました'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});