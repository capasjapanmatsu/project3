/**
 * PWA Service Worker 登録とユーティリティ機能
 * ドッグパークJP プログレッシブ・ウェブ・アプリ対応
 */

export interface PWAInstallPrompt {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface PWAUpdateAvailable {
  isAvailable: boolean;
  registration?: ServiceWorkerRegistration;
}

class PWAManager {
  private deferredPrompt: PWAInstallPrompt | null = null;
  private registration: ServiceWorkerRegistration | null = null;
  private updateAvailable = false;

  constructor() {
    this.init();
  }

  /**
   * PWA機能の初期化
   */
  private async init(): Promise<void> {
    if (!this.isSupported()) {
      console.warn('⚠️ PWA: このブラウザはService Workerをサポートしていません');
      return;
    }

    await this.registerServiceWorker();
    this.setupInstallPrompt();
    this.setupUpdateDetection();
    this.setupConnectionMonitoring();
    this.setupBeforeInstallPrompt();
  }

  /**
   * ブラウザサポート確認
   */
  private isSupported(): boolean {
    return 'serviceWorker' in navigator && 'caches' in window;
  }

  /**
   * Service Worker の登録
   */
  private async registerServiceWorker(): Promise<void> {
    try {
      
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none'
      });


      // Service Worker の状態を監視
      this.registration.addEventListener('updatefound', () => {
        this.handleUpdateFound();
      });

