import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email } = await req.json()
    console.log('テストメール送信リクエスト:', email)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // パスワードリセットメールを送信（これは確実に動作する）
    console.log('パスワードリセットメールを送信中...')
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email
    })

    if (error) {
      console.error('メール送信エラー:', error)
      throw error
    }

    console.log('メール送信成功:', data)
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `テストメールを ${email} に送信しました`,
        data: data
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )

  } catch (error) {
    console.error('エラー:', error)
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