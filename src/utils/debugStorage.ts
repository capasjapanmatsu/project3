// ストレージデバッグユーティリティ

import { log } from './helpers';
import { supabase } from './supabase';

/**
 * ストレージバケットの詳細情報を取得
 */
export const debugStorageBuckets = async () => {
  try {
    log('info', '🔍 Checking storage buckets...');
    
    // バケット一覧を取得
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      log('error', '❌ Error listing buckets:', { bucketsError });
      return { success: false, error: bucketsError };
    }
    
    log('info', '📦 Available buckets:', { buckets });
    
    // vaccine-certsバケットの詳細情報
    const vaccineBucket = buckets?.find(b => b.id === 'vaccine-certs');
    if (vaccineBucket) {
      
      // vaccine-certsバケット内のファイル一覧を取得
      const { data: files, error: filesError } = await supabase.storage
        .from('vaccine-certs')
        .list('', { limit: 100 });
      
      if (filesError) {
        console.error('❌ Error listing vaccine-certs files:', filesError);
      } else {
        
        // tempフォルダの内容も確認
        const { data: tempFiles, error: tempFilesError } = await supabase.storage
          .from('vaccine-certs')
          .list('temp', { limit: 100 });
        
        if (!tempFilesError && tempFiles) {
        }
      }
    } else {
    }
    
    return { success: true, buckets, vaccineBucket };
    
  } catch (error) {
    console.error('❌ Debug storage error:', error);
    return { success: false, error };
  }
};

/**
 * 特定の画像URLの存在をテスト
 */
export const testSpecificImageUrls = async (imageUrls: string[]) => {
  
  for (const url of imageUrls) {
    try {
      const response = await fetch(url, { method: 'HEAD' });
    } catch (error) {
    }
  }
};

/**
 * vaccine-certsバケットを強制的にパブリックに設定
 */
export const forcePublicBucket = async () => {
  try {
    
    // バケット設定を更新
    const { error } = await supabase.storage.updateBucket('vaccine-certs', {
      public: true,
      fileSizeLimit: 10485760, // 10MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    });
    
    if (error) {
      console.error('❌ Failed to update bucket:', error);
      return { success: false, error };
    }
    
    
    // 設定が反映されているか確認
    const { data: buckets } = await supabase.storage.listBuckets();
    const vaccineBucket = buckets?.find(b => b.id === 'vaccine-certs');
    
    return { success: true, bucket: vaccineBucket };
    
  } catch (error) {
    console.error('❌ Force public bucket error:', error);
    return { success: false, error };
  }
};

/**
 * ワクチン証明書データと実際のファイル存在を確認
 */
export const debugVaccineData = async () => {
  try {
    
    // pending状態のワクチン証明書を取得
    const { data: vaccines, error } = await supabase
      .from('vaccine_certifications')
      .select('*')
      .eq('status', 'pending')
      .limit(5);
    
    if (error) {
      console.error('❌ Error fetching vaccine data:', error);
      return { success: false, error };
    }
    
    
    // 各証明書の画像ファイルの存在を確認
    for (const vaccine of vaccines || []) {
      console.log(`  - Rabies image: ${vaccine.rabies_vaccine_image}`);
      console.log(`  - Combo image: ${vaccine.combo_vaccine_image}`);
      console.log(`  - Temp storage: ${vaccine.temp_storage}`);
      
      // 実際のファイル存在を確認
      if (vaccine.rabies_vaccine_image) {
        const filePath = vaccine.rabies_vaccine_image.split('/').pop();
        if (filePath) {
          const { data, error: checkError } = await supabase.storage
            .from('vaccine-certs')
            .list('temp', { search: filePath });
          
        }
      }
      
      if (vaccine.combo_vaccine_image) {
        const filePath = vaccine.combo_vaccine_image.split('/').pop();
        if (filePath) {
          const { data, error: checkError } = await supabase.storage
            .from('vaccine-certs')
            .list('temp', { search: filePath });
          
        }
      }
    }
    
    return { success: true, vaccines };
    
  } catch (error) {
    console.error('❌ Debug vaccine data error:', error);
    return { success: false, error };
  }
}; 

// 本番環境でのストレージクリア機能
export const clearAllStorageForLoginIssues = (): boolean => {
  try {
    // ローカルストレージをクリア
    if (typeof window !== 'undefined' && window.localStorage) {
      const keysToRemove = [
        'sb-onmcivwxtzqajcovptgf-auth-token',
        'supabase.auth.token',
        'lastUsedEmail',
        'isTrustedDevice',
        'maintenance_last_check',
        'maintenance_status'
      ];
      
      keysToRemove.forEach(key => {
        try {
          localStorage.removeItem(key);
        } catch (error) {
          console.warn(`Failed to remove ${key} from localStorage:`, error);
        }
      });
      
      // セッションストレージもクリア
      if (window.sessionStorage) {
        window.sessionStorage.clear();
      }
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('❌ Failed to clear storage:', error);
    return false;
  }
};

// 本番環境でのログイン問題診断
export const diagnoseLoginIssues = (): void => {
  console.log('Environment:', import.meta.env.PROD ? 'Production' : 'Development');
  console.log('User Agent:', navigator.userAgent);
  console.log('LocalStorage available:', typeof window !== 'undefined' && !!window.localStorage);
  console.log('SessionStorage available:', typeof window !== 'undefined' && !!window.sessionStorage);
  
  // Supabaseセッションをチェック
  try {
    const authTokens = Object.keys(localStorage).filter(key => 
      key.includes('supabase') || key.includes('auth')
    );
    console.log('Auth tokens in localStorage:', authTokens);
  } catch (error) {
    console.log('Cannot access localStorage:', error);
  }
  
  // Network状態をチェック
  console.log('Online status:', navigator.onLine);
  
  // 推奨アクション
  console.log('1. Clear browser cache and cookies');
  console.log('2. Try incognito/private mode');
  console.log('3. Run: clearAllStorageForLoginIssues()');
  console.log('4. Check network connection');
}; 
