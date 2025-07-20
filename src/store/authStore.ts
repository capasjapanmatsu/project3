import { supabase } from '@/utils/supabase';
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  name?: string;
  role?: 'user' | 'admin' | 'owner';
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<boolean>;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        user: null,
        isAuthenticated: false,
        isLoading: true,

        setUser: (user) =>
          set(
            { 
              user, 
              isAuthenticated: !!user 
            },
            false,
            'setUser'
          ),

        setLoading: (loading) =>
          set({ isLoading: loading }, false, 'setLoading'),

        login: async (email, password) => {
          set({ isLoading: true }, false, 'login/start');
          
          try {
            const { data, error } = await supabase.auth.signInWithPassword({
              email,
              password,
            });

            if (error) throw error;

            if (data.user) {
              // プロフィール情報を取得
              const { data: profile } = await supabase
                .from('profiles')
                .select('name, role')
                .eq('id', data.user.id)
                .single();

              const user: User = {
                id: data.user.id,
                email: data.user.email || '',
                name: profile?.name,
                role: profile?.role || 'user',
              };

              get().setUser(user);
              set({ isLoading: false }, false, 'login/success');
              return true;
            }
            
            set({ isLoading: false }, false, 'login/failed');
            return false;
          } catch (error) {
            console.error('Login error:', error);
            set({ isLoading: false }, false, 'login/error');
            return false;
          }
        },

        logout: async () => {
          set({ isLoading: true }, false, 'logout/start');
          
          try {
            await supabase.auth.signOut();
            set({ 
              user: null, 
              isAuthenticated: false, 
              isLoading: false 
            }, false, 'logout/success');
          } catch (error) {
            console.error('Logout error:', error);
            set({ isLoading: false }, false, 'logout/error');
          }
        },

        checkAuth: async () => {
          set({ isLoading: true }, false, 'checkAuth/start');
          
          try {
            const { data: { session } } = await supabase.auth.getSession();
            
            if (session?.user) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('name, role')
                .eq('id', session.user.id)
                .single();

              const user: User = {
                id: session.user.id,
                email: session.user.email || '',
                name: profile?.name,
                role: profile?.role || 'user',
              };

              get().setUser(user);
            } else {
              get().setUser(null);
            }
          } catch (error) {
            console.error('Auth check error:', error);
            get().setUser(null);
          } finally {
            set({ isLoading: false }, false, 'checkAuth/complete');
          }
        },

        updateProfile: async (updates) => {
          const { user } = get();
          if (!user) return false;

          try {
            const { error } = await supabase
              .from('profiles')
              .update(updates)
              .eq('id', user.id);

            if (error) throw error;

            set(
              { 
                user: { ...user, ...updates } 
              },
              false,
              'updateProfile'
            );
            return true;
          } catch (error) {
            console.error('Profile update error:', error);
            return false;
          }
        },
      }),
      {
        name: 'auth-store',
        partialize: (state) => ({ 
          user: state.user,
          isAuthenticated: state.isAuthenticated,
        }),
      }
    ),
    { name: 'auth-store' }
  )
); 