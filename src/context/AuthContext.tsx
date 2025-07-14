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
        // 本番環境での最適化: より短いタイムアウトと早期のフォールバック
        const timeoutDuration = import.meta.env.PROD ? 8000 : 5000; // 本番環境でも8秒に短縮
        
        timeoutId = setTimeout(() => {
          if (isMounted) {
            console.warn(`⏱️ Auth initialization timeout after ${timeoutDuration}ms, falling back to logged out state`);
            
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

        const { data: { session }, error } = await supabase.auth.getSession();
        
        // タイムアウトをクリア
        if (timeoutId) clearTimeout(timeoutId);
        
        if (error) {
          console.warn('Session retrieval error:', error.message);
          
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
        
        if (!isMounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        setIsAuthenticated(!!session?.user);

        if (session?.user) {
          // セッション情報をキャッシュ
          safeSetItem('sb-auth-user', JSON.stringify(session.user));
          
          try {
            const profile = await fetchUserProfile(session.user.id, session.user.email);
            if (isMounted) {
              setUserProfile(profile);
              const adminStatus = checkAdminStatus(session.user, profile);
              setIsAdmin(adminStatus);
            }
          } catch (profileError) {
            console.warn('Profile fetch error:', profileError instanceof Error ? profileError.message : 'Unknown error');
            
            // プロフィール取得に失敗してもセッションは有効として続行
            if (isMounted) {
              setUserProfile(null);
              setIsAdmin(false);
            }
          }
        } else {
          // ログアウト時はキャッシュをクリア
          safeSetItem('sb-auth-user', '');
          
          if (isMounted) {
            setUserProfile(null);
            setIsAdmin(false);
          }
        }
        
      } catch (error) {
        console.error('💥 Error initializing auth:', error);
        
        // 本番環境での初期化エラー詳細を記録
        if (import.meta.env.PROD) {
          console.error('Production auth initialization error:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            url: window.location.href,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
          });
        }
        
        // 致命的なエラーが発生した場合もログアウト状態として続行
        if (isMounted) {
          setSession(null);
          setUser(null);
          setIsAuthenticated(false);
          setUserProfile(null);
          setIsAdmin(false);
        }
      } finally {
        // タイムアウトをクリア
        if (timeoutId) clearTimeout(timeoutId);
        // エラーの有無に関わらず必ずローディングを終了
        if (isMounted) {
          setLoading(false);
          if (import.meta.env.PROD) {
            console.log('🏁 Production auth initialization completed');
          }
        }
      }
    };

    // 最大待機時間の緊急フォールバック（本番環境: 15秒、開発環境: 10秒）
    const emergencyTimeoutDuration = import.meta.env.PROD ? 15000 : 10000;
    
    const emergencyTimeout = setTimeout(() => {
      if (isMounted && loading) {
        console.warn(`⚠️ Emergency timeout after ${emergencyTimeoutDuration}ms: Force completing auth initialization`);
        setLoading(false);
      }
    }, emergencyTimeoutDuration);

    void initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      
      setSession(session);
      setUser(session?.user ?? null);
      setIsAuthenticated(!!session?.user);

      if (session?.user) {
        // セッション情報をキャッシュ
        safeSetItem('sb-auth-user', JSON.stringify(session.user));
        
        try {
          const profile = await fetchUserProfile(session.user.id, session.user.email);
          if (isMounted) {
            setUserProfile(profile);
            const adminStatus = checkAdminStatus(session.user, profile);
            setIsAdmin(adminStatus);
          }
        } catch (profileError) {
          console.warn('Profile fetch error in auth state change:', profileError instanceof Error ? profileError.message : 'Unknown');
          if (isMounted) {
            setUserProfile(null);
            setIsAdmin(false);
          }
        }
      } else {
        // ログアウト時はキャッシュをクリア
        safeSetItem('sb-auth-user', '');
        
        if (isMounted) {
          setUserProfile(null);
          setIsAdmin(false);
        }
      }
      
      // Auth state changeが発生したらloadingを終了
      if (isMounted) {
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      clearTimeout(emergencyTimeout);
      subscription.unsubscribe();
    };
  }, []); // 空の依存配列で初回のみ実行

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
      await supabase.auth.signOut();
      setIsAuthenticated(false);
      setUser(null);
      setSession(null);
      setUserProfile(null);
      setIsAdmin(false);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
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
