/**
 * GPS位置情報と距離計算のユーティリティ関数
 */

export interface Location {
  latitude: number;
  longitude: number;
}

export class LocationError extends Error {
  code: number;
  
  constructor(message: string, code: number) {
    super(message);
    this.code = code;
    this.name = 'LocationError';
  }
}

/**
 * ユーザーの現在位置を取得
 */
export const getCurrentLocation = (): Promise<Location> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new LocationError('このブラウザは位置情報をサポートしていません', 0));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      },
      (error) => {
        let message = '位置情報の取得に失敗しました';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = '位置情報の使用が拒否されました';
            break;
          case error.POSITION_UNAVAILABLE:
            message = '位置情報が利用できません';
            break;
          case error.TIMEOUT:
            message = '位置情報の取得がタイムアウトしました';
            break;
        }
        reject(new LocationError(message, error.code));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000 // 1分間キャッシュ
      }
    );
  });
};

/**
 * 2点間の距離を計算（ハバサイン公式）
 * @param lat1 地点1の緯度
 * @param lon1 地点1の経度
 * @param lat2 地点2の緯度
 * @param lon2 地点2の経度
 * @returns 距離（km）
 */
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // 地球の半径（km）
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 100) / 100; // 小数点第2位まで
};

/**
 * 度数を ラジアンに変換
 */
const toRadians = (degrees: number): number => {
  return degrees * (Math.PI / 180);
};

/**
 * 距離を人間が読みやすい形式にフォーマット
 */
export const formatDistance = (distance: number): string => {
  if (distance < 1) {
    return `${Math.round(distance * 1000)}m`;
  } else if (distance < 10) {
    return `${distance.toFixed(1)}km`;
  } else {
    return `${Math.round(distance)}km`;
  }
};

/**
 * 施設リストを距離順にソート
 */
export const sortByDistance = <T extends { latitude?: number; longitude?: number }>(
  facilities: T[],
  userLocation: Location
): Array<T & { distance: number }> => {
  return facilities
    .filter(facility => facility.latitude && facility.longitude)
    .map(facility => ({
      ...facility,
      distance: calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        facility.latitude!,
        facility.longitude!
      )
    }))
    .sort((a, b) => a.distance - b.distance);
};

/**
 * デフォルトの位置（東京駅）
 */
export const DEFAULT_LOCATION: Location = {
  latitude: 35.6812,
  longitude: 139.7671
}; 