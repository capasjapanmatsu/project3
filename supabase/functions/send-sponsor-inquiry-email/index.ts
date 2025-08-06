import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

serve(async (req) => {
  const { company_name, contact_person, email, sponsor_application_url } = await req.json()

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'ドッグパークJP <noreply@dogparkjp.com>',
        to: [email],
        subject: '【ドッグパークJP】スポンサー広告に関する資料のご案内',
        html: `
          <div style="font-family: 'Hiragino Sans', 'ヒラギノ角ゴシック', 'Yu Gothic', 'Meiryo', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2563eb; font-size: 24px; margin-bottom: 10px;">ドッグパークJP</h1>
              <p style="color: #666; font-size: 14px;">愛犬との素敵な時間を</p>
            </div>
            
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="color: #1e293b; font-size: 18px; margin-bottom: 15px;">スポンサー広告に関するお問い合わせありがとうございます</h2>
              
              <p style="color: #475569; line-height: 1.6; margin-bottom: 15px;">
                ${company_name}<br>
                ${contact_person} 様
              </p>
              
              <p style="color: #475569; line-height: 1.6; margin-bottom: 15px;">
                この度は、ドッグパークJPのスポンサー広告にご興味をお持ちいただき、誠にありがとうございます。
              </p>
              
              <p style="color: #475569; line-height: 1.6; margin-bottom: 20px;">
                詳細な広告プランと料金につきましては、以下のURLより専用ページにてご確認いただけます：
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${sponsor_application_url}" 
                   style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                  スポンサー広告詳細・お申し込みページ
                </a>
              </div>
              
              <div style="background: #e0f2fe; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <h3 style="color: #0277bd; font-size: 16px; margin-bottom: 10px;">📊 ドッグパークJPの実績</h3>
                <ul style="color: #01579b; margin: 0; padding-left: 20px;">
                  <li>月間アクティブユーザー：10,000人以上</li>
                  <li>登録施設数：500施設以上</li>
                  <li>主要ユーザー層：30-50代の犬の飼い主</li>
                  <li>平均滞在時間：5分以上</li>
                </ul>
              </div>
              
              <p style="color: #475569; line-height: 1.6; margin-bottom: 15px;">
                ご不明な点やご質問がございましたら、お気軽にお問い合わせください。<br>
                担当者より詳しくご説明させていただきます。
              </p>
            </div>
            
            <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center;">
              <p style="color: #64748b; font-size: 12px; margin-bottom: 5px;">
                このメールは自動送信されています。
              </p>
              <p style="color: #64748b; font-size: 12px;">
                お問い合わせ：support@dogparkjp.com
              </p>
            </div>
          </div>
        `,
      }),
    })

    const data = await res.json()

    return new Response(
      JSON.stringify(data),
      { headers: { "Content-Type": "application/json" } },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { "Content-Type": "application/json" }, status: 500 },
    )
  }
})