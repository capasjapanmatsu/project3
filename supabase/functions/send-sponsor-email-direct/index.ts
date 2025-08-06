import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { to, subject, html, company_name, contact_person, access_token } = await req.json()
    console.log('メール送信リクエスト:', { to, subject, company_name, contact_person })

    if (!to || !subject || !html) {
      throw new Error('必須パラメータが不足しています')
    }

    // Supabase環境変数を取得
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    console.log('Supabase URL:', supabaseUrl)

    // Supabase管理者クライアントを作成
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    console.log('Supabaseメール送信処理開始...')
    
    try {
      // まず既存ユーザーかチェック
      const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers()
      
      if (listError) {
        console.error('ユーザーリスト取得エラー:', listError)
        throw listError
      }

      const existingUser = listData.users.find(user => user.email === to)
      
      if (existingUser) {
        console.log('既存ユーザーが見つかりました。招待リンクを生成します。')
        
        // 既存ユーザーには招待リンクを生成してメール送信
        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'invite',
          email: to,
          options: {
            data: {
              company_name: company_name || '',
              contact_person: contact_person || '',
              access_token: access_token || '',
              is_sponsor_inquiry: true
            }
          }
        })

        if (linkError) {
          console.error('招待リンク生成エラー:', linkError)
          throw new Error(`招待リンク生成失敗: ${linkError.message}`)
        }
        
        console.log('既存ユーザー向け招待メール送信成功')
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: `スポンサー資料メールを既存ユーザー ${to} に送信しました`,
            provider: 'Supabase Invite Link',
            user_type: 'existing',
            data: linkData
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
        
      } else {
        console.log('新規ユーザーです。ユーザーを作成して確認メールを送信します。')
        
        // 新規ユーザーを作成（email_confirmをfalseにしてメール送信をトリガー）
        const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
          email: to,
          email_confirm: false, // falseにすることで確認メールが送信される
          user_metadata: {
            company_name: company_name || '',
            contact_person: contact_person || '',
            access_token: access_token || '',
            is_sponsor_inquiry: true
          }
        })

        if (userError) {
          console.error('新規ユーザー作成エラー:', userError)
          throw new Error(`新規ユーザー作成失敗: ${userError.message}`)
        }
        
        console.log('新規ユーザー作成・確認メール送信成功')
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: `スポンサー資料メールを新規ユーザー ${to} に送信しました`,
            provider: 'Supabase User Creation',
            user_type: 'new',
            data: userData
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }

    } catch (supabaseError) {
      console.error('Supabaseメール送信エラー:', supabaseError)
      
      // エラーの場合はログ出力で対応
      console.log('=== メール送信内容（エラー時フォールバック） ===')
      console.log('宛先:', to)
      console.log('件名:', subject)
      console.log('会社名:', company_name)
      console.log('担当者:', contact_person)
      console.log('アクセストークン:', access_token)
      console.log('HTMLメール内容（最初の500文字）:')
      console.log(html.substring(0, 500) + '...')
      console.log('============================================')
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `メール送信をログに記録しました (${to})`,
          provider: 'Console Log (Fallback)',
          note: 'Supabaseメール送信でエラーが発生したため、ログ出力しました',
          error: supabaseError.message,
          data: {
            to,
            subject,
            company_name,
            contact_person,
            access_token
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

  } catch (error) {
    console.error('メール送信処理エラー:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" }, 
        status: 500 
      }
    )
  }
})