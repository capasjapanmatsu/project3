import { useCallback, useEffect, useMemo, useState } from 'react';
import AnimatedElement, { FadeIn, SlideUp } from '../components/accessibility/AnimatedElement';
import { FeaturesSection } from '../components/home/FeaturesSection';
import { HeroSection } from '../components/home/HeroSection';
import { MarqueeDogsSection } from '../components/home/MarqueeDogsSection';
import { NetworkErrorBanner } from '../components/home/NetworkErrorBanner';
import { NewsSection } from '../components/home/NewsSection';
import { OwnerRecruitmentBanner } from '../components/home/OwnerRecruitmentBanner';
import { UsageRulesSection } from '../components/home/UsageRulesSection';
import useAuth from '../context/AuthContext';
import { useResponsive } from '../hooks/useResponsive';
import type { Dog } from '../types';
import { logger } from '../utils/logger';
import { supabase } from '../utils/supabase';

export function Home() {
  const { user } = useAuth();
  const [recentDogs, setRecentDogs] = useState<Dog[]>([]);
  const [news, setNews] = useState<any[]>([]);
  const [isOffline, setIsOffline] = useState(false);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNewsLoading, setIsNewsLoading] = useState(true); // 新着情報専用のローディング状態

  // レスポンシブフック
  const { isMobile, isTablet, prefersReducedMotion } = useResponsive();

  // Critical contentのプリロード
  useEffect(() => {
    // Hero画像を優先的にプリロード
    const heroImageUrl = '/images/hero-dogs.jpg'; // 実際のHero画像パスに変更
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = heroImageUrl;
    link.as = 'image';
    link.fetchPriority = 'high';
    document.head.appendChild(link);

    // 重要なフォントをプリロード
    const fontLink = document.createElement('link');
    fontLink.rel = 'preload';
    fontLink.href = '/fonts/inter-var.woff2';
    fontLink.as = 'font';
    fontLink.type = 'font/woff2';
    fontLink.crossOrigin = 'anonymous';
    document.head.appendChild(fontLink);

    return () => {
      document.head.removeChild(link);
      document.head.removeChild(fontLink);
    };
  }, []);

  // ネットワーク状態の監視
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setNetworkError(null);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setNetworkError('インターネット接続が切断されました。\nオフラインモードで表示しています。');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 初期状態の確認
    if (!navigator.onLine) {
      handleOffline();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // キャッシュ関数 (10分間キャッシュに延長)
  const cacheTimeout = 10 * 60 * 1000; // 10分
  const cache = useMemo(() => new Map<string, { data: any; timestamp: number }>(), []);

  const getCachedData = useCallback((key: string) => {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < cacheTimeout) {
      return cached.data;
    }
    // 期限切れのキャッシュを削除
    if (cached) {
      cache.delete(key);
    }
    return null;
  }, [cache, cacheTimeout]);

  const setCachedData = useCallback((key: string, data: any) => {
    cache.set(key, { data, timestamp: Date.now() });
    // ローカルストレージにも保存（セッション間でキャッシュを維持）
    try {
      localStorage.setItem(`dogpark_cache_${key}`, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.warn('Failed to save cache to localStorage:', error);
    }
  }, [cache]);

  // 初期化時にローカルストレージからキャッシュを復元
  useEffect(() => {
    try {
      const cachedDogs = localStorage.getItem('dogpark_cache_recentDogs');
      if (cachedDogs) {
        const parsed = JSON.parse(cachedDogs);
        if (Date.now() - parsed.timestamp < cacheTimeout) {
          cache.set('recentDogs', parsed);
          setRecentDogs(parsed.data);
          setIsLoading(false);
          logger.info('✅ ローカルストレージからキャッシュを復元:', parsed.data.length, '匹');
        }
      }
    } catch (error) {
      console.warn('Failed to restore cache from localStorage:', error);
    }
  }, [cache, cacheTimeout]);

  const fetchRecentDogs = useCallback(async () => {
    try {
      logger.info('🐕 最近仲間入りしたワンちゃんを取得中...');

      // キャッシュから取得を試行
      const cachedData = getCachedData('recentDogs');
      if (cachedData) {
        logger.info('✅ キャッシュから最近仲間入りしたワンちゃんを取得:', cachedData.length, '匹');
        setRecentDogs(cachedData);
        setIsLoading(false);
        return cachedData;
      }

      setIsLoading(true);
      setNetworkError(null);

      // データベース接続テストを省略して高速化
      logger.info('🔍 データベースから直接取得...');

      // 最小限のフィールドのみを取得してパフォーマンスを向上
      const { data, error } = await supabase
        .from('dogs')
        .select('id, owner_id, name, breed, birth_date, gender, image_url, created_at')
        .order('created_at', { ascending: false })
        .limit(8);

      if (error) {
        logger.warn('❌ Database error:', error);
        // エラー時は空配列を返してアプリを継続
        setRecentDogs([]);
        setIsLoading(false);
        return [];
      }

      logger.info('✅ 最近仲間入りしたワンちゃん取得成功:', data?.length || 0, '匹');
      const dogs = data || [];
      setRecentDogs(dogs);
      setCachedData('recentDogs', dogs);
      setIsLoading(false);
      return dogs;
    } catch (err) {
      logger.warn('❌ Error fetching recent dogs:', err);
      // エラー時でもアプリを継続
      setRecentDogs([]);
      setIsLoading(false);
      return [];
    }
  }, [getCachedData, setCachedData]);

  const fetchNews = useCallback(async () => {
    try {
      logger.info('📰 新着情報を取得中...');

      // キャッシュから取得を試行
      const cachedData = getCachedData('news');
      if (cachedData) {
        logger.info('✅ キャッシュから新着情報を取得:', cachedData.length, '件');
        setNews(cachedData);
        return cachedData;
      }

      setIsNewsLoading(true);

      const { data, error } = await supabase
        .from('news_announcements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        logger.error('❌ 新着情報取得エラー:', error);
        // エラーがあっても空配列を設定して処理を続行
        setNews([]);
        return [];
      }

      logger.info('✅ 新着情報取得成功:', data?.length || 0, '件');
      const newsData = data || [];
      setNews(newsData);
      setCachedData('news', newsData);
      return newsData;
    } catch (err) {
      logger.error('❌ 新着情報取得例外:', err);
      // エラーが発生しても空配列を設定
      setNews([]);
      return [];
    } finally {
      setIsNewsLoading(false);
      logger.info('📰 新着情報取得処理完了');
    }
  }, [getCachedData, setCachedData]);

  // 並列でデータ取得を実行（最適化版）
  const fetchAllData = useCallback(async () => {
    logger.info('🚀 高速データ取得を開始...');
    const startTime = Date.now();

    try {
      // 並列実行とタイムアウト設定
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 8000);
      });

      const dataPromises = Promise.all([
        fetchRecentDogs(),
        fetchNews()
      ]);

      const [dogs, news] = await Promise.race([dataPromises, timeoutPromise]) as [any[], any[]];

      const endTime = Date.now();
      logger.info(`✅ 高速データ取得完了: ${endTime - startTime}ms`);

      return { dogs, news };
    } catch (error) {
      logger.error('❌ データ取得エラー:', error);

      // エラー時でも部分的に取得できたデータを使用
      const fallbackData = { dogs: [], news: [] };

      // 個別にデータを取得を試みる
      try {
        const dogs = await fetchRecentDogs();
        fallbackData.dogs = dogs;
      } catch (dogError) {
        logger.warn('犬データの取得に失敗:', dogError);
      }

      try {
        const news = await fetchNews();
        fallbackData.news = news;
      } catch (newsError) {
        logger.warn('ニュースデータの取得に失敗:', newsError);
      }

      return fallbackData;
    }
  }, [fetchRecentDogs, fetchNews]);

  // 初期化時の効率的なデータ取得
  useEffect(() => {
    // キャッシュからデータが復元されていない場合のみ取得
    if (recentDogs.length === 0 && news.length === 0) {
      void fetchAllData();
    }
  }, [fetchAllData, recentDogs.length, news.length]);

  const handleRetryConnection = useCallback(async () => {
    // キャッシュをクリアして再取得
    cache.clear();
    await fetchAllData();
  }, [fetchAllData, cache]);

  // アニメーション設定をレスポンシブに調整 (遅延を削減)
  const animationDuration = isMobile ? 'fast' : 'normal';
  const staggerDelay = prefersReducedMotion ? 0 : 25; // 100から25に削減

  // isLoggedInをメモ化
  const isLoggedIn = useMemo(() => !!user, [user]);

  return (
    <>
      <div className="min-h-screen bg-gray-50" role="main">
        {/* ネットワークエラーバナー */}
        <FadeIn duration="fast">
          <NetworkErrorBanner
            isOffline={isOffline}
            networkError={networkError}
            onRetryConnection={handleRetryConnection}
          />
        </FadeIn>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* ヒーローセクション */}
          <section
            id="hero-section"
            aria-label="メインヒーロー"
            className="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 rounded-lg"
            tabIndex={-1}
          >
            <SlideUp duration={animationDuration} delay={staggerDelay * 0}>
              <HeroSection isLoggedIn={isLoggedIn} />
            </SlideUp>
          </section>

          {/* 新着情報セクション */}
          <section
            id="news-section"
            aria-labelledby="news-heading"
            className="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 rounded-lg"
            tabIndex={-1}
          >
            <AnimatedElement
              animation="slideUp"
              duration={animationDuration}
              delay={staggerDelay * 1}
              respectReducedMotion={true}
              fallbackAnimation="fadeIn"
            >
              <h2
                id="news-heading"
                className="sr-only"
              >
                新着情報とお知らせ
              </h2>
              <NewsSection
                isOffline={isOffline}
                onRetryConnection={handleRetryConnection}
                news={news}
                isLoading={isNewsLoading}
              />
            </AnimatedElement>
          </section>

          {/* 最近登録された犬のマーキー */}
          <section
            aria-label="最近登録された愛犬たち"
            className="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 rounded-lg"
            tabIndex={-1}
          >
            <AnimatedElement
              animation="slideUp"
              duration={animationDuration}
              delay={staggerDelay * 2}
              respectReducedMotion={true}
              fallbackAnimation="fadeIn"
            >
              <MarqueeDogsSection
                recentDogs={recentDogs}
                isOffline={isOffline}
                isLoading={isLoading}
              />
            </AnimatedElement>
          </section>

          <main id="main-content" className="space-y-12 py-8">
            {/* 機能紹介セクション */}
            <section
              id="features-section"
              aria-labelledby="features-heading"
              className="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 rounded-lg"
              tabIndex={-1}
            >
              <AnimatedElement
                animation="slideUp"
                duration={animationDuration}
                delay={staggerDelay * 3}
                respectReducedMotion={true}
                fallbackAnimation="fadeIn"
              >
                <h2
                  id="features-heading"
                  className="sr-only"
                >
                  アプリの主な機能
                </h2>
                <FeaturesSection isLoggedIn={isLoggedIn} />
              </AnimatedElement>
            </section>

            {/* オーナー募集バナー */}
            <AnimatedElement
              animation="slideUp"
              duration={animationDuration}
              delay={staggerDelay * 4}
              respectReducedMotion={true}
              fallbackAnimation="fadeIn"
            >
              <OwnerRecruitmentBanner />
            </AnimatedElement>

            {/* 利用方法・料金セクション */}
            <section
              id="usage-rules"
              aria-labelledby="usage-heading"
              className="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 rounded-lg"
              tabIndex={-1}
            >
              <AnimatedElement
                animation="slideUp"
                duration={animationDuration}
                delay={staggerDelay * 5}
                respectReducedMotion={true}
                fallbackAnimation="fadeIn"
              >
                <h2
                  id="usage-heading"
                  className="sr-only"
                >
                  利用方法と料金について
                </h2>
                <UsageRulesSection />
              </AnimatedElement>
            </section>
          </main>
        </div>
      </div>

      {/* ライブリージョン（スクリーンリーダー用） */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        id="status-region"
      >
        {isOffline && 'オフラインモードです。'}
        {networkError && 'ネットワークエラーが発生しています。'}
        {isLoading && 'データを読み込んでいます。'}
      </div>

      {/* アナウンスリージョン（重要な通知用） */}
      <div
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
        id="announcement-region"
      >
      </div>
    </>
  );
}