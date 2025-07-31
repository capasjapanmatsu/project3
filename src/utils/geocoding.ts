/**
 * 住所から緯度・経度を取得するジオコーディングユーティリティ
 */

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  formatted_address: string;
}

/**
 * Google Maps Geocoding APIを使用して住所から座標を取得
 * @param address - ジオコーディングする住所
 * @returns 緯度・経度・正規化住所
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  try {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      console.error('Google Maps APIキーが設定されていません');
      return null;
    }

    const encodedAddress = encodeURIComponent(address);
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}&region=jp&language=ja&components=country:JP`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }
    
    const data = await response.json() as any;
    
    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const result = data.results[0];
      const location = result.geometry?.location;
      
      if (location && typeof location.lat === 'number' && typeof location.lng === 'number') {
        return {
          latitude: location.lat,
          longitude: location.lng,
          formatted_address: result.formatted_address || address
        };
      }
    }
    
    console.error(`ジオコーディング失敗: ${address} - Status: ${data.status || 'UNKNOWN'}`);
    
    // エラーメッセージを詳細化
    if (data.status === 'ZERO_RESULTS') {
      console.error('該当する住所が見つかりませんでした');
    } else if (data.status === 'OVER_QUERY_LIMIT') {
      console.error('APIクエリ制限に達しました');
    } else if (data.status === 'REQUEST_DENIED') {
      console.error('APIリクエストが拒否されました（APIキーを確認してください）');
    } else if (data.status === 'INVALID_REQUEST') {
      console.error('無効なリクエストです（住所が空またはパラメータが不正）');
    }
    
    return null;
  } catch (error) {
    console.error(`ジオコーディングエラー: ${address}`, error);
    return null;
  }
}

/**
 * 住所の精度を向上させるためのフォーマット関数
 * @param address - 元の住所
 * @returns フォーマットされた住所
 */
export function formatAddressForGeocoding(address: string): string {
  // 日本の住所形式に最適化
  let formatted = address.trim();
  
  // 都道府県が省略されている場合の補完
  const prefectureRegex = /^(北海道|青森県|岩手県|宮城県|秋田県|山形県|福島県|茨城県|栃木県|群馬県|埼玉県|千葉県|東京都|神奈川県|新潟県|富山県|石川県|福井県|山梨県|長野県|岐阜県|静岡県|愛知県|三重県|滋賀県|京都府|大阪府|兵庫県|奈良県|和歌山県|鳥取県|島根県|岡山県|広島県|山口県|徳島県|香川県|愛媛県|高知県|福岡県|佐賀県|長崎県|熊本県|大分県|宮崎県|鹿児島県|沖縄県)/;
  
  if (!formatted.match(prefectureRegex)) {
    // 市区町村から都道府県を推測（簡易版）
    if (formatted.includes('熊本市')) {
      formatted = '熊本県' + formatted;
    }
    // 他の主要都市も追加可能
  }
  
  return formatted;
}

/**
 * 座標の精度を検証する
 * @param latitude - 緯度
 * @param longitude - 経度
 * @returns 日本国内の有効な座標かどうか
 */
export function validateCoordinates(latitude: number, longitude: number): boolean {
  // 日本の大まかな範囲をチェック
  const isValidLatitude = latitude >= 20 && latitude <= 46; // 沖縄〜北海道
  const isValidLongitude = longitude >= 123 && longitude <= 154; // 西端〜東端
  
  return isValidLatitude && isValidLongitude;
} 