// 即座にデバッグ実行するユーティリティ
import { supabase } from './supabase';

/**
 * 即座にストレージ状況を確認
 */
export const immediateStorageCheck = async () => {
  
  try {
    // 1. バケット一覧確認
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('❌ Buckets Error:', bucketsError);
      return;
    }
    
    // 2. vaccine-certsバケット確認
    const vaccineBucket = buckets?.find(b => b.id === 'vaccine-certs');
    
    // 3. バケット内のファイル一覧
    const { data: files, error: filesError } = await supabase.storage
      .from('vaccine-certs')
      .list('', { limit: 100 });
    
    if (filesError) {
      console.error('❌ Files Error:', filesError);
    } else {
    }
    
    // 4. tempフォルダ内のファイル一覧
    const { data: tempFiles, error: tempError } = await supabase.storage
      .from('vaccine-certs')
      .list('temp', { limit: 100 });
    
    if (tempError) {
      console.error('❌ Temp Files Error:', tempError);
    } else {
    }
    
    // 5. 特定のファイルを確認
    const specificFiles = [
      'pending_upload_1751901614432_image4.jpg',
      'pending_upload_1751901615076_images2.jpg'
    ];
    
    for (const fileName of specificFiles) {
      const { data: fileInfo, error: fileError } = await supabase.storage
        .from('vaccine-certs')
        .list('temp', { search: fileName });
      
    }
    
    // 6. 証明書データ確認
    const { data: vaccines, error: vaccinesError } = await supabase
      .from('vaccine_certifications')
      .select('*')
      .eq('status', 'pending')
      .limit(5);
    
    
    if (vaccinesError) {
      console.error('❌ Vaccines Error:', vaccinesError);
    }
    
  } catch (error) {
    console.error('❌ Immediate check error:', error);
  }
  
};

/**
 * 自動実行（インポート時に実行）
 */
// immediateStorageCheck(); 
