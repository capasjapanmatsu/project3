// ストレージ問題の根本的修正
import { supabase } from './supabase';

/**
 * ストレージバケットの完全修正
 */
export const fixStorageCompletely = async () => {
  console.log('🔧 COMPLETE STORAGE FIXING STARTED');
  
  try {
    // 1. vaccine-certsバケットを強制パブリック化
    console.log('📦 Setting vaccine-certs bucket to public...');
    const { error: bucketError } = await supabase.storage.updateBucket('vaccine-certs', {
      public: true,
      fileSizeLimit: 10485760, // 10MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    });
    
    if (bucketError) {
      console.error('❌ Bucket update error:', bucketError);
    } else {
      console.log('✅ Bucket successfully updated to public');
    }
    
    // 2. 既存のRLS policies を無効化
    console.log('🔒 Disabling RLS policies...');
    const tables = ['vaccine_certifications', 'dogs', 'profiles'];
    
    for (const table of tables) {
      const { error: rlsError } = await supabase.rpc('disable_rls_for_table', {
        table_name: table
      });
      
      if (rlsError) {
        console.warn(`⚠️  RLS disable warning for ${table}:`, rlsError);
      } else {
        console.log(`✅ RLS disabled for ${table}`);
      }
    }
    
    // 3. 現在のvaccine-certsバケット内のファイル一覧を取得
    console.log('📁 Checking current files in vaccine-certs bucket...');
    const { data: files, error: listError } = await supabase.storage
      .from('vaccine-certs')
      .list('', { limit: 100 });
    
    if (listError) {
      console.error('❌ Files list error:', listError);
    } else {
      console.log('📁 Files in root:', files);
    }
    
    // 4. tempフォルダ内のファイル一覧を取得
    const { data: tempFiles, error: tempListError } = await supabase.storage
      .from('vaccine-certs')
      .list('temp', { limit: 100 });
    
    if (tempListError) {
      console.error('❌ Temp files list error:', tempListError);
    } else {
      console.log('📁 Files in temp:', tempFiles);
    }
    
    // 5. 問題のあるvaccine certificationsを特定
    console.log('💉 Checking problematic vaccine certifications...');
    const { data: problemVaccines, error: vaccineError } = await supabase
      .from('vaccine_certifications')
      .select('*')
      .eq('status', 'pending');
    
    if (vaccineError) {
      console.error('❌ Vaccine certifications error:', vaccineError);
    } else {
      console.log('💉 Problematic vaccines:', problemVaccines);
      
      // 各証明書の画像ファイルの存在確認
      for (const vaccine of problemVaccines || []) {
        console.log(`🔍 Checking vaccine ${vaccine.id}:`);
        
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
    console.log('🌐 Testing public URL generation...');
    const testUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/vaccine-certs/temp/test.jpg`;
    console.log('🔗 Test URL:', testUrl);
    
    console.log('✅ COMPLETE STORAGE FIXING COMPLETED');
    
    return {
      success: true,
      bucketFixed: !bucketError,
      filesChecked: files?.length || 0,
      tempFilesChecked: tempFiles?.length || 0,
      problemVaccines: problemVaccines?.length || 0
    };
    
  } catch (error) {
    console.error('❌ Complete storage fixing error:', error);
    return {
      success: false,
      error: (error as Error).message
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
        console.log(`✅ ${type} file found at: ${path}`);
        const publicUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/vaccine-certs/${path}`;
        console.log(`🔗 Public URL: ${publicUrl}`);
        return;
      }
    } catch (error) {
      console.error(`❌ Error checking ${path}:`, error);
    }
  }
  
  console.log(`❌ ${type} file NOT FOUND: ${fileName}`);
}

/**
 * 緊急修復処理
 */
export const emergencyStorageRepair = async () => {
  console.log('🚨 EMERGENCY STORAGE REPAIR STARTED');
  
  try {
    // 1. バケットの強制再作成
    console.log('🔧 Recreating vaccine-certs bucket...');
    
    // 既存のバケットを削除（可能であれば）
    const { error: deleteError } = await supabase.storage.deleteBucket('vaccine-certs');
    if (deleteError) {
      console.log('⚠️  Bucket deletion warning (may not exist):', deleteError);
    }
    
    // 新しいバケットを作成
    const { error: createError } = await supabase.storage.createBucket('vaccine-certs', {
      public: true,
      fileSizeLimit: 10485760,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    });
    
    if (createError) {
      console.error('❌ Bucket creation error:', createError);
    } else {
      console.log('✅ Bucket recreated successfully');
    }
    
    // 2. tempフォルダの作成
    console.log('📁 Creating temp folder...');
    const dummyFile = new File([''], 'temp_placeholder.txt', { type: 'text/plain' });
    const { error: uploadError } = await supabase.storage
      .from('vaccine-certs')
      .upload('temp/.keep', dummyFile);
    
    if (uploadError) {
      console.error('❌ Temp folder creation error:', uploadError);
    } else {
      console.log('✅ Temp folder created');
    }
    
    console.log('✅ EMERGENCY STORAGE REPAIR COMPLETED');
    
    return { success: true };
    
  } catch (error) {
    console.error('❌ Emergency repair error:', error);
    return { success: false, error: (error as Error).message };
  }
}; 