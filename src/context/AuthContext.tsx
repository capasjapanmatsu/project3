import { Session, User } from '@supabase/supabase-js';
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
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
    if (!user) return false;
    
    const isAdminByEmail = user.email === 'capasjapan@gmail.com';
    const isAdminByProfile = profile?.user_type === 'admin';
    
    return isAdminByEmail || isAdminByProfile;
  };

  useEffect(() => {
    let isMounted = true;
    
    const initializeAuth = async () => {
      try {
        console.log('🔐 Auth initialization started...');
        
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
          console.log('✅ Session found, user:', session.user.email);
          
          setSession(session);
          setUser(session.user);
          setIsAuthenticated(true);
          
          // プロファイルを非同期で取得（UI表示をブロックしない）
          fetchUserProfile(session.user.id, session.user.email).then(profile => {
            if (isMounted) {
              setUserProfile(profile);
              setIsAdmin(checkAdminStatus(session.user, profile));
            }
          });
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
          
          // プロファイルを非同期で取得
          fetchUserProfile(session.user.id, session.user.email).then(profile => {
            if (isMounted) {
              setUserProfile(profile);
              setIsAdmin(checkAdminStatus(session.user, profile));
            }
          });
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
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      setIsAuthenticated(false);
      setUserProfile(null);
      setIsAdmin(false);
      
      // クリーンアップ
      try {
        localStorage.removeItem('isTrustedDevice');
        localStorage.removeItem('pre_payment_auth_state');
      } catch (error) {
        console.error('Error clearing localStorage:', error);
      }
    } catch (error) {
      console.error('Logout error:', error);
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
