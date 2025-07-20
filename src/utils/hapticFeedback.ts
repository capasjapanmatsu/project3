// ハプティックフィードバック（振動）の種類
export type HapticType = 
  | 'success'      // 成功時（決済完了、PIN発行成功など）
  | 'warning'      // 警告時
  | 'error'        // エラー時
  | 'light'        // 軽いタップ
  | 'medium'       // 中程度のタップ
  | 'heavy'        // 重いタップ
  | 'selection'    // 選択時
  | 'notification' // 通知時
  | 'payment'      // 決済専用パターン
  | 'pin-success'; // PIN発行専用パターン

// バイブレーションパターンの定義
const VIBRATION_PATTERNS = {
  success: [100, 50, 100],           // 短い-短い間隔-短い
  warning: [200],                    // 1回中程度
  error: [50, 50, 50, 50, 50],      // 短い連続
  light: [25],                       // 非常に短い
  medium: [50],                      // 短い
  heavy: [100],                      // 中程度
  selection: [10],                   // 非常に軽い
  notification: [100, 100, 100],     // 3回パルス
  payment: [200, 100, 200, 100, 200], // 決済完了専用リズム
  'pin-success': [100, 50, 100, 50, 200] // PIN発行専用リズム
} as const;

// Capacitorプラグインのキャッシュ
let capacitorPlugins: {
  Haptics?: any;
  ImpactStyle?: any;
  Capacitor?: any;
} = {};

/**
 * Capacitorプラグインを動的に読み込む
 */
const loadCapacitorPlugins = async () => {
  if (capacitorPlugins.Capacitor) {
    return capacitorPlugins; // 既に読み込み済み
  }

  try {
    const [hapticModule, coreModule] = await Promise.all([
      import('@capacitor/haptics'),
      import('@capacitor/core')
    ]);
    
    capacitorPlugins = {
      Haptics: hapticModule.Haptics,
      ImpactStyle: hapticModule.ImpactStyle,
      Capacitor: coreModule.Capacitor
    };
    
  } catch (error) {
    console.warn('⚠️ Capacitor Haptics not available, using Web API only');
    capacitorPlugins = {}; // エラー時は空オブジェクト
  }

  return capacitorPlugins;
};

/**
 * Capacitorがネイティブプラットフォームで動作しているかチェック
 */
