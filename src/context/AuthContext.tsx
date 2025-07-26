import { Session, User } from '@supabase/supabase-js';
import { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
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
        // 初期認証状態の確認（ログ削除）
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) {
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

        if (user && isMounted) {
          // 初期状態設定
          setUser(user);
          setIsAuthenticated(true);
          setUserProfile(null); // プロフィール取得スキップ
          setIsAdmin(user.email === 'capasjapan@gmail.com');
          setLoading(false);
        } else {
          if (isMounted) {
            setSession(null);
            setUser(null);
            setIsAuthenticated(false);
            setUserProfile(null);
            setIsAdmin(false);
            setLoading(false);
          }
        }
      } catch (err) {
        if (isMounted) {
          setSession(null);
          setUser(null);
          setIsAuthenticated(false);
          setUserProfile(null);
          setIsAdmin(false);
          setLoading(false);
        }
      }
    };

    // 初期化実行
    initializeAuth();

    // 認証状態の変更を監視（SIGNED_INイベント処理を復元）
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;

      if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setIsAuthenticated(false);
        setUserProfile(null);
        setIsAdmin(false);
        setLoading(false);
      } else if (event === 'SIGNED_IN' && session) {
        // ログイン成功時の即座の状態更新
        setSession(session);
        setUser(session.user);
        setIsAuthenticated(true);
        setUserProfile(null); // プロフィール取得スキップ
        setIsAdmin(session.user.email === 'capasjapan@gmail.com');
        setLoading(false);
      } else if (event === 'TOKEN_REFRESHED' && session) {
        // トークン更新時
        setSession(session);
        setUser(session.user);
        setLoading(false);
      }
    });

    // クリーンアップ
    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []); // 依存配列を空に戻す

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

  const value = useMemo(() => ({
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
  }), [
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
  ]);

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
