import { useState, useEffect, useCallback, useMemo } from 'react';
import { HeroSection } from '../components/home/HeroSection';
import { NetworkErrorBanner } from '../components/home/NetworkErrorBanner';
import { MarqueeDogsSection } from '../components/home/MarqueeDogsSection';
import { NewsSection } from '../components/home/NewsSection';
import { OwnerRecruitmentBanner } from '../components/home/OwnerRecruitmentBanner';
import { FeaturesSection } from '../components/home/FeaturesSection';
import { UsageRulesSection } from '../components/home/UsageRulesSection';
import useAuth from '../context/AuthContext';
import { supabase } from '../utils/supabase';
import { testSupabaseConnection } from '../utils/supabase';
import type { Dog } from '../types';
import SkipNavigation from '../components/accessibility/SkipNavigation';
import AnimatedElement, { FadeIn, SlideUp } from '../components/accessibility/AnimatedElement';
import { useResponsive } from '../hooks/useResponsive';

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

  // スキップリンクをメモ化
  const skipLinks = useMemo(() => [
    { href: '#main-content', label: 'メインコンテンツにスキップ' },
    { href: '#hero-section', label: 'ヒーローセクションにスキップ' },
    { href: '#features-section', label: '機能紹介にスキップ' },
    { href: '#news-section', label: '新着情報にスキップ' },
    { href: '#usage-rules', label: '利用方法・料金にスキップ' },
  ], []);

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

  // キャッシュ関数 (5分間キャッシュ)
  const cacheTimeout = 5 * 60 * 1000; // 5分
  const cache = useMemo(() => new Map<string, { data: any; timestamp: number }>(), []);
  
  const getCachedData = useCallback((key: string) => {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < cacheTimeout) {
      return cached.data;
    }
    return null;
  }, [cache, cacheTimeout]);
  
  const setCachedData = useCallback((key: string, data: any) => {
    cache.set(key, { data, timestamp: Date.now() });
  }, [cache]);

  const fetchRecentDogs = useCallback(async () => {
    try {
      console.log('🐕 最近仲間入りしたワンちゃんを取得中...');
      
      // キャッシュから取得を試行
      const cachedData = getCachedData('recentDogs');
      if (cachedData) {
        console.log('✅ キャッシュから最近仲間入りしたワンちゃんを取得:', cachedData.length, '匹');
        setRecentDogs(cachedData);
        return cachedData;
      }
      
      setIsLoading(true);
      setNetworkError(null);

      const connectionTest = await testSupabaseConnection();
      if (!connectionTest) {
        throw new Error('データベース接続に失敗しました');
      }

      // 必要なフィールドのみを取得してパフォーマンスを向上
      const { data, error } = await supabase
        .from('dogs')
        .select('id, owner_id, name, breed, birth_date, gender, image_url, created_at')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      
      console.log('✅ 最近仲間入りしたワンちゃん取得成功:', data?.length || 0, '匹');
      const dogs = data || [];
      setRecentDogs(dogs);
      setCachedData('recentDogs', dogs);
      return dogs;
    } catch (err) {
      console.warn('❌ Error fetching recent dogs:', err);
      const errorMessage = err instanceof Error ? err.message : '接続エラーが発生しました';
      
      if (errorMessage.includes('NetworkError') || errorMessage.includes('Failed to fetch')) {
        setNetworkError('サーバーとの接続に問題があります。\nしばらく待ってから再度お試しください。');
      } else {
        setNetworkError(`データの取得に失敗しました。\nエラー詳細: ${errorMessage}`);
      }
      return [];
    } finally {
      setIsLoading(false);
      console.log('🐕 最近仲間入りしたワンちゃん取得処理完了');
    }
  }, [getCachedData, setCachedData]);

  const fetchNews = useCallback(async () => {
    try {
      console.log('📰 新着情報を取得中...');
      
      // キャッシュから取得を試行
      const cachedData = getCachedData('news');
      if (cachedData) {
        console.log('✅ キャッシュから新着情報を取得:', cachedData.length, '件');
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
        console.error('❌ 新着情報取得エラー:', error);
        // エラーがあっても空配列を設定して処理を続行
        setNews([]);
        return [];
      }

      console.log('✅ 新着情報取得成功:', data?.length || 0, '件');
      const newsData = data || [];
      setNews(newsData);
      setCachedData('news', newsData);
      return newsData;
    } catch (err) {
      console.error('❌ 新着情報取得例外:', err);
      // エラーが発生しても空配列を設定
      setNews([]);
      return [];
    } finally {
      setIsNewsLoading(false);
      console.log('📰 新着情報取得処理完了');
    }
  }, [getCachedData, setCachedData]);

  // 並列でデータ取得を実行
  const fetchAllData = useCallback(async () => {
    console.log('🚀 データ取得を並列で開始...');
    const startTime = Date.now();
    
    try {
      // 並列でデータ取得を実行
      const [dogs, news] = await Promise.all([
        fetchRecentDogs(),
        fetchNews()
      ]);
      
      const endTime = Date.now();
      console.log(`✅ 並列データ取得完了: ${endTime - startTime}ms`);
      
      return { dogs, news };
    } catch (error) {
      console.error('❌ 並列データ取得エラー:', error);
      return { dogs: [], news: [] };
    }
  }, [fetchRecentDogs, fetchNews]);

  useEffect(() => {
    void fetchAllData();
  }, [fetchAllData]);

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
      <SkipNavigation links={skipLinks} />
      
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

          {/* 最近登録された犬のマーキー */}
          <section 
            aria-label="最近登録された愛犬たち"
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
                delay={staggerDelay * 2}
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
                delay={staggerDelay * 3}
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