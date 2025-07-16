import { handleSupabaseError, log } from './helpers';
import { supabase } from './supabase';

export const checkAndSetAdminUser = async (email: string) => {
  try {
    log('info', '🔧 Checking admin user setup for:', { email });
    
    // 現在のユーザーを取得
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) {
      log('error', '❌ Error getting current user:', userError);
      return { success: false, error: userError.message };
    }

    if (!user) {
      log('error', '❌ No user found');
      return { success: false, error: 'No user found' };
    }

    log('info', '👤 Current user:', {
      id: user.id,
      email: user.email,
      metadata: user.user_metadata
    });

    // 管理者権限を確認
    const isAdmin = user.user_metadata?.admin === true;
    log('info', '🔍 Admin status:', { isAdmin });

    if (!isAdmin) {
      log('error', '❌ User is not admin');
      return { success: false, error: 'User is not admin' };
    }

    // プロフィールを取得
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      log('error', '❌ Error getting profile:', profileError);
      
      // プロフィールが存在しない場合は作成
      if (profileError.code === 'PGRST116') {
        log('info', '📝 Creating admin profile...');
        
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            name: user.user_metadata?.name || user.email?.split('@')[0] || 'Admin',
            user_type: 'admin',
            email: user.email,
            postal_code: '',
            address: '',
            phone_number: '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (createError) {
          log('error', '❌ Error creating admin profile:', createError);
          return { success: false, error: createError.message };
        }

        log('info', '✅ Admin profile created successfully:', newProfile);
        return { 
          success: true, 
          profile: newProfile, 
          message: 'Admin profile created successfully' 
        };
      }

      return { success: false, error: profileError.message };
    }

    // プロフィールのuser_typeを'admin'に更新
    if (profile.user_type !== 'admin') {
      log('info', '🔄 Updating user type to admin...');
      
      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update({ 
          user_type: 'admin',
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .single();

      if (updateError) {
        log('error', '❌ Error updating profile to admin:', updateError);
        return { success: false, error: updateError.message };
      }

      log('info', '✅ Profile updated to admin successfully:', updatedProfile);
      return { 
        success: true, 
        profile: updatedProfile, 
        message: 'Profile updated to admin successfully' 
      };
    }

    log('info', '✅ Admin user already set up correctly:', profile);
    return { 
      success: true, 
      profile, 
      message: 'Admin user already set up correctly' 
    };

  } catch (error) {
    log('error', '❌ Exception in checkAndSetAdminUser:', { error: handleSupabaseError(error) });
    return { success: false, error: handleSupabaseError(error) };
  }
};

export const debugAuthState = async () => {
  try {
    log('info', '🔍 Debugging auth state...');
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) {
      log('error', '❌ Auth user error:', userError);
      return { success: false, error: userError.message };
    }

    if (!user) {
      log('error', '❌ No authenticated user');
      return { success: false, error: 'No authenticated user' };
    }

    log('info', '👤 Auth user:', {
      id: user.id,
      email: user.email,
      metadata: user.user_metadata,
      created_at: user.created_at
    });

    // プロフィールを取得
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      log('error', '❌ Profile error:', profileError);
      return { success: false, error: profileError.message };
    }

    log('info', '👤 Profile:', profile);

    // 管理者権限を確認
    const isAdmin = user.user_metadata?.admin === true;
    log('info', '🔍 Admin status (metadata):', { isAdmin });
    log('info', '🔍 Admin status (profile):', { isProfileAdmin: profile?.user_type === 'admin' });

    return {
      success: true,
      user,
      profile,
      isAdmin,
      message: 'Auth state debug complete'
    };

  } catch (error) {
    log('error', '❌ Exception in debugAuthState:', { error: handleSupabaseError(error) });
    return { success: false, error: handleSupabaseError(error) };
  }
};

export const testSupabaseConnection = async () => {
  try {
    log('info', '🔍 Testing Supabase connection...');
    
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);

    if (error) {
      log('error', '❌ Connection test failed:', error);
      return { success: false, error: error.message };
    }

    log('info', '✅ Connection test successful:', data);
    return { success: true, data, message: 'Connection test successful' };

  } catch (error) {
    log('error', '❌ Exception in testSupabaseConnection:', { error: handleSupabaseError(error) });
    return { success: false, error: handleSupabaseError(error) };
  }
};

export const fixRLSPolicies = async () => {
  try {
    log('info', '🔧 Attempting to fix RLS policies...');
    
    // RLS修正は実際のデータベースマイグレーションで行う
    // ここでは確認のみ
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) {
      return { success: false, error: userError.message };
    }

    return { 
      success: true, 
      message: 'RLS policies should be fixed via database migrations' 
    };

  } catch (error) {
    log('error', '❌ Exception in fixRLSPolicies:', { error: handleSupabaseError(error) });
    return { success: false, error: handleSupabaseError(error) };
  }
};

export const directUpdateUserType = async (userId: string, userType: 'user' | 'admin' | 'owner') => {
  try {
    log('info', '🔧 Direct update user type:', { userId, userType });
    
    const { data, error } = await supabase
      .from('profiles')
      .update({ user_type: userType })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      log('error', '❌ Direct update failed:', error);
      return { success: false, error: error.message };
    }

    log('info', '✅ Direct update successful:', data);
    return { success: true, data, message: 'User type updated successfully' };

  } catch (error) {
    log('error', '❌ Exception in directUpdateUserType:', { error: handleSupabaseError(error) });
    return { success: false, error: handleSupabaseError(error) };
  }
}; 