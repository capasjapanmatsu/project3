import { useCallback, useEffect, useMemo, useState } from 'react';
import AnimatedElement, { FadeIn, SlideUp } from '../components/accessibility/AnimatedElement';
import { DogInfoCorner } from '../components/home/DogInfoCorner';
import { FacilityRecruitmentBanner } from '../components/home/FacilityRecruitmentBanner';
import { FeaturesSection } from '../components/home/FeaturesSection';
import { HeroSection } from '../components/home/HeroSection';
import { MarqueeDogsSection } from '../components/home/MarqueeDogsSection';
import { NetworkErrorBanner } from '../components/home/NetworkErrorBanner';
import { NewsSection } from '../components/home/NewsSection';
import { OwnerRecruitmentBanner } from '../components/home/OwnerRecruitmentBanner';
import { UsageRulesSection } from '../components/home/UsageRulesSection';
import useAuth from '../context/AuthContext';
import { useResponsive } from '../hooks/useResponsive';
import type { Dog, NewsAnnouncement } from '../types';
import { supabase } from '../utils/supabase';

export function Home() {
  const { user } = useAuth();

  // レスポンシブフック
  const { isMobile, prefersReducedMotion } = useResponsive();

  // ローカル状態管理（リアルタイム機能を一時無効化）
  const [recentDogs, setRecentDogs] = useState<Dog[]>([]);
  const [news, setNews] = useState<NewsAnnouncement[]>([]);
  const [isDogsLoading, setIsDogsLoading] = useState(true);
  const [isNewsLoading, setIsNewsLoading] = useState(true);
  const [dogsError, setDogsError] = useState<string | null>(null);
  const [newsError, setNewsError] = useState<string | null>(null);

  // データ取得関数
  const fetchDogs = useCallback(async () => {
    try {
      setDogsError(null);

      const { data, error } = await supabase
        .from('dogs')
        .select('id, owner_id, name, breed, birth_date, gender, image_url, created_at')
        .order('created_at', { ascending: false })
        .limit(8);

      if (error) {
        throw error;
      }

      setRecentDogs(data || []);
    } catch (error) {
      console.error('🐕 犬データ取得エラー:', error);
      setDogsError(error instanceof Error ? error.message : 'データ取得に失敗しました');
    } finally {
      setIsDogsLoading(false);
    }
  }, []);

  const fetchNews = useCallback(async () => {
    try {
      setNewsError(null);

      const { data, error } = await supabase
        .from('news_announcements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        throw error;
      }

      setNews(data || []);
    } catch (error) {
      console.error('📢 ニュースデータ取得エラー:', error);
      setNewsError(error instanceof Error ? error.message : 'データ取得に失敗しました');
    } finally {
      setIsNewsLoading(false);
    }
  }, []);

  // 🚀 最適化された初期データ取得
  useEffect(() => {
    const initializeHomePage = async () => {
      // フェーズ1: 即座にUIを表示（ローディング状態で）
      // すでにstateの初期値でローディング状態になっている
      
      // フェーズ2: バックグラウンドで並列データ取得
      void Promise.allSettled([
        fetchDogs(),
        fetchNews()
      ]);
    };

    initializeHomePage();
  }, [fetchDogs, fetchNews]);

  // データの安定化処理
  const stableNews = useMemo(() => {
    if (isNewsLoading && news.length === 0) {
      return [
        {
          id: 'loading',
          title: '新着情報を読み込み中...',
          content: 'データベースから最新の情報を取得しています。',
          category: 'news' as const,
          is_important: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
    }
    return news;
  }, [news, isNewsLoading]);

  const stableDogs = useMemo(() => {
    return recentDogs || [];
  }, [recentDogs]);

  // ネットワークエラーの状態管理
  const isOffline = !!(dogsError || newsError);
  const networkError = dogsError || newsError;

  // 再接続ハンドラー
  const handleRetryConnection = useCallback(() => {
    console.log('🔄 データを再取得中...');
    void fetchDogs();
    void fetchNews();
  }, [fetchDogs, fetchNews]);

  // アニメーション設定をレスポンシブに調整
  const animationDuration = isMobile ? 'fast' : 'normal';
  const staggerDelay = prefersReducedMotion ? 0 : 25;

  // isLoggedInをメモ化
  const isLoggedIn = useMemo(() => !!user, [user]);

  // ローディング状態の安定化
  const isDataLoading = isDogsLoading || isNewsLoading;
  const hasAnyData = stableDogs.length > 0 || stableNews.length > 0;

  return (
    <>
      <div className="min-h-screen bg-gray-50" role="main">
        {/* ネットワークエラーバナー */}
        {isOffline && (
          <FadeIn duration="fast">
            <NetworkErrorBanner 
              isOffline={isOffline}
              networkError={networkError}
              onRetryConnection={handleRetryConnection}
            />
          </FadeIn>
        )}

        <div className="w-full">
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

          {/* 最近登録された犬のマーキー - 安定版 */}
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
                recentDogs={stableDogs}
                isOffline={isOffline}
                isLoading={isDogsLoading && stableDogs.length === 0}
              />
            </AnimatedElement>
          </section>

          <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 py-8">
            {/* 新着情報セクション - 安定版 */}
            <section
              id="news-section"
              aria-labelledby="news-heading"
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
                  id="news-heading"
                  className="sr-only"
                >
                  新着情報
                </h2>
                <NewsSection
                  isOffline={isOffline}
                  onRetryConnection={handleRetryConnection}
                  news={stableNews}
                  isLoading={isNewsLoading && stableNews.length === 0}
                />
              </AnimatedElement>
            </section>

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

            {/* 施設募集バナー */}
            <AnimatedElement
              animation="slideUp"
              duration={animationDuration}
              delay={staggerDelay * 5}
              respectReducedMotion={true}
              fallbackAnimation="fadeIn"
            >
              <FacilityRecruitmentBanner />
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
                delay={staggerDelay * 6}
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

            {/* ワンちゃん情報発信コーナー */}
            <section
              id="dog-info-section"
              aria-labelledby="dog-info-heading"
              className="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 rounded-lg"
              tabIndex={-1}
            >
              <AnimatedElement
                animation="slideUp"
                duration={animationDuration}
                delay={staggerDelay * 7}
                respectReducedMotion={true}
                fallbackAnimation="fadeIn"
              >
                <h2
                  id="dog-info-heading"
                  className="sr-only"
                >
                  ワンちゃんについての情報発信
                </h2>
                <DogInfoCorner />
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
        {isDataLoading && !hasAnyData && 'データを読み込んでいます。'}
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
