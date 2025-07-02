// supabase.ts

import { createClient } from '@supabase/supabase-js'

// .envから環境変数を読み込む
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://onmcivwxtzqajcovptgf.supabase.c'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ubWNpdnd4dHpxYWpjb3ZwdGdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxODk3OTUsImV4cCI6MjA2NDc2NTc5NX0.AqFCz3GQUVeGaG2988LCzsE4aJpeio3xScoxv5T0-OU'

// Supabaseクライアントを作成（このsupabaseを使ってAPIにアクセスできるようになる！）
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
