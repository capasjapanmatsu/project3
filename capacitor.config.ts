import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dogparkjp.app2',
  appName: 'ドッグパークJP',
  webDir: 'dist',
  // Use HTTPS scheme for embedded server to avoid cleartext policy issues
  server: {
    androidScheme: 'http',
    iosScheme: 'http'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: true,
      backgroundColor: '#3b82f6',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      androidSpinnerStyle: 'large',
      iosSpinnerStyle: 'small',
      spinnerColor: '#ffffff',
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DEFAULT',
      backgroundColor: '#3b82f6',
      overlay: false,
    },
    Camera: {
      permissions: {
        camera: 'このアプリでは犬の写真を撮影するためにカメラへのアクセスが必要です。',
        photos: 'このアプリでは写真を保存するためにフォトライブラリへのアクセスが必要です。'
      }
    },
    Geolocation: {
      permissions: {
        location: 'このアプリでは近くのドッグパークを見つけるために位置情報へのアクセスが必要です。'
      }
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#3b82f6',
      sound: 'beep.wav'
    },
    Keyboard: {
      resize: 'body',
      style: 'dark',
      resizeOnFullScreen: true
    }
  },
  android: {
    buildOptions: {
      keystorePath: process.env.ANDROID_KEYSTORE_PATH || 'android/keystores/release.keystore',
      keystorePassword: process.env.ANDROID_KEYSTORE_PASSWORD || 'CHANGE_ME',
      keystoreAlias: process.env.ANDROID_KEY_ALIAS || 'dogparkjp',
      keystoreAliasPassword: process.env.ANDROID_KEY_ALIAS_PASSWORD || 'CHANGE_ME',
      releaseType: 'AAB'
    },
    permissions: [
      'android.permission.INTERNET',
      'android.permission.ACCESS_NETWORK_STATE',
      'android.permission.ACCESS_WIFI_STATE',
      'android.permission.CAMERA',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.VIBRATE',
      'android.permission.WAKE_LOCK',
      'com.google.android.c2dm.permission.RECEIVE',
      'android.permission.RECEIVE_BOOT_COMPLETED'
    ]
  },
  ios: {
    scheme: 'ドッグパークJP',
    contentInset: 'automatic'
  }
};

export default config;
