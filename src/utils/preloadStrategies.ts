// プリロード戦略のユーティリティ
export class PreloadStrategies {
    private static preloadedRoutes = new Set<string>();
    private static preloadedImages = new Set<string>();

    // ルートベースのプリロード
    static preloadRoute(routePath: string): void {
        if (this.preloadedRoutes.has(routePath)) return;

        const routePreloads: Record<string, () => Promise<any>> = {
            '/': () => import('../pages/Home'),
            '/login': () => import('../pages/Login'),
            '/register': () => import('../pages/Register'),
            '/dashboard': () => import('../pages/UserDashboard'),
            '/parks': () => import('../pages/DogParkList'),
            '/admin': () => import('../pages/AdminDashboard'),
            '/shop': () => import('../pages/PetShop'),
        };

        const preloadFn = routePreloads[routePath];
        if (preloadFn) {
            // 2秒後にプリロード（immediate loadingを避ける）
            setTimeout(() => {
                preloadFn().then(() => {
                    this.preloadedRoutes.add(routePath);
                });
            }, 2000);
        }
    }

    // 画像のプリロード
    static preloadImage(src: string, priority: 'high' | 'low' = 'low'): Promise<void> {
        if (this.preloadedImages.has(src)) return Promise.resolve();

        return new Promise((resolve, reject) => {
            const img = new Image();

            // 優先度に応じた設定
            if (priority === 'high') {
                img.fetchPriority = 'high';
                img.decoding = 'sync';
            } else {
                img.fetchPriority = 'low';
                img.decoding = 'async';
            }

            img.onload = () => {
                this.preloadedImages.add(src);
                resolve();
            };

            img.onerror = reject;
            img.src = src;
        });
    }

    // Critical リソースのプリロード
    static preloadCriticalResources(): void {
        // Hero画像の事前読み込み
        const heroImages = [
            '/images/hero-dogs.jpg',
            '/images/hero-bg.jpg',
            // 実際のHero画像パスに置き換えてください
        ];

        heroImages.forEach(src => {
            this.preloadImage(src, 'high');
        });

        // 重要なアイコンの事前読み込み
        const criticalIcons = [
            '/icons/icon-192x192.png',
            '/icons/icon-512x512.png',
        ];

        criticalIcons.forEach(src => {
            this.preloadImage(src, 'high');
        });
    }

    // ユーザー行動に基づくプリロード
    static setupIntelligentPreloading(): void {
        // ホバー時のプリロード
        document.addEventListener('mouseover', (e) => {
            const target = e.target as HTMLElement;
            const link = target.closest('a[href]') as HTMLAnchorElement;

            if (link) {
                const href = link.getAttribute('href');
                if (href && href.startsWith('/')) {
                    this.preloadRoute(href);
                }
            }
        });

        // スクロール位置に基づくプリロード
        let scrollTimeout: NodeJS.Timeout;
        window.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                const scrollPercent = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);

                // 50%スクロールで次のページをプリロード
                if (scrollPercent > 0.5) {
                    this.preloadNextLikelyRoutes();
                }
            }, 100);
        });
    }

    // 次に訪問する可能性の高いルートのプリロード
    private static preloadNextLikelyRoutes(): void {
        const currentPath = window.location.pathname;
        const nextRoutes: Record<string, string[]> = {
            '/': ['/login', '/register', '/parks'],
            '/login': ['/dashboard'],
            '/register': ['/dashboard'],
            '/dashboard': ['/parks', '/dogs', '/profile'],
            '/parks': ['/parks/[id]', '/reservations'],
            '/admin': ['/admin/parks', '/admin/users'],
        };

        const likely = nextRoutes[currentPath] || [];
        likely.forEach(route => this.preloadRoute(route));
    }

    // Service Worker キャッシュとの連携
    static setupServiceWorkerCaching(): void {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then(registration => {
                // 重要なリソースのキャッシュ指示
                const criticalResources = [
                    '/manifest.json',
                    '/favicon.ico',
                    '/icons/icon-192x192.png',
                    '/icons/icon-512x512.png',
                ];

                criticalResources.forEach(resource => {
                    registration.active?.postMessage({
                        type: 'CACHE_RESOURCE',
                        resource,
                    });
                });
            });
        }
    }
}

// パフォーマンス測定
export class PerformanceMonitor {
    static measureLCP(): void {
        if ('PerformanceObserver' in window) {
            const observer = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                const lastEntry = entries[entries.length - 1];

                console.log('LCP:', lastEntry.startTime);

                // 閾値チェック（2.5秒以内が理想）
                if (lastEntry.startTime > 2500) {
                    console.warn('LCP is slower than recommended (2.5s)');
                }
            });

            observer.observe({ entryTypes: ['largest-contentful-paint'] });
        }
    }

    static measureFCP(): void {
        if ('PerformanceObserver' in window) {
            const observer = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');

                if (fcpEntry) {
                    console.log('FCP:', fcpEntry.startTime);

                    // 閾値チェック（1.8秒以内が理想）
                    if (fcpEntry.startTime > 1800) {
                        console.warn('FCP is slower than recommended (1.8s)');
                    }
                }
            });

            observer.observe({ entryTypes: ['paint'] });
        }
    }

    static measureCLS(): void {
        if ('PerformanceObserver' in window) {
            let clsValue = 0;
            const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    // @ts-ignore
                    if (!entry.hadRecentInput) {
                        // @ts-ignore
                        clsValue += entry.value;
                    }
                }

                console.log('CLS:', clsValue);

                // 閾値チェック（0.1以内が理想）
                if (clsValue > 0.1) {
                    console.warn('CLS is higher than recommended (0.1)');
                }
            });

            observer.observe({ entryTypes: ['layout-shift'] });
        }
    }

    static startMonitoring(): void {
        this.measureLCP();
        this.measureFCP();
        this.measureCLS();
    }
}

// パフォーマンス初期化
export const initializePerformanceOptimizations = (): void => {
    // ページ読み込み完了後に実行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            PreloadStrategies.preloadCriticalResources();
            PreloadStrategies.setupIntelligentPreloading();
            PreloadStrategies.setupServiceWorkerCaching();
            PerformanceMonitor.startMonitoring();
        });
    } else {
        PreloadStrategies.preloadCriticalResources();
        PreloadStrategies.setupIntelligentPreloading();
        PreloadStrategies.setupServiceWorkerCaching();
        PerformanceMonitor.startMonitoring();
    }
}; 