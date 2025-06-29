import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../utils/supabase';
import { safeGetItem, safeSetItem } from '../utils/safeStorage';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  signInWithMagicLink: (email: string) => Promise<{ success: boolean; error?: string }>;
  verify2FA: (code: string) => Promise<{ success: boolean; error?: string }>;
  setIsTrustedDevice: (trusted: boolean) => void;
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
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // セッションの確認
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsAuthenticated(!!session?.user);
      setLoading(false);
    });

    // 認証状態の変更を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsAuthenticated(!!session?.user);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Magic Link認証
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
        return { success: false, error: `Magic Linkの送信に失敗しました: ${error.message}` };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Magic Link error:', error);
      return { success: false, error: `Magic Linkの送信に失敗しました: ${error.message}` };
    }
  };

  // 2FA検証
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
    } catch (error: any) {
      console.error('2FA verification error:', error);
      return { success: false, error: `認証に失敗しました: ${error.message}` };
    }
  };

  // 信頼できるデバイスとして設定
  const setIsTrustedDevice = (trusted: boolean) => {
    if (trusted && user) {
      safeSetItem(`trusted_device_${user.id}`, 'true');
    } else if (user) {
      safeSetItem(`trusted_device_${user.id}`, 'false');
    }
  };

  // Logout function
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
      setIsTrustedDevice
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

export { AuthContext }