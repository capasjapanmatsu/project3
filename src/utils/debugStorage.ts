// ストレージデバッグユーティリティ

import { supabase } from './supabase';

/**
 * ストレージバケットの詳細情報を取得
 */
export const debugStorageBuckets = async () => {
  try {
    console.log('🔍 Checking storage buckets...');
    
    // バケット一覧を取得
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('❌ Error listing buckets:', bucketsError);
      return { success: false, error: bucketsError };
    }
    
    console.log('📦 Available buckets:', buckets);
    
    // vaccine-certsバケットの詳細情報
    const vaccineBucket = buckets?.find(b => b.id === 'vaccine-certs');
    if (vaccineBucket) {
      console.log('💉 vaccine-certs bucket details:', vaccineBucket);
      
      // vaccine-certsバケット内のファイル一覧を取得
      const { data: files, error: filesError } = await supabase.storage
        .from('vaccine-certs')
        .list('', { limit: 100 });
      
      if (filesError) {
        console.error('❌ Error listing vaccine-certs files:', filesError);
      } else {
        console.log('📁 Files in vaccine-certs bucket:', files);
        
        // tempフォルダの内容も確認
        const { data: tempFiles, error: tempFilesError } = await supabase.storage
          .from('vaccine-certs')
          .list('temp', { limit: 100 });
        
        if (!tempFilesError && tempFiles) {
          console.log('📁 Files in vaccine-certs/temp folder:', tempFiles);
        }
      }
    } else {
      console.log('❌ vaccine-certs bucket not found!');
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
  console.log('🔍 Testing specific image URLs...');
  
  for (const url of imageUrls) {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      console.log(`🖼️  ${url}: ${response.ok ? '✅ OK' : '❌ FAILED'} (${response.status})`);
    } catch (error) {
      console.log(`🖼️  ${url}: ❌ NETWORK ERROR`, error);
    }
  }
};

/**
 * vaccine-certsバケットを強制的にパブリックに設定
 */
export const forcePublicBucket = async () => {
  try {
    console.log('🔧 Force setting vaccine-certs bucket to public...');
    
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
    
    console.log('✅ Successfully updated vaccine-certs bucket to public');
    
    // 設定が反映されているか確認
    const { data: buckets } = await supabase.storage.listBuckets();
    const vaccineBucket = buckets?.find(b => b.id === 'vaccine-certs');
    console.log('📦 Updated bucket info:', vaccineBucket);
    
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
    console.log('🔍 Checking vaccine certification data...');
    
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
    
    console.log('💉 Pending vaccine certifications:', vaccines);
    
    // 各証明書の画像ファイルの存在を確認
    for (const vaccine of vaccines || []) {
      console.log(`🐕 Vaccine ID: ${vaccine.id}`);
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
          
          console.log(`  - Rabies file exists: ${!checkError && data?.length > 0 ? '✅' : '❌'}`);
        }
      }
      
      if (vaccine.combo_vaccine_image) {
        const filePath = vaccine.combo_vaccine_image.split('/').pop();
        if (filePath) {
          const { data, error: checkError } = await supabase.storage
            .from('vaccine-certs')
            .list('temp', { search: filePath });
          
          console.log(`  - Combo file exists: ${!checkError && data?.length > 0 ? '✅' : '❌'}`);
        }
      }
    }
    
    return { success: true, vaccines };
    
  } catch (error) {
    console.error('❌ Debug vaccine data error:', error);
    return { success: false, error };
  }
}; 