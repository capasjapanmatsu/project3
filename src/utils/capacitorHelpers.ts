import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Device, DeviceInfo } from '@capacitor/device';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Geolocation, Position } from '@capacitor/geolocation';
import { LocalNotifications } from '@capacitor/local-notifications';
import { ConnectionStatus, Network } from '@capacitor/network';
import { PushNotifications } from '@capacitor/push-notifications';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';

// カメラ機能
export const capturePhoto = async (): Promise<string | null> => {
  try {
    const image = await Camera.getPhoto({
      quality: 80,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Camera,
    });

    return image.dataUrl || null;
  } catch (error) {
    console.error('Camera capture error:', error);
    return null;
  }
};

export const selectFromGallery = async (): Promise<string | null> => {
  try {
    const image = await Camera.getPhoto({
      quality: 80,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Photos,
    });

    return image.dataUrl || null;
  } catch (error) {
    console.error('Gallery selection error:', error);
    return null;
  }
};

// 位置情報機能
export const getCurrentLocation = async (): Promise<Position | null> => {
  try {
    const coordinates = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 10000,
    });

    return coordinates;
  } catch (error) {
    console.error('Geolocation error:', error);
    return null;
  }
};

export const watchLocation = async (callback: (position: Position | null) => void): Promise<string> => {
  const watchId = await Geolocation.watchPosition(
    {
      enableHighAccuracy: true,
      timeout: 30000,
    },
    (position, err) => {
      if (err) {
        console.error('Location watch error:', err);
        callback(null);
      } else {
        callback(position);
      }
    }
  );

  return watchId;
};

export const clearLocationWatch = (watchId: string) => {
  Geolocation.clearWatch({ id: watchId });
};

// プッシュ通知機能
export const initializePushNotifications = async (): Promise<boolean> => {
  try {
    // 通知許可をリクエスト
    let permStatus = await PushNotifications.checkPermissions();

    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      console.warn('Push notification permission denied');
      return false;
    }

    // 通知を登録
    await PushNotifications.register();

    // イベントリスナーを設定
    PushNotifications.addListener('registration', (token) => {
      console.log('Push registration success, token: ' + token.value);
      // Supabaseにトークンを保存する処理をここに追加
    });

    PushNotifications.addListener('registrationError', (error) => {
      console.error('Push registration error: ', error);
    });

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push received: ', notification);
      // 受信時の処理をここに追加
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('Push action performed: ', notification);
      // タップ時の処理をここに追加
    });

    return true;
  } catch (error) {
    console.error('Push notification initialization error:', error);
    return false;
  }
};

// ローカル通知機能
export const scheduleLocalNotification = async (
  title: string,
  body: string,
  delay: number = 0
): Promise<boolean> => {
  try {
    const notification = {
      title,
      body,
      id: Date.now(),
      ...(delay > 0 && { schedule: { at: new Date(Date.now() + delay * 1000) } })
    };

    await LocalNotifications.schedule({
      notifications: [notification],
    });

    return true;
  } catch (error) {
    console.error('Local notification error:', error);
    return false;
  }
};

// デバイス情報取得
export const getDeviceInfo = async (): Promise<DeviceInfo | null> => {
  try {
    const info = await Device.getInfo();
    return info;
  } catch (error) {
    console.error('Device info error:', error);
    return null;
  }
};

// ネットワーク状態監視
export const getNetworkStatus = async (): Promise<ConnectionStatus | null> => {
  try {
    const status = await Network.getStatus();
    return status;
  } catch (error) {
    console.error('Network status error:', error);
    return null;
  }
};

export const watchNetworkStatus = (callback: (status: ConnectionStatus | null) => void) => {
  Network.addListener('networkStatusChange', (status) => {
    callback(status);
  });
};

// ファイルシステム操作
export const saveFile = async (
  fileName: string,
  data: string,
  directory: Directory = Directory.Documents
): Promise<boolean> => {
  try {
    await Filesystem.writeFile({
      path: fileName,
      data: data,
      directory: directory,
      encoding: Encoding.UTF8,
    });

    return true;
  } catch (error) {
    console.error('File save error:', error);
    return false;
  }
};

export const readFile = async (
  fileName: string,
  directory: Directory = Directory.Documents
): Promise<string | null> => {
  try {
    const result = await Filesystem.readFile({
      path: fileName,
      directory: directory,
      encoding: Encoding.UTF8,
    });

    return result.data as string;
  } catch (error) {
    console.error('File read error:', error);
    return null;
  }
};

// UI制御
export const setStatusBarStyle = async (style: Style = Style.Default) => {
  try {
    await StatusBar.setStyle({ style });
  } catch (error) {
    console.error('Status bar style error:', error);
  }
};

export const hideStatusBar = async () => {
  try {
    await StatusBar.hide();
  } catch (error) {
    console.error('Status bar hide error:', error);
  }
};

export const showStatusBar = async () => {
  try {
    await StatusBar.show();
  } catch (error) {
    console.error('Status bar show error:', error);
  }
};

export const hideSplashScreen = async () => {
  try {
    await SplashScreen.hide();
  } catch (error) {
    console.error('Splash screen hide error:', error);
  }
};

// プラットフォーム検知
export const isPlatform = (platform: 'web' | 'android' | 'ios'): boolean => {
  return window.Capacitor?.getPlatform() === platform;
};

export const isNative = (): boolean => {
  return window.Capacitor?.isNativePlatform() || false;
};

// 画像圧縮
export const compressImage = (
  file: File,
  maxWidth: number = 800,
  maxHeight: number = 600,
  quality: number = 0.8
): Promise<string> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const img = new Image();

    img.onload = () => {
      // アスペクト比を維持しながらリサイズ
      let { width, height } = img;
      
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      
      if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }

      canvas.width = width;
      canvas.height = height;

      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };

    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

// Capacitor型拡張（global）
declare global {
  interface Window {
    Capacitor: {
      getPlatform: () => string;
      isNativePlatform: () => boolean;
    };
  }
} 