      // アクティブなService Worker がある場合の処理
      if (this.registration.active) {
      }

    } catch (error) {
      console.error('❌ PWA: Service Worker登録失敗', error);
      
      // ユーザーに通知
      this.showNotification(
        'PWA機能の初期化に失敗しました。一部機能が制限される場合があります。',
        'warning'
      );
    }
  }

  /**
   * Service Worker 更新検出の処理
   */
  private handleUpdateFound(): void {
    if (!this.registration) return;

    const newWorker = this.registration.installing;
    if (!newWorker) return;


    newWorker.addEventListener('statechange', () => {
      if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
        this.updateAvailable = true;
        this.showUpdateNotification();
      }
    });
  }

  /**
   * アプリ更新通知の表示
   */
  private showUpdateNotification(): void {
    const updateMessage = document.createElement('div');
    updateMessage.className = 'pwa-update-notification';
    updateMessage.innerHTML = `
      <div class="pwa-update-content">
        <div class="pwa-update-icon">🆕</div>
        <div class="pwa-update-text">
          <h4>アプリの新しいバージョンが利用可能です</h4>
          <p>最新の機能とバグ修正を取得するために更新してください。</p>
        </div>
        <div class="pwa-update-actions">
          <button id="pwa-update-btn" class="pwa-btn pwa-btn-primary">
            更新する
          </button>
          <button id="pwa-dismiss-btn" class="pwa-btn pwa-btn-secondary">
            後で
          </button>
        </div>
      </div>
    `;

    // スタイルを追加
    this.addUpdateNotificationStyles();

    document.body.appendChild(updateMessage);

    // イベントリスナーを追加
    document.getElementById('pwa-update-btn')?.addEventListener('click', () => {
      this.applyUpdate();
      updateMessage.remove();
    });

    document.getElementById('pwa-dismiss-btn')?.addEventListener('click', () => {
      updateMessage.remove();
    });

    // 15秒後に自動で閉じる
    setTimeout(() => {
      if (document.body.contains(updateMessage)) {
        updateMessage.remove();
      }
    }, 15000);
  }

  /**
   * 更新通知のスタイルを追加
   */
  private addUpdateNotificationStyles(): void {
    if (document.getElementById('pwa-update-styles')) return;

    const style = document.createElement('style');
    style.id = 'pwa-update-styles';
    style.textContent = `
      .pwa-update-notification {
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        border-radius: 12px;
        padding: 20px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        z-index: 10000;
        max-width: 380px;
        border-left: 4px solid #3B82F6;
        animation: slideInRight 0.3s ease-out;
      }
      
      .pwa-update-content {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      
      .pwa-update-icon {
        font-size: 24px;
        text-align: center;
      }
      
      .pwa-update-text h4 {
        margin: 0 0 8px 0;
        color: #1F2937;
        font-size: 16px;
        font-weight: 600;
      }
      
      .pwa-update-text p {
        margin: 0;
        color: #6B7280;
        font-size: 14px;
        line-height: 1.4;
      }
      
      .pwa-update-actions {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
      }
      
      .pwa-btn {
        padding: 8px 16px;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      .pwa-btn-primary {
        background: #3B82F6;
        color: white;
      }
      
      .pwa-btn-primary:hover {
        background: #2563EB;
        transform: translateY(-1px);
      }
      
      .pwa-btn-secondary {
        background: #F3F4F6;
        color: #6B7280;
      }
      
      .pwa-btn-secondary:hover {
        background: #E5E7EB;
      }
      
      @keyframes slideInRight {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      
      @media (max-width: 480px) {
        .pwa-update-notification {
          top: 10px;
          right: 10px;
          left: 10px;
          max-width: none;
        }
      }
    `;

    document.head.appendChild(style);
  }

  /**
   * アプリの更新を適用
   */
  private applyUpdate(): void {
    if (!this.registration || !this.registration.waiting) return;


    // 新しいService Worker にメッセージを送信
    this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });

    // ページをリロード
    window.location.reload();
  }

  /**
   * インストールプロンプトのセットアップ
   */
  private setupBeforeInstallPrompt(): void {
    window.addEventListener('beforeinstallprompt', (e) => {
      
      // デフォルトの表示を防ぐ
      e.preventDefault();
      
      // プロンプトを保存
      this.deferredPrompt = e as unknown as PWAInstallPrompt;
      
      // インストールバナーを表示
      this.showInstallBanner();
    });
  }

  /**
   * インストールバナーの表示
   */
  private showInstallBanner(): void {
    // 既にインストール済みかチェック
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return;
    }

    // バナーが既に表示されているかチェック
    if (document.getElementById('pwa-install-banner')) {
      return;
    }

    const banner = document.createElement('div');
    banner.id = 'pwa-install-banner';
    banner.className = 'pwa-install-banner';
    banner.innerHTML = `
      <div class="pwa-install-content">
        <div class="pwa-install-icon">🐕</div>
        <div class="pwa-install-text">
          <h4>ドッグパークJPをインストール</h4>
          <p>ホーム画面に追加して、より快適にご利用ください</p>
        </div>
        <div class="pwa-install-actions">
          <button id="pwa-install-btn" class="pwa-btn pwa-btn-primary">
            インストール
          </button>
          <button id="pwa-install-close" class="pwa-btn pwa-btn-secondary">
            ×
          </button>
        </div>
      </div>
    `;

    // バナーのスタイルを追加
    this.addInstallBannerStyles();

    document.body.appendChild(banner);

    // イベントリスナーを追加
    document.getElementById('pwa-install-btn')?.addEventListener('click', () => {
      this.promptInstall();
    });

    document.getElementById('pwa-install-close')?.addEventListener('click', () => {
      banner.remove();
      // 24時間後まで再表示しない
      localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    });

    // 前回却下から24時間経過している場合のみ表示
    const lastDismissed = localStorage.getItem('pwa-install-dismissed');
    if (lastDismissed) {
      const hoursPassed = (Date.now() - parseInt(lastDismissed)) / (1000 * 60 * 60);
      if (hoursPassed < 24) {
        banner.remove();
        return;
      }
    }
  }

  /**
   * インストールバナーのスタイルを追加
   */
  private addInstallBannerStyles(): void {
    if (document.getElementById('pwa-install-styles')) return;

    const style = document.createElement('style');
    style.id = 'pwa-install-styles';
    style.textContent = `
      .pwa-install-banner {
        position: fixed;
        bottom: 20px;
        left: 20px;
        right: 20px;
        background: linear-gradient(135deg, #3B82F6, #1D4ED8);
        color: white;
        border-radius: 12px;
        padding: 16px 20px;
        box-shadow: 0 10px 30px rgba(59, 130, 246, 0.3);
        z-index: 9999;
        animation: slideInUp 0.3s ease-out;
      }
      
      .pwa-install-content {
        display: flex;
        align-items: center;
        gap: 16px;
      }
      
      .pwa-install-icon {
        font-size: 32px;
        flex-shrink: 0;
      }
      
      .pwa-install-text {
        flex: 1;
      }
      
      .pwa-install-text h4 {
        margin: 0 0 4px 0;
        font-size: 16px;
        font-weight: 600;
      }
      
      .pwa-install-text p {
        margin: 0;
        font-size: 14px;
        opacity: 0.9;
        line-height: 1.3;
      }
      
      .pwa-install-actions {
        display: flex;
        gap: 8px;
        flex-shrink: 0;
      }
      
      .pwa-install-banner .pwa-btn {
        padding: 8px 16px;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      .pwa-install-banner .pwa-btn-primary {
        background: rgba(255, 255, 255, 0.2);
        color: white;
        backdrop-filter: blur(10px);
      }
      
      .pwa-install-banner .pwa-btn-primary:hover {
        background: rgba(255, 255, 255, 0.3);
        transform: translateY(-1px);
      }
      
      .pwa-install-banner .pwa-btn-secondary {
        background: rgba(255, 255, 255, 0.1);
        color: white;
        width: 32px;
        height: 32px;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .pwa-install-banner .pwa-btn-secondary:hover {
        background: rgba(255, 255, 255, 0.2);
      }
      
      @keyframes slideInUp {
        from {
          transform: translateY(100%);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
      
      @media (max-width: 480px) {
        .pwa-install-banner {
          bottom: 10px;
          left: 10px;
          right: 10px;
          padding: 12px 16px;
        }
        
        .pwa-install-content {
          gap: 12px;
        }
        
        .pwa-install-icon {
          font-size: 24px;
        }
        
        .pwa-install-text h4 {
          font-size: 14px;
        }
        
        .pwa-install-text p {
          font-size: 12px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  /**
   * インストールプロンプトの実行
   */
  public async promptInstall(): Promise<boolean> {
    if (!this.deferredPrompt) {
      console.warn('⚠️ PWA: インストールプロンプトが利用できません');
      return false;
    }

    try {
      
      // プロンプトを表示
      await this.deferredPrompt.prompt();
      
      // ユーザーの選択を待つ
      const choiceResult = await this.deferredPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        this.showNotification('アプリがインストールされました！', 'success');
      } else {
      }
      
      // プロンプトをクリア
      this.deferredPrompt = null;
      
      // バナーを削除
      document.getElementById('pwa-install-banner')?.remove();
      
      return choiceResult.outcome === 'accepted';
      
    } catch (error) {
      console.error('❌ PWA: インストールプロンプトエラー', error);
      return false;
    }
  }

  /**
   * インストールプロンプトのセットアップ
   */
  private setupInstallPrompt(): void {
    // アプリがインストールされた時の処理
    window.addEventListener('appinstalled', () => {
      this.showNotification('ドッグパークJPがインストールされました！', 'success');
      
      // インストールバナーを削除
      document.getElementById('pwa-install-banner')?.remove();
      
      // アナリティクスイベントを送信（必要に応じて）
      this.trackEvent('pwa_installed');
    });
  }

  /**
   * 更新検出のセットアップ
   */
  private setupUpdateDetection(): void {
    // ページの可視性変更時にアップデートをチェック
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.registration) {
        this.registration.update();
      }
    });

    // 定期的にアップデートをチェック（1時間ごと）
    setInterval(() => {
      if (this.registration) {
        this.registration.update();
      }
    }, 60 * 60 * 1000);
  }

  /**
   * 接続状態の監視
   */
  private setupConnectionMonitoring(): void {
    const updateOnlineStatus = () => {
      const isOnline = navigator.onLine;
      
      if (isOnline) {
        this.showNotification('インターネット接続が復帰しました', 'success');
        
        // Service Worker の更新をチェック
        if (this.registration) {
          this.registration.update();
        }
      } else {
        this.showNotification('オフラインモードで動作しています', 'info');
      }
      
      // カスタムイベントを発火
      window.dispatchEvent(new CustomEvent('connectionchange', {
        detail: { isOnline }
      }));
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
  }

  /**
   * 通知の表示
   */
  private showNotification(message: string, type: 'success' | 'warning' | 'error' | 'info' = 'info'): void {
    // 既存の通知があれば削除
    document.querySelectorAll('.pwa-notification').forEach(el => el.remove());

    const notification = document.createElement('div');
    notification.className = `pwa-notification pwa-notification-${type}`;
    notification.innerHTML = `
      <div class="pwa-notification-content">
        <span class="pwa-notification-icon">${this.getNotificationIcon(type)}</span>
        <span class="pwa-notification-message">${message}</span>
        <button class="pwa-notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
    `;

    // 通知のスタイルを追加
    this.addNotificationStyles();

    document.body.appendChild(notification);

    // 5秒後に自動で閉じる
    setTimeout(() => {
      if (document.body.contains(notification)) {
        notification.remove();
      }
    }, 5000);
  }

  /**
   * 通知アイコンの取得
   */
  private getNotificationIcon(type: string): string {
    const icons = {
      success: '✅',
      warning: '⚠️',
      error: '❌',
      info: 'ℹ️'
    };
    return icons[type as keyof typeof icons] || icons.info;
  }

  /**
   * 通知スタイルの追加
   */
  private addNotificationStyles(): void {
    if (document.getElementById('pwa-notification-styles')) return;

    const style = document.createElement('style');
    style.id = 'pwa-notification-styles';
    style.textContent = `
      .pwa-notification {
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        border-radius: 8px;
        padding: 12px 16px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 10001;
        max-width: 350px;
        animation: slideInRight 0.3s ease-out;
      }
      
      .pwa-notification-content {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .pwa-notification-message {
        flex: 1;
        font-size: 14px;
        line-height: 1.4;
      }
      
      .pwa-notification-close {
        background: none;
        border: none;
        font-size: 16px;
        cursor: pointer;
        padding: 0;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #6B7280;
      }
      
      .pwa-notification-close:hover {
        color: #374151;
      }
      
      .pwa-notification-success {
        border-left: 4px solid #10B981;
      }
      
      .pwa-notification-warning {
        border-left: 4px solid #F59E0B;
      }
      
      .pwa-notification-error {
        border-left: 4px solid #EF4444;
      }
      
      .pwa-notification-info {
        border-left: 4px solid #3B82F6;
      }
      
      @media (max-width: 480px) {
        .pwa-notification {
          top: 10px;
          right: 10px;
          left: 10px;
          max-width: none;
        }
      }
    `;

    document.head.appendChild(style);
  }

  /**
   * キャッシュのクリア（開発用）
   */
  public async clearCache(): Promise<void> {
    try {
      
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      
      // Service Worker にもクリア指示を送信
      if (this.registration && this.registration.active) {
        this.registration.active.postMessage({ type: 'CACHE_CLEAR' });
      }
      
      this.showNotification('キャッシュがクリアされました', 'success');
      
    } catch (error) {
      console.error('❌ PWA: キャッシュクリア失敗', error);
      this.showNotification('キャッシュクリアに失敗しました', 'error');
    }
  }

  /**
   * イベントトラッキング
   */
  private trackEvent(eventName: string, data?: Record<string, unknown>): void {
    // Google Analytics や他のアナリティクスサービスにイベントを送信
    if (typeof (window as any).gtag !== 'undefined') {
      (window as any).gtag('event', eventName, data);
    }
    
  }

  /**
   * PWA ステータスの取得
   */
  public getStatus(): {
    isInstalled: boolean;
    isOnline: boolean;
    hasUpdate: boolean;
    canInstall: boolean;
  } {
    return {
      isInstalled: window.matchMedia('(display-mode: standalone)').matches,
      isOnline: navigator.onLine,
      hasUpdate: this.updateAvailable,
      canInstall: !!this.deferredPrompt
    };
  }

  /**
   * 手動でアップデートチェック
   */
  public async checkForUpdates(): Promise<boolean> {
    if (!this.registration) return false;

    try {
      await this.registration.update();
      return true;
    } catch (error) {
      console.error('❌ PWA: アップデートチェック失敗', error);
      return false;
    }
  }
}

// PWA Manager のインスタンスを作成してエクスポート
export const pwaManager = new PWAManager();

// グローバルオブジェクトとして利用可能にする（デバッグ用）
if (typeof window !== 'undefined') {
  (window as any).pwaManager = pwaManager;
}

export default pwaManager;
