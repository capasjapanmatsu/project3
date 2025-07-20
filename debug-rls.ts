// RLSポリシーのデバッグ用テストスクリプト
import { supabase } from './src/utils/supabase';

async function debugRLSPolicies() {
  console.log('🔍 RLSポリシーデバッグ開始');

  try {
    // 1. 現在のユーザー情報を取得
    const { data: authUser, error: authError } = await supabase.auth.getUser();
    console.log('👤 認証ユーザー:', { authUser: authUser?.user, authError });

    if (authUser?.user) {
      // 2. プロファイル情報を取得
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.user.id)
        .single();
      
      console.log('📋 プロファイル:', { profile, profileError });

      // 3. facilitiesテーブルに直接アクセス
      const { data: facilities, error: facilitiesError } = await supabase
        .from('facilities')
        .select('*');
      
      console.log('🏢 施設データ（RLS適用）:', { 
        count: facilities?.length || 0, 
        facilities, 
        facilitiesError 
      });

      // 4. RPC関数を使って管理者権限をテスト（存在する場合）
      try {
        const { data: adminCheck, error: adminError } = await supabase
          .rpc('is_admin');
        console.log('🔒 管理者権限チェック:', { adminCheck, adminError });
      } catch (rpcError) {
        console.log('⚠️ is_admin RPC関数が存在しません:', rpcError);
      }

      // 5. profilesテーブルから全ての管理者を取得
      const { data: admins, error: adminsError } = await supabase
        .from('profiles')
        .select('id, user_type, name, email')
        .eq('user_type', 'admin');
      
      console.log('👥 管理者ユーザー一覧:', { admins, adminsError });
    }

  } catch (error) {
    console.error('❌ デバッグ中にエラーが発生:', error);
  }
}

// ブラウザのコンソールで実行可能にする
if (typeof window !== 'undefined') {
  (window as any).debugRLSPolicies = debugRLSPolicies;
  console.log('🛠️ デバッグ関数が利用可能です: window.debugRLSPolicies()');
}

export { debugRLSPolicies };
