import { Session, User } from '@supabase/supabase-js';
import { ReactNode, createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';

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
  signInWithPassword: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
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
  signInWithPassword: async () => { await Promise.resolve(); return { success: false }; },
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

  const fetchUserProfile = useCallback(async (userId: string, userEmail?: string): Promise<UserProfile | null> => {
    try {
      // 認証されたユーザーとしてプロファイルを取得
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.warn('Profile fetch error:', error.message, 'Code:', error.code);
        return null;
      }
      
      return profile as UserProfile;
    } catch (error) {
      console.error('Exception in fetchUserProfile:', error);
      return null;
    }
  }, []); // 依存関係なしでメモ化

  const checkAdminStatus = (user: User | null, profile: UserProfile | null): boolean => {
    if (!user) return false;
    
    const isAdminByEmail = user.email === 'capasjapan@gmail.com';
    const isAdminByProfile = profile?.user_type === 'admin';
    
    return isAdminByEmail || isAdminByProfile;
  };

  useEffect(() => {
    let isMounted = true;
    
    const initializeAuth = async () => {
      try {
        
        // シンプルなセッション取得
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.warn('❌ Session retrieval error:', error.message);
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
          
          setSession(session);
          setUser(session.user);
          setIsAuthenticated(true);
          
          // 認証されたユーザーのみプロファイルを取得
          try {
            const profile = await fetchUserProfile(session.user.id, session.user.email);
            if (isMounted) {
              setUserProfile(profile);
              setIsAdmin(checkAdminStatus(session.user, profile));
            }
          } catch (profileError) {
            console.warn('Profile fetch failed:', profileError);
            // プロファイル取得に失敗してもログイン状態は維持
            if (isMounted) {
              setUserProfile(null);
              setIsAdmin(checkAdminStatus(session.user, null));
            }
          }
        } else {
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
        }
      }
    };

    initializeAuth();

    // 認証状態の変更を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // console.log('🔄 Auth state changed:', event, session?.user?.email); // ログを削除
      
      if (!isMounted) return;

      if (event === 'SIGNED_OUT' || !session) {
        setSession(null);
        setUser(null);
        setIsAuthenticated(false);
        setUserProfile(null);
        setIsAdmin(false);
        setLoading(false);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // 既に同じセッションが設定されている場合はスキップ
        if (session && user && session.user.id === user.id && isAuthenticated) {
          return;
        }
        
        setSession(session);
        setUser(session.user);
        setIsAuthenticated(true);
        
        // プロファイルが既に取得済みの場合はスキップ
        if (userProfile && userProfile.id === session.user.id) {
          // console.log('🔄 Profile already loaded, skipping fetch...'); // ログを削除
          setLoading(false);
          return;
        }
        
        // 認証されたユーザーのみプロファイルを取得
        try {
          const profile = await fetchUserProfile(session.user.id, session.user.email);
          if (isMounted) {
            setUserProfile(profile);
            setIsAdmin(checkAdminStatus(session.user, profile));
          }
        } catch (profileError) {
          console.warn('Profile fetch failed during auth change:', profileError);
          if (isMounted) {
            setUserProfile(null);
            setIsAdmin(checkAdminStatus(session.user, null));
          }
        }
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []); // 依存関係を空にして無限ループを防ぐ

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
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (error) {
      console.error('Magic Link exception:', error);
      return { success: false, error: String(error) };
    }
  }, []);

  const signInWithPassword = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        console.error('Password sign in error:', error);
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (error) {
      console.error('Password sign in exception:', error);
      return { success: false, error: String(error) };
    }
  }, []);

  const verify2FA = useCallback(async (code: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // 2FA認証用のエンドポイントを呼び出す
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
      console.error('2FA verification exception:', error);
      return { success: false, error: String(error) };
    }
  }, [user]);

  const setIsTrustedDevice = useCallback((trusted: boolean) => {
    try {
      localStorage.setItem('isTrustedDevice', JSON.stringify(trusted));
    } catch (error) {
      console.error('Error setting trusted device:', error);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      // 複数のSupabaseクライアントセッションを強制的にクリア
      await supabase.auth.signOut({ scope: 'global' });
      
      // ローカル状態をクリア
      setSession(null);
      setUser(null);
      setIsAuthenticated(false);
      setUserProfile(null);
      setIsAdmin(false);
      
      // ローカルストレージを完全にクリア
      try {
        localStorage.removeItem('isTrustedDevice');
        localStorage.removeItem('pre_payment_auth_state');
        localStorage.removeItem('supabase.auth.token');
        sessionStorage.clear();
        
        // Supabase関連のキーを全て削除
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('sb-')) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        
      } catch (error) {
        console.error('Error clearing localStorage:', error);
      }
      
      // 追加: ページをリロードしてセッション状態を完全にリセット
      void setTimeout(() => {
        window.location.reload();
      }, 100);
      
    } catch (error) {
      console.error('Logout error:', error);
      
      // エラーが発生した場合でも強制的にリセット
      setSession(null);
      setUser(null);
      setIsAuthenticated(false);
      setUserProfile(null);
      setIsAdmin(false);
      
      // 強制リロード
      void setTimeout(() => {
        window.location.reload();
      }, 100);
    }
  }, []);

  const value = {
    user,
    session,
    loading,
    logout,
    isAuthenticated,
    signInWithMagicLink,
    signInWithPassword,
    verify2FA,
    setIsTrustedDevice,
    isAdmin,
    userProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export { AuthProvider, useAuth };
export default useAuth;
