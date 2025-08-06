import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  try {
    const { company_name, contact_person, to_email, to_name, sponsor_url } = await req.json()
    
    // パラメータの統一
    const email = to_email || email
    const name = to_name || contact_person

    // Supabaseの内蔵メール機能を使用
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const emailHtml = `
      <div style="font-family: 'Hiragino Sans', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; font-size: 24px;">ドッグパークJP</h1>
          <p style="color: #666; font-size: 14px;">愛犬との素敵な時間を</p>
        </div>
        
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px;">
          <h2 style="color: #1e293b; font-size: 18px; margin-bottom: 15px;">スポンサー広告資料のご案内</h2>
          
          <p style="color: #475569; line-height: 1.6;">
            ${company_name}<br>
            ${name} 様
          </p>
          
          <p style="color: #475569; line-height: 1.6;">
            この度は、ドッグパークJPのスポンサー広告にご興味をお持ちいただき、誠にありがとうございます。
          </p>
          
          <p style="color: #475569; line-height: 1.6;">
            詳細な広告プランと料金につきましては、以下のURLよりご確認いただけます：
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${sponsor_url}" 
               style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              スポンサー広告詳細・お申し込みページ
            </a>
          </div>
          
          <div style="background: #e0f2fe; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <h3 style="color: #0277bd; font-size: 16px;">📊 ドッグパークJPの実績</h3>
            <ul style="color: #01579b; margin: 0; padding-left: 20px;">
              <li>月間アクティブユーザー：10,000人以上</li>
              <li>登録施設数：500施設以上</li>
              <li>主要ユーザー層：30-50代の犬の飼い主</li>
              <li>平均滞在時間：5分以上</li>
            </ul>
          </div>
          
          <p style="color: #475569; line-height: 1.6;">
            ご不明な点やご質問がございましたら、お気軽にお問い合わせください。<br>
            担当者より詳しくご説明させていただきます。
          </p>
        </div>
        
        <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center; margin-top: 20px;">
          <p style="color: #64748b; font-size: 12px;">
            ドッグパークJP運営チーム<br>
            お問い合わせ：info@dogparkjp.com<br>
            <span style="color: #94a3b8; font-size: 11px;">※このメールは送信専用です。返信はできませんのでご了承ください。</span>
          </p>
        </div>
      </div>
    `

    // Supabase Auth APIを使用してメール送信
    const response = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey
      },
      body: JSON.stringify({
        email: email,
        email_confirm: true,
        user_metadata: {
          company_name,
          contact_person: name,
          sponsor_url,
          custom_email_html: emailHtml
        }
      })
    })

    const result = await response.json()

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { "Content-Type": "application/json" } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { "Content-Type": "application/json" }, status: 500 }
    )
  }
})