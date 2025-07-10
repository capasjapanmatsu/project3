import { supabase } from './supabase';

export const checkAndSetAdminUser = async (email: string) => {
  try {
    console.log('🔧 Checking admin user setup for:', email);
    
    // 現在のユーザーを取得
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.error('❌ Error getting current user:', userError);
      return { success: false, error: userError.message };
    }

    if (!user) {
      console.log('❌ No user found');
      return { success: false, error: 'No user found' };
    }

    console.log('👤 Current user:', {
      id: user.id,
      email: user.email,
      created_at: user.created_at
    });

    // プロファイルテーブルの存在確認（emailカラムを使わない）
    const { data: existingProfile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error('❌ Error checking profile:', profileError);
      return { success: false, error: profileError.message };
    }

    console.log('📋 Existing profile:', existingProfile);

    // プロファイルが存在しない場合は作成
    if (!existingProfile) {
      console.log('🆕 Creating new profile for user');
      
      // プロファイル作成（emailカラムを除く）
      const profileData: Record<string, any> = {
        id: user.id,
        name: user.email?.split('@')[0] || 'Unknown',
        user_type: user.email === 'capasjapan@gmail.com' ? 'admin' : 'user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error: insertError } = await supabase
        .from('profiles')
        .insert([profileData]);

      if (insertError) {
        console.error('❌ Error creating profile:', insertError);
        return { success: false, error: insertError.message };
      }

      console.log('✅ Profile created successfully');
      return { success: true, message: 'Profile created successfully' };
    }

    // 既存のプロファイルがある場合、管理者権限を確認・設定
    if (user.email === 'capasjapan@gmail.com' && existingProfile.user_type !== 'admin') {
      console.log('🔄 Updating user_type to admin');
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          user_type: 'admin',
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('❌ Error updating profile:', updateError);
        return { success: false, error: updateError.message };
      }

      console.log('✅ User type updated to admin');
      return { success: true, message: 'User type updated to admin' };
    }

    console.log('✅ Profile already exists and is correct');
    return { success: true, message: 'Profile already exists and is correct' };

  } catch (error) {
    console.error('❌ Exception in checkAndSetAdminUser:', error);
    return { success: false, error: (error as Error).message };
  }
};

export const debugAuthState = async () => {
  try {
    console.log('🔍 Starting auth state debug...');
    
    // セッション情報
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error('❌ Session error:', sessionError);
      return;
    }

    console.log('📋 Session info:', {
      hasSession: !!session,
      userEmail: session?.user?.email,
      userId: session?.user?.id,
      expiresAt: session?.expires_at,
      accessToken: session?.access_token ? 'Present' : 'Missing'
    });

    if (!session?.user) {
      console.log('❌ No user in session');
      return;
    }

    // プロファイル情報（emailカラムを使わない）
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle();

    if (profileError) {
      console.error('❌ Profile error:', profileError);
    } else {
      console.log('📋 Profile info:', profile);
    }

    // テーブル構造の確認
    const { data: tableInfo, error: tableError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'profiles')
      .order('ordinal_position');

    if (tableError) {
      console.error('❌ Table info error:', tableError);
    } else {
      console.log('📋 Profiles table structure:', tableInfo);
    }

  } catch (error) {
    console.error('❌ Exception in debugAuthState:', error);
  }
};

export const testSupabaseConnection = async () => {
  try {
    console.log('🔗 Testing Supabase connection...');
    
    // シンプルな接続テスト
    const { data, error } = await supabase
      .from('profiles')
      .select('id, user_type')
      .limit(1);

    if (error) {
      console.error('❌ Connection test failed:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Connection test successful:', data);
    return { success: true, data };
  } catch (error) {
    console.error('❌ Exception in testSupabaseConnection:', error);
    return { success: false, error: (error as Error).message };
  }
};

export const fixRLSPolicies = async () => {
  try {
    console.log('🔧 Attempting to fix RLS policies...');
    
    // Note: RLS無効化は管理者権限が必要なため、クライアントサイドからは実行できません
    // 代わりに、直接プロファイルの更新を試みます
    
    return { success: false, error: 'RLS無効化はサーバーサイドで実行する必要があります' };
  } catch (error) {
    console.error('❌ Exception in fixRLSPolicies:', error);
    return { success: false, error: (error as Error).message };
  }
};

export const directUpdateUserType = async (userId: string) => {
  try {
    console.log('🔧 Attempting direct user type update for:', userId);
    
    // 直接プロファイルの更新を試みる
    const { error } = await supabase
      .from('profiles')
      .update({ user_type: 'admin' })
      .eq('id', userId);

    if (error) {
      console.error('❌ Direct update failed:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Direct update successful');
    return { success: true, message: 'User type updated successfully' };
  } catch (error) {
    console.error('❌ Exception in directUpdateUserType:', error);
    return { success: false, error: (error as Error).message };
  }
}; 