const isNativePlatform = async (): Promise<boolean> => {
  try {
    const plugins = await loadCapacitorPlugins();
    return plugins.Capacitor && 
           typeof plugins.Capacitor.isNativePlatform === 'function' && 
           plugins.Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};

/**
 * バイブレーション機能の実行
 * ネイティブアプリ環境ではCapacitor Haptics、PWAではWeb Vibration APIを使用
 */
export const triggerHapticFeedback = async (type: HapticType): Promise<void> => {
  try {
    // デバッグログ
    
    // Capacitorプラグインを読み込み
    const plugins = await loadCapacitorPlugins();
    const isNative = await isNativePlatform();
    
    // ネイティブアプリ環境（Capacitor）でのハプティックフィードバック
    if (isNative && plugins.Haptics && plugins.ImpactStyle) {
      
      switch (type) {
        case 'success':
        case 'payment':
        case 'pin-success':
          await plugins.Haptics.impact({ style: plugins.ImpactStyle.Medium });
          await new Promise(resolve => setTimeout(resolve, 100));
          await plugins.Haptics.impact({ style: plugins.ImpactStyle.Light });
          break;
          
        case 'error':
          await plugins.Haptics.impact({ style: plugins.ImpactStyle.Heavy });
          break;
          
        case 'warning':
          await plugins.Haptics.impact({ style: plugins.ImpactStyle.Medium });
          break;
          
        case 'light':
        case 'selection':
          await plugins.Haptics.impact({ style: plugins.ImpactStyle.Light });
          break;
          
        case 'medium':
        case 'notification':
          await plugins.Haptics.impact({ style: plugins.ImpactStyle.Medium });
          break;
          
        case 'heavy':
          await plugins.Haptics.impact({ style: plugins.ImpactStyle.Heavy });
          break;
          
        default:
          await plugins.Haptics.impact({ style: plugins.ImpactStyle.Light });
      }
      
      return;
    }
    
    // PWA/ブラウザ環境でのWeb Vibration API
    if ('vibrate' in navigator) {
      
      const pattern = VIBRATION_PATTERNS[type];
      const success = navigator.vibrate(pattern);
      
      if (success) {
      } else {
        console.warn('⚠️ Web vibration failed');
      }
    } else {
      console.warn('⚠️ Vibration not supported in this environment');
    }
    
  } catch (error) {
    console.error('❌ Haptic feedback error:', error);
  }
};

/**
 * 決済完了時の特別なハプティックフィードバック
 */
export const triggerPaymentSuccessHaptic = async (): Promise<void> => {
  
  try {
    const plugins = await loadCapacitorPlugins();
    const isNative = await isNativePlatform();
    
    if (isNative && plugins.Haptics && plugins.ImpactStyle) {
      // ネイティブ：成功の3段階パターン
      await plugins.Haptics.impact({ style: plugins.ImpactStyle.Light });
      await new Promise(resolve => setTimeout(resolve, 100));
      await plugins.Haptics.impact({ style: plugins.ImpactStyle.Medium });
      await new Promise(resolve => setTimeout(resolve, 100));
      await plugins.Haptics.impact({ style: plugins.ImpactStyle.Heavy });
      
    } else if ('vibrate' in navigator) {
      // PWA：カスタムパターン
      navigator.vibrate([100, 50, 150, 50, 200]);
    }
  } catch (error) {
    console.error('❌ Payment success haptic error:', error);
  }
};

/**
 * PIN発行時の特別なハプティックフィードバック
 */
export const triggerPinGenerationHaptic = async (): Promise<void> => {
  
  try {
    const plugins = await loadCapacitorPlugins();
    const isNative = await isNativePlatform();
    
    if (isNative && plugins.Haptics && plugins.ImpactStyle) {
      // ネイティブ：PINコード生成の2段階パターン
      await plugins.Haptics.impact({ style: plugins.ImpactStyle.Medium });
      await new Promise(resolve => setTimeout(resolve, 80));
      await plugins.Haptics.impact({ style: plugins.ImpactStyle.Light });
      await new Promise(resolve => setTimeout(resolve, 80));
      await plugins.Haptics.impact({ style: plugins.ImpactStyle.Medium });
      
    } else if ('vibrate' in navigator) {
      // PWA：カスタムPINパターン
      navigator.vibrate([80, 40, 80, 40, 120]);
    }
  } catch (error) {
    console.error('❌ PIN generation haptic error:', error);
  }
};

/**
 * エラー時の強いハプティックフィードバック
 */
export const triggerErrorHaptic = async (): Promise<void> => {
  try {
    const plugins = await loadCapacitorPlugins();
    const isNative = await isNativePlatform();
    
    if (isNative && plugins.Haptics && plugins.ImpactStyle) {
      // ネイティブ：強いエラーパターン
      await plugins.Haptics.impact({ style: plugins.ImpactStyle.Heavy });
      await new Promise(resolve => setTimeout(resolve, 100));
      await plugins.Haptics.impact({ style: plugins.ImpactStyle.Heavy });
      
    } else if ('vibrate' in navigator) {
      // PWA：エラーパターン
      navigator.vibrate([200, 100, 200]);
    }
  } catch (error) {
    console.error('❌ Error haptic feedback failed:', error);
  }
};

/**
 * 通知時のソフトなハプティックフィードバック
 */
export const triggerNotificationHaptic = async (): Promise<void> => {
  try {
    const plugins = await loadCapacitorPlugins();
    const isNative = await isNativePlatform();
    
    if (isNative && plugins.Haptics && plugins.ImpactStyle) {
      await plugins.Haptics.impact({ style: plugins.ImpactStyle.Light });
    } else if ('vibrate' in navigator) {
      navigator.vibrate([50]);
    }
  } catch (error) {
    console.error('❌ Notification haptic feedback failed:', error);
  }
};

/**
 * デバイスがハプティックフィードバックをサポートしているかチェック
 */
export const isHapticFeedbackSupported = async (): Promise<boolean> => {
  try {
    const isNative = await isNativePlatform();
    return isNative || 'vibrate' in navigator;
  } catch {
    return 'vibrate' in navigator;
  }
};

/**
 * ハプティックフィードバックが有効かどうかの設定を確認
 * （将来的にユーザー設定で無効化できるように）
 */
export const isHapticFeedbackEnabled = (): boolean => {
  // LocalStorageから設定を読み取り（デフォルト：有効）
  try {
    const setting = localStorage.getItem('haptic-feedback-enabled');
    return setting === null ? true : setting === 'true';
  } catch {
    return true; // エラー時はデフォルトで有効
  }
};

/**
 * ハプティックフィードバックの有効/無効を設定
 */
export const setHapticFeedbackEnabled = (enabled: boolean): void => {
  try {
    localStorage.setItem('haptic-feedback-enabled', enabled.toString());
  } catch (error) {
    console.error('❌ Failed to save haptic feedback setting:', error);
  }
};

// デフォルトエクスポート
export default {
  triggerHapticFeedback,
  triggerPaymentSuccessHaptic,
  triggerPinGenerationHaptic,
  triggerErrorHaptic,
  triggerNotificationHaptic,
  isHapticFeedbackSupported,
  isHapticFeedbackEnabled,
  setHapticFeedbackEnabled
}; 
