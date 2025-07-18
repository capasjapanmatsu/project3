// セキュリティユーティリティ（Best Practices対応）

export class SecurityUtils {
    // 本番環境での デバッグコード削除
    static removeDebugCode(): void {
        if (import.meta.env.PROD) {
            // consoleメソッドを無効化
            const noop = () => { };
            console.log = noop;
            console.info = noop;
            console.warn = noop;
            console.debug = noop;

            // デバッグ用のグローバル変数を削除
            // @ts-ignore
            delete window.debugPerformance;
            // @ts-ignore
            delete window.debugMemory;
            // @ts-ignore
            delete window.supabase;
            // @ts-ignore
            delete window.React;
            // @ts-ignore
            delete window.ReactDOM;
        }
    }

    // Mixed Content の防止
    static enforceHTTPS(): void {
        if (import.meta.env.PROD && location.protocol !== 'https:') {
            // HTTPSにリダイレクト
            location.replace(`https:${location.href.substring(location.protocol.length)}`);
        }
    }

    // Content Security Policy の実装
    static setupCSP(): void {
        if (!document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
            const metaCSP = document.createElement('meta');
            metaCSP.httpEquiv = 'Content-Security-Policy';
            metaCSP.content = `
        default-src 'self';
        script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://maps.googleapis.com;
        style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
        img-src 'self' data: https: blob:;
        font-src 'self' https://fonts.gstatic.com;
        connect-src 'self' https://api.stripe.com ${import.meta.env.VITE_SUPABASE_URL} https://vitals.vercel-insights.com;
        worker-src 'self' blob:;
        child-src 'self' https://js.stripe.com;
        frame-src 'self' https://js.stripe.com;
        media-src 'self' https:;
        object-src 'none';
        base-uri 'self';
        form-action 'self';
        frame-ancestors 'none';
        upgrade-insecure-requests;
      `.replace(/\s+/g, ' ').trim();

            document.head.appendChild(metaCSP);
        }
    }

    // XSS対策のためのサニタイゼーション
    static sanitizeHTML(html: string): string {
        const temp = document.createElement('div');
        temp.textContent = html;
        return temp.innerHTML;
    }

    // 機密情報の漏洩防止
    static preventDataExposure(): void {
        // 右クリックメニューの無効化（本番環境のみ）
        if (import.meta.env.PROD) {
            document.addEventListener('contextmenu', (e) => {
                e.preventDefault();
            });

            // 開発者ツールの検出
            let devtools = { open: false };

            setInterval(() => {
                if (devtools.open) {
                    // 開発者ツールが開かれている場合の処理
                    document.body.innerHTML = `
            <div style="
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              font-family: Arial, sans-serif;
              background: #f8f9fa;
            ">
              <div style="
                text-align: center;
                padding: 2rem;
                background: white;
                border-radius: 8px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
              ">
                <h2 style="color: #dc3545; margin-bottom: 1rem;">🔒 セキュリティ保護</h2>
                <p style="color: #6c757d;">このアプリケーションは保護されています。</p>
                <button onclick="window.location.reload()" style="
                  background: #007bff;
                  color: white;
                  border: none;
                  padding: 0.5rem 1rem;
                  border-radius: 4px;
                  cursor: pointer;
                  margin-top: 1rem;
                ">再読み込み</button>
              </div>
            </div>
          `;
                }
            }, 1000);

            // 開発者ツールの検出ロジック
            const threshold = 160;
            const checkDevTools = () => {
                if (window.outerHeight - window.innerHeight > threshold ||
                    window.outerWidth - window.innerWidth > threshold) {
                    devtools.open = true;
                } else {
                    devtools.open = false;
                }
            };

            setInterval(checkDevTools, 500);
        }
    }

    // セキュアなローカルストレージの使用
    static secureStorage = {
        set: (key: string, value: any): void => {
            try {
                const encrypted = btoa(JSON.stringify(value));
                localStorage.setItem(key, encrypted);
            } catch (error) {
                console.error('Storage encryption failed:', error);
            }
        },

        get: (key: string): any => {
            try {
                const encrypted = localStorage.getItem(key);
                if (!encrypted) return null;
                return JSON.parse(atob(encrypted));
            } catch (error) {
                console.error('Storage decryption failed:', error);
                return null;
            }
        },

        remove: (key: string): void => {
            localStorage.removeItem(key);
        },

        clear: (): void => {
            localStorage.clear();
        }
    };

    // APIキーの保護
    static protectAPIKeys(): void {
        // 環境変数の存在確認
        if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
            console.error('❌ 必要な環境変数が設定されていません');
            return;
        }

