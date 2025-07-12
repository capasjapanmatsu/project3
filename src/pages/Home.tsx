import { useState, useEffect } from 'react';
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
  
  // レスポンシブフック
  const { isMobile, isTablet, prefersReducedMotion } = useResponsive();

  const skipLinks = [
    { href: '#main-content', label: 'メインコンテンツにスキップ' },
    { href: '#hero-section', label: 'ヒーローセクションにスキップ' },
    { href: '#features-section', label: '機能紹介にスキップ' },
    { href: '#news-section', label: '新着情報にスキップ' },
    { href: '#usage-rules', label: '利用方法・料金にスキップ' },
  ];

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

  const fetchRecentDogs = async () => {
    try {
      setIsLoading(true);
      setNetworkError(null);

      const connectionTest = await testSupabaseConnection();
      if (!connectionTest) {
        throw new Error('データベース接続に失敗しました');
      }

      const { data, error } = await supabase
        .from('dogs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setRecentDogs(data || []);
    } catch (err) {
      console.error('Error fetching recent dogs:', err);
      const errorMessage = err instanceof Error ? err.message : '接続エラーが発生しました';
      
      if (errorMessage.includes('NetworkError') || errorMessage.includes('Failed to fetch')) {
        setNetworkError('サーバーとの接続に問題があります。\nしばらく待ってから再度お試しください。');
      } else {
        setNetworkError(`データの取得に失敗しました。\nエラー詳細: ${errorMessage}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchNews = async () => {
    try {
      const { data, error } = await supabase
        .from('news_announcements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Error fetching news:', error);
        return;
      }

      setNews(data || []);
    } catch (err) {
      console.error('Error fetching news:', err);
    }
  };

  useEffect(() => {
    fetchRecentDogs();
    fetchNews();
  }, []);

  const handleRetryConnection = async () => {
    await fetchRecentDogs();
    await fetchNews();
  };

  // アニメーション設定をレスポンシブに調整
  const animationDuration = isMobile ? 'fast' : 'normal';
  const staggerDelay = prefersReducedMotion ? 0 : 100;

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
              <HeroSection isLoggedIn={!!user} />
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
                <FeaturesSection isLoggedIn={!!user} />
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