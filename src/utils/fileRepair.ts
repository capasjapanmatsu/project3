// ファイル修復とダミーファイル作成
import { supabase } from './supabase';

/**
 * 不足しているワクチン画像ファイルを修復
 */
export const repairMissingVaccineFiles = async () => {
  
  try {
    // 1. pending状態のワクチン証明書を取得
    const { data: vaccines, error: fetchError } = await supabase
      .from('vaccine_certifications')
      .select('*')
      .eq('status', 'pending');
    
    if (fetchError) {
      console.error('❌ Fetch vaccines error:', fetchError);
      return { success: false, error: fetchError.message };
    }
    
    if (!vaccines || vaccines.length === 0) {
      return { success: true, message: 'No vaccines to repair' };
    }
    
    let repairedCount = 0;
    
    // 2. 各ワクチン証明書の画像ファイルを確認・修復
    for (const vaccine of vaccines) {
      
      // 狂犬病ワクチン画像の修復
      if (vaccine.rabies_vaccine_image) {
        const rabiesRepaired = await repairSingleImageFile(
          vaccine.rabies_vaccine_image,
          'rabies',
          vaccine.id
        );
        if (rabiesRepaired) repairedCount++;
      }
      
      // 混合ワクチン画像の修復
      if (vaccine.combo_vaccine_image) {
        const comboRepaired = await repairSingleImageFile(
          vaccine.combo_vaccine_image,
          'combo',
          vaccine.id
        );
        if (comboRepaired) repairedCount++;
      }
    }
    
    
    return {
      success: true,
      repairedCount,
      totalVaccines: vaccines.length
    };
    
  } catch (error) {
    console.error('❌ Repair missing files error:', error);
    return { success: false, error: (error as Error).message };
  }
};

/**
 * 単一の画像ファイルを修復
 */
async function repairSingleImageFile(
  fileName: string,
  type: 'rabies' | 'combo',
  vaccineId: string
): Promise<boolean> {
  try {
    
    // 1. ファイルが存在するかチェック
    const { data: existingFiles, error: listError } = await supabase.storage
      .from('vaccine-certs')
      .list('temp', { search: fileName });
    
    if (!listError && existingFiles && existingFiles.length > 0) {
      return false; // 修復不要
    }
    
    // 2. ダミー画像ファイルを作成
    const dummyImageFile = createDummyImageFile(fileName, type);
    
    // 3. ダミーファイルをアップロード
    const { error: uploadError } = await supabase.storage
      .from('vaccine-certs')
      .upload(`temp/${fileName}`, dummyImageFile, {
        cacheControl: '3600',
        upsert: true
      });
    
    if (uploadError) {
      console.error(`❌ Upload error for ${fileName}:`, uploadError);
      return false;
    }
    
    return true;
    
  } catch (error) {
    console.error(`❌ Repair single file error for ${fileName}:`, error);
    return false;
  }
}

/**
 * ダミー画像ファイルを作成
 */
function createDummyImageFile(fileName: string, type: 'rabies' | 'combo'): File {
  // サンプル画像のSVGデータ（実際の証明書風）
  const svgContent = `
    <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f8f9fa" stroke="#dee2e6" stroke-width="2"/>
      <rect x="20" y="20" width="360" height="260" fill="#ffffff" stroke="#6c757d" stroke-width="1"/>
      <text x="200" y="50" font-family="Arial" font-size="16" font-weight="bold" fill="#212529" text-anchor="middle">
        ${type === 'rabies' ? '狂犬病予防注射済証' : '混合ワクチン接種証明書'}
      </text>
      <line x1="40" y1="70" x2="360" y2="70" stroke="#dee2e6" stroke-width="1"/>
      <text x="50" y="100" font-family="Arial" font-size="12" fill="#495057">犬の名前: サンプル犬</text>
      <text x="50" y="130" font-family="Arial" font-size="12" fill="#495057">接種日: 2025年7月</text>
      <text x="50" y="160" font-family="Arial" font-size="12" fill="#495057">動物病院: サンプル動物病院</text>
      <text x="50" y="190" font-family="Arial" font-size="12" fill="#495057">獣医師名: サンプル獣医師</text>
      <rect x="50" y="220" width="300" height="40" fill="#e9ecef" stroke="#6c757d" stroke-width="1" stroke-dasharray="5,5"/>
      <text x="200" y="245" font-family="Arial" font-size="14" fill="#6c757d" text-anchor="middle">
        ダミー画像（テスト用）
      </text>
    </svg>
  `;
  
  // SVGをBlobに変換
  const blob = new Blob([svgContent], { type: 'image/svg+xml' });
  
  // FileオブジェクトとしてPNG拡張子で返す
  return new File([blob], fileName, { type: 'image/png' });
}

/**
 * 全てのワクチン証明書の画像パスを正規化
 */
export const normalizeVaccineImagePaths = async () => {
  
  try {
    const { data: vaccines, error: fetchError } = await supabase
      .from('vaccine_certifications')
      .select('*')
      .eq('status', 'pending');
    
    if (fetchError) {
      console.error('❌ Fetch error:', fetchError);
      return { success: false, error: fetchError.message };
    }
    
    let updatedCount = 0;
    
    for (const vaccine of vaccines || []) {
      let updateData: any = {};
      let needsUpdate = false;
      
      // 狂犬病ワクチン画像パスの正規化
      if (vaccine.rabies_vaccine_image && !vaccine.rabies_vaccine_image.startsWith('temp/')) {
        updateData.rabies_vaccine_image = `temp/${vaccine.rabies_vaccine_image}`;
        needsUpdate = true;
      }
      
      // 混合ワクチン画像パスの正規化
      if (vaccine.combo_vaccine_image && !vaccine.combo_vaccine_image.startsWith('temp/')) {
        updateData.combo_vaccine_image = `temp/${vaccine.combo_vaccine_image}`;
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        const { error: updateError } = await supabase
          .from('vaccine_certifications')
          .update(updateData)
          .eq('id', vaccine.id);
        
        if (updateError) {
          console.error(`❌ Update error for vaccine ${vaccine.id}:`, updateError);
        } else {
          updatedCount++;
        }
      }
    }
    
    
    return { success: true, updatedCount };
    
  } catch (error) {
    console.error('❌ Normalize paths error:', error);
    return { success: false, error: (error as Error).message };
  }
}; 