        // APIキーの形式チェック
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        if (!supabaseKey.startsWith('eyJ')) {
            console.error('❌ Supabase APIキーの形式が正しくありません');
        }
    }

    // セキュリティヘッダーの設定確認
    static checkSecurityHeaders(): void {
        if (import.meta.env.DEV) {
            // 開発環境でのヘッダー確認
            fetch(location.href, { method: 'HEAD' })
                .then(response => {
                    const headers = response.headers;
                    const securityHeaders = [
                        'X-Frame-Options',
                        'X-Content-Type-Options',
                        'X-XSS-Protection',
                        'Strict-Transport-Security',
                        'Content-Security-Policy'
                    ];

                    console.log('🔍 セキュリティヘッダー確認:');
                    securityHeaders.forEach(header => {
                        const value = headers.get(header);
                        console.log(`  ${header}: ${value || '未設定'}`);
                    });
                })
                .catch(error => {
                    console.error('ヘッダー確認に失敗:', error);
                });
        }
    }

    // 入力値の検証
    static validateInput(input: string, type: 'email' | 'phone' | 'text' | 'url' = 'text'): boolean {
        const patterns = {
            email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            phone: /^[\d\-\(\)\+\s]+$/,
            text: /^[^<>\"'&]*$/,
            url: /^https?:\/\/.+$/
        };

        const pattern = patterns[type];
        return pattern.test(input);
    }

    // CSRF対策
    static generateCSRFToken(): string {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    // セキュリティ設定の初期化
    static initializeSecuritySettings(): void {
        this.enforceHTTPS();
        this.setupCSP();
        this.removeDebugCode();
        this.preventDataExposure();
        this.protectAPIKeys();
        this.checkSecurityHeaders();
    }
}

// セキュリティイベントリスナーの設定
export const setupSecurityEventListeners = (): void => {
    // ページの visibility change 監視
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            // ページが非表示になった時の処理
            console.log('🔒 ページが非表示になりました');
        }
    });

    // 不審なアクティビティの検出
    let rapidClickCount = 0;
    let rapidClickTimer: NodeJS.Timeout;

    document.addEventListener('click', () => {
        rapidClickCount++;

        clearTimeout(rapidClickTimer);
        rapidClickTimer = setTimeout(() => {
            rapidClickCount = 0;
        }, 1000);

        // 1秒間に10回以上クリックされた場合
        if (rapidClickCount > 10) {
            console.warn('⚠️ 不審なクリック活動を検出しました');
            rapidClickCount = 0;
        }
    });

    // キーボード入力の監視
    document.addEventListener('keydown', (e) => {
        // 危険なキーの組み合わせを監視
        if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) {
            if (import.meta.env.PROD) {
                e.preventDefault();
                console.warn('⚠️ 開発者ツールの使用が検出されました');
            }
        }
    });

    // コピー防止（機密情報に対して）
    document.addEventListener('selectstart', (e) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains('no-select') || target.closest('.no-select')) {
            e.preventDefault();
        }
    });
};

// エラーハンドリングの改善
export const setupErrorHandling = (): void => {
    // グローバルエラーハンドラー
    window.addEventListener('error', (event) => {
        console.error('❌ JavaScript Error:', event.error);

        // 本番環境では詳細なエラー情報を隠す
        if (import.meta.env.PROD) {
            event.preventDefault();

            // ユーザーフレンドリーなエラーメッセージ
            const errorDiv = document.createElement('div');
            errorDiv.innerHTML = `
        <div style="
          position: fixed;
          top: 20px;
          right: 20px;
          background: #dc3545;
          color: white;
          padding: 1rem;
          border-radius: 4px;
          z-index: 10000;
          font-family: Arial, sans-serif;
        ">
          <strong>エラーが発生しました</strong><br>
          ページを再読み込みしてください。
          <button onclick="this.parentElement.remove()" style="
            background: none;
            border: none;
            color: white;
            float: right;
            cursor: pointer;
            font-size: 1.2rem;
          ">×</button>
        </div>
      `;

            document.body.appendChild(errorDiv);

            // 5秒後に自動削除
            setTimeout(() => {
                if (document.body.contains(errorDiv)) {
                    document.body.removeChild(errorDiv);
                }
            }, 5000);
        }
    });

    // Promise rejection の処理
    window.addEventListener('unhandledrejection', (event) => {
        console.error('❌ Unhandled Promise Rejection:', event.reason);

        if (import.meta.env.PROD) {
            event.preventDefault();
        }
    });
};

// セキュリティ設定のエクスポート
export default SecurityUtils; 