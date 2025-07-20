// Supabase管理者権限での操作
import { supabase } from './supabase';

/**
 * RLSポリシーを完全に無効化
 */
export const disableRLS = async () => {
  
  try {
    // vaccine_certificationsテーブルのRLS無効化
    const { error: vaccineRLSError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE vaccine_certifications DISABLE ROW LEVEL SECURITY;'
    });
    
    if (vaccineRLSError) {
      console.warn('⚠️ Vaccine certifications RLS disable warning:', vaccineRLSError);
    }
    
    // dogsテーブルのRLS無効化
    const { error: dogsRLSError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE dogs DISABLE ROW LEVEL SECURITY;'
    });
    
    if (dogsRLSError) {
      console.warn('⚠️ Dogs RLS disable warning:', dogsRLSError);
    }
    
    // profilesテーブルのRLS無効化
    const { error: profilesRLSError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;'
    });
    
    if (profilesRLSError) {
      console.warn('⚠️ Profiles RLS disable warning:', profilesRLSError);
    }
    
    return { success: true };
    
  } catch (error) {
    console.error('❌ RLS disable error:', error);
    return { success: false, error: (error as Error).message };
  }
};

/**
 * データベース権限を管理者レベルに設定
 */
export const grantAdminAccess = async () => {
  
  try {
    // 管理者権限をすべてのテーブルに付与
    const tables = ['vaccine_certifications', 'dogs', 'profiles', 'parks', 'notifications'];
    
    for (const table of tables) {
      const { error } = await supabase.rpc('exec_sql', {
        sql: `GRANT ALL PRIVILEGES ON TABLE ${table} TO authenticated;`
      });
      
      if (error) {
        console.warn(`⚠️ Grant privileges warning for ${table}:`, error);
      } else {
      }
    }
    
    return { success: true };
    
  } catch (error) {
    console.error('❌ Grant admin access error:', error);
    return { success: false, error: (error as Error).message };
  }
};

/**
 * ストレージバケットの強制修復
 */
export const forceFixBucket = async () => {
  
  try {
    // 1. バケットが存在するか確認
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('❌ List buckets error:', listError);
      return { success: false, error: listError.message };
    }
    
    const vaccineBucket = buckets?.find(b => b.id === 'vaccine-certs');
    
    if (!vaccineBucket) {
      
      // バケットを新規作成
      const { error: createError } = await supabase.storage.createBucket('vaccine-certs', {
        public: true,
        fileSizeLimit: 10485760,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
      });
      
      if (createError) {
        console.error('❌ Create bucket error:', createError);
        return { success: false, error: createError.message };
      }
      
    } else {
      
      // 既存バケットを更新
      const { error: updateError } = await supabase.storage.updateBucket('vaccine-certs', {
        public: true,
        fileSizeLimit: 10485760,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
      });
      
      if (updateError) {
        console.error('❌ Update bucket error:', updateError);
        return { success: false, error: updateError.message };
      }
      
    }
    
    // 2. tempフォルダを作成
    const keepFile = new File(['# Keep this folder'], '.keep', { type: 'text/plain' });
    
    const { error: uploadError } = await supabase.storage
      .from('vaccine-certs')
      .upload('temp/.keep', keepFile, { upsert: true });
    
    if (uploadError) {
      console.warn('⚠️ Temp folder creation warning:', uploadError);
    } else {
    }
    
    return { success: true };
    
  } catch (error) {
    console.error('❌ Force fix bucket error:', error);
    return { success: false, error: (error as Error).message };
  }
}; 
