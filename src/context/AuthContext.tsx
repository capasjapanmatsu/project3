import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../utils/supabase';
import { safeSetItem } from '../utils/safeStorage';

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
  userProfile: any;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  logout: async () => {},
  isAuthenticated: false,
  signInWithMagicLink: async () => ({ success: false }),
  verify2FA: async () => ({ success: false }),
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
  const [userProfile, setUserProfile] = useState<any>(null);

  const fetchUserProfile = async (userId: string, userEmail?: string) => {
    try {
      console.log('👤 Fetching user profile for:', userId);
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('❌ Error fetching user profile:', error);
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        
        // プロファイルが存在しない場合、自動作成を試みる
        if (error.code === 'PGRST116' && userEmail) {
          console.log('🆕 Profile not found, attempting to create...');
          
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
            console.error('❌ Error creating profile:', createError);
            return null;
          }
          
          console.log('✅ Profile created successfully:', newProfile);
          return newProfile;
        }
        
        return null;
      }
      
      console.log('✅ User profile fetched:', {
        id: profile.id,
        user_type: profile.user_type,
        created_at: profile.created_at
      });
      
      return profile;
    } catch (error) {
      console.error('❌ Exception fetching user profile:', error);
      return null;
    }
  };

  const checkAdminStatus = (user: User | null, profile: any) => {
    console.log('🔍 Checking admin status:', {
      user_email: user?.email,
      profile_user_type: profile?.user_type,
      is_target_admin_email: user?.email === 'capasjapan@gmail.com'
    });
    
    if (!user) {
      console.log('❌ No user found');
      return false;
    }
    
    const isAdminByEmail = user.email === 'capasjapan@gmail.com';
    const isAdminByProfile = profile?.user_type === 'admin';
    const isAdmin = isAdminByEmail || isAdminByProfile;
    
    console.log('🔐 Admin check result:', {
      isAdminByEmail,
      isAdminByProfile,
      finalResult: isAdmin
    });
    
    return isAdmin;
  };

  useEffect(() => {
    console.log('🚀 Auth initialization started');
    
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log('📋 Initial session:', {
        hasSession: !!session,
        hasUser: !!session?.user,
        userEmail: session?.user?.email,
        sessionExpiry: session?.expires_at
      });
      
      setSession(session);
      setUser(session?.user ?? null);
      setIsAuthenticated(!!session?.user);

      if (session?.user) {
        const profile = await fetchUserProfile(session.user.id, session.user.email);
        setUserProfile(profile);
        const adminStatus = checkAdminStatus(session.user, profile);
        setIsAdmin(adminStatus);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth state changed:', {
        event,
        hasSession: !!session,
        hasUser: !!session?.user,
        userEmail: session?.user?.email
      });
      
      setSession(session);
      setUser(session?.user ?? null);
      setIsAuthenticated(!!session?.user);

      if (session?.user) {
        const profile = await fetchUserProfile(session.user.id, session.user.email);
        setUserProfile(profile);
        const adminStatus = checkAdminStatus(session.user, profile);
        setIsAdmin(adminStatus);
      } else {
        setUserProfile(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithMagicLink = async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (error) {
        console.error('Magic Link error:', error);
        return { success: false, error: `Magic Linkの送信に失敗しました: ${(error as Error).message}` };
      }
      return { success: true };
    } catch (error) {
      console.error('Magic Link error:', error);
      return { success: false, error: `Magic Linkの送信に失敗しました: ${(error as Error).message}` };
    }
  };

  const verify2FA = async (code: string): Promise<{ success: boolean; error?: string }> => {
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
        const errorData = await response.json();
        return { success: false, error: errorData.error || '認証に失敗しました' };
      }
      const result = await response.json();
      return { success: result.success, error: result.error };
    } catch (error) {
      console.error('2FA verification error:', error);
      return { success: false, error: `認証に失敗しました: ${(error as Error).message}` };
    }
  };

  const setIsTrustedDevice = (trusted: boolean) => {
    if (trusted && user) {
      safeSetItem(`trusted_device_${user.id}`, 'true');
    } else if (user) {
      safeSetItem(`trusted_device_${user.id}`, 'false');
    }
  };

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setIsAuthenticated(false);
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
