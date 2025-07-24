import { useMemo } from 'react';
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
import { useRealtimeDogs } from '../hooks/useRealtimeDogs';
import { useRealtimeNews } from '../hooks/useRealtimeNews';
import { useResponsive } from '../hooks/useResponsive';
import type { Dog, NewsAnnouncement } from '../types';

// 静的なフォールバックデータ（コンポーネント外で定義）
const staticDogs: Dog[] = [
  {
    id: '1',
    owner_id: 'owner1',
    name: 'ポチ',
    breed: '柴犬',
    birth_date: '2020-01-01',
    gender: 'オス',
    image_url: '',
    created_at: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    owner_id: 'owner2',
    name: 'ハナ',
    breed: 'トイプードル',
    birth_date: '2021-06-15',
    gender: 'メス',
    image_url: '',
    created_at: '2024-01-02T00:00:00Z'
  },
  {
    id: '3',
    owner_id: 'owner3',
    name: 'マロン',
    breed: 'ゴールデンレトリバー',
    birth_date: '2019-09-20',
    gender: 'オス',
    image_url: '',
    created_at: '2024-01-03T00:00:00Z'
  },
  {
    id: '4',
    owner_id: 'owner4',
    name: 'ココ',
    breed: 'チワワ',
    birth_date: '2022-03-10',
    gender: 'メス',
    image_url: '',
    created_at: '2024-01-04T00:00:00Z'
  }
];

const staticNews: NewsAnnouncement[] = [
  {
    id: '1',
    title: 'テスト営業中',
    content: '現在こちらのアプリは開発中です。オープンまで暫くお待ちください。',
    category: 'announcement',
    is_important: true,
    created_at: '2025-07-12T00:00:00Z',
    updated_at: '2025-07-12T00:00:00Z'
  },
  {
    id: '2',
    title: 'サービス準備中',
    content: 'ドッグパーク予約システムの準備を進めています。',
    category: 'news',
    is_important: false,
    created_at: '2025-07-10T00:00:00Z',
    updated_at: '2025-07-10T00:00:00Z'
  }
];

export function Home() {
  const { user } = useAuth();

  // レスポンシブフック
  const { isMobile, prefersReducedMotion } = useResponsive();

  // リアルタイムHookを使用（フォールバックデータ付き）
  const { 
    dogs: recentDogs, 
    isLoading: isDogsLoading, 
    error: dogsError,
    refreshDogs 
  } = useRealtimeDogs({ 
    initialDogs: staticDogs, 
    limit: 8 
  });

  const { 
    news, 
    isLoading: isNewsLoading, 
    error: newsError,
    refreshNews 
  } = useRealtimeNews({ 
    initialNews: staticNews, 
    limit: 5 
  });

  // ネットワークエラーの状態管理
  const isOffline = !!(dogsError || newsError);
  const networkError = dogsError || newsError;

  // 再接続ハンドラー
  const handleRetryConnection = () => {
    console.log('🔄 データを再取得中...');
    refreshDogs();
    refreshNews();
  };

  // アニメーション設定をレスポンシブに調整
  const animationDuration = isMobile ? 'fast' : 'normal';
  const staggerDelay = prefersReducedMotion ? 0 : 25;

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

          {/* 最近登録された犬のマーキー - リアルタイム更新 */}
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
                isLoading={isDogsLoading}
              />
            </AnimatedElement>
          </section>

          <main id="main-content" className="space-y-12 py-8">
            {/* 新着情報セクション - リアルタイム更新 */}
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
                  新着情報
                </h2>
                <NewsSection
                  isOffline={isOffline}
                  onRetryConnection={handleRetryConnection}
                  news={news}
                  isLoading={isNewsLoading}
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

            {/* オーナー募集バナー */}
            <AnimatedElement
              animation="slideUp"
              duration={animationDuration}
              delay={staggerDelay * 3}
              respectReducedMotion={true}
              fallbackAnimation="fadeIn"
            >
              <OwnerRecruitmentBanner />
            </AnimatedElement>

            {/* 施設募集バナー */}
            <AnimatedElement
              animation="slideUp"
              duration={animationDuration}
              delay={staggerDelay * 3.5}
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
                delay={staggerDelay * 4}
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
                delay={staggerDelay * 5}
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
        {isDogsLoading && 'ワンちゃん情報を読み込んでいます。'}
        {isNewsLoading && '新着情報を読み込んでいます。'}
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
