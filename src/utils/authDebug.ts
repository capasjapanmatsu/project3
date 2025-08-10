export function parseDpSessionCookie(): { token?: string } {
  if (typeof document === 'undefined') return {};
  const m = document.cookie.match(/(?:^|; )dp_session=([^;]+)/);
  return { token: m ? decodeURIComponent(m[1]) : undefined };
}

import { supabase } from './supabase';

export const debugAuthStatus = async () => {
  
  try {
    // 1. セッション情報の取得
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    console.log('1. セッション情報:', {
      hasSession: !!session,
      hasAccessToken: !!session?.access_token,
      sessionError,
      userId: session?.user?.id,
      userEmail: session?.user?.email,
      userRole: session?.user?.role,
      expiresAt: session?.expires_at,
      tokenType: session?.token_type
    });

    // 2. ユーザー情報の取得
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    console.log('2. ユーザー情報:', {
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email,
      userRole: user?.role,
      userError
    });

    // 3. ローカルストレージの確認
    const localStorageAuth = localStorage.getItem('sb-' + import.meta.env.VITE_SUPABASE_PROJECT_REF + '-auth-token');
    console.log('3. ローカルストレージ:', {
      hasAuthToken: !!localStorageAuth,
      authTokenLength: localStorageAuth?.length
    });

    // 4. 認証状態の確認
    const { data: authData } = await supabase.auth.getUser();
    console.log('4. 認証状態:', {
      isAuthenticated: !!authData.user,
      authUser: authData.user?.id
    });

    return {
      session,
      user,
      isAuthenticated: !!session?.access_token
    };

  } catch (error) {
    console.error('❌ Auth debug error:', error);
    return {
      session: null,
      user: null,
      isAuthenticated: false,
      error
    };
  } finally {
  }
}; 
