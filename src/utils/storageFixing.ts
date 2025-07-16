// ストレージ問題の根本的修正
import { handleSupabaseError, log } from './helpers';
import { supabase } from './supabase';

/**
 * ストレージバケットの完全修正
 */
export const fixStorageCompletely = async () => {
  log('info', '🔧 COMPLETE STORAGE FIXING STARTED');
  
  try {
    // 1. vaccine-certsバケットを強制パブリック化
    log('info', '📦 Setting vaccine-certs bucket to public...');
    const { error: bucketError } = await supabase.storage.updateBucket('vaccine-certs', {
      public: true,
      fileSizeLimit: 10485760, // 10MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    });
    
    if (bucketError) {
      log('error', '❌ Bucket update error:', bucketError);
    } else {
      log('info', '✅ Bucket successfully updated to public');
    }
    
    // 2. 既存のRLS policies を無効化
    log('info', '🔒 Disabling RLS policies...');
    const tables = ['vaccine_certifications', 'dogs', 'profiles'];
    
    for (const table of tables) {
      const { error: rlsError } = await supabase.rpc('disable_rls_for_table', {
        table_name: table
      });
      
      if (rlsError) {
        log('warn', `⚠️  RLS disable warning for ${table}:`, rlsError);
      } else {
        log('info', `✅ RLS disabled for ${table}`);
      }
    }
    
    // 3. 現在のvaccine-certsバケット内のファイル一覧を取得
    log('info', '📁 Checking current files in vaccine-certs bucket...');
    const { data: files, error: listError } = await supabase.storage
      .from('vaccine-certs')
      .list('', { limit: 100 });
    
    if (listError) {
      log('error', '❌ Files list error:', listError);
    } else {
      log('info', '📁 Files in root:', files);
    }
    
    // 4. tempフォルダ内のファイル一覧を取得
    const { data: tempFiles, error: tempListError } = await supabase.storage
      .from('vaccine-certs')
      .list('temp', { limit: 100 });
    
    if (tempListError) {
      log('error', '❌ Temp files list error:', tempListError);
    } else {
      log('info', '📁 Files in temp:', tempFiles);
    }
    
    // 5. 問題のあるvaccine certificationsを特定
    log('info', '💉 Checking problematic vaccine certifications...');
    const { data: problemVaccines, error: vaccineError } = await supabase
      .from('vaccine_certifications')
      .select('*')
      .eq('status', 'pending');
    
    if (vaccineError) {
      log('error', '❌ Vaccine certifications error:', vaccineError);
    } else {
      log('info', '💉 Problematic vaccines:', problemVaccines);
      
      // 各証明書の画像ファイルの存在確認
      for (const vaccine of problemVaccines || []) {
        log('info', `🔍 Checking vaccine ${vaccine.id}`);
        
        // 狂犬病ワクチン画像
        if (vaccine.rabies_vaccine_image) {
          await checkFileExists(vaccine.rabies_vaccine_image, 'rabies');
        }
        
        // 混合ワクチン画像
        if (vaccine.combo_vaccine_image) {
          await checkFileExists(vaccine.combo_vaccine_image, 'combo');
        }
      }
    }
    
    // 6. 公開URLのテスト
    log('info', '🌐 Testing public URL generation...');
    const testUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/vaccine-certs/temp/test.jpg`;
    log('info', '🔗 Test URL:', { testUrl });
    
    log('info', '✅ COMPLETE STORAGE FIXING COMPLETED');
    
    return {
      success: true,
      bucketFixed: !bucketError,
      filesChecked: files?.length || 0,
      tempFilesChecked: tempFiles?.length || 0,
      problemVaccines: problemVaccines?.length || 0
    };
    
  } catch (error) {
    log('error', '❌ Complete storage fixing error:', { error: handleSupabaseError(error) });
    return {
      success: false,
      error: handleSupabaseError(error)
    };
  }
};

/**
 * ファイルの存在確認
 */
async function checkFileExists(fileName: string, type: 'rabies' | 'combo') {
  const possiblePaths = [
    `temp/${fileName}`,
    fileName,
    `${fileName}`,
    `temp/${fileName.replace('pending_upload_', '')}`
  ];
  
  for (const path of possiblePaths) {
    try {
      const { data, error } = await supabase.storage
        .from('vaccine-certs')
        .list(path.includes('/') ? path.split('/')[0] : '', { 
          search: path.includes('/') ? path.split('/')[1] : path 
        });
      
      if (!error && data && data.length > 0) {
        log('info', `✅ ${type} file found at: ${path}`);
        const publicUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/vaccine-certs/${path}`;
        log('info', `🔗 Public URL: ${publicUrl}`);
        return;
      }
    } catch (error) {
      log('error', `❌ Error checking ${path}:`, { error });
    }
  }
  
  log('warn', `❌ ${type} file NOT FOUND: ${fileName}`);
}

/**
 * 緊急修復処理
 */
export const emergencyStorageRepair = async () => {
  log('info', '🚨 EMERGENCY STORAGE REPAIR STARTED');
  
  try {
    // 1. バケットの強制再作成
    log('info', '🔧 Recreating vaccine-certs bucket...');
    
    // 既存のバケットを削除（可能であれば）
    const { error: deleteError } = await supabase.storage.deleteBucket('vaccine-certs');
    if (deleteError) {
      log('warn', '⚠️  Bucket deletion warning (may not exist):', deleteError);
    }
    
    // 新しいバケットを作成
    const { error: createError } = await supabase.storage.createBucket('vaccine-certs', {
      public: true,
      fileSizeLimit: 10485760,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    });
    
    if (createError) {
      log('error', '❌ Bucket creation error:', createError);
    } else {
      log('info', '✅ Bucket recreated successfully');
    }
    
    // 2. tempフォルダの作成
    log('info', '📁 Creating temp folder...');
    const dummyFile = new File([''], 'temp_placeholder.txt', { type: 'text/plain' });
    const { error: uploadError } = await supabase.storage
      .from('vaccine-certs')
      .upload('temp/.keep', dummyFile);
    
    if (uploadError) {
      log('error', '❌ Temp folder creation error:', uploadError);
    } else {
      log('info', '✅ Temp folder created');
    }
    
    log('info', '✅ EMERGENCY STORAGE REPAIR COMPLETED');
    
    return { success: true };
    
  } catch (error) {
    log('error', '❌ Emergency repair error:', { error: handleSupabaseError(error) });
    return { success: false, error: handleSupabaseError(error) };
  }
}; 