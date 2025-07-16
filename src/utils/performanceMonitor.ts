/**
 * パフォーマンス監視ユーティリティ
 */

interface PerformanceMetrics {
  fcp: number; // First Contentful Paint
  lcp: number; // Largest Contentful Paint  
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  ttfb: number; // Time to First Byte
}

class PerformanceMonitor {
  private metrics: Partial<PerformanceMetrics> = {};
  private observers: PerformanceObserver[] = [];

  constructor() {
    this.initializeObservers();
  }

  private initializeObservers() {
    // First Contentful Paint & Largest Contentful Paint
    if ('PerformanceObserver' in window) {
      try {
        const paintObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.name === 'first-contentful-paint') {
              this.metrics.fcp = entry.startTime;
            }
          }
        });
        paintObserver.observe({ type: 'paint', buffered: true });
        this.observers.push(paintObserver);

        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries() as PerformanceEventTiming[];
          const lastEntry = entries[entries.length - 1];
          this.metrics.lcp = lastEntry.startTime;
        });
        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
        this.observers.push(lcpObserver);

        // First Input Delay
        const fidObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as PerformanceEventTiming[]) {
            this.metrics.fid = entry.processingStart - entry.startTime;
          }
        });
        fidObserver.observe({ type: 'first-input', buffered: true });
        this.observers.push(fidObserver);

        // Cumulative Layout Shift
        const clsObserver = new PerformanceObserver((list) => {
          let clsValue = 0;
          for (const entry of list.getEntries() as any[]) {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          }
          this.metrics.cls = clsValue;
        });
        clsObserver.observe({ type: 'layout-shift', buffered: true });
        this.observers.push(clsObserver);

      } catch (error) {
        console.warn('Performance Observer not supported:', error);
      }
    }

    // Time to First Byte
    window.addEventListener('load', () => {
      const navigationTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigationTiming) {
        this.metrics.ttfb = navigationTiming.responseStart - navigationTiming.requestStart;
      }
    });
  }

  /**
   * 現在のメトリクスを取得
   */
  getMetrics(): Partial<PerformanceMetrics> {
    return { ...this.metrics };
  }

  /**
   * メトリクスを評価してスコアを返す
   */
  getPerformanceScore(): {
    score: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    recommendations: string[];
  } {
    const recommendations: string[] = [];
    let score = 100;

    // FCP評価 (Good: <1.8s, Needs Improvement: <3s, Poor: >=3s)
    if (this.metrics.fcp) {
      if (this.metrics.fcp > 3000) {
        score -= 20;
        recommendations.push('First Contentful Paintを改善してください (現在: ' + Math.round(this.metrics.fcp) + 'ms)');
      } else if (this.metrics.fcp > 1800) {
        score -= 10;
        recommendations.push('First Contentful Paintをさらに最適化できます');
      }
    }

    // LCP評価 (Good: <2.5s, Needs Improvement: <4s, Poor: >=4s)
    if (this.metrics.lcp) {
      if (this.metrics.lcp > 4000) {
        score -= 25;
        recommendations.push('Largest Contentful Paintを改善してください (現在: ' + Math.round(this.metrics.lcp) + 'ms)');
      } else if (this.metrics.lcp > 2500) {
        score -= 15;
        recommendations.push('Largest Contentful Paintをさらに最適化できます');
      }
    }

    // FID評価 (Good: <100ms, Needs Improvement: <300ms, Poor: >=300ms)
    if (this.metrics.fid) {
      if (this.metrics.fid > 300) {
        score -= 20;
        recommendations.push('First Input Delayを改善してください (現在: ' + Math.round(this.metrics.fid) + 'ms)');
      } else if (this.metrics.fid > 100) {
        score -= 10;
        recommendations.push('First Input Delayをさらに最適化できます');
      }
    }

    // CLS評価 (Good: <0.1, Needs Improvement: <0.25, Poor: >=0.25)
    if (this.metrics.cls) {
      if (this.metrics.cls > 0.25) {
        score -= 20;
        recommendations.push('Cumulative Layout Shiftを改善してください (現在: ' + this.metrics.cls.toFixed(3) + ')');
      } else if (this.metrics.cls > 0.1) {
        score -= 10;
        recommendations.push('Cumulative Layout Shiftをさらに最適化できます');
      }
    }

    // TTFB評価 (Good: <600ms, Needs Improvement: <1.5s, Poor: >=1.5s)
    if (this.metrics.ttfb) {
      if (this.metrics.ttfb > 1500) {
        score -= 15;
        recommendations.push('Time to First Byteを改善してください (現在: ' + Math.round(this.metrics.ttfb) + 'ms)');
      } else if (this.metrics.ttfb > 600) {
        score -= 5;
        recommendations.push('Time to First Byteをさらに最適化できます');
      }
    }

    let grade: 'A' | 'B' | 'C' | 'D' | 'F';
    if (score >= 90) grade = 'A';
    else if (score >= 80) grade = 'B';
    else if (score >= 70) grade = 'C';
    else if (score >= 60) grade = 'D';
    else grade = 'F';

    return { score: Math.max(0, score), grade, recommendations };
  }

  /**
   * バンドルサイズ情報を取得
   */
  async getBundleInfo(): Promise<{
    totalSize: number;
    jsSize: number;
    cssSize: number;
    imageSize: number;
  }> {
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    
    let jsSize = 0;
    let cssSize = 0;
    let imageSize = 0;

    resources.forEach(resource => {
      const size = resource.transferSize || 0;
      
      if (resource.name.includes('.js')) {
        jsSize += size;
      } else if (resource.name.includes('.css')) {
        cssSize += size;
      } else if (/\.(png|jpg|jpeg|gif|svg|webp)/.test(resource.name)) {
        imageSize += size;
      }
    });

    const totalSize = jsSize + cssSize + imageSize;

    return { totalSize, jsSize, cssSize, imageSize };
  }

  /**
   * パフォーマンスレポートを生成
   */
  async generateReport(): Promise<string> {
    const metrics = this.getMetrics();
    const score = this.getPerformanceScore();
    const bundleInfo = await this.getBundleInfo();

    const formatSize = (bytes: number) => {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const report = `
🎯 パフォーマンスレポート
========================

📊 総合スコア: ${score.score}/100 (${score.grade}級)

📈 Core Web Vitals:
${metrics.fcp ? `• First Contentful Paint: ${Math.round(metrics.fcp)}ms` : '• First Contentful Paint: 測定中...'}
${metrics.lcp ? `• Largest Contentful Paint: ${Math.round(metrics.lcp)}ms` : '• Largest Contentful Paint: 測定中...'}
${metrics.fid ? `• First Input Delay: ${Math.round(metrics.fid)}ms` : '• First Input Delay: 測定中...'}
${metrics.cls ? `• Cumulative Layout Shift: ${metrics.cls.toFixed(3)}` : '• Cumulative Layout Shift: 測定中...'}
${metrics.ttfb ? `• Time to First Byte: ${Math.round(metrics.ttfb)}ms` : '• Time to First Byte: 測定中...'}

📦 バンドルサイズ:
• 総サイズ: ${formatSize(bundleInfo.totalSize)}
• JavaScript: ${formatSize(bundleInfo.jsSize)}
• CSS: ${formatSize(bundleInfo.cssSize)}
• 画像: ${formatSize(bundleInfo.imageSize)}

💡 改善提案:
${score.recommendations.length > 0 ? score.recommendations.map(rec => `• ${rec}`).join('\n') : '• 素晴らしいパフォーマンスです！'}

🎯 目標値:
• FCP: <1.8秒
• LCP: <2.5秒  
• FID: <100ms
• CLS: <0.1
• TTFB: <600ms
• JSサイズ: <300KB
• CSSサイズ: <100KB
    `;

    return report.trim();
  }

  /**
   * オブザーバーをクリーンアップ
   */
  cleanup() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// グローバルインスタンス
let performanceMonitor: PerformanceMonitor | null = null;

/**
 * パフォーマンス監視を開始
 */
export function startPerformanceMonitoring(): PerformanceMonitor {
  if (!performanceMonitor) {
    performanceMonitor = new PerformanceMonitor();
  }
  return performanceMonitor;
}

/**
 * パフォーマンスレポートをコンソールに出力
 */
export async function logPerformanceReport(): Promise<void> {
  if (!performanceMonitor) {
    console.warn('パフォーマンス監視が開始されていません');
    return;
  }

  const report = await performanceMonitor.generateReport();
  console.log(report);
}

/**
 * パフォーマンス監視を停止
 */
export function stopPerformanceMonitoring(): void {
  if (performanceMonitor) {
    performanceMonitor.cleanup();
    performanceMonitor = null;
  }
}

// 開発環境でのみ自動開始
if (import.meta.env.DEV) {
  window.addEventListener('load', () => {
    startPerformanceMonitoring();
    
    // 5秒後にレポート出力
    setTimeout(() => {
      logPerformanceReport();
    }, 5000);
  });
}

export { PerformanceMonitor };
