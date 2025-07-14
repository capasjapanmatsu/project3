// ストレージ関連のユーティリティ関数

import { supabase } from './supabase';

/**
 * ワクチン証明書画像のURLを生成
 */
export const getVaccineImageUrl = (imagePath: string | null): string | null => {
  if (!imagePath) return null;
  
  // 既にhttp/httpsで始まる場合はそのまま使用
  if (imagePath.startsWith('http')) {
    return imagePath;
  }
  
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  
  // ファイル名のみの場合は適切なパスを構築
  let finalPath = imagePath;
  
  // pending_upload_ プレフィックスがある場合は temp/ フォルダを確認
  if (imagePath.includes('pending_upload_')) {
    // ファイル名のみを抽出
    const fileName = imagePath.split('/').pop() || imagePath;
    finalPath = `temp/${fileName}`;
  } else if (!imagePath.startsWith('temp/') && !imagePath.startsWith('/')) {
    // temp/ プレフィックスがない場合は追加
    finalPath = `temp/${imagePath}`;
  }
  
  // vaccine-certsバケットの公開URLを生成
  const fullUrl = `${supabaseUrl}/storage/v1/object/public/vaccine-certs/${finalPath}`;
  
  return fullUrl;
};

/**
 * vaccine-certsバケットをpublicに設定
 */
export const ensureVaccineBucketIsPublic = async (): Promise<boolean> => {
  try {
    // バケットをpublicに設定
    const { error } = await supabase.storage.updateBucket('vaccine-certs', {
      public: true
    });
    
    if (error) {
      console.warn('Failed to make vaccine-certs bucket public:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.warn('Error updating bucket settings:', error);
    return false;
  }
};

/**
 * 画像URLのアクセス可能性をテスト
 */
export const testImageUrl = async (url: string | null): Promise<string> => {
  if (!url) return '❌ URL is null';
  
  try {
    const response = await fetch(url, { method: 'HEAD' });
    if (response.ok) {
      return `✅ Image accessible (${response.status})`;
    } else {
      return `❌ HTTP ${response.status}: ${response.statusText}`;
    }
  } catch (error) {
    return `❌ Network error: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
};

/**
 * 画像タイプのラベルを取得
 */
export const getImageTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    overview: '施設全景',
    entrance: '入口',
    large_dog_area: '大型犬エリア',
    small_dog_area: '小型犬エリア',
    private_booth: 'プライベートブース',
    parking: '駐車場',
    shower: 'シャワー設備',
    restroom: 'トイレ',
    agility: 'アジリティ設備',
    rest_area: '休憩スペース',
    water_station: '給水設備'
  };
  
  return labels[type] || type;
};

/**
 * 承認状態の表示情報を取得
 */
export const getApprovalStatus = (isApproved: boolean | null) => {
  // Import icons dynamically to avoid circular dependencies
  const CheckCircle = () => '✅';
  const X = () => '❌';
  const Clock = () => '⏰';
  
  if (isApproved === true) {
    return { icon: CheckCircle, color: 'text-green-600', label: '承認済み' };
  } else if (isApproved === false) {
    return { icon: X, color: 'text-red-600', label: '却下' };
  } else {
    return { icon: Clock, color: 'text-yellow-600', label: '審査中' };
  }
}; 