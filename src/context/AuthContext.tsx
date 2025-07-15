import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../utils/supabase';
import { safeSetItem, safeGetItem } from '../utils/safeStorage';

interface UserProfile {
  id: string;
  user_type: string;
  created_at: string;
  name?: string;
  email?: string;
  [key: string]: unknown;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  signInWithMagicLink: (email: string) => Promise<{ success: boolean; error?: string }>;
  verify2FA: (code: string) => Promise<{ success: boolean; error?: string }>;
  setIsTrustedDevice: (trusted: boolean) => void;
  isAdmin: boolean;
  userProfile: UserProfile | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  logout: async () => { await Promise.resolve(); },
  isAuthenticated: false,
  signInWithMagicLink: async () => { await Promise.resolve(); return { success: false }; },
  verify2FA: async () => { await Promise.resolve(); return { success: false }; },
  setIsTrustedDevice: () => {},
  isAdmin: false,
  userProfile: null,
});

const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const fetchUserProfile = async (userId: string, userEmail?: string): Promise<UserProfile | null> => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        // プロファイルが存在しない場合のみ、自動作成を試みる
        if (error.code === 'PGRST116' && userEmail) {
          try {
            const profileData = {
              id: userId,
              name: userEmail.split('@')[0],
              user_type: userEmail === 'capasjapan@gmail.com' ? 'admin' : 'user',
              created_at: new Date().toISOString()
            };
            
            const { data: newProfile, error: createError } = await supabase
              .from('profiles')
              .insert([profileData])
              .select()
              .single();
            
            if (createError) {
              console.error('Error creating profile:', createError);
              return null;
            }
            
            return newProfile as UserProfile;
          } catch (createError) {
            console.error('Exception creating profile:', createError);
            return null;
          }
        }
        
        console.error('Error fetching user profile:', error.message);
        return null;
      }
      
      return profile as UserProfile;
    } catch (error) {
      console.error('Exception in fetchUserProfile:', error);
      return null;
    }
  };

  const checkAdminStatus = (user: User | null, profile: UserProfile | null): boolean => {
    if (!user) {
      return false;
    }
    
    const isAdminByEmail = user.email === 'capasjapan@gmail.com';
    const isAdminByProfile = profile?.user_type === 'admin';
    const isAdmin = isAdminByEmail || isAdminByProfile;
    
    return isAdmin;
  };

  useEffect(() => {
    let isMounted = true;
    let timeoutId: ReturnType<typeof setTimeout>;
    
    const initializeAuth = async () => {
      try {
        console.log('🔐 Auth initialization started...');
        
        // 決済処理中かどうかを確認
        const isPaymentFlow = window.location.pathname.includes('/payment') || 
                             window.location.pathname.includes('/checkout') ||
                             window.location.pathname.includes('/subscription') ||
                             window.location.search.includes('success=true') ||
                             window.location.search.includes('canceled=true');
        
        // 決済処理中の場合は非常に短いタイムアウト時間を設定
        const timeoutDuration = isPaymentFlow ? 3000 : (import.meta.env.PROD ? 10000 : 15000);
        
        timeoutId = setTimeout(() => {
          if (isMounted) {
            console.warn(`⏱️ Auth initialization timeout after ${timeoutDuration}ms`);
            
            // 決済フロー中の場合は、認証状態復元を試みる
            const prePaymentAuthState = localStorage.getItem('pre_payment_auth_state');
            if (isPaymentFlow && prePaymentAuthState) {
              try {
                const authState = JSON.parse(prePaymentAuthState);
                console.log('🔄 Restoring auth state from pre-payment data');
                
                // 一時的な認証状態を設定
                setUser({
                  id: authState.user_id,
                  email: authState.user_email,
                  user_metadata: {},
                  aud: 'authenticated',
                  role: 'authenticated',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  app_metadata: {}
                } as any);
                setIsAuthenticated(true);
                setLoading(false);
                
                // 即座にセッション確認を試みる（バックグラウンドで）
                const checkSession = async () => {
                  try {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (session && session.user && isMounted) {
                      setSession(session);
                      setUser(session.user);
                      setIsAuthenticated(true);
                      console.log('✅ Session recovered successfully');
                      
                      // プロファイルを取得
                      const profile = await fetchUserProfile(session.user.id, session.user.email);
                      if (isMounted) {
                        setUserProfile(profile);
                        setIsAdmin(checkAdminStatus(session.user, profile));
                      }
                    }
                  } catch (error) {
                    console.warn('Session recovery failed:', error);
                  }
                };
                
                // 即座に実行
                checkSession();
                
                return;
              } catch (e) {
                console.error('Failed to restore auth state:', e);
              }
            }
            
            setSession(null);
            setUser(null);
            setIsAuthenticated(false);
            setUserProfile(null);
            setIsAdmin(false);
            setLoading(false);
          }
        }, timeoutDuration);

        // Supabaseセッション取得の前にネットワーク状態をチェック
        if (!navigator.onLine) {
          console.warn('⚠️ Network is offline, using cached state');
          // オフライン時はローカルストレージから復元を試みる
          const cachedUser = safeGetItem('sb-auth-user');
          if (cachedUser && isMounted) {
            try {
              const user = JSON.parse(cachedUser);
              setUser(user);
              setIsAuthenticated(true);
              setLoading(false);
              return;
            } catch (e) {
              console.warn('Failed to parse cached user');
            }
          }
        }

        console.log('🔍 Getting session from Supabase...');
        
        // 決済後のリダイレクトの場合、最適化されたリトライ機構を追加
        let session = null;
        let error = null;
        let retryCount = 0;
        const maxRetries = isPaymentFlow ? 3 : 1;
        
        while (retryCount < maxRetries && !session) {
          const result = await supabase.auth.getSession();
          session = result.data.session;
          error = result.error;
          
          if (!session && retryCount < maxRetries - 1) {
            console.log(`🔄 Session not found, retrying... (${retryCount + 1}/${maxRetries})`);
            // 決済フロー中はさらに短い間隔でリトライ
            await new Promise(resolve => setTimeout(resolve, isPaymentFlow ? 200 : 500));
          }
          retryCount++;
        }
        
        // 決済フロー中でセッションが見つからない場合は、認証状態復元を試みる
        if (!session && isPaymentFlow) {
          const prePaymentAuthState = localStorage.getItem('pre_payment_auth_state');
          if (prePaymentAuthState) {
            try {
              const authState = JSON.parse(prePaymentAuthState);
              console.log('🔄 Using pre-payment auth state as fallback');
              
              // 一時的な認証状態を設定
              setUser({
                id: authState.user_id,
                email: authState.user_email,
                user_metadata: {},
                aud: 'authenticated',
                role: 'authenticated',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                app_metadata: {}
              } as any);
              setIsAuthenticated(true);
              setLoading(false);
              
              // バックグラウンドでセッション確認を継続
              setTimeout(async () => {
                try {
                  const { data: { session: bgSession } } = await supabase.auth.getSession();
                  if (bgSession && bgSession.user && isMounted) {
                    setSession(bgSession);
                    setUser(bgSession.user);
                    console.log('✅ Background session recovery successful');
                    
                    const profile = await fetchUserProfile(bgSession.user.id, bgSession.user.email);
                    if (isMounted) {
                      setUserProfile(profile);
                      setIsAdmin(checkAdminStatus(bgSession.user, profile));
                    }
                  }
                } catch (bgError) {
                  console.warn('Background session recovery failed:', bgError);
                }
              }, 1000);
              
              return;
            } catch (e) {
              console.error('Failed to use pre-payment auth state:', e);
            }
          }
        }
        
        // タイムアウトをクリア
        if (timeoutId) clearTimeout(timeoutId);
        
        if (error) {
          console.warn('❌ Session retrieval error:', error.message);
          
          // エラーがあってもアプリをクラッシュさせない
          // ログアウト状態として続行
          if (isMounted) {
            setSession(null);
            setUser(null);
            setIsAuthenticated(false);
            setUserProfile(null);
            setIsAdmin(false);
            setLoading(false);
          }
          return;
        }

        if (session && session.user && isMounted) {
          console.log('✅ Session found, user:', session.user.email);
          
          setSession(session);
          setUser(session.user);
          setIsAuthenticated(true);
          
          // ユーザープロフィールを取得
          const profile = await fetchUserProfile(session.user.id, session.user.email);
          if (isMounted) {
            setUserProfile(profile);
            setIsAdmin(checkAdminStatus(session.user, profile));
          }
        } else {
          console.log('ℹ️ No active session found');
          if (isMounted) {
            setSession(null);
            setUser(null);
            setIsAuthenticated(false);
            setUserProfile(null);
            setIsAdmin(false);
          }
        }
      } catch (err) {
        console.error('❌ Auth initialization error:', err);
        
        if (timeoutId) clearTimeout(timeoutId);
        
        if (isMounted) {
          setSession(null);
          setUser(null);
          setIsAuthenticated(false);
          setUserProfile(null);
          setIsAdmin(false);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          console.log('🔐 Auth initialization completed');
        }
      }
    };

    initializeAuth();

    // セッション変更を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state changed:', event, session?.user?.email || 'No user');
        
        if (!isMounted) return;

        if (event === 'SIGNED_IN' && session) {
          console.log('✅ User signed in:', session.user.email);
          setSession(session);
          setUser(session.user);
          setIsAuthenticated(true);
          
          // ユーザープロフィールを取得
          const profile = await fetchUserProfile(session.user.id, session.user.email);
          if (isMounted) {
            setUserProfile(profile);
            setIsAdmin(checkAdminStatus(session.user, profile));
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('👋 User signed out');
          if (isMounted) {
            setSession(null);
            setUser(null);
            setIsAuthenticated(false);
            setUserProfile(null);
            setIsAdmin(false);
          }
        } else if (event === 'TOKEN_REFRESHED' && session) {
          console.log('🔄 Token refreshed for:', session.user.email);
          if (isMounted) {
            setSession(session);
            setUser(session.user);
          }
        }
      }
    );

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const signInWithMagicLink = useCallback(async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (error) {
        console.error('Magic Link error:', error);
        return { success: false, error: `Magic Linkの送信に失敗しました: ${error.message}` };
      }
      return { success: true };
    } catch (error) {
      console.error('Magic Link error:', error);
      return { success: false, error: `Magic Linkの送信に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }, []);

  const verify2FA = useCallback(async (code: string): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!user) {
        return { success: false, error: 'ユーザーが認証されていません' };
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        return { success: false, error: '認証が必要です' };
      }
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-2fa`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          userId: user.id,
          code
        }),
      });
      if (!response.ok) {
        const errorData = await response.json() as { error?: string };
        return { success: false, error: errorData.error || '認証に失敗しました' };
      }
      const result = await response.json() as { success: boolean; error?: string };
      return { 
        success: result.success, 
        ...(result.error && { error: result.error })
      };
    } catch (error) {
      console.error('2FA verification error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }, [user]);

  const setIsTrustedDevice = useCallback((trusted: boolean) => {
    if (trusted && user) {
      safeSetItem(`trusted_device_${user.id}`, 'true');
    } else if (user) {
      safeSetItem(`trusted_device_${user.id}`, 'false');
    }
  }, [user]);

  const logout = useCallback(async () => {
    try {
      console.log('👋 Logging out...');
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // ローカルストレージをクリア
      localStorage.removeItem('sb-auth-user');
      
      console.log('✅ Logout successful');
    } catch (error) {
      console.error('❌ Logout error:', error);
    }
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      logout,
      isAuthenticated,
      signInWithMagicLink,
      verify2FA,
      setIsTrustedDevice,
      isAdmin,
      userProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => useContext(AuthContext);

export default useAuth;
export { AuthContext, AuthProvider };
