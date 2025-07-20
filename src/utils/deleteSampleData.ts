import { supabase } from './supabase';

export const deleteSampleDogParks = async () => {
  try {
    let deletedCount = 0;
    
    // 1. 特定のサンプルドッグラン名で削除（正しいテーブル名を使用）
    const sampleParkNames = [
      '青空ドッグパーク',
      'みどりの森ドッグラン',
      '代々木ドッグパーク',
      '渋谷ドッグパーク',
      '新宿セントラルドッグラン',
      '代々木ファミリードッグラン',
      '恵比寿プレミアムドッグラン',
      '六本木ヒルズドッグテラス',
      '浅草伝統ドッグラン',
      '上野動物園前ドッグラン',
      '熊本城公園ドッグラン',
      'サンプルドッグラン',
      'テストドッグラン',
      'サンプル施設',
      'テスト施設'
    ];

    for (const parkName of sampleParkNames) {
      
      // 関連する画像も先に削除
      const { data: parkData, error: parkFetchError } = await supabase
        .from('dog_park_facilities')
        .select('id')
        .eq('name', parkName);
        
      if (parkFetchError) {
        console.error(`❌ Error fetching park ${parkName}:`, parkFetchError);
        continue;
      }
      
      if (parkData && parkData.length > 0) {
        for (const park of parkData) {
          // 画像を削除
          const { error: imageDeleteError } = await supabase
            .from('dog_park_facility_images')
            .delete()
            .eq('park_id', park.id);
            
          if (imageDeleteError) {
            console.error(`❌ Error deleting images for park ${parkName}:`, imageDeleteError);
          } else {
          }
        }
      }
      
      // パーク本体を削除
      const { data, error } = await supabase
        .from('dog_park_facilities')
        .delete()
        .eq('name', parkName)
        .select('id');
      
      if (error) {
        console.error(`❌ Error deleting park ${parkName}:`, error);
      } else {
        const deleted = data ? data.length : 0;
        deletedCount += deleted;
      }
    }

    // 2. サンプルオーナー名で削除
    const sampleOwnerNames = ['山田太郎', '鈴木花子', 'テストユーザー', 'サンプルユーザー'];
    
    for (const ownerName of sampleOwnerNames) {
      
      // 関連する画像も先に削除
      const { data: ownerParksData, error: ownerParksFetchError } = await supabase
        .from('dog_park_facilities')
        .select('id')
        .eq('owner_name', ownerName);
        
      if (ownerParksFetchError) {
        console.error(`❌ Error fetching parks by owner ${ownerName}:`, ownerParksFetchError);
        continue;
      }
      
      if (ownerParksData && ownerParksData.length > 0) {
        for (const park of ownerParksData) {
          // 画像を削除
          const { error: imageDeleteError } = await supabase
            .from('dog_park_facility_images')
            .delete()
            .eq('park_id', park.id);
            
          if (imageDeleteError) {
            console.error(`❌ Error deleting images for owner ${ownerName}:`, imageDeleteError);
          } else {
          }
        }
      }
      
      // パーク本体を削除
      const { data, error } = await supabase
        .from('dog_park_facilities')
        .delete()
        .eq('owner_name', ownerName)
        .select('id');
      
      if (error) {
        console.error(`❌ Error deleting parks by owner ${ownerName}:`, error);
      } else {
        const deleted = data ? data.length : 0;
        deletedCount += deleted;
      }
    }

    // 3. サンプルの説明文を含むものを削除
    
    // 関連する画像も先に削除
    const { data: sampleDescParksData, error: sampleDescParksFetchError } = await supabase
      .from('dog_park_facilities')
      .select('id')
      .or('description.ilike.%サンプル%,description.ilike.%テスト%,description.ilike.%例%');
      
    if (sampleDescParksFetchError) {
      console.error('❌ Error fetching parks with sample descriptions:', sampleDescParksFetchError);
    } else if (sampleDescParksData && sampleDescParksData.length > 0) {
      for (const park of sampleDescParksData) {
        // 画像を削除
        const { error: imageDeleteError } = await supabase
          .from('dog_park_facility_images')
          .delete()
          .eq('park_id', park.id);
          
        if (imageDeleteError) {
          console.error(`❌ Error deleting images for sample description park:`, imageDeleteError);
        } else {
        }
      }
    }
    
    // パーク本体を削除
    const { data: sampleDescData, error: sampleDescError } = await supabase
      .from('dog_park_facilities')
      .delete()
      .or('description.ilike.%サンプル%,description.ilike.%テスト%,description.ilike.%例%')
      .select('id');
    
    if (sampleDescError) {
      console.error('❌ Error deleting parks with sample descriptions:', sampleDescError);
    } else {
      const deleted = sampleDescData ? sampleDescData.length : 0;
      deletedCount += deleted;
    }

    // 4. 孤立した画像を削除（park_idが存在しないもの）
    
    // 存在しないpark_idを持つ画像を削除
    const { data: allImages, error: allImagesError } = await supabase
      .from('dog_park_facility_images')
      .select('id, park_id');
      
    if (allImagesError) {
      console.error('❌ Error fetching all images:', allImagesError);
    } else if (allImages && allImages.length > 0) {
      for (const image of allImages) {
        const { data: parkExists, error: parkExistsError } = await supabase
          .from('dog_park_facilities')
          .select('id')
          .eq('id', image.park_id)
          .single();
          
        if (parkExistsError && parkExistsError.code === 'PGRST116') {
          // パークが存在しないので画像を削除
          const { error: deleteOrphanError } = await supabase
            .from('dog_park_facility_images')
            .delete()
            .eq('id', image.id);
            
          if (deleteOrphanError) {
            console.error(`❌ Error deleting orphan image ${image.id}:`, deleteOrphanError);
          } else {
          }
        }
      }
    }

    // 5. サンプルプロフィールの削除
    const sampleUsers = ['山田太郎', '鈴木花子', 'テストユーザー', 'サンプルユーザー'];
    
    for (const userName of sampleUsers) {
      
      // プロフィールを削除（full_name列をチェック）
      const { data: deletedProfiles, error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('full_name', userName)
        .select('id');
      
      if (profileError) {
        console.error(`❌ Error deleting profile for ${userName}:`, profileError);
      } else {
        const deleted = deletedProfiles ? deletedProfiles.length : 0;
      }
    }

    // 6. 関連するオーナー認証データも削除
    
    for (const userName of sampleUsers) {
      const { error: verificationError } = await supabase
        .from('owner_verifications')
        .delete()
        .eq('owner_name', userName);
        
      if (verificationError) {
        console.error(`❌ Error deleting verification for ${userName}:`, verificationError);
      } else {
      }
    }

    return { success: true, message: `サンプルデータを削除しました（${deletedCount}件のパーク）` };
  } catch (error) {
    console.error('❌ Sample data deletion failed:', error);
    return { success: false, message: `削除に失敗しました: ${(error as Error).message}` };
  }
};

export const checkRemainingData = async () => {
  try {
    // 正しいテーブル名を使用
    const { data: parks, error } = await supabase
      .from('dog_park_facilities')
      .select('id, name, owner_name, status, created_at')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Error checking remaining data:', error);
      return;
    }

    
    // 関連するプロフィールも確認
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, email, created_at')
      .order('created_at', { ascending: false });
    
    if (profileError) {
      console.error('❌ Error checking remaining profiles:', profileError);
    } else {
    }
    
    return { parks, profiles };
  } catch (error) {
    console.error('❌ Error checking remaining data:', error);
  }
};

// グローバルに利用可能にする（開発時のみ）
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).deleteSampleDogParks = deleteSampleDogParks;
  (window as any).checkRemainingData = checkRemainingData;
} 
