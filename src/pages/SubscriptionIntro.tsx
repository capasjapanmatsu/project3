import { ArrowLeft, CheckCircle, Crown, Pause, Play, Shield, Sparkles, Star, Trash2, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import { SEO } from '../components/SEO';
import useAuth from '../context/AuthContext';
import { useStripe } from '../hooks/useStripe';
import { products } from '../stripe-config';
import { getSubscriptionTrialDays } from '../utils/dateUtils';
import { supabase } from '../utils/supabase';

const FEATURES = [
  {
    Icon: Users,
    iconColor: "text-blue-600",
    title: "全国どこでも使い放題",
    description: "登録済みドッグランが使い放題"
  },
  {
    Icon: Crown,
    iconColor: "text-yellow-600",
    title: "ペットショップ10%OFF",
    description: "対象ショップでのお買い物が常に10%オフ"
  },
  {
    Icon: Shield,
    iconColor: "text-green-600",
    title: "送料無料",
    description: "ペットショップでのご注文は送料無料"
  },
  {
    Icon: Sparkles,
    iconColor: "text-purple-600",
    title: "ドッグラン施設貸切20%OFF",
    description: "プライベート空間をお得に利用"
  }
];

const SUBSCRIPTION_PLAN = {
  name: "ドッグパークJPサブスク",
  price: 3800,
  currency: "円",
  period: "月額"
};

export function SubscriptionIntro() {
  const { user, lineUser, effectiveUserId } = useAuth();
  const navigate = useNavigate();
  const { createCheckoutSession } = useStripe();
  const [searchParams] = useSearchParams();
  const [hasSubscription, setHasSubscription] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [isProcessing, setIsProcessing] = useState<null | 'pause' | 'resume' | 'cancel'>(null);

  // サブスクリプション商品を取得
  const subscriptionProduct = products.find(p => p.mode === 'subscription');
  
  if (!subscriptionProduct) {
    console.error('Subscription product not found in stripe-config.ts');
  }

  // ページ読み込み時にサブスクリプション状態をチェック
  useEffect(() => {
    const uid = user?.id || lineUser?.app_user_id || lineUser?.id || effectiveUserId;
    if (!uid) {
      setLoading(false);
      return;
    }

    const checkSubscriptionStatus = async () => {
      try {
        // ビュー stripe_user_subscriptions は auth.uid() でフィルタされる想定
        const { data: subscription, error } = await supabase
          .from('stripe_user_subscriptions')
          .select('status, subscription_id')
          .maybeSingle();

        if (error) {
          console.error('Error checking subscription:', error);
        }

        const status = subscription?.status as string | undefined;
        setSubscriptionStatus(status ?? null);
        setSubscriptionId((subscription as any)?.subscription_id ?? null);
        const consideredJoined = status === 'active' || status === 'trialing' || status === 'paused';
        setHasSubscription(!!consideredJoined);
      } catch (error) {
        console.error('Error in checkSubscriptionStatus:', error);
      } finally {
        setLoading(false);
      }
    };

    void checkSubscriptionStatus();
  }, [user, lineUser, effectiveUserId]);

  const handleSubscribe = async () => {
    const uid = user?.id || lineUser?.app_user_id || lineUser?.id || effectiveUserId;
    if (!uid) {
      // ログイン後にこのページに戻ってくるためのリダイレクトパラメータを追加
      navigate('/login?redirect=/subscription-intro&message=サブスクリプションにご加入いただくには、まずログインが必要です。');
      return;
    }

    if (hasSubscription) {
      navigate('/dashboard');
      return;
    }

    try {
      setError('');
      
      // 過去のサブスクリプション履歴をチェック
      const { data: subscriptionHistory, error: historyError } = await supabase
        .from('stripe_user_subscriptions')
        .select('id, created_at')
         .eq('user_id', uid)
        .order('created_at', { ascending: false });

      if (historyError) {
        console.error('Error checking subscription history:', historyError);
      }

      // 過去にサブスクリプションに加入したことがあるかチェック
      const hasSubscriptionHistory = subscriptionHistory && subscriptionHistory.length > 0;
      
      // 初月無料期間の日数を計算
      let trialDays = 0;
      if (!hasSubscriptionHistory) {
        // 初回登録者は初月無料
        try {
          trialDays = getSubscriptionTrialDays();
        } catch (dateError) {
          console.warn('Date calculation error, using default:', dateError);
          trialDays = 30; // デフォルト値
        }
      } else {
        // 再登録者は即課金（トライアル期間0）
        trialDays = 0;
        console.log('User has subscription history - no trial period');
      }
      
      // 正しい価格IDを使用
      const priceId = subscriptionProduct?.priceId || 'price_1RZpDjAHWLDQ7ynZP7zD3TQB';
      
      console.log('Creating checkout session with priceId:', priceId);
      
      await createCheckoutSession({
        priceId: priceId,
        mode: 'subscription',
        trialPeriodDays: trialDays, // 初回は無料期間、再登録は0
        successUrl: `${window.location.origin}/dashboard?subscription=success`,
        cancelUrl: `${window.location.origin}/subscription-intro?canceled=true`,
      });
    } catch (err) {
      console.error('Error creating checkout session:', err);
      setError('決済ページの作成に失敗しました。しばらく時間をおいてから再度お試しください。');
    }
  };

  const refreshSubscription = async () => {
    setLoading(true);
    setError('');
    try {
      const { data: subscription } = await supabase
        .from('stripe_user_subscriptions')
        .select('status, subscription_id')
        .maybeSingle();
      const status = subscription?.status as string | undefined;
      setSubscriptionStatus(status ?? null);
      setSubscriptionId((subscription as any)?.subscription_id ?? null);
      const consideredJoined = status === 'active' || status === 'trialing' || status === 'paused';
      setHasSubscription(!!consideredJoined);
    } finally {
      setLoading(false);
    }
  };

  const handlePause = async () => {
    if (!subscriptionId) return;
    setIsProcessing('pause');
    setActionError('');
    setActionSuccess('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('認証が必要です。再ログインしてください。');
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-pause-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': `${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ subscription_id: subscriptionId })
      });
      const txt = await res.text();
      if (!res.ok) {
        try { const j = JSON.parse(txt); throw new Error(j.error || j.message || '一時停止に失敗しました'); } catch { throw new Error(txt || '一時停止に失敗しました'); }
      }
      setActionSuccess('サブスクリプションを一時停止しました');
      await refreshSubscription();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : '一時停止に失敗しました');
    } finally {
      setIsProcessing(null);
    }
  };

  const handleResume = async () => {
    if (!subscriptionId) return;
    setIsProcessing('resume');
    setActionError('');
    setActionSuccess('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('認証が必要です。再ログインしてください。');
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-resume-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': `${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ subscription_id: subscriptionId })
      });
      const txt = await res.text();
      if (!res.ok) {
        try { const j = JSON.parse(txt); throw new Error(j.error || j.message || '再開に失敗しました'); } catch { throw new Error(txt || '再開に失敗しました'); }
      }
      setActionSuccess('サブスクリプションを再開しました');
      await refreshSubscription();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : '再開に失敗しました');
    } finally {
      setIsProcessing(null);
    }
  };

  const handleCancel = async () => {
    if (!subscriptionId) return;
    if (!window.confirm('サブスクリプションを退会しますか？現在の期間終了後に終了します。')) return;
    setIsProcessing('cancel');
    setActionError('');
    setActionSuccess('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('認証が必要です。再ログインしてください。');
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-cancel-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': `${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ subscription_id: subscriptionId })
      });
      const txt = await res.text();
      if (!res.ok) {
        try { const j = JSON.parse(txt); throw new Error(j.error || j.message || '退会に失敗しました'); } catch { throw new Error(txt || '退会に失敗しました'); }
      }
      setActionSuccess('退会手続きを受け付けました');
      await refreshSubscription();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : '退会に失敗しました');
    } finally {
      setIsProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEO 
        title="サブスクリプション紹介"
        description="ドッグパークJPのサブスクリプションプランで、全国のドッグランが使い放題！"
      />
      
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
        {/* ヘッダー */}
        <div className="bg-white shadow-sm">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <Link 
              to="/access-control" 
              className="inline-flex items-center text-blue-600 hover:text-blue-700"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              戻る
            </Link>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-12">
          {/* メインヘッダー */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mb-6">
              <Crown className="w-10 h-10 text-white" />
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              サブスクリプションの
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                一時停止・退会
              </span>
              は、
            </h1>
            
            <p className="text-xl text-gray-600 mb-2">
              マイページよりいつでも簡単に行えます。
            </p>
            <p className="text-lg text-gray-500">
              お客様のペースでサービスをご利用いただけます
            </p>
          </div>

          {/* キャンペーン告知 */}
          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl p-6 text-center mb-12 text-white">
            <div className="flex items-center justify-center mb-2">
              <Sparkles className="w-6 h-6 mr-2" />
              <span className="font-bold text-lg">キャンペーン実施中</span>
              <Sparkles className="w-6 h-6 ml-2" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold mb-2">
              初月完全無料！今月登録すれば月末まで0円でお試し
            </h2>
            <p className="text-lg opacity-90">
              翌月1日から月額3,800円の統一料金で、いつでもキャンセル可能です
            </p>
          </div>

          {/* 機能一覧 */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {FEATURES.map((feature, index) => {
              const FeatureIcon = feature.Icon;
              return (
                <Card key={index} className="text-center p-6 hover:shadow-lg transition-shadow">
                  <div className="flex justify-center mb-4">
                    <FeatureIcon className={`w-8 h-8 ${feature.iconColor}`} />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {feature.description}
                  </p>
                </Card>
              );
            })}
          </div>

          {/* 価格表示 */}
          <div className="max-w-md mx-auto mb-8">
            <Card className="text-center p-8 border-2 border-blue-200 bg-gradient-to-b from-blue-50 to-white">
              <div className="mb-6">
                <div className="text-5xl font-bold text-gray-900 mb-2">
                  ¥{SUBSCRIPTION_PLAN.price.toLocaleString()}
                </div>
                <div className="text-gray-600">
                  {SUBSCRIPTION_PLAN.period}（税込）
                </div>
              </div>

              {hasSubscription ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-center mb-2">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                    <span className="font-semibold text-green-700">
                      {subscriptionStatus === 'paused' ? '一時停止中' : 'ご加入中'}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(subscriptionStatus === 'active' || subscriptionStatus === 'trialing') && (
                      <Button onClick={() => { void handlePause(); }} isLoading={isProcessing === 'pause'} className="bg-yellow-600 hover:bg-yellow-700">
                        <Pause className="w-4 h-4 mr-2" /> 一時停止
                      </Button>
                    )}
                    {subscriptionStatus === 'paused' && (
                      <Button onClick={() => { void handleResume(); }} isLoading={isProcessing === 'resume'} className="bg-green-600 hover:bg-green-700">
                        <Play className="w-4 h-4 mr-2" /> 再開
                      </Button>
                    )}
                    <Button onClick={() => { void handleCancel(); }} isLoading={isProcessing === 'cancel'} variant="secondary" className="text-red-600 hover:text-red-700 border-red-300 hover:border-red-400">
                      <Trash2 className="w-4 h-4 mr-2" /> 退会する
                    </Button>
                  </div>
                  <Button onClick={() => navigate('/dashboard')} variant="secondary" className="w-full">
                    ダッシュボードに戻る
                  </Button>
                </div>
              ) : (
                <Button 
                  onClick={() => { void handleSubscribe(); }}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-lg py-4"
                  disabled={loading}
                >
                  <span className="flex items-center justify-center">
                    <Star className="w-5 h-5 mr-2" />
                    今すぐ無料で始める（翌月から月額3,800円）
                  </span>
                </Button>
              )}
            </Card>
          </div>

          {(error || actionError || actionSuccess) && (
            <div className="max-w-md mx-auto mb-8">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center mb-3">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}
              {actionError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center mb-3">
                  <p className="text-red-600 text-sm">{actionError}</p>
                </div>
              )}
              {actionSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <p className="text-green-700 text-sm">{actionSuccess}</p>
                </div>
              )}
            </div>
          )}

          {/* キャンセル通知 */}
          {searchParams.get('canceled') === 'true' && (
            <div className="max-w-md mx-auto mb-8">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                <p className="text-yellow-700">
                  決済ページの作成に失敗しました。もう一度お試しください。
                </p>
              </div>
            </div>
          )}

          {/* よくある質問 */}
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">よくある質問</h2>
            
            <div className="space-y-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  初月無料はどのような仕組みですか？
                </h3>
                <p className="text-gray-600">
                  新規登録の方は、登録月の月末まで無料でご利用いただけます。例えば1月15日に登録された場合、1月31日まで無料で、2月1日から月額3,800円の課金が開始されます。
                </p>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  解約はいつでもできますか？
                </h3>
                <p className="text-gray-600">
                  はい、マイページからいつでも解約・一時停止が可能です。解約手数料等は一切かかりません。
                </p>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  ペットショップの割引はどこで利用できますか？
                </h3>
                <p className="text-gray-600">
                  詳細は
                  <Link to="/petshop" className="text-blue-600 hover:text-blue-700 underline ml-1">
                    ペットショップページ
                  </Link>
                  をご確認ください。対象店舗や商品の最新情報を掲載しています。
                </p>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  一度解約して再登録した場合も初月無料になりますか？
                </h3>
                <p className="text-gray-600">
                  申し訳ございませんが、初月無料は新規登録時のみの特典です。再登録の場合は、何日からでも月額3,800円（月末まで）の満額請求となります。
                </p>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 