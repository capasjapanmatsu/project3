import React, { useEffect } from 'react';

interface CriticalCSSProps {
    children: React.ReactNode;
}

const CriticalCSS: React.FC<CriticalCSSProps> = ({ children }) => {
    useEffect(() => {
        // Critical CSS の遅延読み込み
        const loadNonCriticalCSS = () => {
            const links = document.querySelectorAll('link[rel="preload"][as="style"]');
            links.forEach((link) => {
                const linkElement = link as HTMLLinkElement;
                linkElement.rel = 'stylesheet';
                linkElement.onload = () => {
                    linkElement.onload = null;
                };
            });
        };

        // DOM読み込み完了後に非Critical CSSを読み込み
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', loadNonCriticalCSS);
        } else {
            loadNonCriticalCSS();
        }

        return () => {
            document.removeEventListener('DOMContentLoaded', loadNonCriticalCSS);
        };
    }, []);

    return <>{children}</>;
};

// フォント読み込み最適化
export const OptimizedFontLoader: React.FC = () => {
    useEffect(() => {
        // フォントの preload
        const fontPreloads = [
            { href: '/fonts/inter-var.woff2', family: 'Inter' },
            // 他のフォントファイルがある場合は追加
        ];

        fontPreloads.forEach(({ href, family }) => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.href = href;
            link.as = 'font';
            link.type = 'font/woff2';
            link.crossOrigin = 'anonymous';
            document.head.appendChild(link);

            // フォント読み込み完了の監視
            if ('fonts' in document) {
                document.fonts.ready.then(() => {
                    document.body.classList.add('fonts-loaded');
                });
            }
        });
    }, []);

    return null;
};

// リソースヒント最適化
export const ResourceHints: React.FC = () => {
    useEffect(() => {
        // DNS プリフェッチ
        const dnsPreFetch = [
            'https://fonts.googleapis.com',
            'https://fonts.gstatic.com',
            'https://api.stripe.com',
            'https://js.stripe.com',
            // Supabase URL（実際のURLに置き換えてください）
            'https://your-project.supabase.co',
        ];

        dnsPreFetch.forEach((url) => {
            const link = document.createElement('link');
            link.rel = 'dns-prefetch';
            link.href = url;
            document.head.appendChild(link);
        });

        // 重要なリソースの preconnect
        const preconnects = [
            'https://fonts.gstatic.com',
            'https://api.stripe.com',
        ];

        preconnects.forEach((url) => {
            const link = document.createElement('link');
            link.rel = 'preconnect';
            link.href = url;
            link.crossOrigin = 'anonymous';
            document.head.appendChild(link);
        });
    }, []);

    return null;
};

export default CriticalCSS; 
